# Activate the pinned ORISO graph toolchain

Installation alone does not redirect existing users or the PreDev schedule. This procedure connects those entrypoints to the accepted release and complete generation store, while retaining the previous files and routing for rollback. It is an activation plan, not evidence that activation has happened.

Use the same ORISO-Docs issue 110 and its reviewed source change. No application-repository PR is required. The old local Dev-Kit and project skill directories, and PreDev's `_rebuild` directory, are machine-local material rather than additional Git repositories. Keep reproducible implementation and these instructions in ORISO-Docs; record machine-specific activation readbacks as evidence.

## Preconditions and route inventory

Run commands only after the candidate passes the complete generation contract, exact pinned consumer, and intended source checks. Resolve `current` once when selecting the accepted tooling source; do not copy files from a changing build directory. Keep the resulting `installed.json`, source commit/diff identity, and generation manifest hash with the activation record. If the source is not committed yet, record that limitation and its content hash rather than inventing a commit identity.

The accepted PreDev candidate is installed separately under `/opt/oriso-understand/ua-remediation-110/runtime/current`; its generation store is `/opt/oriso-understand/ua-remediation-110/published`. The local candidate is under the routed project's artifact directory. Final routes are:

| Entry or owner | Final target / behavior |
| --- | --- |
| PreDev pinned runtime | `/opt/oriso-understand/toolchain/current` |
| PreDev agent profile | `/opt/oriso-understand/agent-profile` |
| PreDev published store | `/opt/oriso-understand/published` → accepted candidate generation store |
| Existing manual/cron script | `/opt/oriso-understand/_rebuild/ua-refresh.sh` → ordinary shell shim invoking the stable runtime |
| Existing root crontab | Keep `17 */2 * * * /opt/oriso-understand/_rebuild/ua-refresh.sh >> /var/log/ua-refresh.log 2>&1` |
| Local pinned runtime | `$HOME/.local/share/oriso-understand/runtime/current` |
| Local profile | `$HOME/.local/share/oriso-understand/profile` |
| Local commands | Ordinary executable wrappers at `$HOME/.local/bin/ua-pull` and `ua-dashboard`, delegating to profile commands |
| Existing Dev-Kit direct call | Ordinary wrapper at `${PROJECT_ORISO_ROOT}/0 - Docs/dev-kit/ua-pull.sh`, delegating to the same profile command |
| Existing routed ORISO skill | `${PROJECT_ORISO_ROOT}/skills/oriso-graph` → pinned skill |
| ORISO-specific agent discovery | Only `oriso-graph` links under `${PROJECT_ORISO_ROOT}/.agents/skills` and `.claude/skills` → the shared ORISO skill |

Do not run the generic plugin installer, rewrite `understand-*` skills, or replace generic plugin caches. Historical repository graph files remain historical. Migrating their old hidden Git flags is a separate explicit `ua-pull --migrate-legacy` operation with its own backup.

## PreDev activation

Run the following in one root shell on PreDev. This does not modify the crontab. The legacy mutex protects the cutover from a running old refresh; a busy lock must stop activation rather than overlap it.

```bash
set -euo pipefail
umask 077
UA_BASE=/opt/oriso-understand
UA_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
UA_BACKUP="$UA_BASE/ua-remediation-110/activation-backup-$UA_STAMP"
mkdir -p "$UA_BACKUP"
exec 9>/tmp/ua-refresh.lock
flock -n 9
crontab -l > "$UA_BACKUP/root-crontab.txt"
cp -a "$UA_BASE/_rebuild/ua-refresh.sh" "$UA_BACKUP/ua-refresh.sh"
export UA_BASE UA_BACKUP
python3 - <<'PY'
import json, os
from pathlib import Path
base = Path(os.environ['UA_BASE'])
routes = [base/'published', base/'toolchain/current', base/'toolchain/previous']
state = {}
for p in routes:
    if p.exists() and not p.is_symlink():
        raise SystemExit(f'Preserve and resolve existing non-symlink before activation: {p}')
    state[str(p)] = str(p.readlink()) if p.is_symlink() else None
(Path(os.environ['UA_BACKUP'])/'prior-links.json').write_text(json.dumps(state, indent=2)+'\n')
PY
UA_TOOLING_SOURCE="$(python3 -c 'from pathlib import Path; print((Path("/opt/oriso-understand/ua-remediation-110/runtime/current").resolve(strict=True)/"tooling"))')"
cp -a "$(dirname "$UA_TOOLING_SOURCE")/installed.json" "$UA_BACKUP/accepted-installed.json"
python3 "$UA_TOOLING_SOURCE/install.py" \
  --runtime-root "$UA_BASE/toolchain" \
  --profile "$UA_BASE/agent-profile" --docker
```

