#!/usr/bin/env python3
"""Prepare/install immutable bilingual legal releases to an explicit filesystem root.

No network, service mutation, operator identity inference or approval creation.
"""
import argparse,json,os,re,tempfile,uuid
from pathlib import Path
from dsfa_draft import validate,validate_publication,build_input,html_input,pdf_input,digest

def ready_inputs(root):
 manifest=json.loads((root/'manifest.json').read_text());validate(root,manifest)
 records=json.loads((root/'approvals.json').read_text()) if (root/'approvals.json').is_file() else {}
 receipt=validate_publication(root,records)
 if manifest.get('missingAnnexes')!=[] or manifest.get('sourceWarnings')!=[]:raise ValueError('Missing annexes or unresolved source warnings')
 if manifest.get('operatorFieldsConfirmed') is not True or manifest.get('unconfirmedOperatorFields')!=[]:raise ValueError('Operator fields unconfirmed')
 annexes=manifest.get('annexReadiness',{})
 if not {'A1','A2'}.issubset(annexes):raise ValueError('Full annex readiness missing')
 annex_inputs={locale:[] for locale in ['de','en']}
 for ident,annex in sorted(annexes.items()):
  if annex.get('state')!='confirmed':raise ValueError('Annex unconfirmed: '+ident)
  for locale in ['de','en']:
   item=annex.get('files',{}).get(locale,{})
   path=(root/item.get('path','')).resolve()
   if not path.is_relative_to(root.resolve()) or not path.is_file() or digest(path.read_bytes())!=item.get('sha256'):raise ValueError('Missing/stale annex: '+ident+'/'+locale)
   annex_inputs[locale].append(path.read_text())
 data={locale:build_input(root,manifest,locale) for locale in ['de','en']}
 for locale in data:
  data[locale]['markdown']+='\n\n'+'\n\n'.join(annex_inputs[locale])
  # No implicit operator placeholders: Markdown links and code are excluded.
  prose=re.sub(r'`[^`]*`|\[[^\]]*\]\([^)]*\)','',data[locale]['markdown'])
  if re.search(r'\[[^\]]+\]',prose) or '.example' in prose:raise ValueError('Unresolved operator placeholder/example data')
 if digest((root/'manifest.json').read_bytes())!=receipt['sourceManifestHash']:raise ValueError('Source manifest changed during preparation')
 return manifest,receipt,data

def publish(root,destination_root,release_version,activate_links=()):
 if not re.fullmatch(r'[1-9][0-9]*(?:\.[0-9]+)*',release_version):raise ValueError('Explicit approved release version required, e.g. 5')
 if len(set(activate_links))!=len(activate_links) or any(link not in {'current','latest'} for link in activate_links):raise ValueError('Only explicit current/latest activation links allowed')
 manifest,receipt,data=ready_inputs(root)
 if release_version!=manifest.get('releaseVersion'):raise ValueError('CLI release version differs from approved hashed contract')
 destination_root=destination_root.resolve()
 base=destination_root/'legal/dsfa';versions=base/'versions';target=versions/release_version
 for path in [destination_root/'legal',base,versions]:
  if path.is_symlink():raise ValueError('Destination publication tree must not traverse symlinks')
 # Fail before touching disk when activation would overwrite a historical file/tree.
 for name in activate_links:
  link=base/name
  if link.exists() and not link.is_symlink():raise ValueError('Activation path is not a symlink: '+str(link))
 if target.exists() or target.is_symlink():raise ValueError('Immutable release already exists')
 versions.mkdir(parents=True,exist_ok=True)
 lock=versions/('.lock-'+release_version)
 try:fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
 except FileExistsError:raise ValueError('Release installation already running')
 os.close(fd)
 try:
  if target.exists() or target.is_symlink():raise ValueError('Immutable release already exists')
  with tempfile.TemporaryDirectory(prefix='.prepare-',dir=versions) as folder:
   staged=Path(folder)/'release';staged.mkdir()
   hashes={}
   for locale in ['de','en']:
    out=staged/locale;out.mkdir();(out/'index.html').write_text(html_input(data[locale],approved_version=release_version));pdf_input(data[locale],out/'dsfa.pdf',approved_version=release_version)
    for file in out.iterdir():hashes[str(file.relative_to(staged))]={'sha256':digest(file.read_bytes()),'bytes':file.stat().st_size}
   public_manifest={'operatorSnapshotHash':data['de']['operatorSnapshot']['snapshotHash'],'operatorFieldsConfirmed':True,'releaseVersion':release_version,'date':manifest['date'],'sourceManifestHash':receipt['sourceManifestHash'],'sourceDraftVersion':receipt['draftVersion'],'approvalStates':dict.fromkeys(['technical','operator','legal'],'approved'),'approvalRecordsHash':digest((root/'approvals.json').read_bytes()),'locales':['de','en'],'inputHashes':{locale:digest(data[locale]['markdown'].encode()) for locale in ['de','en']},'artifacts':hashes}
   (staged/'manifest.json').write_text(json.dumps(public_manifest,indent=2)+'\n')
   # A new directory rename on the same filesystem publishes both locales together.
   os.rename(staged,target)
  for name in activate_links:
   temporary=base/('.'+name+'-'+uuid.uuid4().hex)
   try:
    temporary.symlink_to('versions/'+release_version,target_is_directory=True);os.replace(temporary,base/name)
   finally:
    if temporary.is_symlink():temporary.unlink()
  return target.resolve()
 finally:lock.unlink()

