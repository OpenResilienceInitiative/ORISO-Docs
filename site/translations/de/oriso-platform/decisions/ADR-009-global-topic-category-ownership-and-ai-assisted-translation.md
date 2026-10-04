# ADR-009: Globale Zuständigkeit für Themen/Kategorien und Infrastruktur für KI-gestützte Übersetzung

- **Status:** Angenommen — Frank, 2026-07-01 (grill-with-docs-Sitzung). Das Design wird jetzt festgelegt („die Weichen stellen“); die Implementierung ist bewusst verschoben, siehe Einführung unten.
- **Datum:** 2026-07-01
- **Entscheider:** Frank und KI (Backend/Frontend)
- **Verwandt:** `ADR-001` (Thema/Beratungsform/Beratungsstelle als unabhängige Achsen), `ADR-003` (Fachbereich = Beratungsstelle × Thema, Zuständigkeit für Rechtstexte), `ADR-006` (`conversation_type` als festes Enum; wird durch diese Entscheidung ausdrücklich NICHT erneut geöffnet), `CONTEXT-topics-categories-departments.md`

---

## Kontext

Anlegen, Lesen, Ändern und Löschen von Themen/Kategorien existiert bereits (`ORISO-ConsultingTypeService`, `TopicEntity`/`TopicGroupEntity`, `ORISO-Admin`, `pages/Topics`), aber:
- Es ist auf `UserRole.TenantAdmin` und die Spalte `tenant_id` begrenzt, obwohl Themen konzeptionell **global** sind: ein eindeutiger Gegenstand, nicht nach Mandant aufgeteilt. Die Unterschiede je Beratungsstelle liegen im **Rechtstext** (Fachbereich, ADR-003), nicht in der Themenidentität. Diese Abweichung erzeugte den falschen Eindruck, jeder Träger habe eigene Themen.
- Themennamen werden nur durch handgeschriebene SQL-Migrationen übersetzt (`0011_add_english_topic_names`, `JSON_SET`/`JSON_EXTRACT` auf der bestehenden JSON-Spalte `name`). Es gibt weder eine Übersetzungsoberfläche für Administratoren noch eine Vollständigkeitsprüfung.
- Themen-/Kategorieicons sind fest hinterlegte Frontend-Dateien mit uneinheitlichen Formen, teilweise rund, teilweise quadratisch. Es gibt keinen Upload.
- `conversation_type` aus `ADR-006` hat vier feste, strukturell unterschiedliche Werte (Beratungsstellenberatung / Live-Chat / interner Gruppenchat / Selbsthilfegruppe), ohne durch Administratoren bearbeitbare oder übersetzbare Anzeigebezeichnung.

Diese Entscheidung verwendet bewusst folgende vorhandene Infrastruktur weiter:
- `pages/GlobalSettings` in `ORISO-Admin` (Tabs: Login, SMTP) speichert bereits plattformweite Einstellungen ohne Mandantenbezug, einschließlich eines Secrets (`globalSmtpPassword` über `FormInputPasswordField`, `useSettingsAdminMutation`).
- `TECHNICAL_TENANT_ID = 0L` ist bereits eine etablierte serviceübergreifende Konvention in AgencyService und TenantService: Diese Zeile gehört zur Plattform, nicht zu einem Mandanten.
- `TopicGroupEntity.topicEntities` ist bereits `@ManyToMany`; ein Thema kann gleichzeitig in mehreren Kategorien liegen.

## Entscheidung

