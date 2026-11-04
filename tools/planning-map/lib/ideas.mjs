// Idea pages (ORISO-Docs#223, epic #213): front matter validation and the ideas.json for the Plan view.
// An idea is a bilingual feature page under product/ideas/. Its machine-readable fields live in the front matter:
//   status: idea | discussed | specified | epic      flow shown on the canvas
//   capabilities: [ids]                              capability ids of capability-rules.json; unknown ids fail
//   epic: Org/Repo#n                                 optional; public repositories only; required for status "epic"
//   draftItems: n                                    optional; a count, never titles
//   template: true                                   pages that explain how to write an idea; not on the canvas
// Everything fails loudly: a map that silently drops an idea is worse than a failed build.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export const STATUSES = Object.freeze(["idea", "discussed", "specified", "epic"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EPIC = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#([1-9][0-9]{0,9})$/;
const DIR = "product/ideas";
const DOCS = "https://docs.oriso.org";

function scalar(raw) {
  const v = raw.trim();
  if (v.startsWith('"')) { try { return JSON.parse(v); } catch { return v; } }
  if (v.startsWith("'") && v.endsWith("'") && v.length > 1) return v.slice(1, -1);
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v;
}
function list(raw) {
  const inner = raw.trim().slice(1, -1).trim();
  return inner ? inner.split(",").map(scalar) : [];
}
/** Minimal YAML subset: `key: scalar` and `key: [a, b]`. Returns {data:null} without front matter. */
export function parseFrontMatter(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) return { data: null, body: String(text) };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!kv) continue;
    const raw = kv[2].trim();
    data[kv[1]] = raw.startsWith("[") && raw.endsWith("]") ? list(raw) : scalar(raw);
  }
  return { data, body: m.input.slice(m[0].length) };
}

function context(root) {
  const read = p => JSON.parse(readFileSync(join(root, p), "utf8"));
  const rules = read("tools/understand-anything/platform/capabilities/capability-rules.json");
  const pub = read("tools/truth-chain/public-repositories.json");
  const contract = read("tools/planning-map/board-contract.json");
  const org = contract.project.owner;
  return {
    capabilities: new Set(Object.keys(rules.capabilities)),
    publicRepos: new Set(pub.repositories.map(r => `${org}/${r}`)),
    privateRepos: new Set(contract.privateRepositories),
    org,
  };
}

/** Machine-readable fields of one page, validated. Returns {fields, errors}. */
function fieldsOf(front, ctx, template) {
  const errors = [];
  if (!front) return { fields: null, errors: ["front matter missing"] };
  const { status, capabilities, epic, draftItems } = front;
  if (!STATUSES.includes(status)) errors.push(`status: "${status}" is not one of ${STATUSES.join(", ")}`);
  if (typeof front.title !== "string" || !front.title) errors.push("title: required");
  if (typeof front.description !== "string" || !front.description) errors.push("description: required");
  if (!Array.isArray(capabilities)) errors.push("capabilities: expected a list like [case-handover]");
  else if (!template) {
    if (!capabilities.length) errors.push("capabilities: an idea touches at least one capability");
    const seen = new Set();
    for (const c of capabilities) {
      if (typeof c !== "string" || !ctx.capabilities.has(c)) errors.push(`capabilities: unknown capability id "${c}"`);
      else if (seen.has(c)) errors.push(`capabilities: "${c}" listed twice`);
      seen.add(c);
    }
  }
  if (epic !== undefined) {
    const m = typeof epic === "string" && epic.match(EPIC);
    const repo = m && `${m[1]}/${m[2]}`;
    if (!m) errors.push(`epic: "${epic}" is not Org/Repo#n`);
    else if (m[1] !== ctx.org || !ctx.publicRepos.has(repo) || ctx.privateRepos.has(repo)) errors.push(`epic: ${repo} is not a public repository of ${ctx.org}`);
  } else if (status === "epic" && !template) errors.push("epic: required when status is epic");
  if (draftItems !== undefined && !(Number.isInteger(draftItems) && draftItems >= 0)) errors.push("draftItems: expected a count (0 or more)");
  return { fields: { status, capabilities, epic, draftItems, title: front.title, description: front.description }, errors };
}

const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);

/** Reads product/ideas/*.mdx with its en and de pages, validates, returns {schemaVersion, ideas}. Throws one error listing every problem. */
export function buildIdeas(root) {
  const ctx = context(root);
  const dir = join(root, DIR);
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".mdx")).sort() : [];
  const catalog = JSON.parse(readFileSync(join(root, "site/page-catalog.json"), "utf8")).pages;
  const errors = [], ideas = [];
  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const at = `${DIR}/${file}`;
    const bad = msg => errors.push(`${at}: ${msg}`);
    if (!SLUG.test(slug)) { bad(`"${slug}" is not a lowercase slug`); continue; }
    const en = parseFrontMatter(readFileSync(join(dir, file), "utf8")).data;
    const template = en?.template === true;
    const main = fieldsOf(en, ctx, template);
    main.errors.forEach(bad);
    if (template) continue;
    const dePath = `site/translations/de/${DIR}/${file}`;
    let de = null;
    if (!existsSync(join(root, dePath))) bad(`German page missing (${dePath})`);
    else {
      de = fieldsOf(parseFrontMatter(readFileSync(join(root, dePath), "utf8")).data, ctx, false);
      de.errors.forEach(e => bad(`de: ${e}`));
      if (!main.errors.length && !de.errors.length) {
        if (de.fields.status !== main.fields.status) bad(`de: status "${de.fields.status}" differs from "${main.fields.status}"`);
        if (!sameList(de.fields.capabilities, main.fields.capabilities)) bad("de: capabilities differ from the English page");
        if (de.fields.epic !== main.fields.epic) bad("de: epic differs from the English page");
        if (de.fields.draftItems !== main.fields.draftItems) bad("de: draftItems differs from the English page");
      }
    }
    const entry = catalog.find(p => p.id === `${DIR}/${slug}`);
    if (!entry) { bad("not in site/page-catalog.json, so the page has no published route"); continue; }
    if (main.errors.length || !de || de.errors.length) continue;
    const f = main.fields;
    ideas.push({
      id: slug, status: f.status, capabilities: [...f.capabilities],
      ...(f.epic ? { epic: f.epic, epicUrl: `https://github.com/${f.epic.replace("#", "/issues/")}` } : {}),
      ...(f.draftItems !== undefined ? { draftItems: f.draftItems } : {}),
      title: { de: de.fields.title, en: f.title }, summary: { de: de.fields.description, en: f.description },
      pages: { de: `${DOCS}/de/${entry.route}`, en: `${DOCS}/en/${entry.route}` },
    });
  }
  if (errors.length) throw new Error("idea pages invalid:\n" + errors.join("\n"));
  ideas.sort((a, b) => a.id.localeCompare(b.id, "en"));
  return { schemaVersion: 1, ideas };
}

/** Repository paths of every idea page (source and translations), for the publication source binding. */
export function ideaFiles(root) {
  const dir = join(root, DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith(".mdx")).sort()
    .flatMap(f => [`${DIR}/${f}`, `site/translations/en/${DIR}/${f}`, `site/translations/de/${DIR}/${f}`]);
}
