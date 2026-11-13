# ADR-032: Counsellor calendar module and external calendar sync

- **Status:** Accepted — 2026-11-13 (Frank)
- **Date:** 2026-11-13
- **Deciders:** Frank (product), calendar refinement session
- **Extends:** ADR-020 §4, §5 and §9 (unified Contact Calendar, availability blockers, confidentiality-neutral external data). ADR-020 stays in force; this record decides *how* the calendar is built and synced.
- **Related:** ADR-012 (group occurrences, Future Timeline), ADR-029 (direct links), ORISO-Frontend#974 (epic), ORISO-Frontend#1050, ORISO-UserService#1000, ORISO-Frontend#2010 (cal.com booking)
- **Research:** Knowledge Core `03 - ORISO CC/40 - Analysis & Evidence/42 - Research/RESEARCH-2026-11-13-counsellor-calendar-and-sync.md` (primary sources, checked 2026-11-13)

## Context

Counsellors need a real calendar (day, week, month, list) and an overview of upcoming appointments, and they want their ORISO appointments in the calendar they already use: Google Calendar, Microsoft Outlook / 365 or Apple Calendar.

Facts that shaped the decision (sources in the research file):

- ORISO-Frontend has no calendar UI library. The `/booking` area is the old cal.com UI, switched off (`calcomUrl: ''`), and calls an `appointmentservice` that is not deployed. `@calcom/embed-snippet` is still a dependency and is licensed under the "Cal.com Commercial License (EE)".
- 1:1 appointments already live in ORISO-UserService (`session_appointment`, ORISO-UserService#1566, on `dev` since 2026-11-03). Group occurrences live on `Chat` plus `chat_occurrence_exception`. An RFC 5545 export helper exists (`src/utils/appointmentIcs.ts`).
- Cal.com stopped being open source on 2026-04-15. The public repository is now `calcom/cal.diy` (MIT), without teams, workflows or routing, and described by its maintainers as for personal, non-production use.
- FullCalendar v7 core, React adapter and RRULE plugin are MIT. Its team/resource and timeline views are Premium and **not** MIT.
- A read-only ICS subscription reaches Google, Outlook and Apple with one link, but those clients refresh it on their own schedule (Outlook documents about 3–6 hours) and store the feed on their servers.
- Two-way sync through the Google Calendar API or Microsoft Graph needs app verification, per-tenant consent and renewal jobs. CalDAV covers Apple and Android but not Outlook or Google.
- Counselling appointments may fall under professional secrecy (§ 203 StGB). Even the name of an advice seeker in an external calendar is a disclosure to the calendar provider.

## Decision

### 1. Own data, FullCalendar MIT core for the UI

The calendar is an ORISO-Frontend feature built on the **MIT packages of FullCalendar** (core, React adapter, day/week/month/list views, interaction, RRULE). ORISO-UserService stays the only source of truth for appointments, group occurrences and blockers (ADR-020 §4 read projection).

- No FullCalendar Premium package is used. No Premium source code is copied or re-implemented line by line.
- Cal.com and cal.diy are not used. The old cal.com UI, its routes, the `@calcom/embed-snippet` dependency and the legacy `appointmentservice` client are removed (closes the open question in ORISO-Frontend#2010).

### 2. Views and actions

- **Counsellors:** day, week, month and list views. The list view is the "upcoming appointments" overview. On phone widths the list view is the default.
- Counsellors **create** an appointment by selecting a free time (choosing the conversation it belongs to), **move** it by dragging (the advice seeker is notified as on any reschedule), and create **availability blockers** the same way.
- **Advice seekers** get a read-only calendar view and the list of their own appointments, plus the existing single-appointment "add to my calendar" export. They get **no** subscription link.

### 3. Team view as ORISO's own code

Counsellors of the same Beratungsstelle can show colleagues' calendars side by side or as overlays. This is built as ORISO code on top of the MIT core (per-person columns or colour layers), not with FullCalendar Premium.

A colleague's entry shows only **busy + kind** (1:1 appointment, group date, absence). No advice-seeker name, no topic, no note.

### 4. Outbound sync: one secret ICS subscription link per counsellor

ORISO-UserService serves an RFC 5545 feed per counsellor at an unguessable, revocable URL. The counsellor can copy it, see when it was last fetched, and reset it (the old link stops working at once). The feed contains the counsellor's appointments and group dates.

Every external event is confidentiality-neutral (ADR-020 §9): a neutral title such as "ORISO-Termin", start and end, and a link into ORISO that works only after login. It contains no advice-seeker name or user name, no topic, no agency, no note and no call link.

### 5. Inbound: busy times from the counsellor's own calendar

A counsellor can paste the private ICS address of their Outlook or Google calendar. ORISO-UserService fetches it on a schedule and keeps **only busy time ranges** (no titles, no descriptions, no attendees). These ranges act like availability blockers for booking and show as "busy" in the counsellor's own view. Removing the address deletes the stored ranges.

### 6. Not now

Two-way sync through the Google Calendar API, Microsoft Graph or a CalDAV server is out of scope. It may be reconsidered when a Träger requires it; that would need a new decision including the Träger's data protection officer.

### 7. Delivery order: Storybook first, Frank's click-through acceptance, then backend

1. **Clickable prototype** of the calendar on the FullCalendar MIT core, for early feedback.
2. **Frontend in Storybook first**, against mocked data: every view, the create/move/blocker flows, team view, feed and import settings, advice-seeker view, empty/loading/error states, phone and desktop. Everything uses the ORISO design system (tokens, components, Figma `App.Oriso` → `Termine`); no one-off styling.
3. **Click-through acceptance by Frank** of every function in Storybook. Nothing is wired to the app before this acceptance.
4. **Backend afterwards** (UserService projection, feed, import, write endpoints), shaped by the accepted Storybook behaviour. Then app wiring and real-browser tests on Dev.

### 8. Priority

All parts above are P1 (Frank, 2026-11-13).

## Bounded-context ownership

| Concern | Owner |
|---|---|
| Calendar projection, ICS feed, feed tokens, inbound busy import | ORISO-UserService |
| Calendar views, create/move/blocker UI, team view, feed and import settings UI | ORISO-Frontend |
| Removal of the cal.com integration | ORISO-Frontend, ORISO-UserService, ORISO-Helm |

## Considered options (rejected)

- **Self-hosted Cal.com / cal.diy** — no longer an open-source product; non-production disclaimer; a second stack and database for a feature ORISO already models.
- **Schedule-X** — drag & drop and the event dialog are paid; no documented accessibility.
- **react-big-calendar** — no recurrence rules, no documented accessibility, slow maintenance.
- **FullCalendar Premium for the team view** — not MIT; ORISO builds the team view itself instead.
- **Two-way Google/Microsoft API sync now** — app verification, per-tenant consent, renewal jobs and appointment data at US providers.
- **CalDAV server now** — another service to run, and it does not reach Outlook or Google.
- **Advice-seeker subscription links** — another permanent channel that could expose an anonymous advice seeker.

## Consequences

**Positive:** one stack, one source of truth, no paid licence and no licence review for the chosen parts. One link reaches all three major calendars. External calendars never learn who the advice seeker is. The inbound import prevents bookings into busy time without OAuth.

**Cost / risk:** ICS subscriptions refresh slowly (hours), so counsellors must treat ORISO as the live source. A leaked feed URL exposes neutral time slots until reset. The team view, drag-to-move and the import job are ORISO code to build, test and maintain. Accessibility of the FullCalendar views must be verified with keyboard and screen reader (BITV 2.0); the list view is the accessible fallback.
