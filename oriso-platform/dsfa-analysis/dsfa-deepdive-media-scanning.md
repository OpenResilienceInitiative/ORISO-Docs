# DSFA-Tiefenbohrung 1: Media-Upload-Security / Virenscan — Projektstand

**Stand:** 2026-08-14 · Quellen: GitHub-Org OpenResilienceInitiative (live per gh CLI), lokale Repos, ADR-019/ADR-015, `PLAN-media-upload-security-2026-07-18.md`

## Kernbefund in einem Satz

Der per **ADR-019** zugesagte fail-closed Virenscan (matrix-content-scanner + ClamAV + Mistral) ist **fertig als PoC-Chart auf einem unmergten Branch gebaut, aber in keinem Environment deployed** — die beiden Infra-PRs wurden am 29.07. von Hassan als "not needed now" **unmerged geschlossen**; live ist stattdessen Phase 1: eine **menschliche** Prüfung (Blur + Click-to-Reveal durch Berater:innen), rein clientseitig.

---

## 1. Was ist GEBAUT (mit Beleg)

### 1a. Live auf pre-dev (Phase 1, gemergt)

| Baustein | Beleg (PR/Code) |
|---|---|
| Agency-Settings-Seite mit Chat-Typ-Permission-Cards (WP-0) | Admin PR #373 (merged 19.07.), `AgencyPermissionsSettings` |
| Drei Flag-Familien `featureMediaUpload…` / `featureMediaInlineDisplay…` / `featureMediaAiScan…` je Chat-Typ, Tenant+Agency, ersetzen `featureAttachmentUploadDisabled` (ADR-015) | TenantService PR #91, AgencyService PR #142 (merged); Liquibase 0022 (settings→TEXT) |
| Admin-UI-Toggles für alle drei Familien (Platform/Tenant/Agency) | Admin PR #374 + Frontend PR #518 (merged); Code: `ORISO-Admin/src/components/Tenants/AppSettings/PermissionsSettings/chatTypeCards.ts` |
| TenantService-Media-Endpoint: `POST /tenantadmin/media`, öffentliches `GET /media/{id}`, MariaDB-Blob, **nur Magic-Bytes-Erkennung** (PNG/JPEG/WebP, SVG abgelehnt), 2 MB-Cap | TenantService PR #92 (merged); Liquibase 0023 `tenant_media` |
| Admin-Editor-Bildupload (Button/Drop/Paste, beide TipTap-Editoren) | Admin PR #399 (merged) |
| Chat-Composer-Bildupload: separate `m.image`-Events, Thumbnail, Zustandsmodell `uploading → unchecked(blur) → safe / blocked / error` | Frontend PR #547 (+ #549 StrictMode-Fix, merged) |
| Blur + Click-to-Reveal für Gastbilder im anonymen Live-Chat; `blocked`-Verdikt wird **nur fail-closed aus Event-Metadaten** akzeptiert (Sender kann sich nicht selbst "safe" markieren) | `ORISO-Frontend/src/components/message/MessageAttachment.tsx` (Zeile 176 ff.), `matrixTimelineEventFormatter` |
| Media-Ingress `/media/(.+)` → tenantservice auf api-Host + Origin-Auflösung split-host | Helm PR #113 (MERGED 29.07.), Frontend PR #560, Admin PR #420 |
| Matrix-Media-Refactor (WP-5 des Epics) | UserService #715 CLOSED/Done |
| E2E-Nachweis pre-dev (29./30.07.): Upload 201, anonymer GET 200 byte-identisch, SVG→400, >2 MB→413, ohne Auth→401 | Memory-Protokoll, manuell verifiziert |

### 1b. Gebaut, aber NICHT deployed (Phase 2, PRs unmerged geschlossen)

