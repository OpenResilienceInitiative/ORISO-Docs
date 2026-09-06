#!/usr/bin/env python3
"""Install one immutable ORISO producer/consumer release and optional agent profile."""
import argparse
from contextlib import contextmanager
import fcntl
import uuid
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

SOURCE = Path(__file__).resolve().parent

def run(*args, cwd=None):
    subprocess.run(args, cwd=cwd, check=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def atomic_link(target, link):
    temporary = link.with_name(link.name + '.new-' + uuid.uuid4().hex)
    try:
        temporary.symlink_to(target)
        os.replace(temporary, link)
    finally:
        if temporary.is_symlink(): temporary.unlink()

@contextmanager
def install_lock(root):
    root.mkdir(parents=True, exist_ok=True)
    with (root / '.install.lock').open('a') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield

def profile_paths(profile):
    return [profile / agent / 'skills/oriso-graph' for agent in ('.agents', '.claude')] + [profile / 'bin' / name for name in ('ua-pull', 'ua-dashboard')]

def preflight(root, profile):
    for destination in [root / 'current', root / 'previous'] + (profile_paths(profile) if profile else []):
        if destination.exists() and not destination.is_symlink():
            raise ValueError('Existing non-symlink must be preserved: ' + str(destination))
    if profile:
        manifest = profile / 'oriso-ua-runtime.json'
        if manifest.exists() and json.loads(manifest.read_text()).get('schemaVersion') != 'oriso.ua.profile/v1':
            raise ValueError('Existing profile manifest must be preserved: ' + str(manifest))

@contextmanager
def pointer_transaction(root, profile):
    paths = [root / 'current', root / 'previous'] + (profile_paths(profile) if profile else [])
    links = {p: p.readlink() if p.is_symlink() else None for p in paths}
    manifest = profile / 'oriso-ua-runtime.json' if profile else None
    original = manifest.read_bytes() if manifest and manifest.exists() else None
    try:
        yield
    except BaseException:
        # Restore only entries changed by this locked installation, even if the
        # normal publication helper itself failed midway through profile setup.
        for path, target in links.items():
            if target is None:
                if path.is_symlink(): path.unlink()
            elif not path.is_symlink() or path.readlink() != target:
                temporary = path.with_name(path.name + '.restore-' + uuid.uuid4().hex)
                temporary.symlink_to(target); os.replace(temporary, path)
        if manifest:
            if original is not None: manifest.write_bytes(original)
            elif manifest.exists(): manifest.unlink()
        raise

def install(root, profile=None, docker=False):
    root = root.resolve()
    profile = profile.resolve() if profile else None
    with install_lock(root):
        preflight(root, profile)
        return _install_locked(root, profile, docker)

def _install_locked(root, profile=None, docker=False):
    lock = json.loads((SOURCE / 'toolchain.lock.json').read_text())
    for patch in lock['patches']:
        if digest(SOURCE / patch['path']) != patch['sha256']:
            raise ValueError('Toolchain patch checksum mismatch: ' + patch['path'])
    root.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.install-', dir=root))
    try:
        tooling = stage / 'tooling'
        shutil.copytree(SOURCE, tooling, ignore=shutil.ignore_patterns('node_modules', '__pycache__', 'out', '.DS_Store', '._*'))
        upstream = stage / 'upstream'
        run('git', 'init', '-q', str(upstream))
        run('git', '-C', str(upstream), 'remote', 'add', 'origin', lock['upstream']['url'])
        run('git', '-C', str(upstream), 'fetch', '--depth=1', 'origin', lock['upstream']['commit'])
        run('git', '-C', str(upstream), 'checkout', '--detach', 'FETCH_HEAD')
        for patch in lock['patches']:
            run('git', '-C', str(upstream), 'apply', '--check', str(tooling / patch['path']))
            run('git', '-C', str(upstream), 'apply', str(tooling / patch['path']))
        def runtime(args, cwd):
            if docker:
                run('docker', 'run', '--rm', '-v', f'{root}:{root}', '-w', str(cwd), lock['nodeImage'], *args)
            else:
                run(*args, cwd=cwd)
        pnpm = ['npm', 'exec', '--yes', '--package=pnpm@' + lock['pnpm'], '--', 'pnpm']
        runtime(pnpm + ['install', '--frozen-lockfile'], upstream)
        runtime(pnpm + ['--filter', '@understand-anything/core', 'build'], upstream)
        runtime(pnpm + ['--filter', '@understand-anything/dashboard', 'build'], upstream)
        runtime(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], tooling)
        # Content address includes the custom source, not merely the upstream version.
        files = sorted(p for p in tooling.rglob('*') if p.is_file() and 'node_modules' not in p.parts)
        content_hash = hashlib.sha256(''.join(str(p.relative_to(tooling)) + digest(p) for p in files).encode()).hexdigest()
        release = root / ('release-' + content_hash[:20])
        (stage / 'installed.json').write_text(json.dumps({'contentSHA256': content_hash, 'toolchain': lock, 'docker': docker}, indent=2) + '\n')
        if release.exists():
            shutil.rmtree(stage)
        else:
            stage.rename(release)
        current = root / 'current'
        with pointer_transaction(root, profile):
            if profile:
                install_profile(profile, current)
            if not current.is_symlink() or current.resolve() != release:
                if current.is_symlink(): atomic_link(current.resolve(), root / 'previous')
                atomic_link(release, current)
        print(release)
        return release
    finally:
        if stage.exists(): shutil.rmtree(stage)

def install_profile(profile, current):
    # Both agents use the same reviewed skill and runtime. No personal caches are overwritten.
    for agent in ('.agents', '.claude'):
        destination = profile / agent / 'skills' / 'oriso-graph'
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists() and not destination.is_symlink():
            raise ValueError('Existing profile skill must be preserved: ' + str(destination))
        atomic_link(current / 'tooling/skills/oriso-graph', destination)
    binary = profile / 'bin'
    binary.mkdir(parents=True, exist_ok=True)
    for command in ('ua-pull', 'ua-dashboard'):
        launcher = binary / command
        if launcher.exists() and not launcher.is_symlink(): raise ValueError('Existing launcher must be preserved: ' + str(launcher))
        atomic_link(current / ('tooling/' + command + '.sh'), launcher)
    (profile / 'oriso-ua-runtime.json').write_text(json.dumps({'schemaVersion': 'oriso.ua.profile/v1', 'runtime': str(current), 'agents': ['codex', 'claude'], 'channel': 'predev-dev-source'}, indent=2) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime-root', type=Path, required=True)
    parser.add_argument('--profile', type=Path)
    parser.add_argument('--docker', action='store_true', help='Build in the exact locked Node image (Linux producer).')
    args = parser.parse_args()
    install(args.runtime_root.resolve(), args.profile.resolve() if args.profile else None, args.docker)
