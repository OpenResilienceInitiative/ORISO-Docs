# ADR-033: Direkteinladung — direct invitation with optional appointment

- **Status:** Accepted by the product owner — 2026-11-14 (Frank; four grilling rounds, revised after the first build).
- **Date:** 2026-11-14
- **Decision owner:** Frank Gerhardt (product owner)
- **Amends:** ADR-029 (direct links become direct invitations; a link can carry an appointment; a guest can join an existing conversation) and the ADR-020 invariant that a call invitation grants no access to the source conversation history (decision 4).
- **Related:** ADR-020 (scheduled calls, secure invitations), ADR-032 (counsellor calendar: it shows these appointments but does not own the invitation flow), ADR-002 and ADR-004 (history on late join, see the amendment in ADR-002), ADR-022 (consent gates)
- **Issues:** [ORISO-Frontend#2252](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/2252), [ORISO-Frontend#2142](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/2142), [ORISO-Frontend#1869](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1869), epic [ORISO-Frontend#585](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/585)

## In plain words

Until now a counsellor could create a "direct link" for a meeting, but the link knew nothing about the meeting. Everyone who opened it landed in their own separate conversation, and the appointment overview showed none of it. This record turns the link into a **Direkteinladung** that may carry an appointment. With an appointment, everyone who opens it meets in one shared conversation (chat and call). A counsellor can also add a second person, for example an interpreter, to a conversation that already exists. That person sees what is written from the moment they join, not what was written before, and loses access when the invitation runs out.

## Context

Counsellors create a direct link for a specific meeting, sometimes with a second person such as an interpreter (Frank, voice note 2026-11-13). ADR-029 gives every link opener their own new 1:1 conversation and a temporary account. `scheduled_at` on the link ([ORISO-Frontend#2142](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/2142)) is only a label. ADR-032 decides how appointments are shown in the calendar.

## Decision

1. **Rename.** "Direktlink erstellen" becomes **Direkteinladung**. The date is optional.
2. **Without appointment:** every person who opens it gets their own conversation, as in ADR-029. It stays valid until the counsellor deletes it.
3. **With appointment:** everyone who opens it shares one **appointment conversation** (chat and call).
4. **From an existing 1:1 conversation** ("Termin anlegen" in the ⋮ menu): additional people join the 1:1 conversation by a **plain join**. No room setting is switched and no special role exists. They see messages from their join onwards because of Megolm (ADR-004). Earlier history reaches them only through the existing approval step of the history key transfer, where a person in the room reads the reason and approves (ORISO-Frontend `src/services/matrixRoomHistoryKeyTransfer.ts`, PR [ORISO-Frontend#2072](https://github.com/OpenResilienceInitiative/ORISO-Frontend/pull/2072)). They leave the 1:1 conversation when the invitation expires. This replaces ADR-020's "call guests never enter the source conversation" for chat-capable invitations: a guest may now be in a conversation room, but without earlier history.
5. **One appointment type.** An invitation with a date is the same appointment as "Termin anlegen" (start and end), created with one shared dialog component.
6. **Validity** after the appointment end: default 24 h, range 0–48 h. The stepper counts minutes below one hour and hours above; clicking the field opens a list.
7. **Expired link:** the invitee can press "Neuen Link anfragen"; the counsellor gets a notice with "Neuen Link senden". The counsellor can also send a new link from the chat on their own.
8. **Who may enter**, per invitation: guests only, accounts only, or both (the person chooses).
9. **Guests** (interpreters are ordinary guests) lose access when the invitation expires. The appointment conversation is **archived automatically** then.
10. **Timing:** the chat is usable at once; the call waiting room opens **15 minutes before** the start.
11. **Knock:** a switch, on by default, changeable during the call (ADR-029 §2 stays the default).
12. **Calendar file:** ".ics — In Kalender eintragen" now; reminders later with [ORISO-Frontend#974](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/974).
13. **Dashboard:** one page "Termine & Direkteinladungen" with two sections (with appointment, by date; without appointment, as today's tiles) and a designed empty and few-items state. Storybook comes first.

### Guests in an existing conversation

A guest is an ADR-029 temporary account. When invited into an existing conversation:

- The guest joins plainly and chooses "keep" or "delete" for their own messages ([ORISO-Frontend#1869](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1869), ADR-029 amendment 2026-10-28 §6 and §8).
- Their entries stay according to the platform's message retention mode (ADR-029 §5).
- The guest account is deleted as in ADR-029. What is new is only that the guest **leaves the conversation when the invitation expires**.

## Revision 2026-11-14 (after build)

The first build switched the room's history visibility to "joined", refused rooms with plaintext events, locked power levels and added a member marker. That is dropped: Megolm plus the approval step of `matrixRoomHistoryKeyTransfer.ts` already give "history from join" (verified on ORISO-Frontend `origin/dev`: a key request needs the requester to be a joined member, and a request from a device without the owner's cross-signing waits for a person to approve it). ADR-002's sentence "any member who joins reads the full prior history" is outdated and is amended there.

## Consequences

- Backend: the appointment, its expiry and the "leave at expiry" step live in ORISO-UserService; the frontend only presents them.
- A privacy test must show that an invited guest cannot read messages written before their join.
- ADR-032's calendar lists these appointments; it does not own the invitation.
- The glossary terms are Direct invitation, Appointment conversation and Invited guest.

## Considered and dropped

Switching Matrix history visibility to "joined" before the guest joins, with a power-level lock: not needed once Megolm and the approval step are counted, and it would change room settings for a conversation that already exists.
