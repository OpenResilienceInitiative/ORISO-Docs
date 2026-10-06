const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const states = new Set(['accepted','proposed','editorial','draft','historical','external-authority']);
const editorialStates = new Set(['source-backed','editorial','draft','historical']);
const classes = new Set(['copy-correction','valid-technical-context','compatibility-alias','generator-spec','migration-candidate','unresolved','historical']);
function fail(field,message) { throw new Error(`glossary.${field}: ${message}`); }
function text(value,field) {
  if (typeof value !== 'string' || !value.trim()) fail(field,'expected nonempty text');
  if (/(?:\/Users\/|\/home\/|[A-Z]:\\|file:\/\/|(?:sk-|ghp_|github_pat_)[A-Za-z0-9_]{16,})/.test(value)) fail(field,'private path or credential-like content is not publishable');
}
function array(value,field) { if (!Array.isArray(value)) fail(field,'expected array'); }
function bilingual(value,field) { for (const locale of ['de','en']) text(value?.[locale],`${field}.${locale}`); }
function path(value,field) {
  text(value,field);
  if (value.startsWith('/') || value.includes('\\') || value.split('/').includes('..') || /^[a-z]+:/i.test(value)) fail(field,'expected repository-relative path');
}
function https(value,field) { try { const u=new URL(value); if(u.protocol !== 'https:' || u.username || u.password) fail(field,'expected public HTTPS URL'); } catch { fail(field,'expected public HTTPS URL'); } }
function date(value,field) { if (typeof value!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) fail(field,'expected ISO review date'); }
function source(s,field) {
  text(s?.repository,`${field}.repository`); text(s?.title,`${field}.title`);
  if (!states.has(s.state)) fail(`${field}.state`,'unknown evidence state');
  date(s.reviewedAt,`${field}.reviewedAt`);
  if (s.binding==='external') {
    https(s.url,`${field}.url`); if(s.sourceRevision !== null || s.sourceHash !== null) fail(field,'external authority must not impersonate a repository binding');
    return;
  }
  path(s.path,`${field}.path`);
  if (!HASH.test(s.sourceHash)) fail(`${field}.sourceHash`,'expected SHA256 content hash');
  if (s.binding==='input-snapshot') {
    if (s.sourceRevision!==null) fail(`${field}.sourceRevision`,'new provided input has no historical repository revision');
  } else if(s.binding==='reviewed') {
    if(!SHA.test(s.sourceRevision)) fail(`${field}.sourceRevision`,'expected exact reviewed Git revision');
  } else fail(`${field}.binding`,'unknown source binding');
}
/** Public content-validation seam. Valid content is separate from delivery evidence. */
export function validateGlossary(data) {
  if (!data || data.schemaVersion !== 1) fail('schemaVersion','expected 1');
  date(data.reviewedAt,'reviewedAt');
  array(data.categories,'categories'); array(data.concepts,'concepts');
  if (!data.concepts.length) fail('concepts','expected nonempty vocabulary');
  const categoryIds=new Set(),ids=new Set(),domainLabels=new Map();
  for(const c of data.categories) {
    if(!ID.test(c.id)||categoryIds.has(c.id)) fail('categories.id',`invalid or duplicate ${c.id}`);
    categoryIds.add(c.id); bilingual(c,`categories.${c.id}`);
  }
  for(const c of data.concepts) {
    if(!ID.test(c.id)||ids.has(c.id)) fail('concepts.id',`invalid or duplicate ${c.id}`); ids.add(c.id);
  }
  for (const c of data.concepts) {
    const f=`concepts.${c.id}`;
    if(!categoryIds.has(c.category)) fail(`${f}.category`,`unknown ${c.category}`);
    for(const lang of ['de','en']) {
      for(const key of ['term','definition','example']) text(c[lang]?.[key],`${f}.${lang}.${key}`);
      array(c.aliases?.[lang],`${f}.aliases.${lang}`);
      c.aliases[lang].forEach((v,i)=>text(v,`${f}.aliases.${lang}[${i}]`));
    }
    if (!editorialStates.has(c.editorialState)) fail(`${f}.editorialState`,'unknown editorial state');
    for(const key of ['context','responsibility','invariant']) bilingual(c[key],`${f}.${key}`);
    array(c.related,`${f}.related`);
    for (const id of c.related) if(!ids.has(id)) fail(`${f}.related`,`unknown concept ${id}`);
    array(c.deprecatedTerms,`${f}.deprecatedTerms`);
    for(const t of c.deprecatedTerms) {
      if(!['de','en'].includes(t.language)) fail(`${f}.deprecatedTerms.language`,'expected de/en');
      for(const key of ['term','reason','compatibilityScope']) text(t[key],`${f}.deprecatedTerms.${key}`);
      if(t.term.normalize('NFKC').toLocaleLowerCase() === c[t.language].term.normalize('NFKC').toLocaleLowerCase()) fail(`${f}.deprecatedTerms`,'preferred term cannot be deprecated');
    }
    array(c.sources,`${f}.sources`); if(!c.sources.length) fail(`${f}.sources`,'expected provenance');
    c.sources.forEach((s,i)=>source(s,`${f}.sources[${i}]`));
    if(c.editorialState==='source-backed'&&!c.sources.some(s=>['accepted','proposed'].includes(s.state))) fail(`${f}.sources`,'source-backed term needs architectural provenance');
    array(c.codeMappings,`${f}.codeMappings`);
    for(const m of c.codeMappings) {
      const mf=`${f}.codeMappings.${m.symbol}`;
      text(m.repository,`${mf}.repository`);path(m.path,`${mf}.path`);text(m.symbol,`${mf}.symbol`);
      if(!SHA.test(m.sourceRevision)||!HASH.test(m.sourceHash)) fail(mf,'expected exact reviewed revision and content hash');
      if(!classes.has(m.classification)) fail(`${mf}.classification`,'unknown disposition');
      if(m.binding!=='historical-review') fail(`${mf}.binding`,'reviewed code examples must retain historical-review provenance');
      date(m.reviewedAt,`${mf}.reviewedAt`);
      if(!Number.isInteger(m.line)||m.line<1) fail(`${mf}.line`,'expected positive source line');
    }
    array(c.graphMappings,`${f}.graphMappings`);
    for(const m of c.graphMappings) {
      text(m.repository,`${f}.graphMappings.repository`);text(m.nodeId,`${f}.graphMappings.nodeId`);
      if(!['source-file','domain-concept'].includes(m.mode)) fail(`${f}.graphMappings.mode`,'expected source-file or domain-concept candidate');
      if(m.mode==='domain-concept') {
        if(!/^concept:[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(m.nodeId)) fail(`${f}.graphMappings.nodeId`,'domain-concept mapping requires a concept-qualified node ID');
        bilingual(m.label,`${f}.graphMappings.label`);
        const key=`${m.repository}::${m.nodeId}`,label=JSON.stringify([m.label.de,m.label.en]);
        if(domainLabels.has(key)&&domainLabels.get(key)!==label) fail(`${f}.graphMappings.label`,`conflicting domain-concept labels for ${key}`);
        domainLabels.set(key,label);
      }
    }
  }
  array(data.reconciliation,'reconciliation');
  if(!Number.isInteger(data.inputCoverage?.bjornRows)||data.reconciliation.length!==data.inputCoverage.bjornRows) fail('reconciliation',`expected all ${data.inputCoverage?.bjornRows ?? 'declared'} partner input rows`);
  array(data.inputCoverage?.seedConceptIds,'inputCoverage.seedConceptIds');
  for(const id of data.inputCoverage.seedConceptIds) if(!ids.has(id)) fail('inputCoverage.seedConceptIds',`missing requested seed ${id}`);
  const rowIds=new Set();
  for(const r of data.reconciliation) {
    if(!ID.test(r.id)||rowIds.has(r.id)) fail('reconciliation.id',`invalid or duplicate ${r.id}`); rowIds.add(r.id);
    text(r.inputTerm,`reconciliation.${r.id}.inputTerm`);text(r.disposition,`reconciliation.${r.id}.disposition`);
    bilingual(r.preferred,`reconciliation.${r.id}.preferred`);date(r.sourceDate,`reconciliation.${r.id}.sourceDate`);
    array(r.conceptIds,`reconciliation.${r.id}.conceptIds`);
    if(!r.conceptIds.length) fail(`reconciliation.${r.id}.conceptIds`,'expected disposition target');
    for(const id of r.conceptIds) if(!ids.has(id)) fail(`reconciliation.${r.id}.conceptIds`,`unknown concept ${id}`);
  }
  array(data.copyPolicy?.deprecatedHumanTerms,'copyPolicy.deprecatedHumanTerms');
  array(data.copyPolicy?.allowlist,'copyPolicy.allowlist');
  for(const rule of data.copyPolicy.deprecatedHumanTerms) {
    if(!['de','en'].includes(rule.language)) fail('copyPolicy.language','expected de/en');
    text(rule.term,'copyPolicy.term');text(rule.preferred,'copyPolicy.preferred');
    const escaped=rule.term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const pattern=new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,'iu');
    for(const c of data.concepts) for(const field of ['term','definition','example']) {
      if(!pattern.test(c[rule.language][field])) continue;
      const allowed=data.copyPolicy.allowlist.find(a=>a.conceptId===c.id&&a.language===rule.language&&a.field===field&&a.term===rule.term);
      if(!allowed) fail(`concepts.${c.id}.${rule.language}.${field}`,`deprecated human wording ${rule.term}; use ${rule.preferred} or record the explicit compatibility context`);
      text(allowed.reason,'copyPolicy.allowlist.reason');
    }
  }
  if(!data.audit || !data.audit.sourceVector) fail('audit','expected exact source inventory');
  for (const [repo,revision] of Object.entries(data.audit.sourceVector)) {text(repo,'audit.sourceVector.repository');if(!SHA.test(revision)) fail(`audit.sourceVector.${repo}`,'expected exact audited revision');}
  text(JSON.stringify(data),'content');
  return data;
}
