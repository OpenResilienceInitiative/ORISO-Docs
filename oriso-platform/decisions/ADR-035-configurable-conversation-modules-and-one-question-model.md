# ADR-035: Configurable conversation modules and one question model for three moments

- **Status:** Proposed — Frank, 2026-11-16 (decisions taken in the platform-greeting session; revised the same day after Frank asked for Frontend configuration and three question moments). Needs product sign-off on this written form before it is treated as canonical.
- **Date:** 2026-11-16
- **Deciders:** Frank (product) + AI (engineering)
- **Amends:** ADR-018 decisions 1, 2, 5 and 6 (fixed Baustein catalogue, single free Baustein, platform-owned ordering, no toggle on safety Bausteine, Admin-only editing). ADR-018 decisions 3, 4 and 7–11 stay.
- **Related:** ADR-018 (Erstantwort as one persisted event), ADR-014 (topic before consent), ADR-029 / ADR-033 draft (direct links and direct invitation), ORISO-UserService#1565 (no platform wording for "who reads along"), ORISO-Admin#601 (centre level), ORISO-Frontend#825 (client-side trigger), the registration-questions-per-topic decision (part C, from a separate grill session on 2026-11-16), Frontend `CircleSettingsView` / `GroupChatAuthorContentFields` (counsellor-authored welcome text and rules per group), branches `feat/platform-greeting-override` (UserService) and `feat/platform-greeting-tab` (Admin)
- **Trigger:** While the platform and centre overrides for the fixed greeting texts were being built, Frank asked for:
  - a configurable module instead of fixed text slots, separately per conversation type;
  - configuration in the Frontend as well as in the Admin;
  - one way of asking questions that serves three moments: during registration, directly after the enquiry, and afterwards as a follow-up survey.

---

## Context

ADR-018 made the Erstantwort a fixed catalogue of Bausteine with one free text and a platform-owned order. Only the Admin edits it, and there per text field:

- the Träger in TenantService `content.erstantwort*`;
- platform and centre in UserService `erstantwort_text_override`, on the unmerged branches above.

The Frontend `ErstantwortSequence` hard-codes the layout:

- greeting open;
- FAQ-like questions collapsed;
- emergency numbers last, in red, collapsed;
- closing open.

Measured on `origin/dev` (2026-11-16), four things do not fit:

1. **One sequence for all conversation types.**
   - Agency counselling (`AGENCY_COUNSELLING`), live chat (`LIVE_CHAT`) and group conversations (`SELF_HELP`) already greet in different formats.
   - Internal groups (`INTERNAL_GROUP`) have no greeting.
   - The code branches on `conversationType` instead of reading a configuration.
2. **A second, unrelated editor already lives in the Frontend.**
   - When counsellors create or edit a moderated group (`CircleSettingsView`), they write a welcome text and rules for that one conversation (`hintMessageTranslations`, `groupChatRulesTranslations`), including machine translation.
   - The agency's last configuration is offered as the default for the next group.
   - This is the most specific level of the same idea, and it shares nothing with the Admin editor.
3. **Questions are scattered or missing.**
   - Registration asks fixed fields; per-topic registration questions are being decided in a separate session.
   - After the enquiry, ADR-018 allows only action Bausteine that read existing state.
   - There is no follow-up survey.
   - Three different question mechanisms would mean three editors, three answer stores and three privacy assessments.
4. **The sequence already is a stack of messages and panels.** Every visible unit is either a plain chat message or a titled panel that starts open or collapsed. The configuration should describe that directly.

## Decision

### A. Conversation modules

1. **One module per conversation type.**
   - Each conversation type has its own module: `AGENCY_COUNSELLING`, `LIVE_CHAT`, `SELF_HELP`, `INTERNAL_GROUP`, and any type added later.
   - A type without a module sends nothing.
   - `INTERNAL_GROUP` ships empty, which is today's behaviour.

2. **A module is an ordered list of sections, built from a shipped prototype.**
   - The platform ships one translated prototype per conversation type: all seven language versions, today's wording, gender-neutral per ADR-018 decision 7.
   - An editor starts from the prototype and may delete, reorder and retitle sections, and add new ones.
   - "Reset to prototype" is always available.

   Each section has:
   - a **kind** (decision 3);
   - a **title** — required for panels, absent for a plain message;
   - a **display state**: `open` (shown as text) or `collapsed` (title only, expands on tap);
   - per-language content, written in the editor's source language and machine-translated on publish, as today.