Before promoting routes, compare the accepted and final `installed.json` content hashes and toolchain identity. A mismatch requires explanation; a successful installer exit does not authorize an unexamined release difference.

```bash
python3 - <<'PY'
import json, os
from pathlib import Path
base = Path(os.environ['UA_BASE'])
backup = Path(os.environ['UA_BACKUP'])
old = json.loads((backup/'accepted-installed.json').read_text())
new = json.loads((base/'toolchain/current/installed.json').read_text())
assert old['contentSHA256'] == new['contentSHA256'], 'Tooling source changed'
assert old['toolchain'] == new['toolchain'], 'Pinned toolchain changed'
print('Accepted tooling content:', new['contentSHA256'])
backup = Path(os.environ['UA_BACKUP'])
owned = {}
for name in json.loads((backup/'prior-links.json').read_text()):
    route = Path(name)
    if route.exists() and not route.is_symlink():
        raise SystemExit(f'Unexpected non-symlink: {route}')
    owned[name] = {'type': 'symlink', 'target': str(route.readlink())} if route.is_symlink() else {'type': 'missing'}
(backup/'activated-links.json').write_text(json.dumps(owned, indent=2)+'\n')
PY
python3 - <<'PY'
import json, os, uuid
from pathlib import Path
base = Path(os.environ['UA_BASE'])
target = base/'ua-remediation-110/published'
assert (target/'current/manifest.json').is_file(), 'Accepted generation is missing'
temp = base/('.published-'+uuid.uuid4().hex)
temp.symlink_to(target)
record = Path(os.environ['UA_BACKUP'])/'activated-links.json'
owned = json.loads(record.read_text())
owned[str(base/'published')] = {'type': 'symlink', 'target': str(target)}
record.write_text(json.dumps(owned, indent=2)+'\n')
os.replace(temp, base/'published')
PY
cat > "$UA_BASE/_rebuild/ua-refresh.sh.activation-new" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
TOOLING="$(python3 -c 'from pathlib import Path; print((Path("/opt/oriso-understand/toolchain/current").resolve(strict=True)/"tooling"))')"
unset UA_CORE UA_NATIVE_NODE
exec flock -n /tmp/ua-refresh.lock bash "$TOOLING/ua-refresh.sh" \
  --base /opt/oriso-understand \
  --publish-root /opt/oriso-understand/published "$@"
SH
chmod 755 "$UA_BASE/_rebuild/ua-refresh.sh.activation-new"
bash -n "$UA_BASE/_rebuild/ua-refresh.sh.activation-new"
python3 - <<'PY'
import json, os
from pathlib import Path
def identity(path):
    import hashlib, stat
    if path.is_symlink():
        return {'type': 'symlink', 'target': str(path.readlink())}
    if not path.exists():
        return {'type': 'missing'}
    info = path.stat()
    if path.is_file():
        return {'type': 'file', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'mode': stat.S_IMODE(info.st_mode)}
    return {'type': 'directory', 'device': info.st_dev, 'inode': info.st_ino}
base = Path(os.environ['UA_BASE'])
backup = Path(os.environ['UA_BACKUP'])
record = {'path': str(base/'_rebuild/ua-refresh.sh'), 'activated': identity(base/'_rebuild/ua-refresh.sh.activation-new'), 'prior': identity(backup/'ua-refresh.sh')}
(backup/'shim-ownership.json').write_text(json.dumps(record, indent=2)+'\n')
PY
mv -f "$UA_BASE/_rebuild/ua-refresh.sh.activation-new" "$UA_BASE/_rebuild/ua-refresh.sh"
flock -u 9
exec 9>&-
/opt/oriso-understand/_rebuild/ua-refresh.sh verify
```

Read back the root cron entry and compare it with the saved copy; it must be unchanged. Record `toolchain/current`, `published/current`, the complete manifest's generation ID and SHA-256, all source repository/ref/full-SHA/fetch-success records, and the verification exit status. The first successful refresh through the compatibility script, and then the next actual scheduled run, are separate acceptance observations. Do not infer the latter from a manual run.

The old `_rebuild/ua-nightly-full.sh` is not the observed PreDev cron entry. Preserve it as legacy material; do not run it alongside the new producer. The separate hosted nightly dashboard channel is not activated by these commands. HTTPS clients must use a separately verified endpoint serving the complete generation layout; do not assume an old `ORISO_UA_BASE` mirror serves it.

