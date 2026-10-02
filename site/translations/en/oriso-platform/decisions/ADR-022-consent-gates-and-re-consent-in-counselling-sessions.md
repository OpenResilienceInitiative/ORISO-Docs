# ADR-022: Two consent gates, consent state as a session pointer, and re-consent on change

- **Status:** Accepted — Frank, 2026-08-16 (grill-with-docs session)
- **Date:** 2026-08-16
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** `ADR-021` (the documents themselves — read first); `ADR-014` (topic-before-consent
  invariant); `ADR-007` (live-chat availability; the waiting room is decoupled from counsellor
  availability); `ADR-023` (platform ↔ Träger); ORISO-UserService #927 (anonymous consent gate);
  `CONTEXT-legal-documents.md`
- **Scope:** sessions that have a **help-seeker** — 1:1 counselling, live chat, self-help groups.
  Internal rooms (supervision per ADR-008, Team-Besprechung per ADR-016) have no help-seeker and
  therefore no consent gate.

---

## Context

The live chat runs in two legally distinct phases, and conflating them has repeatedly produced
bugs that looked like frontend defects.

**Phase 1 — waiting room.** The help-seeker rolls a display name, picks a topic, and waits.
Practically nothing is stored: a cookie and a temporary password. No Beratungsstelle is assigned
yet, so no Beratungsstelle document can apply. What *does* apply is the platform-level policy —
processing begins the moment the page is opened (IP, cookies, name generation, topic selection),
exactly as a general policy applies to any site visitor before registration. Clicking "join waiting
room" is the agreement to that. Leaving the waiting room leaves nothing behind.

**Phase 2 — a counsellor accepts.** Only now is the help-seeker routed to a Beratungsstelle, which
has its own imprint and DPP. That document must be agreed to before the conversation starts.

Anonymity in this model is a property of the **read-only display name plus generated password**,
not of the chat content. As long as the display name cannot be edited, the platform can state in the
DPIA that the help-seeker is anonymous **up to the point of entering the chat**. What someone
subsequently writes into the room is outside the platform's control and deliberately not its
concern.

### Measured current state (2026-08-16, `origin/pre-dev`)

- `CreateUserFacade:303–304` deliberately nulls `dataPrivacyConfirmation` and
  `termsAndConditionsConfirmation` for the anonymous account. This is **correct** for phase 1 —
  there is no Beratungsstelle document to have agreed to — and was repeatedly misread as a bug.
- Staleness is decided by comparing the user timestamp against `tenant.contentPrivacyActivationDate`
  — a tenant-wide date with no reference to which document or which version.
- `TermsAndConditions.tsx` suppresses its update modal via `isAnonymousAsker`, which tests
  `userName.startsWith('Anonymous-')`. Generated names look like `anon_8`, so the test is false and
  the modal fires in the waiting room, where there is nothing to update. The WEITER button in that
  modal issues no request at all — a dead end that also affects registered users.
- `isDisplayNameEditable` is a **Träger** setting and reads `false` for anonymous and registered
  accounts alike. It cannot be used to identify an individual anonymous account.
- `Session` has **no consent field of any kind**.
- `AnonymousEnquiryConsentGuard` blocks assignment server-side (on `origin/pre-dev`; absent from a
  stale detached-HEAD checkout, which is why it appears missing locally).
- `AnonymousConsentGate` renders `consentLabelHtml` through `dangerouslySetInnerHTML` **without a
  sanitizer** — harmless while the input is i18n text, a real hole once Träger-authored text lands
  there.
- `CreateSessionFacade` knows two rules: `ONE_SESSION_PER_CONSULTING_TYPE` (active at all three call
  sites) and `ONE_SESSION_PER_TOPIC_ID_AND_AGENCY_ID` (implemented as
  `checkIfAlreadyRegisteredToTopicAndSameAgency`, **never passed by any caller**). Today a
  help-seeker therefore cannot open a second counselling session on the same topic with a *different*
  Beratungsstelle — which would force them into a second account.

## Decision

1. **Exactly two gates, no third.**
   - **Gate 1, entering the waiting room:** the platform-level policy (or the Träger's replacement,
     when a Träger is already resolved — see ADR-021 decision 2). One document, one agreement.
   - **Gate 2, in the room before the first message:** the Beratungsstelle / Fachbereich document.
     `AnonymousConsentGate` is that gate; ORISO-UserService #927 **is** stage 2, not an addition to
     it. Placing it inside the room rather than in front of the door is equivalent in substance and
     is already backed server-side by `AnonymousEnquiryConsentGuard`.