1. **Zuständigkeit:** Plattformadministratoren verwalten **ausschließlich** den globalen Themen-/Kategoriekatalog: Anlegen, Bearbeiten, Löschen, Icon-Zuordnung und Übersetzungen. Mandanten-/Beratungsstellenadministratoren behalten die Fachbereichsverknüpfung, also welche Beratungsstelle welches Thema anbietet, und schreiben ihre eigenen Rechtstexte (Datenschutzerklärung/Impressum, ADR-003). Die Themen-/Kategorieidentität bearbeiten sie nicht mehr direkt.
2. **Icon:** Themen/Kategorien erhalten ein durch Administratoren hochladbares Icon. Es ersetzt die heutigen festen Frontend-Dateien mit uneinheitlichen Formen.
3. **Vollständigkeitsprüfung von Übersetzungen:** Das Admin-Formular warnt, wenn für ein übersetzbares Feld eine konfigurierte Sprache fehlt, statt still einen leeren Wert oder Ersatzwert auszuliefern.
4. **Infrastruktur für KI-gestützte Übersetzung:** Ein durch Plattformadministratoren konfigurierbarer **OpenRouter-API-Schlüssel** wird als neuer Tab auf `GlobalSettings` ergänzt, mit demselben Secret-Feldmuster wie SMTP. Er übersetzt von Administratoren verfasste Texte als Ausgangsentwurf in „Demoqualität“ und ersetzt keine menschliche Prüfung. Optional und nur bei geringem Aufwand kann ein Feld oder eine Funktion einen kurzen festen Kontexttext an den Übersetzungsaufruf anhängen, etwa: „Dies ist eine Systemnachricht zur Fallübergabe — kurz und einfach, ohne Fachjargon.“
5. **Auch für `ConversationType`-Bezeichnungen:** Dieselbe Infrastruktur für Vollständigkeitsprüfung und KI-Hilfe gilt für die vier festen Anzeigenamen der Beratungsformen aus `ADR-006`. Die vier **Werte** und ihre unterschiedlichen Codepfade bleiben gleich. Nur die Benennung je Sprache wird darüber durch Administratoren bearbeitbar. `ADR-006` wird nicht erneut geöffnet.
6. **Reihenfolge:** Dieser ADR legt jetzt Schema und Zuständigkeiten fest. So benötigt die bevorstehende Fachbereichsmigration aus `ADR-003` (`UNIQUE(agency_id, topic_id)`, Bereinigung von Duplikaten und Impressum-Spalte, in derselben Sitzung entschieden) später keinen zweiten Durchlauf über `topic`/`agency_topic`. Die Umsetzung der Punkte 1–5 ist ausdrücklich **als Folgearbeit nach den verpflichtenden AVV-/Rechtstext-Ergebnissen Mitte Juli verschoben** und gehört nicht zu dieser Frist.

## Folgen

**Positiv:** Ein wiederverwendbarer Übersetzungsmechanismus bedient mehrere Funktionen: Themen-/Kategorienamen, ConversationType-Bezeichnungen und mögliche spätere Texte wie Systemnachrichten zur Fallübergabe. Eigene Lösungen je Funktion entfallen. Plattformadministratoren erhalten die klare alleinige Zuständigkeit für die gemeinsame Begriffssystematik; die Verwechslung mit eigenen Themen je Mandant entfällt. Das bewährte Muster von `GlobalSettings` wird weiterverwendet.

**Negativ / Aufwand:** Eine externe Abhängigkeit von OpenRouter und ein gespeicherter API-Schlüssel kommen als plattformweite Zugangsdaten hinzu, die verwaltet und rotiert werden müssen. KI-Übersetzungen sind ausdrücklich Entwürfe in Demoqualität und müssen so angezeigt werden, nicht als endgültige Texte. Mandantenadministratoren verlieren ihre bisherige begrenzte Möglichkeit, Themen direkt zu bearbeiten. Diese Einschränkung muss vor der Einführung kommuniziert werden.

## Erwogene Alternativen

- **Themenkataloge je Mandant wie heute behalten:** Verworfen, weil dadurch die Verwechslung „jeder Träger hat eigene Themen“ fortbesteht und Übersetzungsarbeit je Mandant statt einmal global anfällt.
- **Professionelles Übersetzungsmanagement statt LLM-/OpenRouter-Schlüssel integrieren:** Zunächst verworfen, da für einen Ausgangsentwurf in Demoqualität zu aufwendig. Später weiterhin möglich, da die Form des API-Schlüsselfelds nicht an einen Anbieter gebunden ist.
- **Plattformadministratoren völlig neue Gesprächsarten definieren lassen:** Für diese Entscheidung verworfen. Das widerspricht dem noch nicht entschiedenen, wesentlich größeren Vorschlag für schaltbare Beratungsformmodule aus `ADR-001` und liegt ausdrücklich außerhalb dieses Umfangs.

## Einführung (verschoben — erst nach den verpflichtenden Arbeiten Mitte Juli)

1. Themen-/Kategorieverwaltung von der Schranke `UserRole.TenantAdmin` auf Plattformadministratoren umstellen. Die Fachbereichsverknüpfung zwischen Beratungsstelle und Thema bleibt auf Mandanten-/Beratungsstellenseite. Vorhandene Storybook-Listenkomponenten wiederverwenden und ein Vorschaufenster ergänzen, damit Administratoren vor dem Speichern sehen, wie das Thema/die Kategorie für Endbenutzer aussieht.
2. Icon-Upload für Themen/Kategorien ergänzen.
3. Einen Übersetzungstab auf `GlobalSettings` ergänzen (OpenRouter-API-Schlüssel, optionaler Kontexttext je Funktion), mit `FormInputPasswordField` und `useSettingsAdminMutation`.
4. Vollständigkeitsprüfung für Übersetzungen in Themen-/Kategorieformularen ergänzen.
5. Einen kleinen Speicher für die übersetzten Bezeichnungen der vier festen `ConversationType`-Werte einführen: kleine Referenztabelle oder JSON-Block, technische Form noch offen, geringes Risiko und reversibel. Dieselbe Vollständigkeitsprüfung und KI-Hilfe anbinden.
