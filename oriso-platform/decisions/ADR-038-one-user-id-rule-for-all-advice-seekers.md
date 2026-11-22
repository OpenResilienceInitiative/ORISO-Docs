# ADR-038: One user-ID rule for all advice seekers

- **Status:** Proposed for product and engineering review, 21 November 2026.
- **Decision owner:** Frank Gerhardt (product owner).
- **Extends:** [ADR-029 §3](ADR-029-direct-links-knock-first-admission-and-temporary-accounts.md#3-temporary-accounts-always-have-a-username-and-a-password) (temporary accounts always have a unique username and a password).
- **Issues:** epic [ORISO-Frontend#2346](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/2346), [ORISO-UserService#1696](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1696), [ORISO-UserService#1697](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1697), [ORISO-Frontend#2347](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/2347), [ORISO-UserService#1745](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1745), [ORISO-UserService#1183](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1183).

## Context

An advice seeker can reach ORISO in several ways: registering for e-mail counselling (Mailberatung), following an invitation link, or joining a live chat as a guest. ADR-029 §3 already says every temporary account has a unique username and a password. It does not say what the username looks like, or how ORISO tells a guest apart from a registered advice seeker.

In practice the platform has grown two rules. Registered advice seekers choose or roll a User-ID. Live-chat guests were long given a generated `anon_N` or `Anonymous-…` login, and many places in UserService and the Frontend recognise a guest by that **name prefix**. Every attempt to give guests a friendly rolled name broke one of those places and was undone (UserService#42, #440, #444, #460). Since UserService#1701/#1702 and Frontend#2350 new guests get a rolled animal name, but the prefix checks remain, so a guest with a rolled name is not always treated as a guest.

## Decision

1. **One User-ID rule.** Every advice seeker, guests included, gets a User-ID from the same guest identity catalog (the Frontend dice engine, mirrored by UserService#1696). The User-ID is the login. ORISO creates no new `anon_N` or `Anonymous-…` names.
2. **A guest is a fact, not a name.** Whether someone is an anonymous guest is decided by the stored registration type (`ANONYMOUS`) or the anonymous conversation, never by the shape of the username. No production code may decide this with `startsWith`, `LIKE` or a regular expression on the name.
3. **One creation path.** Guests are created through the same registration entry as the Mailberatung registration, with registration type `ANONYMOUS` as the difference (UserService#1745). The explicit guest Join (UserService#1183) uses that entry too.
4. **Existing accounts keep working.** Accounts that already carry an `anon_N` or `Anonymous-…` name are not renamed. They are recognised by their registration type like every other guest. Code that must still read such a name (for example to show a legacy label) is listed in an explicit allowlist with its reason.
5. **A CI guard keeps it that way.** UserService and the Frontend each run a check that fails when non-test code adds a new prefix-based guest detection outside the allowlist.

## Consequences

- A guest with a rolled name is queued, admitted, deactivated and deleted exactly like a former `anon_N` guest.
- Changing the naming scheme later touches one catalog, not a dozen string checks.
- The dead endpoint `/conversations/askers/anonymous/new` and the unmounted `AnonymousChat` page are removed; they only served the old naming.
- Data migration is not needed: existing guests keep their names; only the way they are recognised changes.

## How we check it

- Regression tests: a rolled-name guest and a legacy `anon_N` guest behave the same in queue, deactivation and deletion; a registered user whose name happens to start with "anon" is not a guest.
- The prefix guard runs on every pull request in UserService and the Frontend.
- On Dev: a new live-chat guest's profile shows the rolled name as User-ID, and the counsellor sees the guest in the anonymous queue.
