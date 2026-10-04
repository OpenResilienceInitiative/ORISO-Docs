#!/usr/bin/env python3
"""Build unapproved, immutable-version bilingual review artifacts, never publish."""
import argparse,hashlib,json,re
from public_operator_snapshot import bound_snapshot,render_html,unavailable
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit

ALLOWED_TAGS={'p','h1','h2','h3','h4','h5','h6','div','span','strong','em','code','pre','ul','ol','li','table','thead','tbody','tfoot','tr','td','th','br','hr','a','blockquote','section','aside','details','summary','img','dl','dt','dd','figure','figcaption'}
ALLOWED_ATTRIBUTES={'id','title','href','src','alt','colspan','rowspan','scope'}
ACTIVE_TAGS={'script','style','svg','math','form','iframe','object','embed','video','audio'}
VOID_TAGS={'br','hr','img','input','meta','link','embed','source','area','base','wbr'}
BLOCK_CLASSES={'internal-note','internal','private','editor-note','qnote--todo'}
class PublicOnly(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=False);self.output=[];self.suppressed=0
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if self.suppressed:self.suppressed+=tag not in VOID_TAGS;return
  if tag in ACTIVE_TAGS or BLOCK_CLASSES.intersection(attrs.get('class','').split()) or 'data-internal' in attrs or 'hidden' in attrs or re.search(r'display\s*:\s*none|visibility\s*:\s*hidden',attrs.get('style',''),re.I):self.suppressed=0 if tag in VOID_TAGS else 1;return
  if tag not in ALLOWED_TAGS:return
  safe=[]
  for key,value in attrs.items():
   if key not in ALLOWED_ATTRIBUTES:continue
   if key in {'href','src'}:
    if not (value.startswith(('https://docs.oriso.org/','https://understand.oriso.org/','https://github.com/OpenResilienceInitiative/','https://www.gesetze-im-internet.de/','#','mailto:'))):raise ValueError('Link outside public allowlist: '+value)
    normalized=value
    while True:
     decoded=unquote(normalized)
     if decoded==normalized:break
     normalized=decoded
    parsed=urlsplit(normalized);private_check=(parsed.path+'?'+parsed.query+'#'+parsed.fragment).lower()
    if any(fragment in private_check for fragment in ['oriso-infra','oriso-e2e','token=','secret=']):raise ValueError('Internal source reference forbidden')
   safe.append((key,value))
  self.output.append('<'+tag+''.join(' '+k+'="'+escape(v or '',quote=True)+'"' for k,v in safe)+'>')
 def handle_endtag(self,tag):
  if tag in VOID_TAGS:return
  if self.suppressed:self.suppressed-=1;return
  if tag in ALLOWED_TAGS:self.output.append('</'+tag+'>')
 def handle_data(self,data):
  if not self.suppressed:self.output.append(data)
 def handle_entityref(self,name):
  if not self.suppressed:self.output.append('&'+name+';')
 def handle_charref(self,name):
  if not self.suppressed:self.output.append('&#'+name+';')
def sanitize(value):
 parser=PublicOnly();parser.feed(value);return ''.join(parser.output)
def digest(value):return hashlib.sha256(value).hexdigest()
def validate(root,manifest):
 from datetime import date
 try:date.fromisoformat(manifest['date'])
 except (ValueError,TypeError,KeyError):raise ValueError('ISO source date required')
 if manifest.get('locales')!=['de','en']:raise ValueError('Both DE and EN required')
 if manifest.get('version')!='v5-draft':raise ValueError('Explicit v5-draft required')
 if set(manifest.get('approval',{}))!={'technical','operator','legal'} or any(value!='pending' for value in manifest['approval'].values()):raise ValueError('Preparation cannot manufacture approval')
 expected_ids={str(i) for i in range(1,11)}|{'A1','A'}
 ids=[chapter.get('id') for chapter in manifest.get('chapters',[])]
 if len(ids)!=12 or set(ids)!=expected_ids:raise ValueError('Complete unique chapters 1-10,A1,A required')
 for chapter in manifest['chapters']:
  if chapter.get('translationSourceHash',chapter['hashes']['de'])!=chapter['hashes']['de']:raise ValueError('Translation bound to stale source')
  for locale in manifest['locales']:
   path=(root/chapter[locale]).resolve()
   if not path.is_relative_to(root.resolve()) or not path.is_file():raise ValueError('Missing/unsafe locale input')
   if digest(path.read_bytes())!=chapter['hashes'][locale]:raise ValueError('Stale translation/source hash: '+str(path))
