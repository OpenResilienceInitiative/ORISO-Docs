"""Wait until a freshly started viewer service answers HTTP on its published host port."""
import argparse,time,urllib.request,urllib.error,pathlib,sys
import yaml

def host_port(compose,service):
    ports=yaml.safe_load(pathlib.Path(compose).read_text())['services'][service].get('ports',[])
    published={int(str(p['published'] if isinstance(p,dict) else str(p).split(':')[-2] if len(str(p).split(':'))>1 else str(p)).split('/')[0]) for p in ports}
    if len(published)!=1:raise ValueError('One explicit published port required: '+service)
    return next(iter(published))

def wait(port,timeout=240,interval=2,fetch=None):
    # Docker accepts TCP on a published port before the app listens, so only a real HTTP answer counts.
    deadline=time.monotonic()+timeout
    while True:
        try:
            (fetch or (lambda url:urllib.request.urlopen(url,timeout=5).close()))(f'http://127.0.0.1:{port}/')
            return True
        except urllib.error.HTTPError as e:e.close();return True
        except Exception:
            if time.monotonic()>=deadline:return False
            time.sleep(interval)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--compose',required=True);p.add_argument('--service',required=True);p.add_argument('--timeout',type=float,default=240);a=p.parse_args()
    try:port=host_port(a.compose,a.service)
    except Exception:raise SystemExit('Viewer port binding refused; inspect approved Compose configuration privately')
    if not wait(port,a.timeout):raise SystemExit('Viewer did not answer HTTP in time: '+a.service)
    print('Viewer answers HTTP: '+a.service)
