#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/Deployment/local/docker-compose.local.generated.yml"
RUNTIME_DIR="${SCRIPT_DIR}/.local-runtime"
LOG_DIR="${RUNTIME_DIR}/logs"
PID_DIR="${RUNTIME_DIR}/pids"
NGINX_CONF="${RUNTIME_DIR}/nginx.conf"

JAVA_11_VERSION="${ORISO_JAVA_11_VERSION:-11.0.24-tem}"
JAVA_17_VERSION="${ORISO_JAVA_17_VERSION:-17.0.12-tem}"
GATEWAY_PORT="${ORISO_GATEWAY_PORT:-8088}"
ADMIN_PORT="${ORISO_ADMIN_PORT:-9000}"
FRONTEND_PORT="${ORISO_FRONTEND_PORT:-9002}"
KEYCLOAK_URL="${ORISO_KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_URL="${KEYCLOAK_URL%/}"
KEYCLOAK_REALM="${ORISO_KEYCLOAK_REALM:-online-beratung}"
KEYCLOAK_CONFIG_ADMIN_USERNAME="${ORISO_KEYCLOAK_CONFIG_ADMIN_USERNAME:-admin}"
KEYCLOAK_CONFIG_ADMIN_PASSWORD="${ORISO_KEYCLOAK_CONFIG_ADMIN_PASSWORD:-local_admin_change_me}"
UI_MODE="${ORISO_UI:-admin}"
SERVICE_OVERRIDE="${ORISO_SERVICES:-}"

REPOS=(ORISO-Admin ORISO-Frontend ORISO-UserService ORISO-TenantService ORISO-AgencyService ORISO-ConsultingTypeService)
BACKEND_SERVICES=(userservice tenantservice agencyservice consultingtypeservice)
ALL_SERVICES=(userservice tenantservice agencyservice consultingtypeservice admin frontend)

usage() {
  cat <<EOF
Status:
  Work in progress. Use this as the shared local-development baseline and update
  ORISO-Docs/services-local-setup when missing local setup steps are discovered.

Usage:
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh <command> [args]

Commands:
  check [options]        Check required tools, branches, Docker, and Java hints.
  branches               Show current local repo branches and local-change summary.
  start [options]        Start infra, DB init, API gateway, all backend services, and selected UI.
  start services [opts]  Start only background app services and gateway. Infra must already run.
  start infra            Start only Docker infra.
  init-db                Create service DBs/users and import schemas if missing.
  gateway                Start/restart the local API gateway on port ${GATEWAY_PORT}.
  status                 Show Docker containers, local PIDs, and health endpoints.
  logs <service>         Show recent logs for userservice, tenantservice, agencyservice, consultingtypeservice, admin, frontend, or gateway.
  logs -f <service>      Follow logs.
  stop                   Stop app services and gateway. Docker infra is left running.
  stop all               Stop app services, gateway, and Docker infra. Volumes are preserved.

Environment:
  ORISO_UI=admin|frontend|both|none                 Select UI for "start". Default: admin.
  ORISO_SERVICES="userservice tenantservice admin"  Override exact app services for "start".
  ORISO_JAVA_11_VERSION=11.0.24-tem                 SDKMAN Java 11 candidate.
  ORISO_JAVA_17_VERSION=17.0.12-tem                 SDKMAN Java 17 candidate.
  ORISO_GATEWAY_PORT=8088                           Local API gateway port.
  ORISO_ADMIN_PORT=9000                             Admin Vite port.
  ORISO_FRONTEND_PORT=9002                          ORISO-Frontend dev server port.
  ORISO_KEYCLOAK_URL=http://localhost:8080           Keycloak base URL.
  ORISO_KEYCLOAK_REALM=online-beratung              Keycloak realm.
  ORISO_KEYCLOAK_CONFIG_ADMIN_USERNAME=admin         Keycloak admin username used by backend clients.
  ORISO_KEYCLOAK_CONFIG_ADMIN_PASSWORD=...           Keycloak admin password used by backend clients.

Examples:
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh check
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh branches
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui admin
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui frontend
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui both
  ORISO_SERVICES="userservice tenantservice admin" ./ORISO-Docs/services-local-setup/run-oriso-local.sh start
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh logs userservice
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh stop

Options:
  --ui admin|frontend|both|none        Run all backend services plus selected UI.
  --services "<service list>"          Override exact services, bypassing --ui selection.
EOF
}

