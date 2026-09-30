# ADR-008: Supervision — ausdrücklichen Zugriff je Sitzung innerhalb der Beratungsstelle behalten; Seitenkanäle aus dem Klientenraum verlagern

- **Status:** Vorgeschlagen — 2026-06-28 (grill-with-docs-Sitzung). U25-Gruppe und Startdatum **am 2026-06-30 geklärt**: Minderjährige gehören zu U25; Start **2026-10-01**, nicht 30.06. Getrennter Seitenraum ist deshalb **bestätigte Voraussetzung vor Start**, mit Vorlauf. Offen: genaue Offenlegung durch Datenschutzbeauftragten und Befugnis/Einwilligung zum Hinzufügen von Supervisoren.
- **Datum:** 2026-06-28
- **Entscheider:** Frank (Produkt), KI (Engineering), Datenschutzbeauftragter (offen)
- **Verwandt:** `CONTEXT-conversation-types.md` (Supervision, Peer, Koordinator, selektive Raumsichtbarkeit), `ADR-002-silent-room-membership-and-access-control-curtain` (tatsächliche Durchsetzung), `ADR-004`/`ADR-005` (Megolm nach Neuaufbau dauerhaft aktiv, aber keine Vertraulichkeit innerhalb desselben Raums: Mitglieder entschlüsseln jedes Ereignis), Memory `oriso-case-handover-cho-01` (Grund/Einwilligung/Audit), `oriso-agency-admin-cross-traeger-leak` (ungegrenzter Zugriff). Anlass: **U25**-Suizidberatung durch **Peers** mit **Koordinatoren**.

---

## Kontext

Prüfung am 2026-06-28 korrigierte zwei Annahmen:

1. **Supervisionsreichweite gut gebaut, kein global unbegrenzter IDOR.** Zwei Dinge: kosmetisches Frontend-Flag `isSupervisorView = consultant.id !== userData.userId` und echte Funktion mit `SessionSupervisor` und **Matrix-Mitgliedschaft**. `addSupervisor` in `SessionSupervisorFacade` führt `inviteUserToRoom`, `setUserPowerLevel(10, read-only observer)` und `joinRoom` aus. Lesen prüft `isSupervisor(consultant, session)` über `findBySessionIdAndSupervisorConsultantIdAndIsActiveTrue`. Supervisoren erreichen **genau zugewiesene Sitzungen**. Hinzufügen ist **beratungsstellenbezogen**, nicht trägerübergreifend oder für alle Fälle. Nur das kosmetische Flag wirkt global.
2. **Das tatsächliche Risiko ist die umgekehrte Seitenkanalrichtung, HOCH für U25-Minderjährige.** Lesen des Klientenraums durch Supervisoren ist beabsichtigt. Problem: Feedback mit Präfix `[SUPERVISOR_FEEDBACK]` und Koordinator↔Peer-Kommentare mit `[VISIBLE_TO:uid…]` landen **im selben Raum wie der Minderjährige**. Nur React `return null` in `MessageItemComponent.tsx` versteckt sie. `getRoomMessages` liefert jedes Ereignis. Megolm hilft nicht: Minderjährige sind berechtigte Mitglieder und entschlüsseln alles; keine Server-ACL. Klartextkommentare werden **an ihr Gerät geliefert** und sind über DevTools, Netzwerkansicht oder andere Matrix-Clients leicht lesbar. Klinische Kommentare/Supervisorenkritik bei suizidgefährdeten Minderjährigen sind ein Schutzrisiko, kein Darstellungsfehler. Dies konkretisiert die Frage mangelnder Matrix-Integration als technische Altlast.

Zweites, geringeres Risiko: `addSupervisor` erlaubt zugewiesenen Berater **oder dieselbe Beratungsstelle**. Jeder Kollege kann damit einen Kollegen mit `is_supervisor` jedem laufenden Fall hinzufügen, für Minderjährige nur als Benachrichtigung ohne Veto, mit Freitextnotiz.

## Entscheidung (vorgeschlagen)