3. **Four section kinds.**
   - **Message** — a plain chat bubble. The greeting and the closing are messages.
   - **Panel** — a titled accordion panel with rich text. "Who reads along", the emergency numbers and the free notice are panels.
   - **Fixed module** — a platform component the editor can place and title, but whose behaviour and data come from the system. Examples: the e-mail module (still subject to ADR-018's conversation account controls), the consent card, the account-completion card. It renders live state and is never free text, so ADR-018 decision 2's guardrail survives here.
   - **Question block** — a set of questions in the shared question model (part B). The questions the person is asked right after the enquiry live here.

4. **Who edits, and where.** The resolution chain extends ADR-018 decision 6 by one level at the front:

   `Conversation ?? Beratungsstelle ?? Träger ?? Plattform ?? shipped prototype`

   - **Admin** edits the platform, Träger and Beratungsstelle levels, per conversation type.
     - Each conversation-type tile shows two direct fields, **Begrüßung** (opening message) and **Abschließende Fragen** (closing questions).
     - A button on the tile opens the full configurator as a dialog.
   - **Frontend** edits the conversation level: one specific conversation a counsellor creates or runs.
     - Group conversations (`SELF_HELP`, today's `CircleSettingsView`) and direct invitations (ADR-033 draft) get the same configurator, as a dialog from their settings screen.
     - It is prefilled with the resolved module of the agency, not with the agency's last group as today.
     - Agency counselling and live chat have no conversation level: the enquiry exists before any counsellor does.
   - Both apps use **one shared configurator component**, specified once in Storybook. The two apps differ only in which level they write.

5. **Whole-module resolution.**
   - The most specific level that saved a module for that type wins as a whole.
   - Sections are not merged across levels: an editor sees exactly what is sent.
   - A lower level starts its own module as a copy of the module it currently inherits.

6. **Safety sections are the editor's responsibility.**
   - Every editor may remove, reorder or collapse any section, including the emergency numbers and "send us no personal data".
   - This replaces ADR-018's interim rule that the two safety Bausteine have no toggle (product decision, Frank, 2026-11-16).
   - Admin and Frontend warn, but do not block, when a module for `AGENCY_COUNSELLING`, `LIVE_CHAT` or `SELF_HELP` has no emergency section.

7. **Triggers stay the platform's.**
   - Section order is free.
   - Section triggers stay platform-assigned per fixed-module kind: chat entry, after the first message, after dispatch, after assignment.
   - So no configuration can place a data-collecting module before consent (ADR-018 decision 5 survives for triggers).

8. **Delivery is unchanged.**
   - The resolved module is frozen into one `[SYSTEM_NOTIFICATION]` event at send time (ADR-018 decisions 3 and 4).
   - The payload gains `version: 2`, an ordered section list (`kind`, `title`, `display`, then `body`, `module` or `questions`).
   - Version-1 events keep rendering as today.

### B. One question model for three moments

9. **The question model.** One definition serves every place where ORISO asks the person something.

   | Element | Meaning |
   |---|---|
   | **Question types** | free text, single select (radio), single select (dropdown), multi select |
   | **Hint** | text-only, no answer |
   | **Per question** | id, label, optional help text, required yes/no, options (for select), per-language texts |
   | **Answers** | stored per question id with the question's version, so a later edit never changes the meaning of an old answer |

   - A "select field" (Frank's term) is the dropdown rendering of single select, not a separate type. Radio vs. dropdown is a display choice of the same question.

10. **Three moments, one model.**

    | Moment | When | Configured at | Owner of the decision |
    |---|---|---|---|
    | **1. Registration** | before the conversation, while registering; Mailberatung only | per topic, and per secret link (part C) | this ADR, part C |
    | **2. During** | after the first enquiry, at a moment the editor picks from platform-defined triggers, as a question block in the conversation module | per conversation type and level (decision 4) | this ADR |
    | **3. At the end** | when the conversation or the counselling ends, as a follow-up survey | per conversation type and level, same configurator | this ADR; trigger options are platform-assigned, as in decision 7 |

    - The editor component, storage format and translation path are shared across all three moments.
    - Only the moment and its trigger differ.

11. **Answers are personal data in a special-category context; the platform does not gate them.**
    - Frank, 2026-11-17, for registration: the platform does not block storing answers behind a DSFA entry; data protection is the operator's / Träger's responsibility. What matters is that the questionnaire gets filled in.
    - Moment 1: answers are held only temporarily while the person registers and are assigned to the matched Beratungsstelle once registration completes.
    - Moments 2 and 3: whether the same rule applies, or whether their answers wait for a DSFA entry (purpose, retention, who may read them), is open (see Open questions). Until decided, they can be configured and previewed, and a question block renders as a hint.
    - The follow-up survey must also say whether answers are linked to the conversation or collected anonymously. That is an open product question (see Open questions).

### C. Moment 1: registration questions per topic (Mailberatung)

Grilled with Frank on 2026-11-16 in a separate session; this part records it, there is no separate ADR. The record with the measured `origin/dev` state is `registration-questions-per-topic.md` in the shared session notes.

13. **Scope: Mailberatung only.**
    - Mailberatung is conversation type `AGENCY_COUNSELLING` — not a topic, not a consulting type.
    - Live chat, video and groups get no registration questions this way.

14. **Four building blocks of Mailberatung.**
    - **Access:**
      - findable through the official search, or
      - a **secret link** to one or more Beratungsstellen "off the record".
      - Platform, Träger and Beratungsstelle admins may create such links in the Admin. Counsellors use finished links; they do not build questionnaires.
    - **Before the conversation (moment 1):**
      - always: user name and password;
      - optional: e-mail, postcode, further questions;
      - the greeting texts.
    - **During (moment 2):** after the first enquiry, at a controllable moment.
    - **At the end (moment 3):** at the end of the conversation or the counselling.

15. **The topic decides; one official questionnaire per topic.**
    - Questions are configured per topic; the platform admin creates topics.
    - The official registration has exactly one questionnaire per topic. What it asks applies to everyone; the Beratungsstelle is matched as today. It may hold more than one question once the topic's Beratungsstellen agree.
    - A topic without its own setting inherits the **platform default**. On Caritas installations that default is: postcode on, everything else off.
    - The topic replaces the consulting type's `registration.mandatoryFields.age/state` for Mailberatung. Before the switch, the age/state requirements centres have today are migrated into their topics, so no question silently disappears.
    - A topic can be hidden from the normal registration ("link only"). Example: U25 has supervision, and Caritas wants one Fachbereich per Beratungsstelle, so U25 may be its own hidden topic.
    - Required or optional is set per question; in the first step the postcode is required when it is on.

16. **First step: one question on/off per topic, platform level only.**
    - On Dev the only switchable question is the postcode.
    - Without a postcode, the person sees the list of Beratungsstellen for the topic and chooses one. A nationwide contact point is possible as the topic's fallback Beratungsstelle in the access settings.
    - The full configurator (up to ~20 steps) and Träger / Beratungsstelle levels follow once subdomains are done.

17. **Secret links (Mailberatung, like live chat).**
    - Special flows exist only through a link that must be shared. A topic has one official questionnaire plus any number of link questionnaires.
    - A link preselects one Beratungsstelle and one or more topics.
    - It says whether the postcode is asked.
    - It may carry its own questionnaire and greeting with its own rules. Example: U25 — not in the official search, asks for age, has its own greeting.
    - **One questionnaire, three visibilities** instead of a precedence chain: a questionnaire is shown (a) in the official registration and in additional links, (b) in a link only, or (c) in the topic's official registration only. Case (c) needs no duplicate link.
    - **Several topics in one link:** the topic choice is a required first field; after the choice, that topic's questions apply. With exactly one topic the choice is skipped.
    - **Recognisable:** an enquiry made through a link carries a label with the link's name (e.g. "U25") in the inbox, filterable. There is no separate inbox.
    - When a link is created, the system asks: let the guest straight in, or answer questions first. The preselection is "answer questions".

18. **A follow-up enquiry on another topic asks all of that topic's questions again**, including ones already answered.

19. **Where it is edited.**
    - Admin: Funktionszugriff → Mailberatung (with links and the contact point), as a tile with a button that opens the shared configurator.
    - The configurator prototype has a "Registration per topic" tab; on Dev only the postcode is on.
    - Settings → Topics keeps names, icons and categories.

20. **Stepper.** The registration stepper is redesigned so that it looks right with 2 steps and carries ~20 (design task).

21. **Side requirement.** The four conversation types get their own configurable names and icons.

### D. Storage

22. **Modules and questions are stored in UserService.**
    - Modules: one row per (scope, scope id, conversation type) holding versioned JSON, beside `erstantwort_text_override`.
    - Scopes: `PLATFORM`, `TENANT`, `AGENCY`, `CONVERSATION`.
    - Migration so that nothing an editor saved is lost:
      - The text-override rows from the first platform/centre slice become an `AGENCY_COUNSELLING` module at the matching level.
      - Träger content in TenantService `content.erstantwort*` is migrated the same way.
      - Group welcome texts and rules (`hintMessageTranslations`, `groupChatRulesTranslations`) become conversation-level `SELF_HELP` modules: a message plus a "rules" panel.
    - Question definitions are part of the module JSON.
    - Answers go in their own table keyed by conversation, question id and question version. Registration answers are held client-side until registration completes and are then stored with the enquiry for the matched Beratungsstelle (decision 11).

## Consequences

- **The held platform/centre override PRs land with the builder as one PR set** (Frank, 2026-11-16). Their storage, access checks (`AdminScope`) and translation flow are reused; their fixed-slot editors are replaced by the configurator.
- **Storybook first, in this order:**
  1. the shared configurator: tile with two fields, dialog, section list, the four kinds, question editor, prototype reset, safety warning, and a "Registration per topic" tab (Dev state: postcode only) — desktop and mobile;
  2. the Frontend `ErstantwortSequence` rendering version-2 payloads, including a question block;
  3. the group settings dialog using the shared configurator.

  Backend work starts after Frank approves the stories.
- **Registration is built in slices.**
  1. Postcode on/off per topic at platform level. Needs a field on the topic, so it depends on the topic-defaults work, branch `feat/topic-defaults-seed-override`.
  2. Stepper design.
  3. Registration as moment 1 in the shared configurator.
  4. Secret links for Mailberatung (created by platform, Träger and Beratungsstelle admins; inbox label per link; topics hidden from normal registration).
  5. Names and icons of the conversation types.
  6. Träger / Beratungsstelle levels after subdomains.
- **Translation:**
  - Admin uses the TenantService translate endpoint.
  - A centre-only admin cannot call it (`AUTHORIZATION_UPDATE_TENANT`). They publish untranslated, and missing languages fall back as in ADR-018 decision 8.
  - The Frontend keeps its existing group-content translation path until both are unified.
- **Lost guarantee:**
  - ADR-018 guaranteed that every advice seeker sees emergency numbers. Under this ADR that holds only while the editor keeps the section.
  - The remaining controls are the warning (decision 6) and the audit columns (`updated_by`, `update_date`).
  - The DSFA transparency record must say so.
- **ORISO-Frontend#825** (client-side trigger without a server event) must read the resolved module, or be retired.

## Open questions

1. **Follow-up survey:** anonymous, or linked to the conversation? Who sees the answers — the counsellor, the Beratungsstelle, only aggregated statistics?
2. **Follow-up survey trigger:** on conversation close, after N days without messages, sent by the counsellor by hand, or all three?
3. **Live chat:** does live chat need a conversation level after all, e.g. per live-chat slot?
4. **Answers in moments 2 and 3:** no platform gate as for registration (decision 11), or wait for a DSFA entry?
5. **Registration answers:** how are today's `session_data` (age, state) and `session.postcode` migrated to answers with question id and version? Which live installations require age/state today?
6. **Counsellor link for Mailberatung:** today it exists only for live chat. Align the scope with the direct-invitation draft (ADR-033).

## Rejected

- **Keep the fixed catalogue and add toggles per Baustein.** Covers "hide the crisis line", but not own sections, ordering or per-type formats.
- **Per-section inheritance across levels** (a centre changes one panel and inherits the rest). Every module would be a merge of up to five sources, and no editor could see what is actually sent.
- **One module for all conversation types with per-section type filters.** Harder to read than one short list per type, and internal groups would need an "everything off" special case.
- **Separate question mechanisms for registration, first reply and survey.** Three editors, three answer stores, three DSFA entries for the same act of asking a person something.
- **Admin-only configuration.** It would drop the per-group welcome text and rules counsellors already write in the Frontend.
