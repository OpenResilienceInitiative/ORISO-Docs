// Steering comments become the optional map asset map/data/steering.json (ORISO-Docs#221), like board and criteria.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {steeringAsset} from '../publication.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'steering-'));
const write = o => { const f = path.join(tmp, Math.random() + '.json'); fs.writeFileSync(f, JSON.stringify(o)); return f; };
const comment = {author: 'frank', createdAt: '2026-10-20T08:00:00Z', url: 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/300#issuecomment-1', authorAssociation: 'OWNER', body: 'look at errors first', truncated: false};
const doc = {schemaVersion: 1, generatedAt: '2026-10-24T12:00:00Z', source: {repository: 'OpenResilienceInitiative/ORISO-Docs', label: 'area-steering', allowedAssociations: ['OWNER', 'MEMBER', 'COLLABORATOR']},
  capabilities: {chat: {issue: {number: 300, url: 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/300', title: 'Steering: Chat', state: 'OPEN'}, comments: [comment], skipped: 0, omitted: 0}}, warnings: []};

test('a valid steering.json becomes map/data/steering.json and is announced as optional data', () => {
  const r = steeringAsset(write(doc), Buffer.from(JSON.stringify({schemaVersion: 1, live: ['case-handover'], optional: ['board.json']})));
  assert.equal(JSON.parse(r.steering).capabilities.chat.comments[0].author, 'frank');
  assert.deepEqual(JSON.parse(r.links).optional, ['board.json', 'steering.json']);
  assert.ok(r.steering.endsWith('\n'));
  assert.equal(steeringAsset(write(doc), Buffer.from(r.links)).links, r.links, 'announcing twice changes nothing');
});

test('a file with an outside comment, a foreign repository or a bad link is refused, nothing half-published', () => {
  const bad = f => { const d = structuredClone(doc); f(d); return d; };
  assert.throws(() => steeringAsset(write(bad(d => { d.capabilities.chat.comments[0].authorAssociation = 'NONE'; })), Buffer.from('{"optional":[]}')), /steering\.json invalid/);
  assert.throws(() => steeringAsset(write(bad(d => { d.source.repository = 'Someone/Else'; })), Buffer.from('{"optional":[]}')), /steering\.json invalid|repository/);
  assert.throws(() => steeringAsset(write(bad(d => { d.capabilities.chat.comments[0].url = 'https://evil.example/x'; })), Buffer.from('{"optional":[]}')), /steering\.json invalid/);
  assert.throws(() => steeringAsset(write(bad(d => { d.capabilities.chat.issue.url = 'https://github.com/OpenResilienceInitiative/ORISO-E2E/issues/3'; })), Buffer.from('{"optional":[]}')), /steering\.json invalid|repository/);
});
