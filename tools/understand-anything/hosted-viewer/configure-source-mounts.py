"""Bind approved per-repository viewers without substituting their graphs."""
from pathlib import Path
import json,yaml,os,argparse,re,urllib.parse
ROUTES=json.loads(Path(__file__).with_name('viewer-routes.json').read_text())
POLICY=Path(__file__).resolve().parents[2]/'truth-chain/public-repositories.json'
def validate_bindings(bindings,manifest,services):
    allowed=set(json.loads(POLICY.read_text())['repositories']);expected={s['repository'] for s in manifest['sources']}
    if not expected<=allowed:raise ValueError('Private/unknown generation sources')
    if not isinstance(bindings,list) or not bindings:raise ValueError('Explicit approved viewer binding list required')
    seen=set();covered=set()
    for b in bindings:
        if set(b)!={'service','repository','origin','workspaceTarget','graphTarget'}:raise ValueError('Viewer binding fields incomplete')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+',b['service']) or b['service'] not in services or b['service'] in seen:raise ValueError('Unknown/duplicate viewer service')
        seen.add(b['service'])
        if b['repository'] not in expected|{'ORISO-Supergraph','ORISO-Platform'}:raise ValueError('Unknown/private viewer repository')
        origin=urllib.parse.urlparse(b['origin'])
        if origin.scheme!='https' or origin.netloc!='understand.oriso.org' or origin.query or origin.fragment or origin.path!=ROUTES.get(b['repository']):raise ValueError('Explicit canonical viewer origin/route required')
        if b['repository'] in covered:raise ValueError('Duplicate selected viewer repository')
        if not all(Path(b[k]).is_absolute() for k in ['workspaceTarget','graphTarget']):raise ValueError('Explicit absolute container targets required')
        covered.add(b['repository'])
    missing=sorted((expected|{'ORISO-Platform','ORISO-Supergraph'})-covered)
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
def configure_production(compose,source_root,runtime_root,static_root,bindings,manifest):
    p=Path(compose)
    if p.is_symlink():raise ValueError('Regular approved Compose file required')
    try:data=yaml.safe_load(p.read_text())
    except Exception:raise ValueError('Compose parsing failed; inspect operator configuration privately')
    validate_bindings(bindings,manifest,data['services'])
    if not all(Path(x).is_absolute() for x in [source_root,runtime_root,static_root]):raise ValueError('Explicit absolute production roots required')
    revision=next((s.get('sourceSHA') for s in manifest['sources'] if s['repository']=='ORISO-Docs'),None)
    if not isinstance(revision,str) or not re.fullmatch(r'[a-f0-9]{40}',revision):raise ValueError('Exact released documentation SHA required')
    for b in bindings:
        if not (Path(source_root)/'graph-generation'/b['repository']/'.understand-anything/knowledge-graph.json').is_file():raise ValueError('Missing selected viewer graph: '+b['repository'])
        service=data['services'][b['service']];ports=service.get('ports',[])
        targets={int(v['target']) if isinstance(v,dict) else int(str(v).split(':')[-1].split('/')[0]) for v in ports}
        if len(targets)!=1 or not all(0<n<65536 for n in targets):raise ValueError('One explicit existing container port required: '+b['service'])
        port=next(iter(targets));old_targets={b['workspaceTarget'],b['graphTarget'],'/sources','/opt/ua-static','/opt/ua-tooling'}|{'/repos/'+s['repository'] for s in manifest['sources']}
        volumes=service.setdefault('volumes',[])
        def target(volume):return volume.get('target') if isinstance(volume,dict) else str(volume).split(':')[1] if len(str(volume).split(':'))>1 else None
        volumes[:]=[v for v in volumes if target(v) not in old_targets]
        volumes.extend([str(Path(source_root))+':/sources:ro',str(Path(static_root)/'current')+':/opt/ua-static:ro',str(Path(runtime_root)/'current/tooling')+':/opt/ua-tooling:ro'])
        env=service.setdefault('environment',{})
        if not isinstance(env,dict):raise ValueError('Viewer environment must be explicit mapping')
        for key in ['GRAPH_DIR','ORISO_SOURCE_REPOSITORY','ORISO_SOURCE_REPOS']:env.pop(key,None)
        env['PYTHONDONTWRITEBYTECODE']='1'
        service.update(image='oriso-understand-static:'+revision,entrypoint=[],working_dir='/opt/ua-static',read_only=True,tmpfs=['/tmp'])
        service.pop('build',None)
        service['command']=['node','/opt/ua-static/production.mjs','--artifact','/opt/ua-static','--source-root','/sources','--repository',b['repository'],'--base-path',ROUTES[b['repository']],'--port',str(port),'--host','0.0.0.0','--tooling','/opt/ua-tooling']
    backup=p.with_name(p.name+'.before-static-production')
    if not backup.exists():backup.write_bytes(p.read_bytes());backup.chmod(0o600)
    p.write_text(yaml.safe_dump(data,sort_keys=False));return [b['service'] for b in bindings]

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--compose',required=True);p.add_argument('--source-root',required=True);p.add_argument('--runtime-root',required=True);p.add_argument('--static-root',required=True);p.add_argument('--bindings',required=True);p.add_argument('--manifest',required=True);a=p.parse_args()
    try:print(json.dumps(configure_production(a.compose,a.source_root,a.runtime_root,a.static_root,json.loads(Path(a.bindings).read_text()),json.loads(Path(a.manifest).read_text()))))
    except Exception:raise SystemExit('Static production Compose binding refused; inspect approved route/port/mount configuration privately')
