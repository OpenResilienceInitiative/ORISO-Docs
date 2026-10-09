#!/usr/bin/env python3
"""Export bounded lexical candidates at immutable refs; unknown semantics stay unresolved."""
import argparse
import base64
from collections import defaultdict
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile

TOKEN = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
CLASSES = {'copy-correction', 'valid-technical-context', 'compatibility-alias',
           'generator-spec', 'migration-candidate', 'unresolved', 'historical'}


def command(*args):
    return subprocess.check_output(args)


def normalized(token):
    token = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', token)
    return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', token).lower()


def in_gate(path, scope):
    return (any(path.startswith(p) for p in scope['directories'])
            and PurePosixPath(path).suffix in scope['extensions']
            and not any(path.startswith(p) for p in scope.get('exclude', [])))


def git_files(repo, revision, scope):
    """Read only immutable tracked contents; untracked/local changes cannot enter."""
    command('git', '-C', str(repo), 'cat-file', '-e', revision + '^{commit}')
    paths = command('git', '-C', str(repo), 'ls-tree', '-rz', '--name-only', revision)
    selected = {p.decode() for p in paths.split(b'\0') if p and in_gate(p.decode(), scope)}
    directories = [p for p in scope['directories'] if any(x.startswith(p) for x in selected)]
    if not directories:
        return
    archive = command('git', '-C', str(repo), 'archive', '--format=tar', revision, '--', *directories)
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for item in tar:
            if item.name in selected and item.isfile():
                yield item.name, tar.extractfile(item).read()


def github_files(repository, revision, scope):
    """Database export fallback is exact tree/blob content, never a moving branch."""
    tree = json.loads(command('gh', 'api', f'repos/OpenResilienceInitiative/{repository}/git/trees/{revision}?recursive=1'))
    if tree.get('truncated'):
        raise ValueError(f'{repository}: truncated immutable tree inventory')
    for item in tree['tree']:
        if item['type'] == 'blob' and in_gate(item['path'], scope):
            blob = json.loads(command('gh', 'api', f'repos/OpenResilienceInitiative/{repository}/git/blobs/{item["sha"]}'))
            if blob.get('encoding') != 'base64':
                raise ValueError(f'{repository}/{item["path"]}: expected encoded immutable blob')
            yield item['path'], base64.b64decode(blob['content'])


def disposition(repository, path, line, family, digest, findings):
    for finding in findings:
        if (finding['repository'], finding['path'], finding['line'], finding['family']) == (repository, path, line, family):
            if finding.get('sourceHash') and finding['sourceHash'] != digest:
                raise ValueError(f'{repository}/{path}: reviewed finding source content drift')
            if finding['classification'] not in CLASSES:
                raise ValueError('Unknown reviewed finding disposition')
            return finding['classification'], finding['reason'], finding.get('id')
    if re.search(r'(?:migration|changelog|changeset)', path, re.I):
        return 'historical', 'Immutable schema/migration history; semantic correctness remains unreviewed.', None
    if ('/generated/' in path or path.startswith(('api/', 'contracts/'))
            or '/openapi' in path.lower()):
        return 'generator-spec', 'Contract/generator ownership surface; candidate requires semantic review at its owning specification.', None
    return 'unresolved', 'Lexical candidate only; contextual semantic review has not been recorded.', None


