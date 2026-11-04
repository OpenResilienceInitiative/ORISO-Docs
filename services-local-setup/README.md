# ORISO local development

[Deutsch](README.de.md) · [Detailed runbook](ORISO-local-development-runbook.md)

Use this runner for the local API/Admin development baseline. It starts four Java services, Admin, a loopback gateway, local Keycloak, MariaDB, MongoDB, Redis, RabbitMQ and a local Mailpit SMTP catcher. Service schemas and development seeds come from each service's Liquibase master, not copied SQL schemas. Chat, calls, outbound mail, DPA signing and custom Keycloak registration flows are outside this baseline.

## Prepare the workspace

Use sibling Git repositories: ORISO-Docs, ORISO-UserService, ORISO-TenantService, ORISO-AgencyService, ORISO-ConsultingTypeService and ORISO-Admin. ORISO-Frontend is required only when selected. Git worktrees are supported. No Deployment or ORISO-Database checkout is required.

Install Python 3.10+, Git, OpenSSL, Docker with Compose v2, Java 21 and Node 22.12.0 with npm. Select Java in both JAVA_HOME and PATH. The runner reads the selected repositories' pom.xml and package.json; a later source requirement takes precedence over this summary. It rejects mismatches rather than choosing another installed runtime.

Use an explicit workspace path, especially when ORISO-Docs itself is a managed worktree. Replace the example paths below with your sibling-repository directory and the runner in the selected Docs checkout/worktree. These paths can differ.

<!-- oriso-command: {"id": "readme-en-doctor", "environment": "local", "verification": "ready is true, required source revisions and runtime versions are listed; exit 1 means resolve errors before start", "risk": "read-only"} -->
```bash
export ORISO_WORKSPACE_ROOT="/path/to/ORISO"
export ORISO_LOCAL_RUNNER="/path/to/selected/ORISO-Docs/services-local-setup/run-oriso-local.sh"
"$ORISO_LOCAL_RUNNER" doctor --json
```

Doctor is read-only. It reports source commits, branches, tools, selected ports and supported capabilities; it does not print credentials, install dependencies or stop port listeners. Default selection is four backends plus Admin. Use --ui frontend, --ui both or --ui none to change it. Select a backend subset with --services "userservice tenantservice".

## Start and stop

The bundled infrastructure uses local-only fixture credentials and binds published ports to loopback. Use disposable checkouts and data for the first validation. Starting installs missing UI dependencies and may build services; it creates owned runtime files and local database volumes.

<!-- oriso-command: {"id": "readme-en-start", "environment": "local", "verification": "runner exits 0 only after selected application health and local OIDC metadata are ready; inspect owned logs on failure", "risk": "disposable-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" start all
```

Captured test mail is available at http://localhost:8025; Mailpit has no outbound relay configured. Actual platform mail and external delivery remain unverified.

Admin is at http://localhost:9000, gateway at http://localhost:8088 and local auth at http://localhost:8080. The synthetic realm supports local development authentication; its users are not real operator identities. A successful start is a development baseline, not proof that every platform journey works.

Service callback origins use the real local HTTPS app edge at https://localhost:9443. Its owned certificate stays in the runtime directory; readiness trusts that certificate explicitly without changing your system or browser certificate store. With no Frontend selected, app routes return 503. Admin remains available over local HTTP. The optional HTTPS Frontend proxy does not establish a tested browser/auth/DPA journey; never bypass browser certificate warnings to claim one.

<!-- oriso-command: {"id": "readme-en-status", "environment": "local", "verification": "selected applications, owned gateway/auth routing and certificate-verified HTTPS edge report ready; infrastructure status is shown", "risk": "read-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" status
```

<!-- oriso-command: {"id": "readme-en-stop", "environment": "local", "verification": "only this runtime's processes and containers stop; unrelated listeners remain and named volumes are preserved", "risk": "disposable-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" stop all
```

Never delete volumes to repair an unexplained migration error. Keep the failing log and source revision first. Use the runbook for isolated ports, troubleshooting, hybrid auth and verification evidence.

## Source and evidence

Maintained with ORISO-Docs issue [48](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/48). English and German instructions share the runner contract. Current source requirements were checked on 2026-10-01 against origin/dev. Executable command annotations describe intended environment and expected results; they do not grant approval or prove execution. CI checks their extraction without executing them. The detailed runbook records the distinction between source checks, a local stack and public release verification.