| Baustein | Wo es liegt |
|---|---|
| **Scanner-Chart**: matrix-content-scanner + ClamAV-Sidecar, `scan.sh` (ClamAV, dann `ai-check.sh`/Mistral für Bilder), jeder Fehlerpfad = non-zero exit = Datei bleibt quarantänisiert; `ai-check.sh` = Austauschpunkt für self-hosted Modell | Branch `feat/media-scanner-poc` in ORISO-Helm: `templates/media-scanner/` (4 Templates, 356 Zeilen inkl. `docs/media-scanner-poc.md`), `mediaScanner.enabled: false` per Default. PR #111 CLOSED 29.07. |
| **ALTCHA-Bot-Schutz** + nginx-Rate-Limit (5 r/s) am anonymen Live-Chat-Eingang | Branch `feat/altcha-bot-protection`, PR #112 CLOSED 29.07. |

**Verifiziert am Code:** `origin/main` von ORISO-Helm enthält **kein** `templates/media-scanner/`, kein `mediaScanner`-Block in `values.yaml.default`, kein ClamAV — grep ist leer. Der Scanner existiert ausschließlich auf dem Feature-Branch.

---

## 2. Was FEHLT bis der fail-closed-Scan live ist

Konkrete Restarbeiten, in Reihenfolge:

