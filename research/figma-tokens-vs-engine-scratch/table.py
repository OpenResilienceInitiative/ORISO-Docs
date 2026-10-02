import json
base = '/private/tmp/claude-501/-Users-frankgerhardt-ORISO/ed79c73a-5ff2-4bd7-8e58-5fe1a14a1dbb/scratchpad'
u = json.load(open(f'{base}/src/usage.json'))
fig = json.load(open(f'{base}/figma.json'))['Light']
roles = [k[9:] for k in fig if k.startswith('/Schemes/')]
kebab = lambda r: '--m3-' + r.lower().replace(' ', '-')
def g(repo, t, cat):
    return u[repo].get(t, {}).get('c', {}).get(cat, 0)
def f(repo, t):
    return u[repo].get(t, {}).get('files', 0)
rows = []
for r in roles:
    t = kebab(r)
    rows.append((r, t, g('fe', t, 'app'), f('fe', t), g('fe', t, 'story_test_doc'), g('fe', t, 'engine'), g('ad', t, 'app'), f('ad', t), g('ad', t, 'story_test_doc'), g('ad', t, 'engine')))
print('role|token|FE app uses (files)|FE story/test|FE engine|AD app uses (files)|AD story/test|AD engine')
for r in rows:
    print(f'{r[0]}|{r[1]}|{r[2]} ({r[3]})|{r[4]}|{r[5]}|{r[6]} ({r[7]})|{r[8]}|{r[9]}')
known = set(kebab(r) for r in roles)
print('--- tokens used in code that are NOT a Figma scheme role')
for repo in ['fe', 'ad']:
    for t, v in sorted(u[repo].items()):
        if t not in known:
            print(repo, t, v['c'], v['files'])
