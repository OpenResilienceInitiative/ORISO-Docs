# Aktivitätsanalyse GitHub-Org `Onlineberatung` (Caritas Online-Beratungsplattform)

Stand: 2026-08-13. Erhoben per `gh api` über alle 27 Repos der öffentlichen Org.
Methode: letzte 30 Commits des Default-Branches (Mensch vs. Bot per Login-Muster
dependabot/renovate/[bot]/github-actions/snyk), offene + letzte gemergte PRs,
Releases/Tags, Issue-Aktivität, Branch-Analyse bei Auffälligkeiten.

## Gesamttabelle

„Letzter Mensch-Commit" = jüngster Nicht-Bot-Commit auf dem Default-Branch.
„–" = keiner in den letzten 30 Commits bzw. nicht vorhanden.

| Repo | Archiviert | Letzter Mensch-Commit (Default) | Letzter Bot-Commit | Offene PRs | Letzter Merge | Letztes Release |
|---|---|---|---|---|---|---|
| onlineBeratung-kubernetes-ops | nein | 2025-11-26 (roman-vi) | – | 0 | 2025-11-26 | v0.1.6 · 2025-10-22 |
| onlineBeratung-kubernetes | nein | 2025-08-26 (Leandro13Silva13) | – | 3 (ältester 2023) | 2025-08-26 | Tag-Push 2025-12-10 |
| onlineBeratung-userService | nein | 2025-04-24 (tkuzynow) | – | 20 (neuester 2025-08-28, tkuzynow) | 2025-04-24 | Dez 2022 |
| onlineBeratung-messageService | nein | 2025-06-20 (tkuzynow) | – | 5 (alle Dependabot 2022/23) | 2025-06-20 | Nov 2022 |
| onlineBeratung-nginx | nein | 2025-05-15 (tkuzynow) | – | 0 | 2025-05-15 | Nov 2023 |
| onlineBeratung-consultingTypeService | nein | 2025-02-12 (Leandro13Silva13) | – | 5 | 2025-02-12 | Feb 2023 |
| onlineBeratung-agencyService | nein | 2025-04-24 (tkuzynow) | – | 13 | 2025-04-24 | Dez 2022 |
| onlineBeratung-appointmentService | nein | 2023-04-20 (master; Merges laufen auf develop) | – | 1 | 2025-04-24 | Mär 2023 |
| onlineberatung-keycloak-otp | nein | 2025-04-24 (tkuzynow) | – | **49** (fast alles Snyk via timomayer) | 2025-04-24 | Nov 2022 |
| onlineBeratung-uploadService | nein | 2025-04-24 (tkuzynow) | – | 9 | 2025-04-24 | Nov 2022 |
| onlineberatung-liveService | nein | 2025-04-24 (tkuzynow) | – | 7 | 2025-04-24 | Nov 2022 |
| onlineBeratung-videoService | nein | 2025-04-24 (tkuzynow) | – | 8 | 2025-04-24 | Nov 2022 |
| onlineBeratung-statisticsService | nein | 2025-04-24 (tkuzynow) | – | 7 | 2025-04-24 | Sep 2022 |
| onlineBeratung-mailService | nein | 2025-04-24 (tkuzynow) | – | 10 | 2025-04-24 | Mai 2022 |
| onlineBeratung-counselingToolsService | nein | 2025-04-24 (tkuzynow) | – | 2 | 2025-04-24 | Feb 2023 |
| onlineBeratung-migrationTool | nein | 2025-04-24 (tkuzynow) | – | 0 | 2025-04-24 | Dez 2022 |
| onlineBeratung-docs | nein | 2023-03-17 | – | 0 | 2023-08-28 | – |
| onlineBeratung-frontend | nein | **2024-04-23** (janrembold) | – | **51** (Snyk + liegengebliebene Feature-PRs) | **2024-04-23** | Mai 2023 |
| documentation | nein | 2022-12-15 | – | 6 (Dependabot) | 2022-12-14 | – |
| onlineBeratung-release | nein | 2023-08-21 | – | 0 | – | – |
| onlineBeratung-k8s-config | nein | 2023-02-07 | – | 5 | 2023-02-07 | – |
| cal.com (Fork) | nein | 2023-02-26 | 2023-02-24 | 1 | 2023-02-26 | – |
| calcom-docker | nein | 2023-02-16 (actions-user) | – | 0 | – | – |
| onlineBeratung-videoBackend | **ja** | 2022-10-11 | – | 4 | 2022-10-11 | – |
| onlineBeratung-frontend-theme | nein | 2022-11-24 | – | 0 | Nov 2022 | Nov 2022 |
| .github | nein | 2022-11-17 | – | 0 | 2020-06-29 | – |
| onlineBeratung-backend | **ja** | 2022-09-30 | – | 5 | 2022-09-30 | – |

