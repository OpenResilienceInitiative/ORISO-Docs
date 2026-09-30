import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { builtinModules } from 'node:module';
import ts from 'typescript';

const JS_SOURCE = /\.(?:[cm]?[jt]sx?)$/i;
const JAVA_TYPES = new Set(['class_declaration', 'interface_declaration', 'enum_declaration', 'record_declaration', 'annotation_type_declaration']);
const javaText = (node) => node?.text.replace(/\s+/g, '').trim() ?? '';
const field = (node, name) => node?.childForFieldName(name);
const lineRange = (node) => [node.startPosition.row + 1, node.endPosition.row + 1];
const slash = (file) => file.split(sep).join('/');
const arrayMapAdd = (map, key, value) => { if (!map.has(key)) map.set(key, []); map.get(key).push(value); };
const simpleJavaReceiver = (node) => {
  if (!node) return '';
  return /^(?:[\p{L}_$][\p{L}\p{N}_$]*)(?:\.[\p{L}_$][\p{L}\p{N}_$]*)*$/u.test(node.text) ? node.text : '<expression>';
};
const tsCallee = (node) => {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return `${ts.isIdentifier(node.expression) ? node.expression.text : '<expression>'}.${node.name.text}`;
  return '<expression>';
};

// Keep exact coverage totals while bounding diagnostic payload, including pathological
// chains and repetitive generated tests. Samples point back to source; no source bodies.
function diagnostics() {
  let total = 0;
  const samples = [], byReason = {}, byRelation = {};
  const perReasonLimit = 25, sampleLimit = 250;
  return {
    get length() { return total; }, samples,
    countForRelation(relation) { return byRelation[relation] ?? 0; },
    push(item) {
      total++; byReason[item.reason] = (byReason[item.reason] ?? 0) + 1;
      if (item.relation) byRelation[item.relation] = (byRelation[item.relation] ?? 0) + 1;
      if (byReason[item.reason] > perReasonLimit || samples.length >= sampleLimit) return;
      const sample = { ...item };
      for (const key of ['callee', 'specifier']) if (sample[key]?.length > 240) {
        sample[`${key}Hash`] = createHash('sha256').update(sample[key]).digest('hex');
        sample[key] = sample[key].slice(0, 240); sample[`${key}Truncated`] = true;
      }
      if (sample.candidates?.length > 20) {
        sample.candidateCount = sample.candidates.length;
        sample.candidates = sample.candidates.slice(0, 20);
        sample.candidatesTruncated = true;
      }
      samples.push(sample);
    },
    summary() { return { total, retained: samples.length, omitted: total - samples.length, byReason, byRelation, sampleLimit, perReasonLimit }; },
  };
}

