import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createJavaExtractor, createProjectExtraction, attachSourceEvidence } from '../lib/extraction.mjs';

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'ua-extraction-'));
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(root, file, '..'), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return { root, files: Object.keys(files), close: () => rmSync(root, { recursive: true, force: true }) };
}

async function parser() {
  assert.ok(process.env.UA_CORE, 'UA_CORE must select the real pinned core for integration tests');
  const core = await import(process.env.UA_CORE);
  const java = core.builtinExtractors.find((extractor) => extractor.languageIds.includes('java'));
  const plugin = new core.TreeSitterPlugin(core.builtinLanguageConfigs);
  plugin.registerExtractor(createJavaExtractor(java));
  await plugin.init();
  return { core, plugin };
}

test('actual Java parser preserves overloads, declaring types and stable type signatures', async () => {
  const { plugin } = await parser();
  const src = `package sample;
class IdentityManager {
  void setUpOneTimePassword(String userId) {}
  void setUpOneTimePassword(String userId, int otp) {}
  void accept(String value) {}
  void accept(Integer value) {}
  class Nested { void accept(String value) {} }
}
class Other { void accept(String value) {} }
`;
  const analysis = plugin.analyzeFile('IdentityManager.java', src);
  assert.equal(new Set(analysis.functions.map((fn) => fn.name)).size, 6);
  assert.ok(analysis.functions.some((fn) => fn.name === 'sample.IdentityManager.setUpOneTimePassword(String,int)'));
  assert.ok(analysis.functions.some((fn) => fn.name === 'sample.IdentityManager.Nested.accept(String)'));
  const renamed = plugin.analyzeFile('IdentityManager.java', src.replaceAll('userId', 'accountId'));
  assert.deepEqual(renamed.functions.map((fn) => fn.name), analysis.functions.map((fn) => fn.name));
});

test('Java call attribution uses exact caller and reports overloaded targets instead of last-name wins', async () => {
  const { plugin, core } = await parser();
  const f = fixture({ 'src/IdentityManager.java': `package sample;
class IdentityManager {
 void accept(String value) {}
 void accept(Integer value) {}
 void run() { accept(null); }
}
class Other { void accept(String value) {} }
` });
  try {
    const extraction = createProjectExtraction({ repoDir: f.root, files: f.files });
    const builder = new core.GraphBuilder('Fixture', 'a'.repeat(40));
    const file = f.files[0], content = readFileSync(join(f.root, file), 'utf8');
    const analysis = plugin.analyzeFile(file, content);
    extraction.addFile(file, content, analysis, plugin.extractCallGraph(file, content));
    builder.addFileWithAnalysis(file, analysis, { fileSummary: '', summaries: {}, tags: [], complexity: 'simple' });
    const graph = extraction.complete(builder.build());
    assert.equal(graph.edges.filter((edge) => edge.type === 'calls').length, 0);
    const call = graph.metadata.extraction.unresolvedCalls.find((entry) => entry.callee === 'accept');
    assert.equal(call.reason, 'ambiguous-target');
    assert.equal(call.candidates.length, 2);
    assert.ok(call.candidates.every((id) => id.includes('IdentityManager.accept(')));
    const old = 'function:src/IdentityManager.java:accept';
    assert.equal(graph.metadata.extraction.ambiguousLegacyIds[old].length, 3);
    assert.equal(graph.metadata.extraction.legacyIdMap[old], undefined);
    assert.equal(graph.relationCoverage.calls.status, 'partial');
  } finally { f.close(); }
});

async function javaGraph(files) {
  const { plugin, core } = await parser();
  const f = fixture(files);
  try {
    const extraction = createProjectExtraction({ repoDir: f.root, files: f.files });
    const builder = new core.GraphBuilder('Fixture', 'a'.repeat(40));
    for (const file of f.files) {
      const content = files[file], analysis = plugin.analyzeFile(file, content);
      extraction.addFile(file, content, analysis, plugin.extractCallGraph(file, content));
      builder.addFileWithAnalysis(file, analysis, { fileSummary: '', summaries: {}, tags: [], complexity: 'simple' });
    }
    return extraction.complete(builder.build());
  } finally { f.close(); }
}
const edgesOf = (graph, type) => graph.edges.filter((e) => e.type === type);