## Local activation

Start a Bash shell and load the machine-local project mapping. Set `UA_TOOLING_SOURCE` to the resolved tooling directory from the accepted local candidate, or an equivalently verified checkout; the default below selects the existing candidate through the routed project root.

```bash
set -euo pipefail
umask 077
. "$HOME/.config/agent-routing/paths.env"
UA_RUNTIME="$HOME/.local/share/oriso-understand/runtime"
UA_PROFILE="$HOME/.local/share/oriso-understand/profile"
UA_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
UA_BACKUP="$PROJECT_ORISO_ROOT/0 - Docs/artifacts/2026-09-07-ua-remediation/local-activation-$UA_STAMP"
mkdir -p "$UA_BACKUP"
export PROJECT_ORISO_ROOT UA_RUNTIME UA_PROFILE UA_BACKUP
UA_TOOLING_SOURCE="$(python3 -c 'import os; from pathlib import Path; print((Path(os.environ["PROJECT_ORISO_ROOT"])/"0 - Docs/artifacts/2026-09-07-ua-remediation/local-runtime/current").resolve(strict=True)/"tooling")')"
cp "$(dirname "$UA_TOOLING_SOURCE")/installed.json" "$UA_BACKUP/accepted-installed.json"
python3 - <<'PY'
import json, os
from pathlib import Path
runtime = Path(os.environ['UA_RUNTIME'])
state = {}
for p in [runtime/'current', runtime/'previous']:
    if p.exists() and not p.is_symlink():
        raise SystemExit(f'Preserve and resolve existing non-symlink before activation: {p}')
    state[str(p)] = str(p.readlink()) if p.is_symlink() else None
(Path(os.environ['UA_BACKUP'])/'prior-links.json').write_text(json.dumps(state, indent=2)+'\n')
PY
python3 "$UA_TOOLING_SOURCE/install.py" --runtime-root "$UA_RUNTIME" --profile "$UA_PROFILE"
python3 - <<'PY'
import json, os
from pathlib import Path
old = json.loads((Path(os.environ['UA_BACKUP'])/'accepted-installed.json').read_text())
new = json.loads((Path(os.environ['UA_RUNTIME'])/'current/installed.json').read_text())
assert old['contentSHA256'] == new['contentSHA256'], 'Tooling source changed'
assert old['toolchain'] == new['toolchain'], 'Pinned toolchain changed'
print('Accepted tooling content:', new['contentSHA256'])
backup = Path(os.environ['UA_BACKUP'])
owned = {}
for name in json.loads((backup/'prior-links.json').read_text()):
    route = Path(name)
    if route.exists() and not route.is_symlink():
        raise SystemExit(f'Unexpected non-symlink: {route}')
    owned[name] = {'type': 'symlink', 'target': str(route.readlink())} if route.is_symlink() else {'type': 'missing'}
(backup/'activated-links.json').write_text(json.dumps(owned, indent=2)+'\n')
PY
```

Back up the exact old user routes before replacing them. The following writes a rollback manifest incrementally, moves previous files/directories intact into the timestamped backup, and installs only the listed ORISO routes. If interrupted, run the guarded rollback before retrying; an ambiguous partial activation stops for reconciliation instead of guessing route ownership. The ordinary command wrappers are intentional: copying them does not detach the Python package or follow a destination symlink into immutable tooling.

