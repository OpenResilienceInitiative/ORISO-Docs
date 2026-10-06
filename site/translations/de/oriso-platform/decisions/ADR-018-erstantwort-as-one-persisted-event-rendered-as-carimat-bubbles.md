# ADR-018: Erstantwort — ein gespeichertes Ereignis als Carimat-Sprechblasenfolge, je Träger konfiguriert

- **Status:** Angenommen — Frank, 2026-07-30 (grill-with-docs-Sitzung)
- **Datum:** 2026-07-30
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** `CONTEXT-erstantwort-und-carimat.md` (Glossar), ADR-003 und `ADR-014-shared-legal-text-objects-multi-topic-agencies-topic-before-consent.md` (Fachbereichsrechtstexte, Thema vor Einwilligung), ADR-004/ADR-005 (Matrix/Megolm), ADR-008 (Mitleser), ADR-010 (Plattformfreigabeliste je Mandant, hier verschoben), `CONTEXT-conversation-types.md`, `ORISO-Frontend/CONTEXT.md` (Aktivitätszeitleiste), ORISO-Frontend #772
- **Anlass:** U25-Erstantwort weicht stark vom Plattformstandard ab: informell, ohne geschlechtsspezifische Bezeichnungen, Beratung per MAIL statt Chat, Offenlegung von Peerberatung/Supervision, ausdrückliche Bitte um keine personenbezogenen Daten und deshalb **keine** Einladung zur E-Mail-Angabe, dazu Notfallnummern. Björns Fragen an Janna vom 2026-07-24 betrafen Konfiguration je Beratungsstelle.

---

## Kontext

Mit Entfernung des Rocket.Chat-Transports aus ADR-004 entfiel das Senden der Erstantwort ohne Ersatz. Auf `origin/pre-dev` geprüft: `postWelcomeMessageIfConfigured`, `postFurtherStepsIfConfigured`, `FURTHER_STEPS` kommen in UserService `src/main` **nicht mehr vor**. `createEnquiryMessage` leitet immer an `createMatrixEnquiryMessage` weiter. Übrig blieb das Gerüst:

- **Konfiguration ohne Mechanik:** `welcomeMessage.sendWelcomeMessage` und `welcomeMessageText`, Freitext je Träger, Standard aus, nie gebautes Admin-Feld, sowie `sendFurtherStepsMessage`, Standard an, existieren, schalten aber nichts.
- **Renderer ohne Transport:** `FurtherSteps.tsx` rendert nur bei `alias.messageType === 'FURTHER_STEPS'`; kein Matrix-Pfad erzeugt `alias`. Frontend ruft weiterhin `/service/messages/...` auf; UserService auf `origin/pre-dev` hat keinen `PATCH /messages/{id}`. Pre-Dev-Manifeste enthalten kein `messageservice`-Deployment, aber `MESSAGE_SERVICE_API_URL` zeigt darauf. Beide Aufrufstellen verschlucken Fehler.

  Auf Pre-Dev am 2026-07-30 unter `api.oriso-dev.site` gemessen: `GET /service/messages/` antwortet **401 mit Bearer-Challenge**, wie Kontrolle `/service/users/data`; unbekannter Pfad antwortet 404. Pfad ist also entgegen früheren ADR-/Issue-Entwürfen *nicht* ungeroutet und *kein* SPA-Ersatz. Die Entwürfe schlossen aus ORISO-Helm, das **Pre-Dev nicht ausführt**. Kopf von `values-pre-dev.yaml`: Pre-Dev verwendet noch archiviertes ORISO-Kubernetes-Release, ORISO-Helm#110. Diese Falle bei Infrastrukturbehauptungen beachten. Ob authentifiziertes `PATCH` einen Handler erreicht, wurde nicht geprüft; keine Richtung annehmen.
- `TopicEntity.welcomeMessage` / `sendNextStepMessage` je Fachbereich haben **keinen Verbraucher**.

Carimat ist dagegen bereits in Pseudonym-/Datenschutzaufnahme vorhanden: Roboteravatar, Name, Untertitel über Sprechblase; Animation `TypingReveal`, `TypewriterText`; mehrere Sprechblasen als drei Atemkarten. Die einzige verbliebene Chat-Einwilligungskarte verwendet `role="dialog" aria-modal="true"` trotz Einbettung und sperrt den Eingabebereich. Das Versprechen „Erst danach dürfen unsere Berater_innen einen Chat mit ihnen starten“ **gilt**: Schranke aktiv bei `STATUS_EMPTY`/`STATUS_ENQUIRY`, bevor etwas gesendet oder angenommen wurde. Keine Serverprüfung von `dataPrivacyConfirmation`; das ist eine Härtungslücke bei Clientumgehung, keine falsche Aussage.

