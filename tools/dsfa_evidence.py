#!/usr/bin/env python3
"""Internal evidence migration: exact source snapshots never imply runtime truth."""
import argparse,hashlib,json,re,subprocess
from pathlib import Path,PurePosixPath

def sha(data):return hashlib.sha256(data).hexdigest()
def relative(value):
 if not isinstance(value,str) or not value or '\\' in value or ':' in value or value.startswith('/') or '..' in PurePosixPath(value).parts:raise ValueError('Relative repository path required')
 return value

def source(value):
 if not isinstance(value,dict) or not isinstance(value.get('branch'),str) or not value['branch'] or not re.fullmatch('[0-9a-f]{40}',value.get('commit') or '') or not re.fullmatch('[0-9a-f]{64}',value.get('sha256') or ''):raise ValueError('Exact source branch/commit/bytes required')
 relative(value.get('path'))

def validate(data):
 if data.get('visibility')!='internal' or data.get('schema')!='oriso.dsfa.evidence/v2' or not isinstance(data.get('entries'),list) or not data['entries']:raise ValueError('Evidence v2 entries required')
 # This is internal data too; it must remain portable and must not embed host paths.
 encoded=json.dumps(data)
 if re.search(r'/Users/|/home/|[A-Za-z]:\\\\Users\\\\',encoded):raise ValueError('Machine-specific home path forbidden')
 seen=set();verified=0
 for entry in data['entries']:
  slug=entry.get('slug')
  if not isinstance(slug,str) or not slug or slug in seen:raise ValueError('Unique stable claim slug required')
  seen.add(slug);source(entry.get('source'))
  if entry.get('lifecycle') not in {'documented','planned','disabled','retired','live'}:raise ValueError('Unknown lifecycle')
  runtime=entry.get('runtime',{})
  if not {'state','environment','deployedCommit','observedAt','evidence'}.issubset(runtime):raise ValueError('Runtime fields required')
  if runtime['state'] not in {'not-verified','verified'} or not isinstance(runtime['evidence'],list):raise ValueError('Runtime state/evidence required')
  if runtime['state']=='verified':
   from datetime import datetime
   if not runtime['environment'] or not re.fullmatch('[0-9a-f]{40}',runtime['deployedCommit'] or '') or not runtime['evidence']:raise ValueError('Actual runtime evidence required')
   try:dt=datetime.fromisoformat(runtime['observedAt'].replace('Z','+00:00'));assert dt.tzinfo
   except (ValueError,AttributeError,AssertionError):raise ValueError('Timezone-aware runtime observation required')
   for evidence in runtime['evidence']:
    if not isinstance(evidence,dict) or not evidence.get('reference') or not re.fullmatch('[0-9a-f]{64}',evidence.get('sha256') or ''):raise ValueError('Hashed runtime evidence required')
   verified+=1
  elif entry['lifecycle']=='live':raise ValueError('Source-only claim cannot be labelled live')
  for evidence in entry.get('evidence',[]):
   relative(evidence.get('path'))
   if evidence.get('source') is not None:source(evidence['source'])
   elif evidence.get('sourceVerification')=='matched':raise ValueError('Unbound code cannot be matched')
 return {'claims':len(seen),'runtimeVerified':verified,'allRuntimeVerified':verified==len(seen),'publicReady':False}

def git(root,*args):return subprocess.check_output(['git','-C',str(root),*args],stderr=subprocess.DEVNULL)

def migrate(repository,repositories_root,input_path):
 import yaml
 raw=input_path.read_bytes();legacy=yaml.safe_load(raw)
 rel=input_path.relative_to(repository).as_posix()
 commit=git(repository,'log','-1','--format=%H','--',rel).decode().strip()
 if git(repository,'show',commit+':'+rel)!=raw:raise ValueError('Commit original evidence map before migration')
 branch=git(repository,'branch','--show-current').decode().strip()
 binding={'branch':branch,'commit':commit,'path':rel,'sha256':sha(raw)}
 entries=[]
 for original in legacy['entries']:
  entry={key:value for key,value in original.items() if key not in {'status','evidence'}}
  entry.update(source=binding.copy(),legacyStatus=original.get('status'),lifecycle='documented',runtime={'state':'not-verified','environment':None,'deployedCommit':None,'observedAt':None,'evidence':[]},evidence=[])
  for original_evidence in original.get('evidence',[]):
   ev=original_evidence.copy();relative(ev['path']);ev.update(source=None,sourceVerification='unbound')
   repo=ev['repo']
   if repo!='0 - Docs' and not re.fullmatch(r'ORISO-[A-Za-z0-9-]+',repo):raise ValueError('Unexpected repository name')
   try:
    checkout=repositories_root/repo;ref='origin/dev';rev=git(checkout,'rev-parse',ref).decode().strip();content=git(checkout,'show',rev+':'+ev['path'])
    ev['source']={'branch':ref,'commit':rev,'path':ev['path'],'sha256':sha(content)}
    ev['sourceKind']=git(checkout,'cat-file','-t',rev+':'+ev['path']).decode().strip()
    expected=ev.get('expect',[])
    ev['sourceVerification']=('matched' if all(item.encode() in content for item in expected) else 'identifiers-missing') if expected and ev['sourceKind']=='blob' else 'source-bound/no-identifiers'
   except (subprocess.CalledProcessError,FileNotFoundError):pass
   entry['evidence'].append(ev)
  entries.append(entry)
 data={'schema':'oriso.dsfa.evidence/v2','visibility':'internal','legacyInput':{'path':rel,'sha256':sha(raw)},'sourceObservation':'Local origin/dev snapshots, not refreshed or deployed. Runtime verification is explicitly absent.','entries':entries}
 validate(data);return data

def main():
 p=argparse.ArgumentParser();p.add_argument('input',type=Path);p.add_argument('--repository',type=Path);p.add_argument('--repositories-root',type=Path);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output:
  data=migrate(a.repository.resolve(),a.repositories_root.resolve(),a.input.resolve());a.output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 else:data=json.loads(a.input.read_text())
 print(json.dumps(validate(data)))
if __name__=='__main__':main()
