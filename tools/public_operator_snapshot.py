#!/usr/bin/env python3
"""Build-time public DPIA source contract; no network, inference or approval creation.

Canonical source: TenantService eea5db1 api/tenantservice.yaml, public no-auth
GET /tenant/public/dpia. Branding is resolved tenant appearance, not operator identity.
The same reviewed file is vendored byte-for-byte into the legal draft branch.
"""
import argparse,base64,copy,hashlib,json,re
from datetime import date,datetime
from html import escape
from pathlib import Path
from urllib.parse import urlsplit

SOURCE_SHA='eea5db184ebaddf80dab16e8f045af8c359c10e1'
SCHEMA_HASH='c5b5bc9264f0ae6218beadebd5d849cec6019337425cd535296e22e497db290f'
SCHEMA_VERSION='oriso.public-operator-snapshot/v1'
STRINGS={'legalName':255,'shortName':255,'address':512,'contactEmail':255,'contactPhone':64,'dpoName':255,'department':255,'responsiblePerson':255}
SCHEMA={'operator':STRINGS,'supervisoryAuthority':{'legalFramework':'framework','name':255,'address':512,'email':255},'document':{'documentDate':'date','nextReviewDate':'date'},'keyFigures':{key:{'count':'count','asOfDate':'date'} for key in ['tenants','counsellingCentres','activeCounsellors','registeredClients']},'branding':{'tenantName':512,'theming':{**{key:'asset' for key in ['logo','associationLogo','favicon']},**{key:'color' for key in ['primaryColor','accent','secondaryColor','signal']},'loginEffect':'effect'}}}
# Appearance is optional, and never determines legal completeness or identity.
def paths(schema,prefix=''):
 return [prefix+key for key,value in schema.items() if not isinstance(value,dict)]+[p for key,value in schema.items() if isinstance(value,dict) for p in paths(value,prefix+key+'.')]
REQUIRED=sorted(paths({key:value for key,value in SCHEMA.items() if key!='branding'}))
ENVELOPE={'schemaVersion','schemaHash','sourceSHA','operatorId','origin','endpoint','sourceDate','sourceHash','payloadHash','snapshotHash','status','operatorFieldsConfirmed','missingFields','payload','fallbackOf'}
def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def digest(value):return hashlib.sha256(value).hexdigest()
def fail(path):raise ValueError('Invalid public operator field: '+path)
def object_pairs(pairs):
 result={}
 for key,value in pairs:
  if key in result:fail('duplicate JSON key')
  result[key]=value
 return result
def read_json(raw):
 if len(raw)>2*1024*1024:fail('payload size')
 try:return json.loads(raw,object_pairs_hook=object_pairs)
 except (json.JSONDecodeError,UnicodeDecodeError):fail('JSON')
def origin_value(value):
 if not isinstance(value,str):fail('origin')
 try:p=urlsplit(value);port=p.port
 except ValueError:fail('origin')
 if not p.hostname or p.username or p.password or p.query or p.fragment or p.path not in ('','/') or p.scheme not in {'https','http'}:fail('origin')
 if p.scheme=='http' and p.hostname not in {'localhost','127.0.0.1','::1'}:fail('origin')
 # Canonical means no path, lower-case host and no implicit default port spelling.
 host='['+p.hostname+']' if ':' in p.hostname else p.hostname
 result=p.scheme+'://'+host+((':'+str(port)) if port and port!={'https':443,'http':80}[p.scheme] else '')
 if value.rstrip('/')!=result:fail('canonical origin')
 return result
def identity(value):
 if not isinstance(value,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,95}',value):fail('operatorId')
 return value
def timestamp(value):
 if not isinstance(value,str):fail('sourceDate')
 try:dt=datetime.fromisoformat(value.replace('Z','+00:00'))
 except ValueError:fail('sourceDate')
 if dt.tzinfo is None:fail('sourceDate timezone')
 return value
