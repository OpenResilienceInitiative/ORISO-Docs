#!/usr/bin/env python3
"""Local development contracts and lifecycle. Doctor never creates files or starts services."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import socket
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import uuid

HERE = Path(__file__).resolve().parent
SERVICES = {
    'userservice': {'repo': 'ORISO-UserService', 'port': 8082, 'db': 'userservice'},
    'tenantservice': {'repo': 'ORISO-TenantService', 'port': 8081, 'db': 'tenantservice'},
    'agencyservice': {'repo': 'ORISO-AgencyService', 'port': 8084, 'db': 'agencyservice'},
    'consultingtypeservice': {'repo': 'ORISO-ConsultingTypeService', 'port': 8083, 'db': 'consultingtypeservice'},
    'admin': {'repo': 'ORISO-Admin', 'port': 9000, 'script': 'start', 'health': '/admin'},
    'frontend': {'repo': 'ORISO-Frontend', 'port': 9002, 'script': 'dev', 'health': '/'},
}
INFRA_PORTS = {'mariadb': 3306, 'mongodb': 27017, 'redis': 6379, 'rabbitmq': 5672, 'keycloak': 8080, 'smtp': 1025, 'mailpit_ui': 8025}
CAPABILITIES = {
    'api_admin': {'supported': True, 'scope': 'four APIs and selected UI'},
    'local_auth': {'supported': True, 'scope': 'synthetic realm, stock Keycloak; production SPI flows excluded'},
    'chat': {'supported': False, 'reason': 'Matrix/Synapse and Rocket.Chat are not bundled'},
    'call': {'supported': False, 'reason': 'LiveKit/Element Call/TURN are not bundled'},
    'mail': {'supported': False, 'reason': 'Outbound delivery is not configured; Mailpit captures locally'},
    'local_capture': {'supported': True, 'scope': 'loopback SMTP capture and inbox; stateless, no outbound relay'},
    'dpa': {'supported': False, 'reason': 'HTTPS edge is infrastructure; browser trust, frontend selection and signing journey require separate verification'},
}


class ContractError(Exception):
    pass


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ContractError('Invalid command or options; use --help')


def command(argv, cwd=None, timeout=15, env=None):
    try:
        return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=timeout, env=env)
    except (OSError, subprocess.TimeoutExpired):
        return None


def output(argv, cwd=None):
    result = command(argv, cwd)
    return result.stdout.strip() if result and result.returncode == 0 else ''


def parse(argv):
    p = Parser(description='Isolated ORISO local development; no remote auth by default.')
    p.add_argument('command', choices=['doctor', 'check', 'branches', 'start', 'stop', 'status', 'logs', 'init-db', 'gateway'])
    p.add_argument('target', nargs='?')
    p.add_argument('--json', action='store_true')
    p.add_argument('--workspace-root', default=os.environ.get('ORISO_WORKSPACE_ROOT'))
    p.add_argument('--ui', choices=['admin', 'frontend', 'both', 'none'], default=os.environ.get('ORISO_UI', 'admin'))
    p.add_argument('--services', default=os.environ.get('ORISO_SERVICES'))
    p.add_argument('--hybrid', action='store_true')
    p.add_argument('-f', '--follow', action='store_true')
    args = p.parse_args(argv)
    if args.ui not in ('admin', 'frontend', 'both', 'none'):
        raise ContractError('ORISO_UI must be admin, frontend, both, or none')
    args.target = args.target or ('services' if args.command == 'stop' else 'all')
    if args.services is not None:
        selected = list(dict.fromkeys(args.services.replace(',', ' ').split()))
        if not selected:
            raise ContractError('--services must select at least one service')
    else:
        selected = [s for s in SERVICES if 'db' in SERVICES[s]]
        selected += {'admin': ['admin'], 'frontend': ['frontend'], 'both': ['admin', 'frontend'], 'none': []}[args.ui]
    unknown = [s for s in selected if s not in SERVICES]
    if unknown:
        raise ContractError('Unknown service; supported: ' + ', '.join(SERVICES))
    if args.command in ('start', 'stop', 'doctor', 'check') and args.target not in ('all', 'infra', 'services'):
        raise ContractError('Target must be all, infra, or services')
    args.selected = [] if args.target == 'infra' else selected
    args.mode = 'hybrid' if args.hybrid else os.environ.get('ORISO_MODE', 'local')
    if args.mode not in ('local', 'hybrid'):
        raise ContractError('ORISO_MODE must be local or hybrid')
    # Resolve linked worktrees by Git, rather than assuming .git is a directory.
    candidate = Path(args.workspace_root).expanduser() if args.workspace_root else HERE.parent.parent
    args.workspace = candidate.resolve()
    digest = hashlib.sha256((str(args.workspace) + str(HERE)).encode()).hexdigest()[:10]
    args.project = os.environ.get('ORISO_COMPOSE_PROJECT', 'oriso-local-' + digest)
    if not re.fullmatch(r'oriso-local-[a-z0-9][a-z0-9_-]*', args.project):
        raise ContractError('ORISO_COMPOSE_PROJECT must start oriso-local- and contain only lowercase letters, digits, _ or -')
    args.runtime = Path(os.environ.get('ORISO_RUNTIME_DIR', str(args.workspace / '.oriso-local' / args.project))).expanduser().resolve()
    args.owner = hashlib.sha256((str(args.workspace) + str(args.runtime) + str(HERE)).encode()).hexdigest()
    args.ports = {name: int(os.environ.get('ORISO_' + name.upper() + '_PORT', spec['port'])) for name, spec in SERVICES.items()}
    args.ports.update({name: int(os.environ.get('ORISO_' + name.upper() + '_PORT', port)) for name, port in INFRA_PORTS.items()})
    args.ports['gateway'] = int(os.environ.get('ORISO_GATEWAY_PORT', '8088'))
    args.ports['app_tls'] = int(os.environ.get('ORISO_APP_TLS_PORT', '9443'))
    if any(port < 1024 or port > 65535 for port in args.ports.values()):
        raise ContractError('Ports must be unprivileged integers between 1024 and 65535')
    args.timeout = float(os.environ.get('ORISO_READY_TIMEOUT', '300'))
    if not 0 < args.timeout <= 3600:
        raise ContractError('ORISO_READY_TIMEOUT must be >0 and <=3600 seconds')
    args.auth = os.environ.get('ORISO_DEV_KEYCLOAK_URL', '').rstrip('/') if args.mode == 'hybrid' else f'http://localhost:{args.ports["keycloak"]}'
    return args


def infra_services(args):
    names = ['mariadb', 'mongodb', 'redis', 'rabbitmq', 'mailpit']
    if args.mode == 'local':
        names.append('keycloak')
    return names


def needed_ports(args):
    names = list(args.selected)
    if args.target != 'infra':
        names += ['gateway', 'app_tls']
    if args.target != 'services':
        for service in infra_services(args):
            names += ['smtp', 'mailpit_ui'] if service == 'mailpit' else [service]
    return {name: args.ports[name] for name in names}


def available(port):
    # Binding detects listeners on wildcard addresses too; release immediately.
    try:
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', port))
        return True
    except OSError:
        return False


def java_required(path):
    tree = ET.parse(path)
    values = {node.tag.rsplit('}', 1)[-1]: (node.text or '').strip() for node in tree.iter()}
    for field in ('java.version', 'maven.compiler.release', 'maven.compiler.source'):
        value = values.get(field, '')
        if value.isdigit():
            return int(value)
    raise ContractError('No concrete Java version in pom.xml')


def required_backend_env_errors(args, service, repo):
    env = backend_env(args, service)
    errors = []
    for name in ('application.properties', 'application-dev.properties'):
        path = repo / 'src/main/resources' / name
        if not path.is_file():
            continue
        for number, line in enumerate(path.read_text().splitlines(), 1):
            if line.lstrip().startswith(('#', '!')):
                continue
            for key in re.findall(r'\$\{([A-Z][A-Z0-9_]*)\}', line):
                if not env.get(key, '').strip():
                    errors.append(SERVICES[service]['repo'] + ': unresolved mandatory ' + key + ' in ' + name + ':' + str(number))
    return errors


def node_satisfies(version, requirement):
    nums = re.match(r'^v?(\d+)\.(\d+)\.(\d+)', version)
    if not nums:
        return False
    actual = tuple(map(int, nums.groups()))
    caret = re.fullmatch(r'\^(\d+)\.(\d+)\.(\d+)', requirement.strip())
    if caret:
        minimum = tuple(map(int, caret.groups()))
        return actual >= minimum and actual[0] == minimum[0]
    bounds = re.fullmatch(r'>=\s*(\d+)(?:\.\d+\.\d+)?\s*<\s*(\d+)', requirement.strip())
    if bounds:
        return int(bounds[1]) <= actual[0] < int(bounds[2])
    exact = re.fullmatch(r'(\d+)\.(\d+)\.(\d+)', requirement.strip())
    return bool(exact) and actual == tuple(map(int, exact.groups()))


def doctor(args):
    report = {'schema_version': 1, 'ready': False, 'workspace_root': str(args.workspace),
              'project': args.project, 'runtime_dir': str(args.runtime), 'mode': args.mode,
              'target': args.target, 'selected_services': args.selected, 'tools': {},
              'repositories': {}, 'ports': {}, 'capabilities': CAPABILITIES, 'errors': [], 'warnings': []}
    errors = report['errors']
    if not args.workspace.is_dir():
        errors.append('Workspace root is missing')
    if args.mode == 'hybrid':
        url = urllib.parse.urlsplit(args.auth)
        if url.scheme not in ('http', 'https') or not url.hostname or url.username or url.password or url.query or url.fragment:
            errors.append('Hybrid mode requires explicit ORISO_DEV_KEYCLOAK_URL without credentials/query/fragment')
        if 'tenantservice' in args.selected:
            subject = os.environ.get('TECHNICAL_SERVICE_SUBJECT', '').strip()
            if not subject:
                errors.append('Hybrid tenantservice requires explicit TECHNICAL_SERVICE_SUBJECT from external Keycloak')
            elif subject == local_technical_subject():
                errors.append('Hybrid TECHNICAL_SERVICE_SUBJECT must be the actual external identity; local fixture subject is not accepted')
        if 'userservice' in args.selected:
            for key in ('KEYCLOAK_CONFIG_ADMIN_USERNAME', 'KEYCLOAK_CONFIG_ADMIN_PASSWORD', 'IDENTITY_TECHNICAL_USER_USERNAME', 'IDENTITY_TECHNICAL_USER_PASSWORD'):
                if not os.environ.get(key):
                    errors.append('Hybrid userservice requires explicit ' + key + '; no local credentials will be used remotely')
    elif os.environ.get('ORISO_KEYCLOAK_URL', args.auth).rstrip('/') != args.auth:
        errors.append('Local mode uses bundled loopback auth; remote auth requires --hybrid')
    tools = ['git', 'docker']
    if args.target != 'infra':
        tools += ['ps', 'openssl']
    if any('db' in SERVICES[s] for s in args.selected):
        tools.append('java')
    if any('script' in SERVICES[s] for s in args.selected):
        tools += ['node', 'npm']
    for tool in tools:
        path = shutil.which(tool)
        report['tools'][tool] = {'path': path, 'available': bool(path)}
        if not path:
            errors.append('Missing tool: ' + tool)
    if report['tools']['docker']['available']:
        if not output(['docker', 'compose', 'version', '--short']):
            errors.append('Docker Compose v2 is required')
        else:
            info = command(['docker', 'info', '--format', '{{.ServerVersion}}'])
            if not info or info.returncode != 0:
                errors.append('Docker daemon is unavailable')
        report['tools']['docker']['version'] = output(['docker', '--version'])
        report['tools']['docker']['compose_version'] = output(['docker', 'compose', 'version', '--short'])
        # Existing containers never get adopted just because a project name matches.
        existing = output(['docker', 'ps', '-aq', '--filter', 'label=com.docker.compose.project=' + args.project])
        if args.target == 'services':
            errors.extend(existing_infra_errors(args, existing.split()))
        elif existing:
            errors.append('Compose project already has containers; use status/stop all before start')
    if report['tools']['docker']['available']:
        discovered = output(['docker', 'volume', 'ls', '-q', '--filter', 'label=com.docker.compose.project=' + args.project]).split()
        # Compose resolves by exact volume name even when an old/foreign volume has no project label.
        known = [args.project + '_' + name for name in ('mariadb-data', 'mongo-data', 'redis-data', 'rabbit-data', 'keycloak-data')]
        for volume in sorted(set(discovered + known)):
            probe = command(['docker', 'volume', 'inspect', '--format', '{{ index .Labels "org.oriso.local.owner" }}', volume])
            if probe and probe.returncode != 0 and 'no such volume' in probe.stderr.lower():
                continue
            if not probe or probe.returncode != 0:
                errors.append('Cannot verify existing Compose volume ownership; no resources will be started')
                continue
            if probe.stdout.strip() != args.owner:
                errors.append('Existing Compose volume has different or missing ownership; choose a new project/runtime')
            project = output(['docker', 'volume', 'inspect', '--format', '{{ index .Labels "com.docker.compose.project" }}', volume])
            if project != args.project:
                errors.append('Existing Compose volume has a different or missing project label; choose a new project/runtime')
            kind = output(['docker', 'volume', 'inspect', '--format', '{{ index .Labels "com.docker.compose.volume" }}', volume])
            if volume == args.project + '_keycloak-data' or kind == 'keycloak-data':
                contract = output(['docker', 'volume', 'inspect', '--format', '{{ index .Labels "org.oriso.local.realm-contract" }}', volume])
                if contract != realm_contract(args):
                    errors.append('Persisted Keycloak realm uses a different port/origin contract; choose a new project/runtime')
    for service in args.selected:
        spec = SERVICES[service]
        repo = args.workspace / spec['repo']
        metadata = {'path': str(repo), 'branch': None, 'sha': None, 'required_runtime': None}
        report['repositories'][spec['repo']] = metadata
        if not (repo / '.git').exists():
            errors.append('Missing Git repository: ' + spec['repo'])
            continue
        if not report['tools']['git']['available']:
            continue
        metadata['sha'] = output(['git', 'rev-parse', 'HEAD'], repo) or None
        metadata['branch'] = output(['git', 'symbolic-ref', '--quiet', '--short', 'HEAD'], repo) or '(detached)'
        if not metadata['sha']:
            errors.append('No commit in repository: ' + spec['repo'])
        try:
            if 'script' in spec and (repo / '.env.local').exists():
                errors.extend(validate_ui_env(args, service))
            if 'db' in spec:
                errors.extend(required_backend_env_errors(args, service, repo))
                required = java_required(repo / 'pom.xml')
                metadata['required_runtime'] = {'java': required, 'source': 'pom.xml'}
                if not (repo / 'mvnw').is_file() or not os.access(repo / 'mvnw', os.X_OK):
                    errors.append(spec['repo'] + ': executable mvnw is required')
                master = repo / ('src/main/resources/db/changelog/' + spec['db'] + '-master.xml')
                if not master.is_file():
                    errors.append(spec['repo'] + ': Liquibase master is missing')
                java = command(['java', '-version'])
                text = java.stdout + java.stderr if java else ''
                match = re.search(r'version "(\d+)(?:\.\d+)*', text)
                observed = int(match[1]) if match else None
                if os.environ.get('JAVA_HOME'):
                    home_java = command([str(Path(os.environ['JAVA_HOME']) / 'bin/java'), '-version'])
                    home_text = home_java.stdout + home_java.stderr if home_java else ''
                    home_match = re.search(r'version "(\d+)(?:\.\d+)*', home_text)
                    if not home_match or int(home_match[1]) != required:
                        errors.append(spec['repo'] + ': JAVA_HOME must also provide Java ' + str(required))
                report['tools']['java']['version'] = observed
                if observed != required:
                    errors.append(spec['repo'] + ': requires Java ' + str(required) + '; select it explicitly with JAVA_HOME and PATH')
            else:
                package = json.loads((repo / 'package.json').read_text())
                requirement = package.get('engines', {}).get('node')
                if not requirement:
                    raise ContractError('package.json engines.node is missing')
                if not re.fullmatch(r'\^\d+\.\d+\.\d+|>=\s*\d+\s*<\s*\d+|\d+\.\d+\.\d+', requirement):
                    raise ContractError('Unsupported Node engine contract')
                metadata['required_runtime'] = {'node': requirement, 'source': 'package.json',
                                                 'nvmrc': (repo / '.nvmrc').read_text().strip() if (repo / '.nvmrc').exists() else None}
                version = output(['node', '--version'])
                report['tools']['node']['version'] = version
                if not node_satisfies(version, requirement):
                    errors.append(spec['repo'] + ': Node does not satisfy ' + requirement + '; select the source .nvmrc explicitly')
                if spec['script'] not in package.get('scripts', {}):
                    errors.append(spec['repo'] + ': npm script ' + spec['script'] + ' is missing')
                if not (repo / 'package-lock.json').is_file():
                    errors.append(spec['repo'] + ': package-lock.json required for reproducible npm ci')
        except (OSError, ValueError, ET.ParseError, ContractError):
            errors.append(spec['repo'] + ': missing or invalid source runtime contract')
    ports = needed_ports(args)
    if len(set(ports.values())) != len(ports):
        errors.append('Selected services have duplicate ports')
    for name, port in ports.items():
        free = available(port)
        report['ports'][name] = {'host': '127.0.0.1', 'port': port, 'available': free}
        if not free:
            errors.append(name + ': port ' + str(port) + ' is occupied; no listener will be stopped')
    if args.mode == 'hybrid':
        report['capabilities'] = {**CAPABILITIES, 'local_auth': {'supported': False, 'reason': 'explicit external auth selected'}}
        report['warnings'].append('Hybrid auth is external and is not provisioned by this runner')
    for file in ('compose.local.yml', 'fixtures/local-realm.json', 'fixtures/databases.sql', 'local_gateway.py'):
        if not (HERE / file).is_file():
            errors.append('Bundled local infrastructure input missing: ' + file)
    report['app_edge'] = {'origin': app_origin(args), 'cafile': str(args.runtime / 'app-edge-cert.pem'),
                          'frontend_selected': 'frontend' in args.selected, 'trust_scope': 'runtime certificate only; no system/browser trust changes'}
    report['ready'] = not errors
    return report


def existing_infra_errors(args, containers):
    """Read-only prerequisite for starting native services against retained infrastructure."""
    try:
        verify_owner(args)
    except (ContractError, ValueError, OSError):
        return ['start services requires an owned runtime and healthy infrastructure; run start infra first']
    expected = set(infra_services(args))
    found = set()
    errors = []
    for container in containers:
        result = command(['docker', 'inspect', container])
        try:
            if not result or result.returncode:
                raise ValueError('inspection failed')
            details, = json.loads(result.stdout)
            labels = details['Config']['Labels']
            service = labels['com.docker.compose.service']
            state = details['State']
            if (labels.get('org.oriso.local.owner') != args.owner or
                    labels.get('com.docker.compose.project') != args.project or
                    service not in expected or service in found or
                    state.get('Running') is not True or state.get('Health', {}).get('Status') != 'healthy'):
                raise ValueError('ownership or health mismatch')
            found.add(service)
        except (ValueError, KeyError, TypeError, AttributeError):
            errors.append('Existing infrastructure must contain only owned, running, healthy services')
    if found != expected:
        errors.append('Missing healthy owned infrastructure: ' + ', '.join(sorted(expected - found)))
    if not errors and not healthy(args.auth + '/realms/online-beratung/.well-known/openid-configuration',
                                  args.auth + '/realms/online-beratung', auth=True):
        errors.append('Authentication metadata is unavailable or has the wrong issuer; no services will start')
    return errors


def emit(report, json_mode):
    if json_mode:
        print(json.dumps(report, indent=2))
    else:
        print('[oriso-local] ' + ('READY' if report['ready'] else 'NOT READY') + ': ' + report.get('project', 'configuration'))
        for error in report['errors']:
            print('[oriso-local] ERROR: ' + error, file=sys.stderr)
        for name, meta in report.get('repositories', {}).items():
            print(name + ': ' + str(meta['branch']) + ' ' + str(meta['sha']))


def compose_env(args):
    env = dict(os.environ)
    env.update({'ORISO_RUNTIME_DIR': str(args.runtime), 'ORISO_LOCAL_OWNER': args.owner, 'ORISO_REALM_CONTRACT': realm_contract(args)})
    for name, port in args.ports.items():
        env['ORISO_' + name.upper() + '_PORT'] = str(port)
    return env


def compose(args, *argv):
    return ['docker', 'compose', '--project-name', args.project, '--file', str(HERE / 'compose.local.yml'), *argv]


def run_compose(args, *argv):
    result = subprocess.run(compose(args, *argv), env=compose_env(args))
    if result.returncode:
        raise ContractError('Compose command failed; owned resources can be stopped with stop all')


def redact_log(source, env=None):
    for key, value in (env or os.environ).items():
        if re.search(r'SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|PRIVATE_KEY|API_KEY', key, re.I) and len(value) >= 4:
            source = source.replace(value, '[redacted]')
    source = re.sub(r'(https?://)[^/\s@]+:[^/\s@]+@', r'\1[redacted]@', source)
    source = re.sub(r'((?:access_token|refresh_token|id_token|password|client_secret)=)[^&\s]+', r'\1[redacted]', source, flags=re.I)
    source = re.sub(r'(\b(?:password|passwd|secret|token)\s*[:=]\s*)[^\s,]+', r'\1[redacted]', source, flags=re.I)
    return source


def capture_start_failure(args):
    # Read container logs before rollback removes failed containers. Never print raw command output.
    result = command(compose(args, 'logs', '--no-color', '--tail', '200'), timeout=15, env=compose_env(args))
    if result and result.stdout:
        path = args.runtime / 'logs' / 'infra-failure.log'
        path.write_text(redact_log(result.stdout))
        path.chmod(0o600)
        print('[oriso-local] Sanitized infrastructure failure log: ' + str(path), file=sys.stderr)


def claim_runtime(args):
    marker = args.runtime / 'owner.json'
    expected = {'owner': args.owner, 'workspace': str(args.workspace), 'project': args.project}
    if marker.exists() and json.loads(marker.read_text()) != expected:
        raise ContractError('Runtime directory belongs to a different workspace/project')
    args.runtime.mkdir(parents=True, exist_ok=True, mode=0o700)
    marker.write_text(json.dumps(expected))
    (args.runtime / 'logs').mkdir(exist_ok=True)
    (args.runtime / 'pids').mkdir(exist_ok=True)


def ui_env(args, service):
    common = {'BROWSER': 'none', 'VITE_KEYCLOAK_URL': args.auth, 'VITE_KEYCLOAK_REALM': 'online-beratung', 'VITE_KEYCLOAK_CLIENT_ID': 'app'}
    if service == 'admin':
        common.update({'VITE_PORT': str(args.ports[service]), 'VITE_API_URL': 'localhost:' + str(args.ports['gateway']),
                       'VITE_USE_API_URL': 'true', 'VITE_USE_HTTPS': 'false', 'VITE_COOKIE_DOMAIN': 'localhost',
                       'VITE_COOKIE_SECURE': 'false', 'VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT': 'X-CSRF-Token'})
    else:
        common.update({'VITE_API_URL': 'http://localhost:' + str(args.ports['gateway']), 'VITE_AUTH_URL': args.auth,
                       'REACT_APP_API_URL': 'http://localhost:' + str(args.ports['gateway']),
                       'REACT_APP_KEYCLOAK_ORIGIN': args.auth, 'REACT_APP_KEYCLOAK_REALM': 'online-beratung',
                       'REACT_APP_KEYCLOAK_CLIENT_ID': 'app', 'PORT': str(args.ports[service]), 'HOST': '127.0.0.1',
                       'HTTPS': 'false', 'WDS_SOCKET_PORT': str(args.ports[service]), 'PUBLIC_URL': '/'})
    return common


def validate_ui_env(args, service):
    path = args.workspace / SERVICES[service]['repo'] / '.env.local'
    actual = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('export '):
            line = line[7:]
        key, sep, value = line.partition('=')
        if sep:
            actual[key.strip()] = value.strip().strip('"\'')
    errors = []
    for key, expected in ui_env(args, service).items():
        if key == 'BROWSER':
            continue
        if actual.get(key) != expected:
            errors.append(service + ': .env.local conflicts with selected local routing/auth contract at ' + key + '; file preserved')
    return errors


def write_ui_env(args, service):
    path = args.workspace / SERVICES[service]['repo'] / '.env.local'
    if path.exists():
        if validate_ui_env(args, service):
            raise ContractError(service + ': .env.local changed after preflight; file preserved')
        print('[oriso-local] Keeping existing .env.local for ' + service)
        return
    try:
        with path.open('x') as stream:
            stream.write('\n'.join(f'{key}={value}' for key, value in ui_env(args, service).items()) + '\n')
    except FileExistsError:
        if validate_ui_env(args, service):
            raise ContractError(service + ': concurrent .env.local creation conflicts; file preserved')


def local_technical_subject():
    realm = json.loads((HERE / 'fixtures/local-realm.json').read_text())
    identities = [user for user in realm['users'] if user.get('username') == 'local-technical']
    if len(identities) != 1 or 'technical' not in identities[0].get('realmRoles', []):
        raise ContractError('Local realm must contain exactly one local-technical identity with technical role')
    subject = identities[0].get('id', '')
    if not subject or str(uuid.UUID(subject)) != subject:
        raise ContractError('Local technical identity must have a canonical UUID subject')
    return subject


def realm_contract(args):
    # Imports skip existing realms. Persist this contract with the volume instead of claiming changed origins were applied.
    config = {'admin_port': args.ports['admin'], 'frontend_port': args.ports['frontend'], 'auth': args.auth,
              'fixture_sha256': hashlib.sha256((HERE / 'fixtures/local-realm.json').read_bytes()).hexdigest(),
              'app_tls_port': args.ports['app_tls']}
    return hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()


def write_realm(args):
    realm = json.loads((HERE / 'fixtures/local-realm.json').read_text())
    origins = [f'http://{host}:{args.ports[service]}' for service in ('admin', 'frontend') for host in ('localhost', '127.0.0.1')]
    # The retained realm supports later UI selection without re-importing or widening beyond loopback.
    origins += [f'https://{host}:{args.ports["app_tls"]}' for host in ('localhost', '127.0.0.1')]
    for client in realm['clients']:
        client['webOrigins'] = origins
        client['redirectUris'] = [origin + '/*' for origin in origins]
    path = args.runtime / (realm['realm'] + '-realm.json')
    path.write_text(json.dumps(realm, indent=2) + '\n')
    path.chmod(0o600)
    return path


def gateway_config(args):
    routes = {'users': 'userservice', 'useradmin': 'userservice', 'matrix': 'userservice', 'conversations': 'userservice',
              'tenant': 'tenantservice', 'tenantadmin': 'tenantservice', 'agencyadmin': 'agencyservice', 'agencies': 'agencyservice',
              'topic': 'consultingtypeservice', 'topic-groups': 'consultingtypeservice', 'consultingtypes': 'consultingtypeservice',
              'settingsadmin': 'consultingtypeservice', 'settings': 'consultingtypeservice'}
    config = {'auth': args.auth, 'port': args.ports['gateway'], 'routes': {}}
    for route, service in routes.items():
        if service not in args.selected:
            continue
        target = {'url': 'http://127.0.0.1:' + str(args.ports[service])}
        if service == 'tenantservice':
            target['host'] = 'localhost.localhost'
        config['routes'][route] = target
    path = args.runtime / 'gateway.json'
    path.write_text(json.dumps(config))
    return path


def app_origin(args):
    return f'https://localhost:{args.ports["app_tls"]}'


def app_tls_config(args):
    verify_owner(args)
    cert = args.runtime / 'app-edge-cert.pem'
    key = args.runtime / 'app-edge-key.pem'
    if cert.is_symlink() or key.is_symlink():
        raise ContractError('TLS material must be regular files inside the owned runtime')
    if cert.exists() != key.exists():
        raise ContractError('Incomplete owned TLS certificate/key pair; refusing to overwrite it')
    renew = not cert.exists()
    if not renew:
        # A valid pair is retained. Renew within one day of expiry, before starting a listener.
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=str(cert), keyfile=str(key))
        expiry = command(['openssl', 'x509', '-in', str(cert), '-checkend', '86400', '-noout'])
        if not expiry or expiry.returncode not in (0, 1):
            raise ContractError('Cannot verify the owned TLS certificate lifetime')
        renew = expiry.returncode == 1
    if renew:
        if not available(args.ports['app_tls']):
            raise ContractError('Cannot renew TLS material while the app edge port is in use')
        record = args.runtime / 'pids/app_tls.json'
        if record.exists():
            pid = int(json.loads(record.read_text())['pid'])
            try:
                os.kill(pid, 0)
            except ProcessLookupError:
                pass
            except PermissionError:
                raise ContractError('Cannot verify that the previous TLS process stopped')
            else:
                raise ContractError('Stop the owned TLS process before renewing its certificate')
        config = args.runtime / 'app-edge-openssl.cnf'
        config.write_text("""[req]
