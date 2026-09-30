import unittest
from pathlib import Path
import tempfile,json,hashlib
from dsfa_draft import sanitize,validate,build_input
class DraftTests(unittest.TestCase):
 def test_hidden_internal_notes_removed_from_dom(self):
  self.assertEqual(sanitize('<p>Public</p><div class="internal-note" style="display:none">SECRET NOTE<div>nested</div></div><script>token="internal"</script><!--private-->'),'<p>Public</p>')
 def test_locale_and_hash_gate(self):
  with tempfile.TemporaryDirectory() as path:
   root=Path(path);(root/'de').mkdir();(root/'en').mkdir()
   for locale in ['de','en']:(root/locale/'1.md').write_text('Draft')
   manifest={'version':'v5-draft','date':'2026-09-30','locales':['de','en'],'approval':{'technical':'pending','operator':'pending','legal':'pending'},'chapters':[{'id':ident,'de':'de/1.md','en':'en/1.md','hashes':{'de':hashlib.sha256(b'Draft').hexdigest(),'en':hashlib.sha256(b'Draft').hexdigest()}} for ident in [str(i) for i in range(1,11)]+['A1','A']]}
   validate(root,manifest)
   self.assertEqual(build_input(root,manifest,'de')['version'],build_input(root,manifest,'en')['version'])
   self.assertEqual(build_input(root,manifest,'de')['markdown'],build_input(root,manifest,'en')['markdown'])
   (root/'en/1.md').write_text('changed')
   with self.assertRaises(ValueError):validate(root,manifest)
 def test_missing_locale_refuses_render(self):
  with self.assertRaises(ValueError):validate(Path('.'),{'locales':['de']})

class RealDraftTests(unittest.TestCase):
 def setUp(self):
  self.root=Path(__file__).resolve().parents[1]/'oriso-platform/dsfa-text/drafts/2026-09-30-v5-draft'
  self.manifest=json.loads((self.root/'manifest.json').read_text())
 def test_full_chapter_pairs_identifiers_and_links(self):
  import re
  self.assertEqual([c['id'] for c in self.manifest['chapters']],['1','2','3','4','5','6','7','8','9','10','A1','A'])
  validate(self.root,self.manifest)
  for chapter in self.manifest['chapters']:
   de=(self.root/chapter['de']).read_text();en=(self.root/chapter['en']).read_text()
   self.assertEqual(len(re.findall(r'^#+ ',de,re.M)),len(re.findall(r'^#+ ',en,re.M)))
   self.assertEqual(re.findall(r'`([^`]+)`',de),re.findall(r'`([^`]+)`',en))
   self.assertEqual(re.findall(r'\]\(([^)]+)\)',de),re.findall(r'\]\(([^)]+)\)',en))
 def test_approval_cannot_be_invented(self):
  self.manifest['approval']['legal']='approved'
  with self.assertRaises(ValueError):validate(self.root,self.manifest)
 def test_translation_binding_rejects_stale_source(self):
  self.manifest['chapters'][0]['translationSourceHash']='stale'
  with self.assertRaises(ValueError):validate(self.root,self.manifest)
 def test_public_html_and_inputs_have_same_version(self):
  from dsfa_draft import html_input
  for locale in ['de','en']:
   data=build_input(self.root,self.manifest,locale);html=html_input(data)
   self.assertIn('v5-draft',html);self.assertIn('2026-09-30',html)
   self.assertIn(f'<html lang="{locale}">',html)
   for c in self.manifest['chapters']:self.assertIn(f'id="kap{c["id"]}"',html)
   self.assertNotIn('<script',html);self.assertNotIn('internal-note',html)
 def test_hidden_css_notes_removed_not_only_hidden(self):
  self.assertEqual(sanitize('<p>public</p><aside style="display: none">private</aside><div hidden>private</div>'),'<p>public</p>')
 def test_void_tags_inside_hidden_notes_stay_suppressed(self):
  self.assertEqual(sanitize('<div class="internal-note">private<br/>still private<img src="bad"/></div><p>public</p>'),'<p>public</p>')
 def test_active_markup_and_unlisted_attributes_removed(self):
  value='<p>public</p><img src="https://docs.oriso.org/image.png" srcset="https://external.example/a 2x"><svg><a xlink:href="javascript:alert(1)">evil</a></svg><meta http-equiv="refresh" content="0;url=https://external.example"><form action="https://external.example"><input>evil</form><p>end</p>'
  clean=sanitize(value)
  self.assertEqual(clean,'<p>public</p><img src="https://docs.oriso.org/image.png"><p>end</p>')
 def test_private_or_token_links_rejected(self):
  for url in ['https://github.com/OpenResilienceInitiative/ORISO-Infra/a','https://docs.oriso.org/?token=abc','https://docs.oriso.org/?%74oken=SYNTHETIC','https://github.com/OpenResilienceInitiative/%4FRISO-Infra/a','https://docs.oriso.org/?%2574oken=SYNTHETIC','/private/a']:
   with self.assertRaises(ValueError):sanitize(f'<a href="{url}">source</a>')

