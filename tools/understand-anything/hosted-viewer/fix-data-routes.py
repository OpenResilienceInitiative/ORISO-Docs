from pathlib import Path
p=Path('/etc/nginx/sites-available/understand.oriso.org')
s=p.read_text()
for slug in ('livekit','health-dashboard'):
 for location,rule in [(f'location = /{slug}/file-content.json {{',f'        rewrite ^/{slug}/file-content\\.json$ /file-content.json break;'),(f'location ~ ^/{slug}/(knowledge-graph|meta|config|diff-overlay|domain-graph|file-content)\\.json$ {{',f'        rewrite ^/{slug}/(.*)$ /$1 break;')]:
  assert s.count(location)==1
  if rule not in s:s=s.replace(location,location+'\n'+rule,1)
p.with_name(p.name+'.before-20260909-data-routes').write_text(p.read_text())
p.write_text(s)
print('Corrected data routes for LiveKit and HealthDashboard')
