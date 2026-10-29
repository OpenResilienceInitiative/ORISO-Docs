# ADR-029: Direct links, knock-first admission and temporary accounts

- **Status:** Accepted by the product owner — 2026-10-27. Technical review open.
- **Amended:** 2026-10-28 — see [Amendment 2026-10-28](#amendment-2026-10-28--direkteinladung-erlauben-replaces-the-call-policy-admission-holds-per-conversation) at the end. It replaces the tenant call policy and makes an admission hold per conversation.
- **Date:** 2026-10-27 (product decisions taken 2026-10-17 and 2026-10-27)
- **Decision owner:** Frank Gerhardt (product owner)
- **Amends:** ADR-020 §2 (admission and the one-time-guest identity), §3 step 3 and §7 (persistent links never reach a live room)
- **Related:** ADR-002 (silent room membership), ADR-004 (Matrix SDK, Megolm E2EE), ADR-006 (persisted conversation modality), ADR-022 (consent gates)
- **Issues:** epic [ORISO-Frontend#974](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/974), [ORISO-Frontend#1794](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1794), [ORISO-Frontend#1795](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1795), [ORISO-Frontend#1869](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1869), [ORISO-Frontend#1870](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1870), [ORISO-Frontend#1379](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1379), [ORISO-Admin#1241](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/1241), [ORISO-Admin#1242](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/1242)

## Context

ADR-020 introduced secure call invitations. Two of its rules no longer fit what counsellors need:

- **Admission.** ADR-020 §2 says "a valid authenticated or one-time identity enters directly". In practice a counsellor wants to see who is waiting before a call starts, and a shared link can reach people it was not meant for.
- **One-time guests.** ADR-020 §2 describes a "short-lived identity" bound to one invitation. Read as a passwordless guest, this does not work with the ORISO security architecture: every participant is a Keycloak user with a Matrix identity and Megolm keys (ADR-004). Without a real account the guest cannot hold keys, cannot come back to the conversation and cannot leave anything in the chat.

Counsellors also asked for links they can hand out repeatedly — on a flyer, in an e-mail signature, in a reply — that start a chat or a call with them personally. ADR-020 §7 forbids persistent links from reaching a live room. This ADR replaces those rules.

## Decision

### 1. Direct links are persistent invite links of the AgencyInviteLink model

A counsellor may create **direct links** for three conversation types: **chat**, **audio call** and **video call**. A direct link is a record of the same `AgencyInviteLink` model that already carries call-share links; there is one link model, not a second one.

- A direct link is reusable until the counsellor switches it off.
- Every person who redeems it gets **their own 1:1 conversation** with that counsellor. Two redeemers never share a room.
- The conversation lands **directly with the counsellor**, in the same way as the contact link (`?cid=`). It never appears in the enquiry inbox and is never offered to other counsellors.
- Switching a link off stops new redemptions. Conversations that already exist are not affected by switching the link off; their lifetime follows §4.

### 2. Admission: knock first for calls, direct entry for chat

This replaces ADR-020 §2 "a valid link enters directly".

- **Calls** (audio and video, via direct link or call-share link) default to **knock first**. A person who opens the link waits in the waiting room until the counsellor lets them in. The counsellor admits each person individually, or uses **"admit all"** when several are waiting.
- **Chat** via a direct link enters directly, once the person has an identity (§3) and has given consent.
- **Consent is mandatory** in both cases: the person accepts the consent of the agency that owns the link, with one tap, before entering (ADR-022 gates still apply).

A direct call link therefore never reaches a live room on its own. The counsellor's admission is what grants room membership, which keeps the intent of ADR-020 §7 while allowing persistent call links.

### 3. Temporary accounts always have a username and a password

A person without an ORISO account who redeems a link gets a **temporary account**. A temporary account **always** has:

- a **unique username**, and
- a **password**, either chosen by the person or suggested by ORISO.

The reason is the security architecture: identity lives in Keycloak and Matrix, and E2EE keys must belong to an account that can sign in again. A platform setting may **hide the password field** (ORISO then uses the suggested password silently), but it may never remove the password from the account.

This replaces ADR-020's wording of a "short-lived identity" wherever it could be read as an account without a password. The tenant policies `REGISTERED_ONLY` and `REGISTERED_OR_ONE_TIME_GUEST` from ADR-020 §2 remain; "one-time guest" now means a temporary account under this section.

> **Superseded 2026-10-28:** the tenant policies do **not** remain. They are replaced by the permission "Direkteinladung erlauben" (§6). See the amendment at the end of this record.

### 4. Lifetimes are platform settings

The platform admin sets the lifetimes in **Admin → Global settings**:

| Conversation type | Temporary account is deleted | Default | Limit |
|---|---|---|---|
| Audio / video call | after the call ends (hang-up) | 15 minutes after hang-up | hard cap 24 hours |
| Chat | when the counsellor closes or archives the conversation, at the latest after N days without activity | N set by the platform admin | — |

The values are **snapshotted when the temporary account is created**. A change applies only to people who join afterwards; existing temporary accounts keep the values they started with.

### 5. Message retention is one platform setting with three modes

What happens to messages written by a temporary account is one platform setting:

1. **Always temporary** — the messages are deleted together with the account.
2. **Warn and let the guest decide** — the guest is asked once per conversation, at the first write, paste or upload, whether their messages should be kept or deleted with the account.
3. **Always kept** — the messages stay in the conversation after the account is deleted.

Messages that will be deleted carry a **visible label** in the chat, so both sides know. Messages that are kept show the sender as **"Gast (gelöscht)"** (localised) after the account is gone.

### 6. Permission to create direct links uses the existing inheritance

A permission **"Direkteinladung erlauben"** (allow direct invitation) exists per conversation type (chat, audio call, video call). It follows the existing inheritance: platform **force-allow** or **force-deny** → Träger → Beratungsstelle. The backend enforces it at link creation and at redemption; hiding a button is not enforcement.

### 7. Out of scope

- **Booking and time windows** for direct links. They come later, under the counsellor's clock entry in the navigation.
- The old Jitsi `/termine` route and the Cal.com booking are **not** restored.

## Considered options (rejected)

- **Passwordless one-time guest.** Simple for the guest, but it breaks the security architecture (no Keycloak/Matrix account that can hold E2EE keys or sign in again) and the guest could not leave anything in the chat.
- **Direct entry for calls via a valid link (ADR-020 §2 as written).** A forwarded link would put strangers straight into a live call.
- **A separate link model for direct links.** Would duplicate validation, revocation and audit that `AgencyInviteLink` already has.
- **Direct links landing in the enquiry inbox.** The person chose a specific counsellor; routing them to the team inbox breaks that expectation.
- **Lifetimes and retention per Träger or per counsellor.** More configuration surface for no reported need; the platform setting is enough for now.

## Consequences

**Positive:** One link model covers call-share links and direct links. Counsellors control who enters a call. Temporary accounts fit the existing Keycloak/Matrix/E2EE model, so no special identity path is needed. Retention is transparent to both sides through the label.

**Cost / risk:** Temporary-account cleanup becomes a scheduled, idempotent job with snapshotted lifetimes. Knock-first needs a waiting-room UI and admit/admit-all actions for the counsellor. The "warn and decide" mode needs a per-conversation decision stored for the guest. Deleting an account while keeping its messages needs a defined display for the former sender.

## Bounded-context ownership

| Concern | Owner |
|---|---|
| `AgencyInviteLink` (direct links), redemption, 1:1 conversation creation, temporary accounts, cleanup job | ORISO-UserService with Keycloak/Matrix adapters |
| Permission inheritance "Direkteinladung erlauben", lifetimes, retention mode | ORISO-TenantService (settings), ORISO-Admin (UI) |

> **Superseded 2026-10-28 (lifetimes, retention mode):** the temporary-account settings live in ORISO-UserService, not ORISO-TenantService. Only the permission "Direkteinladung erlauben" stays with ORISO-TenantService. See Amendment §7.
| Link management, knock-first waiting room, admit/admit all, consent step, retention label and prompt | ORISO-Frontend |

## Amendment 2026-10-28 — "Direkteinladung erlauben" replaces the call policy; admission holds per conversation

- **Status:** Accepted by the product owner — Frank, 2026-10-28. Technical backend review (Keycloak/Matrix feasibility) open.
- **Changes:** §3 last paragraph (the tenant policies no longer remain), §2 (an admission holds per conversation and per call), §4 and §5 plus the bounded-context table (the temporary-account settings live in UserService), §5 mode 2 (no answer means deleted), §6 ("Meine Direktlinks" hidden while the permission is off). §1 and §7 are unchanged.
- **Issues:** [ORISO-Docs#231](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/231), [ORISO-Admin#1242](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/1242), [ORISO-TenantService#332](https://github.com/OpenResilienceInitiative/ORISO-TenantService/pull/332), [ORISO-TenantService#175](https://github.com/OpenResilienceInitiative/ORISO-TenantService/issues/175), [ORISO-Admin#703](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/703), [ORISO-UserService#1486](https://github.com/OpenResilienceInitiative/ORISO-UserService/pull/1486), [ORISO-Admin#1251](https://github.com/OpenResilienceInitiative/ORISO-Admin/pull/1251)

**1. "Direkteinladung erlauben" replaces the tenant call policy.**
§3 said the tenant policies `REGISTERED_ONLY` and `REGISTERED_OR_ONE_TIME_GUEST` from ADR-020 §2 remain. They do not. The permission "Direkteinladung erlauben" from §6 — per conversation type (chat, audio call, video call), platform force-allow / force-deny → Träger → Beratungsstelle — is the one switch for link access. There is no second, tenant-wide call policy beside it. The work planned for the old policy ([ORISO-TenantService#175](https://github.com/OpenResilienceInitiative/ORISO-TenantService/issues/175), [ORISO-Admin#703](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/703)) is replaced by [ORISO-Admin#1242](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/1242) and [ORISO-TenantService#332](https://github.com/OpenResilienceInitiative/ORISO-TenantService/pull/332). A person without an ORISO account who redeems a permitted link gets a temporary account under §3. All three conversation types start as allowed (Frank, 2026-10-28, recorded on ORISO-TenantService#332).

**2. Knock first: a valid link alone never enters a call.**
§2 stands: a person who opens a call link (direct link or call-share link) waits until the counsellor lets them in. A valid link is a reason to knock, not a key to the room. This record is the one place for the admission rule; ADR-020 links here. The chat rule in §2 is not changed by this amendment: a chat direct link creates the person's own new 1:1 conversation with the counsellor and never puts them into an existing room.

**3. An admission holds per conversation ("let in once").**
Once the counsellor has let a person in, that person does not knock again in the same conversation — not after a reconnect and not for a later call in that conversation. A new conversation (another link, or another redemption of the same link) starts with a knock again. Revoking or removing the person (ADR-020 §2) still ends their access at once.

**4. Temporary accounts: unchanged, confirmed.**
§3 stands as written: a temporary account always has a unique username and a password. A platform setting may hide the password field, never remove the password.

**5. Where the call guest ends up is decided in ADR-020.**
A guest let into a call joins the call room only, never the counsellor's source chat room, and loses access when the call ends. That decision lives in [ADR-020, Amendment 2026-10-28 §B](ADR-020-scheduled-calls-secure-invitations-and-unified-contact-calendar.md#amendment-2026-10-28--knock-first-and-the-call-guest-join-path), because ADR-020 owns the Call Session and its room membership.

**6. The "keep my messages?" question is not a consent gate — ADR-022 stands.**
The question from §5 mode 2 ([ORISO-Frontend#1869](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1869)) asks the guest what happens to their own messages when their temporary account is deleted. It is a retention choice, not agreement to a legal text, and it does not decide whether the person may enter. The one-tap consent in §2 is ADR-022's **gate 2** (the Beratungsstelle document of the agency that owns the link), shown before entry instead of inside the room — ADR-022 already treats both placements as equivalent. Gate 1 (the platform policy, or the Träger's replacement) is unchanged. So there are still exactly two gates, and [ADR-022](ADR-022-consent-gates-and-re-consent-in-counselling-sessions.md) is not amended.

**7. The temporary-account settings live in ORISO-UserService.**
The lifetimes (§4), the switch that hides the password field (§3) and the message-retention mode (§5) are platform settings owned by **ORISO-UserService**, the service that creates and deletes temporary accounts ([ORISO-UserService#1486](https://github.com/OpenResilienceInitiative/ORISO-UserService/pull/1486)). The platform admin edits them in Admin → Global settings ([ORISO-Admin#1251](https://github.com/OpenResilienceInitiative/ORISO-Admin/pull/1251)). ORISO-TenantService keeps only the permission "Direkteinladung erlauben" (§6). This replaces the TenantService owner for lifetimes and retention in the bounded-context table. Snapshotting at account creation (§4) is unchanged.

**8. No answer to "keep my messages?" means the messages are deleted.**
Under §5 mode 2 ("warn and let the guest decide", setting value `GUEST_DECIDES`), a guest who never answers the question has their messages deleted together with the account, as in mode 1. Messages are kept only after an explicit "keep". Until then they carry the "will be deleted" label.

**9. Knock notices and "Alle einlassen" are scoped to the current call.**
The counsellor's knock notice shows only the knocks of the call that is running now, not knocks from other conversations or earlier calls. "Alle einlassen" lets in only the people knocking on that call.

**10. A knock carries the person's display name.**
The counsellor sees who is knocking by the display name the person entered or was given. Internal identifiers are not shown.

**11. "Meine Direktlinks" is hidden while the permission is off.**
When "Direkteinladung erlauben" (§6) is off for every conversation type the counsellor could use, the clock entry "Meine Direktlinks" and Settings → "Meine Links" are not shown. Hiding them is for clarity only; the backend still enforces the permission at creation and redemption (§6).

**12. A call share link's public context keeps agencyId, consultingTypeId and topicId (accepted risk).**
The public context that the entry room reads for a call share link, before anyone signs in, keeps `agencyId`, `consultingTypeId` and `topicId`. The entry room needs them to show the right legal texts and to register the person with the right Beratungsstelle and topic. This is an accepted risk: the values are internal IDs only, with no names or personal data, and the link works only while the call runs.