// Decorate the public extractor interface, rather than reaching into private parser state.
// The upstream Java structural API exposes parameter names, which cannot identify overloads.
export function createJavaExtractor(base) {
  if (!base) throw new Error('Pinned core does not expose a Java extractor');
  function inspect(root) {
    const packageNode = root.namedChildren.find((node) => node.type === 'package_declaration');
    const packageName = packageNode?.text.replace(/^package\s+/, '').replace(/;\s*$/, '').trim() ?? '';
    const functions = [], classes = [], calls = [], parserIssues = [];
    const variableTypes = (node) => {
      const out = new Map();
      for (const declaration of node?.namedChildren ?? []) {
        if (!['field_declaration', 'constant_declaration'].includes(declaration.type)) continue;
        const type = javaText(field(declaration, 'type'));
        for (const variable of declaration.namedChildren.filter((n) => n.type === 'variable_declarator')) {
          out.set(field(variable, 'name')?.text, type);
        }
      }
      return out;
    };
    function visit(node, context = { owner: packageName, variables: new Map(), method: null }) {
      if (node.type === 'ERROR' || node.isMissing) parserIssues.push({ lineRange: lineRange(node), reason: node.isMissing ? 'missing-syntax' : 'unparsed-syntax' });
      if (JAVA_TYPES.has(node.type)) {
        const name = field(node, 'name')?.text;
        if (!name) throw new Error('Java declaring type has no name');
        const owner = [context.method?.name ?? context.owner, name].filter(Boolean).join('.');
        const body = field(node, 'body');
        const declaration = { name: owner, displayName: name, legacyName: name, qualifiedName: owner, lineRange: lineRange(node), methods: [], properties: [] };
        classes.push(declaration);
        for (const child of node.namedChildren) visit(child, { owner, variables: variableTypes(body), method: null, declaration });
        return;
      }
      if (node.type === 'class_body' && node.parent?.type === 'object_creation_expression') {
        const owner = `${context.method?.name ?? context.owner}.<anonymous:${node.startPosition.row + 1}:${node.startPosition.column}>`;
        for (const child of node.namedChildren) visit(child, { owner, variables: variableTypes(node), method: null });
        return;
      }
      if (['method_declaration', 'constructor_declaration', 'compact_constructor_declaration'].includes(node.type)) {
        const name = field(node, 'name')?.text;
        if (!name) throw new Error('Java callable has no name');
        const parameterNode = field(node, 'parameters');
        const parameters = (parameterNode?.namedChildren ?? []).filter((p) => ['formal_parameter', 'spread_parameter'].includes(p.type));
        const types = parameters.map((parameter) => {
          const type = field(parameter, 'type') ?? parameter.namedChildren.find((part) => part.type !== 'modifiers' && part.type !== 'variable_declarator');
          return javaText(type) + (parameter.type === 'spread_parameter' ? '...' : javaText(field(parameter, 'dimensions')));
        });
        const variables = new Map(context.variables);
        for (let i = 0; i < parameters.length; i++) {
          const parameterName = field(parameters[i], 'name')?.text ?? parameters[i].namedChildren.find((n) => n.type === 'variable_declarator')?.text;
          if (parameterName) variables.set(parameterName, types[i]);
        }
        const signatureStatus = parameterNode?.hasError ? 'unresolved' : 'parsed';
        const signatureArgs = signatureStatus === 'parsed' ? types.join(',') : `<unresolved-signature:${createHash('sha256').update(parameterNode.text).digest('hex').slice(0, 16)}>`;
        const signature = `${name}(${signatureArgs})`;
        const fn = { name: `${context.owner}.${signature}`, displayName: name, legacyName: name, qualifiedName: `${context.owner}.${name}`, declaringType: context.owner, signature, signatureStatus, parameterTypes: types, params: parameters.map((p) => field(p, 'name')?.text ?? ''), lineRange: lineRange(node), returnType: javaText(field(node, 'type')), constructor: node.type !== 'method_declaration' };
        functions.push(fn);
        context.declaration?.methods.push(fn.name);
        for (const child of node.namedChildren) visit(child, { ...context, variables, method: fn });
        return;
      }
      if (node.type === 'block') {
        const blockContext = { ...context, variables: new Map(context.variables) };
        for (const child of node.namedChildren) visit(child, blockContext);
        return;
      }
      if (node.type === 'local_variable_declaration') {
        for (const variable of node.namedChildren.filter((n) => n.type === 'variable_declarator')) context.variables.set(field(variable, 'name')?.text, javaText(field(node, 'type')));
      }
      if (context.method && ['method_invocation', 'object_creation_expression'].includes(node.type)) {
        const constructor = node.type === 'object_creation_expression';
        const receiver = constructor ? javaText(field(node, 'type')) : simpleJavaReceiver(field(node, 'object'));
        const name = constructor ? receiver.split('.').at(-1) : field(node, 'name')?.text;
        if (name) calls.push({ caller: context.method.name, callee: constructor ? `new ${receiver}` : receiver ? `${receiver}.${name}` : name, methodName: name, receiver, receiverType: context.variables.get(receiver) ?? (receiver.startsWith('this.') ? context.variables.get(receiver.slice(5)) : undefined), declaringType: context.owner, constructor, argumentCount: field(node, 'arguments')?.namedChildCount ?? 0, lineNumber: node.startPosition.row + 1 });
      }
      for (const child of node.namedChildren) visit(child, context);
    }
    visit(root);
    return { functions, classes, calls, parserIssues };
  }
  return {
    languageIds: ['java'],
    extractStructure(root) { const data = inspect(root); return { ...base.extractStructure(root), functions: data.functions, classes: data.classes, parserIssues: data.parserIssues }; },
    extractCallGraph(root) { return inspect(root).calls; },
  };
}