```bash
python3 - <<'PY'
import json, os, uuid
from pathlib import Path
def identity(path):
    import hashlib, stat
    if path.is_symlink():
        return {'type': 'symlink', 'target': str(path.readlink())}
    if not path.exists():
        return {'type': 'missing'}
    info = path.stat()
    if path.is_file():
        return {'type': 'file', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'mode': stat.S_IMODE(info.st_mode)}
    return {'type': 'directory', 'device': info.st_dev, 'inode': info.st_ino}
root = Path(os.environ['PROJECT_ORISO_ROOT'])
backup = Path(os.environ['UA_BACKUP'])
runtime = Path(os.environ['UA_RUNTIME'])
profile = Path(os.environ['UA_PROFILE'])
skill = root/'skills/oriso-graph'
routes = [
    (Path.home()/'.local/bin/ua-pull', 'wrapper', 'ua-pull'),
    (Path.home()/'.local/bin/ua-dashboard', 'wrapper', 'ua-dashboard'),
    (root/'0 - Docs/dev-kit/ua-pull.sh', 'wrapper', 'ua-pull'),
    (skill, 'link', str(runtime/'current/tooling/skills/oriso-graph')),
    (root/'.agents/skills/oriso-graph', 'link', str(skill)),
    (root/'.claude/skills/oriso-graph', 'link', str(skill)),
]
manifest = backup/'user-routes.json'
assert not manifest.exists(), 'Use a new backup or finish rollback first'
state = []
for i, (destination, kind, target) in enumerate(routes):
    destination.parent.mkdir(parents=True, exist_ok=True)
    saved = backup/f'route-{i}'
    existed = destination.exists() or destination.is_symlink()
    prior = identity(destination)
    temp = destination.with_name(destination.name+'.activation-'+uuid.uuid4().hex)
    if kind == 'link':
        temp.symlink_to(target)
    else:
        temp.write_text('#!/usr/bin/env bash\nset -euo pipefail\n'
                       f'exec "$HOME/.local/share/oriso-understand/profile/bin/{target}" "$@"\n')
        temp.chmod(0o755)
    state.append({'path': str(destination), 'saved': str(saved) if existed else None,
                  'prior': prior, 'activated': identity(temp)})
    pending = manifest.with_suffix('.new')
    pending.write_text(json.dumps(state, indent=2)+'\n')
    os.replace(pending, manifest)
    if identity(destination) != prior:
        raise SystemExit(f'STOP: route changed during activation: {destination}')
    if existed:
        destination.rename(saved)
    os.replace(temp, destination)
print('Route backup:', manifest)
PY
command -v ua-pull
command -v ua-dashboard
ua-pull --help
bash -n "$HOME/.local/bin/ua-dashboard"
```

`~/.local/bin` must be on the agent/user PATH; it was present in the inspected session. If it is absent on another machine, use the absolute wrappers or the project's existing PATH configuration rather than changing unrelated shell settings silently. Reload the agent's ORISO skill discovery before testing the new slash command. The existing project router still reaches `skills/oriso-graph/SKILL.md`.

The wrapper syntax check does not start a dashboard. Actual viewer acceptance requires running `ua-dashboard` from a repository whose checkout intentionally matches the selected source, and checking the visible generation/status and selected graph. A different checkout requires explicit `--allow-different-checkout` and remains visibly labeled.

From a known matching ORISO repository, verify the actual delivery and source state through the newly routed command:

```bash
ua-pull --via-ssh
ua-pull --verify
ua-pull --status-json
ua-pull --path
ua-pull --platform-only --path
```

Record command exit codes, full source identity, generation ID, actual delivery channel and receipt, structural timestamp, semantic coverage, and **latest claim review** separately. Both graph directories must belong to the same generation. Hash the manifest and compare it with PreDev. A `--path` result verifies cached content; it is not a replacement for the fresh source check.

Read back each wrapper's bytes and each symlink target. Confirm the compatibility destinations in `.local/bin` and Dev-Kit are ordinary files, while profile command links still resolve into the accepted runtime. Confirm no generic `understand-*` skill/cache link changed. The local operational-rule UA section and Dev-Kit prompts still describing repository-root graph copies must be routed to the new skill or updated explicitly; they must not remain a competing instruction to consume historical graphs.

## Compatibility with the old Dev-Kit installer

Its copy step (`cp "$KIT_DIR/ua-pull.sh" "$HOME/.local/bin/ua-pull"`) remains safe with the ordinary wrappers above. It copies a launcher that delegates to the stable profile. Neither endpoint is a symlink into immutable code.

This is **not** approval to use the entire old installer for activation. That installer also installs a generic marketplace/plugin, performs Storybook credential lookup/MCP registration, merges an old SessionStart hook, and can choose a legacy HTTPS mirror via `ORISO_UA_BASE`. Its hook and final summary can mask errors. Use the pinned installer and the explicit readback gates above. Future compatibility changes to Dev-Kit installation/hook source belong to the same Docs issue 110; they do not require an application-repository PR.

## Rollback

Stop activation on any failed source, generation, exact-consumer or route check. A route rollback restores the saved entrypoints and leaves all installed releases and generation bytes available. It does not claim old graphs are current or undo user source changes. The examples machine-check recorded entry type, file SHA-256 and mode, or literal symlink target before restoration. They preflight the complete local route or pointer set before any changes, and stop on a mismatch. Do not replace recorded expected identities with current contents to bypass a rejection. Older backups without ownership records, interrupted activations, and already partially restored sets stop for reconciliation against the reviewed payload and original readback evidence.

For PreDev, use the recorded root backup directory and the legacy lock. Restore the saved script with a same-directory temporary file and atomic rename. The cron was never changed; compare it rather than blindly reinstalling the whole crontab.

