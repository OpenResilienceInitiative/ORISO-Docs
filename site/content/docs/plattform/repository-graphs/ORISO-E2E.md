---
title: ORISO-E2E Enriched Graph Summary
description: Direct source inspection and graph-backed summary for ORISO-E2E.
---

# ORISO-E2E Enriched Graph Summary

## Platform Navigation

- [Overview](../overview.md)
- [Repository map](../repository-map.md)
- [Architecture](../architecture.md)
- [Authentication and Keycloak](../authentication-and-keycloak.md)
- [Database and data model](../database-and-data-model.md)
- [Kubernetes deployment](../kubernetes-deployment.md)
- [Frontend/Admin overview](../frontend-admin-overview.md)
- [Backend services](../backend-services.md)
- [Tenant lifecycle](../tenant-lifecycle.md)
- [User management flow](../user-management-flow.md)
- [Local development](../local-development.md)
- [Onboarding guide](../onboarding-guide.md)
- [Troubleshooting](../troubleshooting.md)
- [Graph validation report](../graph-validation-report.md)
- [Diagrams](../diagrams.md)

## Repository Purpose

Dedicated Playwright real-browser E2E quality gate for the whole ORISO platform (App layer and Admin panel), running against the deployed Pre-Dev environment. Created after the Test Quality Audit 2026-07-04 found zero real automated E2E coverage; at the pinned pre-dev commit it holds roughly 25 spec files covering counselling money paths, group chat (ADR-012), live chat, encrypted calls/MatrixRTC, notifications/activity timeline, product tours, platform-admin 2FA, legal/DPA versioning, and admin display surfaces, plus a fully working local chain-test stack for the tenant-admin invite/DPA flows (ORISO-Admin#569).

## Main Technologies

- Package: oriso-e2e 0.1.0 (private), Node >=22 <23
- Stack: @playwright/test 1.61.1 (Chromium, Desktop Chrome device), TypeScript 5.8.3, otplib 13 (TOTP for chain tests and JIT OTP), node:test for script unit tests
- Bash/SQL tooling: password-reset round trip, Pre-Dev data repair, chain-local seeding
- CI: GitHub Actions (`nightly-e2e.yml`) with kubectl-based deployed-digest evidence

## Important Files and Modules

- playwright.config.ts — four projects (predev-oriso, predev, dev, local), URL resolvers (`matrixBaseUrl`, `apiBaseUrl`, `adminBaseUrl`, `matrixRtcGatewayBaseUrl`), artifact policy
- .github/workflows/nightly-e2e.yml — nightly blocking MatrixRTC cutover gate
- tests/*.spec.ts — the scenario catalog (see below)
- tests/support/testAccess.ts — Test Access broker sessions, account map, JIT OTP, loud broker-unavailable skips
- tests/support/runtimeEvidence.ts + tests/runtime-evidence.spec.ts — immutable runtime-evidence contract
- tests/helpers/ — chat primitives, real-registration asker helper, Keycloak direct-grant tokens, counselling seed ladder, Simpsons/Springfield identity bookkeeping
- tests/fixtures/counsellingDialogue.ts — long-form multi-turn counselling dialogue fixture
- scripts/run-predev-with-test-access.{sh,mjs} + scripts/test-access-ci.mjs — credential resolution wrappers (Keychain-backed CLI locally, one Hub token in CI)
- scripts/matrix-only-identifiers.test.mjs — guard that active group-chat specs are free of Rocket.Chat identifiers
- scripts/password-reset-roundtrip.sh — browser-free reset chain via Springfield mailboxes
- scripts/fix-test-user-001.sql — Pre-Dev repair for the orphaned seeded asker (tenant_id must not be NULL)
- chain-local/ — compose overlay, mailpit STARTTLS certs, idempotent seeding for the #569 chain specs
- docker-compose.e2e.yml — local stack skeleton (explicitly documented as not yet runnable)
- docs/GUIDE-secrets-und-testmails.md — the secrets/testmail handling contract for humans and agents

## Architecture Summary

The repo is a test client, not a service: it owns no product code and asserts against deployed ORISO environments through real Chromium sessions plus direct Matrix/Keycloak/service API calls. Its architecture is organized around three contracts. (1) Targets: the `predev` project reaches the current single-domain Pre-Dev (`https://predev.oriso.org`, path-routed per ADR-011: `/` frontend, `/admin`, `/_matrix`, `/service/*`, `/livekit/*`, `/room` + `/assets` Element Call) via Chromium host-resolver rules; `predev-oriso` is the migration target that needs no resolver tricks or TLS exceptions (only the notifications spec has moved so far); `dev` appears only when configured via env; `local` targets compose stacks. (2) Credentials: either brokered Test Access sessions (storageState, no secret in the repo/CI) or env-injected passwords from the Hub — direct-password mode disables traces/screenshots/videos so artifacts can never capture tokens. (3) Evidence: live chat and call gates refuse to PASS without immutable runtime evidence (commit SHAs + @sha256 image digests), and the nightly workflow generates and re-verifies those digests from the cluster around the run. Suites run serially (workers=1) because money paths mutate shared Pre-Dev state.

## Scenario Catalog

- S0 smoke-crash — credential-free shell/console/login check
- M2 money-path-counselling — consultant login → session list → send message
- Long-form counselling — freshly registered asker, multi-turn two-browser dialogue
- T1 t1-aside-confidentiality — ADR-008 red line: no supervisor aside markers in the client's raw Matrix sync (U25 go-live blocker)
- Group chat (ADR-012) — series create/edit, smoke, waiting-area countdown (G1/G2, W1-W4), Matrix-native identifiers only
- Live chat — anonymous invite redeem → queue → accept → bidirectional messages → Synapse proof (livechat-invite-connect); backend-authoritative availability + Megolm room state (livechat-runtime-gate, evidence-bound)
- Calls — call-encryption (room encrypted + not publicly joinable, asserted on Matrix room state) and call-widget-mode (two-browser Matryoshka/widget gate, fake media, MatrixRTC gateway)
- Notifications — three-gate activity-timeline spec separating "feature broken" (G1) from "environment empty" (G2 fails, never skips) from "chain works" (G3)
- Tutorials TU1-TU7 — product-tour persistence and statistics authorization via brokered sessions
- Consultant acceptance follow-ups N01/C01/U01/L01
- Registration regression — postcode step after back navigation (Frontend#37)
- Admin: admin-display-gate (every surface renders data or an explicit empty state, desktop+mobile screenshots), admin-multi-identity (dual Träger-Admin/consultant identity), platform-admin-2fa (A01 App-TOTP), legal-dpa-versioning (L1 publish → version round trip)
- CHAIN_LOCAL=1: tenant-invite-chain-local (S1-S6) and tenant-dpa-continuity-local (C1-C3, append-only signature audit) against the chain-local stack

## Credentials and Test Access

- Never committed, never hardcoded for deployed targets; the two lanes are broker storageState sessions (`test-access session open`, identity via TEST_ACCESS_IDENTITY) and Hub-resolved env vars (ORISO_E2E_USER/PASS, CLIENT pair, platform admin pair).
- CI needs exactly one secret for credentialed runs (ORISO_TEST_ACCESS_TOKEN, read-only, scoped to oriso/pre-dev) resolved through profile `oriso/pre-dev/e2e-default`; the token is stripped from the Playwright child environment.
- Broker accounts: `oriso/pre-dev/test-consultant-001`, `test-tenantadmin-001`, `e2e-platform-admin-predev`; fresh long-form askers use Springfield/Simpsons mailboxes and are synced back into the Test Access inventory.
- Skip semantics are deliberately loud: missing credentials or a down broker produce capitalized skip reasons; a skipped run is not green coverage.

## CI and Nightly Gate

- `nightly-e2e.yml` (cron 02:30 UTC + manual) is currently a blocking MatrixRTC cutover gate, not a full-suite run: it materializes a read-only PreDev kubeconfig (PREDEV_KUBECONFIG_B64), captures the six call-path deployments in namespace `caritas`, fails unless every image is deployed by immutable digest, runs `call-widget-mode.spec.ts` on project `predev` with fake media and secret-injected credentials (PREDEV_IP required in CI), then re-captures and byte-compares digests to prove the deployment did not move, uploading the Playwright report and digest evidence.
- Target state remains promotion gating (green run stamps tested digests `:predev-candidate`); no promotion job exists yet.
- `npm run test:unit` runs the script-level node:test suites (test-access resolver, Matrix-only identifier guard).

## ORISO Dependencies

- ORISO-Frontend and ORISO-Admin — the applications under test (selector provenance is documented per helper/spec).
- ORISO-UserService, TenantService, AgencyService, ConsultingTypeService — asserted through `/service/*` APIs on the single Pre-Dev origin.
- Keycloak (realm `online-beratung`, client `app`) — direct-grant tokens for API-level gates; ORISO Keycloak image with the OTP SPI in chain-local.
- Matrix Synapse, Element Call, LiveKit and the MatrixRTC auth gateway (`/livekit/jwt`) — room-state, encryption and call gates.
- Dreambau Test Access Hub + Springfield testmail pool — credentials, OTP and mailbox round trips.
- ORISO-Helm / the Pre-Dev cluster — deployment digests consumed as runtime evidence.

## Local Development Notes

- `npm ci && npx playwright install chromium`; `npm run test:predev` (or `test:smoke` for the credential-free check); `npm run report`.
- Credentialed local runs go through `scripts/run-predev-with-test-access.sh` (TEST_ACCESS_IDENTITY required; secrets fetched, never typed).
- `--project=local` against docker-compose.e2e.yml is still scaffolding; the working local lane is the chain-local overlay (workspace compose + `chain-local/docker-compose.avv.yml` + `seed-chain.sh`, specs gated behind CHAIN_LOCAL=1).
- Pre-Dev quirks are encoded in config/fixtures: single shared node (serial, 120s timeouts), `enableWalkthrough` off cluster-wide (tour fixture rewrites exactly that flag), 2FA nag dialog dismissal, `/service/*` only valid on the API origin.

## Deployment Notes

- Nothing deploys from this repo; it observes deployments. The nightly workflow is the only runtime component, and it requires repo secrets/vars: PREDEV_KUBECONFIG_B64, PREDEV_IP, ORISO_E2E_USER/PASS + CLIENT pair.
- Repository: github.com/OpenResilienceInitiative/ORISO-E2E, default branch `main`, active branch `pre-dev` (75 commits ahead at the pinned state 2a90b0cc).

## Risks and Gaps

- README drift: the README still describes the nightly as a full predev-project run wired through the test-access resolver and mentions a commented-out `promote-tested-digests` stub; the actual workflow runs only the MatrixRTC gate and contains no promotion stub.
- Host migration is mid-flight: config and newer specs target `predev.oriso.org`, but several defaults still point at dead `*.oriso-dev.site` hosts that resolve to a repurposed nginx-404 box (platform-admin-2fa's ADMIN_BASE_URL default, password-reset-roundtrip's ORISO_API_BASE default, various doc examples) — stale values fail as "login form does not exist", not "unreachable".
- Only one spec has moved to the clean `predev-oriso` project; the rest still need ignoreHTTPSErrors + resolver rules.
- docker-compose.e2e.yml remains non-runnable scaffolding, so `--project=local` has no generic stack.
- Several audit money paths are still unimplemented (M1 registration→enquiry, M3 tenant-isolation probe, M4/M5 side-room and four-eyes, M6-M9); there is no E2E coverage here for media upload/scanning, appointments (ADR-020) or the onboarding wizard.
- Chain-local docs hardcode another operator's absolute paths (/Users/kio/...), and local-only seeds carry default passwords in code (e2e-platform-admin `E2ePlatform!2026`, chainadmin `ChainTest!2026`) — local compose stacks only, but worth knowing before reuse.

## Needs Verification

- Whether the nightly workflow is enabled and green on the actual GitHub repository, and whether `continue-on-error` burn-in has been lifted.
- Whether the `oriso/pre-dev/test-tenantadmin-001` broker account (TU7) has been repaired.
- Current validity of documented selectors against the deployed Frontend/Admin builds — several helpers explicitly mark selectors as "verify against a live run".
- Whether the dead `*.oriso-dev.site` defaults have since been cleaned up on branches beyond the pinned commit.