log() {
  printf '[oriso-local] %s\n' "$*"
}

warn() {
  printf '[oriso-local] WARNING: %s\n' "$*" >&2
}

die() {
  printf '[oriso-local] ERROR: %s\n' "$*" >&2
  exit 1
}

validate_ui_mode() {
  case "${UI_MODE}" in
    admin|frontend|both|none)
      ;;
    *)
      die "Invalid UI mode: ${UI_MODE}. Use admin, frontend, both, or none."
      ;;
  esac
}

selected_services() {
  if [[ -n "${SERVICE_OVERRIDE}" ]]; then
    printf '%s\n' "${SERVICE_OVERRIDE}"
    return 0
  fi

  local services="${BACKEND_SERVICES[*]}"
  case "${UI_MODE}" in
    admin)
      services="${services} admin"
      ;;
    frontend)
      services="${services} frontend"
      ;;
    both)
      services="${services} admin frontend"
      ;;
    none)
      ;;
  esac
  printf '%s\n' "${services}"
}

parse_common_options() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --ui)
        [[ $# -ge 2 ]] || die "--ui requires admin, frontend, both, or none"
        UI_MODE="$2"
        shift 2
        ;;
      --services)
        [[ $# -ge 2 ]] || die "--services requires a quoted service list"
        SERVICE_OVERRIDE="$2"
        shift 2
        ;;
      -h|--help|help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done
  validate_ui_mode
}

parse_start_args() {
  START_TARGET="all"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      all|infra|services)
        START_TARGET="$1"
        shift
        ;;
      --ui|--services)
        [[ $# -ge 2 ]] || die "$1 requires a value"
        parse_common_options "$1" "$2"
        shift 2
        ;;
      -h|--help|help)
        parse_common_options "$1"
        shift
        ;;
      *)
        die "Unknown start argument: $1"
        ;;
    esac
  done
  validate_ui_mode
}

ensure_runtime_dirs() {
  mkdir -p "${LOG_DIR}" "${PID_DIR}"
}

need_command() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || die "Missing required command: ${cmd}"
}

optional_command() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || warn "Optional command not found: ${cmd}"
}

docker_running() {
  docker info >/dev/null 2>&1
}

using_local_keycloak() {
  [[ "${KEYCLOAK_URL}" == "http://localhost:8080" || "${KEYCLOAK_URL}" == "http://127.0.0.1:8080" ]]
}

port_accepts_connections() {
  local host="$1"
  local port="$2"
  (echo >"/dev/tcp/${host}/${port}") >/dev/null 2>&1
}

keycloak_gateway_upstream() {
  printf 'http://host.docker.internal:8080'
}

load_sdkman() {
  if [[ -s "${SDKMAN_DIR:-$HOME/.sdkman}/bin/sdkman-init.sh" ]]; then
    local restore_errexit=0
    local restore_nounset=0
    [[ $- == *e* ]] && restore_errexit=1
    [[ $- == *u* ]] && restore_nounset=1

    set +e +u
    # shellcheck disable=SC1090
    source "${SDKMAN_DIR:-$HOME/.sdkman}/bin/sdkman-init.sh"
    local sdkman_status=$?
    [[ "${restore_nounset}" == "1" ]] && set -u
    [[ "${restore_errexit}" == "1" ]] && set -e

    if [[ "${sdkman_status}" != "0" ]]; then
      warn "SDKMAN init failed. Continuing without SDKMAN; current java will be used."
      return 0
    fi

    if ! command -v sdk >/dev/null 2>&1; then
      warn "SDKMAN init file exists, but sdk command is unavailable. Continuing with current java."
    fi
  fi
}

select_java() {
  local major="$1"
  local candidate="$2"

  load_sdkman
  if command -v sdk >/dev/null 2>&1; then
    if sdk use java "${candidate}" >/dev/null 2>&1; then
      log "Using Java ${candidate}"
      return 0
    fi
    warn "SDKMAN could not switch to Java ${candidate}. Continuing with current java."
  fi

  if command -v java >/dev/null 2>&1; then
    local version_output
    version_output="$(java -version 2>&1 | head -n 1)"
    if [[ "${version_output}" != *"\"${major}."* && "${version_output}" != *"\"${major}\""* ]]; then
      warn "Current Java may not match required Java ${major}: ${version_output}"
    fi
  else
    die "java is not available. Install Java ${major} or SDKMAN."
  fi
}

