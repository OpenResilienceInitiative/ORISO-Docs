# ADR-004: Eigene Chatoberfläche behalten; darunter matrix-js-sdk-Megolm einsetzen, Element Web nicht einbetten

- **Status:** Angenommen — 2026-06-26 (grill-with-docs-Sitzung). Umfang zum 30. Juni und Kryptografiereihenfolge festgelegt; SDK-Megolm-Migration eingeplant, noch nicht gebaut.
- **Datum:** 2026-06-26
- **Entscheider:** Frank (Produkt/Frontend) und KI (Backend)
- **Verwandt:** [[1 Analysis/ADRS/ADR-005-matrix-federation-off-dns-server-name]] (feste Voraussetzung: SDK-Kryptografie bindet Geräteschlüssel an MXIDs), `ORISO-Frontend/CONTEXT.md` (Flag „als verschlüsselt bezeichnet gegenüber Megolm-verschlüsselt“), Befunde US-H01 (RC-Abbau), FE-H11 (Abfragen alle 1,5 Sekunden), FE-H07 (Nachrichtenvorschau-Offenlegung), US-M04 (Warteschlangenpersistenz); `ORISO-Element` (ungenutzte element-web-v1.11.55-Distribution)

## Implementierungsergänzung — 2026-07-11

- `pre-dev` initialisiert jetzt SDK-/Rust-Kryptografie vor `startClient()` und erzeugt/verwendet Megolm-verschlüsselte Räume. Echter Browsernachweis umfasst zwei Benutzer, Verlauf nach Neuladen, verschlüsselte Mitgliedschaft/Nachrichten von Ratsuchenden und gemeinsame Element-Anrufe zu zweit.
- Bewusst ein **verzichtbarer PreDev-Implementierungsnachweis** im bisherigen IP-MXID-Namensraum. Die dauerhafte Identitätsentscheidung aus ADR-005 bleibt gültig. Sauberer DNS-Neuaufbau vor Aufnahme echter Träger; danach Kryptografie-/Geräte-/Wiederherstellungsnachweis wiederholen.
- `dev` enthält diese Umsetzung noch nicht; Übernahme in Frontend #406 in Prüfung. #332 teilweise geliefert, aber weiter offen für Schlüsselsicherung/-wiederherstellung, Cross-Signing und dauerhafte Mehrgeräteprüfung. #346 bleibt offen, weil `matrix-js-sdk` weiterhin 38.4 ist.

## Implementierungsergänzung — 2026-07-19 (Kryptografie jetzt DAUERHAFT statt verzichtbarer Nachweis)

Der saubere DNS-Homeserver-Neuaufbau aus ADR-005 ist **fertig**. SDK-/Rust-Kryptografie ist damit kein verzichtbarer Nachweis vom 2026-07-11 mehr, sondern **dauerhafter akzeptierter Laufzeitstand**. In `origin/pre-dev` geprüft:

- `src/services/matrixClientService.ts` ruft `initRustCrypto(...)` bei jeder Clientinitialisierung **unbedingt** auf, mit IndexedDB und Präfix je Benutzer/Gerät. Kein Abschaltpfad mehr.
- Über die am 07-11 unter #332 offenen Punkte hinaus geliefert: Schlüsselsicherung (`matrixKeyBackupService.ts`), Geräteisolation / MSC4153 „unsichtbare Kryptografie“ (`matrixDeviceIsolation.ts`, #438) und Profilbereich `EncryptionSettings`.
- Räume enthalten `m.room.encryption` (Helm `MATRIX_ENCRYPTION_ENABLED=true`); `sendEvent` verschlüsselt automatisch mit Megolm. Entschlüsselungsfehler werden live in `utdTracker.ts` über `MatrixEventEvent.Decrypted` / `event.isDecryptionFailure()` beobachtet.

**Als historisch ersetzt:** Kontextabsatz 2 mit angeblich **inaktiver** SDK-Kryptografie ohne `initRustCrypto`, die Folgenaussage fehlender nativer Raumverschlüsselung sowie Fortschrittsabschnitt vom 2026-07-10, Punkt 3, mit fehlendem `initRustCrypto`-Aufruf auf `origin/dev` / `origin/pre-dev`, gelten nicht mehr. Weitere Mehrgeräte-/Wiederherstellungshärtung und Upgrade von `matrix-js-sdk` 38.4 können unter #332/#346 verbleiben; die **Aktivierung** ist vollständig realisiert.

Der veraltete Kommentar in `messageSubmitInterfaceComponent.tsx`, Matrix-Nachrichten würden wegen ADR-004 unverschlüsselt über das SDK laufen, wird separat korrigiert. `isEncrypted = false` ist das entfernte **Rocket.Chat-Altflag**, nicht der Matrix-Kryptoschalter.

---

## Kontext