1. **Zugriff ausdrücklich je Sitzung und Beratungsstelle begrenzen.** Keine globale träger-/stellenübergreifende Aufsicht. Das öffnet bekannte Zugriffslücke. Falls U25 dies tatsächlich benötigt, ausdrückliches mandantenbezogenes Design statt gelockerter Prüfung `areFromSameAgency`.
2. **Präfixe nicht für Vertraulichkeit verwenden; alle Seitenkanäle in eigenen Raum.** Feedback Supervisor↔Berater und Koordinator↔Peer in **Matrix-Raum, zu dem Klient niemals eingeladen wird**. Supervisor bleibt lesend zur Beobachtung im Klientenraum; nur Feedback wandert aus. **Transportunabhängig**, wartet **nicht** auf Megolm-/Homeserver-Neuaufbau ADR-005.
3. **Verstecken von `[VISIBLE_TO:]`/`[SUPERVISOR_FEEDBACK]` ist nicht vertraulich.** Allenfalls Bedienungshilfe, wenn alle Mitglieder Inhalt sehen dürfen. Nie Schutzgrenze für klinische Kommentare gegenüber Minderjährigen.
4. **Befugnis einschränken und Einwilligung/Begründung protokollieren**, entsprechend CAR-CHO-01. Hinzufügen begrenzen, Begründung erfassen, Supervision gegenüber Ratsuchenden über Datenschutzerklärung/Impressum beim Eintritt offenlegen. Genauer Text wartet auf Datenschutzbeauftragten; Offenlegen/Verbergen-Schalter wäre einfach ergänzbar.

## Erwogene Optionen für Seitenkanal

- **Präfix und Frontend-`return null`, heute:** Als Vertraulichkeit verworfen, Daten erreichen weiterhin Minderjährigen.
- **Eigener Matrix-Raum, gewählt:** Echter Ausschluss, transportunabhängig, sofort auslieferbar. Weitere Räume und UI-Verknüpfung nötig.
- **Megolm-Empfängeruntergruppen:** Einziger Weg für einen Raum mit geheimen Kommentaren, aber wegen ausgeschaltetem Megolm ADR-004/005 blockiert; verschoben statt Startlösung.
- **Serverfilter in `getRoomMessages`:** Nur zusätzlicher Schutz. Direkter Synapse-`/sync` bei ausgeschalteter Verschlüsselung liefert alles. Allein unzureichend.
- **Matrix-Powerlevels/ACL:** Regeln Senden, nicht Lesen vorhandener Ereignisse; verstecken Inhalte nicht im gemeinsamen Raum.

## Folgen

**Positiv:** U25-Schutzlücke transportunabhängig geschlossen, ohne Kryptoneuaufbau abzuwarten. Begrenzte Reichweite bleibt; Befugnis/Einwilligung nachvollziehbar. **Negativ / Aufwand:** Eigener verwalteter und verknüpfter Raum. Ein Raum mit kryptografisch verborgenen Kommentaren bleibt spätere Möglichkeit nach Megolm.

## Offen (Franks Anforderungen und Datenschutzbeauftragter)

- ~~Nur visuelles Verstecken vor Aufnahme Minderjähriger akzeptabel oder getrennter Raum Voraussetzung?~~ **Frank, 2026-06-30: geklärt.** Kein Start am 30.06, sondern **2026-10-01**, mit **echten Minderjährigen**. Getrennter Raum muss vorher geliefert werden; kein akzeptabler Zwischenzustand. Ende Juni ist Entwicklungszeit mit Vorlauf, kein Start. Unabhängig von ADR-005 bauen.
- ~~Wer darf hinzufügen, brauchen Ratsuchende/Erziehungsberechtigte Einwilligung oder Veto?~~ **Zweimal geklärt:** Befugnis 2026-07-04, US#302; Einwilligung/Veto 2026-07-13, unten.
- Stellen-/trägerübergreifende Supervision erforderlich oder bestehende Begrenzung richtig?
- Audit/Aufbewahrung: Reicht `SessionSupervisor` mit hinzugefügt/entfernt oder braucht es genaueren Nachweis, wer wann welchen Minderjährigenfall begleitet hat?

## Ergänzung 2026-07-13: dauerhafte automatische Zuweisung und einheitlicher Widerspruch

Ausgelöst durch Shazias Meldung, Supervision mische sich in Fallübergabe. Keine Regression gefunden: Nebenraumkorrektur US#293/FE#367 intakt, siehe Memory `oriso-matrix-hardening-plan`. Tatsächliche Lücken: kein dauerhaft zugewiesener Supervisor, `addSupervisor` manuell je Sitzung; US#302 vom 2026-07-04 erlaubt eigene Beratungsstellenadministratoren. Außerdem offene Einwilligungs-/Vetofrage.

**Entscheidungen:**

