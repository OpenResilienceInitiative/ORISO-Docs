# ADR-021: Rechtstexthierarchie, allgemeine Versionierung und Einwilligungstext als Feld der Datenschutzerklärung

- **Status:** Angenommen — Frank, 2026-08-16 (grill-with-docs-Sitzung)
- **Datum:** 2026-08-16
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** `ADR-003` (Fachbereichsrechtstexte), `ADR-014` (gemeinsame Texte, Thema vor Einwilligung), **beide erweitert, keiner ersetzt**; `ADR-022` (Laufzeit-Einwilligungsschranken); `ADR-023` (Plattform-/Träger-Governance); `CONTEXT-legal-documents.md`; `PLAN-dsfa-living-document-2026-08-13.md`
- **Umfang:** Dieser ADR betrifft *Dokumente*. Anzeige/Zustimmungsnachweis in `ADR-022`; zwischen Plattform/Träger unterzeichnete Dokumente in `ADR-023`.

---

## Kontext

ADR-003/014 bestimmen eigene Fachbereichsrechtstexte und gemeinsame Objekte statt direkter Kopien. Beides bleibt korrekt. Keiner beschreibt **alle Ebenen**, **Versionierung** oder **Einwilligungssatz** am Kontrollkästchen.

Die Lücke erzeugte wiederholte teure Verwechslung: Einfacher Live-Chat-Dialogfehler wurde dreimal untersucht, weil niemand angeben konnte, welches Dokument wo gilt.

### Gemessener Stand (2026-08-16, `origin/pre-dev`, sofern nicht anders genannt)

**Vier Ebenen statt angenommener zwei/drei:**

| Nr. | Ebene | Speicher | Felder |
|---|---|---|---|
| 1 | Plattformbetreiber | Hauptmandant im Ein-Domain-Mehrmandantenmodus, `SingleDomainTenantOverrideService` | `contentImpressum`, `contentPrivacy` |
| 2 | Träger/Mandant | `tenant` | dieselben, zusätzlich `contentPrivacyActivationDate` |
| 3 | Beratungsstelle | `agency` | `contentDpp`, `contentImprint`, stellenweit bewusst ohne Veröffentlichungsstatus |
| 4 | Fachbereich = Stelle × Thema | `agency_topic` | `contentDpp`, `contentImprint`, je eigener Veröffentlichungsstatus |

Auflösung nach oben: `DepartmentLegalService` nimmt veröffentlichten Fachbereichstext, sonst stellenweiten Text, Zeilen 65–66/75–76. Plattform/Träger steuert `legalContentChangesBySingleTenantAdminsAllowed`; eingeschaltet **ersetzt** Trägertext den Plattformtext.

**Keine Rechtstext-Versionshistorie.** `legal_text` hat nur `publication_status` DRAFT/PUBLISHED, kein Archiv. Nur AVV versioniert: `tenant_dpa_version`, TenantService-Changeset 0018, `/tenantadmin/{id}/dpa/versions`. Neue Datenschutzerklärung/Impressum überschreibt alten Wortlaut spurlos. Kein Träger kann geltenden Text für Datum belegen.

**Editor unterstützt Versionen, Datenquelle fehlt.** `M3RichTextEditor` hat Auswahl, Online-seit, als neuen Entwurf übernehmen, Vergleich. `versions` nur durch `DataProcessingAgreementCard` gefüllt. `LegalText/index.tsx` und `DepartmentDataProtectionCard` ohne Versionsdaten; API nur `getDpaVersions.ts`.

**Einwilligungssatz statisches Frontend-i18n**, aus drei Fragmenten `registration.dataProtection.label.{prefix,and,suffix}` in `AccountData.tsx` um Links gesetzt. Kein Backend/keine Konfiguration. `LegalConsentTemplateEditor` im PlaceholderTemplate-Modul mit `{{Beratungsstelle}}`, `{{Thema}}`, `{{legal_links}}` als Storybook-Komponente ohne Funktion dahinter.

**Asymmetrische Vererbung:** Fachbereich→Stelle serverseitig in `DepartmentLegalService`; →Träger clientseitig über Admin `mergeTranslatedContent`, Frontend `pickConsentPrivacyContent`.

**Weitere Grenzen:** `legal_text.kind` freies `varchar(20)` ohne CHECK; `/agencies/{id}/topics/{tid}/legal` liefert rohen Text ohne Freemarker, Platzhalter erreichen Browser unverändert. Vorhandener Renderer Freemarker; `${...}` kann Objektmethoden aufrufen.

## Entscheidung