test('unique member of a supertype-free Java class is a confirmed call, with and without a field receiver', async () => {
  const graph = await javaGraph({
    'Manager.java': 'class Manager { void accept(String id) {} void run() { accept("id"); } }',
    'Caller.java': 'class Caller { private Manager manager; void go() { manager.accept("x"); this.manager.accept("y"); } }',
  });
  // Manager.run -> accept, and Caller.go -> accept (the plain and the this.-qualified receiver share one edge).
  assert.deepEqual(edgesOf(graph, 'calls').map((e) => e.source).sort(), ['function:Caller.java:Caller.go()', 'function:Manager.java:Manager.run()']);
  assert.equal(edgesOf(graph, 'calls_unconfirmed').length, 0);
  assert.equal(edgesOf(graph, 'calls')[0].metadata.resolution, 'java-declared-type-unique-member');
});

test('Java calls stay unconfirmed when another member could be applicable', async () => {
  const cases = {
    'inherited overloads': { 'Base.java': 'class Base { void accept(Integer id) {} }', 'Manager.java': 'class Manager extends Base { void accept(String id) {} void run() { accept("id"); } }' },
    'implemented interface': { 'Manager.java': 'class Manager implements Runnable { public void run() {} void accept(String id) {} void go() { accept("id"); } }' },
    'Object member': { 'Manager.java': 'class Manager { boolean equals(Manager other) { return true; } void run(Manager m) { equals(m); } }' },
    'enum owner': { 'Kind.java': 'enum Kind { A; void accept(String id) {} void run() { accept("id"); } }' },
    'lambda parameter shadows the field': { 'Manager.java': 'class Manager { void accept(String id) {} }', 'Caller.java': 'class Caller { private Manager manager; void go(java.util.List<Object> items) { items.forEach(manager -> manager.accept("x")); } }' },
    'for-each variable shadows the field': { 'Manager.java': 'class Manager { void accept(String id) {} }', 'Caller.java': 'class Caller { private Manager manager; void go(java.util.List<Other> items) { for (Other manager : items) manager.accept("x"); } }' },
    'parameter of another type hides the field': { 'Manager.java': 'class Manager { void accept(String id) {} }', 'Caller.java': 'class Caller { private Manager manager; void go(Other manager) { manager.accept("x"); } }' },
  };
  for (const [name, files] of Object.entries(cases)) {
    const graph = await javaGraph(files);
    const target = edgesOf(graph, 'calls').filter((e) => /accept|equals/.test(e.target));
    assert.equal(target.length, 0, `${name}: must not be a confirmed call`);
  }
});

// Review cases from Docs#167 (both compile with javac --release 17; targets checked against javap -c).
test('a class type parameter that shadows an indexed class never binds to that class', async () => {
  const graph = await javaGraph({
    'Manager.java': 'class Manager { void accept(String value) {} }',
    'Other.java': 'class Other { void accept(Integer value) {} }',
    'Caller.java': 'class Caller<Manager extends Other> { Manager manager; void go() { manager.accept(1); } }',
  });
  const wrong = graph.edges.filter((e) => e.source === 'function:Caller.java:Caller.go()' && e.target.startsWith('function:Manager.java:'));
  assert.deepEqual(wrong, [], 'Manager is the type parameter here, the compiler binds Other.accept(Integer)');
  assert.equal(edgesOf(graph, 'calls').filter((e) => e.source === 'function:Caller.java:Caller.go()').length, 0);
});

