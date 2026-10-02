import json
base = '/private/tmp/claude-501/-Users-frankgerhardt-ORISO/ed79c73a-5ff2-4bd7-8e58-5fe1a14a1dbb/scratchpad'
u = json.load(open(f'{base}/src/usage.json'))
rows = json.load(open(f'{base}/eng/rows.json'))
fig = json.load(open(f'{base}/figma.json'))
kb = lambda r: '--m3-' + r.lower().replace(' ', '-')
def a(repo, t): return u[repo].get(t, {}).get('c', {}).get('app', 0)
def fl(repo, t): return u[repo].get(t, {}).get('files', 0)
def st(repo, t): return u[repo].get(t, {}).get('c', {}).get('story_test_doc', 0)
note = {
 'On Primary Container 2': 'duplicate (identical value in all 6 files, no consumer)',
 'Secondary': 'inconsistent (Light #655F65 is H318 mauve; every other secondary is H249 slate)',
 'Background': 'inconsistent (Light grey page vs MC/HC and Dark values; see 4.3)',
 'On Background': 'inconsistent (red-tinted H25 C11 in all 6, On Surface is neutral)',
 'Shadow': 'duplicate of Scrim (#000000)', 'Scrim': 'duplicate of Shadow (#000000)',
 'Tertiary': 'near-duplicate of Secondary (same palette)', 'On Tertiary': 'near-duplicate of Secondary',
 'Tertiary Container': 'near-duplicate of Secondary', 'On Tertiary Container': 'near-duplicate of Secondary',
 'Tertiary Fixed': 'unused + identical to Secondary Fixed', 'On Tertiary Fixed': 'unused + identical to On Secondary Fixed',
 'Tertiary Fixed Dim': 'unused + identical to Secondary Fixed Dim', 'On Tertiary Fixed Variant': 'unused + identical',
 'Surface Tint': 'unused as a colour (only as a Surfaces-group overlay base)',
 'Surface Dim': 'unused', 'Surface Bright': 'unused; Light value is darker than Surface',
 'Surface': 'Light #FAFBFB cool (H207) vs MC/HC #FCF9F9 warm',
 'Surface Container': 'Light state layer says #F0EDEE, scheme says #EAE7E8',
 'Surface Container High': 'Light state layer says #EAE7E8, scheme says #E7E3E3',
 'Primary Container': 'Dark value = Light value (not adapted)', 'Secondary Container': 'Dark value = Light value (not adapted)',
 'Tertiary Container ': '', 'Error Container': 'Dark value = Light value (not adapted)',
}
def status(r):
    t = kb(r); f, d = a('fe', t), a('ad', t)
    if r == 'On Primary Container 2': return 'duplicate'
    if f and d: return 'both'
    if f: return 'FE only'
    if d: return 'AD only'
    return 'unused'
print('| Role | FE uses (files) | AD uses (files) | Used by | Note |')
print('|---|---|---|---|---|')
for r in [x['role'] for x in rows] + ['On Primary Container 2']:
    t = kb(r)
    print(f"| {r} | {a('fe', t)} ({fl('fe', t)}) | {a('ad', t)} ({fl('ad', t)}) | {status(r)} | {note.get(r, '')} |")
print()
print('| Role | Light fig / engine | dE | Dark fig / engine | dE | LMC dE | LHC dE | DMC dE | DHC dE |')
print('|---|---|---|---|---|---|---|---|---|')
for x in rows:
    L, D = x['Light'], x['Dark']
    def f(v): return '-' if v is None else v
    g = lambda k: x[k].get('dE')
    print(f"| {x['role']} | {L['fig']} / {f(L.get('eng'))} | {f(L.get('dE'))} | {D['fig']} / {f(D.get('eng'))} | {f(D.get('dE'))} | {f(g('Light Medium Contrast'))} | {f(g('Light High Contrast'))} | {f(g('Dark Medium Contrast'))} | {f(g('Dark High Contrast'))} |")
