import json, os
base = '/private/tmp/claude-501/-Users-frankgerhardt-ORISO/ed79c73a-5ff2-4bd7-8e58-5fe1a14a1dbb/scratchpad'
path = base + '/src/fe/src/utils/theme/__fixtures__/Light.tokens.json'
print(os.path.exists(path), os.listdir(base + '/src/fe/src/utils/theme/__fixtures__') if os.path.exists(base + '/src/fe/src/utils/theme/__fixtures__') else '')
if os.path.exists(path):
    d = json.load(open(path))
    def walk(o, pp=''):
        r = {}
        if isinstance(o, dict):
            if '$value' in o:
                v = o['$value']
                return {pp: v.get('hex') if isinstance(v, dict) else v}
            for k, v in o.items():
                if not k.startswith('$'):
                    r.update(walk(v, pp + '/' + k))
        return r
    f = walk(d)
    L = json.load(open(base + '/figma.json'))['Light']
    print(len(f))
    diff = [(k, f[k], L[k][0]) for k in f if k in L and (f[k] or '').upper() != (L[k][0] or '').upper()]
    print(len(diff), diff[:20])
    print([k for k in f if k not in L][:5], [k for k in L if k not in f][:5])
