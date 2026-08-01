# ADR-005: Matrix federation deliberately OFF; real DNS server_name via a clean homeserver rebuild

- **Status:** Accepted — 2026-06-26 (grill-with-docs session). Timing fixed: the clean rebuild runs early July, before any SDK-crypto work and before real carrier onboarding.
- **Date:** 2026-06-26
- **Deciders:** Frank + neusta (ops own the homeserver/SSH access)
- **Related:** [[1 Analysis/ADRS/ADR-004-chat-keep-custom-ui-adopt-matrix-sdk-megolm]] (SDK-Megolm adoption depends on stable MXIDs), findings K8-M09 / K8-M06 (insecure key handling) / DB-H04 / DB-M09 (bare-IP server_name baked into MXIDs)

## PreDev implementation exception — 2026-07-11

The sequencing rule is amended for disposable PreDev validation only:

1. SDK/Rust Megolm may run on the current legacy bare-IP namespace to prove application behavior before the ops-owned rebuild.
2. All accounts, rooms, devices, and crypto stores created under that namespace are disposable and must not become the durable onboarding identity.
3. The clean `matrix.oriso-dev.site` rebuild with federation off remains mandatory before real carrier onboarding.
4. After the rebuild, repeat multi-user messaging, reload, multi-device/recovery, audio, and video proof.

This exception records observed reality; it does not make `server_name` mutable or accept the bare-IP namespace as the final architecture. Helm #31 tracks the rebuild. Helm PR #32 was closed without merge; UserService PR #370 remains open.

---

## Context

Matrix federation in ORISO is currently **misconfigured, not deliberately off — the worst of both worlds.** Synapse runs federation **on by default**: the homeserver listener resources include `federation`, there is no `federation_domain_whitelist` / `send_federation: false` anywhere, a federation port (8009/8448) is exposed, and a `.well-known/matrix/server` delegation is advertised. At the same time it is broken and weakened:

- **`server_name` is a bare IP** (`91.99.219.182`, earlier `91.99.183.160`). This is the known anti-pattern: it bakes the IP into **every** MXID (`@user:91.99.219.182`), so any IP change orphans all users and rooms, and it cannot federate properly.
- `accept_keys_insecurely: true` and `suppress_key_validation_warnings: true` actively weaken the federation that is left on.
- The only "off" switch present is cosmetic and client-side (`ORISO-Element/config.json` `disable_federation: true`), with a domain that doesn't even match.

`server_name` is **immutable after the homeserver's first start** and is already embedded in MXIDs, so this cannot be fixed in place. There are **no production users** today.

## Decision drivers

