Chapter 10

## Result of the data protection impact assessment

Technical part — maintained by ORISO —

The processing activity “Provision and technical operation of the online counselling platform” can be implemented in the form described in Chapter 6 — **subject to the measures in the risk analysis (Annex 1) and the retention periods in the deletion concept (Annex 2)**. Without these two annexes, the substantive result is incomplete; approval is conditional on the measures specified there.

The decisive factors are the technical safeguards excluding access by the controller and its processors to actual counselling content: continuous, non-disableable end-to-end encryption of all counselling formats, including files, voice messages and media streams; data minimisation through system-generated pseudonyms; complete absence of tracking and third-party telemetry; disabled federation; self-deletion of messages and accounts; and small-cell suppression and pseudonymisation in statistics. Compared with the predecessor platform, these represent a substantial improvement in protection in the central areas of messages, files, video and anonymous live chat.

At the same time, this result is explicitly **conditional**. It assumes that the open issues identified in this DPIA are resolved before production operation. The conditions are:

- **Clarification of the backup path to an external source-code management system** (Section 6.17). If this path is active, it constitutes an impermissible third-country transfer with a practically undeletable history; approval is withdrawn until it is disabled.
- **Closing deletion gaps** and defining retention periods for the datasets identified in Section 6.18, log data and chat-service media.
- **Hardening chat-service operation**: disabling open registration, restoring rate limits, authenticated media downloads and deciding whether to disable online status.
- **Separating operational and data-access permissions** for platform administration and allowing only write access to organisation credentials, with encryption at rest (Section 6.16).
- **Replacing external STUN servers** and enabling the IP-free logging listener in identity management (Sections 6.6 and 6.10).
- **Demonstrating identity-management configuration** on the live system (password policy, login protection, token lifetimes, two-factor enforcement) and aligning the DPIA with the demonstrated state (Section 6.5).
- **Resolving open operator questions** with the hosting provider: encryption at rest, backup location and encryption, production access and administration concept, subprocessors. Without these answers, the chapter on technical and organisational measures remains incomplete.
- **Decision on the media scanning proxy** (Section 6.12): while no automated scan is active, a medium residual risk remains that must be recorded as such in the risk analysis and made transparent to organisations.

This DPIA does not cover functions that have been decided upon but not delivered — particularly appointment management (Section 6.2.6) and the media scanning proxy. They will be assessed through an update to this document upon delivery. Likewise, activation of statistics event publication, push notifications or the parked device must each be separately assessed before commissioning.

This DPIA is designed as a living document: it is updated with each release version, and every technical statement can be traced to source code, configuration or an architectural decision. Routine review takes place at the time stated in the document header and in response to substantial changes in processing.

*The final proportionality assessment (Chapter 9) and approval by the controller’s data protection officer must be added by the operator.*