repo_current_branch() {
  local repo="$1"
  local branch
  branch="$(git -C "${ROOT_DIR}/${repo}" branch --show-current 2>/dev/null || true)"
  if [[ -n "${branch}" ]]; then
    printf '%s\n' "${branch}"
  else
    printf '%s\n' "(detached)"
  fi
}

print_repo_status_summary() {
  local repo="$1"
  printf '\n[%s]\n' "${repo}"
  git -C "${ROOT_DIR}/${repo}" status -sb | sed -n '1p'

  local dirty_count
  dirty_count="$(git -C "${ROOT_DIR}/${repo}" status --porcelain | wc -l | tr -d ' ')"
  if [[ "${dirty_count}" != "0" ]]; then
    printf 'local changes: %s file(s)\n' "${dirty_count}"
    git -C "${ROOT_DIR}/${repo}" status --porcelain | sed -n '1,8p'
    if [[ "${dirty_count}" -gt 8 ]]; then
      printf '... %s more file(s)\n' "$((dirty_count - 8))"
    fi
  fi
}

prepare_repositories() {
  log "Using current local branches"
  local repo
  for repo in "${REPOS[@]}"; do
    [[ -d "${ROOT_DIR}/${repo}/.git" ]] || die "Missing git repo: ${repo}"
    print_repo_status_summary "${repo}"
  done
}

check_prerequisites() {
  log "Checking required tools"
  need_command git
  need_command docker
  need_command curl
  need_command node
  need_command npm
  need_command java
  load_sdkman
  if ! command -v sdk >/dev/null 2>&1; then
    warn "Optional SDKMAN command not found. The script will use the current Java version."
  fi

  [[ -f "${COMPOSE_FILE}" ]] || die "Missing compose file: ${COMPOSE_FILE}"

  if docker_running; then
    log "Docker is running"
  else
    die "Docker is not running. Start Docker Desktop first."
  fi

  log "Using Keycloak URL: ${KEYCLOAK_URL}"

  prepare_repositories

  log "Active Maven Java targets from current POMs"
  print_java_versions
}

print_java_versions() {
  local repo
  for repo in ORISO-UserService ORISO-TenantService ORISO-AgencyService ORISO-ConsultingTypeService; do
    printf '\n[%s]\n' "${repo}"
    grep -nE '<java.version>|<maven.compiler.source>|<maven.compiler.target>|<java.upper.version>' "${ROOT_DIR}/${repo}/pom.xml" || true
  done
}

start_infra() {
  need_command docker
  docker_running || die "Docker is not running. Start Docker Desktop first."
  log "Starting local Docker infra"
  if ! using_local_keycloak; then
    die "Only local Keycloak is supported by this runner. Use ORISO_KEYCLOAK_URL=http://localhost:8080 or unset ORISO_KEYCLOAK_URL."
  fi
  if ! docker ps --format '{{.Names}}' | grep -qx 'oriso-local-keycloak' && port_accepts_connections 127.0.0.1 8080; then
    die "Port 8080 is already in use, so local Keycloak cannot start. Stop the process using 8080, then rerun this script."
  fi
  docker compose -f "${COMPOSE_FILE}" up -d
  docker compose -f "${COMPOSE_FILE}" ps
  wait_for_infra
}

wait_for_infra() {
  log "Waiting for MariaDB"
  local i
  for i in {1..60}; do
    if mariadb_ping >/dev/null 2>&1; then
      log "MariaDB is ready"
      break
    fi
    sleep 2
    [[ "${i}" == 60 ]] && die "MariaDB did not become ready"
  done

  log "Waiting for RabbitMQ"
  for i in {1..60}; do
    if docker exec oriso-local-rabbitmq rabbitmq-diagnostics ping >/dev/null 2>&1; then
      log "RabbitMQ is ready"
      break
    fi
    sleep 2
    [[ "${i}" == 60 ]] && die "RabbitMQ did not become ready"
  done

  log "Waiting for Keycloak HTTP at ${KEYCLOAK_URL}"
  for i in {1..60}; do
    if curl -fsS "${KEYCLOAK_URL}" >/dev/null 2>&1; then
      log "Keycloak is responding"
      return 0
    fi
    sleep 2
  done
  warn "Keycloak did not respond at ${KEYCLOAK_URL} yet."
}

mysql_root() {
  docker exec -i oriso-local-mariadb mariadb -u root -plocal_root_change_me "$@"
}

