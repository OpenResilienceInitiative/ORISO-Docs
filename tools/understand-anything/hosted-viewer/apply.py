#!/usr/bin/env python3
"""Apply the hosted viewer compatibility patch only to the audited baseline."""
import argparse,hashlib,json,pathlib,shutil,subprocess
p=argparse.ArgumentParser();p.add_argument('plugin_root',type=pathlib.Path);p.add_argument('--check',action='store_true');p.add_argument('--rollback',action='store_true');a=p.parse_args()
here=pathlib.Path(__file__).resolve().parent;root=a.plugin_root.resolve();manifest=json.loads((here/'manifest.json').read_text())
def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest() if file.exists() else None
expected='after' if a.rollback else 'before';target='before' if a.rollback else 'after'
if all(digest(root/f)==v[target] for f,v in manifest.items()):
 print('Viewer already at requested revision');raise SystemExit(0)
for f,v in manifest.items():
 if digest(root/f)!=v[expected]:raise SystemExit('Refusing modified or unsupported viewer baseline: '+f)
module=root/'packages/dashboard/source-location.mjs'
if module.exists() and digest(module)!=digest(here/'source-location.mjs'):raise SystemExit('Refusing unknown source-location module')
command=['patch','-p1','--batch']+(['-R'] if a.rollback else [])
patch=(here/'viewer.patch').read_bytes();subprocess.run(command+['--dry-run'],cwd=root,input=patch,check=True,stdout=subprocess.DEVNULL)
if a.check:print('Patch baseline and dry run verified');raise SystemExit(0)
if not a.rollback:shutil.copyfile(here/'source-location.mjs',module)
subprocess.run(command,cwd=root,input=patch,check=True,stdout=subprocess.DEVNULL)
if a.rollback and module.exists():module.unlink()
print('Viewer patch '+('reverted' if a.rollback else 'applied'))