def validate_publication(root,records):
 """Fail closed; drafting itself never confers publication or latest authority."""
 from datetime import datetime
 manifest_path=root/'manifest.json';manifest=json.loads(manifest_path.read_text())
 expected=digest(manifest_path.read_bytes())
 release_version=manifest.get('releaseVersion')
 if set(records)!={'technical','operator','legal'}:raise ValueError('Three independent approval records required')
 for owner in ['technical','operator','legal']:
  record=records[owner]
  if record.get('state')!='approved':raise ValueError(owner+' approval pending')
  if not isinstance(release_version,str) or not re.fullmatch(r'[1-9][0-9]*(?:\.[0-9]+)*',release_version) or record.get('releaseVersion')!=release_version:raise ValueError(owner+' approval does not bind release version')
  if record.get('draftVersion')!=manifest['version'] or record.get('sourceManifestHash')!=expected:raise ValueError(owner+' approval is for another version/hash')
  if not all(isinstance(record.get(key),str) and record[key].strip() for key in ['approver','timestamp','evidence']):raise ValueError(owner+' approval identity/time/evidence missing')
  try:timestamp=datetime.fromisoformat(record['timestamp'].replace('Z','+00:00'))
  except ValueError:raise ValueError(owner+' approval timestamp invalid')
  if timestamp.tzinfo is None:raise ValueError(owner+' approval requires timezone')
 return {'draftVersion':manifest['version'],'sourceManifestHash':expected}
def validate_historical(repo,snapshots):
 for name,expected in snapshots.items():
  path=(repo/name).resolve()
  if not path.is_relative_to(repo.resolve()) or not path.is_file() or digest(path.read_bytes())!=expected:raise ValueError('Historical snapshot changed: '+name)
def build_input(root,manifest,locale):
 validate(root,manifest)
 if locale not in manifest['locales']:raise ValueError('Unsupported locale')
 snapshot=bound_snapshot(root,manifest)
 return {'operatorSnapshot':snapshot,'confirmedOperatorSnapshotHash':snapshot['snapshotHash'] if manifest.get('operatorFieldsConfirmed') is True else None,'version':manifest['version'],'date':manifest['date'],'locale':locale,'markdown':'\n\n'.join(f'<a id="kap{c["id"]}"></a>\n\n'+(root/c[locale]).read_text() for c in manifest['chapters'])}
def public_body(data):
 import markdown
 return sanitize(markdown.markdown(data['markdown'],extensions=['tables','fenced_code']))+render_html(data.get('operatorSnapshot',unavailable()),data['locale'],data.get('confirmedOperatorSnapshotHash'))
def warning_text(locale):
 return 'Unapproved review draft. Source claims and operator data need exact-version technical, operator and legal review. Annex 2 is not available.' if locale=='en' else 'Nicht freigegebener Prüfentwurf. Quellaussagen und Betreiberdaten benötigen versionsgenaue technische, Betreiber- und juristische Prüfung. Anlage 2 liegt nicht vor.'
def html_input(data,approved_version=None):
 data=dict(data)
 if approved_version:data['version']=approved_version
 body=public_body(data);warning=('Approved release / Freigegebene Fassung' if approved_version else warning_text(data['locale']))
 robots='index,follow' if approved_version else 'noindex,nofollow'
 locale_script="""<script>document.querySelectorAll('[data-language-switch]').forEach(link=>link.addEventListener('click',()=>{link.hash=window.location.hash;}));</script>""" if approved_version else ''
 navigation='<nav><a data-language-switch href="../de/">Deutsch</a> · <a data-language-switch href="../en/">English</a> · <a href="dsfa.pdf">PDF</a></nav>' if approved_version else ''
 return f'<!doctype html><html lang="{escape(str(data["locale"]))}"><head><meta charset="utf-8"><meta name="robots" content="{robots}"><title>ORISO DSFA {escape(str(data["version"]))} {escape(str(data["locale"]))}</title><style>body{{font:16px/1.55 sans-serif;max-width:1000px;margin:40px auto;padding:16px}}table{{border-collapse:collapse;width:100%}}th,td{{border:1px solid #aaa;padding:6px;vertical-align:top}}aside{{border:2px solid #b45309;padding:15px}}@media print{{body{{font-size:10pt}}h2{{break-before:page}}thead{{display:table-header-group}}}}</style></head><body>{navigation}<h1>ORISO DSFA {escape(str(data["version"]))}</h1><p>{escape(str(data["date"]))} · {data["locale"].upper()}</p><aside>{warning}</aside>{body}{locale_script}</body></html>'