1. **Vier benannte Ebenen:** Plattformbetreiber → Träger → Beratungsstelle → Fachbereich, von unten mit Rückfall auflösen. Jeder Verweis in Code/Ticket/UI nennt Ebene. Unqualifizierte „Datenschutzerklärung“ ist keine gültige Aussage.
2. **Ersetzen reicht, Garantie durch Prüfung.** Träger ersetzt Plattform statt Anhängen. Ein Satz, ein Kästchen. Pflichtoffenlegung technisch sichern: Einwilligungstext **nicht veröffentlichbar** ohne `{{legal_links}}`, serverseitige Prüfung mit Editorfehler. Cookie-/Authentifizierungshinweis als fester nicht bearbeitbarer Zusatz darunter.
3. **Allgemeine Rechtstext-Versionshistorie** für Datenschutzerklärung, Impressum, spätere Arten auf allen Ebenen. AVV `tenant_dpa_version` als Muster; kopieren statt erfinden. Allgemeine Mechanik weniger Arbeit als nur Datenschutzerklärung: gleiche Tabelle/Endpunkt/Editor, nach Art unterschieden. Schließt bestehende Compliance-Lücke.
4. **Einwilligungstext Feld der Datenschutzerklärung**, keine eigene Rechtstextart. Änderung veröffentlicht neue Datenschutzerklärungsversion mit möglicherweise gleichem Haupttext. Eine Historie statt zwei, eindeutige gleiche Version statt Zeitstempelrekonstruktion. Zeitkorrelation verursachte schon AVV-Fehler durch Sekundengenauigkeit gegenüber MariaDB `DATETIME(0)`.
5. **Platzhalter nach Datenzuständigkeit aufteilen.** Server ersetzt `{{Beratungsstelle}}`, `{{Thema}}`, Kontakte. Client setzt echte klickbare `{{legal_links}}`, weil Ziele aus Frontend-Deployment `LegalLinksProvider` / `settings.legalLinks` stammen und Backend sie nicht kennt.
6. **Syntax `{{key}}`, niemals Freemarker `${key}`.** Trägertext nie durch Freemarker: `${...}` kann Methoden aufrufen, Vorlageninjektion möglich. Einfache Ersetzung `{{key}}` kann das nicht. Zwei Dialekte: `${}` für bestehende Datenschutzerklärungsplatzhalter `responsible`, `dataProtectionOfficer`; `{{}}` für Mails/Einwilligung. Vereinheitlichung bewusst separat verschoben.
7. **Impressum Informationspflicht, niemals Einwilligungsschranke.** Auf jeder Ebene erreichbar; nie ankreuzen, blockieren oder erneute Einwilligung auslösen. Nur Datenschutzerklärung und Plattform-/Trägerdokumente aus ADR-023 tragen Einwilligung.
8. **Plattformvorlage und eigenes geltendes Dokument getrennt.** Vorlage für Träger-Einwilligung ohne Rechtswirkung. Hauptmandanten-Datenschutzerklärung gilt bei nicht aufgelöstem Träger. Vorlagenänderung darf Besucher-Dokument nicht ändern.
9. **Vererbung durchgehend serverseitig.** Fachbereich→Stelle→Träger→Plattform an einer Stelle. Heutige Clienthälfte Admin `mergeTranslatedContent`, Frontend `pickConsentPrivacyContent` als Fehlerquelle entfernen, statt sie in Einwilligung zu übernehmen.

## Folgen

**Positiv:** Jede Ebene auflösbar, Historie belegbar. Welche Texte wann galten beantwortbar. Träger verantwortet Satz ohne Verlust von Pflichtoffenlegung. Ein Versionsverweis für Erklärung und Einwilligung, ADR-022. Editor unverändert weiterverwendet.

**Negativ / Aufwand:** Archivtabelle und Endpunkte je Textart; Pflicht-Token-Prüfung; Clientvererbung auf Server verschieben; zwei Dialekte bis Vereinheitlichung; vorhandene Admin-Karten mit Versionsauswahl verbinden.

## Erwogene Alternativen

- **Trägertext an Plattform anhängen oder zwei Kästchen.** Verworfen: widersprüchliche Dokumente zu gleicher Verarbeitung, schlechtere Bedienung. Absicherung stattdessen Entscheidung 2.
- **Eigene Art `legal_text.kind = CONSENT` mit `consent_id`.** Ohne Migration wegen freier Spalte, aber zweite Historie, vier OpenAPI-Enums und erneutes Korrelationsproblem.
- **Nur Datenschutzerklärung versionieren.** Verworfen: mehr Arbeit als allgemein, Impressumslücke bleibt.
- **Alles client- oder serverseitig ersetzen.** Client kennt Stellenkontakte nicht und bricht E-Mail/PDF. Nur Server erfordert Herauslösen der Links aus Frontend-Deployment.
