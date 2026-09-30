import copy,hashlib,json,tempfile,unittest
from pathlib import Path
from legal_publication import publish
from pypdf import PdfReader
class PublicationTests(unittest.TestCase):
 def fixture(self,root):
  chapters=[]
  for ident in [str(i) for i in range(1,11)]+['A1','A']:
   c={'id':ident,'hashes':{}}
   for locale in ['de','en']:
    name=f'{locale}-{ident}.md';(root/name).write_text(f'## Chapter {ident}\n\nPublic {locale} content.');c[locale]=name;c['hashes'][locale]=hashlib.sha256((root/name).read_bytes()).hexdigest()
   c['translationSourceHash']=c['hashes']['de'];chapters.append(c)
  annex={}
  for ident in ['A1','A2']:
   annex[ident]={'state':'confirmed','files':{}}
   for locale in ['de','en']:
    name=f'annex-{ident}-{locale}.md';(root/name).write_text(f'## Annex {ident}\n\nComplete synthetic {locale} annex.');annex[ident]['files'][locale]={'path':name,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()}
  m={'version':'v5-draft','releaseVersion':'5','date':'2026-09-30','locales':['de','en'],'approval':dict.fromkeys(['technical','operator','legal'],'pending'),'chapters':chapters,'missingAnnexes':[],'sourceWarnings':[],'operatorFieldsConfirmed':True,'unconfirmedOperatorFields':[],'annexReadiness':annex}
  self.write(root,m);return m
 def write(self,root,m):
  (root/'manifest.json').write_text(json.dumps(m));h=hashlib.sha256((root/'manifest.json').read_bytes()).hexdigest()
  (root/'approvals.json').write_text(json.dumps({o:{'state':'approved','draftVersion':'v5-draft','releaseVersion':'5','sourceManifestHash':h,'approver':'Synthetic fixture','timestamp':'2026-09-30T12:00:00Z','evidence':'synthetic unit test'} for o in ['technical','operator','legal']}))
 def test_success_same_version_full_outputs_and_history_immutable(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder)/'source';root.mkdir();self.fixture(root);dest=Path(folder)/'host';old=dest/'legal/dsfa/versions/4';old.mkdir(parents=True);(old/'old.pdf').write_bytes(b'old immutable');manifest_before=(root/'manifest.json').read_bytes()
   release=publish(root,dest,'5',['current','latest'])
   for locale in ['de','en']:
    self.assertIn('ORISO DSFA 5', (release/locale/'index.html').read_text());pdf=PdfReader(release/locale/'dsfa.pdf');self.assertEqual(pdf.metadata.title,f'ORISO DSFA 5 {locale}');self.assertNotIn('v5-draft',' '.join(p.extract_text() for p in pdf.pages))
   public=json.loads((release/'manifest.json').read_text())
   for name,info in public['artifacts'].items():self.assertEqual(info['sha256'],hashlib.sha256((release/name).read_bytes()).hexdigest());self.assertEqual(info['bytes'],(release/name).stat().st_size)
   self.assertEqual((old/'old.pdf').read_bytes(),b'old immutable');self.assertEqual((root/'manifest.json').read_bytes(),manifest_before)
   self.assertEqual((dest/'legal/dsfa/current').resolve(),release);self.assertEqual((dest/'legal/dsfa/latest').resolve(),release)
   snapshot={str(p.relative_to(release)):p.read_bytes() for p in release.rglob('*') if p.is_file()}
   with self.assertRaises(ValueError):publish(root,dest,'5',[])
   self.assertEqual(snapshot,{str(p.relative_to(release)):p.read_bytes() for p in release.rglob('*') if p.is_file()})
 def test_release_version_cannot_be_invented(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder)/'source';root.mkdir();self.fixture(root);dest=Path(folder)/'host'
   with self.assertRaises(ValueError):publish(root,dest,'999',['current'])
   self.assertFalse(dest.exists())
 def test_readiness_and_coverage_refuse_before_install(self):
  for change in [lambda m:m.update(missingAnnexes=['A2']),lambda m:m.update(sourceWarnings=['unverified']),lambda m:m.update(operatorFieldsConfirmed=False),lambda m:m.update(unconfirmedOperatorFields=['controller']),lambda m:m.update(annexReadiness={}),lambda m:m['chapters'].pop(),lambda m:m['chapters'].append(copy.deepcopy(m['chapters'][0]))]:
   with tempfile.TemporaryDirectory() as folder:
    root=Path(folder)/'source';root.mkdir();m=self.fixture(root);change(m);self.write(root,m);dest=Path(folder)/'host'
    with self.assertRaises(ValueError):publish(root,dest,'5',['current'])
    self.assertFalse(dest.exists())
 def test_missing_or_wrong_approval_refuse(self):
  for mutation in [lambda a:a.pop('legal'),lambda a:a['legal'].update(sourceManifestHash='wrong'),lambda a:a['legal'].update(releaseVersion='999')]:
   with tempfile.TemporaryDirectory() as folder:
    root=Path(folder)/'source';root.mkdir();self.fixture(root);a=json.loads((root/'approvals.json').read_text());mutation(a);(root/'approvals.json').write_text(json.dumps(a));dest=Path(folder)/'host'
    with self.assertRaises(ValueError):publish(root,dest,'5',['latest'])
    self.assertFalse(dest.exists())
 def test_real_draft_is_blocked_and_historic_activation_file_preserved(self):
  real=Path(__file__).resolve().parents[1]/'oriso-platform/dsfa-text/drafts/2026-09-30-v5-draft'
  with tempfile.TemporaryDirectory() as folder:
   destination=Path(folder)/'host'
   with self.assertRaises(ValueError):publish(real,destination,'5',['current'])
   self.assertFalse(destination.exists())
   source=Path(folder)/'source';source.mkdir();self.fixture(source);base=destination/'legal/dsfa';base.mkdir(parents=True);(base/'current').write_bytes(b'historic current page')
   with self.assertRaises(ValueError):publish(source,destination,'5',['current'])
   self.assertEqual((base/'current').read_bytes(),b'historic current page');self.assertFalse((base/'versions/5').exists())