mariadb_ping() {
  docker exec oriso-local-mariadb sh -lc 'mariadb-admin ping -h localhost -u root -plocal_root_change_me'
}

db_has_table() {
  local db="$1"
  local table="$2"
  local count
  count="$(mysql_root -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${db}' AND table_name='${table}';" 2>/dev/null || echo 0)"
  [[ "${count}" == "1" ]]
}

init_db() {
  docker_running || die "Docker is not running. Start Docker Desktop first."
  wait_for_infra
  log "Creating service databases and local users"
  mysql_root <<'SQL'
CREATE DATABASE IF NOT EXISTS userservice;
CREATE DATABASE IF NOT EXISTS tenantservice;
CREATE DATABASE IF NOT EXISTS agencyservice;
CREATE DATABASE IF NOT EXISTS consultingtypeservice;

CREATE USER IF NOT EXISTS 'userservice_local'@'%' IDENTIFIED BY 'userservice_local_change_me';
GRANT ALL PRIVILEGES ON userservice.* TO 'userservice_local'@'%';

CREATE USER IF NOT EXISTS 'tenantservice_local'@'%' IDENTIFIED BY 'tenantservice_local_change_me';
GRANT ALL PRIVILEGES ON tenantservice.* TO 'tenantservice_local'@'%';

CREATE USER IF NOT EXISTS 'agencyservice_local'@'%' IDENTIFIED BY 'agencyservice_local_change_me';
GRANT ALL PRIVILEGES ON agencyservice.* TO 'agencyservice_local'@'%';

CREATE USER IF NOT EXISTS 'consultingtypeservice_local'@'%' IDENTIFIED BY 'consultingtypeservice_local_change_me';
GRANT ALL PRIVILEGES ON consultingtypeservice.* TO 'consultingtypeservice_local'@'%';

FLUSH PRIVILEGES;
SQL

  import_schema_if_missing userservice admin "${ROOT_DIR}/ORISO-Database/mariadb/userservice/schema.sql"
  apply_userservice_live_schema_patches
  import_schema_if_missing tenantservice tenant "${ROOT_DIR}/ORISO-Database/mariadb/tenantservice/schema.sql"
  import_schema_if_missing agencyservice agency "${ROOT_DIR}/ORISO-Database/mariadb/agencyservice/schema.sql"
  import_schema_if_missing consultingtypeservice topic "${ROOT_DIR}/ORISO-Database/mariadb/consultingtypeservice/schema.sql"
}

import_schema_if_missing() {
  local db="$1"
  local marker_table="$2"
  local schema_file="$3"

  [[ -f "${schema_file}" ]] || die "Missing schema file: ${schema_file}"
  if db_has_table "${db}" "${marker_table}"; then
    log "Skipping ${db} schema import; table ${marker_table} already exists"
    return 0
  fi

  log "Importing ${db} schema"
  docker exec -i oriso-local-mariadb mariadb -u root -plocal_root_change_me "${db}" < "${schema_file}"
}

db_has_column() {
  local db="$1"
  local table="$2"
  local column="$3"
  local count
  count="$(mysql_root -N -B -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='${db}' AND table_name='${table}' AND column_name='${column}';" 2>/dev/null || echo 0)"
  [[ "${count}" == "1" ]]
}

db_has_index() {
  local db="$1"
  local table="$2"
  local index="$3"
  local count
  count="$(mysql_root -N -B -e "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema='${db}' AND table_name='${table}' AND index_name='${index}';" 2>/dev/null || echo 0)"
  [[ "${count}" != "0" ]]
}

userservice_sql() {
  docker exec -i oriso-local-mariadb mariadb -u root -plocal_root_change_me userservice "$@"
}