1. **Neue dauerhafte „Supervision, automatisch zugewiesen“**, vollständig in `CONTEXT-conversation-types.md`. Administrator setzt genau einen `Supervisor` je Berater; einer kann mehrere Berater begleiten. Sobald Berater einen Fall annimmt, hängt dieser `Supervisor` über vorhandenes `SessionSupervisor`/`addSupervisor` lesend an. Keine neue Zugriffsmechanik, nur dauerhafter Standard statt manuellem Schritt. **Rein ergänzend:** Ad-hoc-Hinzufügen US#302 unverändert. Verringert Abstimmungsaufwand bei Ausbildung/Coaching ohne Reichweite/Befugnis zu ändern.
2. **Kein Ersatz bei Nichtverfügbarkeit.** Bei Urlaub entfällt Supervision für diesen Fall. Kein automatischer Ersatz, keine Blockade der Beratung; Administrator kann Zuweisung jederzeit ändern.
3. **Grund `CLINICAL_OVERSIGHT`, nicht `TRAINING`**: laufende Aufsicht statt einzelner Schulungsanfrage.
4. **Einwilligung/Veto geklärt, verändert ursprüngliches Design.** *(Für dauerhafte Supervision durch den Nachtrag vom 2026-09-05 unten ersetzt: Dauerhafte Supervision ist immer aktiv, ohne Widerspruchsmöglichkeit für Klienten.)* Alle vier Gründe `PEER_SUPPORT`, `CLINICAL_OVERSIGHT`, `SAFEGUARDING_U25`, `TRAINING` verlassen binäres Einwilligung-ja/nein-Modell, das nur zwei klinische Gründe sperrte. Stattdessen **standardmäßig aktiver Klienten-Widerspruchsschalter** wie Fallübergabe (`ORISO-UserService/CONTEXT.md`, Widerspruchsmechanik): Systemnachricht im Chat, Standard AN, ab Umschalten wirksam, reversibel. Keine vorab blockierende Einwilligungsschranke. Ersetzt die ursprüngliche bloß passive Offenlegungsschalteridee durch aktive Widerspruchsmöglichkeit.

**Speicher, geklärt 2026-07-13:** Nullable Bit `is_supervision_opted_out` in `session`, Entity `Session.supervisionOptedOut`, Standard false. Liquibase `0066`, idempotent nach Muster `ADD COLUMN IF NOT EXISTS` aus `0056`. Sitzungsbezogen und abfragbar statt `session_supervisor.notes`, das je Supervisor gilt, oder unnötiger eigener Tabelle. Cluster mit `SPRING_LIQUIBASE_ENABLED=false`, etwa Dev-ConfigMap, brauchen manuelle Spaltenanlage wie Übergabetabellen `0057`.

**Umsetzung Punkt 4, Branch `feat/supervision-consent-opt-out`, TDD:** PENDING-Parken je Grund in `SessionSupervisorFacade.addSupervisor` entfernt. Jeder Grund erstellt sofort Nebenraum und Beobachtung. Neue Fassadenmethode `setSupervisionOptedOut(sessionId, optedOut)` und klientengeschütztes `POST /users/sessions/{id}/supervision/opt-out`: Widerspruch deaktiviert aktive Supervisoren und entfernt sie aus beiden Räumen. Rücknahme löscht nur Blockade, keine automatische Reaktivierung; ausdrücklich neu hinzufügen. Alte Endpunkte `.../consent`, `.../pending-consent` und `SecurityConfig`-Zuordnungen entfernt.

**Umsetzung Punkte 1–3, derselbe Branch, TDD:** `Consultant.assignedSupervisorId` mit Liquibase `0067`, idempotent ohne Fremdschlüssel. Gelöschter Supervisor bewirkt keine Anbindung, verhindert aber Löschung nicht. Getrennt von `is_supervisor`, der Fähigkeit Supervisor zu sein. `SessionSupervisorFacade.attachStandingSupervisorIfAssigned(sessionId, consultant)` bindet mit `CLINICAL_OVERSIGHT` an und ist **vertraglich best-effort, wirft niemals**. `AssignEnquiryFacade.assignEnquiry` nimmt bei Ausnahme gesamte Zuweisung zurück; Supervisionsfehler darf nur unbeaufsichtigten Fall ergeben, nie gesperrte Annahme. In `assignRegisteredEnquiry` nach Fall-Commit eingebunden, **nur registriert/Matrix**: Live-Chat `assignAnonymousEnquiry` außerhalb ADR-002-Supervision und ohne Beobachtungsraum. Admin setzt `UpdateAdminConsultantDTO.assignedSupervisorId`: Ziel vorhanden, `isSupervisor`, nicht selbst; leere Zeichenkette löscht.

**Noch offen:** Frontend-Widerspruchsschalter; Admin-Tabellenspalte bei fertigem Backend/DTO; automatische Anbindung bei **Neuzuweisung** über `AssignSessionFacade.assignSession` und Fallübernahme. Derzeit nur Anfrageannahme, daher kein neuer dauerhafter Supervisor bei Beraterwechsel; möglicherweise beabsichtigt, noch offen. Gründe-Endpunkt zeigt informatives `clientConsentRequired` weiter, um unabgestimmte Frontend-Vertragsänderung zu vermeiden.

