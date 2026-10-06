# ADR-002: Stille Raummitgliedschaft mit Vertraulichkeitsschranke durch Zugriffskontrolle, nicht Ende-zu-Ende-Verschlüsselung

- **Status:** Angenommen — Frank, 2026-06-25 (Bestätigung durch das Team steht aus)
- **Datum:** 2026-06-25
- **Entscheider:** Frank und Backend-/Matrix-/Frontend-Leads
- **Verwandt:** ADR-001 (Beratungsformen als Module); `ORISO-UserService/CONTEXT.md`; `ORISO-Frontend/CONTEXT.md` (Übergabe); UserService `UnauthorizedMembersProvider`, `AgencyPreAssignmentRoomService`, `AssignEnquiryFacade`, `MatrixRoomClient`, `SessionSupervisorFacade`

---

## Kontext

Ein Klientengespräch ist ein Matrix-Raum. Zwei Punkte sind derzeit defekt beziehungsweise ungeklärt:

1. **Das Mitgliedschaftsmodell aus Rocket.Chat lädt die ganze Beratungsstelle ein; danach entfernt der annehmende Berater alle anderen** (`UnauthorizedMembersProvider`). Die Matrix-Migration legte keinen Ersatz fest. Der Matrix-Pfad erzeugt stattdessen einen Zwischenraum über ein Servicekonto der Beratungsstelle, zunächst nur mit dem Klienten, und lädt bei Annahme einen einzelnen Berater ein. Spätere Vertretungen, etwa für kranke Kollegen, **treten verspätet bei**.
2. **Es gibt keine Vertraulichkeitsgrenze.** Auf Pre-Dev geprüft: Synapse läuft ohne Verschlüsselungskonfiguration; Räume sind unverschlüsselt und Nachrichten stehen im Klartext in `homeserver.db`. Ohne Überschreibung von `history_visibility` gilt beim Preset `private_chat` der Wert `shared`. Daher **liest jedes neu beitretende Mitglied die gesamte Vorgeschichte**. Die Frontend-Verschlüsselung verwendet weiterhin das Rocket.Chat-Modell, das Matrix-Räume vollständig überspringt.

Produktbedarf: Jeder Berater eines Fachbereichs soll einen Fall *vertreten* können, einschließlich der Übernahme eines aktiven Falls eines kranken Kollegen **mit Verlauf**. Unbeteiligte Berater sollen aber nicht beiläufig fremde Fälle sehen.

Bei echter Mitgliedschaft ab Erstellung sind höchstens zwei dieser drei Eigenschaften gleichzeitig möglich: **kryptografische** Schranke, **Freigabe mit Verlauf** und **keine erneute Schlüsselverteilung**. Wir müssen wählen.

## Entscheidung

**Umfang:** ausschließlich **1:1-Beratung im Nähe-/Proximity-Chat**. Live-Chat mit kurzer Lebensdauer, einem Berater und ohne Einsichtnahme sowie interner Chat sind ausgeschlossen.

**1. Echte Mitglieder ab Raumerstellung, kein Einladen-und-Entfernen und kein später Beitritt.**
Bei Erstellung eines Gesprächs treten die Berater des zuständigen Fachbereichs als **stille Mitglieder** tatsächlich bei, auf Grundlage des vorhandenen Teamsitzungsmechanismus. Der bearbeitende Berater ist **aktiv**, die übrigen bleiben still. Freigabe ändert Sichtbarkeit/Berechtigung einer vorhandenen Mitgliedschaft. Niemand tritt später bei; es gibt daher kein Problem mit neuer Schlüsselverteilung oder Verlaufswiedergabe.

**2. Die Schranke beruht auf Zugriffskontrolle und Oberfläche, nicht Kryptografie.**
Stille Mitglieder *können* technisch lesen: Räume bleiben effektiv unverschlüsselt oder alle Mitglieder erhalten Schlüssel. „Still“ bedeutet: Der Client **verbirgt** das Gespräch und **unterdrückt** Benachrichtigungen. Vertraulichkeit wird durch Folgendes durchgesetzt:
- **Fachbereichsbezogene Suche:** Berater finden Klienten, Gespräche und Kollegen nur in eigenen Fachbereichen.
- **Antrag auf Freigabe:** Ein verborgenes Gespräch sichtbar zu machen ist eine bewusste Handlung.
- **Auditprotokoll jeder Freigabe:** wer welchen Fall wann und auf welcher Grundlage geöffnet hat.