## Befunde im Detail

### 1. Aktivitätsverlauf: drei klar erkennbare Phasen
- **Bis 2022/2023 — echte Entwicklung.** Alle „Releases" (Docker-Image-Tags) stammen aus
  2022/Anfang 2023. Danach kein einziges Produkt-Release mehr in der gesamten Org
  (einzige Ausnahme: `kubernetes-ops` v0.1.6, ein Ops-Chart, Okt 2025).
- **2024 bis 24.04.2025 — reine Wartung im Auftrag.** Die Merges tragen fast ausschließlich
  fremde Ticket-Präfixe: `TSYSTEMS-140/196/213/214/215/282` (Java-17-/Spring-Boot-3-Upgrades,
  CVE-Fixes), `DELPHI-*`, `CONNECTA-*`, `DIAKONIE-*`, `CARITAS-*`. Der **24.04.2025** ist eine
  einzelne CVE-Sweep-Welle („TSYSTEMS-282 fix CVE", tkuzynow), die in ~10 Services gleichzeitig
  der letzte Merge überhaupt ist.
- **Seit Mitte/Ende 2025 — faktisch eingefroren.** Nach vereinzelten Fixes (messageService
  Jun 2025, kubernetes Aug 2025, kubernetes-ops Nov 2025) gibt es 2026 in der ganzen Org
  **keinen einzigen Merge auf einen Default-Branch**. Die einzige 2026-Aktivität:
  Ops-Feature-Branches in `kubernetes-ops` (roman-vi, „CARITAS-766 opensearch downscaling",
  Jan–Mär 2026, PRs #22/#23 **geschlossen ohne Merge**) und ein Push heute (13.08.2026,
  vermutlich Branch-/Mirror-Operation — kein neuer Commit auf main).

### 2. Frontend ist am längsten tot
Letzter Merge und letzter Commit auf `develop`: **23.04.2024**. 51 offene PRs; kein einziger
Repo-eigener Branch hat Commits nach Feb 2024. Neuere Fixes (z. B. „CONNECTA-563", Jitsi-Update,
Dez 2025) kommen als PRs **aus dem Fork `virtualidentityag/vi-saas-frontend`** und werden im
öffentlichen Repo **geschlossen, nicht gemergt** (#1041, #1042, zu am 30.12.2025). Der
Rückfluss in die öffentliche Org findet nicht mehr statt.

### 3. PR-/Dependency-Hygiene
Offene PRs sind überwiegend **Bot-Leichen aus 2022/2023** (Dependabot, Snyk), die niemand je
geschlossen oder gemergt hat — extrem in `keycloak-otp` (49 offene, fast alles Snyk).
Menschliche offene PRs (z. B. userService #712 „merge and reconcile divergent branches",
#718 „merge to onlineberatung", #719 Multitenancy-Docs, Aug 2025) liegen seit Monaten bis
Jahren unangefasst. Es wird nicht mehr gemergt, nur noch abgelegt.

### 4. Wer committet (noch)?
Ausschließlich Dienstleister-Accounts, erkennbar **Virtual Identity**:
- `tkuzynow` (Tomasz Kuzynowski) — Hauptwartungsaccount 2024/25
- `Leandro13Silva13`, `roman-vi`, `patric-dosch-vi` (vi-Suffix = Virtual Identity), `timomayer` (Snyk-PRs)
- Historisch: janrembold, web-mi, PhilippFr, CarlosSoares, adnanalicic u. a.
Keine erkennbaren Caritas-eigenen oder Community-Committer seit Jahren.

### 5. Das „Refactoring-Projekt Anfang 2026" (DSFA-Hinweis)
In der öffentlichen Org: **kein Aktivitätsschub, keine neuen Branches, keine neuen Repos**
(jüngstes Org-Repo: Feb 2023). Der Befund liegt daneben, in der Dienstleister-Org
`virtualidentityag`:
- Es existiert eine komplette Repo-Familie **`caritas-rework-onlineBeratung-*`** (12 Repos:
  frontend, admin, userService, tenantService, …), **angelegt am 04.06.2024** — das ist mit
  hoher Wahrscheinlichkeit das Rework-/Refactoring-Projekt.
- Diese Repos sind heute **alle archiviert**. Letzte Pushes überwiegend April 2025, frontend/
  userService Nov 2025, tenantService 26.01.2026. Das Rework wurde also spätestens Anfang 2026
  **beendet bzw. eingestellt und eingefroren** — von einem laufenden Refactoring-Projekt
  „Anfang 2026" ist öffentlich nichts mehr aktiv.
- Weiterentwickelt werden stattdessen **mandantenspezifische Forks** in `virtualidentityag`:
  `diakonie-onlineBeratung-*` (Pushes bis 10.07.2026), `digisucht-onlineBeratung-*`
  (bis 20.06.2026), `vi-connecta-*` (bis 20.06.2026). Die öffentliche `Onlineberatung`-Org
  ist dafür nur noch toter Upstream.

### 6. NACHTRAG 21.08.2026 — die Erhebung hatte die falsche Organisation im Blick

Die Erhebung vom 13.08. hat `Onlineberatung` (öffentlicher Ur-Upstream) und `virtualidentityag`
(Dienstleister) untersucht. Nicht untersucht wurde die **eigene öffentliche Organisation des
Verantwortlichen: `CaritasDeutschland`**. Dort liegt die Repo-Familie
`caritas-onlineBeratung-*` — Forks von `Onlineberatung/*`, Default-Branch `develop` — und die
**wird aktiv weiterentwickelt.**

| Repo (`CaritasDeutschland/…`) | Letzter Mensch-Commit | Gemergte PRs 2026 | Letztes Release |
|---|---|---|---|
| caritas-onlineBeratung-frontend | **2026-08-05** (Leandro13Silva13) | **20** | `v1-CARITAS-936` · 2026-05-20 |
| caritas-onlineBeratung-userService | **2026-08-05** | **16** | `v3CARITAS-827` · 2026-03-04 |
| caritas-onlineBeratung-agencyService | **2026-08-05** | 3 | 2022 |
| caritas-onlineBeratung-uploadService | 2026-06-24 | 3 | 2022 |
| caritas-onlineBeratung-messageService | 2026-06-09 | 2 | 2022 |
| caritas-onlineBeratung-statisticsService | 2026-06-09 | 2 | – |
| caritas-onlineBeratung-mailService | 2026-06-09 | 2 | 2023 |
| caritas-onlineBeratung-consultingTypeService | 2026-06-09 | 1 | 2022 |
| caritas-onlineBeratung-videoService | 2026-06-09 | 1 | 2022 |
| caritas-onlineberatung-liveService | 2026-06-09 | 1 | 2022 |

**51 gemergte Pull Requests im Jahr 2026**, der jüngste elf Tage vor diesem Nachtrag. Die
Aussage „2026 gab es keinen einzigen Merge" gilt ausschließlich für den Ur-Upstream, nicht für
den Verantwortlichen.

**Woran gearbeitet wird** (Titel der 2026er Merges, eigenes Ticketsystem `CARITAS-*`):
CARITAS-935/937 (Features), CARITAS-936 (mehrere Anhänge je Chat), CARITAS-943, CARITAS-973,
CARITAS-995, **CARITAS-996 (2FA-Reset im Profil)**, CARITAS-1006, CARITAS-1020 (Release Notes),
zuletzt **CARITAS-976** (Redirect-Links in der Registrierung, quer durch Frontend, UserService
und AgencyService). Ein Commit vom 10.07.2026 nennt ausdrücklich den
„Rocket.Chat display name" — der Rocket.Chat-Unterbau ist also weiterhin in Betrieb.

**Wer:** im Wesentlichen ein Entwickler, `Leandro13Silva13` (Virtual Identity), über die ganze
Breite der Dienste. Also weiterhin Auftragsentwicklung, aber **kein Wartungsmodus** —
Feature-Tickets, eigene Releases, eigene Ticketnummern.

**Die tote `rework`-Linie:** `CaritasDeutschland/caritas-rework-*` (12 Repos, Forks aus
`virtualidentityag`) endet Dez 2024 / Jan 2025, das Admin-Repo am 30.04.2025. Zeitlich fällt
das genau mit dem Umzug der Arbeit auf die Fork-Linie zusammen. Das Rework wurde nicht
fortgeführt, die bestehende Plattform stattdessen weitergepflegt.

**Konsequenz für die DSFA:** Das Altsystem ist kein auslaufendes System. Der Verantwortliche
betreibt und entwickelt es zum Zeitpunkt der Bewertung aktiv weiter. Jede Formulierung in
Richtung „wird nicht mehr gepflegt" oder „eingefroren" wäre für die Caritas-Plattform sachlich
falsch und im Dokument angreifbar. Richtig ist die Unterscheidung: **öffentlicher Upstream
eingefroren — Betreiber-Fork aktiv.**

## Fazit (korrigiert 21.08.2026)
Die Plattform wird in der öffentlichen Org **nicht aktiv weiterentwickelt**. Feature-Entwicklung
endete 2022/23 (Frontend: April 2024). 2024–April 2025 gab es ausschließlich beauftragte
Wartung (Spring-Boot-/Java-Upgrades, CVE-Fixes) durch Virtual-Identity-Accounts, finanziert
erkennbar über Fremdprojekte (TSYSTEMS/DELPHI/CONNECTA-Tickets). Seit dem CVE-Sweep vom
**24.04.2025** ist der Backend-Stack, seit **Ende 2025** die gesamte Org faktisch eingefroren;
2026 gab es keinen einzigen Merge. Dependency-Bots laufen seit 2023 ins Leere. Das in der DSFA
erwähnte Refactoring existierte als `caritas-rework-*` (Start Juni 2024) in der
Virtual-Identity-Org, ist aber inzwischen vollständig **archiviert**; reale Weiterentwicklung
findet nur noch in geschlossenen, mandantenspezifischen VI-Forks (Diakonie, DigiSucht,
Connecta) statt — nicht mehr für die öffentliche Caritas-Plattform.

**Korrektur 21.08.2026:** Das vorstehende Fazit gilt nur für die Organisation `Onlineberatung`.
Es ist als Aussage über *die Caritas-Plattform* falsch. Der Verantwortliche entwickelt seinen
eigenen öffentlichen Fork unter `CaritasDeutschland/caritas-onlineBeratung-*` aktiv weiter —
51 gemergte PRs in 2026, letzter Stand 05.08.2026, eigene Releases, eigenes Ticketsystem.
Details in Abschnitt 6.
