import hashlib,json,tempfile,unittest
from pathlib import Path
from pypdf import PdfReader
import public_operator_snapshot as op
from dsfa_draft import build_input,html_input,pdf_input
import test_legal_publication as legal_tests
from legal_publication import ready_inputs,publish

class OperatorRenderingTests(unittest.TestCase):
 def fixture(self,root):return legal_tests.PublicationTests().fixture(root)
 def test_unconfirmed_source_same_snapshot_de_en_html_pdf(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);manifest=self.fixture(root)
   snapshot=op.capture(json.dumps({'operator':{'legalName':'SYNTHETIC_UNCONFIRMED_OPERATOR'}}).encode(),operator_id='synthetic',origin='https://operator.example.invalid',source_date='2026-10-01T10:00:00Z',source_sha=op.SOURCE_SHA)
   (root/'operator.json').write_text(json.dumps(snapshot));manifest.update(operatorFieldsConfirmed=False,operatorSnapshot={'path':'operator.json','snapshotHash':snapshot['snapshotHash']})
   for locale in ['de','en']:
    data=build_input(root,manifest,locale);self.assertEqual(data['operatorSnapshot'],snapshot)
    html=html_input(data);pdf=root/(locale+'.pdf');pdf_input(data,pdf);text=' '.join(page.extract_text() for page in PdfReader(pdf).pages)
    for artifact in [html,text]:self.assertIn(snapshot['snapshotHash'],artifact);self.assertNotIn('SYNTHETIC_UNCONFIRMED_OPERATOR',artifact)
    self.assertNotIn('fetch(',html)
 def test_unavailable_default_is_visible_without_invented_facts(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);manifest=self.fixture(root);manifest.pop('operatorSnapshot',None);manifest['operatorFieldsConfirmed']=False
   data=build_input(root,manifest,'en');self.assertEqual(data['operatorSnapshot']['status'],'unavailable');self.assertIn('Unavailable',html_input(data))
 def test_exact_operator_binding_tampered_or_missing_fails_before_release(self):
  for mutation in [lambda m:m.pop('operatorSnapshot'),lambda m:m['operatorSnapshot'].update(snapshotHash='b'*64),lambda m:m['operatorSnapshot'].update(path='../private.json')]:
   with tempfile.TemporaryDirectory() as folder:
    root=Path(folder)/'source';root.mkdir();manifest=self.fixture(root);mutation(manifest);legal_tests.PublicationTests().write(root,manifest)
    dest=Path(folder)/'output'
    with self.assertRaises(ValueError):publish(root,dest,'5')
    self.assertFalse(dest.exists())
 def test_previous_approval_cannot_authorize_new_snapshot(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);manifest=self.fixture(root);snapshot=op.load(root/'operator.json');snapshot['payload']['operator']['legalName']='DIFFERENT_SYNTHETIC_OPERATOR';snapshot['payloadHash']=op.digest(op.canonical(snapshot['payload']));op.seal(snapshot);(root/'operator.json').write_text(json.dumps(snapshot))
   with self.assertRaises(ValueError):ready_inputs(root)
 def test_confirmed_source_logo_is_present_in_html_and_pdf(self):
  import base64
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);manifest=self.fixture(root);snapshot=op.load(root/'operator.json')
   png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
   snapshot['payload']['branding']={'theming':{'logo':png}}
   snapshot['payloadHash']=op.digest(op.canonical(snapshot['payload']));op.seal(snapshot);(root/'operator.json').write_text(json.dumps(snapshot));manifest['operatorSnapshot']['snapshotHash']=snapshot['snapshotHash']
   data=build_input(root,manifest,'en');self.assertIn('data:image/png;base64,'+png,html_input(data))
   pdf=root/'logo.pdf';pdf_input(data,pdf)
   images=sum(len(page.images) for page in PdfReader(pdf).pages)
   self.assertGreater(images,0)
 def test_malformed_snapshot_cli_fails_before_output_directory_creation(self):
  import subprocess,sys
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder)/'source';root.mkdir();manifest=self.fixture(root)
   (root/'operator.json').write_text('{"secret":"SECRET_SENTINEL"}')
   destination=Path(folder)/'output'
   result=subprocess.run([sys.executable,str(Path(__file__).with_name('dsfa_draft.py')),str(root),'--output',str(destination)],capture_output=True,text=True)
   self.assertNotEqual(result.returncode,0);self.assertFalse(destination.exists());self.assertNotIn('SECRET_SENTINEL',result.stdout+result.stderr)
