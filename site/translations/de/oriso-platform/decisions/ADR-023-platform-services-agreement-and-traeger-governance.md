# ADR-023: Plattformvertrag, aktuell gehaltene Vorlagen und verhältnismäßige Eskalation

- **Status:** Angenommen — Frank, 2026-08-16 (grill-with-docs-Sitzung)
- **Datum:** 2026-08-16
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** `ADR-021` (Hierarchie/Versionierung), `ADR-022` (Einwilligung Ratsuchender), AVV-/DPA-Epic aus `ADR-003`-Zeit, `tenant_dpa_version`, `DpaLegalForm`; `PLAN-dsfa-living-document-2026-08-13.md` Abschnitt 7.6 (verhältnismäßige Eskalation); `CONTEXT-legal-documents.md`
- **Umfang:** Beziehung **Plattformbetreiber/Träger**, ohne Ratsuchende.

---

## Kontext

Admin zeigt AVV wie den ganzen Vertrag, obwohl nur Anlage. Daneben Leistungsbedingungen, technische/organisatorische Maßnahmen, Unterauftragsverarbeiterliste und weitere Verweise wie DSFA. „AVV unterzeichnen“ bedeutet tatsächlich Abschluss eines umfassenderen Vertrags. Modul benennt und zeigt dies unzureichend.

ADR-021 führt Vorlage für Träger-Einwilligung ein. Ohne gepflegte Herkunftsverbindung nur Kopie: zentrale Rechtskorrekturen erreichen alte Kopien nicht.

Bei verpflichtender Übernahme wird Ablehnung zur Produktentscheidung mit Sicherheitsfolgen. U25-Suizidprävention: Durchsetzung darf Beratung nicht beenden und damit Geschützte gefährden.

## Entscheidung

1. **Vertrag als solcher benennen, AVV als Anlage.**

   | | Deutsch für Oberfläche/Träger | Englisch für Code/ADRs/GitHub |
   |---|---|---|
   | Ganzes | **Plattformvertrag** | **Platform Services Agreement** |
   | Anlage 1 | Auftragsverarbeitungsvertrag (AVV), Art. 28 DSGVO | Data Processing Agreement (DPA) |
   | Anlage 2 | Technische und organisatorische Maßnahmen (TOM), Art. 32 | Technical and Organisational Measures |
   | Anlage 3 | Unterauftragsverarbeiter | Subprocessor list |
   | Anlage 4 | Leistungsbeschreibung / Nutzungsbedingungen | Service description / terms of use |
   | Daneben | Verweise auf DSFA/Plattformdatenschutzerklärung | References — verlinkt, nicht mitunterzeichnet |

   Handlung **Vertragsabschluss**, Nachweis **Unterzeichnung** mit Datum, Person, Rolle. „Vereinbarung“ vermeiden: Klick schließt bindenden Vertrag. Englisch „Agreement“ als üblicher bindender Begriff behalten. Entities `platform_agreement`, `agreement_annex`, `agreement_signature`.

   Bestehendes Modul umbenennen/neu einordnen, Unterzeichnende und Dokumente unverändert. AVV-Tickets **umbenennen**, nicht ersetzen.

2. **Vorlage bleibt mit Herkunft verbunden.**
   - Trägertext speichert **Vorlagenversion** der Ableitung; ADR-021 Punkt 3 liefert Versionen bereits.
   - Neue Plattformvorlage macht ältere Referenzen automatisch veraltet, einfacher Nummernvergleich statt Benachrichtigungssystem.
   - Admin zeigt Hinweis mit **nebeneinanderliegendem Vergleich**. Übernahme: Träger veröffentlicht eigene neue Version; Ablehnung löscht Hinweis.
   - Vorhandener geteilter Button „neu aus Vorlage“ im PlaceholderTemplate-Modul ist genau dieser Mechanismus.
3. **Vorlage und geltendes Plattformdokument getrennt.** Vorlage ohne Rechtswirkung; Hauptmandanten-Datenschutzerklärung gilt ohne aufgelösten Träger. Vorschlagsänderung darf nicht geltendes Recht für unzugeordnete Besucher setzen. Auch ADR-021 Punkt 8 als Datenmodellgrenze.
4. **Änderung empfohlen oder verpflichtend kennzeichnen.** Nur verpflichtend mit Frist. Kosmetik folgenlos ignorierbar, gesetzlich erzwungene Änderung nicht.
5. **Eskalation stufenweise mit fester Grenze.** Nicht rechtzeitig übernommen: Hinweis → Warnbanner → **neue Registrierungen dieses Trägers aussetzen**.

   **Unverhandelbar:** Laufende Beratung, Anmeldung bestehender Ratsuchender und bestehende Verläufe **immer erhalten**. Datenschutz darf Schutzinteresse nicht gefährden. Vorbild AVV-Schranke, die nur neue Beratungsstellen blockiert und sonst warnt. Plattformweiter Grundsatz zu DSGVO Art. 35(7)(d), Schutzmaßnahmen für Betroffene; dokumentiert in DSFA-Plan 7.6.

## Folgen

**Positiv:** Träger sieht tatsächlichen Vertrag. Zentrale Korrekturen erreichen alle ohne Push-Kanal. Gesetzlich nötige Durchsetzung ohne Macht, Beratung abzuschneiden. Benennung stellt AVV nicht mehr als gesamte Beziehung dar.

**Negativ / Aufwand:** Admin wächst von Einzeldokument zu Vertrag mit Anlagen. Herkunftsreferenz, Veraltungsprüfung, Vergleich bauen; neue Frist-/Eskalationslogik. Oberfläche, ADR-Titel, Entity-Namen und Tickets konsistent gemeinsam umbenennen.

## Erwogene Alternativen

- **„Vereinbarung“ behalten.** Zu schwach für bindenden Klickabschluss, verdeckt Anlagencharakter der AVV.
- **Vorlagenkopie ohne Verbindung.** Rechtskorrekturen erreichen Träger nicht.
- **Vorlage maßgeblich, Träger ergänzt nur.** Widerspricht ADR-021 Punkt 2, ein Satz/ein Kästchen.
- **Nur warnen.** Gesetzliche Verpflichtung unbegrenzt aussitzbar.
- **Automatisch nach Frist übernehmen.** Träger veröffentlicht ungelesenen Text.
- **Anmeldung sperren/Sitzungen beenden.** Ausdrücklich verworfen, Punkt 5.
