# [KDG] Epic: Matrix/Synapse & operations hardening

**Target repo:** ORISO-Helm (with two live-cluster follow-ups in ORISO-Kubernetes / on the Pre-Dev host)
**Source:** DPIA infrastructure inventory 2026-08-13 (`dsfa-inventar-frontend-infra.md`), findings verified against the current ORISO-Helm chart.

## Why

The Data Protection Impact Assessment (KDG §35 / GDPR Art. 35) inventory of the deployed infrastructure identified a set of configuration gaps in the Matrix/Synapse homeserver and the surrounding operations layer that fall under the technical and organisational measures required by KDG §26 / GDPR Art. 32: unnecessary data flows to third-country providers, missing retention limits, open registration and disabled abuse limits on the homeserver, a hardcoded credential, undefined log retention, and an unresolved backup concept. None of these findings indicates a data breach; they are hardening items that must be closed (or consciously accepted and documented) before go-live so the DPIA can state the measures as implemented rather than planned. This epic bundles them into one ordered implementation plan with a clear decision list.

## Tasks (in implementation order)

- [ ] **1. Remove the dead GitHub backup script from the chart** — S
  *What:* Delete the `matrix-backup-script` ConfigMap (`backup.sh` is fine conceptually, but `github-sync.sh` would push full Synapse DB dumps to a GitHub repository). Verified state: no CronJob exists anywhere in the chart, no consumer references the ConfigMap beyond the volume mount in `matrix-postgres-statefulset.yaml:74-85`, and no `GITHUB_REPO`/`GITHUB_TOKEN` values are defined — the sync has never run. It is dead code, but as long as it ships in the chart it documents an unacceptable transfer path.
  *Where:* `templates/matrix/matrix-configmaps.yaml` (ConfigMap `matrix-backup-script`, top of file), volume mount in `templates/matrix/matrix-postgres-statefulset.yaml`.
  *Acceptance:* ConfigMap and mount removed; `helm template` renders cleanly; a short note in the PR records that the script never executed (no CronJob, no token values), so no data ever left the cluster and no breach assessment is needed.

- [ ] **2. Synapse hardening, batch 1: registration, rate limits, authenticated media** — M
  *What:* In the rendered `homeserver.yaml`: set `enable_registration: false` and remove `enable_registration_without_verification` (accounts are provisioned exclusively via Keycloak/UserService per ADR-005, so open self-registration serves no purpose); restore Synapse default rate limits by deleting the `rc_*` blocks currently set to 100000 (the `exempt_from_ratelimiting` block already whitelists the internal network, so service traffic is unaffected); set `enable_authenticated_media: true` and remove the non-existent `matrix_synapse_enable_authenticated_media` key.
  *Where:* `templates/matrix/matrix-configmaps.yaml` (ConfigMap `matrix-homeserver-oidc`, lines ~148-211).
  *Acceptance:* Registration via the client API is rejected on Pre-Dev; media download without an access token returns 401; login/message flows for provisioned users work unchanged (E2E gate green); rate limits confirmed active from an external address.

- [ ] **3. Move the Synapse OIDC client secret into secret management** — S
  *What:* Replace the hardcoded `client_secret: "caritas-matrix-secret-2025"` with a value from the chart's secrets values, and rotate the secret in Keycloak at the same time (it has been committed to the repository history).
  *Where:* `templates/matrix/matrix-configmaps.yaml` (ConfigMap `matrix-oidc-config`, line ~244); secrets values file; Keycloak client `matrix-synapse`.
  *Acceptance:* No literal secret in any template; SSO login via Keycloak works on Pre-Dev with the rotated secret. Link to ORISO-Helm#45 (hardcoded passwords → generated) as the general pattern.

- [ ] **4. Resolve the sqlite3-vs-Postgres contradiction** — M
  *What:* The rendered `homeserver.yaml` configures `database.name: sqlite3` (`/data/homeserver.db`) while the chart also ships a full Matrix Postgres StatefulSet with PITR tooling. Determine which store Synapse actually uses on Pre-Dev, then make the chart tell the truth: either point Synapse at the Postgres StatefulSet (preferred — sqlite is not supported for production Synapse) with a planned data migration, or remove the unused Postgres/PITR resources. This decision gates Task 8 (what the backup concept must cover).
  *Where:* `templates/matrix/matrix-configmaps.yaml` (database block, lines ~128-131), `templates/matrix/matrix-postgres-statefulset.yaml`, PITR ConfigMaps in the same file.
  *Acceptance:* Chart and running Pre-Dev agree on one database backend; unused resources removed; if migrating to Postgres, message history survives the cutover (verified via E2E).