def clean_payload(value,schema=SCHEMA,prefix=''):
 if not isinstance(value,dict):fail(prefix or 'payload')
 if set(value)-set(schema):fail(prefix+'unknown fields')
 result={}
 for key,item in value.items():
  path=prefix+key;rule=schema[key]
  if item is None:continue
  if isinstance(rule,dict):result[key]=clean_payload(item,rule,path+'.');continue
  if rule=='count':
   if type(item) is not int or not 0<=item<=9223372036854775807:fail(path)
  else:
   if not isinstance(item,str):fail(path)
   if not item.strip():continue
   if re.search(r'(?i)\b(?:bearer\s|password\s*[:=]|secret\s*[:=]|token\s*[:=])|-----BEGIN|eyJ[a-zA-Z0-9_-]+\.eyJ',item) or any(ord(c)<32 and c not in '\n\t' for c in item):fail(path)
   if type(rule) is int and len(item)>rule:fail(path)
   if rule=='date':
    if not re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}',item):fail(path)
    try:date.fromisoformat(item)
    except ValueError:fail(path)
   if rule=='framework' and item not in {'KDG','GDPR'}:fail(path)
   if rule=='effect' and item not in {'NONE','LINES','CONNECTED_DOTS','CRACKS'}:fail(path)
   if rule=='color' and not re.fullmatch(r'#[0-9a-fA-F]{6}',item):fail(path)
   if rule=='asset':
    # No remote fetch or active SVG: only bounded inert raster base64 values.
    encoded=item.split(',',1)[-1] if item.startswith(('data:image/png;base64,','data:image/jpeg;base64,','data:image/gif;base64,','data:image/x-icon;base64,')) else item
    try:decoded=base64.b64decode(encoded,validate=True)
    except (ValueError,base64.binascii.Error):fail(path)
    if not decoded.startswith((b'\x89PNG\r\n\x1a\n',b'\xff\xd8\xff',b'GIF87a',b'GIF89a',b'\x00\x00\x01\x00')) or len(decoded)>1024*1024:fail(path)
  result[key]=item
 return result
def lookup(payload,path):
 for key in path.split('.'):
  if not isinstance(payload,dict) or key not in payload:return None
  payload=payload[key]
 return payload
def seal(snapshot):
 snapshot['snapshotHash']=digest(canonical({k:v for k,v in snapshot.items() if k!='snapshotHash'}));return snapshot
def unavailable(operator_id=None,origin=None):
 return seal(dict(schemaVersion=SCHEMA_VERSION,schemaHash=SCHEMA_HASH,sourceSHA=None,operatorId=identity(operator_id) if operator_id else None,origin=origin_value(origin) if origin else None,endpoint='/tenant/public/dpia',sourceDate=None,sourceHash=None,payloadHash=None,status='unavailable',operatorFieldsConfirmed=False,missingFields=REQUIRED,payload={},fallbackOf=None))
def capture(raw,*,operator_id,origin,source_date,source_sha):
 if source_sha!=SOURCE_SHA:fail('sourceSHA differs from pinned API schema revision')
 payload=clean_payload(read_json(raw));missing=[p for p in REQUIRED if lookup(payload,p) is None]
 return seal(dict(schemaVersion=SCHEMA_VERSION,schemaHash=SCHEMA_HASH,sourceSHA=source_sha,operatorId=identity(operator_id),origin=origin_value(origin),endpoint='/tenant/public/dpia',sourceDate=timestamp(source_date),sourceHash=digest(raw),payloadHash=digest(canonical(payload)),status='partial' if missing else 'available',operatorFieldsConfirmed=False,missingFields=missing,payload=payload,fallbackOf=None))
