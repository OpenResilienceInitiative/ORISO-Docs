// Helpers for the metric runner tests: small fixture repositories written to a temp folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function mkRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'health-fixture-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    if (rel.includes('node_modules/.bin/')) fs.chmodSync(p, 0o755);
  }
  return root;
}
export const lines = (n, f = i => `const v${i} = ${i};`) => Array.from({ length: n }, (_, i) => f(i)).join('\n') + '\n';

// capability rules of the fixture repositories
export const RULES = {
  rules: [
    { repo: 'ORISO-Frontend', prefix: 'src/chat/', capability: 'chat' },
    { repo: 'ORISO-Frontend', prefix: 'src/other/', capability: 'branding' },
    { repo: 'ORISO-Frontend', prefix: 'src/emails/', capability: 'notifications' },
    { repo: 'ORISO-Frontend', prefix: 'src/mails/', capability: 'email-templates' },
  ],
  overrides: [],
};
