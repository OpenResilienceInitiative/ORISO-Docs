# ADR-016: Team-Besprechung — separater Nebenraum je offener Anfrage, endgültiges Schließen bei Annahme

- **Status:** Angenommen — Frank, 2026-07-18 (grill-with-docs-Sitzung)
- **Datum:** 2026-07-18
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** ADR-002 (stille Mitgliedschaft / Zugriffsschranke), ADR-008 (Supervisionsseitenkanal als eigener Raum), `CONTEXT-conversation-types.md` (Team-Besprechung als zusätzliche Ebene), `ORISO-Frontend/CONTEXT.md` (vollständiger Glossareintrag), Memory `oriso-team-besprechung-design`

---

## Kontext

Beraterteams möchten sich vor der Annahme einer eingehenden Anfrage abstimmen: „Wer übernimmt das, was meint ihr?“ Dies soll für Ratsuchende unsichtbar sein; danach läuft die normale 1:1-Beratung. Naheliegend wären versteckte Nachrichten oder ein Team-Thread im Gespräch des Klienten. Matrix liefert jedoch jedes Ereignis an jedes Gerät jedes Raummitglieds. Das Verstecken innerhalb desselben Raums war genau die U25-Schutzlücke, die ADR-008 beseitigte. Auf `origin/pre-dev` geprüft: Der ADR-008-Nebenraum ist vorhanden — ein Matrix-Raum je Sitzung, in den der Klient nie eingeladen wird, mit Abbruch beim Senden bei erkannter Offenlegung. Er wird aber erst bei *Annahme* angehängt und setzt einen zugewiesenen Berater voraus. Der alte Caritas-Feedback-Chat wurde entfernt (Changeset 0046).

## Entscheidung

1. **Team-Besprechung = separater Matrix-Raum an einer offenen Anfrage der Beratungsstellenberatung.** Das erweitert das Nebenraumprinzip aus ADR-008 auf die Phase vor der Zuweisung. Verbindliche Regel: **Teamabstimmung findet niemals im Raum des Klienten statt, auch nicht „versteckt“.**
2. **Endgültiges Schließen bei Annahme.** Sobald die Anfrage angenommen wird, wird die Besprechung archiviert. Sie wird *nicht* in den aktiven Fall übernommen. Danach erfolgen Abstimmungen über die vorhandenen Werkzeuge: **Supervision** (lesende Begleitung) oder **Fallübergabe** (Mitbearbeitung/Übernahme). So bleiben drei klar getrennte Werkzeuge statt eines unklaren Mischmodells.
3. **Erneuter Archivzugriff ist ausschließlich lesend** (verbindliche Regel). Zugriffsregeln bleiben zunächst locker: Teammitglieder dürfen ohne formale Mitbearbeitung lesen. Die Aufbewahrung nutzt die bestehende automatische Archivlöschung, ohne neuen TTL-Mechanismus.
4. **Teilnahmerecht = Recht, die Anfrage zu sehen.** Genau die Berater, die eine Anfrage sehen und annehmen könnten, dürfen sie besprechen. Es gibt keine neue Berechtigungsebene. Ein mandantenbezogener Funktionsschalter steuert die gesamte Funktion.
5. **Die Besprechung ist flach.** Der Nebenraum gehört bereits zu genau einer Anfrage und *ist* damit deren einzelner „Thread“. Er enthält keine weitere Thread-Struktur. Gilt nur für Beratungsstellenberatung: Live-Chat ist anonym und kurzlebig und nach ADR-002 ausgeschlossen; die anderen Beratungsformen haben keinen Anfragebereich.
6. Oberfläche: ein Panel/Tab an der Anfrage im Anfragebereich, mit Beitragszähler und dauerhaftem Hinweis „nur für das Team — unsichtbar für Ratsuchende“. So ist jederzeit klar, auf welcher Seite ein Berater schreibt.

## Erwogene Optionen

- **Thread im Raum des Klienten, nur im Client verborgen.** Verworfen: mit Matrix nicht sicher versteckbar; öffnet erneut dieselbe Lückenklasse wie ADR-008.
- **Nebenraum in den aktiven Fall übernehmen.** Durch Produktentscheidung verworfen: Nach Annahme gehört Abstimmung zu Supervision/Fallübergabe. Ein weiterlaufender Raum verwischt diese Grenze. Lesender Archivzugriff erhält stattdessen den Zusammenhang: eingefroren und bei Bedarf lesbar statt dauerhaft offen.
- **Auf Megolm-Empfängeruntergruppen warten (ein Raum, kryptografisches Verstecken).** Bereits in ADR-008 verschoben; vor dem geplanten Start am 2026-10-01 unrealistisch.

## Folgen

**Positiv:** Verwendet einen ausgelieferten Nebenraummechanismus mit Schutz vor Offenlegung; kein neues Berechtigungsmodell; klare Lebenszyklusgrenze passend zur vorhandenen Einteilung der Werkzeuge. **Aufwand:** Raum beim Eingang der Anfrage bereitstellen, einschließlich Bedienung vor der Zuweisung — die heutige Fassade setzt einen zugewiesenen Berater voraus. Die Verteilung von Benachrichtigungen an mehrere Empfänger muss gebaut werden; aktuelle Nachrichtenerzeuger setzen Benutzer und Berater fest voraus. Außerdem ist eine Oberfläche für erneuten Archivzugriff nötig.

