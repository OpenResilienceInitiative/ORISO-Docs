import os, re, json, collections, sys
base = '/private/tmp/claude-501/-Users-frankgerhardt-ORISO/ed79c73a-5ff2-4bd7-8e58-5fe1a14a1dbb/scratchpad/src'
tok = re.compile(r'--m3-[a-z0-9-]+')
res = {}
for repo in ['fe', 'ad']:
    use = collections.defaultdict(lambda: collections.Counter())
    files = collections.defaultdict(set)
    for dp, dn, fn in os.walk(f'{base}/{repo}'):
        if any(x in dp for x in ['node_modules', '/.git', '/storybook-static', '/build/', '/dist/']):
            continue
        for f in fn:
            if not f.endswith(('.ts', '.tsx', '.js', '.jsx', '.scss', '.css', '.html', '.json', '.mdx')):
                continue
            p = os.path.join(dp, f)
            rel = p[len(base) + 4:]
            try:
                s = open(p, errors='ignore').read()
            except Exception:
                continue
            ms = tok.findall(s)
            if not ms:
                continue
            if '/utils/theme/' in rel or 'mui-variables-mapping' in rel or rel.endswith('app.css') or '/generated/' in rel or 'callTheme' in rel or 'theme-migration' in rel:
                cat = 'engine'
            elif '.stories.' in rel or '.test.' in rel or '__tests__' in rel or 'cypress' in rel or rel.endswith('.mdx') or 'designTokens' in rel or 'docs/' in rel:
                cat = 'story_test_doc'
            else:
                cat = 'app'
            for m in ms:
                use[m][cat] += 1
                if cat == 'app':
                    files[m].add(rel)
    res[repo] = {k: {'c': dict(v), 'files': len(files[k])} for k, v in use.items()}
json.dump(res, open(f'{base}/usage.json', 'w'))
print({r: len(v) for r, v in res.items()})
