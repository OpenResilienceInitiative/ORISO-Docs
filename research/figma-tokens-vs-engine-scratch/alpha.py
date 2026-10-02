import os, re, json, collections
base = '/private/tmp/claude-501/-Users-frankgerhardt-ORISO/ed79c73a-5ff2-4bd7-8e58-5fe1a14a1dbb/scratchpad/src'
pat = re.compile(r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)|rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*/\s*([0-9.]+%?)\s*\)|#([0-9a-fA-F]{6})([0-9a-fA-F]{2})\b|#([0-9a-fA-F]{3})([0-9a-fA-F])\b|hsla\([^)]*\)')
ctx = re.compile(r'dialog|modal|popup|pop-up|overlay|backdrop|drawer|sheet|tooltip|popover|menu|scrim|snackbar|banner', re.I)
res = {}
for repo in ['fe', 'ad']:
    rows = []
    for dp, dn, fn in os.walk(f'{base}/{repo}/src'):
        for f in fn:
            if not f.endswith(('.scss', '.css', '.ts', '.tsx', '.jsx', '.js')):
                continue
            p = os.path.join(dp, f)
            rel = p[len(base) + 4:]
            if any(x in rel for x in ['.stories.', '.test.', '/generated/', 'theme-migration', '/utils/theme/']):
                continue
            for i, line in enumerate(open(p, errors='ignore'), 1):
                for m in pat.finditer(line):
                    g = m.groups()
                    kind = 'other'
                    if g[0] is not None:
                        r, gg, b, a = g[0:4]
                    elif g[4] is not None:
                        r, gg, b, a = g[4:8]
                    elif g[8] is not None:
                        h = g[8]
                        r, gg, b = [int(h[j:j + 2], 16) for j in (0, 2, 4)]
                        a = str(round(int(g[9], 16) / 255, 2))
                    else:
                        continue
                    r, gg, b = int(r), int(gg), int(b)
                    if (r, gg, b) == (255, 255, 255): kind = 'white'
                    elif (r, gg, b) == (0, 0, 0): kind = 'black'
                    rows.append({'f': rel, 'l': i, 'kind': kind, 'a': a, 'rgb': [r, gg, b], 'txt': line.strip()[:140], 'ctx': bool(ctx.search(rel) or ctx.search(line))})
    res[repo] = rows
    c = collections.Counter(x['kind'] for x in rows)
    print(repo, len(rows), dict(c), 'dialog-ish', sum(1 for x in rows if x['ctx']))
json.dump(res, open(f'{base}/alpha.json', 'w'))
for repo in res:
    print('=====', repo, 'white/black translucents in dialog-ish context')
    for x in res[repo]:
        if x['kind'] in ('white', 'black') and x['ctx']:
            print(f"{x['f']}:{x['l']} [{x['kind']} {x['a']}] {x['txt']}")