class RenderArtifactTests(unittest.TestCase):
 def test_pdf_html_manifest_and_full_public_text(self):
  from html.parser import HTMLParser
  from dsfa_draft import public_body,digest
  from pypdf import PdfReader
  import re
  root=Path(__file__).resolve().parents[1]/'oriso-platform/dsfa-text/drafts/2026-09-30-v5-draft'
  manifest=json.loads((root/'manifest.json').read_text());artifact=root/'artifacts'
  generated=json.loads((artifact/'artifact-manifest.json').read_text())
  self.assertEqual(generated['version'],manifest['version']);self.assertEqual(generated['date'],manifest['date'])
  self.assertEqual(generated['approval'],manifest['approval']);self.assertEqual(generated['sourceManifestHash'],digest((root/'manifest.json').read_bytes()))
  class Blocks(HTMLParser):
   def __init__(self):super().__init__();self.current=[];self.blocks=[]
   def handle_starttag(self,tag,attrs):
    if tag in {'p','li','h2','h3','h4','td','th'}:self.current=[]
   def handle_endtag(self,tag):
    if tag in {'p','li','h2','h3','h4','td','th'}:
     if self.current:self.blocks.append(''.join(self.current))
     self.current=[]
   def handle_data(self,value):self.current.append(value)
  normal=lambda text:re.sub(r'\s+','',text).replace('\xad','')
  for locale in ['de','en']:
   data=build_input(root,manifest,locale);record=generated['locales'][locale]
   self.assertEqual(record['inputHash'],digest(data['markdown'].encode()))
   for filename,info in record['artifacts'].items():
    path=artifact/filename;self.assertEqual(info['bytes'],path.stat().st_size);self.assertEqual(info['sha256'],digest(path.read_bytes()))
   pdf=PdfReader(artifact/f'dsfa-v5-draft-{locale}.pdf');text=' '.join('\n'.join(page.extract_text().splitlines()[2:]) for page in pdf.pages)
   self.assertIn('v5-draft',pdf.metadata.title);self.assertIn('UNAPPROVED',text)
   parser=Blocks();parser.feed(public_body(data));normal_pdf=normal(text)
   for block in parser.blocks:self.assertTrue(normal(block) in normal_pdf,'Missing PDF block: '+block[:120])
 def test_pdf_strips_same_internal_notes_as_html(self):
  from dsfa_draft import pdf_input,html_input
  from pypdf import PdfReader
  data={'version':'v5-draft','locale':'en','date':'2026-09-30','markdown':'Public text.\n\n<div class="internal-note"><p>INTERNAL_SENTINEL</p></div>\n\n<script>SECRET_SENTINEL</script>'}
  self.assertNotIn('INTERNAL_SENTINEL',html_input(data))
  with tempfile.TemporaryDirectory() as folder:
   path=Path(folder)/'draft.pdf';pdf_input(data,path);text=' '.join(p.extract_text() for p in PdfReader(path).pages)
   self.assertIn('Public text.',text);self.assertNotIn('INTERNAL_SENTINEL',text);self.assertNotIn('SECRET_SENTINEL',text)