apply_userservice_live_schema_patches() {
  if ! db_has_table userservice agency_invite_link; then
    warn "Skipping UserService live schema patches; userservice.agency_invite_link is missing"
    return 0
  fi

  log "Applying idempotent UserService live schema patches"

  db_has_column userservice agency_invite_link topic_id || userservice_sql -e "ALTER TABLE agency_invite_link ADD COLUMN topic_id BIGINT NULL;"
  db_has_column userservice agency_invite_link link_kind || userservice_sql -e "ALTER TABLE agency_invite_link ADD COLUMN link_kind VARCHAR(32) NULL;"
  db_has_column userservice agency_invite_link chat_type || userservice_sql -e "ALTER TABLE agency_invite_link ADD COLUMN chat_type VARCHAR(32) NULL;"
  db_has_column userservice agency_invite_link anonymity || userservice_sql -e "ALTER TABLE agency_invite_link ADD COLUMN anonymity VARCHAR(16) NULL;"
  db_has_column userservice agency_invite_link notes || userservice_sql -e "ALTER TABLE agency_invite_link ADD COLUMN notes VARCHAR(500) NULL;"
  db_has_column userservice agency_invite_link consultant_id || userservice_sql -e "ALTER TABLE agency_invite_link ADD COLUMN consultant_id VARCHAR(36) NULL;"

  userservice_sql <<'SQL'
UPDATE agency_invite_link SET link_kind = 'EXTERNAL_INBOUND' WHERE link_kind IS NULL;
UPDATE agency_invite_link SET chat_type = 'LIVE_CHAT' WHERE chat_type IS NULL;
UPDATE agency_invite_link SET anonymity = 'FULL' WHERE anonymity IS NULL;
ALTER TABLE agency_invite_link
  MODIFY link_kind VARCHAR(32) NOT NULL,
  MODIFY chat_type VARCHAR(32) NOT NULL,
  MODIFY anonymity VARCHAR(16) NOT NULL,
  MODIFY agency_id BIGINT NULL;
SQL

  db_has_index userservice agency_invite_link idx_invite_link_topic_create_date || userservice_sql -e "CREATE INDEX idx_invite_link_topic_create_date ON agency_invite_link (topic_id, create_date);"
  db_has_index userservice agency_invite_link idx_invite_link_kind_tenant || userservice_sql -e "CREATE INDEX idx_invite_link_kind_tenant ON agency_invite_link (link_kind, tenant_id, create_date);"
  db_has_index userservice agency_invite_link idx_invite_link_consultant || userservice_sql -e "CREATE INDEX idx_invite_link_consultant ON agency_invite_link (consultant_id);"
}

write_gateway_conf() {
  ensure_runtime_dirs
  local keycloak_upstream
  keycloak_upstream="$(keycloak_gateway_upstream)"
  cat > "${NGINX_CONF}" <<EOF
events {}

http {
  server {
    listen 80;

    location /auth/ {
      proxy_pass ${keycloak_upstream}/;
      proxy_ssl_server_name on;
    }

    location /service/useradmin/ {
      proxy_pass http://host.docker.internal:8082/service/useradmin/;
      proxy_set_header Host \$host;
    }

    location /service/users/ {
      proxy_pass http://host.docker.internal:8082/service/users/;
      proxy_set_header Host \$host;
    }

    location /service/tenant/ {
      proxy_pass http://host.docker.internal:8081/tenant/;
      proxy_set_header Host \$host;
    }

    location /service/tenantadmin/ {
      proxy_pass http://host.docker.internal:8081/tenantadmin/;
      proxy_set_header Host \$host;
    }

    location /service/agencyadmin/ {
      proxy_pass http://host.docker.internal:8084/agencyadmin/;
      proxy_set_header Host \$host;
    }

    location /service/agencies/ {
      proxy_pass http://host.docker.internal:8084/agencies/;
      proxy_set_header Host \$host;
    }

    location /service/consultingtypes {
      proxy_pass http://host.docker.internal:8083/consultingtypes;
      proxy_set_header Host \$host;
    }

    location /service/settingsadmin {
      proxy_pass http://host.docker.internal:8083/settingsadmin;
      proxy_set_header Host \$host;
    }

    location /service/settings {
      proxy_pass http://host.docker.internal:8083/settings;
      proxy_set_header Host \$host;
    }
  }
}
EOF
}

start_gateway() {
  need_command docker
  docker_running || die "Docker is not running. Start Docker Desktop first."
  write_gateway_conf
  log "Starting local API gateway on http://localhost:${GATEWAY_PORT}"
  docker rm -f oriso-local-gateway >/dev/null 2>&1 || true
  docker run -d \
    --name oriso-local-gateway \
    -p "127.0.0.1:${GATEWAY_PORT}:80" \
    -v "${NGINX_CONF}:/etc/nginx/nginx.conf:ro" \
    nginx:1.27-alpine >/dev/null
  docker ps --filter name=oriso-local-gateway
}

