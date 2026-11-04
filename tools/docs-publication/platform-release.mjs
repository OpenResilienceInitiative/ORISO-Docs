import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const publicRepositories = new Set(JSON.parse(readFileSync(new URL('../truth-chain/public-repositories.json', import.meta.url))).repositories);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

export function bindPlatformRelease(lock, revision, graphSources) {
  if (!lock || Object.keys(lock).some(key => !['schemaVersion','version','releaseUrl','documentationRevision','sources'].includes(key))) throw Error('Unexpected platform release fields');
  if (lock?.schemaVersion !== 'oriso.platform-release/v1' || !/^[a-f0-9]{40}$/.test(revision) || lock.documentationRevision !== revision) throw Error('Exact platform release documentation revision required');
  if (typeof lock.version !== 'string' || !/^v?\d+\.\d+\.\d+$/.test(lock.version)) throw Error('Stable platform release version required');
  const url = new URL(lock.releaseUrl);
  if (url.origin !== 'https://github.com' || url.search || url.hash || url.username || url.password || !/^\/OpenResilienceInitiative\/ORISO-[A-Za-z0-9]+\/releases\/tag\/[^/]+$/.test(url.pathname) || decodeURIComponent(url.pathname.split('/').at(-1)) !== lock.version) throw Error('Published platform release URL must match its version');
  const repositories = new Set();
  if (!Array.isArray(lock.sources) || !lock.sources.length) throw Error('Release source vector required');
  for (const source of lock.sources) {
    if (Object.keys(source).some(key=>!['repository','ref','sourceSHA'].includes(key))) throw Error('Unexpected release source fields');
    if (!publicRepositories.has(source.repository) || repositories.has(source.repository) || !/^[a-f0-9]{40}$/.test(source.sourceSHA) || !(typeof source.ref === 'string' && (/^refs\/tags\/[A-Za-z0-9._/-]+$/.test(source.ref) && !source.ref.includes('..') || /^[a-f0-9]{40}$/.test(source.ref) && source.ref === source.sourceSHA))) throw Error('Immutable public release source required');
    repositories.add(source.repository);
  }
  if (lock.sources.find(source => source.repository === 'ORISO-Docs')?.sourceSHA !== revision) throw Error('Released Docs source must match the artifact revision');
  // Share producer coverage and origin rules; a second hand-maintained repo list drifts.
  const tooling=fileURLToPath(new URL('../understand-anything/',import.meta.url));
  try {
    execFileSync('python3',['-c',"import json,sys;sys.path.insert(0,sys.argv[1]);from bundle.release_inputs import validate_lock;validate_lock(json.load(sys.stdin),sys.argv[2])",tooling,revision],{input:JSON.stringify(lock),env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:['pipe','pipe','pipe']});
  } catch { throw Error('Incomplete or invalid platform release source vector/origin'); }
  if (graphSources && (graphSources.length !== lock.sources.length || graphSources.some(source => !lock.sources.some(locked => locked.repository === source.repository && locked.ref === source.ref && locked.sourceSHA === source.sourceSHA)))) throw Error('Graph generation differs from the platform release source vector');
  return {...lock, sha256: digest(lock)};
}

export function assertPlatformReleaseBinding(binding, revision) {
  if (!binding || typeof binding.sha256 !== 'string') throw Error('Platform release binding required; Dev previews cannot be activated');
  const {sha256, ...lock} = binding;
  if (bindPlatformRelease(lock, revision).sha256 !== sha256) throw Error('Platform release binding hash mismatch');
  return binding;
}
