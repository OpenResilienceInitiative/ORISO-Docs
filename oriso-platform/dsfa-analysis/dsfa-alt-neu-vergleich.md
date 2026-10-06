# DSFA-Faktenbasis: Alt/Neu-Vergleich Caritas 1.0 ↔ ORISO

Stand: 2026-08-13 · Autor: Technik-Vergleichs-Analyst (Agent) · Status: Entwurf zur Freigabe durch Frank
Zweck: Technische Wahrheit als Grundlage für eine neue Datenschutz-Folgenabschätzung (DSFA). Dieses Dokument wird nach Freigabe ein eigenes Parent-Issue in GitHub (dort: Englisch).

Quellen:
- ALT: GitHub-Organisation `Onlineberatung` (github.com/Onlineberatung), README/Doku-Ebene, nicht Tiefenlektüre jedes Repos.
  **Nachtrag 21.08.2026:** Der produktiv betriebene Stand der Caritas ist nicht dieser Upstream, sondern der
  Betreiber-Fork `CaritasDeutschland/caritas-onlineBeratung-*` (Branch `develop`), der 2026 aktiv weiterentwickelt
  wird (51 gemergte PRs, zuletzt 05.08.2026). Die Funktionsaussagen unten bleiben gültig — der Architekturkern
  (Rocket.Chat, messageService, Jitsi) ist im Fork unverändert —, aber „ALT" heißt **nicht** „stillgelegt".
  Siehe `dsfa-onlineberatung-aktivitaet.md`, Abschnitt 6.
- NEU: Lokale Repos unter ``<repo-root>`/` (insb. `ORISO-Helm/templates/` als Deployment-Wahrheit) sowie ADR-Bestand in `0 - Docs/`.
- Vom Auftraggeber bestätigte Fakten (Matrix-only, E2EE dauerhaft an, Keycloak+2FA live, etc.) sind als gesichert übernommen.

---

## 1. Repo-/Service-Landschaft alt vs. neu

Caritas 1.0 = Microservice-Zoo um Rocket.Chat (alle Java-Services AGPLv3, Fork-Basis von ORISO-UserService u.a.).
ORISO = konsolidierte Plattform um Matrix Synapse; Deployment-Wahrheit ist das Umbrella-Chart `ORISO-Helm` (Templates: admin, agencyservice, consultingtypeservice, element-call, frontend, health-dashboard, keycloak, livekit, matrix, nginx, tenantservice, userservice; Subcharts: keycloak, mariadb, mongodb, rabbitmq, redis).