def audit(policy, repositories, output):
    if policy.get('schemaVersion') != 1:
        raise ValueError('Expected audit policy schemaVersion 1')
    for revision in policy['repositories'].values():
        if not re.fullmatch(r'[a-f0-9]{40}', revision):
            raise ValueError('Audit repositories must use immutable 40-character revisions')
    families = policy['families'] + policy.get('catchAllFamilies', [])
    if len({f['id'] for f in families}) != len(families):
        raise ValueError('Duplicate audit family')
    output.mkdir(parents=True, exist_ok=False)
    summary = {'schemaVersion': 1, 'algorithm': 'ascii-token-camel-snake-family-line-v1',
               'sourceVector': policy['repositories'], 'scope': policy['scope'],
               'repositoryScopes': policy.get('repositoryScopes', {}),
               'files': 0, 'lines': 0, 'occurrences': 0, 'repositories': {}, 'families': {},
               'dispositions': {}, 'catchAllFamilyIds': [f['id'] for f in policy.get('catchAllFamilies', [])], 'evidence': 'lexical-candidates-not-semantic-certification'}
    counts = {f['id']: defaultdict(int) for f in families}
    distinct = {f['id']: set() for f in families}
    dispositions = defaultdict(int)
    reviewed_matches = defaultdict(int)
    with (output / 'occurrences.jsonl').open('w', encoding='utf8') as occurrences:
        for repository, revision in policy['repositories'].items():
            scope = policy.get('repositoryScopes', {}).get(repository, policy['scope'])
            repo = repositories / repository
            remote = policy.get('remoteRepositories', [])
            if repository in remote and not (repo / '.git').exists():
                files = github_files(repository, revision, scope)
            else:
                files = git_files(repo, revision, scope)
            file_count, line_count, candidate_count = 0, 0, 0
            for path, content in files:
                digest = hashlib.sha256(content).hexdigest()
                try:
                    lines = content.decode('utf8').splitlines()
                except UnicodeDecodeError as error:
                    raise ValueError(f'{repository}/{path}: gated file is not UTF-8') from error
                file_count += 1
                line_count += len(lines)
                for line_number, line in enumerate(lines, 1):
                    tokens = [(m.group(), m.start() + 1, normalized(m.group())) for m in TOKEN.finditer(line)]
                    for family in families:
                        matches = [{'token': raw, 'column': column}
                                   for raw, column, token in tokens
                                   if any(root in token.split('_') or root in token for root in family['roots'])]
                        if not matches:
                            continue
                        choice, reason, finding_id = disposition(repository, path, line_number, family['id'], digest, policy.get('findings', []))
                        entry = {'repository': repository, 'path': path, 'line': line_number,
                                 'sourceRevision': revision, 'sourceHash': digest,
                                 'family': family['id'], 'matches': matches,
                                 'disposition': choice, 'reason': reason, 'reviewedFinding': finding_id}
                        occurrences.write(json.dumps(entry, ensure_ascii=False, sort_keys=True) + '\n')
                        counts[family['id']][repository] += 1
                        distinct[family['id']].update(m['token'] for m in matches)
                        dispositions[choice] += 1
                        if finding_id:
                            reviewed_matches[finding_id] += 1
                        candidate_count += 1
            if file_count == 0:
                raise ValueError(f'{repository}: declared gate yielded no tracked source files')
            summary['repositories'][repository] = {'files': file_count, 'lines': line_count, 'occurrences': candidate_count}
            summary['files'] += file_count
            summary['lines'] += line_count
            summary['occurrences'] += candidate_count
    for family in families:
        summary['families'][family['id']] = {'repositories': dict(counts[family['id']]),
                                          'distinctTokens': len(distinct[family['id']]),
                                          'roots': family['roots']}
    summary['dispositions'] = dict(dispositions)
    summary['reviewedFindings'] = [{'id': f['id'], 'matchedOccurrences': reviewed_matches[f['id']],
                                  'state': 'matched-reviewed-occurrence' if reviewed_matches[f['id']]
                                  else 'reviewed-context-reference-no-family-token-on-anchor-line'}
                                 for f in policy.get('findings', []) if f.get('id')]
    with (output / 'occurrences.jsonl').open('rb') as candidate_file:
        candidate_hash = hashlib.sha256()
        while chunk := candidate_file.read(1024 * 1024):
            candidate_hash.update(chunk)
    summary['occurrencesHash'] = candidate_hash.hexdigest()
    (output / 'summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + '\n')
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repositories', type=Path, required=True, help='Parent directory of named Git repositories; only pinned bytes are read')
    parser.add_argument('--policy', type=Path, default=Path(__file__).with_name('audit-policy.json'))
    parser.add_argument('--out', type=Path, required=True, help='New directory for summary and per-candidate dispositions')
    parser.add_argument('--check', type=Path, help='Require the reproduced summary to match this committed JSON exactly')
    args = parser.parse_args()
    report = audit(json.loads(args.policy.read_text()), args.repositories, args.out)
    if args.check and report != json.loads(args.check.read_text()):
        raise ValueError('Reproduced audit differs from the committed summary; review scope, policy and exact source refs')
    print(json.dumps({'files': report['files'], 'lines': report['lines'], 'occurrences': report['occurrences'], 'dispositions': report['dispositions']}))


if __name__ == '__main__':
    main()
