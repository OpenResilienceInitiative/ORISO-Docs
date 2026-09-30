# ADR-014: Gemeinsam nutzbare Rechtstextobjekte, mehrere Themen je Beratungsstelle und Themenwahl vor Einwilligung

- **Status:** Angenommen — Frank, 2026-07-16 (grill-with-docs-Sitzung)
- **Datum:** 2026-07-16

> **Nummernkollision am 2026-08-08 behoben (ORISO-Docs#73).** Ein zweiter angenommener ADR trug ebenfalls 014: Medienprüfung über Matrix-Content-Scanner. Die spätere Entscheidung vom 2026-07-18 wurde **ADR-019**. Dieser Eintrag behält 014. „ADR-014“ bedeutet jetzt eindeutig gemeinsame Rechtstextobjekte und Themenwahl vor Einwilligung.

> **Am 2026-08-16 durch `ADR-021` erweitert.** Nichts wird umgekehrt. ADR-021 ergänzt die hier fehlende **Plattformebene über dem Träger**, **allgemeine Versionshistorie** für Rechtstexte, heute nur für AVV vorhanden, und **Einwilligungssatz als Feld der Datenschutzerklärung**. Themenwahl vor Einwilligung bleibt gültig und ermöglicht überhaupt die Fachbereichsdokumentauflösung an Schranke 2 aus `ADR-022`.

- **Entscheider:** Frank und KI
- **Verwandt:** `ADR-003` (Fachbereich = eindeutige Beratungsstelle × Thema, **teilweise hierdurch ersetzt**); `ADR-021` (Hierarchie, Versionierung, Einwilligungstext, erweitert diesen Eintrag); `ADR-022` (Einwilligungsschranken); `ADR-009` (globale Themenzuständigkeit); `CONTEXT-topics-categories-departments.md`; `CONTEXT-domain-caritas-diakonie-online-counselling.md` (Organisation→Mandant); QDL-Epic ORISO-Frontend#181 (QR-Codes und Direktlinks)

---

## Kontext

ADR-003 machte Fachbereich = eindeutige Kombination (agency_id, topic_id) korrekt zum Träger eigener Rechtstexte. Zwei Implementierungsentscheidungen verletzten aber das benötigte Fachmodell:

1. **Einfache Themenauswahl in Admin**, ADR-003 Entscheidung 3, geliefert als ORISO-Admin PR #244, erzwingt ein Thema je Beratungsstelle. Echte Stellen enthalten mehrere eigenständige Fachbereiche. Eine Datenzeile je Thema würde dieselbe reale Stelle vervielfachen, dieselbe Adresse mehrfach pflegen und künftige Ressourcenverwaltung verfälschen. `UNIQUE(agency_id, topic_id)` verhindert nur dasselbe Thema zweimal, nicht mehrere Themen. QDL-Epic #181/#184 mit Themenbegrenzung auf `agency.topicIds` setzt dies ebenfalls voraus.
2. **Direkte Rechtstextspeicherung** nach Abgleich vom 2026-07-07, `agency_topic.content_dpp` / `content_imprint` behalten und `dpp_id`/`imprint_id` entfernen, verhindert gemeinsame Nutzung. Eine Datenschutzerklärung für vier Fachbereiche müsste viermal gepflegt werden: dieselbe Duplizierung auf Textebene.

Zusätzlich plante QDL-02 #183 die Themenauswahl *nach* Kontoanlage. Einwilligung erfolgt aber *während* Anlage. Fachbereichsrechtstexte lassen sich erst mit agencyId und topicId bestimmen. Auswahl danach bedeutet Einwilligung zum falschen Mandanten-Ersatzdokument.

Drei verbindliche Anforderungen von Frank am 2026-07-16:

- **Keine doppelten realen Einheiten:** Eine Beratungsstelle = eine Zeile, unabhängig von Themenzahl.
- **Flexible Rechtstextzuordnung:** Ein Text für mehrere Fachbereiche oder je eigene Texte ist eine Verfasserentscheidung, keine Schemabegrenzung. Niemals N gepflegte Kopien.
- **Eindeutige Einwilligung:** Beratungsorganisation des Beraters und genau die bestätigten Rechtstexte müssen klar sein.

## Entscheidung

1. **Beratungsstellen haben wieder mehrere Themen.** Admin kehrt zur **Mehrfachauswahl** zurück, entgegen ADR-003 Punkt 3 / PR #244. Vorhandene Mehrthemenstellen sind **gültige Daten**. Fachbereich = eindeutige Stelle × Thema, `UNIQUE` und Entwurf/Veröffentlicht aus ADR-003 bleiben.
2. **Rechtstexte werden eigenständige gemeinsam nutzbare Objekte.** Neue Entity `legal_text` mit id, tenant_id, kind = DPP | IMPRINT, Bezeichnung, mehrsprachigem Inhalt und publication_status. `agency_topic` verweist über **nullable `dpp_id` / `imprint_id`** darauf; Umkehr des Abgleichs vom 2026-07-07. Mehrere Fachbereiche können denselben Text verwenden. Bearbeitung warnt vor Nutzung durch N Fachbereiche und bietet unabhängige Kopie an.
3. **Migration ergänzt:** Vorhandene direkte `content_dpp`/`content_imprint` in `legal_text` überführen, bytegleiche Texte zusammenführen, Referenzen setzen. Direkte Spalten eine Veröffentlichung lang als Leserückfall behalten, danach entfernen.
4. **Ohne Zuordnung gilt Mandantentext**, wie heute. Keine automatisch erzeugten leeren Entwürfe.
5. **Themenwahl vor Einwilligung:** Auf jedem Registrierungsweg einschließlich QDL-Links `cid`/`aid`/`tid` müssen **Beratungsstelle und Thema, also Fachbereich, vor Einwilligung feststehen**. Einwilligungsansicht zeigt stets passende Rechtstexte. Beraterlink ohne `tid` zeigt Themenfenster als *erste* Ansicht. Themenlinks/QR-Codes mit `aid`+`tid` oder `cid`+`tid` bestimmen Fachbereich und überspringen das Fenster.

## Folgen

**Positiv:** Keine fiktiven doppelten Beratungsstellen; Adressen einmal gepflegt, Ressourcenverwaltung korrekt. Ein Text für vier Fachbereiche ist Referenz statt vier Kopien. Einwilligung zum auflösbaren Fachbereichsdokument. QDL-Zentrums-QR `aid` und Fachbereichs-QR `aid`+`tid` entsprechen dem Modell. `DepartmentLegalSection` im Client funktioniert unverändert; nur Backend-Auflösung ändert sich.

**Negativ / Aufwand:** Kehrt zwei gemergte Arbeiten um: Admin #244 und direkte Texte in AgencyService `0021`/`0023`. Neue Entity und Rechtstextbibliothek/Zuordnungsoberfläche bauen; Nachbefüllungs-/Bereinigungsmigration; Themenfenster aus QDL-02 #183 umordnen.

## Erwogene Alternativen

- **Eine Beratungsstelle je Thema, „Design B“:** Verworfen; vervielfacht reale Stellen und Adresspflege, erzeugt nicht existierende Einheiten und verfälscht Ressourcenverwaltung.
- **Direkte Texte je Fachbereich behalten:** Verworfen; rechtlich identischer gemeinsamer Text wird zu N gepflegten Kopien, genau der verbotenen Duplizierung.
- **Themenwahl nach Einwilligung wie ursprüngliches QDL-02:** Verworfen; Klient stimmt zu, bevor das passende Fachbereichsdokument bestimmt werden kann.