Einfach editierbaren Text je Stelle anzubieten würde Trägertext auf inaktive Mechanik setzen, zwei funktionierende Aktionen und formell/informell entfernen und verifizierbare Angaben zu Mitlesern, Form und Frist durch nicht prüfbare Texte ersetzen — ausgerechnet im Transparenznachweis nach §11 KDG.

## Entscheidung

1. **Erstantwort aus Bausteinen statt einem Text.** Fester Plattformkatalog von etwa 15 Einheiten mit Auslöser, Quelle (Plattformtext/Trägertext/abgeleitet), optionaler Aktion, Beratungsform und Schalter. Festen Text verwerfen, weil Trägeranpassung Release benötigt; freies Rich-Text-Feld verwerfen, weil Aktionen und verifizierbare Fakten verloren gehen.
2. **Genau ein freier Baustein.** „Freier Hinweis“ je Träger an fester Position als Ausweg für U25-Peerberatung. **Abgeleitete Bausteine niemals bearbeiten.** Systemwissen wird gerendert; Freitext kann Konfiguration widersprechen.
3. **Ein gespeichertes `[SYSTEM_NOTIFICATION]`-Ereignis mit versionierter strukturierter Nutzlast**, im Client als zeitversetzte Sprechblasen mit Tippanzeige. **Carimat ist Darstellungsidentität, kein Matrix-Konto.** Bot wäre zusätzlicher Megolm-Schlüsselhalter für besondere Daten nach §11 KDG ohne Schweigepflicht. Betreiber bekäme technischen Leseweg und Aussage ohne Datenabgabe fiele, oder Bot schriebe Klartext in verschlüsselten Raum. Beides unzulässig. Rein clientseitige Folge ebenfalls verworfen: kein **Nachweis** über Frist, Vertraulichkeit, Mitleser und Notfallnummern, den Aufsicht bei Minderjährigen verlangt.
4. **Wortlaut eingefroren, Zustand aktuell.** Ereignis speichert aufgelösten Wortlaut, damit spätere Konfiguration Geschichte nicht überschreibt. Erledigung liest vorhandenen Zustand `displayName`, `dataPrivacyConfirmation`, `email`, 2FA über funktionierende Endpunkte. Bewusst: Baustein ohne anderweitig vorhandenen Erledigungszustand gehört nicht in Katalog. Teamzugriffs-Widerspruch aus `ORISO-UserService/CONTEXT.md` ist deshalb ausdrücklich **ausgeschlossen**, obwohl ähnlich.
5. **Reihenfolge Plattform, Inhalt Träger.** Auslöser Eintritt, nach erster Nachricht, nach Versand oder nach Zuweisung durch Plattform gesetzt. Einwilligung muss Datenübertragung vorausgehen; Träger dürfen dies nicht versehentlich umordnen.
6. **Redaktion am Träger; Auflösungskette sofort.** `Fachbereich ?? Beratungsstelle ?? Träger ?? Plattform` von Anfang an implementiert. Nur Träger erhält Admin-Formular; Zwischenebenen später als Oberfläche, nicht Migration. U25 eigener Träger, daher abgedeckt. Jeder Baustein erhält auf ja gesetztes Feld „plattformseitig erlaubt“; zweite Berechtigungsebene wie ADR-010 später. **Vorläufiger Schutz:** Sicherheitsbausteine „keine personenbezogenen Daten senden“ und Notfallnummern zunächst **ohne Schalter**.
7. **Plattformstimme durch Umformulierung geschlechtsneutral**, ohne Sondernotation. Trägerwahl der Schreibnotation verworfen: Anforderung vermeidet geschlechtsspezifische Begriffe; Notation × sieben Sprachen × formell/informell ist kombinatorisch und maschinell nicht sinnvoll übersetzbar, deutsche Notation hat keine Entsprechung in sechs anderen Sprachen. Jetzt alle Texte der Plattform selbst, die fortlaufend vom selben Absender gelesen werden; gemischte Notation wäre Widerspruch im Gespräch. Restliche Oberfläche separat. Behebt auch `Berater*in` gegenüber `Berater_innen`.
8. **Träger schreibt eine deutsche Variante**, nach bestehendem `languageFormal`; nur Plattformtexte beide Varianten. Übersetzung **optional**, maschinell unterstützt beim Veröffentlichen über Rechtstextmechanik. Fehlende Sprache fällt auf Original zurück, Englisch zweite Wahl. Sieben Pflichtsprachen verwerfen, da niemand veröffentlicht; nur Deutsch verwerfen, da U25-Kernaussagen bei nicht Deutsch sprechenden Ratsuchenden sonst verschwinden.
9. **Vorwärtssperre ja, Rückwärtssperre nein.** Eingabe bleibt bis Einwilligung blockiert; sichert Versprechen während Anfragephase vor Zuweisung. Serverprüfung von `dataPrivacyConfirmation` zusätzlich, begrenzt auf Wege ohne vorherige Stellenwahl; bei Beratungsstellenberatung Einwilligung bereits bei Registrierung nach ADR-014. Regressionstest sichert Ablauf gegen stille spätere Entfernung. Kein Baustein blockiert Zuweisung/Beraterantwort; E-Mail, 2FA und Zugangsdaten speichern bleiben freiwillig.
10. **Versandbestätigung reduziert:** bestätigt Versand ohne Frist, die nur noch einen Verantwortlichen hat. Schließt bei erster Sprechblase statt nach festen zehn Sekunden.
11. **Ein Eintrag in Aktivitätszeitleiste** für ganze Erstantwort, Ziel Chat. Bewusste Ausnahme im Filter gegen Systembenachrichtigungen. Ein Eintrag je offener Aktion verworfen: Person mit erster Nachricht zu Suizidgedanken soll nicht drei Aufgaben erhalten.