prompt = no
distinguished_name = dn
x509_extensions = server_cert
[dn]
CN = localhost
[server_cert]
subjectAltName = DNS:localhost,IP:127.0.0.1
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
""")
        with tempfile.TemporaryDirectory(prefix='.app-edge-', dir=args.runtime) as staged:
            new_key, new_cert = Path(staged) / 'key.pem', Path(staged) / 'cert.pem'
            result = command(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30',
                              '-config', str(config), '-keyout', str(new_key), '-out', str(new_cert)], timeout=30)
            if not result or result.returncode != 0:
                raise ContractError('Owned local TLS certificate generation failed; existing pair preserved')
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(certfile=str(new_cert), keyfile=str(new_key))
            new_key.chmod(0o600)
            new_cert.chmod(0o600)
            new_key.replace(key)
            new_cert.replace(cert)
    key.chmod(0o600)
    cert.chmod(0o600)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=str(cert), keyfile=str(key))
    config = {'app_edge': True, 'port': args.ports['app_tls'], 'tls_cert': str(cert), 'tls_key': str(key),
              'frontend': {'url': f'http://127.0.0.1:{args.ports["frontend"]}'} if 'frontend' in args.selected else None}
    path = args.runtime / 'app-edge.json'
    path.write_text(json.dumps(config))
    return path


def backend_env(args, service):
    blocked = ('SPRING_', 'KEYCLOAK_', 'MATRIX_', 'MATRIXRTC_', 'ROCKET_', 'SMTP_', 'IDENTITY_', 'MAIL_', 'TENANT_', 'USER_', 'AGENCY_', 'CONSULTING_', 'MANAGEMENT_OTLP_', 'TECHNICAL_', 'STATISTICS_')
    env = {key: value for key, value in os.environ.items() if not key.startswith(blocked)}
    auth = args.auth
    local = '127.0.0.1'
    env.update({
        'SERVER_ADDRESS': local, 'SERVER_PORT': str(args.ports[service]), 'SPRING_PROFILES_ACTIVE': 'dev',
        'KEYCLOAK_AUTH_SERVER_URL': auth, 'KEYCLOAK_REALM': 'online-beratung',
        'KEYCLOAK_CONFIG_ADMIN_USERNAME': 'local-admin', 'KEYCLOAK_CONFIG_ADMIN_PASSWORD': 'local-only-admin',
        'SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI': auth + '/realms/online-beratung',
        'SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI': auth + '/realms/online-beratung/protocol/openid-connect/certs',
        'IDENTITY_OPENID_CONNECT_URL': auth + '/realms/online-beratung/protocol/openid-connect',
        'IDENTITY_TECHNICAL_USER_USERNAME': 'local-technical', 'IDENTITY_TECHNICAL_USER_PASSWORD': 'local-only-technical',
        'TECHNICAL_SERVICE_SUBJECT': local_technical_subject(),
        'STATISTICS_MESSAGE_COUNT_HMAC_SECRET': 'local-only-statistics-' + args.owner,
        'MATRIXRTC_CALL_POLICY_HMAC_SECRET': 'local-only-call-policy-' + args.owner,
        'MATRIX_EVENT_LISTENER_ENABLED': 'false',
        'SMTP_HOST': local, 'SMTP_PORT': str(args.ports['smtp']), 'SMTP_SECURE': 'false', 'SMTP_USER': '',
        'SMTP_PASSWORD': '', 'SMTP_FROM': 'local@example.invalid', 'SMTP_REQUIRED': 'false',
        'APP_BASE_URL': app_origin(args),
        'DPA_SIGN_FRONTEND_BASE_URL': app_origin(args),
        'MAGIC_LINK_FRONTEND_BASE_URL': app_origin(args),
        'SYSTEM_NOTIFICATION_FRONTEND_BASE_URL': app_origin(args),
        'ACCOUNT_INVITE_APP_FRONTEND_BASE_URL': app_origin(args),
        'ACCOUNT_INVITE_ADMIN_FRONTEND_BASE_URL': f'http://localhost:{args.ports["admin"]}',
        'SPRING_DATASOURCE_URL': f'jdbc:mariadb://{local}:{args.ports["mariadb"]}/{SERVICES[service]["db"]}',
        'SPRING_DATASOURCE_USERNAME': 'oriso_local', 'SPRING_DATASOURCE_PASSWORD': 'local-only-database',
        'SPRING_LIQUIBASE_ENABLED': 'true', 'SPRING_LIQUIBASE_CONTEXTS': 'dev,seed', 'SPRING_JPA_HIBERNATE_DDL_AUTO': 'validate',
        'SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE': '5', 'SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE': '1',
        'SPRING_RABBITMQ_HOST': local, 'SPRING_RABBITMQ_PORT': str(args.ports['rabbitmq']),
        'SPRING_RABBITMQ_USERNAME': 'oriso_local', 'SPRING_RABBITMQ_PASSWORD': 'local-only-rabbit',
        'SPRING_DATA_MONGODB_URI': f'mongodb://{local}:{args.ports["mongodb"]}/consulting_types?retryWrites=false',
        'SPRING_DATA_REDIS_HOST': local, 'SPRING_DATA_REDIS_PORT': str(args.ports['redis']),
        'MATRIX_API_URL': 'http://127.0.0.1:8008', 'MATRIX_SERVER_NAME': 'localhost',
        'MATRIX_ADMIN_USERNAME': 'unconfigured-local', 'MATRIX_ADMIN_PASSWORD': 'unconfigured-local',
        'MATRIX_REGISTRATION_SHARED_SECRET': 'unconfigured-local', 'ROCKET_CHAT_BASE_URL': 'http://127.0.0.1:3000',
        'ROCKET_CHAT_MONGO_URL': f'mongodb://{local}:{args.ports["mongodb"]}/rocketchat?retryWrites=false',
        'ROCKET_TECHNICAL_USERNAME': 'unconfigured-local', 'ROCKET_TECHNICAL_PASSWORD': 'unconfigured-local',
        'SPRING_MAIL_HOST': local, 'SPRING_MAIL_PORT': str(args.ports['smtp']), 'SPRING_MAIL_USERNAME': '', 'SPRING_MAIL_PASSWORD': '',
    })
    for name, service_name in [('TENANT', 'tenantservice'), ('USER', 'userservice'), ('USER_ADMIN', 'userservice'), ('AGENCY', 'agencyservice'), ('AGENCY_ADMIN', 'agencyservice'), ('CONSULTING_TYPE', 'consultingtypeservice')]:
        env[name + '_SERVICE_API_URL'] = f'http://{local}:{args.ports[service_name]}'
    if args.mode == 'hybrid':
        # Explicit only; local credentials must never be tried against remote auth.
        for key in ('KEYCLOAK_CONFIG_ADMIN_USERNAME', 'KEYCLOAK_CONFIG_ADMIN_PASSWORD', 'IDENTITY_TECHNICAL_USER_USERNAME', 'IDENTITY_TECHNICAL_USER_PASSWORD', 'TECHNICAL_SERVICE_SUBJECT'):
            env[key] = os.environ.get(key, '')
    return env


def spawn(args, service):
    spec = SERVICES[service]
    repo = args.workspace / spec['repo']
    if 'script' in spec:
        write_ui_env(args, service)
        if not (repo / 'node_modules').exists():
            with (args.runtime / 'logs' / (service + '-install.log')).open('w') as log:
                result = subprocess.run(['npm', 'ci'], cwd=repo, stdout=log, stderr=subprocess.STDOUT)
            if result.returncode:
                raise ContractError(service + ': npm ci failed; inspect owned install log')
        launch = ['npm', 'run', spec['script'], '--', '--host', '127.0.0.1', '--port', str(args.ports[service]), '--strictPort']
        env = {key: value for key, value in os.environ.items() if not key.startswith(('VITE_', 'REACT_APP_'))}
        env.update(ui_env(args, service))
        if service == 'frontend':
            launch = ['npm', 'run', spec['script']]
            env.update({'HOST': '127.0.0.1', 'PORT': str(args.ports[service]), 'WDS_SOCKET_PORT': str(args.ports[service]), 'HTTPS': 'false'})
    else:
        launch = ['./mvnw', 'spring-boot:run', '-Dspring-boot.run.profiles=dev', '-Dmaven.test.skip=true']
        env = backend_env(args, service)
    return spawn_process(args, service, launch, repo, env)


def spawn_process(args, name, launch, cwd, env):
    token = secrets.token_hex(16)
    # The wrapper stays alive while children run, so stop can prove group ownership.
    wrapper = [sys.executable, str(HERE / 'local_development.py'), '_run', token, *launch]
    with (args.runtime / 'logs' / (name + '.log')).open('w') as log:
        process = subprocess.Popen(wrapper, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True)
    record = {'pid': process.pid, 'token': token, 'owner': args.owner}
    (args.runtime / 'pids' / (name + '.json')).write_text(json.dumps(record))
    return process


def healthy(url, expected=None, auth=False, cafile=None):
    try:
        # Local health must ignore machine proxy settings.
        handlers = [urllib.request.ProxyHandler({})]
        if cafile is not None:
            handlers.append(urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=str(cafile))))
        opener = urllib.request.build_opener(*handlers)
        with opener.open(url, timeout=2) as response:
            if response.status != 200:
                return False
            if auth:
                return json.load(response).get('issuer') == expected
            if expected:
                return json.load(response).get('status') == expected
            return True
    except urllib.error.HTTPError as exc:
        exc.close()
        return False
    except (OSError, ValueError, urllib.error.URLError):
        return False


def wait_readiness(args, processes):
    remaining = set(processes)
    end = time.monotonic() + args.timeout
    while remaining and time.monotonic() < end:
        for name in list(remaining):
            spec = SERVICES.get(name, {'health': '/__oriso_local_health'})
            if processes[name].poll() is not None:
                raise ContractError(name + ': readiness failed; process exited. Inspect owned service log')
            if name == 'app_tls':
                ready = healthy(app_origin(args) + '/__oriso_local_health', 'UP', cafile=args.runtime / 'app-edge-cert.pem')
            else:
                ready = healthy(f'http://127.0.0.1:{args.ports[name]}' + spec.get('health', '/actuator/health'), 'UP' if 'db' in spec or name == 'gateway' else None)
            if ready:
                remaining.remove(name)
        if remaining:
            time.sleep(min(0.25, max(0, end - time.monotonic())))
    if remaining:
        raise ContractError('readiness timed out for ' + ', '.join(sorted(remaining)) + '; inspect owned logs')


def start(args):
    report = doctor(args)
    if not report['ready']:
        emit(report, args.json)
        return 1
    claim_runtime(args)
    gateway_path = gateway_config(args)
    if args.mode == 'local':
        write_realm(args)
    if args.target != 'services':
        run_compose(args, 'up', '-d', '--wait', '--wait-timeout', str(max(1, int(args.timeout))), *infra_services(args))
        if args.mode == 'local' and not healthy(args.auth + '/realms/online-beratung/.well-known/openid-configuration', args.auth + '/realms/online-beratung', auth=True):
            # Health status and metadata are separate: import can lag behind server readiness.
            end = time.monotonic() + args.timeout
            while time.monotonic() < end:
                if healthy(args.auth + '/realms/online-beratung/.well-known/openid-configuration', args.auth + '/realms/online-beratung', auth=True):
                    break
                time.sleep(0.25)
            else:
                raise ContractError('Keycloak auth metadata readiness timed out')
    if args.target == 'infra':
        print('[oriso-local] Infra ready; application services have not started')
        return 0
    tls_path = app_tls_config(args)
    tls_edge = spawn_process(args, 'app_tls', [sys.executable, str(HERE / 'local_gateway.py'), str(tls_path)], args.runtime, dict(os.environ))
    gateway = spawn_process(args, 'gateway', [sys.executable, str(HERE / 'local_gateway.py'), str(gateway_path)], args.runtime, dict(os.environ))
    processes = {'gateway': gateway, 'app_tls': tls_edge}
    for service in args.selected:
        processes[service] = spawn(args, service)
    wait_readiness(args, processes)
    print('[oriso-local] Ready: ' + ', '.join(args.selected))
    return 0


def verify_owner(args):
    marker = args.runtime / 'owner.json'
    if not marker.is_file():
        raise ContractError('No owned runtime marker; nothing will be stopped')
    expected = {'owner': args.owner, 'workspace': str(args.workspace), 'project': args.project}
    if json.loads(marker.read_text()) != expected:
        raise ContractError('Runtime ownership does not match; nothing will be stopped')


def stop(args):
    verify_owner(args)
    for record_path in (args.runtime / 'pids').glob('*.json'):
        record = json.loads(record_path.read_text())
        pid = int(record['pid'])
        cmd = output(['ps', '-p', str(pid), '-o', 'command='])
        if not cmd:
            record_path.unlink()
            continue
        if record.get('owner') != args.owner or record['token'] not in cmd or str(HERE / 'local_development.py') not in cmd:
            raise ContractError('Process ownership changed; refusing to stop PID ' + str(pid))
        if os.getpgid(pid) != pid:
            raise ContractError('Process is not its owned group leader')
        os.killpg(pid, signal.SIGTERM)
        end = time.monotonic() + 5
        while time.monotonic() < end:
            state = output(['ps', '-p', str(pid), '-o', 'stat='])
            if not state or state.startswith('Z'):
                break
            time.sleep(0.1)
        else:
            cmd = output(['ps', '-p', str(pid), '-o', 'command='])
            if record['token'] in cmd and str(HERE / 'local_development.py') in cmd and os.getpgid(pid) == pid:
                os.killpg(pid, signal.SIGKILL)
            else:
                raise ContractError('Process ownership changed during stop; refusing escalation')
        # No unverified PID reuse escalation. SIGTERM is sent only after ownership checks.
        record_path.unlink()
    ids = output(['docker', 'ps', '-aq', '--filter', 'label=com.docker.compose.project=' + args.project])
    for container in ids.split():
        owner = output(['docker', 'inspect', '--format', '{{ index .Config.Labels "org.oriso.local.owner" }}', container])
        if owner != args.owner:
            raise ContractError('Compose project contains a container owned by someone else')
    if args.target == 'all':
        run_compose(args, 'down', '--remove-orphans')  # Preserve every named volume.
    print('[oriso-local] Owned processes stopped; named volumes preserved')
    return 0


def routing_ready(args, name):
    """Require the owned routing process and its HTTP/TLS forwarding boundary."""
    try:
        verify_owner(args)
        record = json.loads((args.runtime / 'pids' / (name + '.json')).read_text())
        pid = int(record['pid'])
        cmd = output(['ps', '-p', str(pid), '-o', 'command='])
        if (record.get('owner') != args.owner or not record.get('token') or
                record['token'] not in cmd or str(HERE / 'local_development.py') not in cmd or
                os.getpgid(pid) != pid):
            return False
    except (ContractError, OSError, ValueError, KeyError, TypeError):
        return False
    if name == 'gateway':
        origin = f'http://127.0.0.1:{args.ports[name]}'
        return (healthy(origin + '/__oriso_local_health', 'UP') and
                healthy(origin + '/auth/realms/online-beratung/.well-known/openid-configuration',
                        args.auth + '/realms/online-beratung', auth=True))
    origin = app_origin(args)
    cert = args.runtime / 'app-edge-cert.pem'
    return (healthy(origin + '/__oriso_local_health', 'UP', cafile=cert) and
            ('frontend' not in args.selected or healthy(origin + '/', cafile=cert)))


def main(argv):
    if argv and argv[0] == '_run':
        child = subprocess.Popen(argv[2:])
        def terminate(_sig, _frame):
            # Do not call wait() from a signal handler: main wait may hold its lock.
            if child.poll() is None:
                child.terminate()
        signal.signal(signal.SIGTERM, terminate)
        return child.wait()
    args = None
    try:
        args = parse(argv)
        if args.command in ('doctor', 'check', 'branches'):
            report = doctor(args)
            emit(report, args.json)
            return 0 if report['ready'] else 1
        if args.command == 'start':
            try:
                return start(args)
            except (ContractError, OSError, ValueError, subprocess.SubprocessError):
                if (args.runtime / 'owner.json').exists():
                    try:
                        capture_start_failure(args)
                    except OSError:
                        pass
                    original_target = args.target
                    args.target = 'all' if original_target != 'services' else 'services'
                    try:
                        stop(args)
                    except (ContractError, OSError, ValueError, subprocess.SubprocessError):
                        print('[oriso-local] Rollback needs attention; use stop all with the same workspace/runtime/project', file=sys.stderr)
                raise
        if args.command == 'stop':
            # Historical stop (no target) keeps infra; stop all tears it down.
            return stop(args)
        if args.command == 'status':
            subprocess.run(compose(args, 'ps'), env=compose_env(args), check=True)
            all_ready = True
            for service in args.selected:
                spec = SERVICES[service]
                ready = healthy(f'http://127.0.0.1:{args.ports[service]}' + spec.get('health', '/actuator/health'), 'UP' if 'db' in spec else None)
                print(service + ': ' + ('ready' if ready else 'unavailable'))
                all_ready = all_ready and ready
            for name in ('gateway', 'app_tls'):
                ready = routing_ready(args, name)
                print(name + ': ' + ('ready' if ready else 'unavailable'))
                all_ready = all_ready and ready
            return 0 if all_ready else 1
        if args.command == 'logs':
            if args.target not in (*SERVICES, 'gateway', 'app_tls'):
                raise ContractError('logs requires a selected application service')
            path = args.runtime / 'logs' / (args.target + '.log')
            if args.follow:
                with path.open() as stream:
                    while True:
                        line = stream.readline()
                        if line:
                            print(redact_log(line), end='', flush=True)
                        else:
                            time.sleep(0.25)
            print(redact_log(path.read_text()[-12000:]))
            return 0
        raise ContractError('init-db/gateway are integrated into start; use start infra or start services')
    except (ContractError, ValueError, OSError, subprocess.SubprocessError) as exc:
        # Never echo arbitrary inputs, command output, URLs or environment values here.
        safe = str(exc) if isinstance(exc, ContractError) else 'Invalid configuration or local operation failed'
        if argv and argv[0] == 'doctor' and '--json' in argv:
            emit({'schema_version': 1, 'ready': False, 'errors': [safe], 'tools': {}, 'repositories': {}, 'ports': {}, 'selected_services': [], 'capabilities': CAPABILITIES}, True)
        else:
            print('[oriso-local] ERROR: ' + safe, file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