def validate(snapshot):
 if not isinstance(snapshot,dict) or set(snapshot)!=ENVELOPE:fail('snapshot envelope')
 if snapshot['schemaVersion']!=SCHEMA_VERSION or snapshot['schemaHash']!=SCHEMA_HASH or snapshot['endpoint']!='/tenant/public/dpia' or snapshot['operatorFieldsConfirmed'] is not False:fail('snapshot contract or manufactured confirmation')
 if snapshot['snapshotHash']!=digest(canonical({k:v for k,v in snapshot.items() if k!='snapshotHash'})):fail('snapshotHash')
 if snapshot['status']=='unavailable':
  if snapshot!=unavailable(snapshot['operatorId'],snapshot['origin']):fail('unavailable evidence')
 else:
  identity(snapshot['operatorId']);origin_value(snapshot['origin']);timestamp(snapshot['sourceDate'])
  if snapshot['sourceSHA']!=SOURCE_SHA or not isinstance(snapshot['sourceHash'],str) or not re.fullmatch('[0-9a-f]{64}',snapshot['sourceHash']):fail('source provenance')
  payload=clean_payload(snapshot['payload']);missing=[p for p in REQUIRED if lookup(payload,p) is None]
  if payload!=snapshot['payload'] or snapshot['payloadHash']!=digest(canonical(payload)) or snapshot['missingFields']!=missing:fail('payloadHash or missingFields')
  if snapshot['status']=='fallback':
   previous=copy.deepcopy(snapshot);previous['status']='partial' if missing else 'available';previous['fallbackOf']=None;seal(previous)
   if snapshot['fallbackOf']!=previous['snapshotHash']:fail('fallback provenance')
  elif snapshot['status']!=('partial' if missing else 'available') or snapshot['fallbackOf'] is not None:fail('status')
 return snapshot
def fallback(previous,*,operator_id,origin,current_payload=None):
 validate(previous)
 if previous['status'] not in {'available','partial'} or previous['operatorId']!=identity(operator_id) or previous['origin']!=origin_value(origin):fail('fallback identity/origin')
 if not lookup(previous['payload'],'operator.legalName'):fail('fallback missing operator identity')
 if current_payload is not None:
  current=clean_payload(current_payload);name=lookup(current,'operator.legalName')
  if name is not None and name!=lookup(previous['payload'],'operator.legalName'):fail('fallback operator legalName')
 result=copy.deepcopy(previous);result['status']='fallback';result['fallbackOf']=previous['snapshotHash'];return seal(result)
def load(path):return validate(read_json(Path(path).read_bytes()))
def bound_snapshot(root,manifest):
 binding=manifest.get('operatorSnapshot')
 if binding is None:
  if manifest.get('operatorFieldsConfirmed') is True:fail('confirmed operator requires snapshot binding')
  return unavailable()
 if not isinstance(binding,dict) or set(binding)!={'path','snapshotHash'} or not isinstance(binding['path'],str):fail('operator snapshot binding')
 path=(Path(root)/binding['path']).resolve()
 if not path.is_relative_to(Path(root).resolve()) or not path.is_file() or (Path(root)/binding['path']).is_symlink():fail('operator snapshot path')
 snapshot=load(path)
 if snapshot['snapshotHash']!=binding['snapshotHash']:fail('operator snapshot binding hash')
 if manifest.get('operatorFieldsConfirmed') is True and (snapshot['status'] in {'unavailable','fallback'} or not lookup(snapshot['payload'],'operator.legalName')):fail('confirmed operator source missing identity')
 return snapshot

def confirmation_hash(snapshot,record):
 validate(snapshot)
 keys={'state','scope','snapshotHash','operatorId','origin','legalName','confirmedBy','confirmedAt'}
 if not isinstance(record,dict) or set(record)!=keys or record['state']!='approved' or record['scope']!='operator-only':fail('operator confirmation contract')
 for key,expected in [('snapshotHash',snapshot['snapshotHash']),('operatorId',snapshot['operatorId']),('origin',snapshot['origin']),('legalName',lookup(snapshot['payload'],'operator.legalName'))]:
  if not expected or record[key]!=expected:fail('operator confirmation '+key)
 if snapshot['status'] in {'unavailable','fallback'}:fail('operator confirmation source')
 clean_payload({'operator':{'responsiblePerson':record['confirmedBy']}})
 if not isinstance(record['confirmedBy'],str) or not record['confirmedBy'].strip():fail('confirmedBy')
 timestamp(record['confirmedAt'])
 return snapshot['snapshotHash']

