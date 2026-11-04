"""Public CLI status after real owned gateway/TLS startup with synthetic upstreams."""
import json
import os
from pathlib import Path
import signal
import socket
import time
import subprocess
import sys
import unittest

from test_local_development import ROOT, RunnerFixture


class StatusFixture(RunnerFixture):
    def setUp(self):
        super().setUp()
        self.env.update({'ORISO_READY_TIMEOUT': '5', 'ORISO_MODE': 'hybrid',
                         'KEYCLOAK_CONFIG_ADMIN_USERNAME': 'fixture',
                         'KEYCLOAK_CONFIG_ADMIN_PASSWORD': 'synthetic-fixture',
                         'IDENTITY_TECHNICAL_USER_USERNAME': 'fixture',
                         'IDENTITY_TECHNICAL_USER_PASSWORD': 'synthetic-fixture'})
        # This upstream is outside runner-owned infrastructure, like hybrid auth.
        script = Path(self.tmp.name) / 'upstream.py'
        script.write_text("""import json,os,sys
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200); self.end_headers()
  if self.path.endswith('/.well-known/openid-configuration'):
   self.wfile.write(json.dumps({'issuer': os.environ['ORISO_DEV_KEYCLOAK_URL'] + '/realms/online-beratung'}).encode())
  else: self.wfile.write(b'{"status":"UP"}')
 def log_message(self,*unused): pass
port=int(sys.argv[1]) if len(sys.argv)>1 else int(os.environ.get('SERVER_PORT') or os.environ.get('VITE_PORT') or os.environ['PORT'])
ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
""")
        self.script = script
        self.auth_port = self.env['ORISO_KEYCLOAK_PORT']
        self.env['ORISO_DEV_KEYCLOAK_URL'] = 'http://localhost:' + self.auth_port
        self.auth = subprocess.Popen([sys.executable, str(script), self.auth_port], env=self.env,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.addCleanup(self.stop_auth)
        for name, backend in [('ORISO-UserService', True), ('ORISO-Admin', False), ('ORISO-Frontend', False)]:
            repo = self.repo(name, backend=backend)
            if backend:
                launch = repo / 'mvnw'
            else:
                (repo / 'node_modules').mkdir()
                if name == 'ORISO-Frontend':
                    package = json.loads((repo / 'package.json').read_text())
                    package['scripts']['dev'] = 'fixture'
                    (repo / 'package.json').write_text(json.dumps(package))
                launch = self.bin / 'npm'
            launch.write_text('#!' + sys.executable + '\nimport os,sys\n'
                              'if "--version" in sys.argv: print("10.9.0"); sys.exit(0)\n'
                              'os.execv(sys.executable, [sys.executable, ' + repr(str(script)) + '])\n')
            launch.chmod(0o755)
        self.selected = getattr(self, 'selected', 'userservice admin frontend')
        self.addCleanup(self.stop_runtime)
        started = self.run_runner('start', 'all', '--services', self.selected)
        self.assertEqual(started.returncode, 0, started.stderr + started.stdout)
        self.assertIn('Ready:', started.stdout)

    def stop_auth(self):
        if self.auth.poll() is None:
            self.auth.terminate()
        self.auth.wait(timeout=5)

    def stop_runtime(self):
        # Cleanup checks real process records even after a test corrupts one.
        if self.runtime.exists():
            for record in (self.runtime / 'pids').glob('*.json'):
                data = json.loads(record.read_text())
                try:
                    os.killpg(data['pid'], signal.SIGTERM)
                except ProcessLookupError:
                    pass
            self.run_runner('stop', 'all', '--services', self.selected)

    def status(self):
        result = self.run_runner('status', '--services', self.selected)
        for service in self.selected.split():
            self.assertIn(service + ': ready', result.stdout)
        return result

    def wait_listener(self, name, available):
        end = time.monotonic() + 5
        while time.monotonic() < end:
            try:
                with socket.create_connection(('127.0.0.1', int(self.env['ORISO_' + name.upper() + '_PORT'])), timeout=.1): pass
                listening = True
            except OSError:
                listening = False
            if listening == available:
                return
            time.sleep(.05)
        self.fail(name + ': listener transition timed out')


class StatusAfterStartup(StatusFixture, unittest.TestCase):
    def test_healthy_owned_gateway_and_certificate_verified_tls_are_reported(self):
        result = self.status()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('gateway: ready', result.stdout)
        self.assertIn('app_tls: ready', result.stdout)

    def test_stopped_gateway_or_tls_makes_status_fail_while_applications_stay_ready(self):
        for name in ('gateway', 'app_tls'):
            with self.subTest(process=name):
                record = json.loads((self.runtime / 'pids' / (name + '.json')).read_text())
                os.killpg(record['pid'], signal.SIGTERM)
                self.wait_listener(name, available=False)
                result = self.status()
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertIn(name + ': unavailable', result.stdout)

    def test_live_gateway_with_broken_auth_route_is_unavailable(self):
        self.stop_auth()
        result = self.status()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('gateway: unavailable', result.stdout)

    def test_live_tls_with_broken_frontend_route_is_unavailable(self):
        # Keep frontend healthy directly but point the owned TLS edge elsewhere.
        config_path = self.runtime / 'app-edge.json'
        config = json.loads(config_path.read_text())
        config['frontend'] = None
        record = json.loads((self.runtime / 'pids/app_tls.json').read_text())
        os.killpg(record['pid'], signal.SIGTERM)
        self.wait_listener('app_tls', available=False)
        config_path.write_text(json.dumps(config))
        process = subprocess.Popen([sys.executable, str(ROOT / 'local_development.py'), '_run', record['token'],
                                    sys.executable, str(ROOT / 'local_gateway.py'), str(config_path)],
                                   start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        record['pid'] = process.pid
        (self.runtime / 'pids/app_tls.json').write_text(json.dumps(record))
        self.addCleanup(lambda: process.wait(timeout=5))
        self.addCleanup(lambda: os.killpg(process.pid, signal.SIGTERM) if process.poll() is None else None)
        self.wait_listener('app_tls', available=True)
        result = self.status()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('app_tls: unavailable', result.stdout)

    def test_healthy_listener_does_not_hide_missing_or_foreign_process_record(self):
        record = self.runtime / 'pids/gateway.json'
        original = record.read_text()
        try:
            for condition in ('missing', 'foreign-owner', 'wrong-token'):
                with self.subTest(record=condition):
                    data = json.loads(original)
                    if condition == 'missing': record.unlink()
                    else:
                        data['owner' if condition == 'foreign-owner' else 'token'] = 'foreign'
                        record.write_text(json.dumps(data))
                    result = self.status()
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                    self.assertIn('gateway: unavailable', result.stdout)
                    record.write_text(original)
        finally:
            record.write_text(original)

    def test_untrusted_tls_certificate_is_unavailable_without_runtime_writes(self):
        (self.runtime / 'app-edge-cert.pem').write_text('not a trusted certificate')
        before = {str(p): p.read_bytes() for p in self.runtime.rglob('*') if p.is_file()}
        result = self.status()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('app_tls: unavailable', result.stdout)
        self.assertEqual(before, {str(p): p.read_bytes() for p in self.runtime.rglob('*') if p.is_file()})


class StatusWithoutFrontend(StatusFixture, unittest.TestCase):
    selected = 'userservice admin'

    def test_admin_only_keeps_tls_ready_without_an_unselected_frontend_route(self):
        result = self.status()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('app_tls: ready', result.stdout)


if __name__ == '__main__':
    unittest.main()
