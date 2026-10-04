"""Bind approved per-repository viewers without substituting their graphs."""
from pathlib import Path
import json,yaml,os,argparse
POLICY=Path(__file__).resolve().parents[2]/'truth-chain/public-repositories.json'
def validate_bindings(bindings,manifest,services):
    allowed=set(json.loads(POLICY.read_text())['repositories']);expected={s['repository'] for s in manifest['sources']}
    if not expected<=allowed:raise ValueError('Private/unknown generation sources')
    if not isinstance(bindings,list) or not bindings:raise ValueError('Explicit approved viewer binding list required')
    seen=set();covered=set()
    for b in bindings:
        if set(b)!={'service','repository','origin','workspaceTarget','graphTarget'}:raise ValueError('Viewer binding fields incomplete')
        if b['service'] not in services or b['service'] in seen:raise ValueError('Unknown/duplicate viewer service')
        seen.add(b['service'])
        if b['repository'] not in expected|{'ORISO-Supergraph','ORISO-Platform'}:raise ValueError('Unknown/private viewer repository')
        if not b['origin'].startswith('https://understand.oriso.org/') or '?' in b['origin']:raise ValueError('Explicit canonical viewer origin required')
        if not all(Path(b[k]).is_absolute() for k in ['workspaceTarget','graphTarget']):raise ValueError('Explicit absolute container targets required')
        covered.add(b['repository'])
    missing=sorted(expected-covered)
    if missing:raise ValueError('Missing public repository viewer bindings: '+', '.join(missing))
    return bindings

def configure(compose,source_root,runtime_root,bindings,manifest):
    p=Path(compose)
    try:data=yaml.safe_load(p.read_text())
    except Exception:raise ValueError('Compose parsing failed; inspect operator configuration privately')
    bindings=validate_bindings(bindings,manifest,data['services'])
    repos=[s['repository'] for s in manifest['sources']]
    if not all(Path(x).is_absolute() for x in [source_root,runtime_root]):raise ValueError('Explicit absolute host roots required')
    for b in bindings:
        graph=Path(source_root)/'graph-generation'/b['repository']
        if not (graph/'.understand-anything/knowledge-graph.json').is_file():raise ValueError('Missing selected viewer graph: '+b['repository'])
        s=data['services'][b['service']];volumes=s.setdefault('volumes',[])
        mounts=[(str(Path(runtime_root)/'current/upstream'),b['workspaceTarget']),(str(graph),b['graphTarget'])]+[(str(Path(source_root)/r),'/repos/'+r) for r in repos]
        for host,target in mounts:
            volumes[:]=[v for v in volumes if not (isinstance(v,str) and len(v.split(':'))>=2 and v.split(':')[1]==target)]
            volumes.append(f'{host}:{target}:ro')
        env=s.setdefault('environment',{})
        if not isinstance(env,dict):raise ValueError('Viewer environment must be explicit mapping')
        env['GRAPH_DIR']=b['graphTarget'];env['ORISO_SOURCE_REPOSITORY']=b['repository'];env['ORISO_SOURCE_REPOS']=json.dumps({r:'/repos/'+r for r in repos},separators=(',',':'))
    backup=p.with_name(p.name+'.before-public-viewer-bindings')
    if not backup.exists():backup.write_bytes(p.read_bytes());os.chmod(backup,0o600)
    p.write_text(yaml.safe_dump(data,sort_keys=False));return [b['service'] for b in bindings]
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--compose',required=True);p.add_argument('--source-root',required=True);p.add_argument('--runtime-root',required=True);p.add_argument('--bindings',required=True);p.add_argument('--manifest',required=True);a=p.parse_args()
    try:print(json.dumps(configure(a.compose,a.source_root,a.runtime_root,json.loads(Path(a.bindings).read_text()),json.loads(Path(a.manifest).read_text()))))
    except Exception as e:raise SystemExit(str(e))