def rows(snapshot,locale,confirmed_hash=None):
 validate(snapshot)
 if locale not in {'de','en'}:fail('locale')
 if confirmed_hash is not None and confirmed_hash!=snapshot['snapshotHash']:fail('confirmation snapshotHash')
 if confirmed_hash and snapshot['status'] in {'unavailable','fallback'}:fail('confirmation unavailable/fallback')
 de=locale=='de';missing='Fehlt' if de else 'Missing';unconfirmed='Unbestätigt' if de else 'Unconfirmed'
 status={'available':('Verfügbar','Available'),'partial':('Unvollständig','Partial'),'unavailable':('Nicht verfügbar','Unavailable'),'fallback':('Expliziter vorheriger Stand','Explicit previous snapshot')}[snapshot['status']][not de]
 result=[('Betreiberdaten' if de else 'Operator data',status),('Bestätigung' if de else 'Confirmation',('Bestätigt' if de else 'Confirmed') if confirmed_hash else unconfirmed)]
 labels={
 'operator.legalName':('Rechtlicher Name','Legal name'),'operator.shortName':('Kurzname','Short name'),'operator.address':('Adresse','Address'),'operator.contactEmail':('Kontakt-E-Mail','Contact email'),'operator.contactPhone':('Kontakt-Telefon','Contact phone'),'operator.dpoName':('Datenschutzbeauftragte','Data protection officer'),'operator.department':('Verantwortliche Abteilung','Responsible department'),'operator.responsiblePerson':('Verantwortliche Person','Responsible person'),
 'supervisoryAuthority.legalFramework':('Rechtsrahmen','Legal framework'),'supervisoryAuthority.name':('Aufsichtsbehörde','Supervisory authority'),'supervisoryAuthority.address':('Adresse der Aufsichtsbehörde','Supervisory authority address'),'supervisoryAuthority.email':('E-Mail der Aufsichtsbehörde','Supervisory authority email'),
 'document.documentDate':('Dokumentstand','Document date'),'document.nextReviewDate':('Nächste Prüfung','Next review date'),'branding.tenantName':('Name des Erscheinungsbilds (keine Betreiberidentität)','Appearance name (not operator identity)')}
 for key,translated in labels.items():
  value=lookup(snapshot['payload'],key);result.append((translated[not de],str(value) if value is not None and confirmed_hash else unconfirmed if value is not None else missing))
 for key,name in FIGURES.items():
  for field,title in [('count',name[not de]),('asOfDate',('Stand: ' if de else 'As of: ')+name[not de])]:
   value=lookup(snapshot['payload'],'keyFigures.'+key+'.'+field)
   result.append((title,str(value) if value is not None and confirmed_hash else unconfirmed if value is not None else missing))
 result.extend([('Quellstand' if de else 'Source date',snapshot['sourceDate'] or missing),('Quellherkunft' if de else 'Source origin',snapshot['origin'] or missing),('Technischer Betreiber-Selektor' if de else 'Technical operator selector',snapshot['operatorId'] or missing),('Source SHA-256',snapshot['sourceHash'] or missing),('Snapshot SHA-256',snapshot['snapshotHash']),('Payload SHA-256',snapshot['payloadHash'] or missing),('Schema SHA-256',snapshot['schemaHash']),('Quellrevision' if de else 'Source revision',snapshot['sourceSHA'] or missing)])
 return result