- ORISO is a **closed counselling platform on a single homeserver**; there is no use case for federating with the open Matrix network, and federation only enlarges the attack surface.
- **MXID stability is a hard prerequisite** for adopting matrix-js-sdk Megolm crypto ([[1 Analysis/ADRS/ADR-004-chat-keep-custom-ui-adopt-matrix-sdk-megolm]]): device keys and key backup bind to MXIDs, so the `server_name` must be final before crypto is enabled.
- No production users → no migration cost; delete + recreate is acceptable (consistent with the project's "pre-prod, skip migration" rule).

## Decision

Do a **clean homeserver rebuild** with:

- environment-specific stable Matrix identity names, never a bare IP:
  - Pre-Dev: `server_name = matrix.oriso-dev.site`;
  - Dev: `server_name = matrix.oriso.org`;
  - Production/Main is outside the authorized scope of this work;
- federation **explicitly off** — `federation_domain_whitelist: []` (or `send_federation: false`), and drop the federation listener / port 8009/8448 and the `.well-known/matrix/server` delegation;
- remove `accept_keys_insecurely` and `suppress_key_validation_warnings`.

**Timing:** early July — **after** June 30 (the rebuild is *not* a prerequisite for the June-30 features, which run on the current homeserver) and **before** any SDK-crypto work and before onboarding real carriers. No data migration: existing test accounts/rooms are discarded and recreated.

**Ownership:** neusta/ops own the homeserver and SSH/kubectl access; the AI cannot and will not perform the rebuild (it is unowned infra). The AI prepares config and verification steps only.

## Considered options

- **Leave the bare-IP, half-on configuration.** **Rejected:** every additional account gets a broken `@user:IP` identity, federation stays on-yet-weakened, and SDK-crypto adoption stays blocked. The cleanup debt grows daily.
- **Keep federation ON, but do it properly** (real DNS, key validation, a whitelist). **Rejected:** there is no counselling use case for federation; it is pure added attack surface and operational complexity.
- **Fix `server_name` in place without a rebuild.** **Impossible:** `server_name` is immutable after first start and is already in every MXID.

## Consequences

**Positive:** stable, DNS-based MXIDs that survive IP changes; a smaller attack surface appropriate for a counselling tool; unblocks the SDK-Megolm crypto adoption in ADR-004; resolves DB-H04 / K8-M09 / K8-M06 in one move.

**Negative / cost:** requires a clean rebuild and ops bandwidth (neusta); all current test accounts/rooms are discarded; it must happen **before** crypto adoption or that work is redone. The dependency makes ADR-004 step 2 (SDK Megolm) wait on this.

## Status & progress (updated 2026-07-02)

- **Environment mapping clarified 2026-07-10:** Pre-Dev is the runtime source of
  truth for this initiative and must use `matrix.oriso-dev.site`. The separate
  Dev environment may use `matrix.oriso.org`. ORISO-Helm PR #32 (base `dev`)
  makes the value configurable and adds red-green guard tests against bare-IP
  identity config, but its `matrix.oriso.org` default must not be mistaken for
  the Pre-Dev overlay. The PR is green and open; the Pre-Dev value, DNS/TLS, and
  the clean live install remain pending.

- **Partially executed on Pre-Dev (oriso-dev.site) 2026-07-02** as part of the
  full-Matrix migration: Synapse upgraded **1.153.0 → v1.155.0** (latest stable,
  pinned tag instead of `:latest`), **federation listener resource removed**
  (`/_matrix/federation` now 404), `federation_domain_whitelist: []` set, and
  `accept_keys_insecurely` / `suppress_key_validation_warnings` **removed** —
  applied via `kubectl` on the pre-dev node (same mechanism as the sanctioned
  UserService hot-deploy). Backups: configmap + SQLite online backup
  (`/data/homeserver.db.bak-20260702-pre1155`), local copies in
  `~/ORISO/_e2e-artifacts/matrix-upgrade-20260702/`. **Note:** the deployment is
  helm-managed (`oriso-platform-matrix-synapse`), so a future `helm upgrade` from
  ORISO-Kubernetes will revert the image/config unless the chart is updated —
  that chart update belongs to the neusta rebuild.
- **`server_name` deliberately NOT touched** — still the bare IP
  `91.99.183.160`. Changing it requires the clean rebuild (wipes MXIDs), which
  stays **owned by neusta/ops**. No AI action on that part: the homeserver
  rebuild itself is unowned infra.
- The June-30 frontend work ([[1 Analysis/ADRS/ADR-004-chat-keep-custom-ui-adopt-matrix-sdk-megolm]])
  runs on the current bare-IP homeserver and does **not** touch crypto, so it is
  not blocked by this rebuild. The unrelated react-router v7 migration landing on
  `dev` (PR #329) has no bearing here.
- **Action for Frank/neusta:** provision DNS/TLS for `matrix.oriso-dev.site` on
  Pre-Dev (and `matrix.oriso.org` separately on Dev), then do
  the clean rebuild (federation off, drop the federation listener/`.well-known`,
  remove `accept_keys_insecurely`). This is the first hard prerequisite for the
  July crypto step and must precede `initRustCrypto`.