## Lieferumfang

Issue #772 wird **umgewidmet, nicht geschlossen**; enthält Beteiligten und laufendes Gespräch. **Erster Teil** unter neuem Epic: Bausteinfolge nur mit Plattformstandards, neutraler Wortlaut, reduzierte Bestätigung, ein Zeitleisteneintrag und Aktionen mit vorhandenem Zustand. **Kein Admin-Formular/Trägertext**, daher unabhängig von Jannas offenen Antworten zu Trägerinhalten.

Weitere Issues unter Epic:

- Admin-Formular und Trägertexte mit Rechtstexteditor und maschineller Übersetzung.
- Konto-vervollständigen-Baustein: Anzeigename und optionale E-Mail nach Anfrageversand.
- Chatsprechblase mit **allen** Varianten/Ausrichtungen in Storybook plus neuen Varianten. `FurtherSteps`, `SystemMessage`, `ReassignMessage`, `E2EEActivatedMessage`, Fallübergabe- und Carimat-Karten haben heute keine Stories.
- Admin-Karte für Anzeigename/optionale E-Mail als **erste** Karte unter Einstellungen/Berechtigungen nach `CaseHandoverCard`. Auch „Login-Funktion“-Karte korrigieren, deren Beschreibung nicht vorhandenes Verhalten verspricht.
- Zugangsdaten speichern: Browserdialog bei Registrierung reparieren (`name`-Attribute, Weiterleitung darf Dialog nicht abbrechen); nach Anfrage „Passwort jetzt setzen“, in Safari/Firefox/Chromium prüfen.
- `dataPrivacyConfirmation` serverseitig bei Zuweisung/Antwort durchsetzen.
- `handover.mdx` mit Code und Widerspruchsentscheidung vom 2026-07-06 abgleichen.

## Folgen

**Positiv:** Erster Teil ohne Jannas Antworten lieferbar; offene Trägertexte später. Kein neuer Schlüsselhalter, Zustand, Tabelle oder wiederbelebter MessageService. Aktionen verwenden funktionierende geroutete Endpunkte. Katalog macht U25-Texte ohne Release möglich; E-Mail-Einladung durch Schalter statt Textlöschung, Widerspruch zu Jannas Anforderung strukturell beseitigt.

**Aufwand:** Struktur braucht Versionierung gegen falsche Darstellung alter Ereignisse. Fremder Matrix-Client zeigt JSON statt Sprechblasen. Neutrale Umformulierung echte Redaktion statt Suchen/Ersetzen und weniger lebendig. Etwa 15 Bausteine in mehreren Sprachen sind erheblicher Textumfang. Zeitleistenfilterausnahme und Server-Einwilligungsprüfung neue Backend-Arbeit, bisher nicht in #772.

**Gefunden, hier nicht entschieden:** **Wiederherstellungslücke** ohne E-Mail und ohne erneut sichtbares generiertes 16-Zeichen-Passwort ist Folge der Anonymität, kein Fehler, aber nirgends dokumentiert und fehlt in `edge-cases.mdx`. Uninformative Zurücksetzungsantwort ist **bewusster Schutz vor Kontenermittlung** und bleibt. Möglicher Wiederherstellungscode bei Registrierung nach Matrix-Schlüsselmodell; alternativ keine Wiederherstellung und Zugangsdaten speichern als Abhilfe. Eigener Entscheidungsnachweis erforderlich. Speichern in Safari/Firefox/Chromium **prüfen**: Credential Management API nur Chromium; `preventDefault()`, XHR und harte `window.location.href`-Weiterleitung sind keine von Safari/Firefox erkannte Formularübermittlung. Separat beschreibt `handover.mdx` §4.7.3/§4.7.7 nicht vorhandene Chat-Einwilligungsbuttons und liegt vor Widerspruchsentscheidung vom 2026-07-06. Zwei angenommene ADRs tragen außerdem **014**.
