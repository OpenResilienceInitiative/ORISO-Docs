"""Fail-closed exact inputs for a published platform release, not runtime approval."""
import hashlib,json,os,re,subprocess,urllib.parse,urllib.request
from pathlib import Path
from .contract import require
SHA=re.compile(r'^[a-f0-9]{40}$')
PRIVATE={'ORISO-E2E','ORISO-Infra'}
OWNER='OpenResilienceInitiative'
HELM_RELEASE_CONTRACT='oriso.helm-release/v1'
def required_repositories():
    policy=json.loads(Path(__file__).with_name('public-repositories.json').read_text())
    require(policy.get('schemaVersion')=='oriso.ua.supported-public-repositories/v1' and isinstance(policy.get('repositories'),list),'supported-public repository policy required')
    names=set(policy['repositories'])
    require(len(names)==len(policy['repositories']) and not names & PRIVATE,'invalid supported-public repository policy')
    from .pipeline import REPOS
    require(names=={name for name,_,_ in REPOS if name not in PRIVATE},'supported-public policy differs from producer inventory')
    return names
def canonical_bytes(lock):return json.dumps(lock,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def validate_lock(lock,documentation_revision=None):
    require(isinstance(lock,dict) and set(lock)=={'schemaVersion','version','releaseUrl','documentationRevision','sources'},'release lock fields required')
    require(lock['schemaVersion']=='oriso.platform-release/v1','unsupported release lock schema')
    require(isinstance(lock['version'],str) and re.fullmatch(r'v?\d+\.\d+\.\d+',lock['version']),'exact released version required')
    url=urllib.parse.urlparse(lock['releaseUrl']);parts=url.path.split('/')
    require(url.scheme=='https' and url.netloc=='github.com' and not url.query and not url.fragment and len(parts)==6 and parts[1]==OWNER and parts[3:5]==['releases','tag'],'explicit published GitHub release URL required')
    require(parts[2]=='ORISO-Helm','platform release origin must be ORISO-Helm')
    tag=urllib.parse.unquote(parts[5]);require(tag==lock['version'],'release version must equal exact GitHub tag name')
    require(isinstance(lock['documentationRevision'],str) and SHA.fullmatch(lock['documentationRevision']),'full documentation release SHA required')
    if documentation_revision is not None:require(lock['documentationRevision']==documentation_revision,'documentation revision differs from release lock')
    require(isinstance(lock['sources'],list),'release sources required');names=set()
    for source in lock['sources']:
        require(isinstance(source,dict) and set(source)=={'repository','ref','sourceSHA'},'exact released source fields required')
        name=source['repository'];require(name not in PRIVATE and name in required_repositories() and name not in names,'private/unknown/duplicate release source')
        names.add(name);ref=source['ref'];sha=source['sourceSHA'];require(isinstance(sha,str) and SHA.fullmatch(sha),'full release source SHA required')
        require(isinstance(ref,str) and (SHA.fullmatch(ref) or re.fullmatch(r'refs/tags/[A-Za-z0-9_./-]+',ref)) and '..' not in ref and not ref.endswith('/'),'release inputs require exact tag or SHA, never branch tips')
        if SHA.fullmatch(ref):require(ref==sha,'SHA ref differs from released source SHA')
    require(names==required_repositories(),'missing supported public release inputs')
    docs=next(s for s in lock['sources'] if s['repository']=='ORISO-Docs');require(docs['sourceSHA']==lock['documentationRevision'],'Docs release SHA differs from documentation revision')
    require(parts[2] in names,'release origin repository not present in locked inputs')
    return lock
def github_json(api_path):
    headers={'Accept':'application/vnd.github+json','User-Agent':'oriso-release-input-validator'}
    token=os.environ.get('GITHUB_TOKEN')
    if token:headers['Authorization']='Bearer '+token
    try:
        with urllib.request.urlopen(urllib.request.Request('https://api.github.com/'+api_path,headers=headers),timeout=60) as response:return json.load(response)
    except Exception:raise ValueError('GitHub release/public visibility verification unavailable; refusing release inputs')
def remote_tag_sha(repository,ref):
    try:
        result=subprocess.run(['git','-c','credential.helper=','ls-remote','--tags','https://github.com/'+OWNER+'/'+repository,ref,ref+'^{}'],check=True,capture_output=True,text=True,timeout=90)
    except Exception:raise ValueError('Exact release tag verification failed: '+repository)
    rows={line.split()[1]:line.split()[0] for line in result.stdout.splitlines() if len(line.split())==2}
    sha=rows.get(ref+'^{}') or rows.get(ref);require(sha is not None and SHA.fullmatch(sha),'release tag absent')
    return sha
def verify_release(lock,documentation_revision=None,api=github_json,tag_sha=remote_tag_sha):
    validate_lock(lock,documentation_revision);url=urllib.parse.urlparse(lock['releaseUrl']);origin=url.path.split('/')[2];tag=urllib.parse.unquote(url.path.split('/')[5])
    for source in lock['sources']:
        repo=api('repos/'+OWNER+'/'+source['repository']);require(repo.get('private') is False and repo.get('visibility')=='public','release repository visibility is not public')
        if source['ref'].startswith('refs/tags/'):require(tag_sha(source['repository'],source['ref'])==source['sourceSHA'],'retargeted release tag or wrong source SHA')
    release=api('repos/'+OWNER+'/'+origin+'/releases/tags/'+urllib.parse.quote(tag,safe=''))
    require(release.get('draft') is False and release.get('prerelease') is False and release.get('published_at') and release.get('tag_name')==tag and release.get('html_url')==lock['releaseUrl'],'actual published release identity required')
    canonical=canonical_bytes(lock);digest=hashlib.sha256(canonical).hexdigest()
    assets=release.get('assets',[])
    require(isinstance(assets,list),'published release asset metadata required')
    assets=[asset for asset in assets if isinstance(asset,dict) and asset.get('name')=='platform-release.json']
    require(len(assets)==1 and assets[0].get('state')=='uploaded' and type(assets[0].get('size')) is int and assets[0]['size']==len(canonical) and assets[0].get('digest')=='sha256:'+digest,'published release asset must match exact canonical release lock')
    source=next(s for s in lock['sources'] if s['repository']==origin);require(tag_sha(origin,'refs/tags/'+tag)==source['sourceSHA'],'published release origin tag differs from locked source SHA')
    return {'lock':lock,'sha256':hashlib.sha256(canonical_bytes(lock)).hexdigest(),'publishedAt':release['published_at'],'releaseId':release.get('id'),'evidenceScope':'published-github-release-and-source-refs'}
def load_release(path,documentation_revision=None,verify=True):
    require(path is not None,'release manifest required; no branch-tip fallback')
    try:lock=json.loads(Path(path).read_text())
    except Exception:raise ValueError('Release manifest missing or invalid JSON')
    return verify_release(lock,documentation_revision) if verify else validate_lock(lock,documentation_revision)