| Funktion | Caritas 1.0 | ORISO | Delta |
|---|---|---|---|
| Nutzer-/Session-Lifecycle, Registrierung, Enquiries | onlineBeratung-userService (verwaltet Rocket.Chat-Gruppen) | ORISO-UserService (Fork, verwaltet Matrix-Räume; Delete-/Deactivate-Workflows Matrix-aware) | Umgebaut auf Matrix |
| Chat-Server | Rocket.Chat (extern betriebene Komponente, MongoDB) | Matrix Synapse + matrix-js-sdk im eigenen UI (ADR-004); Rocket.Chat vollständig entfernt | Ersetzt |
| Nachrichten-Verschlüsselung | onlineBeratung-messageService: Middleman, AES-Verschlüsselung serverseitig; Schlüssel = Service-Key + Session-ID + „Masterkey" (nach jedem Neustart manuell einzugeben). Server KANN entschlüsseln → keine E2EE | Olm/Megolm-E2EE dauerhaft AN, Schlüssel nur bei den Clients; Silent Key Backup für Recovery | **Neu: echte E2EE** — messageService ersatzlos entfallen |
| Datei-Upload | onlineBeratung-uploadService: Middleman zu Rocket.Chat, Typ-/Mengenlimits, gleiche Serverseitige Verschlüsselung | Matrix-Media, E2EE-verschlüsselt; matrix-content-scanner fail-closed (ADR-019), Media-Flag-Familien pro Chat-Typ (ADR-015); EPIC Admin#366 (Phasen-Split, teilweise on hold) | Ersetzt + Virenscan neu |
| Video-Beratung | onlineBeratung-videoService (JWT-Erzeugung) + videoBackend (Jitsi/Prosody, archiviert); Gast-Links für Anonyme; Jitsi = Transportverschlüsselung, SFU sieht Medien | LiveKit + Element Call (ORISO-Livekit, ORISO-ElementCall, im Helm-Chart deployed); Media-E2EE in Calls | Ersetzt, **E2EE neu** |
| Live-Events an Client | onlineberatung-liveService (STOMP-WebSocket) | Matrix Sync (nativ) | Entfallen/nativ |
| Agenturen + PLZ-Zuordnung | onlineBeratung-agencyService (README: „Currently it doesn't contain authorization within the public REST API calls") | ORISO-AgencyService (Fork; Sort-Whitelist, restricted-agency-admin etc.) | Fortgeführt, gehärtet |
| Beratungstypen/Settings | onlineBeratung-consultingTypeService (ebenfalls ohne Auth auf Public API) | ORISO-ConsultingTypeService (Fork) | Fortgeführt |
| Mandantenfähigkeit | — (nicht in der Onlineberatung-Org; Caritas 1.0 de facto ein Mandant) | ORISO-TenantService + Global Settings im Admin-Panel; Träger sind KEINE App-Nutzer (tokenisierte Links) | **Neu** |
| Termine | onlineBeratung-appointmentService + cal.com-Fork + calcom-docker: CRUD auf lokale cal.com-Instanz, Bookings, CalDav-Anbindung | **Nicht vorhanden.** Kein appointmentservice-Template im Helm-Chart; `FEATURE_APPOINTMENT_ENABLED: "false"`; im UserService/Frontend nur tote Fork-Reste (AppointmentConfig, generierte API-Clients, Endpoints) | **GAP — bewusst? klären** |
| 2FA/OTP | onlineberatung-keycloak-otp (Keycloak-SPI: App-TOTP + E-Mail) | Gleicher Ansatz, vendored otp-config SPI (ADR-013); TOTP + E-Mail-OTP live | Fortgeführt, gepflegt |
| Auth allgemein | Keycloak | ORISO-Keycloak (OIDC; Achtung: echtes Image/Config liegt im neusta-Branch, lokales Repo = toter Dump) | Fortgeführt |
| E-Mail-Versand | onlineBeratung-mailService (interner REST-Dienst, Templates) | Kein MailService; Versand direkt aus Services via SMTP (Helm: SMTP-Credentials-Gate), E-Mail-Designsystem FE#828, 4 Sendewege | Konsolidiert |
| Statistik | onlineBeratung-statisticsService (konsumiert statistische Events, eigene Speicherung) | Kein eigener Service; Consultant-Statistik-Endpunkte im UserService (Privacy-gehärtet: message-stats privacy shipped) | Verschlankt |
| Beratungs-Tools | onlineBeratung-counselingToolsService | — | Entfallen |
| Frontend | onlineBeratung-frontend + frontend-theme | ORISO-Frontend (Fork, stark umgebaut: React Router v7, Stepper-Registrierung, M3-Design) | Fortgeführt/umgebaut |
| Admin | (in Frontend/Services integriert) | ORISO-Admin (eigenes React-19-Panel) | **Neu als eigenes Produkt** |
| Infra/Deployment | onlineBeratung-kubernetes(-ops), k8s-config, nginx, release | ORISO-Helm (kanonisches Umbrella-Chart `oriso-platform`, Helm-only, Single-Domain-Path-Routing per ADR-011), ORISO-Infra/-Kubernetes | Konsolidiert |
| Datastores | MariaDB (Services), MongoDB (Rocket.Chat) | MariaDB, Redis, RabbitMQ, Postgres (Synapse); MongoDB-Subchart noch im Umbrella-Chart, Entfernung läuft (Worktree user-remove-mongodb-855) | Bereinigung offen |
| Observability | — (nichts Vergleichbares in der Org sichtbar) | SignOZ (ORISO-SignOZ), Sentry, Health-Dashboard, Status | **Neu — eigener DSFA-Punkt (PII in Logs/Traces)** |
| Migration | onlineBeratung-migrationTool | — (keine Prod-Nutzer → keine Migration, bestätigte Linie) | Entfällt |

---

## 2. Datenschutz-relevante Deltas (Bewertung je: besser / gleich / schlechter / unklar)

### 2.1 Verschlüsselung
- **Transport:** Beide TLS. → **gleich**.
- **Nachrichten-Inhalte:** Alt = serverseitige AES-Verschlüsselung via MessageService-Masterkey; Betreiber konnte technisch entschlüsseln (Schlüsselteile auf dem Server, Masterkey im RAM). Neu = Olm/Megolm-E2EE dauerhaft an; Betreiber sieht nur Ciphertext. → **besser** (zentrales DSFA-Argument).
- **Dateien/Medien:** Alt = Upload nach Rocket.Chat, serverseitig behandelt. Neu = E2EE-Media; Virenscan via matrix-content-scanner fail-closed (ADR-019) — d.h. Scan-Punkt entschlüsselt Medien kontrolliert serverseitig zum Scannen. → **besser**, aber der Scanner-Entschlüsselungspunkt muss in der DSFA explizit beschrieben werden.
- **Video/Audio:** Alt = Jitsi (Transportverschlüsselung; SFU hat Medienzugriff). Neu = LiveKit/Element Call mit Media-E2EE. → **besser**.
- **At-rest (Datenbanken):** Alt wie neu: keine dokumentierte DB-/Volume-Verschlüsselung (MariaDB/Postgres). Chat-Inhalte liegen neu zwar nur als Megolm-Ciphertext in Synapse-Postgres, aber Metadaten + Fachdaten (Sessions, Agenturen, Konten) unverschlüsselt at-rest. → **unklar — muss besprochen werden** (Hosting-/Disk-Encryption-Frage an Betreiber Neusta).
- **Wichtig für DSFA-Ehrlichkeit:** ADR-002 stellt klar, dass Raum-Zugriffskontrolle („confidentiality curtain") organisatorisch/autorisierend wirkt und NICHT selbst E2EE ist; die E2EE kommt aus ADR-004 (Megolm). Beide Ebenen sauber getrennt darstellen.

### 2.2 Registrierung & Anonymität
- Alt: Username frei wählbar, PLZ → Agency, Consulting-Type-Auswahl; zusätzlich „anonymous counseling" ohne Registrierung (U25-Muster).
- Neu: Stepper-Registrierung mit Topic-Auswahl, PLZ → Agency; **anonymisierte Nutzernamen per shared Anonymous-Name-Engine** (kein frei gewählter, potenziell identifizierender Name); Username-Cap + Avatar-Palette. → **besser** (Datenminimierung by design).
- **Unklar:** Gibt es in ORISO noch eine komplett registrierungsfreie anonyme Beratung wie in Caritas 1.0? Falls nein: kein Datenschutz-Nachteil, aber funktionales Delta, das in der DSFA als bewusste Entscheidung stehen sollte.

### 2.3 Rollen & Zugriff
- Alt: Berater/Team-Berater/Asker/Anonyme; Public-APIs von AgencyService und ConsultingTypeService laut eigener README **ohne Autorisierung**.
- Neu: App-Layer-Rollenmodell (Träger sind keine App-Nutzer, tokenisierte Links); Supervision-Rolle mit Side-Channel-Trennung (ADR-008, Side-Channels raus aus dem Klienten-Raum); restricted-agency-admin; Cross-Träger-Leak behoben. → **besser**, mit **offenem Punkt**: ADR-008 wartet noch auf exakte Disclosure-Formulierung des Datenschutzbeauftragten.

### 2.4 Termine
- Alt: Vollständiges Terminmodul (appointmentService + selbstgehostetes cal.com + CalDav): verarbeitete Kalender-/Buchungsdaten inkl. E-Mail-Benachrichtigungen.
- Neu: **Kein Terminfeature.** Helm deployt keinen appointmentservice, Feature-Flag aus, nur tote Fork-Artefakte im Code. → Datenschutzlich **besser** (Datenkategorie entfällt komplett), funktional ein **Gap**. Die DSFA-Vorgängerin (Caritas) beschreibt eine Verarbeitung, die es in ORISO nicht gibt — explizit als „entfallen" ausweisen und klären, ob ein Termin-Feature vor Go-Live noch kommt (dann jetzt einplanen, nicht nachträglich).

### 2.5 Video
- Siehe 2.1; zusätzlich: Alt hatte Gast-Links für anonyme Teilnahme an Videocalls. Neu: Element Call im Widget-Mode innerhalb der App; ob externe/anonyme Gast-Teilnahme existiert → **unklar — klären**.

### 2.6 Dateiupload
- Alt: Typ-/Mengenlimits im UploadService, kein Virenscan dokumentiert.
- Neu: fail-closed Virenscan (ADR-019), per-Chat-Typ-Media-Flags statt globalem Toggle (ADR-015), Security-EPIC Admin#366 (Phasen-Split, Teile on hold). → **besser**; Reststatus des EPICs vor DSFA-Finalisierung prüfen.

### 2.7 Löschung & Aufbewahrung
- Alt: UserService-Workflows (Deaktivierung abgelaufener Gruppenchats, Löschung alter anonymer Accounts, Account-Löschung).
- Neu: Workflows fortgeführt und Matrix-aware (`workflow/delete/`: DeleteKeycloakUserAction, DeleteMatrixAsker/ConsultantAction, DeleteSingleRoomAndSessionAction, DeleteUserAnonymousScheduler; plus deactivate-/Notification-Workflows). → technisch **gleich/besser**.
- **Aber:** Kein Löschkonzept-ADR; bekannte Falle „Deletion rollback-only trap"; und Synapse-Postgres-Backups (30 Tage Retention, siehe Helm matrix-configmaps) bedeuten, dass gelöschte Daten bis 30 Tage in Backups überleben. → **unklar — muss in die DSFA** (Backup-Löschkonzept).

### 2.8 Mandantenfähigkeit
- Alt: praktisch Single-Tenant (Caritas). Neu: TenantService, Träger-Trennung, Global Settings, plattformkontrollierte Appearance-Allowlist (ADR-010), Department = Agency×Topic mit eigenem Impressum + Datenschutzerklärung (ADR-003), geteilte Legal-Text-Objekte + Topic-before-Consent (ADR-014). → **neu/besser**, erfordert aber in der DSFA ein eigenes Kapitel Mandantentrennung (ein bereits behobener Cross-Träger-Leak zeigt das Risiko realistisch).

### 2.9 Auftragsverarbeiter / Hosting / Betrieb
- Alt: Betrieb bei/für Caritas (außerhalb unseres Sichtfelds). Neu: WIR = Entwickler, **Neusta = Betreiber/Prod-Sicherheit** (kein SSH/kubectl zu Prod für uns); Helm-only Deployment, Single Domain. → Rollenverteilung Verantwortlicher/Auftragsverarbeiter ist DSFA-Kernkapitel; AVV-/Legal-Modul im Produkt existiert (Legal-Editoren, KDG/DSGVO-Presets), der AVV mit dem Betreiber ist davon getrennt zu behandeln. → **unklar/organisatorisch — mit Neusta klären** (Disk-Encryption, Backup-Ort, Zugriffskonzept, Sub-Prozessoren).
- Föderation: Matrix-Federation ist bewusst AUS (ADR-005) → keine Daten verlassen den Homeserver Richtung fremder Matrix-Server. **besser/klar**.

### 2.10 Observability & Telemetrie (NEU, alt ohne Pendant)
- SignOZ (Traces/Logs/Metrics), Sentry (Fehler-Reports), Health-Dashboard, Statistik-Events. → **neu = neues Risiko**: PII-Gehalt von Logs/Traces/Sentry-Payloads ist nirgends per ADR geregelt. **Muss vor DSFA geklärt werden** (Scrubbing, Retention, Zugriff).

---

## 3. ADR-Inventar ORISO

Kanonischer Bestand: ``<repo-root>`/0 - Docs/ADR-0NN-*.md` (001–019). Ältere Parallel-Serie ADR-001–011 unter `0 - Docs M4_Frank/1 Analysis/ADR/` (Analysestand, nicht kanonisch). Zusätzlich `ADR-SECURITY-02-unified-crypto-boundary.md` in `ORISO-UserService/documentation/`.

| Nr. | Titel (Kurzform) | Status | DSFA-Relevanz |
|---|---|---|---|
| 001 | Counselling modalities as toggleable modules | Proposed | mittel (welche Verarbeitungen sind je Träger aktiv) |
| 002 | Silent room membership + access-control curtain (nicht E2EE) | Accepted | **hoch** — ehrliche Abgrenzung Zugriffskontrolle vs. Verschlüsselung |
| 003 | Department = Agency×Topic mit eigenem Impressum + DPP | Accepted | **hoch** — Datenschutzerklärung pro Fachbereich |
| 004 | Custom Chat-UI + matrix-js-sdk Megolm | Accepted | **hoch** — E2EE-Fundament |
| 005 | Matrix-Federation OFF, echter DNS server_name | Accepted | **hoch** — keine Föderations-Datenflüsse |
| 006 | conversation_type als persistierte Modalität | Accepted | niedrig |
| 007 | Live-Chat-Liveness aus Backend-Availability | Accepted | niedrig |
| 008 | Supervision: Side-Channels raus aus Klienten-Raum | Proposed (Blocker-Teile resolved; DSB-Wortlaut offen) | **hoch** — Vertraulichkeit, Offenlegungstext fehlt noch |
| 009 | Globale Topics + AI-assisted Translation | Accepted (Impl. deferred) | mittel (AI-Übersetzung = möglicher Drittdienst!) |
| 010 | Per-Träger Appearance-Allowlist | Proposed | niedrig |
| 011 | Helm-only, Single-Domain-Path-Routing | Accepted/live | mittel (TOMs, Angriffsfl.) |
| 012 | Self-Help-Gruppenchat: extend, Megolm-first | Accepted | mittel |
| 013 | 2FA via vendored otp-config SPI | Accepted | **hoch** — Auth-Sicherheit |
| 014 | Shared Legal-Text-Objekte, Topic-before-Consent | Accepted | **hoch** — Einwilligungs-/Consent-Architektur |
| 015 | Per-Chat-Typ Media-Flag-Familien | Accepted | mittel |
| 016 | Team-Besprechung: Side-Room, hard close at accept | Accepted | mittel (interne Kommunikation getrennt vom Klienten) |
| 017 | Native Matrix-Threads, hard cut | Accepted | niedrig |
| 018 | Erstantwort als ein persistiertes Event (Carimat) | Accepted | niedrig |
| 019 | Media-Scanning via matrix-content-scanner, fail-closed | Accepted | **hoch** — kontrollierter serverseitiger Entschlüsselungspunkt |
| SEC-02 | Unified crypto boundary (UserService/documentation) | im Repo | **hoch** — Krypto-Grenzen, gehört in kanonische Serie |

**Nummerierungs-Hinweis (bereinigen!):** Die im Projektumfeld kursierende Zuordnung „ADR-003 = AVV/Legal, ADR-014/015 = Virenscanner, ADR-019 = Silent Key Backup" stimmt NICHT mit den kanonischen Dateien überein (dort: 014 = Legal-Texte, 015 = Media-Flags, 019 = Media-Scanning). Für das **Silent Key Backup** (Tresor-Setup still, FE#1032, „ADR-019" laut Memory) existiert in `0 - Docs/` **keine eigene ADR-Datei** → Nummernkollision, ADR nachziehen.

### Fehlende ADRs, die eine DSFA braucht
1. **Löschkonzept** (Fristen je Datenkategorie; Zusammenspiel App-Löschung ↔ Synapse ↔ Backups; rollback-only-Falle adressieren).
2. **Backup & Restore** (was wird gesichert, wo, wie lange — Matrix-Postgres-Backup 30 Tage existiert nur als Helm-Config, nicht als Entscheidung).
3. **Logging/Observability & PII** (SignOZ, Sentry, Statistik-Events: Scrubbing, Retention, Zugriff).
4. **Silent Key Backup / Key-Recovery** (Schlüsselverwahrung serverseitig verschlüsselt — wer kann was wann wiederherstellen; Datei fehlt, s.o.).
5. **At-rest-Verschlüsselung / Hosting-TOMs** (MariaDB/Postgres/Volumes; Verantwortung Neusta).
6. **Anonyme Nutzung & Namens-Engine** (Anonymous-Name-Engine, Username-Cap: als Datenminimierungs-Entscheidung dokumentieren).
7. **E-Mail-Versand** (SMTP-Wege, S/MIME-Verhalten, welche Inhalte in Mails landen — inkl. OTP-Mails).
8. **Terminverwaltung** (bewusster Verzicht ODER geplante Wiedereinführung — Entscheidung festhalten).
9. **Datenexport/Auskunftsrecht** (Art. 15: wie wird bei E2EE-Inhalten Auskunft/Export realisiert).

---

## 4. Offene Punkte / Gaps vor DSFA-Erstellung

1. **Termine:** Caritas 1.0 hatte appointmentService + cal.com; ORISO hat nichts (Flag aus, kein Deployment, tote Fork-Reste in UserService/Frontend). Entscheiden: dauerhaft entfallen (→ Fork-Reste ausbauen) oder geplant (→ eigene DSFA-Verarbeitung).
2. **ADR-Nummernkollision Silent Key Backup vs. Media-Scanning (beide „019")** + SEC-02 außerhalb der Serie → ADR-Register bereinigen, bevor die DSFA ADRs referenziert.
3. **ADR-008-Rest:** Exakter Offenlegungs-Wortlaut des Datenschutzbeauftragten zur Supervision fehlt — DSFA-relevant und Go-Live-nah.
4. **Betreiberfragen an Neusta:** Disk-/At-rest-Encryption, Backup-Speicherort und -verschlüsselung, Zugriffs-/Adminkonzept Prod, Sub-Auftragsverarbeiter. Ohne das ist das TOM-Kapitel nicht schreibbar.
5. **Observability-PII:** SignOZ/Sentry-Datenflüsse inventarisieren (was genau geht dorthin, Self-hosted vs. SaaS bei Sentry klären).
6. **Anonyme Beratung ohne Registrierung:** existiert das ORISO-Pendant zum alten „anonymous counseling"? (Alt-DSFA-Kategorie ggf. streichen.)
7. **Gast-/extern-Teilnahme an Videocalls** (alt: Jitsi-Gast-Links): gibt es das in Element Call/ORISO?
8. **MongoDB-Subchart** noch im Umbrella-Chart trotz Rocket.Chat-Entfernung (Removal in Arbeit, user-remove-mongodb-855) — vor DSFA-Stichtag aus dem Ist-Zustand entfernen oder als Altlast deklarieren.
9. **AI-assisted Translation (ADR-009):** wenn implementiert wird — welcher Dienst, welche Inhalte? Potenzieller Drittlands-/Drittanbieter-Datenfluss.
10. **Media-Security-EPIC Admin#366:** Phasen-Split/on-hold-Status klären — DSFA darf nur beschreiben, was live ist („was ist da, was noch nicht").
11. **E-Mail-OTP/S/MIME-Randfälle** (bekannter Blocker bei @dreambau.de-Verschlüsselung) — Versandwege sauber dokumentieren.
12. **Alt-DSFA-Delta explizit machen:** entfallene Verarbeitungen (Rocket.Chat, MessageService-Masterkey, Jitsi, cal.com/Termine, LiveService, MailService, StatisticsService, CounselingTools) als „nicht mehr existent" führen — das ist die halbe Miete für eine ehrliche neue DSFA.
