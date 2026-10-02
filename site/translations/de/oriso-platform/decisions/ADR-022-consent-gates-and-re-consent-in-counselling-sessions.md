# ADR-022: Zwei Einwilligungsschranken, Sitzungsverweis als Einwilligungszustand und erneute Einwilligung bei Änderung

- **Status:** Angenommen — Frank, 2026-08-16 (grill-with-docs-Sitzung)
- **Datum:** 2026-08-16
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** `ADR-021` (Dokumente, zuerst lesen); `ADR-014` (Thema vor Einwilligung); `ADR-007` (Verfügbarkeit, Warteraum getrennt davon); `ADR-023` (Plattform/Träger); ORISO-UserService #927 (anonyme Einwilligungsschranke); `CONTEXT-legal-documents.md`
- **Umfang:** Sitzungen mit **Ratsuchenden**: 1:1, Live-Chat, Selbsthilfegruppe. Interne Räume, Supervision ADR-008 und Team-Besprechung ADR-016, ohne Ratsuchende benötigen keine Schranke.

---

## Kontext

Live-Chat hat zwei rechtlich getrennte Phasen. Vermischung verursachte scheinbare Frontend-Fehler.

**Phase 1 — Warteraum.** Anzeigename erzeugen, Thema wählen, warten. Praktisch nichts gespeichert außer Cookie und temporärem Passwort. Keine Beratungsstelle zugeordnet, daher kein Stellendokument. Es gilt Plattformrichtlinie, weil Verarbeitung beim Öffnen beginnt: IP, Cookies, Namenserzeugung, Thema, wie bei allgemeinen Websitebesuchern vor Registrierung. „Warteraum beitreten“ bestätigt dies. Verlassen hinterlässt nichts.

**Phase 2 — Berater nimmt an.** Erst jetzt Zuordnung zur Stelle mit eigener Datenschutzerklärung/Impressum. Erklärung vor Gesprächsbeginn bestätigen.

Anonymität folgt aus **unveränderlichem Anzeigenamen und erzeugtem Passwort**, nicht Chatinhalt. Solange Name nicht bearbeitbar, kann DSFA Anonymität **bis zum Chateintritt** angeben. Später geschriebener Inhalt liegt außerhalb Plattformkontrolle und bewusst nicht in ihrer Zuständigkeit.

### Gemessener Stand (2026-08-16, `origin/pre-dev`)

- `CreateUserFacade:303–304` setzt `dataPrivacyConfirmation` und `termsAndConditionsConfirmation` bei anonymem Konto bewusst null. **Richtig** in Phase 1 ohne Stellendokument, wiederholt falsch als Fehler gelesen.
- Veraltung durch Benutzerzeitstempel gegen `tenant.contentPrivacyActivationDate`, mandantenweiter Tag ohne Dokument-/Versionsbezug.
- `TermsAndConditions.tsx` unterdrückt Aktualisierungsdialog über `isAnonymousAsker`, prüft `userName.startsWith('Anonymous-')`. Namen wie `anon_8` passen nicht, Dialog erscheint im Warteraum ohne aktualisierbares Dokument. WEITER sendet keinen Aufruf; Sackgasse auch für registrierte Benutzer.
- `isDisplayNameEditable` **Trägereinstellung**, `false` für beide Kontotypen, kein Anonymitätsnachweis einzelner Konten.
- `Session` ohne Einwilligungsfeld.
- `AnonymousEnquiryConsentGuard` sperrt Zuweisung auf `origin/pre-dev`; fehlt nur in veraltetem Detached-HEAD-Checkout, daher scheinbar lokal nicht vorhanden.
- `AnonymousConsentGate` rendert `consentLabelHtml` mit `dangerouslySetInnerHTML` **ohne Bereinigung**. Bei i18n harmlos, bei Trägertext echte Lücke.
- `CreateSessionFacade` kennt `ONE_SESSION_PER_CONSULTING_TYPE`, an allen drei Stellen aktiv, und `ONE_SESSION_PER_TOPIC_ID_AND_AGENCY_ID`, implementiert als `checkIfAlreadyRegisteredToTopicAndSameAgency`, **nie übergeben**. Kein zweites Gespräch gleichen Themas bei *anderer* Stelle, daher zweites Konto nötig.

## Entscheidung

1. **Genau zwei Schranken, keine dritte.**
   - **Schranke 1, Warteraumeintritt:** Plattformrichtlinie oder bei aufgelöstem Träger dessen Ersatz nach ADR-021 Punkt 2. Ein Dokument, eine Zustimmung.
   - **Schranke 2, im Raum vor erster Nachricht:** Stellen-/Fachbereichsdokument. `AnonymousConsentGate` ist diese Schranke; #927 **ist** Stufe 2, keine zusätzliche. Innerhalb Raum statt davor sachlich gleich, serverseitig durch `AnonymousEnquiryConsentGuard` geschützt.
