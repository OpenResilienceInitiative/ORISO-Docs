from pathlib import Path
import json,yaml,os
p=Path('/opt/oriso-understand/docker-compose.yml')
data=yaml.safe_load(p.read_text())
repos=['ORISO-Frontend','ORISO-Admin','ORISO-UserService','ORISO-AgencyService','ORISO-TenantService','ORISO-ConsultingTypeService','ORISO-Database','ORISO-Keycloak','ORISO-Helm','ORISO-ElementCall','ORISO-Livekit','ORISO-HealthDashboard','ORISO-Status','ORISO-SigNoz']
s=data['services']['docs'];volumes=s.setdefault('volumes',[])
for repo in repos:
 mount=f'/opt/oriso-understand/{repo}:/repos/{repo}:ro'
 if mount not in volumes:volumes.append(mount)
env=s.setdefault('environment',{})
assert isinstance(env,dict)
env['ORISO_SOURCE_REPOS']=json.dumps({repo:f'/repos/{repo}' for repo in repos},separators=(',',':'))
backup=p.with_name(p.name+'.before-20260909-source-mounts')
if not backup.exists():
 backup.write_text(p.read_text());os.chmod(backup,0o600)
p.write_text(yaml.safe_dump(data,sort_keys=False))
print('Configured read-only source mounts for 14 published repositories; private dashboards excluded')