class ApprovalGateTests(unittest.TestCase):
 def setUp(self):
  self.root=Path(__file__).resolve().parents[1]/'oriso-platform/dsfa-text/drafts/2026-09-30-v5-draft'
 def test_defaults_pending_and_missing_gate_rejected(self):
  from dsfa_draft import validate_publication
  for records in [{},json.loads((self.root/'approvals.json').read_text())]:
   with self.assertRaises(ValueError):validate_publication(self.root,records)
 def test_three_records_bind_identical_exact_version_hash(self):
  from dsfa_draft import validate_publication,digest
  import copy
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'manifest.json').write_text('{"version":"v5-draft","releaseVersion":"5"}')
   # Synthetic fixture only: no real approval is written or inferred.
   records={owner:{'state':'approved','draftVersion':'v5-draft','releaseVersion':'5','sourceManifestHash':digest((root/'manifest.json').read_bytes()),'approver':'Synthetic Test Fixture','timestamp':'2026-09-30T12:00:00Z','evidence':'Synthetic unit-test evidence'} for owner in ['technical','operator','legal']}
   self.assertEqual(validate_publication(root,records)['draftVersion'],'v5-draft')
   for owner in records:
    for key,value in [('sourceManifestHash','other-hash'),('draftVersion','other-version'),('approver',None),('timestamp',None),('evidence',None),('state','pending')]:
     changed=copy.deepcopy(records);changed[owner][key]=value
     with self.assertRaises(ValueError):validate_publication(root,changed)
   (root/'manifest.json').write_text('{"version":"v5-draft","changed":true}')
   with self.assertRaises(ValueError):validate_publication(root,records)
 def test_historical_snapshot_bytes_immutable(self):
  from dsfa_draft import validate_historical,digest
  manifest=json.loads((self.root/'manifest.json').read_text())
  validate_historical(Path(__file__).resolve().parents[1],manifest['historicalSnapshotHashes'])
  with tempfile.TemporaryDirectory() as folder:
   repo=Path(folder);path=repo/'historic.html';path.write_bytes(b'historical release')
   snapshot={'historic.html':digest(path.read_bytes())};validate_historical(repo,snapshot)
   path.write_bytes(b'overwritten')
   with self.assertRaises(ValueError):validate_historical(repo,snapshot)
 def test_activation_public_latest_cli_fail_closed(self):
  import subprocess,sys
  tool=Path(__file__).resolve().parent/'dsfa_draft.py'
  with tempfile.TemporaryDirectory() as folder:
   for mode in ['--activate','--public','--latest','--check-publication-approval']:
    result=subprocess.run([sys.executable,str(tool),str(self.root),'--output',folder,mode],capture_output=True,text=True)
    self.assertNotEqual(result.returncode,0);self.assertIn('approval pending',result.stderr)
   self.assertEqual(list(Path(folder).iterdir()),[])

if __name__=='__main__':unittest.main()

class ApprovedLocaleNavigationTests(unittest.TestCase):
 def test_approved_locale_switch_preserves_chapter_hash(self):
  from dsfa_draft import html_input
  data={'version':'synthetic-draft','locale':'de','date':'2026-09-30','markdown':'<a id="kap10"></a>\n\nSynthetic test text.'}
  html=html_input(data,approved_version='5')
  self.assertIn('data-language-switch',html)
  self.assertIn('link.hash=window.location.hash',html)
  self.assertIn('href="../en/"',html)
  self.assertNotIn('data-language-switch',html_input(data))

 def test_source_date_cannot_inject_active_header_content(self):
  from dsfa_draft import validate,html_input
  from pathlib import Path
  import copy,json
  root=Path(__file__).resolve().parents[1]/'oriso-platform/dsfa-text/drafts/2026-09-30-v5-draft'
  manifest=json.loads((root/'manifest.json').read_text());manifest['date']='<script>unsafe</script>'
  with self.assertRaises(ValueError):validate(root,manifest)
  html=html_input({'version':'<script>unsafe</script>','locale':'de','date':'<img src=x>','markdown':'Synthetic.'})
  self.assertNotIn('<script>',html);self.assertNotIn('<img src=x>',html)
