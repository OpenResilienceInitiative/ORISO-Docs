import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadRules } from '../lib/capabilities.mjs';
import { normalizeCoverage, validateLintReport, isolatedMeasurements } from '../lib/health-isolation.mjs';

const entry = path => ({ path, statementMap: { 0: { start: { line: 1 } } }, s: { 0: 1 } });
test('collector rejects poisoned, incomplete, duplicate and foreign lint reports', () => {
  const good = { filePath: '/work/src/a.ts', messages: [] };
  assert.deepEqual(validateLintReport([good], ['src/a.ts']), [{ filePath: 'src/a.ts', messages: [] }]);
  for (const report of [[], [good, good], [{ ...good, filePath: '/work/../plan' }], [{ ...good, messages: '0' }]]) assert.throws(() => validateLintReport(report, ['src/a.ts']));
});
test('coverage is restricted to existing pinned source files and valid nonnegative hits', () => {
  const root = mkdtempSync(join(tmpdir(), 'health-cov-')); mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src/a.ts'), 'x');
  const good = entry('/work/src/a.ts');
  assert.equal(Object.keys(normalizeCoverage({ [good.path]: good }, root)).length, 1);
  symlinkSync('/etc/passwd', join(root, 'src/link.ts'));
  assert.throws(() => normalizeCoverage({ '/work/src/link.ts': entry('/work/src/link.ts') }, root));
  for (const bad of [entry('/etc/passwd'), entry('/work/../outside'), { ...good, s: { 0: -1 } }, { ...good, s: { 0: 0.5 } }, { ...good, s: {} }]) assert.throws(() => normalizeCoverage({ [bad.path]: bad }, root));
});
test('isolated repository code cannot touch host plan, tooling, another scope or environment', { skip: process.env.HEALTH_CONTAINER_SMOKE !== '1', timeout: 120000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'health-host-')), repo = join(root, 'repo'); mkdirSync(repo);
  const plan = join(root, 'plan'), tooling = join(root, 'tooling'), other = join(root, 'other');
  for (const path of [plan, tooling, other]) writeFileSync(path, 'original');
  const script = `const fs=require('fs'); for(const p of ${JSON.stringify([plan,tooling,other])}) try{fs.writeFileSync(p,'poison')}catch{}; if(fs.existsSync('preinstall-ran'))process.exit(8); if(process.env.HEALTH_SECRET || process.env.GITHUB_TOKEN || process.env.GITHUB_OUTPUT || process.env.ACTIONS_RUNTIME_TOKEN)process.exit(9); fs.mkdirSync('coverage',{recursive:true}); fs.writeFileSync('coverage/coverage-final.json',JSON.stringify({'/work/src/a.ts':{path:'/work/src/a.ts',statementMap:{0:{start:{line:1}}},s:{0:1}}}));`;
  writeFileSync(join(repo, 'package.json'), JSON.stringify({name:'health-fixture',version:'1.0.0',scripts:{preinstall:'touch preinstall-ran','test:unit':'node test.cjs'}}));
  writeFileSync(join(repo, 'package-lock.json'), JSON.stringify({name:'health-fixture',version:'1.0.0',lockfileVersion:3,packages:{'':{name:'health-fixture',version:'1.0.0'}}}));
  writeFileSync(join(repo, 'test.cjs'), script); mkdirSync(join(repo, 'src')); writeFileSync(join(repo, 'src/a.ts'), 'export const a = () => 1;');
  for(const args of [['init','-q'],['config','user.email','test@example.invalid'],['config','user.name','Test'],['add','.'],['commit','-qm','fixture']]) execFileSync('git',args,{cwd:repo});
  process.env.HEALTH_SECRET='host-only';
  try {
    const result = isolatedMeasurements({ checkout: repo, scope: { repo:'ORISO-Frontend', capability:'chat', path:null }, rules: loadRules() });
    for(const path of [plan,tooling,other]) assert.equal(readFileSync(path,'utf8'),'original');
    // Deliberately fabricated by the fixture: syntactically valid hits cannot prove honest instrumentation.
    assert.equal(Object.values(result.coverageData)[0].s['0'], 1);
    writeFileSync(join(repo, 'test.cjs'), "const fs=require('fs');fs.mkdirSync('coverage',{recursive:true});fs.symlinkSync('/etc/passwd','coverage/coverage-final.json');");
    execFileSync('git', ['add','test.cjs'], { cwd:repo });
    execFileSync('git', ['commit','-qm','poisoned report'], { cwd:repo });
    const poisoned = isolatedMeasurements({ checkout:repo, scope:{repo:'ORISO-Frontend',capability:'chat',path:null}, rules:loadRules() });
    assert.equal(poisoned.coverageData, null);
  } finally { delete process.env.HEALTH_SECRET; }
});

test('container configuration keeps repository commands off the host and constrains the sandbox', () => {
  const source = readFileSync(new URL('../lib/health-isolation.mjs', import.meta.url), 'utf8');
  assert.match(source, /node@sha256:[0-9a-f]{64}/);
  for (const control of ["'--read-only'", "'--cap-drop=ALL'", "'--security-opt=no-new-privileges'", "'--network'", "network = 'none'", "'--ignore-scripts'", 'o=size=4g', 'readOnlyVolume']) assert.ok(source.includes(control), control);
  assert.doesNotMatch(source, /docker\.sock|GITHUB_TOKEN|HEALTH_MODEL_API_KEY/);
});
