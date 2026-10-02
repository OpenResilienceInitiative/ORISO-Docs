import copy,json,tempfile,unittest
from pathlib import Path
import public_operator_snapshot as op

class SnapshotTests(unittest.TestCase):
 def source(self,payload=None):
  payload=payload if payload is not None else {'operator':{'legalName':'Synthetic operator','address':'Synthetic address','contactEmail':'public@example.invalid'},'branding':{'tenantName':'Different synthetic brand','theming':{'primaryColor':'#123456'}},'keyFigures':{'tenants':{'count':0,'asOfDate':'2026-10-01'}}}
  return op.capture(json.dumps(payload).encode(),operator_id='synthetic-test',origin='https://operator.example.invalid',source_date='2026-10-01T10:00:00Z',source_sha=op.SOURCE_SHA)
 def test_roundtrip_and_explicit_missing_no_brand_identity(self):
  snapshot=self.source();self.assertEqual(op.validate(snapshot),snapshot)
  self.assertEqual(snapshot['status'],'partial');self.assertFalse(snapshot['operatorFieldsConfirmed'])
  self.assertEqual(snapshot['payload']['operator']['legalName'],'Synthetic operator')
  missing=self.source({'branding':{'tenantName':'Synthetic brand'}})
  self.assertNotIn('operator',missing['payload']);self.assertIn('operator.legalName',missing['missingFields'])
  text=op.render_html(snapshot,'en');self.assertNotIn('Synthetic operator',text);self.assertNotIn('Different synthetic brand',text)
  self.assertIn('Unconfirmed',text);self.assertNotIn('Caritas',text);self.assertNotIn('KDG',text)
 def test_unavailable_no_invented_date_count_or_origin(self):
  snapshot=op.unavailable();self.assertEqual(op.validate(snapshot),snapshot)
  self.assertIsNone(snapshot['sourceDate']);self.assertIsNone(snapshot['payloadHash']);self.assertIsNone(snapshot['operatorId'])
  self.assertIn('Unavailable',op.render_html(snapshot,'en'))
  self.assertIsNone(op.lookup(snapshot['payload'],'keyFigures.tenants.count'))
 def test_unknown_secret_malformed_fail_closed_without_value_in_error(self):
  for payload in [{'operator':{'password':'SECRET_SENTINEL'}},{'smtp':{'password':'SECRET_SENTINEL'}},{'keyFigures':{'tenants':{'count':True}}},{'keyFigures':{'tenants':{'count':-1}}},{'document':{'documentDate':'bad'}},{'supervisoryAuthority':{'legalFramework':'invented'}},{'operator':{'legalName':'Bearer SECRET_SENTINEL'}},{'branding':{'theming':{'logo':'javascript:alert(1)'}}}]:
   with self.subTest(payload=payload):
    with self.assertRaises(ValueError) as error:self.source(payload)
    self.assertNotIn('SECRET_SENTINEL',str(error.exception))
  with self.assertRaises(ValueError):op.capture(b'{broken',operator_id='x',origin='https://example.invalid',source_date='2026-10-01T10:00:00Z',source_sha=op.SOURCE_SHA)
 def test_metadata_hash_tampering_and_duplicates_rejected(self):
  snapshot=self.source()
  for key,value in [('operatorId','other'),('origin','https://other.invalid'),('sourceDate','2025-01-01T00:00:00Z'),('schemaHash','b'*64),('sourceSHA','b'*40)]:
   changed=copy.deepcopy(snapshot);changed[key]=value
   with self.assertRaises(ValueError):op.validate(changed)
  with self.assertRaises(ValueError):op.capture(b'{"operator":{},"operator":{}}',operator_id='x',origin='https://example.invalid',source_date='2026-10-01T10:00:00Z',source_sha=op.SOURCE_SHA)
 def test_fallback_explicit_same_operator_origin_keeps_original_evidence(self):
  original=self.source();fallback=op.fallback(original,operator_id=original['operatorId'],origin=original['origin'])
  self.assertEqual(fallback['status'],'fallback');self.assertEqual(fallback['sourceDate'],original['sourceDate']);self.assertEqual(fallback['sourceHash'],original['sourceHash']);self.assertEqual(fallback['payloadHash'],original['payloadHash'])
  for args in [{'operator_id':'other','origin':original['origin']},{'operator_id':original['operatorId'],'origin':'https://other.invalid'},{'operator_id':original['operatorId'],'origin':original['origin'],'current_payload':{'operator':{'legalName':'Changed synthetic operator'}}}]:
   with self.assertRaises(ValueError):op.fallback(original,**args)
 def test_translation_facts_html_markdown_exact_hash_confirmation(self):
  snapshot=self.source();expected=snapshot['snapshotHash']
  for locale in ['de','en']:
   text=op.render_html(snapshot,locale,confirmed_hash=expected)
   self.assertIn('Synthetic operator',text);self.assertIn(expected,text)
   self.assertIn('Synthetic operator',op.render_markdown(snapshot,locale,confirmed_hash=expected))
   self.assertNotIn('<script',text);self.assertNotIn('fetch(',text)
   with self.assertRaises(ValueError):op.render_html(snapshot,locale,confirmed_hash='b'*64)
 def test_key_figures_zero_differs_from_missing_and_translations_preserve_facts(self):
  snapshot=self.source();confirmed=snapshot['snapshotHash']
  for locale in ['de','en']:
   text=op.render_html(snapshot,locale,confirmed_hash=confirmed)
   self.assertIn('<dd>0</dd>',text);self.assertIn('<dd>2026-10-01</dd>',text)
   self.assertIn('Different synthetic brand',text)
   self.assertIn('Registered clients' if locale=='en' else 'Registrierte Ratsuchende',text)
   self.assertIn('Missing' if locale=='en' else 'Fehlt',text)
  absent=self.source({'operator':{'legalName':'Synthetic operator'}})
  for locale in ['de','en']:self.assertNotIn('<dd>0</dd>',op.render_html(absent,locale,confirmed_hash=absent['snapshotHash']))
 def test_raster_logo_only_appearance_not_identity(self):
  import base64
  payload={'branding':{'tenantName':'Different brand','theming':{'logo':base64.b64encode(b'\x89PNG\r\n\x1a\nsynthetic').decode()}}}
  snapshot=self.source(payload);text=op.render_html(snapshot,'en')
  self.assertIn('data:image/png;base64,',text);self.assertIn('Appearance',text)
  self.assertNotIn('<dd>Different brand</dd>',text);self.assertIn('Legal name</dt><dd>Missing',text)
 def test_explicit_human_confirmation_binds_identity_origin_name_hash(self):
  snapshot=self.source();record={'state':'approved','scope':'operator-only','snapshotHash':snapshot['snapshotHash'],'operatorId':snapshot['operatorId'],'origin':snapshot['origin'],'legalName':snapshot['payload']['operator']['legalName'],'confirmedBy':'Synthetic reviewer','confirmedAt':'2026-10-01T11:00:00Z'}
  self.assertEqual(op.confirmation_hash(snapshot,record),snapshot['snapshotHash'])
  for key,value in [('scope','legal'),('state','pending'),('snapshotHash','b'*64),('operatorId','other'),('origin','https://other.invalid'),('legalName','Other operator'),('confirmedAt','2026-10-01')]:
   changed=copy.deepcopy(record);changed[key]=value
   with self.assertRaises(ValueError):op.confirmation_hash(snapshot,changed)
  record['secret']='SECRET_SENTINEL'
  with self.assertRaises(ValueError):op.confirmation_hash(snapshot,record)
 def test_loaded_snapshot_rejects_unknown_envelope_private_provenance(self):
  snapshot=self.source();snapshot['internalNote']='SECRET_SENTINEL'
  with self.assertRaises(ValueError):op.validate(snapshot)
  for origin in ['https://user:password@example.invalid','https://example.invalid/?token=SECRET_SENTINEL','file:///tmp/private','https://example.invalid/path']:
   with self.assertRaises(ValueError):op.capture(b'{}',operator_id='x',origin=origin,source_date='2026-10-01T10:00:00Z',source_sha=op.SOURCE_SHA)
if __name__=='__main__':unittest.main()
