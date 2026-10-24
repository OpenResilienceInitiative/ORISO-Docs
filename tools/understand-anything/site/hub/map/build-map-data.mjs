// Builds the data files the capability map loads. Inputs are the measured
// intermediate files (code counts, tests, stories, graph links); output is one
// JSON file per concern, written next to the page (map/data/).
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const DATA_FILES = ['counts.json', 'descriptions.json', 'drill.json', 'epics.json', 'links.json', 'zoom.json'];
const INPUTS = ['agg', 'rel', 'drill', 'epics', 'zoom', 'planned', 'desc', 'live', 'car15'];
// Which capability block shows each CAR-15 group of related issues.
const CAR15_BLOCK = {virus: 'upload', tokens: 'branding', hc: 'branding', video: 'calls', bot: 'livechat', ro: 'permissions', sess: 'permissions'};

export function loadInputs(dir) {
  const base = dir instanceof URL ? dir : new URL(dir.endsWith('/') ? dir : dir + '/', 'file://');
  return Object.fromEntries(INPUTS.map(name => [name, JSON.parse(readFileSync(new URL(name + '.json', base), 'utf8'))]));
}

// `run` is the run manifest (tools/planning-map/lib/run-manifest.mjs); when given it is stamped into every file.
export function buildMapData(inputs, run) {
  for (const name of INPUTS) if (inputs[name] === undefined) throw new Error('Missing map input: ' + name);
  const tot = {};
  for (const counts of Object.values(inputs.agg)) for (const [k, v] of Object.entries(counts)) tot[k] = (tot[k] || 0) + v;
  const epicKeys = new Set(inputs.epics.epics.map(e => inputs.epics.repos[e.r] + '#' + e.n));
  const reliss = {};
  for (const [group, issues] of Object.entries(inputs.car15)) {
    const block = CAR15_BLOCK[group];
    if (!block) throw new Error('Unknown CAR-15 group: ' + group);
    for (const [repo, number, title] of issues) {
      if (epicKeys.has(repo + '#' + number)) continue;
      const list = reliss[block] ||= [];
      if (!list.some(x => x[0] === repo && x[1] === number)) list.push([repo, number, title]);
    }
  }
  const doc = body => ({schemaVersion: 1, ...body, ...(run ? {run} : {})});
  return {
    'counts.json': doc({agg: inputs.agg, rel: inputs.rel, tot}),
    'descriptions.json': doc({desc: inputs.desc}),
    'drill.json': doc({drill: inputs.drill}),
    'epics.json': doc({epics: inputs.epics, planned: inputs.planned, reliss}),
    'links.json': doc({live: inputs.live, optional: inputs.optional || []}),
    'zoom.json': doc({zoom: inputs.zoom})
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = name => { const i = process.argv.indexOf('--' + name); if (i < 0 || !process.argv[i + 1]) throw new Error('Usage: build-map-data.mjs --inputs DIR --out DIR'); return process.argv[i + 1]; };
  const out = path.resolve(arg('out'));
  mkdirSync(out, {recursive: true});
  const runIndex = process.argv.indexOf('--run');
  const run = runIndex < 0 ? undefined : JSON.parse(readFileSync(path.resolve(process.argv[runIndex + 1]), 'utf8'));
  const files = buildMapData(loadInputs(path.resolve(arg('inputs')) + '/'), run);
  for (const [name, doc] of Object.entries(files)) writeFileSync(path.join(out, name), JSON.stringify(doc) + '\n');
}