test('a method type parameter shadows an indexed class for its parameters', async () => {
  const graph = await javaGraph({
    'Manager.java': 'class Manager { void accept(String value) {} }',
    'Other.java': 'class Other { void accept(Integer value) {} }',
    'Caller.java': 'class Caller { <Manager extends Other> void go(Manager manager) { manager.accept(1); } }',
  });
  assert.deepEqual(graph.edges.filter((e) => e.source.startsWith('function:Caller.java:') && e.target.startsWith('function:Manager.java:')), []);
});

test('a for-initializer variable is scoped to its loop', async () => {
  const graph = await javaGraph({
    'Manager.java': 'class Manager { void accept(String value) {} }',
    'Other.java': 'class Other { void accept(String value) {} }',
    'Caller.java': 'class Caller { Manager manager; void go() { for (Other manager = new Other(); ; ) { manager.accept("loop"); break; } manager.accept("field"); } }',
  });
  const calls = edgesOf(graph, 'calls').filter((e) => e.source === 'function:Caller.java:Caller.go()').map((e) => e.target).sort();
  assert.deepEqual(calls, ['function:Manager.java:Manager.accept(String)', 'function:Other.java:Other.accept(String)']);
});

test('a local declared in a switch block does not leak past the switch', async () => {
  const graph = await javaGraph({
    'Manager.java': 'class Manager { void accept(String value) {} }',
    'Other.java': 'class Other { void accept(String value) {} }',
    'Caller.java': 'class Caller { Manager manager; void go(int k) { switch (k) { case 1: Other manager = new Other(); manager.accept("in"); break; } manager.accept("field"); } }',
  });
  const calls = edgesOf(graph, 'calls').filter((e) => e.source === 'function:Caller.java:Caller.go(int)').map((e) => e.target).sort();
  assert.deepEqual(calls, ['function:Manager.java:Manager.accept(String)', 'function:Other.java:Other.accept(String)']);
});

test('real pinned Java grammar limitation is explicit and does not erase other declarations', async () => {
  const { plugin, core } = await parser();
  const content = `class Controller {
 void okay(String id) {}
 void invoke(Object @NonNull ... uriVariables) {}
}`;
  const analysis = plugin.analyzeFile('Controller.java', content);
  assert.ok(analysis.functions.some((fn) => fn.name === 'Controller.okay(String)'));
  const affected = analysis.functions.find((fn) => fn.displayName === 'invoke');
  assert.equal(affected.signatureStatus, 'unresolved');
  assert.match(affected.name, /Controller\.invoke\(<unresolved-signature:[a-f0-9]+>\)/);
  assert.ok(analysis.parserIssues.length > 0);
  const f = fixture({ 'Controller.java': content });
  try {
    const extraction = createProjectExtraction({ repoDir: f.root, files: f.files });
    extraction.addFile('Controller.java', content, analysis, []);
    const builder = new core.GraphBuilder('Fixture', 'a'.repeat(40));
    builder.addFileWithAnalysis('Controller.java', analysis, { fileSummary: '', summaries: {}, tags: [], complexity: 'simple' });
    const graph = extraction.complete(builder.build());
    const detail = graph.metadata.extraction.diagnostics.unsupportedInputs;
    assert.equal(detail.byRelation.calls, analysis.parserIssues.length);
    assert.equal(graph.relationCoverage.calls.unsupported, detail.byRelation.calls);
  } finally { f.close(); }
});

test('fluent Java receivers do not duplicate source and unresolved diagnostics have bounded samples with exact totals', async () => {
  const { plugin, core } = await parser();
  const file = 'Large.java';
  const content = `class Large { void run() { ${'missing();'.repeat(500)} builder${'.next()'.repeat(100)}.finish(); } }`;
  const analysis = plugin.analyzeFile(file, content), calls = plugin.extractCallGraph(file, content);
  assert.ok(Math.max(...calls.map((call) => call.callee.length)) < 100);
  const f = fixture({ [file]: content });
  try {
    const extraction = createProjectExtraction({ repoDir: f.root, files: f.files });
    const builder = new core.GraphBuilder('Fixture', 'a'.repeat(40));
    builder.addFileWithAnalysis(file, analysis, { fileSummary: '', summaries: {}, tags: [], complexity: 'simple' });
    extraction.addFile(file, content, analysis, calls);
    const graph = extraction.complete(builder.build());
    assert.equal(graph.relationCoverage.calls.unresolved, calls.length);
    const summary = graph.metadata.extraction.diagnostics.unresolvedCalls;
    assert.equal(summary.total, calls.length);
    assert.equal(summary.retained, graph.metadata.extraction.unresolvedCalls.length);
    assert.equal(summary.omitted, calls.length - summary.retained);
    assert.ok(summary.omitted > 400);
    assert.ok(JSON.stringify(graph.metadata.extraction).length < 30_000);
  } finally { f.close(); }
});

