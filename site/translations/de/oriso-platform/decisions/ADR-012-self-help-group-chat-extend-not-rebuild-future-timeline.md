# ADR-012: Selbsthilfegruppenchat — vorhandenen Gruppenchat erweitern, nicht neu bauen; Megolm zuerst, Zukunftszeitleiste statt Lobby

- **Status:** Angenommen — 2026-07-09; am 2026-07-10 mit aktuellem GitHub/Code abgeglichen
- **Datum:** 2026-07-09
- **Entscheider:** Frank (Produkt und Frontend) und KI (Backend/Architektur)
- **Verwandt:** `ADR-004-chat-keep-custom-ui-adopt-matrix-sdk-megolm.md` (feste Voraussetzung: echtes Megolm), `ADR-005-matrix-federation-off-dns-server-name.md` (sauberer Homeserver-Neuaufbau vor Megolm), WP-06 Aktivitätszeitleiste (ADR-AT-01/02/03), `ORISO-Frontend/CONTEXT.md` (Glossar `Self-Help Group Chat & Lobby`)
- **Referenzmaterial:** `/Volumes/Netzwerkordner/001 - Archive/Step 1.png`, `Step 2.png`, `Step 4.png`, `Step 5.png`, `Step 6.png` und `Step 7Main problem -_ repeated chats must be deleted manually.png`
- **Umsetzungstracker:** `OpenResilienceInitiative/ORISO-Frontend#396`

## Implementierungsstand — 2026-07-11

- Kernimplementierung nach `pre-dev` gemergt: Frontend #402/#407, UserService #376/#381 und TenantService #72.
- Erfolgreiche echte Browserprüfung auf PreDev umfasst Megolm-Text und Neuladen, begrenzten wöchentlichen Folgetermin, geplantes Schließen, numerische Einladung/Registrierung/Zuweisung/Beitritt, verschlüsselte Nachrichten von Ratsuchenden sowie eigene Audio- und Videogespräche mit zwei Teilnehmern.
- Übernahme nach `dev` bleibt in menschlicher Prüfung in Frontend #406 und UserService #380.
- Weitere Intervalle, Ausnahmebearbeitung, komplexe Rollenwechsel, Varianten der Zukunftszeitleiste und die gesamte Benachrichtigungs-/Übersetzungsmatrix sind durch Unit-/Vertragstests abgedeckt, aber nicht sämtlich unabhängig durch den begrenzten E2E-Lauf bestätigt. Implementiert, durch Unit-Tests geprüft und im echten Browser belegt dürfen nicht zu einem einzigen Status zusammengezogen werden.
- Erreichbare E-Mail bleibt bewusst getrennt und wird durch dieses Arbeitspaket nicht implementiert.
- ADR-006 #410 verantwortet jetzt die übergreifende Persistenz und Regressionsprüfung für Beratungsformen vor der Übernahme.

---

## Aktuell geprüfte Grenze (2026-07-10)

- Frontend PR #359 und UserService PR #281 sind gemergt: Der laufende Chattransport verwendet ausschließlich Matrix.
- SDK-Megolm ist nicht aktiv. Frontend-Issues #332 und #346 sind offen. Aktuelles `origin/dev` / `origin/pre-dev` enthält keinen Aufruf `initRustCrypto`.
- ADR-005 bleibt unvollständig: Föderationshärtung wurde teilweise auf Pre-Dev direkt angewendet, aber der Homeserver verwendet weiterhin eine IP als `server_name`. Der saubere Neuaufbau bleibt eine Voraussetzung in Verantwortung des Betriebs.
- Matrix-Identität hängt von der Umgebung ab. Pre-Dev ist die maßgebliche Umgebung dieser Initiative und muss `matrix.oriso-dev.site` verwenden; Dev darf `matrix.oriso.org` verwenden. Das sind eigene Installationsnamen von ORISO, keine Standardwerte. Andere Installationen setzen ihr eigenes `matrixServerName`. ORISO-Helm PR #32 und UserService PR #370 liefern bereits erfolgreiche Regressionstests für konfigurierbare Namen/MXIDs; nicht duplizieren. Pre-Dev-Wert/Overlay, DNS/TLS, saubere Installation und Laufzeitprüfung bleiben offen.
- Frontend PR #389 wurde ohne Merge geschlossen und entfernte bewusst die Verschlüsselungsgrenze. Er ist keine Grundlage für diese Funktion. Frontend PR #397 überschneidet sich geringfügig bei der Matrix-Client-Erstellung für SDK-Protokollierung; dies muss beim Ergänzen der Kryptoinitialisierung erhalten bleiben.
- Alle Arbeiten sind auf `pre-dev` und `dev` begrenzt. Repositories ohne einen dieser geeigneten Branches bleiben unberührt. Keine Arbeit richtet sich auf `main`.
- Im Workspace gibt es kein `Makefile` an der Wurzel. Der Ausdruck `make verify` aus der Designsitzung bedeutet die Absicht einer echten Integrationsprüfung und ist kein aktuell ausführbarer Befehl.