Der Chat ist **kein** Element-Fork. Bei Entscheidung war `ORISO-Frontend` die alte Caritas-/online-beratung-Oberfläche für Rocket.Chat mit zusätzlich angehängtem Matrix. Seit Frontend PR #359 und UserService PR #281 läuft ausschließlich Matrix. Verbliebene `rc*`-Namen sind kompatible Übertragungs-/Datenbankverträge, kein aktiver Rocket.Chat-Transport. Eine vollständige `ORISO-Element`-Distribution liegt als ungenutzte Referenz neben dem selbst gebauten Frontend.

Das zentrale Problem bleibt die **inaktive matrix-js-sdk-Kryptografie**: Aktuelles `origin/dev` und `origin/pre-dev` enthält keinen `initRustCrypto()`-Aufruf, daher startet Olm/Megolm nie. PR #359 entfernte die Laufzeitabhängigkeit `crypto-js` und ließ `useE2EE` als inaktiven Kompatibilitätshook. Das entfernte den alten eigenen Verschlüsselungspfad, ergänzte aber **keine** Matrix-Raumverschlüsselung. Echtes Megolm, Schlüsselsicherung, Cross-Signing und Geräteprüfung fehlen weiterhin.

Rahmenbedingungen: feste Funktionsfrist **30. Juni**, Live-Chat etwa 90–95 % fertig; Benutzer mit hohen **Barrierefreiheitsanforderungen**; bewährte Logik nicht neu erfinden und die Falle vermeiden, drei Tage halb neu zu bauen und zehn weitere zu reparieren.

## Entscheidungsgründe

- Volle Kontrolle über Bedienung, Gestaltung und **Barrierefreiheit**: Schriftgröße, Kontrast, Fokus, Tastatur, Screenreader für schutzbedürftige Benutzer.
- Frist 30. Juni ohne halbfertigen Neuaufbau in der Demo erreichen.
- SDK-Funktionen weiterverwenden, aber sicher und nicht in der Fristwoche.
- Der Chat trägt das Fachmodell mit Beratungsstelle/Träger, Thema, Warteschlange/Warteraum und anonymen Sitzungen; ein allgemeiner Messenger nicht.

## Entscheidung

1. **Eigene Oberfläche behalten. Element Web NICHT einbetten.** Dessen allgemeine Zeitleiste enthält das Beratungsstellen-/Themen-/Warteschlangen-/Anonymmodell nicht und würde die gewünschte Barrierefreiheitskontrolle kosten.
2. **matrix-js-sdk-Megolm unter der bestehenden Oberfläche einsetzen**, als Ersatz für `crypto-js`, aber **erst nach** dem sauberen Homeserver-Neuaufbau in [[1 Analysis/ADRS/ADR-005-matrix-federation-off-dns-server-name]]. Geräteschlüssel/Sicherung binden an MXIDs; heutige IP-basierte MXIDs werden sich ändern.
3. **Übertragbare Bestandteile weiterverwenden.** ElementCall-Einstellungsspeicher, Geräteauswahl und Barrierefreiheitsmechanismen für Schriftgröße, reduzierte Bewegung und Tastaturkürzel in unsere Oberfläche übernehmen.
4. **Vorhandene Fassade `ChatTransport` als Grenze nutzen.** PR #359 schloss den Matrix-Laufzeitwechsel ab. SDK-Kryptografie dahinter ergänzen statt Oberfläche neu bauen.
5. **Transportwechsel und Kryptografieaktivierung getrennt prüfen.** Transportwechsel fertig. Aktivierung bleibt bis stabilen DNS-MXIDs aus ADR-005 blockiert; danach verschlüsselte Raumerstellung und Geräte-/Schlüsselwiederherstellung durchgängig nachweisen.

## Erwogene Optionen

- **Element Web über bewährte ElementCall-iframe-Grenze einbetten.** Günstigster Weg zu Reaktionen/Bearbeitung/Suche/Kryptografie, wenige Tage für Einbettung. Für Produktoberfläche **verworfen**: allgemeiner Messenger ohne Fachmodell; Verlust der Barrierefreiheitskontrolle. Nur als mögliche spätere Untersuchung behalten.
- **Eigene Oberfläche und crypto-js dauerhaft behalten.** Keine Kryptomigration, aber **verworfen**: Seitenaufteilung/Reaktionen/Bearbeitung/Suche ständig selbst bauen, ohne Schlüsselsicherung/Geräteprüfung; Risiko nur als verschlüsselt bezeichneter Nachrichten bleibt.
- **SDK-Megolm sofort in Fristwoche übernehmen.** **Verworfen:** IP-`server_name` aus ADR-005 blockiert. Verschlüsselung müsste nach Neuaufbau wiederholt werden; Fristdruck birgt Klartext-Offenlegung.

## Folgen

**Positiv:** Volle Bedienungs-/Barrierefreiheitskontrolle. Matrix-/RC-Verzweigung entfällt nach Fassade, Rocket.Chat wird entfernbar. SDK liefert langfristig Seitenaufteilung, Reaktionen, Bearbeitung, Löschung, Lesebestätigungen und Sicherung. Der Weg zum 30. Juni beschädigt die Demo nicht teilweise, dank schrittweisem Ersatz mit Flag.