common_backend_env() {
  export KEYCLOAK_AUTH_SERVER_URL="${KEYCLOAK_URL}"
  export KEYCLOAK_REALM="${KEYCLOAK_REALM}"
  export SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI="${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}"
  export SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWK_SET_URI="${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs"
  export IDENTITY_OPENID_CONNECT_URL="${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect"

  export SPRING_RABBITMQ_HOST=localhost
  export SPRING_RABBITMQ_PORT=5672
  export SPRING_RABBITMQ_USERNAME=oriso_local
  export SPRING_RABBITMQ_PASSWORD=local_rabbit_change_me
  export SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/userservice?retryWrites=false

  export ROCKET_CHAT_BASE_URL=http://localhost:3000
  export ROCKET_CHAT_MONGO_URL=mongodb://localhost:27017/rocketchat?retryWrites=false
  export ROCKET_TECHNICAL_USERNAME=local_rocket
  export ROCKET_TECHNICAL_PASSWORD=local_rocket_change_me

  export MATRIX_API_URL=http://localhost:8008
  export MATRIX_REGISTRATION_SHARED_SECRET=local_matrix_registration_secret
  export MATRIX_SERVER_NAME=localhost
  export MATRIX_ADMIN_USERNAME=local_matrix_admin
  export MATRIX_ADMIN_PASSWORD=local_matrix_admin_change_me

  export TENANT_SERVICE_API_URL=http://localhost:8081
  export USER_SERVICE_API_URL=http://localhost:8082
  export USER_ADMIN_SERVICE_API_URL=http://localhost:8082
  export AGENCY_SERVICE_API_URL=http://localhost:8084/service
  export CONSULTING_TYPE_SERVICE_API_URL=http://localhost:8083

  export KEYCLOAK_CONFIG_ADMIN_USERNAME="${KEYCLOAK_CONFIG_ADMIN_USERNAME}"
  export KEYCLOAK_CONFIG_ADMIN_PASSWORD="${KEYCLOAK_CONFIG_ADMIN_PASSWORD}"
}

