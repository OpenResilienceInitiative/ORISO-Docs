# ADR-020: Geplante Anrufe, sichere Einladungen und gemeinsamer Kontaktkalender

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

### 3. Gemeinsamer Einstieg für QR, kopierte Links, registrierte Benutzer und Gäste

Einladungs-URL/QR öffnet Route mit:

1. Serverprüfung von Einladung/Mandantenrichtlinie;
2. Anmeldung für bestehendes Konto;
3. Einmalidentität nur bei erlaubender Richtlinie;
4. vorhandenem Countdown bei zukünftigem Start;
5. Beitritt zum beschränkten Element-Call-Raum bei offener Sitzung.

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