## Kontext

Der Selbsthilfegruppenchat beginnt nicht auf leerer Grundlage. Er erweitert die vorhandene Caritas-Gruppenchatfunktion:

- **UserService:** `Chat` mit Thema, Daten, Dauer, Wiederholung, Teilnehmergrenze, Verantwortlichem, mandantenbezogenen Beratungsstellen, `hintMessage` und Matrix-Raum-ID; `GroupChatParticipant`; `ChatReCreator`; `DeactivateGroupChatService`.
- **Frontend:** `components/groupChat/`, `useJoinGroupChat`, Anmeldung/Deep-Link über `?gcid=`, `WaitingRoom`, `SessionToolbarChipFilter` und ElementCall-Gruppenanrufe.
- **Mandant/Admin:** `featureGroupChatV2Enabled` und TenantService `TranslationFacade` existieren bereits.
- **Termine:** UserService integriert bereits einen externen AppointmentService und speichert beziehungsweise fragt zukünftige Termine ab. Die Zukunftszeitleiste soll diese Grenze nutzen statt einen weiteren lokalen Service zu erfinden.

Das vorhandene Datenmodell enthält wichtige Altlasten. `Chat.ChatInterval` kennt nur `WEEKLY`. `GroupChatParticipant.chat_id` speichert derzeit eine **Sitzungs-ID** statt `Chat.id` und hat weder Datenbankfremdschlüssel noch Rolle. Veraltete Chats werden anhand `updateDate` plus Dauer/Deaktivierungszeit geschlossen statt anhand des geplanten `startDate + duration`. Alte `rc*`-Namen bleiben in Übertragungs-/Datenbankverträgen, obwohl zur Laufzeit ausschließlich Matrix verwendet wird.

## Entscheidung

1. **Vorhandene Gruppenchatfunktion erweitern und nur betroffene Teile überarbeiten.** Nicht neu bauen. Verbliebene Rocket.Chat-Altbestandteile nur entfernen oder umbenennen, wenn eine abgestimmte Änderung beide Seiten verantwortet.
2. **Megolm zuerst.** Keine Gruppen-Ende-zu-Ende-Verschlüsselung auf dem entfernten alten Mechanismus `crypto-js` oder dem inaktiven Kompatibilitätshook `useE2EE` aufbauen. Zuerst ADR-005 abschließen, dann SDK-/Rust-Kryptografie initialisieren, dann Gruppenchatverschlüsselung bauen.
3. **Teilnehmeridentität verwendet echte Matrix-Konten.** Standard ist das bestehende verzichtbare Konto `anon_`; ein optionales dauerhaftes Pseudonym unterstützt wiederkehrende Teilnehmer. Es gibt keine Sitzung ohne Zugangsdaten.
4. **Wiederholung verwendet eine Serienregel mit virtuellen Terminen und begrenztem `repeatCount`.** Intervalle sind `DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY` und `YEARLY`. Ein Matrix-Raum entsteht nur für den unmittelbar bevorstehenden/aktiven Termin. Einzelterminänderungen verwenden eine Auslassung nach EXDATE-Muster und eine eigenständige einmalige Serie. Keine Aufteilung „dieser und folgende“.
5. **Die erste Implementierung ist eine ausdrückliche Serie mit `repeatCount=1`.** Sie ist begrenzt, nur Text, aus Benutzersicht ohne Wiederholung: anlegen → auflisten → pseudonymer Deep-Link-Beitritt → verschlüsselter Text → Schließen zum geplanten Ende.
6. **Keine eigene Lobby-Liste.** Gruppenchats bleiben in Gespräche/Chats. Eine spätere Erweiterung derselben Liste zeigt bevorstehende Gruppentermine und Termine, mit verschiebbarem „Jetzt“-Trenner samt Tastatur-/Schalteralternative, begrenzter Seitenaufteilung und vorhandenen Chip-Filtern.
7. **Beratungsform ist eine Serieneigenschaft:** `TEXT`, `AUDIO` oder `VIDEO`. Ein Matrix-Textraum existiert immer; Audio/Video verwenden zusätzlich ElementCall und werden durch einen Berater geöffnet.
8. **Mitgliedschaft ist ausdrücklich modelliert.** Rollen sind Verantwortlicher, Mitmoderator und Teilnehmer. Vor der Implementierung muss das Datenmodell Hinzufügen/Entfernen/Übertragen definieren; mehrere Verantwortliche und Übertragung dürfen nicht mehrdeutig bleiben.
9. **Ausgehende Kommunikation bleibt vertraulichkeitsneutral.** Kalender und E-Mail-Kurzvorschau enthalten kein Thema, Anbieterbranding oder sensible Kategorie. Übersetzt werden ausschließlich vom Verfasser geschriebene Konfigurationstexte, niemals Chatinhalte oder personenbezogene Daten.
10. **Erreichbare E-Mail ist ein eigenes Arbeitspaket der Identitätsebene.** Global und funktionsübergreifend, keine kleine Gruppenchat-UI-Unteraufgabe. Es darf vom Epic verlinkt werden, braucht aber eigene Zuständigkeit und Abnahmegrenze.

