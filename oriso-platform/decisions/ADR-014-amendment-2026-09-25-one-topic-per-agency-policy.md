# ADR-014 Amendment 2026-09-25: platform policy one-topic-per-agency

- **Status:** Proposed — 2026-09-25 (ORISO-UserService#1264, slice C4)
- **Amends:** `ADR-014-shared-legal-text-objects-multi-topic-agencies-topic-before-consent.md`
- **Related:** ORISO-AgencyService#132 (multi-topic agencies), `ADR-003` decision #3

## Context

ADR-014 made agencies multi-topic again: one Beratungsstelle may host several Fachbereiche.
Caritas, as an operator, needs the opposite rule on its platform: every Beratungsstelle carries
exactly one Fachbereich. Other operators still need multi-topic agencies, so the data model must
not change.

## Decision

1. **One global switch, default off.** The platform setting `oneTopicPerAgencyEnabled` lives in
   the application settings (ConsultingTypeService, `/settings` and `/settingsadmin`). It is a
   platform-level policy only: there is no per-Träger or per-agency override.
2. **The data model stays multi-topic.** `agency_topic` and `UNIQUE(agency_id, topic_id)` are
   unchanged. The switch is enforced where topics are written (AgencyService agency create and
   update), not in the schema.
3. **When the switch is on,** an agency may hold at most one topic. A create or update that would
   leave an agency with more than one topic, including a topic it did not have before, is
   rejected with `409 Conflict`, reason `ONE_TOPIC_PER_AGENCY`.
4. **Existing multi-topic agencies are not changed automatically.** They keep their topics, may
   remove topics and may be saved unchanged, but cannot gain a topic while they hold more than
   one.
5. **Admin UI:** the switch is a toggle on the Global Settings page. With the switch on, the
   agency topic picker is single-select. An agency that already has several topics shows all of
   them with a notice instead of silently dropping any (disable, don't hide).

## Consequences

- Operators choose the rule without a migration or a code change; turning the switch off
  restores ADR-014 behaviour immediately.
- Legacy multi-topic agencies stay valid data. Cleaning them up is a manual, deliberate act.
- AgencyService caches application settings (up to 10 minutes on dev/prod), so enforcement can
  lag behind the Admin toggle by that long. The Admin picker reads the setting directly.
- If the settings lookup fails, AgencyService treats the switch as off (fail open) and logs it,
  so a ConsultingTypeService outage never blocks agency edits.