export function attachSourceEvidence(graph, repoDir) {
  const source = new Map();
  for (const node of graph.nodes) {
    if (!node.filePath) continue;
    if (!source.has(node.filePath)) source.set(node.filePath, readFileSync(resolve(repoDir, node.filePath), 'utf8'));
    const content = source.get(node.filePath), lines = content.split('\n');
    const fullFile = node.type === 'file' || !node.lineRange;
    if (fullFile) node.lineRange = [1, lines.length];
    const [start, end] = node.lineRange;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > lines.length) throw new Error(`Invalid source range for ${node.id}: ${node.lineRange}`);
    const body = fullFile ? content : lines.slice(start - 1, end).join('\n');
    node.metadata = { ...node.metadata, sourceFingerprint: createHash('sha256').update(body).digest('hex'), sourceCommit: graph.project.gitCommitHash };
  }
  return graph;
}

// Own the source→graph boundary: project paths, callable identity and conservative relations.
// A missing binding is an explicit unresolved reference, never a globally guessed name.
export function createProjectExtraction({ repoDir, files }) {
  repoDir = resolve(repoDir);
  const fileSet = new Set(files), sources = new Map(), analyses = new Map(), javaCalls = [];
  const unresolvedImports = diagnostics(), unresolvedCalls = diagnostics(), unsupportedInputs = diagnostics(), externalImports = diagnostics();
  const legacyCandidates = new Map(), javaClasses = new Map(), javaFunctions = [], optionsCache = new Map();
  const configErrors = [];
  const fromRoot = (file) => slash(relative(repoDir, file));
  const configFor = (file) => {
    const config = ts.findConfigFile(dirname(resolve(repoDir, file)), ts.sys.fileExists, 'tsconfig.json');
    const key = config ?? '<default>';
    if (!optionsCache.has(key)) {
      if (!config) optionsCache.set(key, { options: { allowJs: true, moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext }, config: null });
      else {
        const parsed = ts.getParsedCommandLineOfConfigFile(config, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (diagnostic) => configErrors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')) });
        if (!parsed) throw new Error(`Cannot read TypeScript project ${config}: ${configErrors.join('; ')}`);
        // Missing source inventories do not change module resolution; invalid options/config do.
        const errors = parsed.errors.filter((error) => ![18002, 18003].includes(error.code));
        if (errors.length) throw new Error(`Invalid TypeScript project ${config}: ${errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('; ')}`);
        optionsCache.set(key, { options: parsed.options, config: fromRoot(config) });
      }
    }
    return optionsCache.get(key);
  };
  const sourceFor = (file) => { if (!sources.has(file)) sources.set(file, readFileSync(resolve(repoDir, file), 'utf8')); return sources.get(file); };

  function addFile(file, content, analysis, calls = []) {
    sources.set(file, content); analyses.set(file, analysis);
    if (!file.endsWith('.java')) {
      if (!JS_SOURCE.test(file) && calls.length) unsupportedInputs.push({ file, relation: 'calls', reason: 'language-binding-not-supported', references: calls.length });
      return;
    }
    for (const diagnostic of analysis.parserIssues ?? []) unsupportedInputs.push({ file, relation: 'calls', ...diagnostic, reason: 'java-parser-partial', syntaxReason: diagnostic.reason });
    for (const fn of analysis.functions) javaFunctions.push({ ...fn, file, id: `function:${file}:${fn.name}` });
    for (const cls of analysis.classes) arrayMapAdd(javaClasses, cls.qualifiedName, { ...cls, file, id: `class:${file}:${cls.name}` });
    for (const call of calls) javaCalls.push({ ...call, file });
  }

  function complete(graph) {
    const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
    const functionsByFile = new Map();
    for (const node of graph.nodes) if (node.type === 'function' && node.filePath) arrayMapAdd(functionsByFile, node.filePath, node);
    if (nodes.size !== graph.nodes.length) throw new Error('Duplicate graph identities after extraction');
    const edgeKeys = new Set(graph.edges.map((e) => `${e.type}|${e.source}|${e.target}`));
    const addEdge = (type, source, target, metadata) => {
      if (!nodes.has(source) || !nodes.has(target)) return false;
      const key = `${type}|${source}|${target}`;
      if (!edgeKeys.has(key)) { edgeKeys.add(key); graph.edges.push({ type, source, target, direction: 'forward', weight: 1, metadata }); }
      return true;
    };
    for (const [file, analysis] of analyses) {
      if (!file.endsWith('.java')) continue;
      for (const [kind, entries] of [['function', analysis.functions], ['class', analysis.classes]]) {
        for (const entry of entries) {
          const id = `${kind}:${file}:${entry.name}`, oldId = `${kind}:${file}:${entry.legacyName}`;
          const node = nodes.get(id); if (!node) throw new Error(`Missing Java symbol ${id}`);
          node.name = entry.displayName;
          node.metadata = { ...node.metadata, qualifiedName: entry.qualifiedName, signature: entry.signature, signatureStatus: entry.signatureStatus, declaringType: entry.declaringType, parameterTypes: entry.parameterTypes, legacyId: oldId };
          if (oldId !== id) arrayMapAdd(legacyCandidates, oldId, id);
        }
      }
    }

    // Resolve modules with the actual TypeScript config (JSONC, extends, paths, exports).
    const jsFiles = files.filter((file) => JS_SOURCE.test(file));
    const groups = new Map();
    for (const file of jsFiles) {
      const config = configFor(file);
      const key = config.config ?? '<default>';
      if (!groups.has(key)) groups.set(key, { ...config, files: [] });
      groups.get(key).files.push(file);
    }
    for (const group of groups.values()) {
      const resolutionCache = ts.createModuleResolutionCache(repoDir, (file) => file, group.options);
      for (const file of group.files) {
        const preprocessed = ts.preProcessFile(sourceFor(file), true, true);
        for (const imported of preprocessed.importedFiles) {
          const specifier = imported.fileName;
          if (specifier.startsWith('node:') || builtinModules.includes(specifier)) { externalImports.push({ file, specifier, reason: 'node-builtin' }); continue; }
          const found = ts.resolveModuleName(specifier, resolve(repoDir, file), group.options, ts.sys, resolutionCache).resolvedModule;
          if (!found) {
            const internal = specifier.startsWith('.') || specifier.startsWith('/') || Object.keys(group.options.paths ?? {}).some((pattern) => { const [head, tail = ''] = pattern.split('*'); return pattern.includes('*') ? specifier.startsWith(head) && specifier.endsWith(tail) : specifier === pattern; });
            const existingAsset = specifier.startsWith('.') && existsSync(resolve(repoDir, dirname(file), specifier));
            unresolvedImports.push({ file, specifier, reason: existingAsset ? 'non-code-asset-or-unindexed-module' : internal ? 'module-not-found' : 'external-package-unavailable', config: group.config });
            continue;
          }
          const target = fromRoot(found.resolvedFileName);
          if (fileSet.has(target) && addEdge('imports', `file:${file}`, `file:${target}`, { resolution: 'typescript-project', specifier })) continue;
          if (found.isExternalLibraryImport || target.includes('node_modules/')) externalImports.push({ file, specifier, resolvedFile: target, reason: 'external-package' });
          else unresolvedImports.push({ file, specifier, resolvedFile: target, reason: fileSet.has(target) ? 'target-not-indexed' : 'outside-source-inventory' });
        }
      }

      // Only load inventoried application files into the checker. External declarations
      // cannot become graph targets; loading their dependency trees wastes memory.
      const options = { ...group.options, noLib: true, types: [], allowJs: true, skipLibCheck: true };
      const host = ts.createCompilerHost(options);
      const originalRead = host.readFile;
      host.readFile = (file) => fileSet.has(fromRoot(file)) ? sourceFor(fromRoot(file)) : undefined;
      host.getSourceFile = (file, languageVersion) => {
        if (!fileSet.has(fromRoot(file))) return undefined;
        const content = host.readFile(file);
        return content === undefined ? undefined : ts.createSourceFile(file, content, languageVersion, true);
      };
      const program = ts.createProgram(group.files.map((file) => resolve(repoDir, file)), options, host);
      const checker = program.getTypeChecker();
      const graphSymbol = (declaration) => {
        const file = fromRoot(declaration.getSourceFile().fileName), start = declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
        const end = declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.end).line + 1;
        let candidates = (functionsByFile.get(file) ?? []).filter((node) => node.lineRange && node.lineRange[0] <= start && node.lineRange[1] >= end);
        const name = declaration.name?.getText();
        const named = name ? candidates.filter((node) => node.name === name || node.name.endsWith(`.${name}`)) : [];
        if (named.length) candidates = named;
        if (candidates.length > 1) { const span = Math.min(...candidates.map((n) => n.lineRange[1] - n.lineRange[0])); candidates = candidates.filter((n) => n.lineRange[1] - n.lineRange[0] === span); }
        return candidates;
      };
      for (const file of group.files) {
        const source = program.getSourceFile(resolve(repoDir, file));
        if (!source) { unsupportedInputs.push({ file, relation: 'calls', reason: 'typescript-source-not-loaded' }); continue; }
        function visit(node, caller = null) {
          if (ts.isFunctionLike(node)) {
            const candidates = graphSymbol(node);
            caller = candidates.length === 1 ? candidates[0] : null;
          }
          if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            const location = { file, callee: tsCallee(node.expression), lineNumber: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 };
            if (!caller) unresolvedCalls.push({ ...location, reason: 'caller-not-indexed' });
            else {
              let symbol = checker.getSymbolAtLocation(node.expression);
              if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
              const candidates = [...new Map((symbol?.declarations ?? []).flatMap(graphSymbol).map((n) => [n.id, n])).values()];
              if (candidates.length === 1) addEdge('calls', caller.id, candidates[0].id, { resolution: 'typescript-bound-symbol', lineNumber: location.lineNumber });
              else unresolvedCalls.push({ ...location, caller: caller.id, reason: candidates.length > 1 ? 'ambiguous-target' : 'target-not-indexed-or-unresolved', candidates: candidates.map((n) => n.id) });
            }
          }
          ts.forEachChild(node, (child) => visit(child, caller));
        }
        visit(source);
      }
      host.readFile = originalRead;
    }

    // Java imports bind a declaring type, never a last-seen global short name.
    const resolveJavaType = (name, file, owner) => {
      name = name.replace(/<.*>/g, '').replace(/\[\]|\.\.\./g, '');
      if (javaClasses.has(name)) return [name];
      const imports = analyses.get(file)?.imports ?? [];
      const explicit = imports.filter((imp) => imp.source.endsWith(`.${name}`)).map((imp) => imp.source);
      const ownPackage = owner.split('.').slice(0, -1).join('.');
      const options = [...explicit, `${ownPackage}.${name}`, `${owner}.${name}`, ...imports.filter((imp) => imp.specifiers.includes('*')).map((imp) => `${imp.source}.${name}`)];
      return [...new Set(options.filter((option) => javaClasses.has(option)))];
    };
    for (const [file, analysis] of analyses) {
      if (JS_SOURCE.test(file)) continue;
      for (const imported of analysis.imports ?? []) {
        const matches = javaClasses.get(imported.source) ?? [];
        if (file.endsWith('.java') && matches.length === 1 && addEdge('imports', `file:${file}`, `file:${matches[0].file}`, { resolution: 'java-qualified-type', specifier: imported.source })) continue;
        if (file.endsWith('.java')) unresolvedImports.push({ file, specifier: imported.source, reason: matches.length > 1 ? 'ambiguous-type' : 'external-or-unresolved-java-import' });
        else unsupportedInputs.push({ file, relation: 'imports', specifier: imported.source, reason: 'language-binding-not-supported' });
      }
    }
    for (const call of javaCalls) {
      let owners;
      if (!call.receiver || call.receiver === 'this') owners = [call.declaringType];
      else owners = resolveJavaType(call.receiverType ?? call.receiver, call.file, call.declaringType);
      const candidates = javaFunctions.filter((fn) => fn.signatureStatus === 'parsed' && owners.includes(fn.declaringType) && fn.displayName === call.methodName && (fn.parameterTypes.length === call.argumentCount || (fn.parameterTypes.at(-1)?.endsWith('...') && call.argumentCount >= fn.parameterTypes.length - 1)));
      const caller = `function:${call.file}:${call.caller}`;
      if (owners.length === 1 && candidates.length === 1 && addEdge('calls_unconfirmed', caller, candidates[0].id, { resolution: 'java-unique-scoped-declaration', reason: 'java-typechecking-unavailable', lineNumber: call.lineNumber })) continue;
      unresolvedCalls.push({ file: call.file, caller, callee: call.callee, lineNumber: call.lineNumber, reason: candidates.length > 1 || owners.length > 1 ? 'ambiguous-target' : owners.length === 0 ? 'receiver-type-unresolved' : 'target-not-indexed-or-unresolved', candidates: candidates.map((fn) => fn.id) });
    }
    const legacyIdMap = {}, ambiguousLegacyIds = {};
    for (const [id, targets] of legacyCandidates) (targets.length === 1 ? legacyIdMap : ambiguousLegacyIds)[id] = targets;
    graph.metadata = { ...graph.metadata, extraction: { version: 1, legacyIdMap, ambiguousLegacyIds, unresolvedImports: unresolvedImports.samples, unresolvedCalls: unresolvedCalls.samples, unsupportedInputs: unsupportedInputs.samples, externalImports: externalImports.samples, diagnostics: { unresolvedImports: unresolvedImports.summary(), unresolvedCalls: unresolvedCalls.summary(), unsupportedInputs: unsupportedInputs.summary(), externalImports: externalImports.summary() }, configFiles: [...groups.keys()].filter((key) => key !== '<default>') } };
    graph.relationCoverage = { ...graph.relationCoverage };
    for (const [relation, unresolved] of [['imports', unresolvedImports.length], ['calls', unresolvedCalls.length]]) {
      const unsupported = unsupportedInputs.countForRelation(relation) + (relation === 'calls' ? graph.edges.filter((edge) => edge.type === 'calls_unconfirmed').length : 0);
      const emitted = graph.edges.filter((edge) => edge.type === relation).length;
      graph.relationCoverage[relation] = { emitted, unresolved, unsupported, status: unresolved || (unsupported && emitted) ? 'partial' : unsupported ? 'unsupported' : 'complete' };
    }
    graph.relationCoverage.calls_unconfirmed = { emitted: graph.edges.filter((edge) => edge.type === 'calls_unconfirmed').length, unresolved: 0, unsupported: 0, status: 'complete' };
    return graph;
  }
  return { addFile, complete };
}