---

## Nachtrag 2026-09-05: §3 war falsch — es gibt keine automatische Archivlöschung; ein eigener Löschlauf ersetzt sie

**Korrektur.** §3 sagt, die Aufbewahrung „läuft über die bestehende automatische Archivlöschung — kein neuer TTL-Mechanismus“. Das stimmte nie. Geprüft gegen `ORISO-UserService` (`dev`, September 2026): Das Archivieren einer Team-Besprechung (`TeamDiscussionFacade.archiveDiscussion`) setzt nur `team_discussion.discussion_status` auf `ARCHIVED`, stempelt `archive_date` und hebt das Power-Level `events_default` des Raums an, sodass niemand mehr schreiben kann. Gelöscht wird nichts — das Repository hatte keine Löschoperation, und der Matrix-Raum behielt alles, was das Team über die ratsuchende Person geschrieben hat, im Klartext, solange der Homeserver existierte. Die DSFA führt die Aufbewahrungsfrist für diese Räume als „geplant, noch nicht umgesetzt“.

**Entscheidung.** Ein eigener, geplanter Löschlauf ist der Aufbewahrungsmechanismus für Team-Besprechungsräume (ORISO-UserService #1116, übergeordnetes KDG-Epic #1010):

- **Vollständige Löschung, keine Statusänderung.** Nach Ablauf der Frist wird der Matrix-Raum über die Synapse-Admin-API gelöscht; danach werden die Zeile `team_discussion` und ihre Einträge in `team_discussion_participant` in einer Transaktion entfernt.
- **Beginn der Frist:** `archive_date`, und nur Diskussionen mit Status `ARCHIVED` kommen in Frage. Eine `OPEN`-Diskussion wird von diesem Lauf nie gelöscht: `team_discussion` trägt kein Aktivitätssignal, „offen“ heißt also „nicht archiviert“, nicht „aufgegeben“, und eine Löschung nach Anlagedatum würde einen noch genutzten Raum entfernen (Review zu UserService #1122). Eine tatsächlich aufgegebene Anfrage wird von der anderen Seite abgedeckt — wird ihre Sitzung gelöscht, entfernt der Löschablauf die Diskussion und ihren Raum (UserService #1118). Soll später eine ausdrückliche Regel für aufgegebene Diskussionen gelten, ist das ein zusätzliches Signal `last_activity_date`, keine Änderung an dieser Regel.
- **Erst Raum löschen, dann Zeile.** Gelöscht wird über die Synapse-Admin-API Delete Room, `DELETE /_synapse/admin/v2/rooms/{roomId}` mit dem Body `{"purge": true}` und **ohne** Parameter `block`, sodass ein unbekannter Raum mit `404` antwortet, statt gesperrt zu werden. Nur dieses dokumentierte „Raum nicht gefunden“ oder ein `2xx` gibt die Zeile frei. Jedes andere Ergebnis — Timeout, Authentifizierungsfehler, `5xx`, jeder unklare Fehler — behält die Zeile und ihre Teilnehmenden, und der nächste Lauf versucht es erneut. Der Verweis auf einen Raum, der vielleicht noch existiert, geht nie verloren.
- **Eine Instanz, alle Mandanten, nächtlich.** Der Lauf wird über den Claim geplanter Aufgaben geleast (Claim-Schlüssel `team-discussion-archive-retention`) und läuft im technischen Mandantenkontext, versetzt zu den anderen Aufbewahrungsjobs (`0 45 3 * * ?`).
- **Ohne Release konfigurierbar:** `team-discussion.archive.retention.days` (`TEAM_DISCUSSION_ARCHIVE_RETENTION_DAYS`), über ORISO-Helm als `userService.teamDiscussion.archiveRetentionDays` verdrahtet. Ein Wert von `0` oder kleiner schaltet den Job ab.
- **Rollout-Sperre: aus, bis die oder der Datenschutzbeauftragte zustimmt.** Das Helm-Chart liefert den Wert als `0` aus und fällt auch ohne den Schlüssel auf `0` zurück, sodass keine ORISO-Installation etwas löscht, bis der Betrieb die freigegebene Frist im Umgebungs-Overlay setzt. Der Anwendungs-Standard von 90 gilt nur für einen Dienst, der außerhalb des Charts ohne die Umgebungsvariable gestartet wird.

**Wirksame Frist, für die DSFA.** Vorschlag: **90 Tage nach der Archivierung**. Für Team-Besprechungsräume gibt es keine gesetzliche Frist; die fachliche Position der Caritas ist, dass Prozessdaten mit dem Ende der Beratungsbeziehung gehen. 90 Tage sind der DSFA-Vorschlag und warten **auf die Zustimmung der oder des Datenschutzbeauftragten**; bis dahin ist der ausgerollte Wert `0` (Job aus). Es ist bewusst ein Wert der Installation, damit die Zahl ohne Codeänderung gesetzt und später korrigiert werden kann.

**Was sich nicht ändert.** Harter Abschluss bei Annahme (§2), nur lesender Wiederzugriff während der Aufbewahrungsfrist (§3, erster Teil) und die Teilnahmeregel (§4) bleiben bestehen. Damit zusammenhängender, aber unabhängiger Fehler: Das Löschen einer Sitzung ließ Diskussionszeile und Raum zurück (ORISO-UserService #1118) — separat behoben, nicht durch diesen Lauf.

---

## Nachtrag 2026-11-23: gesteuert und geschaltet wie Supervision

**Anlass.** Frank, 2026-11-23 (P0, v2.0.18): Der Team-Chat zur Anfrage „muss in Funktionszugriff genau so gesteuert werden, granular wie Supervision, auch mit der gleichen UI-Logik“. Vor diesem Nachtrag war der „Feature-Schalter auf Mandantenebene“ aus §4 die einzige Steuerung: ein Träger-Wert, keine Plattform-Vorgabe, kein Wert je Beratungsstelle und keine Möglichkeit, einen laufenden Team-Chat für eine Anfrage wieder abzuschalten. Nachverfolgt in ORISO-Frontend#2491.

**Entscheidung.**

1. **Konfiguration = das Richtlinienmodell der Supervision.** `featureTeamDiscussionEnabled` wird eine Berechtigungsrichtlinie wie `featureSupervisionEnabled`: Plattform-Vorschlag oder -Vorgabe, eigener Wert oder Vorgabe des Trägers, eigener Wert der Beratungsstelle, sofern nicht vorgegeben. Die Chat-Funktionen des Team-Chats (Anrufe, Sprachnachrichten, Threads, Medien) sind ebenfalls Richtlinien und werden im selben „Konfigurieren“-Dialog eingestellt wie die Funktionen des Supervisionschats. Ein bestehender Träger-Wert gilt weiter als eigener Wert dieses Trägers. Das ersetzt den einzelnen Mandantenschalter aus §4; die Teilnahmeregel aus §4 bleibt.
2. **Wirksamer Wert = Träger UND Beratungsstelle**, durchgesetzt vom UserService genau wie bei Supervision (`ConversationFeatureGate`): nicht gesetzt zählt als an, eine nicht lesbare Einstellung lehnt ab (403), ein Ausfall antwortet mit 503.
3. **Ein/Aus je Anfrage.** Eine Berater:in, die die Anfrage sehen darf, schaltet den Team-Chat über „Weitere Funktionen“ ein (der Raum wird angelegt oder wieder geöffnet) und wieder aus — an derselben Stelle wie Supervision; solange er an ist, zeigt der Kopf der Anfrage einen Team-Chat-Chip. Ausschalten setzt den neuen Status `CLOSED`: Der Raum wird für alle nur lesbar (gleicher Berechtigungsmechanismus wie beim Archiv), nichts wird gelöscht, und er kann wieder eingeschaltet werden, solange die Anfrage offen ist.
4. **Schließen bei Annahme wird eine Einstellung (ändert §2).** Eine zweite Richtlinie, `featureTeamDiscussionAfterAcceptEnabled` (Standard aus, gleiche drei Ebenen, nur wirksam, wenn der Team-Chat selbst an ist), legt fest, was die Annahme bewirkt. *Aus* (Standard, heutiges Verhalten): Die Annahme archiviert den Team-Chat, ob `OPEN` oder `CLOSED`; er bleibt am Fall, wird durch die Annahme nie gelöscht, und die annehmende Berater:in sowie die bisherigen Teilnehmenden öffnen ihn nur lesend über „Weitere Funktionen“ — niemand kann hineinschreiben. *An*: Der Team-Chat wird bei der Annahme nicht archiviert und läuft als Team-Nebenchat des Falls mit demselben Ein/Aus weiter, sodass das Team eine Anlage zum Fall behält, statt Notizen hin und her zu schieben. Das Einschalten im Funktionszugriff fragt zuerst eine Datenschutz-Bestätigung ab, wie bei Supervision (Frank, 2026-11-23).
5. **Kein eigener Button.** Der Team-Chat ist nur über „Weitere Funktionen“ erreichbar und wird, solange er aktiv ist, durch den Chip im Kopf angezeigt; der separate Button neben „Annehmen“ entfällt (Frank, 2026-11-23).
6. **Aufbewahrung (Nachtrag 2026-09-05) bleibt unverändert.** Nur `ARCHIVED`-Team-Chats kommen für den Löschlauf in Frage; ein `CLOSED`-Team-Chat gehört zu einer noch offenen Anfrage und wird über das Löschen der Sitzung erfasst, falls die Anfrage aufgegeben wird.

**Folgen.** TenantService, AgencyService, UserService, Admin (Funktionszugriff-Kachel auf allen drei Ebenen, aufgebaut auf den Kacheln aus ORISO-Admin#1551/#1577) und Frontend (Einstellungen über `useConversationFeatureSettings` wie bei Supervision; Menüeintrag und Kopf-Chip) ändern sich gemeinsam. Ratsuchende sehen davon weiterhin nichts.