def _read_url(url,max_bytes,timeout):
 import time
 from urllib.request import build_opener,HTTPRedirectHandler,Request
 from urllib.error import HTTPError,URLError
 class NoRedirect(HTTPRedirectHandler):
  def redirect_request(self,*args,**kwargs):return None
 deadline=time.monotonic()+timeout
 try:
  with build_opener(NoRedirect()).open(Request(url,headers={'Accept-Encoding':'identity'}),timeout=timeout) as response:
   if response.status!=200:raise ValueError('Public readback status is not 200')
   parts=[];count=0
   while True:
    if response.fp is None:break
    remaining=deadline-time.monotonic()
    if remaining<=0:raise ValueError('Public readback request deadline exceeded')
    response.fp.raw._sock.settimeout(remaining)
    chunk=response.read1(min(65536,max_bytes+1-count))
    if not chunk:break
    count+=len(chunk);parts.append(chunk)
    if count>max_bytes:raise ValueError('Public readback exceeds expected byte length')
   return b''.join(parts)
 except (HTTPError,URLError,TimeoutError,OSError) as error:raise ValueError('Public readback failed without redirect: '+type(error).__name__) from error

def _http_test_transport(url,max_bytes,timeout):
 """Injection seam for local test servers; never exposed as a CLI option."""
 return _read_url(url,max_bytes,timeout)

def verify_live(expected_manifest,base_url,*,_transport=None):
 """Read-only byte proof against one expected immutable manifest, not HTTP status proof."""
 from urllib.parse import urlsplit
 import time
 expected_bytes=expected_manifest.read_bytes()
 if len(expected_bytes)>1024*1024:raise ValueError('Expected manifest too large')
 expected=json.loads(expected_bytes);version=expected.get('releaseVersion')
 if not isinstance(version,str) or not re.fullmatch(r'[1-9][0-9]*(?:\.[0-9]+)*',version):raise ValueError('Invalid expected release version')
 parsed=urlsplit(base_url)
 scheme_allowed=parsed.scheme=='https' or (_transport is not None and parsed.scheme=='http' and parsed.hostname in {'localhost','127.0.0.1','::1'})
 if not scheme_allowed or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path!=f'/legal/dsfa/versions/{version}/':raise ValueError('Explicit HTTPS immutable version base URL required')
 required={'de/index.html','en/index.html','de/dsfa.pdf','en/dsfa.pdf'}
 artifacts=expected.get('artifacts',{})
 if expected.get('locales')!=['de','en'] or set(artifacts)!=required:raise ValueError('Expected manifest must contain exactly four DE/EN HTML/PDF artifacts')
 for info in artifacts.values():
  if type(info.get('bytes')) is not int or not 0<info['bytes']<=64*1024*1024 or not re.fullmatch(r'[0-9a-f]{64}',info.get('sha256','')):raise ValueError('Invalid artifact byte/hash expectation')
 transport=_transport or _read_url;deadline=time.monotonic()+30
 def fetch(name,size):
  remaining=deadline-time.monotonic()
  if remaining<=0:raise ValueError('Public readback exceeded 30-second budget')
  data=transport(base_url+name,size,min(5,remaining))
  if time.monotonic()>deadline:raise ValueError('Public readback exceeded 30-second budget')
  return data
 observed=fetch('manifest.json',len(expected_bytes))
 if len(observed)!=len(expected_bytes) or digest(observed)!=digest(expected_bytes):raise ValueError('Public manifest bytes/hash mismatch')
 if json.loads(observed).get('releaseVersion')!=version:raise ValueError('Public manifest release version mismatch')
 for name,info in sorted(artifacts.items()):
  data=fetch(name,info['bytes'])
  if len(data)!=info['bytes'] or digest(data)!=info['sha256']:raise ValueError('Public artifact bytes/hash mismatch: '+name)
 return {'releaseVersion':version,'manifestHash':digest(observed),'manifestBytes':len(observed),'verifiedArtifacts':4,'baseUrl':base_url}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('source',type=Path,nargs='?');parser.add_argument('--destination-root',type=Path);parser.add_argument('--release-version');parser.add_argument('--activate-link',choices=['current','latest'],action='append',default=[]);parser.add_argument('--verify-live',action='store_true');parser.add_argument('--expected-manifest',type=Path);parser.add_argument('--base-url');args=parser.parse_args()
 if args.verify_live:
  if not args.expected_manifest or not args.base_url or args.source or args.destination_root or args.release_version or args.activate_link:parser.error('--verify-live requires only --expected-manifest and --base-url')
  print(json.dumps(verify_live(args.expected_manifest,args.base_url),indent=2));return
 if not args.source or not args.destination_root or not args.release_version or args.expected_manifest or args.base_url:parser.error('Installation requires source, --destination-root and --release-version')
 print(publish(args.source,args.destination_root,args.release_version,args.activate_link))
if __name__=='__main__':main()
