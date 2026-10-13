import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderGlossary} from '../render-glossary.mjs';

const catalog = JSON.parse(readFileSync(new URL('../../../glossary/catalog.json', import.meta.url)));

test('glossary readers can find all reviewed concepts, definitions and stable related links in both languages', () => {
  const html = renderGlossary(catalog);
  for (const concept of catalog.concepts) {
    assert.ok(html.includes(`id="${concept.id}"`), `Missing stable anchor ${concept.id}`);
    for (const locale of ['de', 'en']) {
      assert.ok(html.includes(concept[locale].term));
      assert.ok(html.includes(concept[locale].definition.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')));
    }
    for (const related of concept.related) assert.ok(html.includes(`href="#${related}"`));
  }
  assert.ok(html.includes('Plattformvertrag'));
  assert.ok(html.includes('Platform Services Agreement'));
  assert.ok(html.includes('Data Processing Agreement'));
});

test('rendered release evidence gives verified graph links and keeps missing or historical mappings explicit', () => {
  const source = catalog.concepts.find(concept => concept.id === 'provider').sources[0];
  const mapping = catalog.concepts.find(concept => concept.id === 'provider').graphMappings[0];
  const options = {
    sourceBindings: [{conceptId: 'provider', sourceIndex: 0, state: 'verified', selectedRevision: 'b'.repeat(40), reasonKey: 'source-content-unchanged'}],
    graphMappings: [{conceptId: 'provider', ...mapping, state: 'verified', selectedRevision: source.sourceRevision, href: '/tenant-service/?token=public-graph', reasonKey: 'source-review-matches'}]
  };
  const html = renderGlossary(catalog, options);
  assert.ok(html.includes('Verified against selected source'));
  assert.ok(html.includes('href="/tenant-service/?token=public-graph"'));
  assert.ok(html.includes('Open graph'));
  assert.ok(html.includes('Graph target has not been verified for the selected release.'));
  assert.ok(html.includes('b'.repeat(40)));
  const historical = renderGlossary(catalog, {...options, graphMappings: [{...options.graphMappings[0], state: 'historical'}]});
  assert.ok(!historical.includes('href="/tenant-service/?token=public-graph"'));
});

test('published input snapshots are readable only through their verified exact internal source path, with native Docs graph node IDs visible', () => {
  const concept = catalog.concepts.find(item => item.id === 'platform-operator');
  const sourceIndex = concept.sources.findIndex(source => source.binding === 'input-snapshot');
  const mapping = concept.graphMappings[0];
  const sourceBinding = {conceptId: concept.id, sourceIndex, state: 'verified', reasonKey: 'source-content-unchanged', href: '/glossary/sources/seed.md'};
  const graphMapping = {conceptId: concept.id, ...mapping, state: 'verified', reasonKey: 'source-content-unchanged', href: '/docs/?token=oriso-docs-dashboard', viewerNodeId: mapping.nodeId};
  const html = renderGlossary(catalog, {sourceBindings: [sourceBinding], graphMappings: [graphMapping]});
  assert.ok(html.includes('href="/glossary/sources/seed.md"'));
  assert.ok(html.includes(`<code>${mapping.nodeId}</code>`));
  assert.ok(html.includes('Node ID in this viewer'));
  assert.ok(!renderGlossary(catalog).includes('Die Eingabe ist als Snapshot im Release enthalten'));
  assert.ok(renderGlossary(catalog).includes('Editorial input snapshot with recorded hash'));
  const unavailable = renderGlossary(catalog, {sourceBindings: [{...sourceBinding, state: 'unavailable'}]});
  assert.ok(!unavailable.includes('href="/glossary/sources/seed.md"'));
  assert.throws(() => renderGlossary(catalog, {sourceBindings: [{...sourceBinding, href: '/glossary/sources/other.md'}]}), /Invalid verified snapshot link/);
  assert.throws(() => renderGlossary(catalog, {sourceBindings: [{...sourceBinding, href: 'javascript:alert(1)'}]}), /Invalid verified snapshot link/);
});

test('untrusted definition, label and embedded search text remain text; unsafe links and missing translations fail usefully', () => {
  const dangerous = structuredClone(catalog);
  dangerous.concepts[0].de.definition = 'A <script>alert("unsafe")</script> & text';
  const html = renderGlossary(dangerous);
  assert.ok(html.includes('A &lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt; &amp; text'));
  assert.ok(!html.includes('<script>alert('));
  const embedded = /<script type="application\/json" id="glossary-data">([\s\S]*?)<\/script>/.exec(html)[1];
  assert.equal(JSON.parse(embedded).concepts[0].de.definition, dangerous.concepts[0].de.definition);
  assert.ok(!embedded.includes('</script>'));
  const mapping = catalog.concepts[0].graphMappings[0];
  assert.throws(() => renderGlossary(catalog, {graphMappings: [{conceptId: catalog.concepts[0].id, ...mapping, state: 'verified', reasonKey: 'source-content-unchanged', href: 'javascript:alert(1)'}]}), /Unsafe public glossary link/);
  const incomplete = structuredClone(catalog);
  delete incomplete.concepts[0].en.definition;
  assert.throws(() => renderGlossary(incomplete), /platform-operator.*en.definition/);
});

test('reader sees DDD responsibility and evidence scope without treating draft terms or legacy identifiers as current delivery', () => {
  const html = renderGlossary(catalog);
  assert.ok(html.includes('Verantwortung'));
  assert.ok(html.includes('Responsibility'));
  assert.ok(html.includes('Entwurf'));
  assert.ok(html.includes('Draft'));
  assert.ok(html.includes('Technische Zuordnungen'));
  assert.ok(html.includes('Technical mappings'));
  assert.ok(html.includes('Graph target has not been verified for the selected release.'));
  assert.ok(!html.includes('href="/agency-service/?'));
  assert.ok(html.includes('https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/7b544fbb0faca5ec941db4369855b4bcfa28207c/oriso-platform/decisions/ADR-023-platform-services-agreement-and-traeger-governance.md'));
  assert.ok(html.includes('Legacy code review'));
  assert.ok(html.includes('migration-candidate'));
  assert.ok(html.includes('GroupChatParticipant.chatId'));
});

test('actual source and graph outcomes and compatibility explanations render in both languages', async () => {
  const {assessSourceBinding} = await import('../../../glossary/source-bindings.mjs');
  const {projectGlossary} = await import('../../../lib/glossary-projection.mjs');
  const concept = catalog.concepts.find(c => c.id === 'provider');
  const source = concept.sources[0];
  const bytes = readFileSync(new URL(`../../../../../${source.path}`, import.meta.url));
  const binding = assessSourceBinding(source, {repository: source.repository, revision: 'b'.repeat(40), readSource: () => bytes});
  const repository = 'ORISO-TenantService', revision = catalog.audit.sourceVector[repository];
  const graph = {project: {name: repository, gitCommitHash: revision}, nodes: [{id: 'concept:tenant-registry', type: 'concept', name: 'Tenant Registry', tags: []}]};
  const html = renderGlossary(catalog, {sourceBindings: [{conceptId: concept.id, sourceIndex: 0, ...binding}], graphMappings: projectGlossary(catalog, graph, {repository, revision}).outcomes});
  assert.ok(html.includes('<span lang="de">Der Inhalt ist unverändert; die ursprüngliche Prüfrevision bleibt historische Provenienz.</span>'));
  assert.ok(html.includes('<span lang="en">Content is unchanged; original review revision remains historical provenance.</span>'));
  assert.ok(html.includes('<span lang="de">Die Zuordnung der Fachsprache ist redaktionell; die ursprünglichen Verhaltensbelege bleiben unverändert.</span>'));
  assert.ok(html.includes('<span lang="de">In neuen Texten für Menschen den bevorzugten Fachbegriff verwenden.</span>'));
  assert.ok(html.includes('<span lang="en">Use the preferred business term in new human-facing copy.</span>'));
  assert.ok(html.includes('<span lang="de">Bestehende Kennungen, Routen, Berechtigungen und technische Kontexte bleiben unverändert.</span>'));
  const missing = structuredClone(catalog);
  delete missing.concepts.find(c => c.id === 'provider').deprecatedTerms[0].reason.de;
  assert.throws(() => renderGlossary(missing), /provider.*reason.de/);
  assert.throws(() => renderGlossary(catalog, {sourceBindings: [{conceptId: concept.id, sourceIndex: 0, ...binding, reasonKey: 'unknown'}]}), /Unknown glossary reason/);
});
