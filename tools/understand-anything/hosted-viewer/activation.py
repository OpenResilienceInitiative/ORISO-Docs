"""Rollback source/static/runtime/hub pointers and Compose if activation or readback fails.

The existing release workflow serializes activations. The operator must also keep
these bindings single-writer. Immutable generations and artifacts are preserved.
"""
import argparse,json,os,pathlib,subprocess,hashlib,stat

def activate(links,compose,journal,install,restart_previous):
 links=[pathlib.Path(p) for p in links];compose=pathlib.Path(compose);journal=pathlib.Path(journal)
 if not links or len(set(links))!=len(links) or not all(p.is_absolute() for p in [*links,compose,journal]):raise ValueError('Explicit unique absolute activation bindings required')
 before=[]
 for p in links:
  if p.is_symlink():before.append({'path':str(p),'target':os.readlink(p)})
  elif p.exists():raise ValueError('Existing current directory requires explicit operator migration')
  else:before.append({'path':str(p),'target':None})
 if not compose.is_file() or compose.is_symlink():raise ValueError('Regular approved Compose file required')
 if journal.exists():raise ValueError('Existing activation journal requires inspection')
 journal.mkdir(parents=True,mode=0o700);original=compose.read_bytes();mode=stat.S_IMODE(compose.stat().st_mode)
 backup=journal/'compose-before.yml';backup.write_bytes(original);backup.chmod(0o600)
 def record(state):
  file=journal/'state.json';file.write_text(json.dumps({'state':state,'pointers':before,'composeSHA256':hashlib.sha256(original).hexdigest()})+'\n');file.chmod(0o600)
 record('activating')
 try:
  result=install();record('committed');return result
 except BaseException:
  # Refuse overwriting unexpected directories. Never remove a release tree.
  if any(p.exists() and not p.is_symlink() for p in links):record('rollback-blocked');raise ValueError('Activation rollback requires operator inspection: current ceased to be a link')
  try:
   for p,item in zip(links,before):
    if item['target'] is None:
     if p.is_symlink():p.unlink()
    else:
     pending=p.with_name(p.name+'.rollback.pending')
     if pending.exists() or pending.is_symlink():raise ValueError('Pending rollback requires inspection')
     p.parent.mkdir(parents=True,exist_ok=True);pending.symlink_to(item['target']);pending.replace(p)
   temp=compose.with_name(compose.name+'.rollback.pending')
   with temp.open('xb') as f:f.write(original)
   temp.chmod(mode);temp.replace(compose)
   restart_previous();record('rolled-back')
  except BaseException:record('rollback-blocked');raise ValueError('Activation rollback incomplete; operator inspection required')
  raise

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--link',action='append',required=True);parser.add_argument('--compose',required=True);parser.add_argument('--journal',required=True);parser.add_argument('--bindings',required=True);parser.add_argument('command',nargs=argparse.REMAINDER);args=parser.parse_args()
 try:
  bindings=json.loads(pathlib.Path(args.bindings).read_text());services=[b['service'] for b in bindings]
  if not services or any(not isinstance(s,str) or not s or not all(c.isalnum() or c in '_.-' for c in s) for s in services):raise ValueError('Explicit approved service list required')
  command=args.command[1:] if args.command[:1]==['--'] else args.command
  if not command:raise ValueError('Explicit activation command required')
  activate(args.link,args.compose,args.journal,lambda:subprocess.run(command,check=True),lambda:subprocess.run(['docker','compose','-f',args.compose,'up','-d','--force-recreate',*services],check=True))
 except BaseException:raise SystemExit('Understand activation failed; retained journal records rollback state for operator inspection')