## Erwogene Optionen (verworfen)

- Gruppenchat vollständig neu bauen.
- Gruppenverschlüsselung mit eigener Kryptoschicht ausliefern und später migrieren.
- Lobby in den Anfrageablauf aufnehmen.
- Unbegrenzte Datenzeilen je zukünftigem Termin erzeugen.
- Wiederholungsaufteilung „dieser und folgende“ in der ersten Veröffentlichung unterstützen.

## Folgen

**Positiv:** Verwendet funktionierende Wege für Chat, Beitritt, Anruf, Mandant, Übersetzung und Termine weiter. Begrenzt Wiederholungen strukturell, behält die eigene barrierefreie Oberfläche und macht echte Matrix-Verschlüsselung zur Voraussetzung statt späteren Altlast.

**Aufwand / Risiko:** Die Funktion hängt an Betriebs- und Kryptografiearbeit. Das vorhandene Serien-/Sitzungs-/Teilnehmerschema braucht einen ausdrücklichen Migrationsvertrag. Die Zukunftsliste kombiniert zwei Quellen. Rollenwechsel und Schlüsselrotation beeinflussen sich. Die aktuelle Formulierung zur Integrationsprüfung nennt einen nicht vorhandenen Befehl und muss durch einen echten Testaufbau ersetzt werden.

## Erforderliche Reihenfolge

1. ADR-005: sauberer Homeserver-Neuaufbau mit stabilem DNS-`server_name`.
2. SDK-/Rust-Megolm initialisieren, verschlüsselte Räume erzeugen, Schlüssel sichern/wiederherstellen und mehrere Geräte prüfen.
3. Vertrags-/Modellteil: Schema für Serie/Termin/Ausnahme, Rollenbedeutung, Schließen zum geplanten Ende und ausführbare Integrationsprüfung.
4. Erster durchgängiger Teil (`repeatCount=1`, nur Text).
5. Wiederholungen und Terminbearbeitung.
6. Ausdrückliche Rollen/Einladungen und Beratungsform.
7. Zukunfts- und Aktivitätszeitleiste integrieren.
8. Wartebereich, mehrsprachige Verfasserkonfiguration, Kalender und Benachrichtigungen fertigstellen.
9. Eigenes Arbeitspaket für erreichbare E-Mail.

Jeder Teil folgt TDD mit zuerst fehlschlagenden, dann erfolgreichen Tests, passenden Repository-Integrationstests, verbindlichen Frontend-Unit-/Lint-/Build-Prüfungen, Playwright-/echten Browserprüfungen, Mobil-/Desktop-Prüfungen, Nachweis mit neuen Benutzern und Pre-Dev-Prüfung, falls Deployment zum Umfang gehört.