2. **Consent state is a pointer on the session, not a consent log.** `session` gains a nullable
   `consented_legal_version_id` referencing the legal-text version the room is cleared for. It is
   **overwritten** on re-consent; no append-only history, no per-user audit trail, no behavioural
   record. The referenced target is a public document version, so this adds no new category of
   personal data. Because ADR-021 decision 4 attaches the consent wording to the DPP, this single
   pointer covers both.

3. **Proof of what applied is carried by the publication history, not by a user log.** "Which
   wording was in force from when to when" is answered by the version history from ADR-021 decision
   3. Since no session can proceed without the gate, agreement to the then-current text follows.
   The obligation sits with the Träger / Beratungsstelle, not in a record about anonymous
   help-seekers. Decision 2 exists for **control flow** — knowing whether to open the composer —
   not as evidence.

4. **A changed text notifies inside the chat; continuing to write is the agreement.** When a
   Beratungsstelle publishes a new version, the affected rooms receive a system notification stating
   that the policy has changed, carrying the permanent link to it, and stating plainly that
   continuing the conversation constitutes agreement and that anyone who does not agree should stop.
   Reading the history is never blocked — sealing a counselling transcript would be irresponsible.

5. **Substantive changes require an explicit act.** The legal editor carries a per-version flag
   **"new consent required"**, set by the publisher. Unset (the normal case, and the default) yields
   the flow in decision 4. Set, the same notification becomes a Yes/No control that blocks *sending*
   until answered, reusing the existing frontend yes/no pattern. Rationale: a data-protection policy
   is primarily an information duty, and silent continuation is adequate for wording, addresses, and
   clarifications. It is not adequate where the **scope or legal basis** of processing changes — a
   new data category, a new recipient, new analysis. GDPR Art. 4(11) requires an unambiguous
   affirmative act there, and counselling data falls under Art. 9. Only the publishing body knows
   which case it is, so only it can set the flag.

6. **A help-seeker may hold sessions with several Beratungsstellen on one account.**
   `ONE_SESSION_PER_TOPIC_ID_AND_AGENCY_ID` is activated at the call sites in place of
   `ONE_SESSION_PER_CONSULTING_TYPE`. Forcing a second account is the worse outcome: it breaks the
   anonymity statement, the statistics, and the retention windows.

7. **A topic collision is a notice, never a block.** When a help-seeker opens a second session on a
   topic they already have open elsewhere, the **older** chat receives a friendly system note that
   another conversation on this topic exists. Neither the other Beratungsstelle nor the time is
   named, so anonymity is untouched — but the counsellor can see why and ask. This is secondary
   scope, not a blocker for decision 6.

## Consequences

**Positive:** the waiting-room modal bug class disappears by construction, because a room that has
no Beratungsstelle assigned has nothing to update; no anonymity detection is needed anywhere, so no
code has to guess from display names; two Beratungsstellen mean two independent consent states, and a
change at one does not disturb the other; the second-account workaround is removed; data minimisation
is preserved because no per-user consent trail is created.

**Negative / cost:** one nullable column plus a write path; the notification and the Yes/No branch
have to be built in the chat; activating the finer session constraint permits parallel counselling
on the same topic at two bodies, which is a professional matter, not a data-model one; the topic
notice needs the event/notification subsystem (feasibility to be verified before ticketing).

**Blocking dependency:** `AnonymousConsentGate` must be routed through the existing
`LegalContentRenderer` sanitizer *before* Träger-authored text is delivered to it. Gate 2 cannot ship
with an unsanitised `dangerouslySetInnerHTML`.

## Alternatives considered

- **Detect anonymity in the frontend and suppress the modal.** Rejected — it is the wrong predicate.
  The condition is "is this session already assigned to a Beratungsstelle", which needs no anonymity
  detection at all.
- **Store the phase-1 agreement into `dataPrivacyConfirmation` at account creation.** Rejected — it
  would satisfy the stale comparison and thereby *skip* gate 2, which is worse than the bug.
- **A per-user consent event log (who agreed to which version when).** Rejected — it creates a
  behavioural record about anonymous help-seekers that does not exist today, for evidentiary value
  the publication history already provides. Decision 2 keeps only the state needed to run the flow.
- **Always require an explicit Yes/No on any change.** Rejected — every typo would trigger a consent
  wave across all running counselling sessions.
- **Block a second session on the same topic.** Rejected — it produces second accounts, which is the
  outcome with the worst privacy properties.