FIGURES={'tenants':('Träger','Tenants'),'counsellingCentres':('Beratungsstellen','Counselling centres'),'activeCounsellors':('Aktive Beratende','Active counsellors'),'registeredClients':('Registrierte Ratsuchende','Registered clients')}
def appearance_html(snapshot,locale):
 logo=lookup(snapshot['payload'],'branding.theming.logo') or lookup(snapshot['payload'],'branding.theming.associationLogo')
 if not logo:return ''
 encoded=logo.split(',',1)[-1];decoded=base64.b64decode(encoded,validate=True)
 mime='image/png' if decoded.startswith(b'\x89PNG') else 'image/jpeg' if decoded.startswith(b'\xff\xd8') else 'image/gif' if decoded.startswith(b'GIF') else 'image/x-icon'
 label='Erscheinungsbild des aufgelösten Mandanten; keine Betreiberidentität' if locale=='de' else 'Appearance of the resolved tenant; not operator identity'
 return '<figure><img width="120" src="data:'+mime+';base64,'+encoded+'" alt="'+label+'"><figcaption>'+label+'</figcaption></figure>'
def render_html(snapshot,locale,confirmed_hash=None):
 values=rows(snapshot,locale,confirmed_hash);de=locale=='de'
 figure_labels={name[not de] for name in FIGURES.values()}|{('Stand: ' if de else 'As of: ')+name[not de] for name in FIGURES.values()}
 dl=lambda pairs:'<dl>'+''.join('<dt>'+escape(k)+'</dt><dd>'+escape(v)+'</dd>' for k,v in pairs)+'</dl>'
 details=dl([(key,value) for key,value in values if key not in figure_labels]);mapping=dict(values)
 tiles='<div class="operator-figures">'+''.join('<article class="operator-figure" data-key-figure="'+key+'">'+dl([(name[not de],mapping[name[not de]]),(('Stand: ' if de else 'As of: ')+name[not de],mapping[('Stand: ' if de else 'As of: ')+name[not de]])])+'</article>' for key,name in FIGURES.items())+'</div>'
 return '<section data-operator-snapshot="'+snapshot['snapshotHash']+'">'+appearance_html(snapshot,locale)+details+tiles+'</section>'
def render_markdown(snapshot,locale,confirmed_hash=None):
 # Escape all Markdown-active syntax; values are source facts, not executable markup.
 safe=lambda value:escape(value).replace('\\','\\\\').replace('|','&#124;').replace('\n',' ').replace('[','&#91;').replace(']','&#93;').replace('*','&#42;').replace('_','&#95;').replace('`','&#96;')
 return '\n\n'+('\n'.join('**'+safe(k)+'**: '+safe(v) for k,v in rows(snapshot,locale,confirmed_hash)))+'\n'
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--snapshot',type=Path);parser.add_argument('--raw',type=Path);parser.add_argument('--operator-id');parser.add_argument('--origin');parser.add_argument('--source-date');parser.add_argument('--source-sha');parser.add_argument('--locale',choices=['de','en']);parser.add_argument('--confirmation',type=Path);parser.add_argument('--html',action='store_true');parser.add_argument('--bundle',action='store_true');args=parser.parse_args()
 if args.snapshot and args.raw:parser.error('Choose snapshot or raw input')
 snapshot=load(args.snapshot) if args.snapshot else capture(args.raw.read_bytes(),operator_id=args.operator_id,origin=args.origin,source_date=args.source_date,source_sha=args.source_sha) if args.raw else unavailable(args.operator_id,args.origin)
 confirmed=confirmation_hash(snapshot,read_json(args.confirmation.read_bytes())) if args.confirmation else None
 print(json.dumps({'snapshot':snapshot,'operatorFieldsConfirmed':bool(confirmed),'html':{locale:render_html(snapshot,locale,confirmed) for locale in ['de','en']}},ensure_ascii=False) if args.bundle else render_html(snapshot,args.locale,confirmed) if args.html else json.dumps(snapshot,indent=2,ensure_ascii=False))
if __name__=='__main__':main()