**Freigabe gibt den vollständigen bisherigen Verlauf frei**, um Beratung bei Übernahme fortzusetzen. Klartextspeicherung wird durch **Datenträger-/Volume-Verschlüsselung** abgesichert, nicht durch Nachrichten-Ende-zu-Ende-Verschlüsselung.

## Folgen

**Positiv:** Vertretung funktioniert, weil der Kollege schon Mitglied ist. Keine Schlüssel-/Verlaufsprobleme durch späten Beitritt. Die unvollständige Matrix-Migration erhält ein klares Zielmodell und ersetzt das anfällige Einladen-und-Entfernen.

**Negativ / Aufwand:** Zwischen Beratern derselben Beratungsstelle gibt es **keine kryptografische Vertraulichkeitsgrenze**. Ein entschlossener Kollege könnte mit seinem Client einen nicht freigegebenen Fall lesen. Sicherheit **beruht vollständig auf eingegrenzter Suche, Freigabeschranke und Audit**. Diese entscheidenden Kontrollen müssen korrekt und manipulationsnachweisbar sein. Nachrichten bleiben serverseitig Klartext, bis Datenträgerverschlüsselung eingerichtet ist.

## Erwogene Alternativen

- **Echte Matrix-Verschlüsselung und Freigabe historischer Schlüssel:** Gibt die Eigenschaft ohne Schlüsselereignis auf. Echte Grenze zwischen Kollegen mit Verlauf, aber erheblicher Aufwand zum Ersatz der inaktiven Rocket.Chat-Verschlüsselung; neue Schlüsselverteilung bei Freigabe.
- **Echte Verschlüsselung, Freigabe nur zukünftiger Nachrichten:** Gibt Verlauf bei Freigabe auf. Echte Grenze und günstig, aber Vertretung kann die bisherigen Aussagen des Klienten nicht lesen; verletzt den Kernfall.
- **Schattenmitgliedschaft, Freigabe als echter Beitritt:** Verworfen, weil sie genau den Verlaufs-/Schlüsselneuverteilungsfehler durch späten Beitritt wiederholt.

## Bezug zur laufenden Fallübergabe (abgeglichen am 2026-06-25)

Der Epic zur **KDG-konformen Fallübergabe** (`CAR-CHO-01`) traf unabhängig dieselbe Entscheidung: **technische Eignung** von **begründeter Sichtbarkeit** trennen und Schlüsselhinterlegung verwerfen. Bisher gebaut, mit gemergten PRs UserService #186, Frontend #275, Admin #208 und Database #13: **Richtlinienschranke, Grund, Erläuterung, Klienteneinwilligung, Audit, Admin-Konfiguration und Sperre der Inhalte**.

**Noch nicht gebaut / abweichend:**
- **Technische Eignung wird vorausgesetzt, nicht implementiert.** `CaseHandoverService.requestAccess` gewährt über `session.setConsultant(requester)` und stellt keine Matrix-Mitgliedschaft her. Funktioniert nur wegen unverschlüsselter Räume. Mitgliedschaft ab Erstellung aus ADR-002 ist nicht implementiert. **Frank entschied am 2026-06-25: Diese Schicht jetzt als nächsten Teil bauen, Fachbereich tritt jedem Gespräch bei Erstellung bei; nicht auf spätere Untersuchung verschieben.**
- **Jeder Grund bewirkt Übertragung auf einen einzigen Verantwortlichen**, auch Bitte um Rat, statt optional einen mitaktiven Berater hinzuzufügen.
- **`case_handover_reason_policy` ist global**, Primärschlüssel `code`, ohne `tenant_id`; modelliert nur `client_consent_required` und `access_allowed`. Plattformstandard, Mandantenüberschreibung, lesende Weitergabe sowie Genehmigungsmatrix für Klient/Berater/Supervisor/Strafverfolgung sind nicht darstellbar.
- **Umfang ist Beratungsstelle und Nicht-Teamsitzungen**, nicht Fachbereich (Beratungsstelle × Thema) und Teamsitzungen.

