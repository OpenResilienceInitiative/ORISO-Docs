"""Review regressions: separated startup and retained TLS material."""
import json
import copy
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import test_local_development as baseline
from test_local_development import RunnerFixture


class SeparatedStartup(RunnerFixture, unittest.TestCase):
    def test_invalid_ui_environment_returns_json_before_writes(self):
        result, report = self.doctor(env={**self.env, 'ORISO_UI': 'Frontend'})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('ORISO_UI', str(report['errors']))
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_services_require_complete_healthy_owned_infra_and_correct_oidc(self):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        import threading
        self.repo('ORISO-Admin')
        issuer = {'value': 'wrong'}
        class Metadata(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps({'issuer': issuer['value']}).encode())
            def log_message(self, *unused):
                pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), Metadata)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(thread.join)
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        self.env['ORISO_KEYCLOAK_PORT'] = str(server.server_port)
        baseline.BundleContracts.setUpClass()
        module = baseline.BundleContracts.module
        with patch.dict(os.environ, self.env, clear=True):
            args = module.parse(['start', 'services', '--services', 'admin'])
        module.claim_runtime(args)
        states = {name: {'Config': {'Labels': {'org.oriso.local.owner': args.owner,
                  'com.docker.compose.project': args.project, 'com.docker.compose.service': name}},
                  'State': {'Running': True, 'Health': {'Status': 'healthy'}}}
                  for name in ('mariadb', 'mongodb', 'redis', 'rabbitmq', 'mailpit', 'keycloak')}
        metadata = Path(self.tmp.name) / 'containers.json'
        docker = self.bin / 'docker'
        docker.write_text('#!' + __import__('sys').executable + '\n' +
            'import json,sys\na=sys.argv[1:]\n' +
            'states=json.load(open(' + repr(str(metadata)) + '))\n' +
            'if a[:2]==["compose","version"]: print("2.39.0")\n'
            'elif a[0]=="info": print("ok")\n'
            'elif a[0]=="ps": print(" ".join(states))\n'
            'elif a[:2]==["volume","ls"]: pass\n'
            'elif a[:2]==["volume","inspect"]: print("Error: No such volume",file=sys.stderr); sys.exit(1)\n'
            'elif a[0]=="inspect": print(json.dumps([states[a[1]]]))\n'
            'elif a==["--version"]: print("Docker fixture")\n'
            'else: sys.exit(2)\n')
        metadata.write_text(json.dumps(states))
        result, report = self.doctor('services', '--services', 'admin')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Authentication metadata', str(report['errors']))
        issuer['value'] = f'http://localhost:{server.server_port}/realms/online-beratung'
        result, report = self.doctor('services', '--services', 'admin')
        self.assertEqual(result.returncode, 0, report['errors'])
        original = {str(p.relative_to(self.runtime)): p.read_bytes() for p in self.runtime.rglob('*') if p.is_file()}
        for fault in ('missing', 'stopped', 'unhealthy', 'foreign', 'duplicate', 'unlabelled'):
            with self.subTest(fault=fault):
                broken = copy.deepcopy(states)
                if fault == 'missing': del broken['keycloak']
                elif fault == 'stopped': broken['keycloak']['State']['Running'] = False
                elif fault == 'unhealthy': broken['keycloak']['State']['Health']['Status'] = 'unhealthy'
                elif fault == 'foreign': broken['keycloak']['Config']['Labels']['org.oriso.local.owner'] = 'foreign'
                elif fault == 'duplicate': broken['extra'] = copy.deepcopy(broken['keycloak'])
                else: broken['keycloak']['Config']['Labels'].pop('com.docker.compose.project')
                metadata.write_text(json.dumps(broken))
                result = self.run_runner('start', 'services', '--services', 'admin')
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('infrastructure', result.stderr)
                self.assertEqual({str(p.relative_to(self.runtime)): p.read_bytes() for p in self.runtime.rglob('*') if p.is_file()}, original)
                self.assertFalse((self.workspace / 'ORISO-Admin/.env.local').exists())

    def test_services_without_infra_fail_before_creating_runtime_or_ui_env(self):
        repo = self.repo('ORISO-Admin')
        result = self.run_runner('start', 'services', '--services', 'admin')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.runtime.exists(), result.stderr)
        self.assertFalse((repo / '.env.local').exists())
        self.assertFalse(self.trace.exists())

    def test_infra_frontend_selection_needs_no_application_checkout_or_runtime(self):
        result, report = self.doctor('infra', '--ui', 'frontend')
        self.assertEqual(result.returncode, 0, report['errors'])
        self.assertEqual(report['repositories'], {})
        self.assertFalse({'java', 'node', 'npm'} & report['tools'].keys())
        self.assertFalse(self.runtime.exists())


