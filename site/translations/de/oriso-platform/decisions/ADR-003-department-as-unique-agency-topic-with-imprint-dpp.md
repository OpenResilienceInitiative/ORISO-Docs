# ADR-003: Fachbereich = eindeutige Kombination aus Beratungsstelle und Thema mit eigenem Impressum und Datenschutzerklärung

> **⚠️ Teilweise durch ADR-014 ersetzt (2026-07-16).** Entscheidung Nr. 3, die einfache Themenauswahl in Admin, wird UMGEKEHRT: Eine Beratungsstelle enthält mehrere Fachbereiche, die Themenauswahl ist wieder eine Mehrfachauswahl, und Rechtstexte sind gemeinsam nutzbare `legal_text`-Objekte (`dpp_id`/`imprint_id`). Die Eindeutigkeitsbedingung UNIQUE(agency_id, topic_id) und eigenes Impressum/Datenschutzerklärung je Fachbereich bleiben gültig. Lies ADR-014, bevor du auf Grundlage dieses Dokuments handelst.
>
> **Außerdem durch `ADR-021` erweitert (2026-08-16).** Die hier beschriebene Ebenenfolge endet beim Träger. Darüber liegt eine Plattformebene, der Hauptmandant, gesteuert durch `legalContentChangesBySingleTenantAdminsAllowed`. Rechtstexte haben außerdem noch keine Versionshistorie. `ADR-021` entscheidet, diese allgemein aufzubauen. `ADR-022` regelt die Anzeige der Dokumente und die Speicherung der Zustimmung von Ratsuchenden.

- **Status:** Angenommen — Frank, 2026-06-25 (Bestätigung durch das Team steht aus)
- **Datum:** 2026-06-25
- **Entscheider:** Frank und Backend-/Admin-Leads
- **Verwandt:** ADR-001 (Beratungsformen als Module; Thema/Beratungsstelle/Beratungsform unabhängig); ADR-002 (stille Mitgliedschaft); `ORISO-UserService/CONTEXT.md`; AgencyService `Agency`, `agency_topic`; TenantService `tenant.content_impressum` / `content_privacy`; `CentralDataProtectionTemplateService`

---

## Kontext

Ein „Fachbereich“, etwa *Schuldnerberatung*, *Suizidprävention* oder *Schwangerschaft* innerhalb eines Beratungszentrums, ist im Fachmodell eine Kombination **Beratungsstelle × Thema**. Sie muss ein **eigenes individuelles Impressum und eine Datenschutzerklärung** enthalten. Mehrere Fachbereiche arbeiten wirtschaftlich unter einem Dach, sind rechtlich aber getrennt.

Heute im Code:
- `agency_topic` ist eine einfache Zuordnung **ohne `UNIQUE(agency_id, topic_id)`**. Dasselbe Thema kann mehrfach mit einer Beratungsstelle verknüpft werden. Diese „doppelten Themen“ verhindern eine eindeutige Impressums-/Datenschutzerklärungszuordnung je Paar und machen das Routing mehrdeutig.
- **Das Impressum gilt nur je Mandant** (`tenant.content_impressum`). **Die Datenschutzerklärung ist Mandanteninhalt, ergänzt um Kontaktplatzhalter je Beratungsstelle** (`CentralDataProtectionTemplateService`). Beides lässt sich nicht je Fachbereich individualisieren.

Das Routing für stille Mitgliedschaft aus ADR-002 benötigt eine klare Zuordnung „Thema → genau ein Fachbereich → dessen Berater und Impressum/Datenschutzerklärung“.

## Entscheidung

1. **Der Fachbereich ist die eigenständige Einheit:** eine **eindeutige** Kombination aus agency_id und topic_id. `UNIQUE(agency_id, topic_id)` erzwingen. Doppelte Kombinationen werden zu **verhinderten Datenfehlern**, nicht zu unterstützten Fällen.
2. **`imprint_id` und `dpp_id` an den Fachbereich hängen**, individuell je Kombination, als Überschreibung/Ergänzung des Mandantenimpressums und der für die Beratungsstelle gerenderten Datenschutzerklärung.
3. **Die Themenauswahl in Admin wird eine Einfachauswahl** statt Mehrfachauswahl. Bestehende doppelte `agency_topic`-Zeilen werden **vor** der Eindeutigkeitsbedingung entfernt. ORISO ist vor Produktion und ohne echte Benutzer; Duplikate können gelöscht und neu angelegt werden, statt sie sorgfältig nachzubefüllen.
4. **Impressum/Datenschutzerklärung erhalten den Status `draft | published`.** Beratung darf auf Basis eines **Entwurfs/unveröffentlichten** Dokuments beginnen. Der Entwurfszustand wird als vorläufige Grundlage **im Audit/Protokoll erfasst**, statt dem Klienten als endgültiges Rechtsdokument angezeigt zu werden.

## Folgen

**Positiv:** Eindeutiges Routing vom Thema über einen Fachbereich zu Beratern und Rechtstexten. Die Anforderung eigener individueller Rechtstexte je Fachbereich wird erfüllt. Die Fehlerklasse doppelter Themen wird strukturell verhindert.

