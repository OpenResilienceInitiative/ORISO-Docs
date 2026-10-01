# Local API/Admin development runbook

[English quick start](README.md) · [Deutscher Einstieg](README.de.md)

This procedure is for disposable local development. Use current dev sources together and record their commits; public documentation and legal output are released from a reviewed release vector. A local dev check is not release or operator approval.

## 1. Preflight

Use the sibling repositories and runtime selection described in the quick start. Set ORISO_WORKSPACE_ROOT and ORISO_LOCAL_RUNNER explicitly as in the quick start. The workspace selects service sources; the runner path selects this Docs checkout/worktree. For a second isolated stack, set ORISO_COMPOSE_PROJECT to a unique name beginning with oriso-local-, ORISO_RUNTIME_DIR to an empty owned directory and assign free ports before doctor. Use the same values for start, status and stop.

For developers — configurable port names and defaults:

```text
ORISO_GATEWAY_PORT=8088       ORISO_KEYCLOAK_PORT=8080
ORISO_APP_TLS_PORT=9443
ORISO_USERSERVICE_PORT=8082   ORISO_TENANTSERVICE_PORT=8081
ORISO_AGENCYSERVICE_PORT=8084 ORISO_CONSULTINGTYPESERVICE_PORT=8083
ORISO_ADMIN_PORT=9000        ORISO_FRONTEND_PORT=9002
ORISO_MARIADB_PORT=3306      ORISO_MONGODB_PORT=27017
ORISO_REDIS_PORT=6379        ORISO_RABBITMQ_PORT=5672
ORISO_SMTP_PORT=1025         ORISO_MAILPIT_UI_PORT=8025
ORISO_READY_TIMEOUT=300
```

<!-- oriso-command: {"id": "runbook-doctor", "environment": "local", "verification": "ready true and source SHA recorded for each selected repository; no files or containers created", "risk": "read-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" doctor --json
```

Exit 1 is a failed prerequisite, not permission to continue. Resolve the exact tool, source or occupied-port error. Do not terminate an unknown listener. Git .git files and detached worktrees are supported. The runner checks the selected repositories, not every repository in ORISO.

## 2. Start the selected baseline

<!-- oriso-command: {"id": "runbook-start", "environment": "local", "verification": "selected applications and local OIDC metadata become ready before exit 0", "risk": "disposable-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" start all
```

start infra validates only infrastructure and does not claim that applications started. start services is for previously started, owned infrastructure. Default application selection is all four backend services plus Admin. Frontend uses its source npm dev script; Admin uses its source npm start script. Existing .env.local is preserved: a conflicting file fails rather than being overwritten.

Database initialization creates empty local service databases and a fixture user. Liquibase dev,seed migrations run from each actual service source. There are no ad-hoc ALTER TABLE repairs. Preserve logs and source revisions if startup fails. Backend startup can fail for an actual source/bootstrap problem; a listening port alone is insufficient.

## 3. Verify and retain evidence

<!-- oriso-command: {"id": "runbook-status", "environment": "local", "verification": "all selected application health reports ready; infrastructure reports healthy", "risk": "read-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" status
```

Record doctor JSON, exact source commits, selected mode, runtime versions, health responses, the local OIDC issuer and Admin's HTTP response. Verify the technical token subject and role against the imported synthetic realm without printing the token.

APP_BASE_URL and DPA_SIGN_FRONTEND_BASE_URL use the same actual HTTPS edge origin. Readiness checks https://localhost:9443/__oriso_local_health with the runtime app-edge-cert.pem explicitly trusted and normal hostname validation. OpenSSL creates the owned certificate/key after preflight; neither the system nor browser trust store changes. Default browser trust should reject this test certificate. Do not bypass the warning. With Frontend absent, app/DPA routes return 503. Optional Frontend proxying is not an accepted HTTPS browser/API/auth/signature journey. Admin browser validation uses its actual HTTP origin. Then test the Admin browser journey that the change concerns. Stock local Keycloak has synthetic users/clients; custom ORISO SPI registration and recovery flows are not included. Mailpit supplies the local SMTP prerequisite and captures test mail at localhost:8025 without an outbound relay. Chat, calls and actual platform/outbound mail journeys are explicitly unsupported, so baseline readiness does not claim them.

## 4. Diagnose a failed start

<!-- oriso-command: {"id": "runbook-log", "environment": "local", "verification": "inspect the owned TenantService log; retain only sanitized relevant failure lines", "risk": "read-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" logs tenantservice
```

Use the affected service name for logs. Inspect the first cause, not only the final Maven failure. Keep private runtime logs local; do not paste tokens, real addresses or environment dumps into GitHub. If a source migration fails, capture the source SHA and migration name before changing anything. Do not replace the service migration history with old ORISO-Database SQL files.

Hybrid mode requires --hybrid and an explicit ORISO_DEV_KEYCLOAK_URL. It uses external authentication and does not provision it. Supply remote credentials only through your approved local secret mechanism. Local fixture admin credentials are never sent to remote auth. Do not interpret successful local OIDC metadata as validation of a hybrid environment.

## 5. Stop owned resources

<!-- oriso-command: {"id": "runbook-stop", "environment": "local", "verification": "owned process groups and Compose containers stop; named volumes and unrelated resources remain", "risk": "disposable-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" stop all
```

stop without all preserves infrastructure. Neither mode kills a process merely because it uses a selected port. Stop requires matching ownership markers and process identity. If ownership changed, investigate instead of forcing a kill.

## Maintenance and validation status

Owner: ORISO-Docs [issue 48](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/48). Source requirements checked on 2026-10-01. The pull request records exact test counts, source revisions and actual disposable-run evidence. That evidence is separate from review, merge, deployment and release readback.

Legacy copied guides under guides/ are reference material. Their shell blocks are not classified or automatically executed by this command-contract gate. The strict gate covers only the two quick starts and this reviewed procedure. Repository technical docs are linked from the bilingual site; they are not copied into an independent operator policy.

## Checked local baseline — 2026-10-01

The [versioned verification receipt](verification/2026-10-01-local-baseline.json) binds the runtime inputs to the six checked source revisions. One automated start reached all four API health checks, Admin in the browser, certificate-verified HTTPS edge, local OIDC technical subject/role and SMTP inbox readback. Owned processes and containers were then stopped; all selected ports were free, five named volumes were retained and two pre-existing ElementCall containers stayed running. This is local baseline evidence only; excluded platform journeys and Dev/release acceptance remain open.
