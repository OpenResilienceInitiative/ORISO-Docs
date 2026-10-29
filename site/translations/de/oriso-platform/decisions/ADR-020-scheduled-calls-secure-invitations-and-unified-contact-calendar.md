# ADR-020: Geplante Anrufe, sichere Einladungen und gemeinsamer Kontaktkalender

> **Geändert durch ADR-029** (`ADR-029-direct-links-knock-first-admission-and-temporary-accounts.md`, 27.10.2026): §2 Einlass und Identität des Einmalgasts, §3 Schritt 3, §7.
>
> **Geändert am 28.10.2026** (siehe [Änderung 2026-10-28](#änderung-2026-10-28--zuerst-anklopfen-und-der-beitrittsweg-des-anrufgasts) am Ende): Ein gültiger Link führt nicht mehr direkt hinein — jeder Link klopft zuerst an; die Träger-Anrufrichtlinie in §2 ist durch die Berechtigung „Direkteinladung erlauben“ ersetzt; ein Anrufgast tritt nur dem Anrufraum bei. Nicht zu verwechseln mit **ADR-020 in ORISO-Frontend**, das E-Mail-Vorlagen behandelt.

- **Status:** Angenommen — 2026-08-12
- **Datum:** 2026-08-12
- **Entscheider:** Frank (Produkt) und Architekturverfeinerungssitzung
- **Verwandt:** ADR-006 (gespeicherte Beratungsform), ADR-012 (Gruppentermine/Zukunftszeitleiste), ADR-018 in ORISO-Frontend (Element-Call-Matryoshka-Integration), ORISO-Frontend#974
- **Umsetzungstracker:** `OpenResilienceInitiative/ORISO-Frontend#974`

## Kontext

ORISO kann bereits Termine anlegen, Gruppentermine in Kalender exportieren, Warteraum-Countdown anzeigen und verschlüsselte Element-Call-Räume starten. Das ergibt noch kein zusammenhängendes Produkt:

- Audio/Video nicht durchgängig als geplante Kontakte anbietbar;
- Terminübersicht Liste statt hilfreichem Kalender;
- Zukünftige Termine/Gruppentermine einfaches ausklappbares Panel statt navigierbarer Zeitleiste;
- fehlendes Teilen im Anruf nicht als einfache Raum-URL sicher umsetzbar, da Räume beschränkt und Gäste verboten;
- Registrierung, Anmeldung, QR-Einstieg, Teilnehmerauswahl und Warteraum vorhanden, aber nicht zu einem Anrufablauf kombiniert;
- Verfügbarkeit nur grobes Abwesenheitsflag; Terminplanung braucht Zeiträume und eindeutige Konfliktbehandlung.

Mehrere Kontaktarten unterstützen statt reinem Videokalender. Verschlüsselte Matrix-/Element-Call-Architektur erhalten; Anrufteilnahme gewährt keinen Zugriff auf ursprüngliches Beratungsgespräch.

## Entscheidung

### 1. Termin, Anrufsitzung und Einladung trennen

**Termin** ist geplanter Kontakt mit Lebenszyklus. **Anrufsitzung** ist Audio-/Videoraum zur Laufzeit, erstellt bei Start durch Berater. **Anrufeinladung** gewährt einer Identität Zugriff auf genau eine Sitzung.

Geplante/spontane Anrufe verwenden dasselbe Modell. Planung erzeugt keinen langlebigen Matrix-Raum. Termin verweist auf Ursprungsgespräch und Teilnehmer; beschränkter verschlüsselter Raum entsteht bei Anrufstart.

### 2. Anrufzugriff als serverseitig durchgesetzte Mandantenrichtlinie

Jeder Mandant wählt in Admin:

- `REGISTERED_ONLY`: alle Teilnehmer als registrierte ORISO-Benutzer anmelden;
- `REGISTERED_OR_ONE_TIME_GUEST`: registrierte Benutzer bevorzugt, Berater darf Einmalgast einladen.

`REGISTERED_ONLY` sicherer Standard. Backend autorisiert Erstellung/Einlösung; versteckter Frontend-Button ist keine Durchsetzung.

Registrierte Teilnehmer über kompakte wiederverwendbare Benutzerauswahl. Mitgliedschaft ausschließlich im eigenen Anrufraum, nie im Fall-/Chatraum.

Einmalgast durchläuft modulare Identitätsansicht aus vorhandenem Registrierungs-/Anmeldeablauf. Kurzlebige Identität an Einladung und Anrufsitzung gebunden. Wiederverbinden während Anruf möglich, Ablauf bei Ende, Widerruf durch berechtigten Berater. Tokens gehasht gespeichert; Audit enthält kein nutzbares Secret.

Alle Ein-/Austritte sichtbar. Erste Entscheidung ohne individuelle Warteraumfreigabe: gültige angemeldete oder Einmalidentität tritt direkt ein.

> **Ersetzt am 28.10.2026:** Eine gültige Identität tritt nicht mehr direkt ein. Jeder Link klopft zuerst an, und die Beratungsperson lässt jede Person ein (ADR-029 §2 und seine Änderung). Die beiden Träger-Richtlinien oben sind durch die Berechtigung „Direkteinladung erlauben“ ersetzt (ADR-029 §6 und seine Änderung). Siehe die Änderung am Ende dieses Dokuments.

### 3. Gemeinsamer Einstieg für QR, kopierte Links, registrierte Benutzer und Gäste

Einladungs-URL/QR öffnet Route mit:

1. Serverprüfung von Einladung/Mandantenrichtlinie;
2. Anmeldung für bestehendes Konto;
3. Einmalidentität nur bei erlaubender Richtlinie;
4. vorhandenem Countdown bei zukünftigem Start;
5. Beitritt zum beschränkten Element-Call-Raum bei offener Sitzung.

> **Geändert am 28.10.2026:** Schritt 3 lautet jetzt „bietet ein temporäres Konto (ADR-029 §3) nur an, wenn die wirksame Berechtigung ‚Direkteinladung erlauben‘ es zulässt“, und vor Schritt 5 kommt ein Anklopfschritt: Die Person wartet, bis die Beratungsperson sie einlässt. Siehe die Änderung am Ende dieses Dokuments.

Modulares Overlay oder vorgelagerte Ansicht statt zweiter Registrierung.

### 4. Gemeinsamer Kontaktkalender aller Beratungsformen

**Termine/Bookings** wird gemeinsamer **Kontaktkalender** für:

- gewöhnliche Termine;
- geplante Audioanrufe;
- geplante Videoanrufe;
- wiederkehrende/einmalige Gruppentermine.

Berater sehen Navigation immer. Ratsuchende erst bei relevantem Termin; Selbstbuchung beginnt im zugehörigen Gespräch.

Berater erstellen/schlagen Termine vor. Ratsuchende wählen freien Zeitraum aus Gespräch. Persönlicher **Vorlauf für automatische Bestätigung** steuert:

- Anfrage mindestens konfigurierten Zeitraum vor Beginn automatisch bestätigt;
- innerhalb des Zeitfensters Beraterfreigabe;
- bestätigter Termin wird durch Zeitablauf nicht nachträglich genehmigungspflichtig.

Kalender serverseitige Leseprojektion statt Frontend-Verknüpfung unabhängiger APIs. Einträge mit stabiler ID, Zeitraum, Beratungsform, Status, Ursprungsverweis, erlaubten Aktionen und vertraulichkeitsverträglichen Anzeigedaten.

### 5. Verfügbarkeitssperren und Konfliktfristen ausdrücklich modellieren

Berater legen **Verfügbarkeitssperren** als Zeiträume oder ganztägige Abwesenheit an. Überschneidung mit bestätigten Terminen nach Warnung speicherbar, erzeugt ausdrückliche Konflikte.

Betroffene Termine bis zum früheren Zeitpunkt klären:

- Sperranlage plus persönliche **Konfliktklärungsfrist**;
- Terminbeginn minus 15 Minuten.

Unter **Profil → Termineinstellungen**, Standard eine Woche, mindestens 15 Minuten. Erste Konfliktsperre kann Bestätigung/Änderung der Frist anfragen. Ungeklärte Konflikte bei effektiver Frist automatisch absagen, mit normaler Teilnehmerbenachrichtigung und nachvollziehbarem Grund.

### 6. Gesprächsprojektion als echte Zukunftszeitleiste

Gesprächsliste an **Jetzt** / letztem vergangenen Ereignis verankert. Verschiebbarer Trenner zeigt Zukunft darunter; Kopf zeigt Datum/Abstand zu heute. Tastatur und ausdrückliche Buttons bieten dieselbe Funktion.

Termine und Gruppentermine verwenden gemeinsame typisierte Zukunftskarte/Sitzungskomponente. Begrenztes Laden aus ADR-012 bleibt; keine unbegrenzte Zukunft materialisieren. Auch Benutzer nur mit Terminen, ohne Gruppenserie, sehen Projektion.

### 7. Dauerhafte Einstiegslinks von Anrufeinladungen trennen

Drei dauerhafte Zwecke:

- **Gesprächslink:** beginnt/öffnet Gespräch;
- **Videoterminlink:** öffnet Videoterminbuchung;
- **Smart Link:** Gespräch oder Audio-/Videotermin nach Mandanten-/Beratereinstellungen.

Dauerlink nie direkter Raumzugriff. Direkte Einladung nur für laufende Sitzung, identitätsgebunden und widerrufbar nach obigen Regeln.

> **Geändert am 28.10.2026:** Dauerhafte Anruflinks gibt es jetzt (ADR-029 §1). Der Satz „ein Dauerlink gewährt nie direkten Zugang zu einem laufenden Raum“ gilt weiter, aber aus einem neuen Grund: Jeder Link klopft zuerst an, und erst der Einlass durch die Beratungsperson gewährt einen Platz im Anrufraum. Siehe die Änderung am Ende dieses Dokuments.

### 8. Versionierte Anrufzeit-Voreinstellungen

Code-definierte **Anrufzeit-Voreinstellungen** als versionierte Aktionsfolge relativ zum geplanten Ende: visuelle Warnung, hörbare Eskalation, optional endgültiges Ende. Hartes Ende davor oder zum Terminende möglich; Produktstandard separat gewählt, nicht durch ADR festgelegt.

Persönlicher Standard unter **Profil → Termineinstellungen**. Laufender Element-Anruf bietet **Erinnerung** zur Überschreibung für Sitzung. Mandanten dürfen Auswahl einschränken, keine freien Zeitskripte schreiben.

### 9. Vertraulichkeit externer Kalenderdaten

ICS, Google Calendar, Outlook, E-Mail und Push ohne Beratungsthema, sensible Kategorie, Falltext oder unnötiges Anbieterbranding. Neutrale Termintexte und authentifizierter ORISO-Einstieg.

## Zuständigkeiten der fachlichen Bereiche

| Bereich | Zuständig |
|---|---|
| Termine, Verfügbarkeit, Sperren, Konflikte, Kalenderprojektion | ORISO-UserService an ORISO-Grenze, AppointmentService nach Bedarf |
| Mandanten-Zugriffsrichtlinie und erlaubte Zeitvoreinstellungen | ORISO-TenantService |
| Richtlinienoberfläche | ORISO-Admin |
| Kalender, Zukunft, Einstieg, Teilnehmerauswahl, Erinnerungen | ORISO-Frontend |
| Raumbegrenzte Mitgliedschaft und kurzlebige Matrix-Identitäten | ORISO-UserService mit Matrix-/Keycloak-Adaptern |

Kein reines Frontend-Flag entscheidet Anrufzugriff.

## Erwogene Optionen (verworfen)

- Bestehenden beschränkten Raumlink unverändert teilen.
- Öffentlicher Raum oder unbegrenzte Matrix-Gäste.
- Reiner Videokalender neben Terminen.
- Dauerhaften Raum für jeden Zukunftstermin vorerstellen.
- Eigenes Registrierungsformular in Element Call.
- Frontend als maßgebliche Kombination von Terminen, Gruppenterminen, Abwesenheit, Berechtigungen.
- Abwesenheit nur boolesch oder Konflikttermine still löschen.
- Freie Regelmaschine für Anrufende je Mandant.

## Folgen

**Positiv:** Ein Modell für spontane/geplante Anrufe, registrierte/erlaubte Gäste, alle Kontaktformen und beide Kalenderansichten. Bestehende Registrierung, Auswahl, Warteraum, Timer, Gruppen- und Element-Call-Komponenten wiederverwendbar. Sicherer als Raum-URL, zentral durchsetzbar.

**Aufwand / Risiko:** Vier Repositories und externer AppointmentService. Kurzlebige Identitäten brauchen Bereinigung/Audit. Projektion, Fristen, Benachrichtigungen und endgültiges Ende brauchen idempotente Serverjobs. Verschiebbare Zeitleiste braucht barrierefreie/mobile Alternativen und echte Geräteprüfung.

## Erforderliche Implementierungsteile

1. Verträge/Migrationen für Zugriff, Linkzwecke, Termine/Formen, Sperren, Konfliktfristen, Voreinstellungs-IDs, Kalender-Lesemodell.
2. Backend-Autorisierung: registrierte Einladung, Einmalidentität ausstellen/einlösen/widerrufen, Raummitgliedschaft, Ablauf, Audit, Bereinigung.
3. Admin: sichere Standards, Mandantenwahl, Voreinstellungsfreigabeliste, Prüfung, Audit-Sichtbarkeit.
4. Frontend in Storybook: responsiver Kalender, Ereigniskarte, Teilnehmerdialog, modulare Identitätsansicht, Warte-/Countdown-Zustände, Erinnerung, barrierefreier Zukunftstrenner.
5. Termine/Selbstbuchung: Vorschlag, gesprächsbezogene Buchung, Vorlaufgenehmigung, Sperren, Konflikte, Benachrichtigungen.
6. Element Call: geplant/spontan starten, Eintritt, Wiederverbinden, Widerruf, Ein-/Austritt, Zeiteskalation, optional hartes Ende.
7. Dauerlinkzwecke und Smart-Link-Einstieg.
8. Browserabnahme mobil/Desktop: bidirektionales Audio/Video zu zweit, Ablehnung nur registrierter Zugriffe, erlaubter Gast, Raumisolation, Kalender, Zukunftsnavigation, Wiederverbinden/Widerruf, Fristjobs.

Jeder Teil unabhängig prüfbar mit zuerst fehlschlagenden, dann erfolgreichen Tests, Repository-Qualitätsprüfungen, Vertrags-/Integrationstests, Storybook-Review und Playwright. Erfolgreicher UI-Test oder vorerstellter Raum belegt keine Medienübertragung; Anrufabnahme braucht bidirektionales entferntes Audio/Video.

## Änderung 2026-10-28 — zuerst anklopfen, und der Beitrittsweg des Anrufgasts

- **Status:** Vom Product Owner angenommen — Frank, 28.10.2026. Technisches Backend-Review (Machbarkeit mit Keycloak/Matrix) offen.
- **Ändert:** §2 (Einlass, Träger-Richtlinie), §3 Schritt 3 und den Schritt vor Schritt 5, §7, Implementierungsteile 2, 3, 6 und 8. Der Rest dieses Dokuments bleibt unverändert.
- **Issues:** [ORISO-Docs#231](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/231), [ORISO-UserService#1477](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1477), [ORISO-Frontend#1794](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1794), [ORISO-Frontend#1387](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1387), Epic [ORISO-Frontend#974](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/974)
- **Namensgleichheit:** Dies ist das **Plattform**-ADR-020 (Anrufe). ORISO-Frontend hat ein eigenes ADR-020 über E-Mail-Vorlagen; es ist nicht betroffen.

### A. Zuerst anklopfen (entschieden in ADR-029)

§2, §3 und §7 gelten mit diesen Änderungen. Die Entscheidungen selbst stehen in [ADR-029](ADR-029-direct-links-knock-first-admission-and-temporary-accounts.md) (§2, §3, §6 und seine Änderung 2026-10-28); hier sind sie nur verlinkt.

- **§2 Einlass.** „Eine gültige angemeldete oder Einmalidentität tritt direkt ein“ gilt nicht mehr. Jede Person, die über einen Link kommt, klopft an und wartet, bis die Beratungsperson sie einlässt; der Einlass gilt dann für dieses Gespräch.
- **§2 Richtlinie.** `REGISTERED_ONLY` / `REGISTERED_OR_ONE_TIME_GUEST` sind durch die Berechtigung „Direkteinladung erlauben“ ersetzt. Ein „Einmalgast“ ist ein temporäres Konto mit Benutzername und Passwort.
- **§3.** Schritt 3 bietet ein temporäres Konto nur an, wenn die wirksame Berechtigung es zulässt. Zwischen Schritt 4 und 5 klopft die Person an und wartet auf den Einlass; Schritt 5 tritt erst nach dem Einlass bei.
- **§7.** Ein Dauerlink gewährt weiterhin nie direkten Zugang zu einem laufenden Raum — jetzt, weil der Einlass und nicht der Link den Platz gewährt.
- **Implementierungsteile.** Teil 2 „Ausgabe von Einmalidentitäten“ meint temporäre Konten (ADR-029 §3); Teil 3 „Auswahl der Träger-Richtlinie“ meint die Berechtigung „Direkteinladung erlauben“; Teil 6 „direkter Eintritt“ meint den Eintritt nach dem Einlass; Teil 8 „erlaubter Gast“ meint ein temporäres Konto, das nach dem Einlass eintritt.

### B. Der Anrufgast tritt nur dem Anrufraum bei (hier entschieden)

Dieses Dokument ist der einzige Ort für diese Entscheidung; ADR-029 und die Issues verlinken hierher.

1. **Nur der Anrufraum.** Ein Gast, der in einen Anruf eingelassen wird, wird in den eigenen Anrufraum dieser Anrufsitzung eingeladen und in nichts sonst. Er wird nie Mitglied des Chatraums der Beratungsperson, des Falls oder eines anderen Raums. Damit gilt die Regel, die §2 schon für registrierte Teilnehmende festlegt, für alle, die über einen Link kommen.
2. **Der Einlass ist die Einladung.** Erst das Einlassen des Gasts erzeugt seine Mitgliedschaft im Anrufraum. Die Beitrittsregel `restricted` des Anrufraums kann ihn nicht von selbst zulassen, weil ihre Erlaubnisliste der Quellraum ist und der Gast dort kein Mitglied ist. Option A aus [ORISO-Frontend#1387](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1387) (den Gast zuerst in den Quellraum führen) ist daher ausgeschlossen. Das Backend prüft Berechtigung und Einlass; einen Knopf auszublenden ist keine Durchsetzung.
3. **Die Rechte enden mit dem Anruf.** Wenn die Anrufsitzung endet, verliert der Gast den Zugang zum Anrufraum und kann weder erneut beitreten noch ihn danach lesen. Ein temporäres Konto wird dann nach dem Zeitplan in ADR-029 §4 gelöscht.
4. **Ein eigener Beitrittsweg für Gäste.** Der heutige Beitrittsweg weist jeden ab, der nicht Mitglied des Quellraums ist, und gibt den Platz im Anrufraum zurück (angesprochen in [ORISO-Frontend#1794](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1794)). Dieser Schutz bleibt für normale Teilnehmende. Gäste bekommen einen zweiten, ausdrücklichen Weg.

**Vorgeschlagener Mechanismus** — wie umgesetzt in [ORISO-UserService#1485](https://github.com/OpenResilienceInitiative/ORISO-UserService/pull/1485) ([ORISO-UserService#1477](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1477)), vorbehaltlich des Backend-Reviews. Das ist Option B aus ORISO-Frontend#1387:

- Bei „Einlassen“ lädt UserService den Gast nur in den beschränkten Anrufraum ein und handelt dabei als die einlassende Beratungsperson (Login-as-Token). Kein neues Servicekonto.
- Jeder Einlass wird pro Anruf festgehalten (Tabelle `matrix_call_guest`).
- Die Anrufrichtlinie und das Lesen des Anrufzustands behandeln einen nicht widerrufenen Gast des laufenden Anrufs als berechtigt, ohne Mitgliedschaft im Quellraum. Die Prüfung ist an diesen Anruf gebunden, nicht nur an den Quellraum.
- Am Anrufende entfernt UserService den Gast aus dem Anrufraum und löscht seinen Power-Level-Eintrag. Eine fehlgeschlagene Entfernung wird von einem Aufräumlauf wiederholt.
- Gäste zählen nicht für Beginn oder Ende des Anrufs.

**Warum hier und nicht in einem ADR-018.** Das Plattform-ADR-018 behandelt die Erstantwort und hat mit Anrufen nichts zu tun. Das ADR-018 von ORISO-Frontend behandelt die Einbettung von Element Call als Widget; es sagt, dass der Host dem Anrufraum beitritt, bevor das Widget eingebunden wird, aber nicht, wer Mitglied werden darf. Die Raummitgliedschaft bei Anrufen ist eine Regel der Anrufsitzung, und das ist dieses Dokument.