class RealmAndCertificate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        baseline.BundleContracts.setUpClass()
        cls.module = baseline.BundleContracts.module

    def test_infra_and_services_preserve_identical_frontend_realm(self):
        with tempfile.TemporaryDirectory() as tmp:
            infra = self.module.parse(['start', 'infra', '--ui', 'frontend', '--workspace-root', tmp])
            services = self.module.parse(['start', 'services', '--ui', 'frontend', '--workspace-root', tmp])
            self.assertEqual(self.module.realm_contract(infra), self.module.realm_contract(services))
            self.module.claim_runtime(infra)
            first = self.module.write_realm(infra).read_bytes()
            self.assertEqual(first, self.module.write_realm(services).read_bytes())
            realm = json.loads(first)
            app = next(client for client in realm['clients'] if client['clientId'] == 'app')
            self.assertIn('https://localhost:9443', app['webOrigins'])

    def test_default_infra_also_supports_a_later_frontend_selection(self):
        with tempfile.TemporaryDirectory() as tmp:
            infra = self.module.parse(['start', 'infra', '--workspace-root', tmp])
            services = self.module.parse(['start', 'services', '--ui', 'frontend', '--workspace-root', tmp])
            self.assertEqual(self.module.realm_contract(infra), self.module.realm_contract(services))
            self.module.claim_runtime(infra)
            self.assertEqual(self.module.write_realm(infra).read_bytes(), self.module.write_realm(services).read_bytes())

    def test_near_expiry_owned_certificate_is_renewed_and_then_reused(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.module.parse(['start', '--services', 'admin', '--workspace-root', tmp])
            self.module.claim_runtime(args)
            config = json.loads(self.module.app_tls_config(args).read_text())
            cert, key = Path(config['tls_cert']), Path(config['tls_key'])
            for days in ('-1', '1'):
                if days == '-1':
                    # A genuinely expired certificate, with no fake clock or expiry mock.
                    root = Path(tmp)
                    (root / 'index').write_text('')
                    (root / 'serial').write_text('01\n')
                    ca_config = root / 'ca.cnf'
                    ca_config.write_text(f'[ca]\ndefault_ca = local\n[local]\ndatabase = {root}/index\nserial = {root}/serial\nnew_certs_dir = {root}\nprivate_key = {key}\ncertificate = {cert}\ndefault_md = sha256\npolicy = identity\n[identity]\ncommonName = supplied\n')
                    csr = root / 'request.pem'
                    subprocess.run(['openssl', 'req', '-new', '-key', str(key), '-subj', '/CN=localhost', '-out', str(csr)], check=True, capture_output=True)
                    expired = root / 'expired.pem'
                    subprocess.run(['openssl', 'ca', '-selfsign', '-batch', '-config', str(ca_config), '-in', str(csr), '-out', str(expired), '-startdate', '20000101000000Z', '-enddate', '20000102000000Z'], check=True, capture_output=True)
                    cert.write_bytes(expired.read_bytes())
                    check = subprocess.run(['openssl', 'x509', '-in', str(cert), '-checkend', '0', '-noout'], capture_output=True)
                    self.assertNotEqual(check.returncode, 0)
                else:
                    subprocess.run(['openssl', 'x509', '-in', str(cert), '-signkey', str(key), '-days', days, '-out', str(cert)], check=True, capture_output=True)
                old = cert.read_bytes()
                with patch.object(self.module, 'available', return_value=True):
                    self.module.app_tls_config(args)
                self.assertTrue(cert.read_bytes() != old, 'expired/near-expiry certificate was silently retained')
            probe = subprocess.run(['openssl', 'x509', '-in', str(cert), '-checkend', '86400', '-noout'], capture_output=True)
            self.assertEqual(probe.returncode, 0)
            renewed = cert.read_bytes()
            self.module.app_tls_config(args)
            self.assertEqual(cert.read_bytes(), renewed)
            self.assertEqual(key.stat().st_mode & 0o777, 0o600)

    def test_certificate_renewal_refuses_foreign_runtime_or_active_listener(self):
        for condition in ('foreign', 'listener', 'process'):
            with self.subTest(condition=condition), tempfile.TemporaryDirectory() as tmp:
                args = self.module.parse(['start', '--services', 'admin', '--workspace-root', tmp])
                self.module.claim_runtime(args)
                config = json.loads(self.module.app_tls_config(args).read_text())
                cert, key = Path(config['tls_cert']), Path(config['tls_key'])
                subprocess.run(['openssl', 'x509', '-in', str(cert), '-signkey', str(key), '-days', '1', '-out', str(cert)], check=True, capture_output=True)
                original = (cert.read_bytes(), key.read_bytes())
                if condition == 'foreign':
                    (args.runtime / 'owner.json').write_text('{}')
                if condition == 'process':
                    (args.runtime / 'pids/app_tls.json').write_text(json.dumps({'pid': os.getpid()}))
                with patch.object(self.module, 'available', return_value=condition != 'listener'):
                    with self.assertRaises(self.module.ContractError):
                        self.module.app_tls_config(args)
                self.assertEqual((cert.read_bytes(), key.read_bytes()), original)

    def test_failed_renewal_preserves_existing_pair_and_removes_staging_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.module.parse(['start', '--services', 'admin', '--workspace-root', tmp])
            self.module.claim_runtime(args)
            config = json.loads(self.module.app_tls_config(args).read_text())
            cert, key = Path(config['tls_cert']), Path(config['tls_key'])
            subprocess.run(['openssl', 'x509', '-in', str(cert), '-signkey', str(key), '-days', '1', '-out', str(cert)], check=True, capture_output=True)
            original = (cert.read_bytes(), key.read_bytes())
            command = self.module.command
            def fail_generation(argv, *args, **kwargs):
                if argv[:2] == ['openssl', 'req']:
                    return subprocess.CompletedProcess(argv, 1, '', 'fixture failure')
                return command(argv, *args, **kwargs)
            with patch.object(self.module, 'command', side_effect=fail_generation), patch.object(self.module, 'available', return_value=True):
                with self.assertRaisesRegex(self.module.ContractError, 'existing pair preserved'):
                    self.module.app_tls_config(args)
            self.assertEqual((cert.read_bytes(), key.read_bytes()), original)
            self.assertEqual(list(args.runtime.glob('.app-edge-*')), [])


if __name__ == '__main__':
    unittest.main()