1. **Priorisierungsentscheidung mit Infra (Hassan/Neusta):** PRs #111/#112 wiederbeleben (Merge off-by-default ändert kein laufendes Environment — beide Charts rendern nichts ohne `enabled: true`) oder neu planen. Das ist der eigentliche Blocker; er ist **organisatorisch, nicht technisch**.
2. **Chart mergen + härten:** Image-Tags pinnen (aktuell `latest` — laut PoC-Doku explizit vor Promotion zu ersetzen), Secret-Handling produktiv (`aiCheck.existingSecret` statt Inline-Key), Ressourcen prüfen (ClamAV braucht 1–2 GB RAM).
3. **Scanner in den Download-Pfad einhängen:** Der Scanner wirkt nur, wenn Clients Media über ihn beziehen. Es fehlt: Ingress/Routing der Client-Media-Downloads über den Scanner (statt direkt Synapse `matrix-synapse:8008`) und die Client-Konfiguration (Frontend nutzt den Element-SDK-Downloadpfad). **Nirgends verkabelt** — im Helm-main gibt es nicht einmal ein Matrix-Ingress-Template für Media.
4. **E2EE-Realität einarbeiten (WICHTIG, neu seit ADR):** ADR-019 wurde geschrieben, als Matrix-Crypto AUS war ("server side can see media"). Inzwischen ist **E2EE dauerhaft AN**. Verschlüsselte Anhänge kann der Scanner nur mit dem matrix-content-scanner-Encrypted-Media-Protokoll prüfen (Client sendet die Datei-Keys verschlüsselt an den Scanner). Das erfordert **Frontend-Arbeit** (encrypted POST-to-scan statt einfachem Proxy-GET) und ist im PoC nicht gebaut. Ohne das scannt der Scanner nur unverschlüsselte Alt-Medien.
5. **Verdikt-Rückkanal → Client-Zustand:** Aktuell füttert kein Scanner das `mediaCheckState`; `MessageAttachment` defaultet außerhalb des Live-Chats auf `'safe'`. Der Übergang "Blur bis Scanner-Verdikt" (statt Blur bis Berater-Klick) muss verdrahtet werden.
6. **Fehlerpfade end-to-end testen:** Scanner down → Download muss blockieren (fail-closed am Downloadpfad ist die Kernzusage von ADR-019); Timeout, unparsebare Antwort, ClamAV-Signatur-Update-Ausfall.
7. **Nur für den AI-Teil (abtrennbar):** KDG/AVV-Sub-Prozessor-Vereinbarung Mistral (Zero-Retention vertraglich bestätigen) **bevor** `aiCheck.enabled: true` in irgendeinem echten Environment. Reiner Virenscan (ClamAV) braucht das nicht — er kann vorab live gehen.
8. **ALTCHA/Rate-Limit (separates Paket #99):** ALTCHA-Server deployen + Frontend-Gate am anonymen Live-Chat-Eintritt + UserService-Prüfung; ebenfalls komplett unverkabelt.
9. **Admin-Toggle-Wahrheit:** `featureMediaAiScan*` ist im Admin bereits schaltbar, tut aber **nichts** solange der Scanner nicht existiert — für QA/Auftraggeber dokumentieren oder Toggle bis Phase 2 ausblenden/disablen.

**Nicht offen:** TenantService-Editor-Bilder (Rechtstexte) laufen NICHT über Matrix/Scanner — dort ist die Absicherung Magic-Bytes-Whitelist + 2 MB + Auth auf Upload; das ist gebaut und getestet.

---

## 3. Issue-Landkarte

**Parent-Issue: [ORISO-Admin #366](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/366)** — "EPIC: Media upload for both TipTap editors + media security pipeline", **OPEN**, Board-Status **On hold**, Kopf-Status im Issue: Phase 1 delivered / Phase 2 on hold (ehrlich umformuliert am 30.07., damit das Epic keine nicht-lebende fail-closed-Zusage suggeriert).

| Sub-Issue | Titel (gekürzt) | State | Board | PR(s) |
|---|---|---|---|---|
| [Admin #367](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/367) | Agency-Settings-Seite (WP-0) | CLOSED | QA internal Dev | #373 merged |
| [TenantService #89](https://github.com/OpenResilienceInitiative/ORISO-TenantService/issues/89) | Media-Flag-Familien (WP-1) | CLOSED | QA internal Dev | #91 merged |
| [AgencyService #141](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/issues/141) | Flag-Familien Agency-Ebene (WP-1) | CLOSED | QA internal Dev | #142 merged |
| [Admin #368](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/368) | Admin-UI Media-Toggles (WP-2) | CLOSED | QA internal Dev | #374 + FE#518 merged |
| [TenantService #90](https://github.com/OpenResilienceInitiative/ORISO-TenantService/issues/90) | Media-Endpoint Blob + GET (WP-3) | CLOSED | QA internal Dev | #92 merged |
| [Admin #369](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/369) | Admin-Editor-Upload (WP-3b) | CLOSED | QA internal Dev | #399 merged |
| [Frontend #511](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/511) | Composer-Upload + Blur-Modell (WP-4) | CLOSED | QA internal Dev | #547, #549 merged |
| [Frontend #601](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/601) | Media-URL-Origin-Fix | CLOSED | QA internal Dev | FE#560, Admin#420, Helm#113 merged |
| [UserService #715](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/715) | Matrix-Media-Refactor | CLOSED | Done | — |
| [**Helm #98**](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/98) | **Scanner-PoC (ClamAV+Mistral, fail-closed)** | **OPEN** | **On hold** | #111 **CLOSED unmerged** (29.07.), Branch `feat/media-scanner-poc` lebt |
| [**Helm #99**](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/99) | **ALTCHA + Upload-Rate-Limit** | **OPEN** | **On hold** | #112 **CLOSED unmerged** (29.07.), Branch `feat/altcha-bot-protection` lebt |

Verwandt, außerhalb des Epics: [Admin #370](https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/370) TipTap v2→v3 (closed). Org-weite Suche nach scanner/clamav/media-upload fand keine weiteren offenen Issues — die Landkarte ist vollständig.

---

## 4. Aufwandsschätzung + empfohlene Reihenfolge

| Schritt | Aufwand | Bemerkung |
|---|---|---|
| A. Entscheidung mit Infra: PoC-PRs wiederbeleben | 0,5 T (Gespräch/Slack) | Blocker Nr. 1; Merge ist risikolos (off by default) |
| B. Chart-Härtung: Tags pinnen, Secrets, Ressourcen; Merge #111 | 1–2 T | Basis liegt fertig auf dem Branch |
| C. Scanner auf pre-dev enablen, **nur ClamAV** (`aiCheck: false`), Download-Routing Client→Scanner verkabeln | 2–4 T | Ingress + Frontend-Media-URL-Umstellung; größter technischer Brocken zusammen mit D |
| D. E2EE-Pfad: encrypted-media-Scan (Key-Forwarding) im Frontend | 3–5 T | Seit E2EE-ON zwingend, sonst scannt der Scanner faktisch nichts Relevantes |
| E. Verdikt→`mediaCheckState`-Verdrahtung + fail-closed-E2E-Tests | 2–3 T | Zustandsmodell existiert bereits beidseitig |
| F. AVV/KDG Mistral-Sub-Prozessor + `aiCheck` aktivieren | 1 T Technik + Vertragslaufzeit | Parallel zu C–E startbar; ohne AVV kein AI-Scan |
| G. ALTCHA + Rate-Limit (Helm #99, Merge #112 + Gate im Frontend/UserService) | 3–4 T | Unabhängig von C–F, eigenes Paket |

**Summe bis "fail-closed Virenscan live" (ohne AI, ohne ALTCHA): grob 8–14 Personentage** nach der Infra-Freigabe. Empfehlung: A → B → C → E (ClamAV-only live = ehrlicher Sicherheitsgewinn ohne AVV-Abhängigkeit) → D → F → G.

---

## 5. DSFA-Formulierung des Ist-Zustands (ehrlicher Textvorschlag)

> **Umgang mit hochgeladenen Mediendateien (Stand 14.08.2026):**
> Die Plattform erlaubt Bild-Uploads in Chats (einschließlich anonymer, registrierungsfreier Live-Chats) sowie in redaktionellen Rechtstext-Editoren. Für redaktionelle Bilder besteht eine serverseitige Formatvalidierung (Magic-Bytes-Whitelist PNG/JPEG/WebP, kein SVG, 2-MB-Limit, authentifizierter Upload).
>
> Für Chat-Medien existiert derzeit **kein automatisierter Viren- oder Inhaltsscan**. Als risikomindernde Übergangsmaßnahme werden Bilder anonymer Gäste im Live-Chat den Beratenden zunächst nur unkenntlich (unscharf) angezeigt und erst nach bewusster Einzelfreigabe durch die beratende Person dargestellt ("Vier-Augen-Prinzip Mensch statt Maschine"); ein Blockieren-Verdikt kann nicht vom Absender manipuliert werden. Diese Prüfung ist clientseitig durchgesetzt; die Datei selbst bleibt serverseitig abrufbar. Außerhalb des anonymen Live-Chats erfolgt keine Vorprüfung der Anzeige.
>
> Die Zielarchitektur ist per Architekturentscheidung ADR-019 festgelegt: ein fail-closed Scan-Proxy (matrix-content-scanner mit ClamAV-Virenscan und optionaler KI-Bildprüfung), der ungeprüfte oder beanstandete Dateien **serverseitig** unzugänglich hält. Die Implementierung liegt als geprüfter, standardmäßig deaktivierter Proof of Concept vor (ORISO-Helm, Branch `feat/media-scanner-poc`), ist jedoch **nicht produktiv ausgerollt**; die Inbetriebnahme wurde im Juli 2026 priorisierungsbedingt zurückgestellt (Vorgänge ORISO-Helm #98/#99, Status "On hold"). Vor Aktivierung der KI-Bildprüfung ist zudem der Abschluss einer Auftragsverarbeitungs-/Sub-Prozessor-Vereinbarung (Zero Retention) mit dem Anbieter Mistral erforderlich; der reine Virenscan ist davon unabhängig aktivierbar. Ein konkreter Aktivierungstermin ist nicht festgelegt. Restrisiko bis dahin: Schadsoftware- oder rechtswidrige Bildinhalte können technisch übertragen und abgerufen werden; die Exposition ist durch die Blur-/Freigabemechanik, die Formatvalidierung und die geplante, aber noch nicht aktive Bot-Abwehr (ALTCHA) nur teilweise begrenzt.

**Hinweis zur ADR-Konsistenz für die DSFA:** ADR-019 nennt als Kontext noch "Matrix crypto is currently off" — inzwischen ist E2EE dauerhaft aktiv. Für die DSFA ist das doppelt relevant: (a) Transportinhalte sind besser geschützt als zur ADR-Zeit, (b) der künftige Scanner braucht den Encrypted-Media-Pfad (Key-Forwarding), was den Restaufwand erhöht. ADR-019 sollte bei Wiederaufnahme um einen E2EE-Nachtrag ergänzt werden.
