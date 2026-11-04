Annex 1

## Annex 1 — risks and measures (draft)

Technical part — maintained by ORISO

Risks and measures carry stable identifiers (assigned once, never renumbered), making them precisely referenceable in activities and audits. Full matrix: Annex 1 — risk analysis (in preparation). Extract of the current source baseline:

| ID | Risk | Assessment | Measures (source baseline) | Residual risk |
| --- | --- | --- | --- | --- |
| R-001 | Unauthorised access to counselling content by operator or providers | High | M-001 Megolm E2EE continuously enabled, no unencrypted sending path · M-002 externally audited implementation (vodozemac) · M-003 AES-256 file encryption without metadata upload · M-004 federation disabled | Low — administrative server functions exist; confidentiality within the counselling centre is bounded by access control (sections 5.3/5.7) |
| R-002 | Malware or unlawful images transmitted through media uploads | Medium | M-005 blur and click-to-reveal in anonymous live chat (fail-closed verdict, interim measure) · M-006 format validation and size limit for editorial uploads · M-007 fail-closed scanning proxy as agreed target architecture (ADR-019, not in production) | Medium — until scanner commissioning |
| R-003 | Account takeover through compromised credentials | Medium | M-008 2FA (authenticator app/email one-time code), enrolled for counsellors during invitation; exemption documented only · M-009 central hashed password storage (Keycloak) | Low |
| R-004 | Re-identification from statistical evaluations | Medium | M-010 aggregates only with small-cell suppression (minimum 5, fail-closed) · M-011 HMAC-SHA256 pseudonymisation of counsellor statistics | Low |
| R-005 | Loss of user key material (own history unreadable) | Medium | M-012 server-side encrypted key backup; recovery secret remains with user | Low |