- [ ] **5. Replace Google STUN with first-party TURN/STUN** — M (needs Decision D1)
  *What:* `turn_uris` currently lists `stun.l.google.com` / `stun1.l.google.com`, so every 1:1 call setup discloses client IP addresses to Google (third-country transfer with no legal basis in the DPIA). Replace with a first-party option: the LiveKit deployment's embedded TURN, or a small coturn deployment in the chart. Also remove `turn_allow_guests: true` unless anonymous counselling requires it.
  *Where:* `templates/matrix/matrix-configmaps.yaml` (lines ~163-167); depending on D1, `templates/livekit/*` or a new coturn template.
  *Acceptance:* No `*.google.com` endpoint in any rendered client-facing configuration; 1:1 calls connect across NAT on Pre-Dev; DPIA external-recipients table updated (Google STUN entry removed).

- [ ] **6. Configure retention and presence on Synapse** — S–M (needs Decisions D2/D3)
  *What:* Add a `media_retention` block (proposal: `local_media_lifetime` aligned with the session/counselling data deletion concept) so attachments and avatars do not accumulate indefinitely; set `presence.enabled: false` unless the product needs online status (currently every advice seeker's online state is processed server-side by default); implement the read-receipts outcome of D3.
  *Where:* `templates/matrix/matrix-configmaps.yaml` (ConfigMap `matrix-homeserver-oidc`).
  *Acceptance:* Rendered config contains explicit `media_retention` and `presence` settings matching the recorded decisions; retention values referenced in the DPIA deletion concept.

- [ ] **7. Ingress access-log scrubbing and retention** — M
  *What:* The ingress-nginx controller ConfigMap sets no `log-format-upstream` override, so the nginx default logs client IPs, full request URIs and user agents — and magic-link / password-reset tokens travel as GET parameters, so they land in these logs. Define a custom log format that drops or truncates the query string and shortens/omits the client IP, and document the effective retention (currently pod-stdout with k3s default rotation, no shipping). The Admin container already demonstrates the pattern (its access log deliberately omits client IPs).
  *Where:* `templates/nginx/ingress-nginx-controller-configmap.yaml`; retention statement into the operations documentation for the DPIA.
  *Acceptance:* A magic-link request no longer appears with its token in the controller log; log format contains no unmasked client IP or query string; retention period stated in the DPIA TOM annex.

- [ ] **8. Close or authenticate the public operations ingresses** — M
  *What:* On Pre-Dev, SigNoz UI, Redis Commander, Storybook, health dashboard and status page are publicly routed via manifests in the archived ORISO-Kubernetes repo (`ingress/19-redis-commander-ingress.yaml`, `20-signoz-ingress.yaml`, `21-status-page-ingress.yaml`, `22-storybook-ingress.yaml`, `10-health-ingress.yaml` — none carries an auth annotation). Redis Commander was already restricted live (ORISO-Helm#170), but the repo manifests still render without auth and the remaining surfaces are unverified. Verify the live state of each, put every operations surface behind SSO/Basic-Auth or an IP allowlist (or remove it, cf. ORISO-Helm#153 for Status), and carry the hardened definitions into ORISO-Helm as the target of record so the fix survives the chart migration.
  *Where:* ORISO-Kubernetes `ingress/` (live), corresponding templates in ORISO-Helm (target); coordinates with ORISO-Helm#149/#156 (Helm as deployment authority).
  *Acceptance:* Each of the five hostnames either requires authentication or is unreachable from the public internet (verified externally); the authoritative definitions live in ORISO-Helm.

- [ ] **9. Real backup concept: encrypted off-site backups with restore tests** — L
  *What:* Replaces the deleted GitHub sync (Task 1) and closes the wider gap that MariaDB and MongoDB have no backup jobs in the chart at all (only Matrix Postgres has scripts, and nothing schedules them). Define and implement: nightly encrypted backups (age/GPG, key held outside the cluster) of Matrix Postgres/sqlite (per Task 4), MariaDB and MongoDB to a Hetzner Storage Box (EU, same provider — no new third-country recipient); retention schedule (proposal: 30 daily / 12 weekly, aligned with the deletion concept so backups do not silently extend data lifetimes); scheduled CronJobs in the chart; and a documented, periodically executed restore test. This closes TOM gaps B2.1–2.8 of the DPIA working draft (availability and recoverability, Art. 32 (1)(b)(c)).
  *Where:* New `templates/backup/` CronJobs + Secret in ORISO-Helm; runbook in ORISO-Docs; storage-box provisioning on the Hetzner side.
  *Acceptance:* CronJobs run on schedule on Pre-Dev; backups are encrypted at rest off-cluster; a restore of each datastore has been performed and documented once; retention enforcement verified; concept referenced in the DPIA TOM annex.

## Existing issues to link / close

- **ORISO-Docs#72** `[SEC-CLOSE] EPIC: Security Audit Closure` (open) — this epic is the KDG/infrastructure sibling; cross-link so auditors find one trail. Its Redis-Commander sub-issue is superseded by Task 8.
- **ORISO-Helm#170** Redis Commander exposure (closed) — Task 8 verifies the live state and ports the fix into ORISO-Helm; password rotation noted there is still open.
- **ORISO-Helm#192** Redis requirepass out of plaintext ConfigMap (open) — same credential-hygiene family as Task 3; keep separate, link.
- **ORISO-Helm#45** hardcoded passwords → autogenerated (open) — Task 3 is a concrete instance; link.
- **ORISO-Helm#99** ALTCHA bot protection + upload rate limit (open) — complementary to Task 2's server-side rate limits; link, do not merge.
- **ORISO-Helm#98** media scanning PoC (open) and Admin#366 media epic (on hold) — adjacent to Task 6 media handling; link for context.
- **ORISO-Helm#166** Cut PreDev over to Matrix/Element Call/LiveKit only (open) — Task 5's TURN decision should be made together with this cutover.
- **ORISO-Helm#149 / #156** ORISO-Helm as reproducible deployment authority (open) — Task 8's "fix lives in Helm" rule depends on these; link.
- **ORISO-Helm#153** retire synthetic Status surface (open) — resolves the status-page part of Task 8.
- **ORISO-Infra#6** pre-dev MariaDB publicly exposed (open) — same exposure family as Task 8 and same availability concern as Task 9; link.
- **ORISO-Helm#31** ADR-005 server_name epic (open) — touches the same ConfigMap; coordinate to avoid merge conflicts.
- No existing issue covers Synapse registration/rate-limit/media hardening, the Google STUN replacement, retention/presence, log scrubbing, or an off-site backup concept — Tasks 1–7 and 9 are new work.

## Decisions needed

- **D1 — TURN solution:** LiveKit embedded TURN vs. dedicated coturn in the chart (Task 5). Criteria: 1:1 Matrix calls vs. group calls already on LiveKit; operational surface; ORISO-Helm#166 direction.
- **D2 — Presence:** Does the product need online status for counsellors and/or advice seekers? If yes, scope it; if no, disable server-side (Task 6). Data-minimisation default is off.
- **D3 — Read receipts:** Are read receipts a product requirement, and should they be configurable per tenant? Server-side they are core Matrix sync data; the realistic lever is client behaviour plus documentation in the DPIA. Product decision required.
- **D4 — Media retention period:** Concrete `media_retention` lifetime, aligned with the counselling-session deletion concept (Task 6).
- **D5 — Synapse database target:** Postgres migration vs. documented sqlite acceptance for Pre-Dev with a Postgres requirement for production (Task 4). Recommendation: Postgres.
- **D6 — Backup parameters:** Hetzner Storage Box location/account, encryption key custody, exact retention ladder, restore-test cadence (Task 9).
- **D7 — Log retention period:** How long may ingress access logs be kept, and is any shipping/aggregation wanted before go-live (Task 7)?