def pdf_input(data,destination,approved_version=None):
 """ReportLab consumes exactly the validated Markdown used to construct HTML."""
 data=dict(data)
 if approved_version:data['version']=approved_version
 label='Approved release / Freigegebene Fassung' if approved_version else 'UNAPPROVED / NICHT FREIGEGEBEN'
 from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Image
 from reportlab.lib.styles import getSampleStyleSheet
 from reportlab.pdfbase import pdfmetrics
 from reportlab.pdfbase.ttfonts import TTFont
 styles=getSampleStyleSheet()
 font=Path('/System/Library/Fonts/Supplemental/Arial.ttf')
 if font.exists():
  pdfmetrics.registerFont(TTFont('DraftUnicode',str(font)))
  for style in styles.byName.values():style.fontName='DraftUnicode'
 story=[Paragraph(escape(f'ORISO DSFA {escape(str(data["version"]))} · {data["locale"].upper()} · {escape(str(data["date"]))}'),styles['Title']),Paragraph(escape(label if approved_version else label+' — '+warning_text(data['locale'])),styles['Normal']),Spacer(1,12)]
 # Both outputs consume the same sanitised DOM, including complete table contents.
 class ReviewBlocks(HTMLParser):
  def __init__(self):super().__init__();self.blocks=[];self.parts=[];self.heading=False
  def flush(self):
   value=' '.join(''.join(self.parts).split())
   if value:self.blocks.append((self.heading,value))
   self.parts=[];self.heading=False
  def handle_starttag(self,tag,attrs):
   if tag in {'h1','h2','h3','h4','p','li','tr','dt','dd'}:self.flush();self.heading=tag.startswith('h')
   if tag=='img':
    source=dict(attrs).get('src','')
    if source.startswith('data:image/'):
     self.flush();self.blocks.append(('image',source.split(',',1)[1]))
   if tag in {'td','th'} and self.parts:self.parts.append(' | ')
   if tag=='br':self.parts.append(' ')
  def handle_endtag(self,tag):
   if tag in {'h1','h2','h3','h4','p','li','tr','dt','dd'}:self.flush()
  def handle_data(self,value):self.parts.append(value)
 blocks=ReviewBlocks();blocks.feed(public_body(data));blocks.flush()
 for heading,text in blocks.blocks:
  if heading=='image':
   import base64,io
   image=Image(io.BytesIO(base64.b64decode(text,validate=True)));image._restrictSize(120,80);story.extend([image,Spacer(1,6)]);continue
  style=styles['Heading2'] if heading else styles['Normal']
  story.extend([Paragraph(escape(text),style),Spacer(1,6)])
 def footer(canvas,doc):
  canvas.saveState();canvas.setFont('DraftUnicode' if font.exists() else 'Helvetica',8)
  canvas.drawString(40,25,f'ORISO DSFA {escape(str(data["version"]))} · {data["locale"].upper()} · {label}')
  canvas.drawRightString(550,25,str(doc.page));canvas.restoreState()
 SimpleDocTemplate(str(destination),title=f'ORISO DSFA {escape(str(data["version"]))} {escape(str(data["locale"]))}',author='ORISO Docs draft preparation').build(story,onFirstPage=footer,onLaterPages=footer)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('root',type=Path);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--pdf',action='store_true');parser.add_argument('--approvals',type=Path);parser.add_argument('--check-publication-approval',action='store_true');parser.add_argument('--activate',action='store_true');parser.add_argument('--public',action='store_true');parser.add_argument('--latest',action='store_true');args=parser.parse_args()
 manifest=json.loads((args.root/'manifest.json').read_text());validate(args.root,manifest)
 if args.check_publication_approval or args.activate or args.public or args.latest:
  approval_path=args.approvals or args.root/'approvals.json'
  records=json.loads(approval_path.read_text()) if approval_path.is_file() else {}
  validate_publication(args.root,records)
  if args.activate or args.public or args.latest:raise ValueError('Use legal_publication.py with explicit destination root and approved release version after readiness gates')
  print('Exact-version approval gate satisfied');return
 snapshot=bound_snapshot(args.root,manifest)
 args.output.mkdir(parents=True,exist_ok=True)
 artifacts={'operatorSnapshotHash':snapshot['snapshotHash'],'operatorFieldsConfirmed':manifest.get('operatorFieldsConfirmed') is True,'version':manifest['version'],'date':manifest['date'],'sourceManifestHash':digest((args.root/'manifest.json').read_bytes()),'approval':manifest['approval'],'publication':'gated; three exact-version approval records required','locales':{}}
 for locale in manifest['locales']:
  data=build_input(args.root,manifest,locale);stem=f'dsfa-{manifest["version"]}-{locale}';htmlpath=args.output/(stem+'.html');htmlpath.write_text(html_input(data));inputpath=args.output/(stem+'.input.json');inputpath.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
  records={p.name:{'sha256':digest(p.read_bytes()),'bytes':p.stat().st_size} for p in [htmlpath,inputpath]}
  if args.pdf:
   pdfpath=args.output/(stem+'.pdf');pdf_input(data,pdfpath);records[pdfpath.name]={'sha256':digest(pdfpath.read_bytes()),'bytes':pdfpath.stat().st_size}
  else:records['pdf']={'status':'not generated; invoke with --pdf using available ReportLab runtime'}
  artifacts['locales'][locale]={'inputHash':digest(data['markdown'].encode()),'artifacts':records}
 (args.output/'artifact-manifest.json').write_text(json.dumps(artifacts,indent=2)+'\n')
 print('Validated bilingual draft artifacts:',args.output)
if __name__=='__main__':main()