2. **Einwilligung als Sitzungsverweis statt Protokoll.** `session` erhält nullable `consented_legal_version_id` auf freigegebene Rechtstextversion. Bei erneuter Einwilligung **überschrieben**, keine anhängende Historie, Benutzer-Audit oder Verhaltensaufzeichnung. Ziel öffentliches Dokument, keine neue personenbezogene Kategorie. Nach ADR-021 Punkt 4 deckt gleicher Verweis Erklärung und Satz ab.
3. **Beleg über Veröffentlichungshistorie, nicht Benutzerprotokoll.** Wortlaut und Geltungszeit aus ADR-021 Punkt 3. Ohne Schranke kein Fortschritt, daher Zustimmung zum aktuellen Text. Verpflichtung bei Träger/Stelle, nicht Aufzeichnung anonymer Personen. Punkt 2 nur **Ablaufsteuerung** zum Öffnen der Eingabe, nicht Nachweis.
4. **Änderung im Chat melden; Weiterschreiben ist Zustimmung.** Neue Version erzeugt Systemnachricht in betroffenen Räumen mit dauerhaftem Link und klarem Hinweis: Fortsetzung bedeutet Zustimmung; sonst aufhören. Verlauf nie sperren, da Beratungsprotokollverschließen unverantwortlich wäre.
5. **Wesentliche Änderung verlangt ausdrückliche Handlung.** Veröffentlicher setzt je Version **neue Einwilligung erforderlich**, Standard aus. Aus: Punkt 4. An: gleiche Nachricht mit Ja/Nein, sperrt *Senden* bis Antwort, vorhandenes Muster nutzen. Informationspflicht für Wortlaut/Adressen/Klarstellungen erlaubt Fortsetzung, aber **Umfang/Rechtsgrundlage** wie neue Datenkategorie, Empfänger, Analyse nicht. DSGVO Art. 4(11) verlangt eindeutige bestätigende Handlung; Beratungsdaten Art. 9. Nur veröffentlichende Stelle kann dies bewerten und Flag setzen.
6. **Mehrere Stellen mit einem Konto.** `ONE_SESSION_PER_TOPIC_ID_AND_AGENCY_ID` statt `ONE_SESSION_PER_CONSULTING_TYPE` aktivieren. Zweites Konto beschädigt Anonymitätsaussage, Statistik und Aufbewahrung.
7. **Gleiches Thema Hinweis statt Sperre.** Zweite Sitzung zum bereits offenen Thema erzeugt freundliche Nachricht im **älteren** Chat. Andere Stelle/Zeitpunkt nicht nennen, Anonymität bleibt; Berater versteht und kann fragen. Nachrangig, kein Blocker für Punkt 6.

## Folgen

**Positiv:** Warteraum ohne Stelle hat nichts zu aktualisieren, Fehlerklasse entfällt. Keine geratenen Anonymitätsprüfungen. Zwei Stellen haben unabhängige Einwilligungszustände; Änderung stört anderen nicht. Zweitkontoumweg entfällt. Datenminimierung ohne Benutzerhistorie.

**Negativ / Aufwand:** Nullable Spalte und Schreibpfad, Chatnachricht/Ja-Nein-Zweig. Feinerer Sitzungsfilter erlaubt parallele Beratung gleichen Themas, fachliche statt Datenmodellfrage. Themenhinweis braucht Ereignis-/Benachrichtigungsmechanik, Machbarkeit vor Ticketanlage prüfen.

**Verbindliche Voraussetzung:** `AnonymousConsentGate` vor Trägertext durch Bereinigung in `LegalContentRenderer` führen. Schranke 2 nicht mit unbereinigtem `dangerouslySetInnerHTML` ausliefern.

## Erwogene Alternativen

- **Anonymität im Frontend erkennen und Dialog unterdrücken.** Falsche Bedingung, verworfen. Relevant ist bestehende Stellenzuordnung, ohne Anonymitätsprüfung.
- **Phase-1-Zustimmung bei Kontoanlage in `dataPrivacyConfirmation` speichern.** Würde veralteten Vergleich erfüllen und Schranke 2 *überspringen*, schlimmer als Fehler.
- **Benutzer-Einwilligungsereignisse mit Version/Zeit speichern.** Verhaltensdaten anonymer Personen ohne Mehrwert gegenüber Veröffentlichungshistorie. Nur nötiger Zustand aus Punkt 2.
- **Jede Änderung Ja/Nein.** Jeder Tippfehler löst Zustimmungswelle aus, verworfen.
- **Zweite Sitzung gleichen Themas sperren.** Erzeugt datenschutzseitig ungünstigste Zweitkonten, verworfen.
