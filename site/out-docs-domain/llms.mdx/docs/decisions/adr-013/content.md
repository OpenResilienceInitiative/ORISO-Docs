# ADR-013 — 2FA via vendored otp-config SPI (not stock-Keycloak AIA) (/decisions/adr-013)



**Status:** Accepted · &#x2A;*Date:** 2026-07-11
&#x2A;*Context docs:** `PLAN-2fa-otp-enablement-2026-07-11.md`
&#x2A;*PRs:** ORISO-Helm #55, ORISO-UserService #392

## Context [#context]

ORISO's 2FA feature is fully built on both ends — the frontend ships a complete
setup wizard (QR code, TOTP app, email OTP, login OTP field) and the
UserService exposes the four `/users/2fa` endpoints — but both are clients of
the onlineBeratung **otp-config Keycloak SPI**, which was never deployed: the
platform runs the stock `quay.io/keycloak/keycloak:26.6.3` image. The
UserService swallows the SPI failure and reports `twoFactorAuth.isEnabled =
false`, which silently hides the whole feature. Flipping the
`identity.otp-allowed-*` flags therefore had no visible effect.

A constraint floated during triage was "no custom Keycloak image/provider".
That collides with a hard platform fact: **Keycloak's Admin REST API cannot
create OTP credentials** (read and delete only). Any design keeping QR-code
setup inside the ORISO UI needs either the SPI or unsupported DB writes.

## Options [#options]

**A — vendor the SPI (chosen).** Port
`Onlineberatung/onlineberatung-keycloak-otp` (AGPL, same upstream family as
all ORISO services) to Keycloak 26.6.3 and ship it as a thin image layer.
The port turned out minimal: one API replacement
(`CredentialHelper.deleteOTPCredential` → `removeStoredCredentialById`), one
test-scope dependency, all 53 upstream unit tests green. The SPI also ships
the direct-grant authenticators that return the `{otpType}` challenge JSON the
frontend already parses, and enables email OTP end to end (setup mail +
login-time codes) — feature parity with upstream Caritas.

**B — stock Keycloak + Application-Initiated Action.** Admin REST for
status/disable, browser redirect to `kc_action=CONFIGURE_TOTP` for setup.
Rejected because: the built wizard would be discarded for a Keycloak-themed
page; direct-grant login means no Keycloak SSO cookie, so users would re-enter
credentials during setup; stock Keycloak has no email OTP; and the UserService
OTP adapter plus the frontend panel would need rewrites. Strictly worse UX at
higher cost, saved only a 3-line Dockerfile.

## Decision [#decision]

Vendor the SPI source into `ORISO-Helm/keycloak-image/otp-config-spi/`
(provenance and local patches documented in its README), build
`ghcr.io/openresilienceinitiative/oriso-keycloak` in CI, and bind the
`direct-grant-2fa` flow in `realm.json` (fresh imports) plus
`scripts/keycloak-apply-2fa-flow.sh` (existing realms). The "no custom image"
wish is dropped as based on a wrong premise; the image is a 3-line layer over
stock, rebuilt by CI like every other ORISO image.

## Consequences [#consequences]

* 2FA works with the designed in-app UX for app-TOTP and email OTP; per-role
  flags control exposure (Pre-Dev: consultants + tenant admins).
* We own a small vendored SPI and must re-verify it on Keycloak upgrades
  (`mvn test` in CI covers this on every touch; the port surface has been one
  method so far).
* Prod rollout requires Neusta coordination (they operate prod Keycloak).
* The invite-flow two-factor gate becomes real: OTP activation flips
  `PENDING_SETUP → ACTIVE`, deletion re-opens it, and admins can waive with a
  recorded reason (four-eyes onboarding stays possible without 2FA hardware).