## Freigabelebenszyklus (entschieden am 2026-06-25)

Verbindliche Regel: **Mitgliedschaft ≠ Sichtbarkeit**. Der gesamte Fachbereich ist stilles Mitglied, technisch geeignet, sieht aber nichts. Nur ein kleiner, bewusst freigegebener, zeitlich begrenzter und protokollierter Kreis sieht den Fall. Zwei Formen über demselben Mechanismus, abhängig vom **Zugriffsergebnis** des Grundes:
- **Einsichtnahme** für Rat: lesender, zeitlich begrenzter Zugriff, der **automatisch abläuft**, erneut sperrt und Audit schreibt. Ursprünglicher Berater behält volle Sichtbarkeit und Verantwortung. Verwendet **Supervision** plus neue Ablaufsteuerung und selbst bedienbare Freigabeschranke.
- **Übernahme** bei Abwesenheit: Vertretung erhält volle Sichtbarkeit und Verantwortung. Ursprünglicher Berater wird erneut verborgen, bleibt Mitglied und kann **zurücknehmen**. Kein automatischer Ablauf; gilt bis Rücknahme/Rückkehr.
- **Rücknahme:** Umkehr der Übernahme. Dauerhafte Gründe wie Ausscheiden erlauben keine Rücknahme.

TTL: `max_access_duration` je Grund, bei Einsichtnahme standardmäßig etwa drei Stunden und mandantenkonfigurierbar; Übernahme `null`, bis Rücknahme. **Audit je Beratungsstelle, sichtbar für den Mandanten** einschließlich Beratungsstellen-/Mandantenadministratoren und Datenschutzbeauftragten, **nicht für den Plattformbetreiber**. Die gemergte Tabelle `case_handover_request` enthält bereits `tenant_id`; nur `case_handover_reason_policy` fehlt es noch.

## Geklärt (Designsitzung 2026-06-25)

- **Freigabeschranke:** konfigurierbare **Übergaberichtlinie** je Grund in Admin. Zwei **Zugriffsergebnisse**: Einsichtnahme, lesend und zeitlich begrenzt mit automatischem Ablauf; Übernahme, voll mit Verantwortung und **Rücknahme**, ursprünglicher Berater erneut verborgen, aber weiter Mitglied. Ausscheiden erlaubt keine Rücknahme. Fälle **abwesender** Kollegen werden aufgrund der Abwesenheit übernommen, ohne deren Einwilligung; Rücknahme bei Rückkehr.
- **Fachbereich (Beratungsstelle × Thema)** ist eigenständige Einheit mit Impressum/Datenschutzerklärung, siehe **ADR-003**.
- **Vertragliche Grundlage** wird bei Gesprächserstellung gebunden: Nähe-Chat an seinen Fachbereich, Live-Chat an den Fachbereich des Einladungslinks. Unveränderliche Momentaufnahme; Entwurf/unveröffentlicht nur protokollieren.
- **Richtlinienspeicher:** Konfiguration in **TenantService** mit Plattformstandards, Mandantenüberschreibungen und lesender Weitergabe; **in UserService zwischengespeichert und durchgesetzt** (Option B). `case_handover_reason_policy` wird dessen Durchsetzungscache und benötigt `tenant_id` sowie erweiterte Genehmigungs-/Ergebnis-/Dauerfelder.
- **Klientensicht:** Klient sieht nur aktiven Berater. Stille Mitglieder werden herausgefiltert und sind pseudonym; Offenlegung über Fachbereichs-Datenschutzerklärung.

## Implementierungshinweise (ergänzt am 2026-07-30, nachdem #905 §1 bereitstellte)

