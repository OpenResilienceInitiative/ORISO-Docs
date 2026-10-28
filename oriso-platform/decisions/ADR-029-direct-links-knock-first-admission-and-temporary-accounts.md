# ADR-029: Direct links, knock-first admission and temporary accounts

- **Status:** Accepted by the product owner — 2026-10-27. Technical review open.
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
| Link management, knock-first waiting room, admit/admit all, consent step, retention label and prompt | ORISO-Frontend |
