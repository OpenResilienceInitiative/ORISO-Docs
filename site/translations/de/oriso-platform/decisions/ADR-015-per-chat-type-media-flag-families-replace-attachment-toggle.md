# ADR-015 — Medienflag-Familien je Chattyp ersetzen `featureAttachmentUploadDisabled`

**Status:** Angenommen · **Datum:** 2026-07-18
**Kontextdokumente:** `PLAN-media-upload-security-2026-07-18.md`

## Kontext

Für Medien sind drei unabhängige Schalter nötig: Upload erlaubt; direkte Anzeige oder ausschließlich Dateidownload mit angehängter Virenprüfung; KI-Prüfung an/aus. Jeder muss **je Chattyp** (1:1 / Gruppe / anonymer Live-Chat / Supervision) und auf **jeder Ebene** der Einstellungskaskade (Plattform-Governance → Mandant → Beratungsstelle) konfigurierbar sein, wie jede andere ORISO-Grundfunktion.

Heute gibt es genau einen zugehörigen Schalter: `featureAttachmentUploadDisabled`. Dieses **umgekehrte** Flag existiert nur auf Mandanten-/Beratungsstellenebene und hat **keine Unterteilung nach Chattyp**. Es wird unter Kommunikationseinstellungen bearbeitet und vom Frontend gelesen, um den Upload-Button zu verstecken. Es überschneidet sich direkt mit dem neuen Upload-Schalter.

Das bestehende Muster für Funktionen je Chattyp ist die Familie `featureVideoCalls*`: ein Hauptflag und vier Varianten mit Chattyp-Suffix. Sie sind in `TenantSettings` und im `settings`-JSON der Beratungsstelle mit gleicher Benennung vorhanden. Die Plattform begrenzt sie über `allowedPermissionToggles` (`tenant_admin_controls` / `agency_admin_control`). Admin zeigt sie als Chattyp-Karten an.

## Optionen

**A — ersetzen (gewählt).** Die neue Familie `featureMediaUpload*` ersetzt das alte Flag vollständig. Gespeicherte Mandanten-/Beratungsstelleneinstellungen werden einmalig übersetzt: Das alte „disabled“ bedeutet, dass die neue Familie überall aus ist. Der alte Schalter verschwindet aus Admin und Frontend. Es gibt eine maßgebliche Einstellung; das Hauptflag der neuen Familie *ist* der globale Abschaltschalter. Da es keine Produktionsbenutzer gibt, ist das Migrationsrisiko gering.

**B — beide behalten.** Das alte Flag bleibt als globaler Abschaltschalter neben der fein unterteilten Familie bestehen. Zwei überlappende Schalter mit später kaum erklärbarer Wechselwirkung führen zu dauerhafter Verwirrung in Admin.

## Entscheidung

Drei Flag-Familien exakt nach dem Muster `featureVideoCalls*` einführen: `featureMediaUpload…`, `featureMediaInlineDisplay…`, `featureMediaAiScan…` (je ein Hauptflag und vier Chattyp-Varianten), auf Mandanten- *und* Beratungsstellenebene, mit neuen Plattformschlüsseln in `allowedPermissionToggles`. **`featureAttachmentUploadDisabled` entfernen**, durch eine einmalige, mit TDD geprüfte Übersetzung der Einstellungen. Chattyp ist die einzige Dimension; es gibt keine separate Achse für angemeldete/anonyme Benutzer. Anonyme Benutzer existieren ausschließlich im anonymen Live-Chat.

Die Migration wird mit zuerst geschriebenen Tests entwickelt und muss belegen: Bestehende Einstellungen werden korrekt übersetzt, das Frontend verhält sich für jede Kombination vor und nach der Änderung identisch, und kein Mandant verliert seine aktuelle Upload-Konfiguration.

## Folgen

- Administratoren konfigurieren Medienverhalten je Chattyp wie Videoanrufe: vertraute Oberfläche, keine neuen Konzepte.
- Alle Verbraucher von `featureAttachmentUploadDisabled` (Admin-Kommunikationseinstellungen, Frontend-Oberfläche zum Senden von Nachrichten, generierte API-Typen) müssen mit derselben Änderung migriert werden. Das Flag verschwindet aus der API.
- Drei Familien × fünf Flags × zwei Ebenen sowie Governance-Schlüssel ergeben einen breiten, aber flachen Änderungsumfang. Dieser Aufwand für „bis zur kleinsten Einheit konfigurierbar“ wird bewusst akzeptiert.
- Benötigt die Einstellungsoberfläche auf Beratungsstellenebene (WP-0), damit diese Dimension tatsächlich bedienbar und nicht nur gespeichert ist.