- **Die 1:1-Klientenansicht leitet Teilnehmer aus Sitzungsdaten ab, niemals aus Matrix-Mitgliedschaften.** Auf `pre-dev` geprüft: Kopfzeile nutzt `contact`; `useMatrixRoomUsers` nur in Gruppenansichten und Erwähnungsauflösung. Jede spätere 1:1-Mitgliederliste, Lesebestätigungsavatare oder mitgliedschaftsbasierte Tippanzeige verletzt die Schranke; dies ist die verbindliche Grenze.
- **Pseudonymität muss am Homeserver gelten, nicht nur in der Oberfläche.** Ratsuchende sind im selben Raum und können mit ihrem Client jedes `displayname` über `/joined_members` lesen. Beraterkonten werden deshalb mit `ConsultantDisplayNameResolver` bereitgestellt, der nie echte Namen verwendet (US#929).
- **Freigabe fügt kein Mitglied hinzu und entfernt keines.** Bei Übernahme bleibt der vorige Berater für Rücknahme Mitglied; Freigabe toleriert vorhandene Mitgliedschaft des Antragstellers. Entfernen macht Verlauf unter Megolm nicht wiederherstellbar; erneutes Einladen vorhandener Mitglieder scheitert mit `403 M_FORBIDDEN`. Beides waren reale Fehler in `CaseHandoverService` bis US#929.
- **„Verborgen“ wird bereits serverseitig durchgesetzt:** Die Beratersitzungsliste kommt aus der Datenbank: `consultant IS NULL` für Anfragen, `findByConsultant…` nach Zuweisung. Ein angenommener Fall verschwindet ohne Matrix-Aktion aus den Listen anderer Berater.

## Ergänzung 2026-09-05 — Fallübergabe erhält Abgaberichtung; keine dritte Einwilligungsschranke und keine Raumleerung

- **Status:** Angenommen — Frank, 2026-09-05. Die bisherigen Entscheidungen bleiben gleich. Die Ergänzung erweitert nur den Freigabelebenszyklus um eine zweite Einstiegsrichtung und hält zwei bewusst *nicht* gebaute Punkte fest.
- **Verwandt:** ADR-016 (Team-Besprechung, Schließen bei Annahme), ADR-022 (genau zwei Einwilligungsschranken), UserService #200 (Übernahme ohne Entfernen des vorigen Beraters), #1111 (`teamSession` / `INTERNAL_GROUP`-Kennzeichnung).

**1. Abgaberichtung: Angebot → Annahme durch Empfänger → derselbe Freigabepfad.**
Bisher konnte ein Berater nur Zugriff auf fremde Fälle *anfordern*. Jetzt kann der Verantwortliche seinen Fall auch einem Kollegen derselben Beratungsstelle *anbieten*. Ein Angebot ist ein Eintrag in `case_handover_request` mit `direction` `PULL` oder `PUSH`, Zielberater und Ablaufzeit. Es benötigt Empfängerannahme (`PENDING_RECIPIENT_ACCEPT` → `RECIPIENT_DECLINED` / `WITHDRAWN` / `EXPIRED`). Annahme führt **denselben Pfad wie eine Anforderung** aus: Richtlinienschranke des Grundes, erforderliche Klienteneinwilligung, Matrix-Systemnachricht, Anbindung des dauerhaften Supervisors. Ein offenes Angebot je Fall; unbeantwortet läuft es nach 72 Stunden ab und der Fall bleibt unverändert.

Bewusst gibt es **einen** Übergabepfad. Die alte Rocket.Chat-Aliasnachricht `REASSIGN_CONSULTANT`, über die der *Klient* im Chat die Neuzuweisung bestätigte, wird entfernt statt parallel behalten. Zwei Pfade mit unterschiedlichem Einwilligungsverhalten wären eine Auditlücke.

**2. Empfängerannahme ist keine Einwilligungsschranke — ADR-022 gilt weiterhin.**
ADR-022 legt **genau zwei** Schranken fest: Warteraum und Raum vor erster Nachricht. Eine Abgabe ergänzt **keine dritte**. Empfängerannahme ist ein Personalablauf zwischen Fachkräften, keine Datenschutz-Einwilligung. Klientenzustimmung bestimmt wie beim Holen die Richtlinie `client_consent_required` des Grundes: gleiches Feld, gleicher Dialog, gleicher Auditeintrag.

**3. Grundcodes enthalten keinen Gesundheitsbezug (Art. 9 DSGVO).**
Gründe werden `PLANNED_ABSENCE`, `UNPLANNED_ABSENCE`, `ASSIGNMENT_ENDED` und `ADVICE_REQUESTED`. Alte Codes (`COUNSELLOR_ON_HOLIDAY`, `COUNSELLOR_IS_ILL`, `OTHER_EMERGENCY`, `COUNSELLOR_LEFT`, `COUNSELLOR_ASKED_FOR_ADVICE`) werden deaktiviert; bestehende Zeilen migriert. Grund und Bezeichnung stehen nicht nur an einer Stelle: in `case_handover_request`, Admin-Audit, Benachrichtigungsparametern und als Kliententext im Matrix-Raum. „Ihr Berater ist leider krank“ sind **Gesundheitsdaten des Beraters**, an Klienten veröffentlicht und in mehreren Systemen gespeichert. Neuer Kliententext nennt weder Ursache noch Dauer: bisheriger Berater nicht verfügbar, benannter Kollege setzt Beratung fort.

Bereits veröffentlichte Raumereignisse lassen sich nicht migrieren, da Matrix-Ereignisse unveränderlich sind. Heute betrifft dies nur Dev und Pre-Dev. Korrektur muss vor Produktionsstart erfolgen.

**4. Raumleerung bei Annahme wird bewusst NICHT implementiert.**
Die Idee, bei Annahme einer Anfrage oder Übergabe alle anderen Mitglieder zu entfernen, wurde untersucht und verworfen:

- Widerspricht Entscheidung §1, echte Mitgliedschaft ab Erstellung, und Hinweis vom 2026-07-30, Freigabe verändert keine Mitgliedschaft. Entfernen macht Megolm-Verlauf nicht wiederherstellbar; erneutes Einladen scheitert bei bestehender Mitgliedschaft.
- Würde das Holen eines Falls brechen, den eigentlichen Grund für stille Mitgliedschaft. Vertretung funktioniert *weil* der Kollege schon Mitglied ist. Raumleerung macht jede Übernahme erneut zum verspäteten Beitritt mit Schlüsselneuverteilung und Verlaufswiedergabe, genau dem ersetzten anfälligen Modell.
- Widerspricht Produktentscheidung UserService #200: Übernahme **ohne** Entfernen des vorigen Beraters, damit er zurücknehmen kann.
- Mitgliedschaftsabgleich arbeitet dagegen: Beratungsstellenservices fügen Berater bei jeder Synchronisierung erneut hinzu.

Die erinnerte harte Entfernung ist ein anderer vorhandener Mechanismus: **ADR-016, Entscheidung 2: endgültiges Schließen des Team-Besprechungsnebenraums bei Annahme.** Der *Nebenraum* wird archiviert und nur lesbar. Der *Klientenraum* bleibt unberührt. Teamabstimmung und Fallzugriff bleiben getrennte Werkzeuge. Gewünschte Entfernung wäre eine Revision von §1 mit Schlüsselneuverteilungskonzept und Mandantenrichtlinienflag, kein Implementierungsdetail. Sie setzt außerdem die Kennzeichnungskorrektur `teamSession` / `INTERNAL_GROUP` (#1111) voraus, sonst würde sie echte Gruppenchats leeren.

**5. Begriffe für Oberfläche und öffentliche Dokumentation.**
„Fallzugriff“ ist der Oberbegriff. **Einsichtnahme** = lesender, zeitlich begrenzter Zugriff, Verantwortung bleibt. **Übernahme** = Verantwortung wechselt, vorheriger Berater bleibt Mitglied und kann zurücknehmen. **Fall holen** = Pull; **Fall abgeben** = Push.