is_pid_running() {
  local pid_file="$1"
  [[ -f "${pid_file}" ]] || return 1
  local pid
  pid="$(cat "${pid_file}")"
  [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1
}

start_background() {
  local name="$1"
  local repo="$2"
  local java_major="$3"
  local java_candidate="$4"
  local db_name="$5"
  local db_user="$6"
  local db_password="$7"
  local port="$8"
  local jvm_arguments="${9:-}"
  local pid_file="${PID_DIR}/${name}.pid"
  local log_file="${LOG_DIR}/${name}.log"

  ensure_runtime_dirs
  if is_pid_running "${pid_file}"; then
    log "${name} already running with PID $(cat "${pid_file}")"
    return 0
  fi

  log "Starting ${name} on port ${port}; log: ${log_file}"
  (
    cd "${ROOT_DIR}/${repo}"
    common_backend_env
    select_java "${java_major}" "${java_candidate}"
    export SPRING_DATASOURCE_URL="jdbc:mariadb://localhost:3306/${db_name}"
    export SPRING_DATASOURCE_USERNAME="${db_user}"
    export SPRING_DATASOURCE_PASSWORD="${db_password}"
    if [[ -n "${jvm_arguments}" ]]; then
      nohup ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev -Dspring-boot.run.jvmArguments="${jvm_arguments}" > "${log_file}" 2>&1 &
    else
      nohup ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev > "${log_file}" 2>&1 &
    fi
    echo $! > "${pid_file}"
  )
}

write_admin_env() {
  local env_file="${ROOT_DIR}/ORISO-Admin/.env.local"
  if [[ -f "${env_file}" ]]; then
    log "Keeping existing ${env_file}"
    return 0
  fi

  log "Creating ${env_file}"
  cat > "${env_file}" <<EOF
VITE_PORT=${ADMIN_PORT}
BROWSER=none
VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT=X-CSRF-Token
VITE_API_URL=localhost:${GATEWAY_PORT}
VITE_USE_API_URL=true
VITE_USE_HTTPS=false
VITE_COOKIE_DOMAIN=localhost
VITE_COOKIE_SECURE=false
EOF
}

start_admin() {
  local name="admin"
  local pid_file="${PID_DIR}/${name}.pid"
  local log_file="${LOG_DIR}/${name}.log"
  ensure_runtime_dirs

  if is_pid_running "${pid_file}"; then
    log "admin already running with PID $(cat "${pid_file}")"
    return 0
  fi

  write_admin_env
  log "Starting Admin UI on http://localhost:${ADMIN_PORT}/admin; log: ${log_file}"
  (
    cd "${ROOT_DIR}/ORISO-Admin"
    if [[ ! -d node_modules ]]; then
      echo "[oriso-local] ORISO-Admin/node_modules missing; running npm install"
      npm install
    fi
    nohup npm run start > "${log_file}" 2>&1 &
    echo $! > "${pid_file}"
  )
}

write_frontend_env() {
  local env_file="${ROOT_DIR}/ORISO-Frontend/.env.local"
  if [[ -f "${env_file}" ]]; then
    log "Keeping existing ${env_file}"
    return 0
  fi

  log "Creating ${env_file}"
  cat > "${env_file}" <<EOF
PORT=${FRONTEND_PORT}
BROWSER=none
HTTPS=false
WDS_SOCKET_PORT=${FRONTEND_PORT}
PUBLIC_URL=/
REACT_APP_API_URL=http://localhost:${GATEWAY_PORT}
VITE_API_URL=http://localhost:${GATEWAY_PORT}
REACT_APP_AUTH_URL=${KEYCLOAK_URL}
VITE_AUTH_URL=${KEYCLOAK_URL}
REACT_APP_MATRIX_HOMESERVER_URL=http://localhost:8008
VITE_MATRIX_HOMESERVER_URL=http://localhost:8008
REACT_APP_USE_HTTPS=false
REACT_APP_COOKIE_DOMAIN=
REACT_APP_HOSTNAMES_WITHOUT_COOKIE_DOMAIN=localhost,127.0.0.1
EOF
}

start_frontend() {
  local name="frontend"
  local pid_file="${PID_DIR}/${name}.pid"
  local log_file="${LOG_DIR}/${name}.log"
  ensure_runtime_dirs

  if is_pid_running "${pid_file}"; then
    log "frontend already running with PID $(cat "${pid_file}")"
    return 0
  fi

  write_frontend_env
  log "Starting ORISO-Frontend on http://localhost:${FRONTEND_PORT}; log: ${log_file}"
  (
    cd "${ROOT_DIR}/ORISO-Frontend"
    if [[ ! -d node_modules ]]; then
      echo "[oriso-local] ORISO-Frontend/node_modules missing; running npm install"
      npm install
    fi
    nohup npm run dev > "${log_file}" 2>&1 &
    echo $! > "${pid_file}"
  )
}

start_selected_services() {
  start_gateway
  local service_list
  service_list="$(selected_services)"
  log "Selected services: ${service_list}"
  local svc
  for svc in ${service_list}; do
    case "${svc}" in
      userservice)
        start_background userservice ORISO-UserService 11 "${JAVA_11_VERSION}" userservice userservice_local userservice_local_change_me 8082
        ;;
      tenantservice)
        start_background tenantservice ORISO-TenantService 17 "${JAVA_17_VERSION}" tenantservice tenantservice_local tenantservice_local_change_me 8081 "--enable-preview"
        ;;
      agencyservice)
        start_background agencyservice ORISO-AgencyService 17 "${JAVA_17_VERSION}" agencyservice agencyservice_local agencyservice_local_change_me 8084 "--enable-preview"
        ;;
      consultingtypeservice)
        start_background consultingtypeservice ORISO-ConsultingTypeService 11 "${JAVA_11_VERSION}" consultingtypeservice consultingtypeservice_local consultingtypeservice_local_change_me 8083
        ;;
      admin)
        start_admin
        ;;
      frontend)
        start_frontend
        ;;
      *)
        die "Unknown service in ORISO_SERVICES: ${svc}"
        ;;
    esac
  done
}

start_all() {
  check_prerequisites
  start_infra
  init_db
  start_selected_services
  status
  if [[ "${UI_MODE}" == "admin" || "${UI_MODE}" == "both" || "${SERVICE_OVERRIDE}" == *"admin"* ]]; then
    log "Open Admin UI: http://localhost:${ADMIN_PORT}/admin"
  fi
  if [[ "${UI_MODE}" == "frontend" || "${UI_MODE}" == "both" || "${SERVICE_OVERRIDE}" == *"frontend"* ]]; then
    log "Open ORISO-Frontend: http://localhost:${FRONTEND_PORT}"
  fi
  log "Logs: ${LOG_DIR}"
}