```bash
# Set UA_BACKUP to the recorded PreDev activation-backup directory first.
exec 9>/tmp/ua-refresh.lock
flock -n 9
export UA_BACKUP
python3 - <<'PY'
import json, os
from pathlib import Path
def identity(path):
    import hashlib, stat
    if path.is_symlink():
        return {'type': 'symlink', 'target': str(path.readlink())}
    if not path.exists():
        return {'type': 'missing'}
    info = path.stat()
    if path.is_file():
        return {'type': 'file', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'mode': stat.S_IMODE(info.st_mode)}
    return {'type': 'directory', 'device': info.st_dev, 'inode': info.st_ino}
backup = Path(os.environ['UA_BACKUP'])
record = json.loads((backup/'shim-ownership.json').read_text())
if identity(Path(record['path'])) != record['activated']:
    raise SystemExit('STOP: refresh route changed after activation; nothing restored')
if identity(backup/'ua-refresh.sh') != record['prior']:
    raise SystemExit('STOP: saved refresh script changed; nothing restored')
PY
cp -a "$UA_BACKUP/ua-refresh.sh" /opt/oriso-understand/_rebuild/ua-refresh.sh.rollback-new
mv -f /opt/oriso-understand/_rebuild/ua-refresh.sh.rollback-new /opt/oriso-understand/_rebuild/ua-refresh.sh
```

For local user routes, set `UA_BACKUP` to the recorded local backup directory and restore its manifest:

```bash
export UA_BACKUP
python3 - <<'PY'
import json, os
from pathlib import Path
def identity(path):
    import hashlib, stat
    if path.is_symlink():
        return {'type': 'symlink', 'target': str(path.readlink())}
    if not path.exists():
        return {'type': 'missing'}
    info = path.stat()
    if path.is_file():
        return {'type': 'file', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'mode': stat.S_IMODE(info.st_mode)}
    return {'type': 'directory', 'device': info.st_dev, 'inode': info.st_ino}
backup = Path(os.environ['UA_BACKUP'])
entries = list(reversed(json.loads((backup/'user-routes.json').read_text())))
# Preflight the COMPLETE set before changing even the first route.
for entry in entries:
    destination = Path(entry['path'])
    if identity(destination) != entry['activated']:
        raise SystemExit(f'STOP: changed route or interrupted activation: {destination}; no routes restored')
    if entry['saved'] and identity(Path(entry['saved'])) != entry['prior']:
        raise SystemExit(f'STOP: changed or missing backup: {entry["saved"]}; no routes restored')
for entry in entries:
    destination = Path(entry['path'])
    if identity(destination) != entry['activated']:
        raise SystemExit(f'STOP: route changed during rollback: {destination}')
    destination.unlink()
    if entry['saved']:
        Path(entry['saved']).rename(destination)
PY
```

On either machine, restore the exact pre-install runtime/publication pointer map saved in that machine's backup. This handles both an upgrade and an initially absent route without deleting immutable releases:

```bash
export UA_BACKUP
python3 - <<'PY'
import json, os, uuid
from pathlib import Path
backup = Path(os.environ['UA_BACKUP'])
prior = json.loads((backup/'prior-links.json').read_text())
owned = json.loads((backup/'activated-links.json').read_text())
if set(prior) != set(owned):
    raise SystemExit('STOP: incomplete pointer ownership record')
def identity(path):
    if path.is_symlink():
        return {'type': 'symlink', 'target': str(path.readlink())}
    return {'type': 'other'} if path.exists() else {'type': 'missing'}
for name in prior:
    if identity(Path(name)) != owned[name]:
        raise SystemExit(f'STOP: changed pointer: {name}; no pointers restored')
for name, target in prior.items():
    destination = Path(name)
    if identity(destination) != owned[name]:
        raise SystemExit(f'STOP: pointer changed during rollback: {name}')
    if target is None:
        destination.unlink(missing_ok=True)
    else:
        temp = destination.with_name(destination.name+'.rollback-'+uuid.uuid4().hex)
        temp.symlink_to(target)
        os.replace(temp, destination)
PY
```

Release the PreDev lock after readback (`flock -u 9; exec 9>&-` in that shell). Restore/compare the recorded command bytes and link targets, and verify the cron entry is unchanged. Profile-internal links and release directories may remain installed but unused; restored user/cron routes determine activation. If only a published generation needs rollback, use the bundle's explicit rollback command and recheck source freshness; do not swap runtime and generation pointers indiscriminately.