**Negativ / Aufwand:** Migration erforderlich: Duplikate bereinigen, `imprint_id`/`dpp_id` nachbefüllen, Eindeutigkeitsbedingung ergänzen. Das Impressum wird von reinem Mandanteninhalt zu einem Fachbereichsobjekt, mit neuen Tabellen/Spalten in AgencyService und/oder TenantService. Admin-Bedienung ändert sich durch Einfachauswahl und Bereinigung. Entwurf/Veröffentlicht bedeutet zusätzlichen Zustand.

## Erwogene Alternativen

- **Doppelte Themen mit je eigenem Impressum unterstützen:** Verworfen, weil „Thema → welcher der doppelten Fachbereiche?“ keine eindeutige Antwort hat. Die Fehlerklasse bleibt.
- **Impressum ausschließlich je Mandant behalten:** Verworfen, weil eine Individualisierung je Fachbereich unmöglich bleibt; genau das ist die rechtliche Anforderung.

## Implementierungsstand (2026-07-01)

Die Datenschutzerklärungshälfte ist bereits gebaut und auf `dev` in Betrieb (`agency_topic.content_dpp` und `publication_status`, `DepartmentDataProtectionService`, Commits `54fe868`/`a84e81a`). In einer grill-with-docs-Sitzung bestätigt: Die verbleibende Arbeit — `UNIQUE(agency_id, topic_id)` mit Bereinigungsmigration sowie die fehlende Impressum-Spalte je Fachbereich, die `imprint_id`-Hälfte — wird gemeinsam umgesetzt, da beides `agency_topic` betrifft. Siehe auch `ADR-009`: Das Thema bleibt global; nur die Rechtstexte gehören zum Fachbereich.

## Implementierungsstand (2026-07-03)

Am 2026-07-03 geprüft: `UNIQUE(agency_id, topic_id)`, Bereinigungsmigration und die Referenzspalten `imprint_id`/`dpp_id` existieren NUR auf dem veralteten lokalen Branch `feat/adr-003-department-agency-topic-unique` in ORISO-AgencyService. Seine Basis liegt 55 Commits hinter `dev`, vor AVV. Sein Changeset-Verzeichnis `0021_agency_topic_department` kollidiert mit `0021_agency_topic_legal` auf Dev, und sein SQL enthält kein `IF NOT EXISTS`. Dev speichert die Datenschutzerklärung direkt (`agency_topic.content_dpp`); der lokale Branch verwendet Referenzen. Dies widerspricht sich und erfordert Rebase, Umnummerierung und eine Abgleichentscheidung. Empfehlung: direktes `content_dpp` behalten, `dpp_id` entfernen; Impressum entsprechend direkt als `content_imprint` speichern. Eigenes Impressum je Fachbereich wurde nirgends begonnen. `AgencyTopicRepository.findByAgency_IdAndTopicId` setzt bereits Eindeutigkeit voraus (`Optional`-Rückgabe). Verfolgt als ORISO-UserService#203 unter EPIC #205.

## Implementierungsstand (2026-07-07)

Der Hinweis vom 2026-07-03 oben ist **ersetzt**: Sein empfohlener Abgleich wurde durchgeführt, und das gesamte Backend liegt jetzt auf `dev`. Der veraltete Referenzspaltenbranch wurde aufgegeben.

- **AgencyService fertig, auf `dev`:** Changeset `0023_agency_topic_department` bereinigt Duplikate, ergänzt `UNIQUE(agency_id, topic_id)` mit Schutzbedingung `onFail=MARK_RAN` sowie die direkten Spalten `content_imprint` und `publication_status_imprint`, entsprechend den vorhandenen `content_dpp`/`publication_status` aus `0021`. Die Referenzspalten `dpp_id`/`imprint_id` wurden wie empfohlen entfernt. `AgencyTopic` enthält alle vier Felder mit `@PrePersist`-Schutz gegen NULL. Die Admin-API bietet **Lesen und Veröffentlichen** je Fachbereich für beide Rechtstexte (Commit `a2e638f`, gegen IDOR auf die Beratungsstellen des Aufrufers begrenzt). Der öffentliche, nur veröffentlichte Leseweg ist `DepartmentLegalService`, eingebunden in `AgencyController`. Entwurf oder noch nie verfasst → `null`.
- **Admin-Frontend — PR geöffnet:** Die Themenauswahl wird **Einfachauswahl** statt Mehrfachauswahl, der letzte offene Abnahmepunkt von #203. Der Versuch vom 2026-06-26 (`02435c3`) wurde nie gemergt und `dev` entwickelte sich weiter. Daher wurde die Änderung neu auf aktuellem `dev` aufgebaut und gehärtet: Die zuvor in `addAgencyData.ts`, `updateAgencyData.ts` und der Bearbeitungsseite doppelte ID-Normalisierung wurde in `normalizeTopicIds()` vereinheitlicht. Tests wurden ergänzt, wo vorher keine bestanden; `updateAgencyData.ts` hatte vor diesem PR null Tests. Siehe [ORISO-Admin#245](https://github.com/OpenResilienceInitiative/ORISO-Admin/pull/245) (`fix/adr-003-agency-single-topic-picker`), noch nicht gemergt.

Nach diesem Teil bleibt die Anzeige von Fachbereichsimpressum/-datenschutzerklärung für Klienten. Sie gehört zur umfassenderen Klientenansicht für Fallübergabe (#204), nicht zum engeren ADR-003-Umfang.