test('TypeScript project resolves FE/Admin relative, alias, index.tsx, re-export and NodeNext-style imports', () => {
  const f = fixture({
    'tsconfig.json': '{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] }, "jsx": "react-jsx", "moduleResolution": "bundler", "module": "esnext" } }',
    'src/api/fetchData.ts': 'export function fetchData() { return 1; }',
    'src/api/index.ts': "export { fetchData as request } from './fetchData';",
    'src/components/Button/index.tsx': 'export const Button = () => null;',
    'src/components/entry.tsx': `import { fetchData } from '../api/fetchData';
import { request } from '@/api';
import { Button } from './Button';
import { fetchData as jsImport } from '../api/fetchData.js';
import absent from './absent';
import React from 'react';
export const run = () => fetchData() + request() + jsImport();`,
  });
  try {
    const extraction = createProjectExtraction({ repoDir: f.root, files: f.files });
    const graph = { project: { gitCommitHash: 'a'.repeat(40) }, nodes: f.files.map((file) => ({ id: `file:${file}`, type: 'file', filePath: file })), edges: [] };
    const result = extraction.complete(graph);
    const edges = result.edges.filter((e) => e.type === 'imports' && e.source === 'file:src/components/entry.tsx');
    assert.deepEqual(edges.map((e) => e.target).sort(), ['file:src/api/fetchData.ts', 'file:src/api/index.ts', 'file:src/components/Button/index.tsx'].sort());
    const reasons = result.metadata.extraction.unresolvedImports;
    assert.equal(reasons.find((r) => r.specifier === './absent').reason, 'module-not-found');
    assert.equal(reasons.find((r) => r.specifier === 'react').reason, 'external-package-unavailable');
    assert.equal(result.relationCoverage.imports.emitted, result.edges.filter((e) => e.type === 'imports').length);
    assert.equal(result.relationCoverage.imports.status, 'partial');
  } finally { f.close(); }
});

test('TypeScript bound symbol resolves imported alias; unrelated same-named export creates no false call', () => {
  const f = fixture({
    'tsconfig.json': '{ "compilerOptions": { "moduleResolution": "bundler", "module": "esnext" } }',
    'src/a.ts': 'export function save() { return 1; }',
    'src/b.ts': 'export function save() { return 2; }',
    'src/main.ts': "import { save as persist } from './a';\nexport function run() { return persist(); }",
  });
  try {
    const extraction = createProjectExtraction({ repoDir: f.root, files: f.files });
    const nodes = f.files.map((file) => ({ id: `file:${file}`, type: 'file', filePath: file }));
    for (const [file, name, line] of [['src/a.ts', 'save', 1], ['src/b.ts', 'save', 1], ['src/main.ts', 'run', 2]]) nodes.push({ id: `function:${file}:${name}`, name, type: 'function', filePath: file, lineRange: [line, line] });
    const graph = extraction.complete({ project: {}, nodes, edges: [] });
    const calls = graph.edges.filter((e) => e.type === 'calls');
    assert.deepEqual(calls.map(({ source, target }) => [source, target]), [['function:src/main.ts:run', 'function:src/a.ts:save']]);
  } finally { f.close(); }
});