stop_pid() {
  local name="$1"
  local pid_file="${PID_DIR}/${name}.pid"
  if ! [[ -f "${pid_file}" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "${pid_file}")"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
    log "Stopping ${name} PID ${pid}"
    kill "${pid}" >/dev/null 2>&1 || true
  fi
  rm -f "${pid_file}"
}

stop_apps() {
  local svc
  for svc in "${ALL_SERVICES[@]}"; do
    stop_pid "${svc}"
  done
  docker rm -f oriso-local-gateway >/dev/null 2>&1 || true
  log "Stopped app services and gateway. Docker infra is still running."
}

stop_all() {
  stop_apps
  if [[ -f "${COMPOSE_FILE}" ]]; then
    log "Stopping Docker infra, preserving volumes"
    docker compose -f "${COMPOSE_FILE}" stop || true
  fi
}

show_pid_status() {
  local svc
  for svc in "${ALL_SERVICES[@]}"; do
    local pid_file="${PID_DIR}/${svc}.pid"
    if is_pid_running "${pid_file}"; then
      printf '%-24s running pid=%s\n' "${svc}" "$(cat "${pid_file}")"
    else
      printf '%-24s stopped\n' "${svc}"
    fi
  done
  if docker ps --format '{{.Names}}' | grep -qx 'oriso-local-gateway'; then
    printf '%-24s running container=oriso-local-gateway\n' "gateway"
  else
    printf '%-24s stopped\n' "gateway"
  fi
}

status() {
  ensure_runtime_dirs
  log "Process status"
  show_pid_status
  echo
  log "Docker status"
  docker compose -f "${COMPOSE_FILE}" ps || true
  echo
  log "Health endpoints"
  for endpoint in \
    "gateway:http://localhost:${GATEWAY_PORT}/service/settings" \
    "tenantservice:http://localhost:8081/actuator/health" \
    "userservice:http://localhost:8082/actuator/health" \
    "consultingtypeservice:http://localhost:8083/actuator/health" \
    "agencyservice:http://localhost:8084/actuator/health" \
    "admin:http://localhost:${ADMIN_PORT}/admin" \
    "frontend:http://localhost:${FRONTEND_PORT}"; do
    local name="${endpoint%%:*}"
    local url="${endpoint#*:}"
    if curl -fsS --max-time 2 "${url}" >/dev/null 2>&1; then
      printf '%-24s OK %s\n' "${name}" "${url}"
    else
      printf '%-24s not ready %s\n' "${name}" "${url}"
    fi
  done
}

show_logs() {
  local follow=0
  if [[ "${1:-}" == "-f" || "${1:-}" == "--follow" ]]; then
    follow=1
    shift
  fi

  local name="${1:-}"
  [[ -n "${name}" ]] || die "Usage: $0 logs <service>"
  ensure_runtime_dirs

  if [[ "${name}" == "gateway" ]]; then
    if [[ "${follow}" == "1" ]]; then
      docker logs -f oriso-local-gateway
    else
      docker logs --tail 200 oriso-local-gateway
    fi
    return 0
  fi

  local log_file="${LOG_DIR}/${name}.log"
  [[ -f "${log_file}" ]] || die "Missing log file: ${log_file}"
  if [[ "${follow}" == "1" ]]; then
    tail -f "${log_file}"
  else
    tail -n 200 "${log_file}"
  fi
}

main() {
  local command="${1:-}"
  shift || true

  case "${command}" in
    check)
      parse_common_options "$@"
      check_prerequisites
      ;;
    branches)
      parse_common_options "$@"
      need_command git
      prepare_repositories
      ;;
    start)
      parse_start_args "$@"
      case "${START_TARGET}" in
        all)
          start_all
          ;;
        infra)
          start_infra
          ;;
        services)
          prepare_repositories
          start_selected_services
          ;;
        *)
          die "Unknown start target: ${START_TARGET}"
          ;;
      esac
      ;;
    init-db)
      init_db
      ;;
    gateway)
      start_gateway
      ;;
    status)
      status
      ;;
    logs)
      show_logs "$@"
      ;;
    stop)
      case "${1:-apps}" in
        apps)
          stop_apps
          ;;
        all)
          stop_all
          ;;
        *)
          die "Unknown stop target: ${1}"
          ;;
      esac
      ;;
    ""|-h|--help|help)
      usage
      ;;
    *)
      usage
      die "Unknown command: ${command}"
      ;;
  esac
}

main "$@"
