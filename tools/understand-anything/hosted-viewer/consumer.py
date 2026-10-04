"""Validated immutable public source installation; never prints source bodies/tokens."""
import argparse,json,os,pathlib,shutil,subprocess,sys,tempfile,hashlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from bundle.contract import validate
POLICY=pathlib.Path(__file__).resolve().parents[2]/'truth-chain/public-repositories.json'
def clone_public(repository,sha,target):
    subprocess.run(['git','clone','--quiet','--no-checkout','https://github.com/OpenResilienceInitiative/'+repository,str(target)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subprocess.run(['git','-C',str(target),'checkout','--quiet','--detach',sha],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def install_sources(generation,source_root,clone=clone_public):
    generation=pathlib.Path(generation);source_root=pathlib.Path(source_root)
    validate(generation)
    manifest=json.loads((generation/'manifest.json').read_text());allowed=json.loads(POLICY.read_text())['repositories']
    assert all(s['repository'] in allowed for s in manifest['sources']), 'Only verified public sources may be installed'
    if not manifest.get('release'):raise ValueError('Verified platform release required; branch previews cannot activate public viewers')
    name=manifest['generationId']+'-'+hashlib.sha256((generation/'manifest.json').read_bytes()).hexdigest()[:16]
    target=source_root/'generations'/name;target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():
        validate(target/'graph-generation')
        if (target/'graph-generation/manifest.json').read_bytes()!=(generation/'manifest.json').read_bytes():raise ValueError('Immutable source generation manifest changed')
        for source in manifest['sources']:
            repo=target/source['repository']
            if subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()!=source['sourceSHA'] or subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True).strip():raise ValueError('Immutable source checkout changed')
    else:
        stage=pathlib.Path(tempfile.mkdtemp(prefix='.sources-',dir=target.parent))
        try:
            for source in manifest['sources']:
                repo=stage/source['repository'];clone(source['repository'],source['sourceSHA'],repo)
                actual=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
                if actual!=source['sourceSHA']:raise ValueError('Source revision mismatch')
            shutil.copytree(generation,stage/'graph-generation');stage.rename(target)
        finally:
            if stage.exists():shutil.rmtree(stage)
    current=source_root/'current'
    if current.exists() and not current.is_symlink():raise ValueError('Existing source root needs explicit operator migration')
    pending=source_root/'current.pending'
    if pending.is_symlink() or pending.exists():raise ValueError('Pending source activation needs inspection')
    pending.symlink_to(target.resolve());pending.replace(current)
    return target
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--generation',required=True);p.add_argument('--source-root',required=True);a=p.parse_args()
    try:print(install_sources(a.generation,a.source_root))
    except Exception as e:raise SystemExit(str(e))