// Source fixtures are byte-identical Dev files: Frontend70f0813 src/api/apiAcceptAnonymousEnquiry.ts
// and Admin613a107 src/api/agency/assignAgencyToConsultants.ts. Dependencies only establish
// target files for module resolution; no network or product behavior is simulated.
test('real Frontend and Admin API source retains every internal import', () => {
  for (const sample of [
    { fixture: 'frontend-api.ts', entry: 'src/api/apiAcceptAnonymousEnquiry.ts', targets: ['src/resources/scripts/endpoints.ts', 'src/api/fetchData.ts'] },
    { fixture: 'admin-api.ts', entry: 'src/api/agency/assignAgencyToConsultants.ts', targets: ['src/api/counselor/getCounselorById.ts', 'src/api/agency/putAgenciesForCounselor.ts'] },
  ]) {
    const content = readFileSync(new URL(`./extraction-fixtures/${sample.fixture}`, import.meta.url), 'utf8');
    const f = fixture({ [sample.entry]: content, ...Object.fromEntries(sample.targets.map((target) => [target, 'export {};'])) });
    try {
      const extraction = createProjectExtraction({ repoDir: f.root, files: f.files });
      const graph = extraction.complete({ project: {}, nodes: f.files.map((file) => ({ id: `file:${file}`, type: 'file', filePath: file })), edges: [] });
      assert.deepEqual(graph.edges.filter((edge) => edge.type === 'imports').map((edge) => edge.target).sort(), sample.targets.map((target) => `file:${target}`).sort());
      assert.equal(graph.relationCoverage.imports.unresolved, 0);
    } finally { f.close(); }
  }
});

test('source fingerprint is body-sensitive and complete file nodes have exact ranges', () => {
  const f = fixture({ 'src/a.ts': 'function a() {\n  return 1;\n}\n' });
  try {
    const nodes = [{ id: 'file:src/a.ts', type: 'file', filePath: 'src/a.ts' }, { id: 'function:src/a.ts:a', type: 'function', filePath: 'src/a.ts', lineRange: [1, 3] }];
    const graph = { project: { gitCommitHash: 'a'.repeat(40) }, nodes };
    attachSourceEvidence(graph, f.root);
    assert.deepEqual(nodes[0].lineRange, [1, 4]);
    const first = nodes[1].metadata.sourceFingerprint;
    assert.equal(first, createHash('sha256').update('function a() {\n  return 1;\n}').digest('hex'));
    writeFileSync(join(f.root, 'src/a.ts'), 'function a() {\n  return 2;\n}\n');
    attachSourceEvidence(graph, f.root);
    assert.notEqual(nodes[1].metadata.sourceFingerprint, first);
    assert.equal(nodes[1].metadata.sourceCommit, 'a'.repeat(40));
  } finally { f.close(); }
});

test('real generated UserService fits the publication budget without truncating identities', { skip: !process.env.UA_REAL_USER_GRAPH }, () => {
  const bytes = readFileSync(process.env.UA_REAL_USER_GRAPH);
  const graph = JSON.parse(bytes);
  assert.ok(bytes.length < 64 * 1024 * 1024, `UserService graph is ${bytes.length} bytes`);
  assert.ok(Buffer.byteLength(JSON.stringify(graph.metadata.extraction)) < 8 * 1024 * 1024);
  assert.equal(new Set(graph.nodes.map((node) => node.id)).size, graph.nodes.length);
  const legacy = 'function:src/main/java/de/caritas/cob/userservice/api/IdentityManager.java:setUpOneTimePassword';
  assert.equal(graph.metadata.extraction.ambiguousLegacyIds[legacy].length, 2);
  assert.ok(graph.nodes.filter((node) => node.type === 'function').length > 10_000);
  assert.equal(graph.relationCoverage.calls.emitted, 0);
  assert.ok(graph.relationCoverage.calls_unconfirmed.emitted > 0);
  assert.equal(graph.metadata.extraction.diagnostics.unresolvedCalls.total, graph.relationCoverage.calls.unresolved);
});