class ReadbackTests(unittest.TestCase):
 def test_local_server_exact_bytes_stale_200_mismatch_redirect(self):
  import threading,http.server,functools
  from legal_publication import verify_live,_http_test_transport
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);files={'de/index.html':b'<html>release 5 DE</html>','en/index.html':b'<html>release 5 EN</html>','de/dsfa.pdf':b'%PDF-DE','en/dsfa.pdf':b'%PDF-EN'}
   release=root/'legal/dsfa/versions/5';release.mkdir(parents=True)
   for name,data in files.items():path=release/name;path.parent.mkdir(exist_ok=True);path.write_bytes(data)
   expected=root/'expected.json';expected.write_text(json.dumps({'releaseVersion':'5','locales':['de','en'],'artifacts':{n:{'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest()} for n,v in files.items()}}));(release/'manifest.json').write_bytes(expected.read_bytes())
   class Handler(http.server.SimpleHTTPRequestHandler):
    redirect=False
    def log_message(self,*args):pass
    def do_GET(self):
     if self.redirect:self.send_response(302);self.send_header('Location','/legal/dsfa/versions/5/manifest.json');self.end_headers();return
     super().do_GET()
   server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=folder));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();url=f'http://127.0.0.1:{server.server_port}/legal/dsfa/versions/5/'
   try:
    self.assertEqual(verify_live(expected,url,_transport=_http_test_transport)['verifiedArtifacts'],4)
    (release/'de/index.html').write_bytes(b'stale 200')
    with self.assertRaises(ValueError):verify_live(expected,url,_transport=_http_test_transport)
    (release/'de/index.html').write_bytes(files['de/index.html']);(release/'manifest.json').write_bytes(b'{}')
    with self.assertRaises(ValueError):verify_live(expected,url,_transport=_http_test_transport)
    (release/'manifest.json').write_bytes(expected.read_bytes());Handler.redirect=True
    with self.assertRaises(ValueError):verify_live(expected,url,_transport=_http_test_transport)
   finally:server.shutdown();server.server_close();thread.join()
 def test_total_readback_deadline_is_bounded(self):
  from legal_publication import verify_live
  from unittest.mock import patch
  with tempfile.TemporaryDirectory() as folder:
   path=Path(folder)/'manifest.json';path.write_text(json.dumps({'releaseVersion':'5','locales':['de','en'],'artifacts':{name:{'bytes':1,'sha256':hashlib.sha256(b'x').hexdigest()} for name in ['de/index.html','en/index.html','de/dsfa.pdf','en/dsfa.pdf']}}))
   with patch('time.monotonic',side_effect=[0,31]):
    with self.assertRaisesRegex(ValueError,'30-second budget'):verify_live(path,'https://example.org/legal/dsfa/versions/5/',_transport=lambda *args:self.fail('No request after deadline'))
 def test_real_cli_requires_https_and_manifest_version_path(self):
  from legal_publication import verify_live
  with tempfile.TemporaryDirectory() as folder:
   path=Path(folder)/'manifest.json';path.write_text(json.dumps({'releaseVersion':'5','locales':['de','en'],'artifacts':{}}))
   for url in ['http://localhost/legal/dsfa/versions/5/','https://example.org/legal/dsfa/versions/999/','https://example.org/legal/dsfa/versions/5/?token=x']:
    with self.assertRaises(ValueError):verify_live(path,url)
   import subprocess,sys
   result=subprocess.run([sys.executable,str(Path(__file__).parent/'legal_publication.py'),'--verify-live','--expected-manifest',str(path),'--base-url','http://localhost/legal/dsfa/versions/5/'],capture_output=True,text=True)
   self.assertNotEqual(result.returncode,0);self.assertIn('HTTPS',result.stderr)

if __name__=='__main__':unittest.main()
