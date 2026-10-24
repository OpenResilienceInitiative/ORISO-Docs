// Idea pages (ORISO-Docs#223): front matter validation and the ideas.json the Plan view reads.
// Seam: buildIdeas(root) over a small repository tree, plus the real tree.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIdeas, parseFrontMatter, STATUSES } from "../lib/ideas.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REAL = resolve(here, "../../..");

function page(front, body = "Text.") {
  return `---\n${front}\n---\n\n${body}\n`;
}
const GOOD = (extra = "") => `title: "Idea one"\ndescription: "A short summary."\nstatus: discussed\ncapabilities: [case-handover, notifications]\n${extra}`;
const GOOD_DE = (extra = "") => `title: "Idee eins"\ndescription: "Eine kurze Zusammenfassung."\nstatus: discussed\ncapabilities: [case-handover, notifications]\n${extra}`;

/** A tree with the capability rules, the public repository list, the catalog and the given idea files. */
function tree(t, files) {
  const root = mkdtempSync(join(tmpdir(), "ideas-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (p, text) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), text); };
  put("tools/understand-anything/platform/capabilities/capability-rules.json", JSON.stringify({ capabilities: { "case-handover": {}, notifications: {}, chat: {} } }));
  put("tools/truth-chain/public-repositories.json", JSON.stringify({ repositories: ["ORISO-Docs", "ORISO-Frontend", "ORISO-E2E"] }));
  put("tools/planning-map/board-contract.json", JSON.stringify({ project: { owner: "OpenResilienceInitiative" }, privateRepositories: ["OpenResilienceInitiative/ORISO-E2E"] }));
  const pages = [];
  for (const [slug, { en, de, noDe, noCatalog }] of Object.entries(files)) {
    put(`product/ideas/${slug}.mdx`, en);
    put(`site/translations/en/product/ideas/${slug}.mdx`, en);
    if (!noDe) put(`site/translations/de/product/ideas/${slug}.mdx`, de ?? en);
    if (!noCatalog) pages.push({ id: `product/ideas/${slug}`, source: `product/ideas/${slug}.mdx`, route: `produkt/ideas/${slug}` });
  }
  put("site/page-catalog.json", JSON.stringify({ pages }));
  return root;
}
const fails = (root, re) => assert.throws(() => buildIdeas(root), re);

test("the flow is idea, discussed, specified, epic", () => {
  assert.deepEqual([...STATUSES], ["idea", "discussed", "specified", "epic"]);
});

test("front matter parser reads scalars, quoted strings and inline lists", () => {
  const { data } = parseFrontMatter(page('title: "A: b"\nstatus: idea\ncapabilities: [x, "y-z"]\nn: 3\nempty: []'));
  assert.deepEqual(data, { title: "A: b", status: "idea", capabilities: ["x", "y-z"], n: 3, empty: [] });
  assert.equal(parseFrontMatter("no front matter").data, null);
});

test("a valid idea becomes one entry with both languages, status, capabilities and doc links", t => {
  const root = tree(t, { "handover-v2": { en: page(GOOD()), de: page(GOOD_DE()) } });
  const doc = buildIdeas(root);
  assert.equal(doc.schemaVersion, 1);
  assert.deepEqual(doc.ideas, [{
    id: "handover-v2", status: "discussed", capabilities: ["case-handover", "notifications"],
    title: { de: "Idee eins", en: "Idea one" }, summary: { de: "Eine kurze Zusammenfassung.", en: "A short summary." },
    pages: { de: "https://docs.oriso.org/de/produkt/ideas/handover-v2", en: "https://docs.oriso.org/en/produkt/ideas/handover-v2" },
  }]);
});

test("epic and draftItems are carried; the epic gets its GitHub issue URL", t => {
  const extra = "epic: OpenResilienceInitiative/ORISO-Frontend#42\ndraftItems: 5";
  const root = tree(t, { a: { en: page(GOOD(extra).replace("discussed", "epic")), de: page(GOOD_DE(extra).replace("discussed", "epic")) } });
  const [idea] = buildIdeas(root).ideas;
  assert.equal(idea.epic, "OpenResilienceInitiative/ORISO-Frontend#42");
  assert.equal(idea.epicUrl, "https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/42");
  assert.equal(idea.draftItems, 5);
});

test("unknown capability ids fail the build and name the idea and the id", t => {
  const bad = page(GOOD().replace("notifications", "no-such-capability"));
  fails(tree(t, { a: { en: bad } }), /a\.mdx.*no-such-capability/s);
});

test("status outside the flow, missing capabilities and duplicate capabilities fail", t => {
  fails(tree(t, { a: { en: page(GOOD().replace("discussed", "done")) } }), /status/);
  fails(tree(t, { a: { en: page(GOOD().replace("[case-handover, notifications]", "[]")) } }), /capabilities/);
  fails(tree(t, { a: { en: page(GOOD().replace("[case-handover, notifications]", "[chat, chat]")) } }), /twice/);
});

test("epic must be Org/Repo#n of a public repository, and is required for status epic", t => {
  for (const epic of ["ORISO-Frontend#42", "OpenResilienceInitiative/ORISO-E2E#1", "Other/ORISO-Frontend#1", "OpenResilienceInitiative/ORISO-Frontend#0", "https://evil.example/x#1"])
    fails(tree(t, { a: { en: page(GOOD("epic: " + epic)) } }), /epic/);
  fails(tree(t, { a: { en: page(GOOD().replace("discussed", "epic")) } }), /epic.*required/is);
});

test("draftItems is a count only", t => {
  for (const v of ["-1", "2.5", "many", "[1]"]) fails(tree(t, { a: { en: page(GOOD("draftItems: " + v)) } }), /draftItems/);
});

test("the German page must exist and carry the same status, capabilities and epic", t => {
  fails(tree(t, { a: { en: page(GOOD()), noDe: true } }), /de.*missing|missing.*de/is);
  fails(tree(t, { a: { en: page(GOOD()), de: page(GOOD_DE().replace("discussed", "idea")) } }), /de.*status/is);
  fails(tree(t, { a: { en: page(GOOD()), de: page(GOOD_DE().replace("notifications", "chat")) } }), /de.*capabilities/is);
});

test("an idea page must be in the page catalog, otherwise the link would be dead", t => {
  fails(tree(t, { a: { en: page(GOOD()), noCatalog: true } }), /catalog/);
});

test("template pages are not on the canvas, whatever they list", t => {
  const tpl = page('title: "Template"\ndescription: "How to write an idea."\nstatus: idea\ncapabilities: []\ntemplate: true');
  const root = tree(t, { "idea-template": { en: tpl }, real: { en: page(GOOD()), de: page(GOOD_DE()) } });
  assert.deepEqual(buildIdeas(root).ideas.map(i => i.id), ["real"]);
});

test("ideas are sorted by id and the output is deterministic", t => {
  const files = { b: { en: page(GOOD()), de: page(GOOD_DE()) }, a: { en: page(GOOD()), de: page(GOOD_DE()) } };
  const root = tree(t, files);
  assert.deepEqual(buildIdeas(root).ideas.map(i => i.id), ["a", "b"]);
  assert.equal(JSON.stringify(buildIdeas(root)), JSON.stringify(buildIdeas(root)));
});

test("slugs are lowercase words with hyphens", t => {
  fails(tree(t, { "Bad_Name": { en: page(GOOD()) } }), /Bad_Name/);
});

test("the real repository validates and its template is not on the canvas", () => {
  const doc = buildIdeas(REAL);
  assert.equal(doc.schemaVersion, 1);
  assert.ok(Array.isArray(doc.ideas));
  assert.ok(!doc.ideas.some(i => i.id === "idea-template"));
});
