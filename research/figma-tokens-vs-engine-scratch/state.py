import json, os
base = os.path.dirname(os.path.abspath(__file__))
o = json.load(open(os.path.join(base, 'figma-flat.json')))
for n, d in o.items():
    bad = []
    for k in d:
        if k.startswith('/State Layers/') and k.endswith('Opacity-08'):
            r = k.split('/')[2]
            s = d.get('/Schemes/' + r)
            if s and s[0] != d[k][0]:
                bad.append((r, s[0], d[k][0]))
    print(n, len(bad), bad)