**Negativ / Aufwand:** Wir pflegen die Zeitleistenoberfläche weiter selbst. SDK-Megolm-Migration betrifft Anmeldung, Raumerstellung, Geräteidentität, Sicherung und Wiederherstellung und **muss nach ADR-005** erfolgen. Bis dahin fehlt native Raumverschlüsselung im Matrix-Laufzeitpfad.

## Reihenfolge

- **Fertig:** Matrix-Laufzeitwechsel durch Frontend #359 und UserService #281; alte eigene Kryptografie entfernt; verbleibende `rc*`-Namen als abgestimmte Vertragsbereinigung.
- **Danach, nach ADR-005:** SDK bei Bedarf aktualisieren/anpassen, `initRustCrypto` aufrufen, verschlüsselte Räume erstellen, Sicherung/Cross-Signing/Geräteprüfung ergänzen und Wiederherstellung für mehrere Benutzer/Geräte vor abhängigen Gruppenfunktionen belegen.

## Stand und Fortschritt (geprüft am 2026-07-10)

- Frontend #359 am 2026-07-04 gemergt: Matrix-`ChatTransport`, Lesebestätigungen/Zeitleiste, Rocket.Chat-Frontend/-Laufzeit entfernt, inaktive `useE2EE`-Kompatibilität, keine SDK-Kryptografie.
- UserService #281 am 2026-07-03 gemergt: Standard `rocket-chat.enabled=false`, Matrix-Gruppen-/Sitzungsbereitstellung; alte Datenbank-/DTO-Namen bleiben.
- Frontend #332/#346 offen. `matrix-js-sdk` weiterhin 38.4, kein `initRustCrypto` auf aktuellem `origin/dev` oder `origin/pre-dev`.
- ADR-005 teilweise angewendet: Föderation auf Pre-Dev gehärtet, aber Homeserver mit IP-`server_name`; sauberer Neuaufbau bleibt feste Voraussetzung.
- ORISO-Helm PR #32 und UserService PR #370 am 2026-07-09 geöffnet und erfolgreich geprüft. Konfigurierbare DNS-Identität/MXID-Regeln gesichert, aber kein Pre-Dev-Overlay `matrix.oriso-dev.site`, keine saubere DNS-/TLS-Installation und keine Kryptoinitialisierung.
- Frontend PR #389 ohne Merge geschlossen. Entfernung von Raumverschlüsselungsschutz und `matrixRoomEncryption` widerspricht diesem ADR und darf nicht übernommen werden. Aktuelles `pre-dev` behält den Verschlüsselungshelfer.
- Frontend PR #397 auf `pre-dev` verändert Matrix-Client-Erstellung für Protokollierung. Megolm muss dessen Logger-Einbindung erhalten oder die kleine Überschneidung nach Merge lösen; Protokollierungsarbeit nicht doppeln.

Die frühere Worktree-Notiz `feat/chat-transport-facade` unten ist historisch. Gemergter PR #359 übernahm ihr Verhalten; kein aktiver Implementierungsbranch. Neue Kryptografiearbeit nutzt isolierte Worktrees aus `origin/pre-dev`, niemals `main`.

**Historischer erster Teil, später durch PR #359 übernommen:**
- **#303 — `ChatTransport`-Grenze FERTIG.** Neu unter `src/services/chatTransport/`: Schnittstelle `ChatTransport`, Adapter `MatrixChatTransport` als reine Weiterleitung an `MatrixClientService`, `getChatTransport()` an Clientregistrierung gebunden, acht Vertragstests. Noch kein Verbraucher; das ist #304.
- **#307 — ci-main prüft jetzt `npm run test:unit`**, zuvor nur Build; vier ungenutzte Anrufwidget-Duplikate entfernt.
- **#306 — FE-H07-Regressionstest ergänzt.** Offenlegung bereits auf `dev` geschlossen: `apiSendMessage` überträgt im Matrix-Pfad kein `messagePreview`. Test sichert die Grenze gegen erneut zweimal aufgetretene Offenlegung in CI.

**Korrekturen der ursprünglichen Reihenfolge (2026-06-28):**
- **FE-M08 bereits auf `dev`**: `src/utils/matrixRoomUtils.ts` zentralisiert `isMatrixRoom`. Keine Arbeit nötig; ursprünglicher Plan zählte zu viel.
- **Komponentenumleitung #304 und Abfragekorrektur #305 ZURÜCKGESTELLT.** Offene PRs #126 für Fokusring und #275 für Fallübergabe ändern `matrixClientService`/`messageSubmitInterfaceComponent`/`SessionStream`. Jetzt umzuleiten kollidiert; nach Merge bauen und rebasen.
- **Modernisierung angekommen: react-router v5→v7, PR #329 GEMERGT**, auf React 19.2.3. Der Chatbranch mit Basis vor v7 auf `dev`, jetzt etwa 30 Commits zurück, muss **auf aktuelles `dev` rebased und unter Router v7 neu getestet** werden, bevor Push erfolgt.

Die zentrale Grenze ist vorhanden und sicher. Riskante Komponentenänderungen sind bewusst bis zur Auflösung der Überschneidungen und zum Router-v7-Rebase verschoben.