**Weiter offen:** stellen-/trägerübergreifender Umfang und ausreichendes Audit/Aufbewahrung, unverändert übernommen.

## Nachtrag 2026-09-05: Dauerhafte Supervision bleibt immer aktiv — informieren, keine Widerspruchsmöglichkeit anbieten

**Entscheidung (Frank, Produkt, 2026-09-05).** Für **dauerhafte Supervision** („Supervision (automatisch zugewiesen)“, Entscheidungen 1–3 des Nachtrags vom 2026-07-13) wird **Punkt 4 jenes Nachtrags — die standardmäßig aktive, gegenüber Klienten angebotene Widerspruchsmöglichkeit — zurückgenommen.** Dauerhafte Supervision ist **immer aktiv und kann von Ratsuchenden nicht abgeschaltet werden.** Im Chat gibt es keinen Widerspruchsschalter und keine Ausstiegsklausel.

**Begründung.** Dauerhafte Supervision ist keine zusätzliche Offenlegung von Beratungsinhalten gegenüber einem neuen Empfängerkreis, sondern Teil der Arbeitsweise der Beratungsstelle. Die supervidierende Person ist eine ausgebildete Fachkraft **derselben Beratungsstelle**, liest **nur mit**, schreibt niemals in den Klientenraum und ist **für Ratsuchende unsichtbar**. Ein Schalter pro Sitzung würde das Produkt komplizierter machen als den abgebildeten Ablauf. Er würde Klienten erlauben, stillschweigend eine Qualitätssicherungsmaßnahme abzuschalten, für die die Beratungsstelle fachlich verantwortlich ist.

**Stattdessen: aktive Information im Chat.** Ratsuchende werden **durch eine Systemnachricht im eigenen Raum** informiert, spätestens wenn eine Beratungsperson ihre Anfrage angenommen hat — genau dann wird die dauerhafte Supervision angehängt (`AssignEnquiryFacade` → `SessionSupervisorFacade.attachStandingSupervisorIfAssigned`). Die Nachricht nennt nur die **Beratungsstelle**, niemals die supervidierende Person, und verweist auf die Datenschutzerklärung der Beratungsstelle. Betroffen sind nur Beratungsstellen mit konfigurierter dauerhafter Supervision; eine Sitzung ohne sie erhält keine Nachricht.

**Folgen.**

- Der bestehende Endpunkt `POST /users/sessions/{id}/supervision/opt-out` wird **nicht in der Oberfläche angeboten**. Backend-Endpunkt, `Session.supervisionOptedOut` und Liquibase-Spalte bleiben vorerst bestehen. **Ihre Entfernung ist eine offene Folgeaufgabe**, im Supervisions-Epic erfasst und hier nicht entschieden.
- Die Widerspruchsmöglichkeit bei **Fallübergaben** (US#313) bleibt unverändert: weiterhin standardmäßig aktiv und für Klienten zugänglich. Nur die Supervisionsgründe verlassen dieses Modell.
- Umsetzungsticket: **ORISO-Frontend#1315** — „Ratsuchende werden im Chat darüber informiert, dass eine supervidierende Person mitliest (dauerhafte Supervision)“ (UserService stellt die Nachricht ein, Frontend zeigt und übersetzt sie), Unteraufgabe des Supervisions-Epics ORISO-Frontend#1299.
- Die genaue Formulierung bleibt wie in der ursprünglichen ADR **von der Freigabe durch den Datenschutzbeauftragten abhängig**.

**Offen für den Datenschutzbeauftragten.** Die Information bei Annahme erfolgt **nachdem** Ratsuchende ihre Anfrage bereits geschrieben haben — sie haben Inhalte offengelegt, bevor sie informiert wurden. Die erste Information muss deshalb weiterhin **in der Datenschutzerklärung der Beratungsstelle beim Eintritt in den Chat** stehen, wie der ursprüngliche Text von ADR-008 verlangt („Offenlegung über die Datenschutzerklärung und das Impressum der Beratungsstelle beim Chateintritt“). Ob eine Datenschutzerklärung am Einstieg zusammen mit einer Systemnachricht im Chat bei Annahme die Informationspflichten aus **§ 15 KDG / Art. 13 DSGVO** für dauerhafte Supervision erfüllt — und ob der Zeitpunkt früh genug ist — entscheidet der Datenschutzbeauftragte; diese ADR klärt das nicht.
