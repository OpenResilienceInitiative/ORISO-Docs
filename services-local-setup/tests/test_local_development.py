"""Process contracts: a weakened preflight, unsafe stop, or false readiness breaks these tests."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / 'run-oriso-local.sh'


class RunnerFixture:
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.workspace = Path(self.tmp.name) / 'workspace'
        self.workspace.mkdir()
        self.bin = Path(self.tmp.name) / 'bin'
        self.bin.mkdir()
        self.runtime = Path(self.tmp.name) / 'runtime'
        self.trace = Path(self.tmp.name) / 'trace'
        self.env = {**os.environ, 'ORISO_WORKSPACE_ROOT': str(self.workspace),
                    'ORISO_RUNTIME_DIR': str(self.runtime), 'ORISO_TEST_TRACE': str(self.trace),
                    'PATH': str(self.bin) + ':' + os.environ['PATH'], 'ORISO_READY_TIMEOUT': '0.2',
                    'ORISO_CONFIG_ADMIN_PASSWORD': 'DO_NOT_PRINT_THIS'}
        self.env.pop('JAVA_HOME', None)
        for name in ['USERService', 'TenantService', 'AgencyService', 'ConsultingTypeService', 'ADMIN', 'FRONTEND', 'GATEWAY', 'MARIADB', 'MONGODB', 'REDIS', 'RABBITMQ', 'KEYCLOAK', 'APP_TLS', 'SMTP', 'MAILPIT_UI']:
            with socket.socket() as reserved:
                reserved.bind(('127.0.0.1', 0))
                self.env['ORISO_' + name.upper() + '_PORT'] = str(reserved.getsockname()[1])
        for name, body in {
            'docker': 'case "$*" in *"compose version"*) echo 2.39.0;; *"info"*) echo ok;; *"volume inspect"*) echo \'Error: No such volume\' >&2; exit 1;; *"ps"*) :;; "compose "*) echo "$*" >> "$ORISO_TEST_TRACE";; esac',
            'java': 'echo \'openjdk version "21.0.8"\' >&2',
            'node': 'echo v22.12.0', 'npm': 'echo 10.9.0',
        }.items():
            path = self.bin / name
            path.write_text('#!/bin/sh\n' + body + '\n')
            path.chmod(0o755)

    def repo(self, name, backend=False):
        path = self.workspace / name
        path.mkdir()
        subprocess.run(['git', 'init', '-q', '-b', 'test-branch', str(path)], check=True)
        if backend:
            (path / 'pom.xml').write_text('<project><properties><java.version>21</java.version></properties></project>')
            mvnw = path / 'mvnw'
            mvnw.write_text('#!/bin/sh\nexit 7\n')
            mvnw.chmod(0o755)
            master = path / 'src/main/resources/db/changelog'
            master.mkdir(parents=True)
            (master / (name.removeprefix('ORISO-').lower() + '-master.xml')).write_text('<databaseChangeLog/>')
        else:
            (path / 'package.json').write_text(json.dumps({'engines': {'node': '^22.12.0'}, 'scripts': {'start': 'vite'}}))
            (path / 'package-lock.json').write_text('{}')
            (path / '.nvmrc').write_text('22.12.0\n')
        subprocess.run(['git', '-C', str(path), 'add', '.'], check=True)
        subprocess.run(['git', '-C', str(path), '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture'], check=True)
        return path

    def run_runner(self, *args, env=None):
        return subprocess.run(['/bin/bash', str(RUNNER), *args], env=env or self.env,
                              capture_output=True, text=True, timeout=15)

    def doctor(self, *args, env=None):
        result = self.run_runner('doctor', '--json', *args, env=env)
        self.assertNotIn('DO_NOT_PRINT_THIS', result.stdout + result.stderr)
        self.assertTrue(result.stdout.lstrip().startswith('{'), 'doctor must return a JSON object on errors')
        return result, json.loads(result.stdout)

class RunnerContracts(RunnerFixture, unittest.TestCase):
    def test_missing_repos_returns_json_without_writes(self):
        result, data = self.doctor('--services', 'admin')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('ORISO-Admin', str(data['errors']))
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_selected_admin_does_not_require_backend_java(self):
        self.repo('ORISO-Admin')
        (self.bin / 'java').write_text('#!/bin/sh\necho wrong >&2; exit 9\n')
        result, data = self.doctor('--services', 'admin')
        self.assertEqual(result.returncode, 0, data['errors'])
        self.assertEqual(data['selected_services'], ['admin'])
        self.assertNotIn('java', data['tools'])
        self.assertFalse(data['capabilities']['chat']['supported'])
        self.assertFalse(self.runtime.exists())

    def test_gitfile_worktree_reports_real_branch_and_sha(self):
        base = self.repo('ORISO-Admin')
        linked = self.workspace / 'linked'
        subprocess.run(['git', '-C', str(base), 'worktree', 'add', '-qb', 'linked-branch', str(linked)], check=True, capture_output=True)
        # A different parent lets the selected repo name still resolve to the worktree.
        other = Path(self.tmp.name) / 'other'
        other.mkdir()
        linked.rename(other / 'ORISO-Admin')
        subprocess.run(['git', '-C', str(base), 'worktree', 'repair', str(other / 'ORISO-Admin')], check=True, capture_output=True)
        result, data = self.doctor('--services', 'admin', '--workspace-root', str(other))
        self.assertEqual(result.returncode, 0, data['errors'])
        self.assertEqual(data['repositories']['ORISO-Admin']['branch'], 'linked-branch')
        self.assertRegex(data['repositories']['ORISO-Admin']['sha'], r'^[0-9a-f]{40}$')

    def test_unknown_service_is_rejected_before_start_writes(self):
        result = self.run_runner('start', '--services', 'admin typo')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_tls_listener_collision_is_rejected_before_writes(self):
        self.repo('ORISO-Admin')
        listener = socket.socket()
        listener.bind(('127.0.0.1', 0))
        listener.listen()
        self.addCleanup(listener.close)
        env = {**self.env, 'ORISO_APP_TLS_PORT': str(listener.getsockname()[1])}
        result, data = self.doctor('--services', 'admin', env=env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('app_tls', str(data['errors']))
        with socket.create_connection(listener.getsockname(), timeout=1):
            pass
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_missing_openssl_for_app_baseline_fails_before_writes(self):
        self.repo('ORISO-Admin')
        for name in ('python3', 'git', 'ps'):
            (self.bin / name).symlink_to(shutil.which(name))
        env = {**self.env, 'PATH': str(self.bin)}
        result, data = self.doctor('--services', 'admin', env=env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Missing tool: openssl', data['errors'])
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_future_required_backend_placeholder_fails_before_writes(self):
        repo = self.repo('ORISO-UserService', backend=True)
        resources = repo / 'src/main/resources'
        (resources / 'application.properties').write_text('future.bootstrap=${FUTURE_REQUIRED_BOOTSTRAP}\n# ignored=${COMMENT_ONLY_PLACEHOLDER}\noptional=${OPTIONAL_BOOTSTRAP:default}\n')
        result, data = self.doctor('--services', 'userservice')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('FUTURE_REQUIRED_BOOTSTRAP', str(data['errors']))
        self.assertIn('application.properties', str(data['errors']))
        self.assertNotIn('COMMENT_ONLY_PLACEHOLDER', str(data['errors']))
        self.assertNotIn('OPTIONAL_BOOTSTRAP', str(data['errors']))
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_mapped_required_backend_link_placeholders_pass_readonly_doctor(self):
        repo = self.repo('ORISO-UserService', backend=True)
        resources = repo / 'src/main/resources'
        (resources / 'application.properties').write_text('app.base.url=${APP_BASE_URL}\ndpa.sign.base.url=${DPA_SIGN_FRONTEND_BASE_URL}\n')
        (resources / 'application-dev.properties').write_text('invite.admin=${ACCOUNT_INVITE_ADMIN_FRONTEND_BASE_URL}\n')
        result, data = self.doctor('--services', 'userservice')
        self.assertEqual(result.returncode, 0, data['errors'])
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_wrong_java_version_rejected_before_start(self):
        self.repo('ORISO-UserService', backend=True)
        (self.bin / 'java').write_text('#!/bin/sh\necho \'openjdk version "17.0.12"\' >&2\n')
        result, data = self.doctor('--services', 'userservice')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('21', str(data['errors']))
        self.assertFalse(self.runtime.exists())

    def test_wrong_node_version_rejected_before_start(self):
        self.repo('ORISO-Admin')
        (self.bin / 'node').write_text('#!/bin/sh\necho v24.0.0\n')
        result = self.run_runner('start', '--services', 'admin')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Node does not satisfy', result.stderr)
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_unrelated_listener_is_not_killed(self):
        self.repo('ORISO-Admin')
        listener = socket.socket()
        listener.bind(('127.0.0.1', 0))
        listener.listen()
        self.addCleanup(listener.close)
        env = {**self.env, 'ORISO_ADMIN_PORT': str(listener.getsockname()[1])}
        result = self.run_runner('start', '--services', 'admin', env=env)
        self.assertNotEqual(result.returncode, 0)
        with socket.create_connection(listener.getsockname(), timeout=1):
            pass
        self.assertFalse(self.runtime.exists())

    def test_missing_tool_is_structured_error(self):
        self.repo('ORISO-Admin')
        env = {**self.env, 'PATH': str(self.bin)}
        (self.bin / 'python3').symlink_to(sys.executable)
        result, data = self.doctor('--services', 'admin', env=env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('git', str(data['errors']))

    def test_hybrid_requires_explicit_auth_url(self):
        self.repo('ORISO-Admin')
        env = {k:v for k,v in self.env.items() if k not in ('ORISO_DEV_KEYCLOAK_URL','ORISO_KEYCLOAK_URL')}
        result, data = self.doctor('--hybrid', '--services', 'admin', env=env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('ORISO_DEV_KEYCLOAK_URL', str(data['errors']))

    def test_service_start_failure_is_nonzero_and_existing_env_preserved(self):
        repo = self.repo('ORISO-Admin')
        existing = repo / '.env.local'
        existing.write_text('VITE_CUSTOM=user-choice\n')
        result = self.run_runner('start', 'services', '--services', 'admin')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(existing.read_text(), 'VITE_CUSTOM=user-choice\n')

    def test_backend_failure_propagates_readiness_timeout(self):
        repo = self.repo('ORISO-UserService', backend=True)
        module = BundleContracts.module
        args = module.parse(['start', 'services', '--services', 'userservice'])
        # Exercise the real failing backend command without bypassing infrastructure preflight.
        process = subprocess.Popen([str(repo / 'mvnw')], cwd=repo)
        process.wait(timeout=5)
        with self.assertRaisesRegex(module.ContractError, 'userservice.*readiness'):
            module.wait_readiness(args, {'userservice': process})

    def test_bad_arguments_doctor_is_valid_json(self):
        result, data = self.doctor('--services', 'unknown')
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(data['errors'])



class BundleContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('oriso_local', ROOT / 'local_development.py')
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def test_generated_admin_env_has_local_auth_and_is_preserved_on_second_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp)
            (workspace / 'ORISO-Admin').mkdir()
            args = self.module.parse(['doctor', '--workspace-root', tmp, '--services', 'admin'])
            self.module.write_ui_env(args, 'admin')
            env = workspace / 'ORISO-Admin/.env.local'
            self.assertIn('VITE_KEYCLOAK_URL=http://localhost:8080', env.read_text())
            edited = env.read_text() + 'USER_EDITS=preserved\n'
            env.write_text(edited)
            self.module.write_ui_env(args, 'admin')
            self.assertEqual(env.read_text(), edited)

    def test_bundled_compose_has_only_loopback_published_ports_and_owned_labels(self):
        # Parse via Docker's actual Compose consumer, not a source text assertion.
        docker = shutil.which('docker')
        if not docker:
            self.skipTest('docker CLI not installed')
        env = {**os.environ, 'ORISO_RUNTIME_DIR': '/tmp/oriso-test-no-write', 'ORISO_LOCAL_OWNER': 'test-owner'}
        result = subprocess.run([docker, 'compose', '-f', str(ROOT / 'compose.local.yml'), 'config', '--format', 'json'], env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual(set(data['services']), {'mariadb', 'mongodb', 'redis', 'rabbitmq', 'keycloak', 'mailpit'})
        realm = json.loads((ROOT / 'fixtures/local-realm.json').read_text())
        import_mount = next(mount for mount in data['services']['keycloak']['volumes'] if mount['target'].startswith('/opt/keycloak/data/import/'))
        self.assertEqual(Path(import_mount['target']).name, realm['realm'] + '-realm.json')
        for volume in data['volumes'].values():
            self.assertEqual(volume['labels']['org.oriso.local.owner'], 'test-owner')
        for name, service in data['services'].items():
            self.assertEqual(service['labels']['org.oriso.local.owner'], 'test-owner')
            self.assertNotIn('container_name', service)
            for port in service.get('ports', []):
                self.assertEqual(port['host_ip'], '127.0.0.1')

    def test_mailpit_capture_config_is_stateless_and_has_no_forwarding_credentials(self):
        docker = shutil.which('docker')
        if not docker:
            self.skipTest('docker CLI not installed')
        env = {**os.environ, 'ORISO_RUNTIME_DIR': '/tmp/oriso-test-no-write', 'ORISO_LOCAL_OWNER': 'test-owner',
               'ORISO_SMTP_PORT': '11025', 'ORISO_MAILPIT_UI_PORT': '18025', 'MP_SMTP_RELAY_CONFIG': 'remote-do-not-inherit', 'MP_SMTP_FORWARD_CONFIG': 'remote-do-not-inherit'}
        result = subprocess.run([docker, 'compose', '-f', str(ROOT / 'compose.local.yml'), 'config', '--format', 'json'], env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertIn('mailpit', list(data['services']), 'real local SMTP capture infrastructure is missing')
        capture = data['services']['mailpit']
        self.assertRegex(capture['image'], r'^ghcr.io/axllent/mailpit:v[0-9.]+@sha256:[0-9a-f]{64}$')
        self.assertEqual(capture['healthcheck']['test'], ['CMD', '/mailpit', 'readyz'])
        self.assertEqual({int(port['target']): int(port['published']) for port in capture['ports']}, {1025: 11025, 8025: 18025})
        self.assertFalse(capture.get('volumes'))
        self.assertNotIn('MP_SMTP_RELAY_CONFIG', capture.get('environment', {}))
        self.assertNotIn('MP_SMTP_FORWARD_CONFIG', capture.get('environment', {}))

    def test_http_error_and_non_up_health_are_rejected(self):
        from http.server import BaseHTTPRequestHandler, HTTPServer
        import threading
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(503 if self.path == '/error' else 200)
                self.end_headers()
                self.wfile.write(b'{"status":"DOWN"}')
            def log_message(self, *unused):
                pass
        server = HTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = 'http://127.0.0.1:' + str(server.server_port)
            self.assertFalse(self.module.healthy(base + '/error'))
            self.assertFalse(self.module.healthy(base + '/health', 'UP'))
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_stop_preserves_volumes_and_refuses_unowned_process(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = self.module.parse(['stop', 'all', '--workspace-root', tmp])
            args.runtime = Path(tmp) / 'runtime'
            self.module.claim_runtime(args)
            process = subprocess.Popen(['sleep', '30'])
            try:
                record = {'pid': process.pid, 'token': 'foreign-token', 'owner': args.owner}
                (args.runtime / 'pids/admin.json').write_text(json.dumps(record))
                with self.assertRaisesRegex(self.module.ContractError, 'ownership changed'):
                    self.module.stop(args)
                self.assertIsNone(process.poll())
            finally:
                process.terminate()
                process.wait()


class LifecycleContracts(RunnerFixture, unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        BundleContracts.setUpClass()
    def test_stop_all_never_requests_volume_removal(self):
        args = BundleContracts.module.parse(['stop', 'all', '--workspace-root', str(self.workspace)])
        args.runtime = self.runtime.resolve()
        args.owner = __import__('hashlib').sha256((str(args.workspace) + str(args.runtime) + str(ROOT)).encode()).hexdigest()
        BundleContracts.module.claim_runtime(args)
        result = self.run_runner('stop', 'all')
        self.assertEqual(result.returncode, 0, result.stderr)
        invoked = self.trace.read_text()
        self.assertIn('down --remove-orphans', invoked)
        self.assertNotIn('--volumes', invoked)
        self.assertNotIn(' -v', invoked)

    def test_owned_process_group_is_stopped_with_its_child(self):
        import time
        module = BundleContracts.module
        args = module.parse(['stop', 'all', '--workspace-root', str(self.workspace)])
        args.runtime = self.runtime.resolve()
        args.owner = __import__('hashlib').sha256((str(args.workspace) + str(args.runtime) + str(ROOT)).encode()).hexdigest()
        module.claim_runtime(args)
        token = 'integration-owned-token'
        process = subprocess.Popen([sys.executable, str(ROOT / 'local_development.py'), '_run', token,
                                    sys.executable, '-c', 'import time; time.sleep(30)'], start_new_session=True)
        try:
            time.sleep(0.2)
            children = subprocess.run(['pgrep', '-P', str(process.pid)], capture_output=True, text=True).stdout.split()
            self.assertTrue(children)
            (self.runtime / 'pids/admin.json').write_text(json.dumps({'pid': process.pid, 'token': token, 'owner': args.owner}))
            result = self.run_runner('stop', 'all')
            self.assertEqual(result.returncode, 0, result.stderr)
            process.wait(timeout=5)
            for child in children:
                probe = subprocess.run(['ps', '-p', child, '-o', 'stat='], capture_output=True, text=True).stdout.strip()
                self.assertTrue(not probe or probe.startswith('Z'), probe)
        finally:
            if process.poll() is None:
                os.killpg(process.pid, 15)
                process.wait(timeout=10)

    def test_start_services_refuses_incomplete_existing_infra(self):
        self.repo('ORISO-UserService', backend=True)
        module = BundleContracts.module
        args = module.parse(['start', 'services', '--workspace-root', str(self.workspace), '--services', 'userservice'])
        args.runtime = self.runtime.resolve()
        args.owner = __import__('hashlib').sha256((str(args.workspace) + str(args.runtime) + str(ROOT)).encode()).hexdigest()
        module.claim_runtime(args)
        docker = self.bin / 'docker'
        docker.write_text('#!/bin/sh\ncase "$*" in *"compose version"*) echo 2.39.0;; *"info"*) echo ok;; *"volume inspect"*) echo \'Error: No such volume\' >&2; exit 1;; *"ps"*) echo fixture-container;; *"inspect"*) echo "' + args.owner + '";; "compose "*) echo "$*" >> "$ORISO_TEST_TRACE";; esac\n')
        result = self.run_runner('start', 'services', '--services', 'userservice')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('infrastructure', result.stderr.lower())
        self.assertNotIn('already has containers', result.stderr)

    def test_malformed_port_is_rejected_before_mutations(self):
        result, data = self.doctor('--services', 'admin', env={**self.env, 'ORISO_ADMIN_PORT': 'DO_NOT_PRINT_THIS'})
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(data['errors'])
        self.assertFalse(self.runtime.exists())


class SafetyFollowups(RunnerFixture, unittest.TestCase):
    def test_existing_remote_env_is_rejected_before_writes_without_disclosure(self):
        repo = self.repo('ORISO-Admin')
        path = repo / '.env.local'
        source = 'VITE_API_URL=DO_NOT_PRINT_THIS.example.invalid\nVITE_KEYCLOAK_URL=https://remote.example.invalid\n'
        path.write_text(source)
        result, data = self.doctor('--services', 'admin')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('VITE_API_URL', str(data['errors']))
        self.assertEqual(path.read_text(), source)
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_exact_compose_volume_name_with_missing_project_label_is_not_adopted(self):
        self.repo('ORISO-Admin')
        docker = self.bin / 'docker'
        docker.write_text('#!/bin/sh\ncase "$*" in *"compose version"*) echo 2.39.0;; *"info"*) echo ok;; *"volume ls"*) :;; *"volume inspect"*) echo foreign-owner;; *"ps"*) :;; "compose "*) echo "$*" >> "$ORISO_TEST_TRACE";; esac\n')
        result, data = self.doctor('--services', 'admin')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('volume', str(data['errors']).lower())
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_hybrid_backend_requires_explicit_identity_credentials_before_writes(self):
        self.repo('ORISO-UserService', backend=True)
        env = {key:value for key,value in self.env.items() if not key.startswith(('KEYCLOAK_CONFIG_ADMIN_', 'IDENTITY_TECHNICAL_USER_'))}
        env['ORISO_DEV_KEYCLOAK_URL'] = 'https://auth.example.invalid'
        result, data = self.doctor('--hybrid', '--services', 'userservice', env=env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('IDENTITY_TECHNICAL_USER_PASSWORD', str(data['errors']))
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_hybrid_tenant_requires_explicit_external_technical_subject(self):
        self.repo('ORISO-TenantService', backend=True)
        env = {key:value for key,value in self.env.items() if key != 'TECHNICAL_SERVICE_SUBJECT'}
        env['ORISO_DEV_KEYCLOAK_URL'] = 'https://auth.example.invalid'
        result, data = self.doctor('--hybrid', '--services', 'tenantservice', env=env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('TECHNICAL_SERVICE_SUBJECT', str(data['errors']))
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())

    def test_existing_unowned_compose_volume_is_not_adopted(self):
        self.repo('ORISO-Admin')
        docker = self.bin / 'docker'
        docker.write_text('#!/bin/sh\ncase "$*" in *"compose version"*) echo 2.39.0;; *"info"*) echo ok;; *"volume ls"*) echo foreign-volume;; *"volume inspect"*) echo foreign-owner;; *"ps"*) :;; "compose "*) echo "$*" >> "$ORISO_TEST_TRACE";; esac\n')
        result, data = self.doctor('--services', 'admin')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('volume', str(data['errors']).lower())
        self.assertFalse(self.runtime.exists())
        self.assertFalse(self.trace.exists())


class RuntimeSafetyContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        BundleContracts.setUpClass()
        cls.module = BundleContracts.module

    def test_tls_edge_process_failure_blocks_readiness(self):
        class Exited:
            def poll(self):
                return 7
        args = self.module.parse(['start', '--services', 'admin'])
        args.timeout = .1
        with self.assertRaisesRegex(self.module.ContractError, 'app_tls.*readiness'):
            self.module.wait_readiness(args, {'app_tls': Exited()})

    def test_gateway_failure_blocks_readiness(self):
        class Exited:
            def poll(self):
                return 7
        args = self.module.parse(['start', '--services', 'admin'])
        args.timeout = .1
        class Alive:
            def poll(self):
                return None
        from unittest.mock import patch
        with patch.object(self.module, 'healthy', return_value=True), self.assertRaisesRegex(self.module.ContractError, 'gateway.*readiness'):
            self.module.wait_readiness(args, {'gateway': Exited(), 'admin': Alive()})

    def test_capture_smtp_ports_are_canonical_and_do_not_inherit_remote_auth(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {'ORISO_SMTP_PORT': '11025', 'ORISO_MAILPIT_UI_PORT': '18025', 'SMTP_USER': 'remote-username', 'SMTP_PASSWORD': 'remote-password', 'SPRING_MAIL_HOST': 'remote.example.invalid'}):
            args = self.module.parse(['start', '--services', 'userservice'])
            env = self.module.backend_env(args, 'userservice')
            self.assertEqual(env['SMTP_HOST'], '127.0.0.1')
            self.assertEqual(env['SMTP_PORT'], '11025')
            self.assertEqual(env['SPRING_MAIL_HOST'], '127.0.0.1')
            self.assertEqual(env['SPRING_MAIL_PORT'], '11025')
            self.assertEqual(env['SMTP_USER'], '')
            self.assertEqual(env['SMTP_PASSWORD'], '')
            self.assertFalse(self.module.CAPABILITIES['mail']['supported'])
            self.assertTrue(self.module.CAPABILITIES['local_capture']['supported'])

    def test_absent_smtp_causes_down_mail_component_and_blocks_readiness(self):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        import threading
        import smtplib
        with socket.socket() as reserved:
            reserved.bind(('127.0.0.1', 0))
            smtp_port = reserved.getsockname()[1]
        class Health(BaseHTTPRequestHandler):
            def do_GET(self):
                try:
                    with smtplib.SMTP('127.0.0.1', smtp_port, timeout=.1):
                        status = 'UP'
                except OSError:
                    status = 'DOWN'
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps({'status': status, 'components': {'mail': {'status': status}, 'db': {'status': 'UP'}}}).encode())
            def log_message(self, *unused):
                pass
        class Alive:
            def poll(self):
                return None
        server = ThreadingHTTPServer(('127.0.0.1', 0), Health)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            args = self.module.parse(['start', '--services', 'userservice'])
            args.ports['userservice'] = server.server_port
            args.timeout = .15
            with self.assertRaisesRegex(self.module.ContractError, 'readiness timed out.*userservice'):
                self.module.wait_readiness(args, {'userservice': Alive()})
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_local_backend_env_does_not_inherit_remote_credentials(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {'SMTP_HOST': 'remote.example.invalid', 'IDENTITY_TECHNICAL_USER_PASSWORD': 'DO_NOT_PRINT_THIS'}):
            args = self.module.parse(['start', '--services', 'userservice'])
            env = self.module.backend_env(args, 'userservice')
            self.assertEqual(env['SMTP_HOST'], '127.0.0.1')
            self.assertNotEqual(env['IDENTITY_TECHNICAL_USER_PASSWORD'], 'DO_NOT_PRINT_THIS')
            self.assertTrue(env['IDENTITY_TECHNICAL_USER_USERNAME'])
            self.assertEqual(env['AGENCY_ADMIN_SERVICE_API_URL'], 'http://127.0.0.1:' + str(args.ports['agencyservice']))

    def test_required_frontend_link_origins_are_local_and_do_not_inherit_remote(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {'ORISO_ADMIN_PORT': '19000', 'ORISO_FRONTEND_PORT': '19002', 'ORISO_APP_TLS_PORT': '19443', 'APP_BASE_URL': 'https://remote.example.invalid', 'DPA_SIGN_FRONTEND_BASE_URL': 'https://remote.example.invalid'}):
            args = self.module.parse(['start', '--services', 'userservice consultingtypeservice admin'])
            env = self.module.backend_env(args, 'userservice')
            for key in ('APP_BASE_URL', 'DPA_SIGN_FRONTEND_BASE_URL', 'MAGIC_LINK_FRONTEND_BASE_URL', 'SYSTEM_NOTIFICATION_FRONTEND_BASE_URL', 'ACCOUNT_INVITE_APP_FRONTEND_BASE_URL'):
                self.assertEqual(env.get(key), 'https://localhost:19443', key)
            self.assertEqual(env.get('ACCOUNT_INVITE_ADMIN_FRONTEND_BASE_URL'), 'http://localhost:19000')

    def test_local_technical_subject_matches_imported_realm_identity_and_role(self):
        import uuid
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'TECHNICAL_SERVICE_SUBJECT': 'external-subject-never-local'}):
            args = self.module.parse(['start', '--workspace-root', tmp, '--services', 'tenantservice'])
            self.module.claim_runtime(args)
            realm = json.loads(self.module.write_realm(args).read_text())
            user = next(user for user in realm['users'] if user['username'] == 'local-technical')
            self.assertIn('id', user, 'technical realm identity needs a stable explicit subject')
            subject = self.module.backend_env(args, 'tenantservice').get('TECHNICAL_SERVICE_SUBJECT')
            self.assertEqual(subject, user['id'])
            self.assertEqual(str(uuid.UUID(subject)), subject)
            self.assertIn('technical', user['realmRoles'])
            self.assertNotEqual(subject, 'external-subject-never-local')

    def test_hybrid_backend_preserves_explicit_external_subject(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {'TECHNICAL_SERVICE_SUBJECT': 'explicit-external-subject'}):
            args = self.module.parse(['start', '--hybrid', '--services', 'tenantservice'])
            self.assertEqual(self.module.backend_env(args, 'tenantservice').get('TECHNICAL_SERVICE_SUBJECT'), 'explicit-external-subject')
        without_subject = {key: value for key,value in os.environ.items() if key != 'TECHNICAL_SERVICE_SUBJECT'}
        with patch.dict(os.environ, without_subject, clear=True):
            self.assertEqual(self.module.backend_env(args, 'tenantservice').get('TECHNICAL_SERVICE_SUBJECT'), '')

    def test_local_hmac_bootstrap_keys_are_distinct_and_unsupported_matrix_sync_is_disabled(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {'STATISTICS_MESSAGE_COUNT_HMAC_SECRET': 'remote-statistics-secret', 'MATRIXRTC_CALL_POLICY_HMAC_SECRET': 'remote-call-secret', 'MATRIX_EVENT_LISTENER_ENABLED': 'true'}):
            args = self.module.parse(['start', '--services', 'userservice'])
            env = self.module.backend_env(args, 'userservice')
            statistics = env.get('STATISTICS_MESSAGE_COUNT_HMAC_SECRET', '')
            calls = env.get('MATRIXRTC_CALL_POLICY_HMAC_SECRET', '')
            self.assertTrue(statistics)
            self.assertTrue(calls)
            self.assertNotEqual(statistics, calls)
            self.assertNotEqual(statistics, 'remote-statistics-secret')
            self.assertNotEqual(calls, 'remote-call-secret')
            self.assertEqual(env.get('MATRIX_EVENT_LISTENER_ENABLED'), 'false')

    def test_persisted_realm_contract_changes_with_fixture_identity(self):
        from unittest.mock import patch
        args = self.module.parse(['start', '--services', 'tenantservice'])
        first = self.module.realm_contract(args)
        original = self.module.Path.read_bytes
        def fixture_changed(path):
            data = original(path)
            return data + b'\n' if path.name == 'local-realm.json' else data
        with patch.object(self.module.Path, 'read_bytes', fixture_changed):
            self.assertNotEqual(self.module.realm_contract(args), first)

    def test_selected_frontend_realm_redirects_include_actual_https_edge(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'ORISO_APP_TLS_PORT': '19443'}):
            args = self.module.parse(['start', '--workspace-root', tmp, '--services', 'frontend'])
            self.module.claim_runtime(args)
            realm = json.loads(self.module.write_realm(args).read_text())
            app = next(client for client in realm['clients'] if client['clientId'] == 'app')
            self.assertIn('https://localhost:19443', app['webOrigins'])
            self.assertIn('https://localhost:19443/*', app['redirectUris'])

    def test_failure_logs_redact_credentials_and_auth_queries(self):
        self.assertTrue(hasattr(self.module, 'redact_log'), 'startup failure log redaction is missing')
        source = 'ERROR failed: password=DO_NOT_PRINT_THIS\nERROR URL http://user:password@localhost/path?access_token=synthetic-value\nERROR File name / realm name mismatch\n'
        result = self.module.redact_log(source, {'SMTP_PASSWORD': 'DO_NOT_PRINT_THIS'})
        self.assertNotIn('DO_NOT_PRINT_THIS', result)
        self.assertNotIn('user:password@', result)
        self.assertNotIn('synthetic-value', result)
        self.assertIn('File name / realm name mismatch', result)

    def test_runtime_realm_origins_match_custom_ports(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'ORISO_ADMIN_PORT': '19000', 'ORISO_FRONTEND_PORT': '19002'}):
            args = self.module.parse(['start', '--workspace-root', tmp])
            self.module.claim_runtime(args)
            self.assertTrue(hasattr(self.module, 'write_realm'), 'runtime realm port configuration is missing')
            path = self.module.write_realm(args)
            realm = json.loads(path.read_text())
            app = next(client for client in realm['clients'] if client['clientId'] == 'app')
            self.assertIn('http://localhost:19000', app['webOrigins'])
            self.assertIn('http://127.0.0.1:19002', app['webOrigins'])
            if 'frontend' in args.selected:
                self.assertIn('https://localhost:9443', app['webOrigins'])
            self.assertEqual(path.name, 'online-beratung-realm.json')
            self.assertEqual(set(user['username'] for user in realm['users']), {'local-admin', 'local-technical'})


class AppTlsContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        BundleContracts.setUpClass()
        cls.module = BundleContracts.module

    def test_tls_edge_real_certificate_readiness_and_unselected_frontend_503(self):
        from unittest.mock import patch
        import urllib.request
        import urllib.error
        import ssl
        import time
        if not shutil.which('openssl'):
            self.skipTest('openssl not installed')
        with tempfile.TemporaryDirectory() as tmp:
            with socket.socket() as reserved:
                reserved.bind(('127.0.0.1', 0))
                port = reserved.getsockname()[1]
            with patch.dict(os.environ, {'ORISO_APP_TLS_PORT': str(port)}):
                args = self.module.parse(['start', '--workspace-root', tmp, '--services', 'admin'])
            self.module.claim_runtime(args)
            self.assertTrue(hasattr(self.module, 'app_tls_config'), 'owned TLS app edge is missing')
            config_path = self.module.app_tls_config(args)
            config = json.loads(config_path.read_text())
            cert = Path(config['tls_cert'])
            key = Path(config['tls_key'])
            self.assertEqual(key.stat().st_mode & 0o777, 0o600)
            original = cert.read_bytes()
            self.module.app_tls_config(args)
            self.assertEqual(cert.read_bytes(), original)
            process = subprocess.Popen([sys.executable, str(ROOT / 'local_gateway.py'), str(config_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                url = 'https://localhost:' + str(port)
                end = time.monotonic() + 5
                while time.monotonic() < end and not self.module.healthy(url + '/__oriso_local_health', 'UP', cafile=cert):
                    time.sleep(.05)
                self.assertTrue(self.module.healthy(url + '/__oriso_local_health', 'UP', cafile=cert))
                self.assertFalse(self.module.healthy(url + '/__oriso_local_health', 'UP'))
                other = self.module.parse(['start', '--workspace-root', str(Path(tmp) / 'other'), '--services', 'admin'])
                self.module.claim_runtime(other)
                other_config = json.loads(self.module.app_tls_config(other).read_text())
                self.assertFalse(self.module.healthy(url + '/__oriso_local_health', 'UP', cafile=other_config['tls_cert']))
                ip_url = 'https://127.0.0.1:' + str(port)
                self.assertTrue(self.module.healthy(ip_url + '/__oriso_local_health', 'UP', cafile=cert))
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=str(cert))))
                with self.assertRaises(urllib.error.HTTPError) as raised:
                    opener.open(url + '/dpa/sign/example', timeout=2)
                self.assertEqual(raised.exception.code, 503)
                raised.exception.close()
            finally:
                process.terminate()
                process.wait(timeout=5)

    def test_tls_app_proxy_forwards_to_selected_frontend(self):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        import threading
        import urllib.request
        import ssl
        from unittest.mock import patch
        spec = importlib.util.spec_from_file_location('tls_gateway', ROOT / 'local_gateway.py')
        gateway = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(gateway)
        class Frontend(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'frontend-fixture')
            def log_message(self, *unused):
                pass
        upstream = ThreadingHTTPServer(('127.0.0.1', 0), Frontend)
        thread = threading.Thread(target=upstream.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {'ORISO_FRONTEND_PORT': str(upstream.server_port)}):
                args = self.module.parse(['start', '--workspace-root', tmp, '--services', 'frontend'])
                self.module.claim_runtime(args)
                self.assertTrue(hasattr(self.module, 'app_tls_config'), 'owned TLS app edge is missing')
                config = json.loads(self.module.app_tls_config(args).read_text())
                config['port'] = 0
                self.assertTrue(hasattr(gateway, 'server'), 'gateway must construct an actual TLS socket')
                proxy = gateway.server(config)
                proxy_thread = threading.Thread(target=proxy.serve_forever, daemon=True)
                proxy_thread.start()
                try:
                    context = ssl.create_default_context(cafile=config['tls_cert'])
                    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=context))
                    with opener.open('https://localhost:' + str(proxy.server_port) + '/dpa/sign/example') as response:
                        self.assertEqual(response.read(), b'frontend-fixture')
                finally:
                    proxy.shutdown()
                    proxy.server_close()
                    proxy_thread.join()
        finally:
            upstream.shutdown()
            upstream.server_close()
            thread.join()


class GatewayContracts(unittest.TestCase):
    def test_gateway_forwards_api_auth_and_http_failures_on_loopback(self):
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
        import threading
        import urllib.request
        import urllib.error
        self.assertTrue((ROOT / 'local_gateway.py').is_file(), 'portable loopback gateway is missing')
        spec = importlib.util.spec_from_file_location('gateway', ROOT / 'local_gateway.py')
        gateway = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(gateway)
        class Target(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(503 if self.path == '/users/failure' else 200)
                self.send_header('Set-Cookie', 'synthetic-one=1; Path=/')
                self.send_header('Set-Cookie', 'synthetic-two=2; Path=/')
                self.end_headers()
                self.wfile.write(json.dumps({'path': self.path, 'host': self.headers['Host']}).encode())
            def log_message(self, *unused):
                pass
        upstream = ThreadingHTTPServer(('127.0.0.1', 0), Target)
        target = 'http://127.0.0.1:' + str(upstream.server_port)
        proxy = ThreadingHTTPServer(('127.0.0.1', 0), gateway.handler({'auth': target, 'routes': {'users': {'url': target}, 'tenant': {'url': target, 'host': 'localhost.localhost'}}}))
        threads = []
        for server in (upstream, proxy):
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            threads.append(thread)
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        base = 'http://127.0.0.1:' + str(proxy.server_port)
        try:
            for suffix, expected in [('/service/users/data?x=1', '/users/data?x=1'), ('/auth/realms/local', '/realms/local')]:
                with opener.open(base + suffix) as response:
                    self.assertEqual(json.load(response)['path'], expected)
                    self.assertEqual(len(response.headers.get_all('Set-Cookie')), 2)
            with opener.open(base + '/service/tenant') as response:
                self.assertEqual(json.load(response)['host'], 'localhost.localhost')
            for path, status in [('/service/users/failure', 503), ('/service/live', 404)]:
                with self.assertRaises(urllib.error.HTTPError) as raised:
                    opener.open(base + path)
                self.assertEqual(raised.exception.code, status)
                raised.exception.close()
            request = urllib.request.Request(base + '/service/users/data', method='OPTIONS', headers={'Origin': 'http://localhost:9000'})
            with opener.open(request) as response:
                self.assertEqual(response.status, 204)
                self.assertEqual(response.headers['Access-Control-Allow-Origin'], 'http://localhost:9000')
        finally:
            for server in (proxy, upstream):
                server.shutdown()
                server.server_close()
            for thread in threads:
                thread.join()


if __name__ == '__main__':
    unittest.main()
