# Recherche: Wie die gematik Datenschutz-/Sicherheitsdokumentation veröffentlicht — Vorbilder für die ORISO-DSFA

Stand: 2026-08-13. Recherchiert für: ORISO (Matrix-basierte Online-Beratungsplattform) — Ziel: DSFA/DPIA als versionierte HTML-Seite mit PDF-Download im Docs-Repo.

---

## 1. Welche Dokumente die gematik öffentlich bereitstellt

### a) Die DSFA selbst: E-Rezept-App (das direkteste Vorbild)

Die gematik hat für die E-Rezept-App eine vollständige DSFA **freiwillig** veröffentlicht (sie war rechtlich nicht in allen Teilen dazu verpflichtet und hat sogar Verarbeitungen einbezogen, für die sie nicht Verantwortliche ist). Publiziert als **drei getrennte PDF-Artefakte** auf der Produkt-Website:

- Vollbericht (~100 Seiten): https://www.das-e-rezept-fuer-deutschland.de/media/erezept/Medien/Dokumente/DSFA_E-Rezept-App.pdf
- Zusammenfassung (Summary): https://www.das-e-rezept-fuer-deutschland.de/media/erezept/Medien/Dokumente/DSFA_E-Rezept-App_Summary.pdf
- Tabellarische Risikoanalyse: https://www.das-e-rezept-fuer-deutschland.de/media/erezept/Medien/Dokumente/DSFA_E-Rezept-App_Risikoanalyse.pdf
- FAQ-Einbettung („Wie steht es um den Datenschutz?"): https://www.das-e-rezept-fuer-deutschland.de/faq/faq-detail/wie-steht-es-um-den-datenschutz

Erklärtes Zielpublikum laut Dokument: „die interessierte Öffentlichkeit". Hinweis: Der Vollbericht-PDF ist technisch verschlüsselt/kopiergeschützt (AES) — ein Anti-Pattern, siehe Fazit.

Für die Telematikinfrastruktur insgesamt existiert dagegen **keine** veröffentlichte Gesamt-DSFA — das wurde per FragDenStaat-Anfrage bestätigt (BMG: DSFAs macht der jeweilige Verantwortliche pro Komponente): https://fragdenstaat.de/en/request/datenschutzfolgeabschatzung-telematik-infrastruktur/ · Kontext DSK/Mitverantwortung: https://ddrm.de/telematik-infrastruktur-datenschutzkonferenz-betont-datenschutzrechtliche-mitverantwortung-der-gematik/

### b) TI-Messenger-Spezifikationen (gemSpec) — inkl. Datenschutz-/Sicherheitskapiteln

- Fachportal-Einstiegsseite TI-Messenger (Übersicht, Zulassung, Dokumentliste): https://fachportal.gematik.de/anwendungen/ti-messenger
- gemSpec TI-M Basis (HTML, „latest"): https://gemspec.gematik.de/docs/gemSpec/gemSpec_TI-M_Basis/latest/
- gemSpec TI-M Basis, Versionsübersicht: https://gemspec.gematik.de/docs/gemSpec/gemSpec_TI-M_Basis/
- gemSpec TI-Messenger-Client (HTML): https://gemspec.gematik.de/docs/gemSpec/gemSpec_TI-Messenger-Client/
  - PDF-Variante: https://gemspec.gematik.de/downloads/gemSpec/gemSpec_TI-Messenger-Client/gemSpec_TI-Messenger-Client_V1.1.2.pdf
  - Änderungsmarkierte Fassung („_Aend"): https://gemspec.gematik.de/downloads/gemSpec/gemSpec_TI-Messenger-Client/gemSpec_TI-Messenger-Client_V1.1.2_Aend.html
- gemSpec TI-Messenger-Dienst: https://gemspec.gematik.de/docs/gemSpec/gemSpec_TI-Messenger-Dienst/gemSpec_TI-Messenger-Dienst_V1.1.0/
- Systemspezifisches Konzept (gemKPT_TI_Messenger): https://fachportal.gematik.de/fileadmin/Fachportal/Anwendungen/TI-Messenger/gemKPT_TI_Messenger_V1.0.0.pdf
- Welcome Package für Anbieter (Zulassungsweg): https://fachportal.gematik.de/fileadmin/Fachportal/Anwendungen/TI-Messenger/Welcome_Package_TI-Messenger_V1.1.0.pdf
- Marketing-/Erklärdokument: https://www.gematik.de/media/gematik/Medien/Ti-Messenger/Dokumente/gematik_TI_Messenger_print.pdf

Die Spezifikationen enthalten jeweils ein Kapitel „Datenschutz und Sicherheit" (z. B. Kap. 4.1 in TI-M Basis) und verweisen auf das übergreifende Datenschutz- und Sicherheitskonzept der TI (gemKPT_DS_Sich_TI). Sicherheitsgutachten selbst werden nicht als Dokumente publiziert, sondern von gematik-akkreditierten Sicherheitsgutachtern erstellt (Gutachterliste im Fachportal); veröffentlicht wird das Ergebnis (Zulassung) und die Anforderungslage.

### c) GitHub (github.com/gematik)

- API-Spezifikation TI-Messenger: https://github.com/gematik/api-ti-messenger
  - Inhalt: OpenAPI-YAML (`src/openapi/`), AsciiDoc/Markdown-Doku, PlantUML/draw.io-Diagrammquellen + gerenderte Bilder, Postman-Collections.
  - Versionierung: Branch-Modell (main = Release, develop, hotfix, feature/*), Tags/Releases, explizite `ReleaseNotes.md`.
  - Lizenz: Apache 2.0. Badges verlinken auf die „latest"-gemSpec-Seiten (TI-M Basis / ePA / Pro).
- Ergänzend: TI-Messenger-Blog „Compass" im öffentlichen Confluence: https://wiki.gematik.de/spaces/TIMCOMP/pages/604603166/TI-Messenger+Compass+-+The+TI-M+Blog

---

## 2. Publikationsform im Detail (das gemSpec-Modell)

Das Kernstück ist **gemSpecPages** (gemspec.gematik.de) — genau das Modell „versionierte HTML-Seite mit PDF-Download":

1. **HTML als Primärformat**, ein Dokument pro Seite, mit vollem Inhaltsverzeichnis.
2. **Version prominent im Kopf**: Versionsnummer + Revision + Stand-Datum (z. B. „Version 1.2.0, Stand 25.11.2025").
3. **Dokumentenhistorie als Tabelle im Dokument**: jede Version mit Datum, geändertem Kapitel und Änderungsgrund.
4. **Stabile URL-Struktur**: `/docs/gemSpec/<Dok>/<Dok>_V<x.y.z>/` pro Version **plus** `/docs/gemSpec/<Dok>/latest/` als beweglicher Zeiger. Alte Versionen bleiben abrufbar.
5. **„Änderungsvergleich"**: verlinkter Diff zur Vorversion, zusätzlich änderungsmarkierte Fassungen (`_Aend.html`).
6. **Mehrere Download-Formate pro Dokument**: PDF, HTML, Excel, XML (Excel/XML v. a. für die maschinenlesbare Anforderungsliste).
7. **Anforderungs-IDs** (A_xxxxx / gemäß AFO-Systematik): jede normative Aussage hat eine stabile, referenzierbare ID — dadurch sind Gutachten, Zulassung und Tickets präzise verlinkbar.
8. **Arbeitsteilung Portal vs. GitHub**: Fachportal/gemSpecPages = normative, versionierte Dokumente; GitHub = maschinenlesbare API-Artefakte + Beispiele mit eigenem Release-Zyklus; Confluence-Blog = erklärende, lebende Inhalte.

---

## 3. Wie die gematik Matrix/E2EE beschreibt (Referenz-Formulierungen)

Aus gemSpec_TI-M_Basis / gemSpec_TI-Messenger-Client (Formulierungen, die sich für eine DSFA gut adaptieren lassen):

- Protokollbasis: „Der TI-Messenger basiert auf dem offenen Kommunikationsprotokoll Matrix, das bereits von der Matrix Foundation gemäß [Matrix Specification] spezifiziert ist."
- E2EE-Grundsatz: „Die Nachrichten werden auf dem jeweiligen TI-Messenger-Client erstellt und Ende-zu-Ende verschlüsselt versendet. Die gesendeten Nachrichten werden verschlüsselt auf dem jeweiligen Matrix-Homeserver gespeichert."
- Schlüsselverteilung/Verifikation: „Der für die Entschlüsselung benötigte Schlüssel wird nur mit verifizierten Endgeräten innerhalb des jeweiligen Raumes geteilt."
- Kryptoverfahren: E2EE „auf Basis von Olm und Megolm" — Olm für 1:1-Chats, Megolm für Gruppenräume; Clients müssen der Matrix-Spezifikation folgen und eine „auditierte und hinreichend sichere Implementierung" von Olm/Megolm verwenden.
- Schichtenmodell (gute juristisch-verständliche Struktur): Transportverschlüsselung per TLS + moderne Ende-zu-Ende-Verschlüsselung der Chat-Inhalte (Olm/Megolm) + dezentrale/föderierte Homeserver-Architektur.
- Nachweis statt Behauptung: gematik hat Audits der E2EE-Implementierungen beauftragt — Vodozemac (Rust, 2022) und libolm (C/C++, 2024). Ergänzend zitierbar: NCC-Group-Audit der Matrix-Krypto sowie formale Analyse „The Matrix Reloaded" (https://arxiv.org/pdf/2408.12743).
- Datenschutz-Formulierungsmuster aus den Specs: Tracking-Daten dürfen vom datenschutzrechtlich Verantwortlichen des Clients nur selbst verarbeitet/ausgewertet und nicht an Dritte ausgelagert werden; Eignung von Archivierungssystemen ist „hinsichtlich Datenschutz und Informationssicherheit zu bewerten".

Quellen: https://gemspec.gematik.de/docs/gemSpec/gemSpec_TI-M_Basis/latest/ · https://gemspec.gematik.de/downloads/gemSpec/gemSpec_TI-Messenger-Client/gemSpec_TI-Messenger-Client_V1.1.2.pdf · https://fachportal.gematik.de/anwendungen/ti-messenger

Muster-Textbaustein (adaptierbar für ORISO): *„ORISO basiert auf dem offenen Kommunikationsprotokoll Matrix. Nachrichteninhalte werden auf dem Endgerät der Nutzerin erstellt und Ende-zu-Ende verschlüsselt (Verfahren Olm für Einzel-, Megolm für Gruppenkommunikation, Double-Ratchet-Familie wie bei Signal). Auf dem Server liegen Inhalte ausschließlich verschlüsselt; die zur Entschlüsselung nötigen Schlüssel werden nur zwischen den Endgeräten der Raumteilnehmer geteilt. Ergänzend ist jede Verbindung transportverschlüsselt (TLS). Die eingesetzte Verschlüsselungsimplementierung (vodozemac) wurde extern auditiert."*

---

## 4. Weitere Vorbilder für „DPIA als lebendes Web-Dokument"

**NHS England (bestes HTML-Vorbild):**
- Overarching DPIA für die Federated Data Platform als **HTML-„long read"-Seite** (kein PDF-Zwang, mit Versionsangabe und Update-Hinweisen): https://www.england.nhs.uk/long-read/overarching-data-protection-impact-assessment-dpia-for-the-federated-data-platform-fdp/
- Produkt-DPIAs als eigene Publikationsseiten: https://www.england.nhs.uk/publication/nhs-fdp-product-data-protection-impact-assessment-dpia-fdp-national-ontology/
- NHS login DPIA als HTML-Seite auf dem Digital-Portal: https://digital.nhs.uk/services/nhs-login/data-protection-impact-assessment
- NHSBSA veröffentlicht **DPIA-Summaries** systematisch als Publication-Scheme-Seite: https://www.nhsbsa.nhs.uk/what-we-do/publication-scheme/our-data-protection-impact-assessment-dpia-summaries
- Redigierte Vollversion parallel als PDF (Redaktionsprinzip: identifizierbare Version geschwärzt): https://www.england.nhs.uk/wp-content/uploads/2025/08/redacted-ndit-nhs-england-fdp-dpia-identifiable-version-v3.0.pdf

**Matrix.org / Element (E2EE-Selbstbeschreibung):**
- E2EE-Implementierungs-Guide (HTML, lebend): https://matrix.org/docs/matrix-concepts/end-to-end-encryption/
- Die Matrix-Spec selbst (spec.matrix.org) ist das Muster „versionierte HTML-Spezifikation mit Changelog und /latest/"-Zeiger — dasselbe Modell, das gematik mit gemSpecPages nachbaut.
- Element-Produktseite E2EE (Marketing-Ton, NCC-Audit-Verweis): https://element.io/en/features/end-to-end-encryption

**Deutsche Verwaltung / Open Source:**
- ZenDiS/openDesk publiziert die komplette Doku (inkl. Sicherheits-/Datenschutzunterlagen) im offenen Repo auf openCoDE — Modell „Compliance-Doku lebt im Git-Repo neben dem Code": https://www.zendis.de/en · https://en.wikipedia.org/wiki/OpenDesk
- Muster-DSFA für TI-Konnektor (Mediverbund, zeigt das klassische Word/PDF-Formular-Modell): https://www.medi-verbund.de/wp-content/uploads/2021/02/24.9.2019_Mediverbund-TI-Konnektor-Muster-DSFA.pdf

---

## 5. Fazit: Was für ORISO kopieren, was nicht

**Kopieren:**
1. **gemSpecPages-URL-Modell**: `docs/dsfa/v1.2.0/` + `docs/dsfa/latest/` — alte Versionen bleiben stehen, „latest" ist der Zeiger. HTML ist Primärformat, PDF wird pro Version daneben gelegt.
2. **Dokumentenhistorie als Tabelle im Dokument** (Version, Datum, Kapitel, Änderungsgrund) + verlinkter Änderungsvergleich (bei uns: Git-Diff-Link zwischen Version-Tags — billiger als gematiks generierte `_Aend`-Fassungen).
3. **Dreiteilung der E-Rezept-DSFA**: Vollbericht + kurze allgemeinverständliche Summary + tabellarische Risikoanalyse (die Tabelle ggf. als CSV/Excel maschinenlesbar, analog gemSpec-Excel-Export). Die Summary ist das, was Träger/Öffentlichkeit tatsächlich lesen.
4. **Stabile Anforderungs-/Risiko-IDs** (z. B. `DSFA-R-012`, `DSFA-M-034`): macht Maßnahmen in Issues/PRs referenzierbar — gematiks A_-Nummern sind der Grund, warum ihr Ökosystem präzise zitieren kann.
5. **NHS-„long read"-Stil** für die HTML-Fassung: echtes navigierbares Webdokument mit Versionsblock oben, kein eingebettetes PDF.
6. **E2EE-Beschreibung in Schichten** (Transport-TLS → E2EE Olm/Megolm → Föderationsarchitektur) + Verweis auf externe Audits (vodozemac/NCC) statt Eigenlob — die gematik-Formulierungen aus Abschnitt 3 sind direkt adaptierbar.

**Nicht kopieren:**
1. **Verschlüsselte/kopiergeschützte PDFs** (die E-Rezept-DSFA ist AES-gesperrt — schadet nur der Zitierbarkeit und Transparenz).
2. **Die Portal-Zersplitterung** der gematik (Fachportal + gemSpecPages + gematik.de + Confluence + GitHub): für ORISO reicht ein Docs-Repo mit GitHub-Pages/Site — GitHub als Quelle UND Publikationsort (das openDesk-Modell), nicht getrennte Systeme.
3. **Word-als-Quellformat** (gematik-PDFs sind erkennbar aus .docx generiert): Quellformat sollte Markdown/AsciiDoc im Repo sein, HTML+PDF werden im CI gebaut.
4. **Kein separater Sicherheitsgutachten-Apparat** nötig: gematiks Gutachter-/Zulassungsmodell ist regulatorisch bedingt; für ORISO genügen verlinkte externe Audit-Referenzen (Matrix-Krypto-Audits) + eigene Risikoanalyse.

**Konkrete Empfehlung:** DSFA als Markdown im Docs-Repo, CI baut versionierte HTML-Seite (+ PDF pro Release-Tag), URL-Schema mit `latest`-Zeiger, Dokumentenhistorie-Tabelle im Kopf, stabile Risiko-/Maßnahmen-IDs, separate 2-Seiten-Summary. Struktur-Vorlage: DSFA E-Rezept-App (Vollbericht + Summary + Risikotabelle); Web-Form-Vorlage: NHS England FDP-DPIA; Versionierungs-Vorlage: gemSpecPages.
