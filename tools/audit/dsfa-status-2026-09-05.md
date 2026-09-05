# DSFA — Bestandsaufnahme 05.09.2026

Basis: `ORISO-Docs` Branch `docs/dsfa-structure-2026-09` (Abzweig `origin/dev` @ 6b8d699),
Quelltexte `oriso-platform/dsfa-text/`, Bauwerkzeug `tools/build-dsfa-page.py`,
Live-Stand `https://understand.oriso.org/legal/dsfa/`, Faktenbasis
`oriso-platform/dsfa-analysis/` und `0 - Docs/artifacts/dsfa-2026-08-13/`.

---

## 1 Wie die DSFA heute gebaut wird

| Schritt | Wo | Anmerkung |
|---|---|---|
| Quelltexte (Single Source of Truth) | `oriso-platform/dsfa-text/kap-0*.md` | fünf Kapiteldateien, deutsch, juristisches Präsens/Passiv |
| Betreiber-Entwürfe | `oriso-platform/dsfa-text/vorlagen-betreiber.md` | elf Slots, identisch geschnitten zu `DPIA_SECTIONS` im Admin-Panel |
| Startinhalt DSFA-Editor | `oriso-platform/dsfa-text/dsfa-editor-defaults.ts` | dieselben Entwürfe als TipTap-HTML |
| Belege | `oriso-platform/dsfa-text/evidence-map.yaml` | 82 Einträge, je Aussage Repo/Pfad/Zeilen/`expect` |
| Rahmen (Kopf, Stile, Icons, Evidenz-Dialoge, Druck-Layout) | `0 - Docs/artifacts/dsfa-2026-08-13/dsfa-page-v2.html` | wird byteweise übernommen, nur die Kapitelstrecke wird ersetzt |
| Bauskript | `tools/build-dsfa-page.py` | `DSFA_TEMPLATE` / `DSFA_OUT` per Umgebungsvariable |
| Test | `tools/test_build_dsfa_page.py` | `python3 -m unittest test_build_dsfa_page` |

**Live auf dem UA-Server (49.13.11.37):**
`/var/www/legal/dsfa/index.html` (342 494 Bytes, 17.08.2026 10:28) ist **byte-identisch** mit
`0 - Docs/artifacts/dsfa-2026-08-13/dsfa-page-v3.html` (MD5 `1373952e…`) — die ausgelieferte
Fassung ist also **v3**, gebaut am 17.08.2026. Daneben liegen `dsfa-oriso.pdf` (1,29 MB, gleicher
Stand), die v2-Sicherung `index.html.bak-v2-20260817b` und das ältere Verzeichnis
`/var/www/legal/dsfa-v2/` (v2, 260 828 Bytes). Der Server wird per SSH beschickt, es gibt keine CI.

**Ungemergte Arbeit auf `docs/dsfa-text-2026-08-17`: nein.**
`git log origin/dev..docs/dsfa-text-2026-08-17` ist leer, `git diff origin/dev...` ebenfalls. Der
Branch und sein Worktree `_worktrees/ORISO-Docs-dsfa-text` (e5d2d94) sind vollständig in `dev`
angekommen; der Worktree ist sauber. Er kann abgeräumt werden.

---

## 2 Kapitelliste — Status, Zuständigkeit, Belege

Zuständigkeit: **T** = technisch, von ORISO gepflegt · **O** = organisatorisch, vom Träger zu
ergänzen (Bearbeitung im Administrationsbereich ist zurückgestellt).

| Kap. | Titel | Status | Zust. | Belege |
|---|---|---|---|---|
| 1 | Einleitung, Scope, Stammdaten | fertig, Stammdaten als Vorgabesatz | **O** | Live-Abruf `GET /tenant/public/dpia` über `/api/dpia`; Vorgabewerte in `build-dsfa-page.py` (`MASTER_DATA`) |
| 2 | Schwellwertanalyse | fertig; 2.3 Ergebnisabsatz = Entwurf | **T** (2.3 **O**) | keine Code-Belege nötig, Herleitung normbasiert |
| 3 | Kontext und Kennzahlen | Platzhalter — Kennzahlen sind Vorgabewerte | **O** | Kennzahlen-Kacheln füttert der Live-Abruf; ohne Betreiber-Daten leer |
| 4 | Akteure, Rollen, Governance | 4.1–4.4 fertig; 4.5 Entwurf | **T** + 4.5 **O** | Rollenmodell aus 6.5 |
| 5 | Verantwortlichkeit | Entwurf mit offenen Klammern | **O** | — |
| 6 | Verfahren und Technik | fertig, das Herzstück (19 Abschnitte) | **T** | 82 Einträge in `evidence-map.yaml`, davon 6.9 E2EE 8, 6.13 Fallübergabe 11, 6.18 Löschung 10, 6.17 Betrieb 7; 18 ⓘ-Dialoge in der Seite |
| 7 | Rechtsgrundlagen | fertig (7.1–7.6), preset-fähig | **T** | Verarbeitungsschritte aus Kap. 6; Normen-Mapping KDG↔DSGVO |
| 8 | Betroffenenrechte | 8.4–8.10 + 8.12 fertig; 8.1, 8.3, 8.11 Entwurf | **T** + 8.1/8.3/8.11 **O** | 1 Beleg (8.6 Löschkette, `needs-live-verification`); Verweise nach 6.18 |
| 9 | Verhältnismäßigkeit | vier Entwürfe (9.1–9.4) | **O** | — |
| 10 | Ergebnis | fertig, unter Vorbehalt der Anlagen | **T** | acht benannte Bedingungen |
| A1 | Anlage 1 — Risiken und Maßnahmen | Entwurf aus der Vorlage | **T** | Risikomatrix des DCV-Originals fehlt weiterhin |
| A2 | Anlage 2 — Löschkonzept | **existiert nicht** | **T** + **O** (Fristen) | blockiert Kap. 6.18, 8.6 und 10 |
| A | Anlagenverzeichnis | Entwurf | **O** | — |

Belegstatus über alle 82 Einträge: 66 `live`, 8 `needs-live-verification`,
5 `disabled-by-default`, 3 `not-deployed`.

---

## 3 Entscheidungspunkte aus dem Plan vom 13.08. — Stand heute

| # | Punkt (Plan §5) | Stand 05.09.2026 |
|---|---|---|
| 1 | Termine: entfallen oder geplant? | **offen.** ADR-020 existiert, Feature nicht ausgeliefert; 6.2.6 führt es als „nicht ausgeliefert". |
| 2 | Anonyme Beratung ohne Registrierung | **erledigt.** Anonymer Live-Einzelchat beschrieben (6.2.2). |
| 3 | Gast-Teilnahme an Videocalls | **offen.** In 6.10 nicht behauptet, also kein Fehler im Dokument — aber unentschieden. |
| 4 | Neusta-Fragenpaket (At-rest, Backup, Prod-Zugriff, Sub-AV) | **weitgehend erledigt.** TOM-Bogen zum AVV vom 14.08. ausgefüllt; die zwei Auftragsverarbeiter stehen im Bauskript (`PROCESSOR_ROWS`). Rest: Passwortrichtlinie/Brute-Force im Realm. |
| 5 | Sentry self-hosted oder SaaS | **offen**, 6.17 lässt es offen. |
| 6 | DCV-Anlagen nachbeschaffen | **offen.** Anlage 1 und 2 fehlen weiterhin. |
| 7 | Datenschutzklassen I–III übernehmen? | **entschieden: nein** (README „bewusst nicht geschriebene Aussagen"). |
| 8 | Scope: nur KDG live oder beide Presets | **erledigt.** Umschalter arbeitet, 54 Normzitate umschaltbar. |

Zusätzlich aus dem Shipping-Plan v2.0.4: **Synapse D1–D7** (TURN-Ersatz, Presence, Read Receipts,
`media_retention`, Backup-Konzept Hetzner, Log-Frist) sind in Helm#282 dokumentiert und **offen** —
`templates/matrix/matrix-configmaps.yaml` enthält bis heute keinen `media_retention`-Block.

---

## 4 Was mit diesem Branch geändert wurde

1. **Sichtbare Trennung technisch/organisatorisch.** Neue Markerzeile `:::technisch` bzw.
   `:::organisatorisch <Zusatz>` in den Quelltexten; `build-dsfa-page.py` rendert daraus eine
   Kennzeichnung am Kapitelanfang. Kapitel ohne eigene Quelldatei (1, 3, Anlage 1) bekommen die
   Kennzeichnung im Bauskript. Ergebnis der Fassung vom 05.09.: 7 technische, 13 organisatorische
   Kennzeichnungen.
2. **Organisatorische Abschnitte tragen einen Platzhalter statt halbfertigem Text.** Jeder
   Betreiber-Slot rendert jetzt als Kennzeichnung + kurzer Hinweis + eingeklappter Entwurf
   (`<details>`, „Entwurfstext einblenden"). Der Entwurf ist nicht gelöscht — er steht weiter in
   `vorlagen-betreiber.md` und `dsfa-editor-defaults.ts` —, steht aber nicht mehr im Lesefluss.
   Elf solcher Abschnitte.
3. **Belegketten-Regel** in `oriso-platform/dsfa-text/README.md` (fünf Sätze): drei Verankerungen
   je Funktion, drei Linktypen, Eintrag in `evidence-map.yaml`, `status` steuert die Formulierung,
   organisatorische Anteile gehören in `vorlagen-betreiber.md`.
4. **Case Handover als erste Funktion nach dieser Regel** verankert (Abschnitt 5).
5. **Zwei überholte Aussagen korrigiert** (Abschnitt 6).
6. Fünf neue Tests in `tools/test_build_dsfa_page.py`; alle sieben laufen grün.

Vorschau: `tools/audit/dsfa-preview-2026-09-05.html` (nicht eingecheckt — Bauartefakt; das Repo
hat keine `.gitignore`, deshalb bleibt die Datei bewusst untracked).

---

## 5 Belegkette Case Handover

| Ebene | Beleg |
|---|---|
| Verarbeitungstätigkeit | DSFA 6.13 (2)–(8) |
| Zugriffskontrolle | DSFA 6.13 (4), ADR-002 (Vorhang ist Zugriffskontrolle, nicht Kryptografie) |
| Betroffenenrechte | DSFA 8.4 (Auskunft), Zustimmungsdialog je Grund |
| Funktionsseite | `https://docs.oriso.org/produkt/core-features/case-handover` |
| Entscheidungen | `ADR-002-…-access-control-curtain.md` inkl. Addendum 05.09.2026, `ADR-016-…`, `ADR-022-…` — nach Dateiname zitiert, nie nach Nummer |
| Code | `CaseHandoverController.java#L39-L131`, `CaseHandoverReasonPolicy.java#L33-L34`, `CaseHandoverLogsService.java#L33-L109`, `case-handover-request.sql#L52-L100` (jeweils `blob/dev`) |
| Maschinenlesbar | fünf neue Einträge `case-handover-*` in `evidence-map.yaml` |

**Wichtiger Ist-/Soll-Befund:** Die öffentliche Funktionsseite und das ADR-Addendum beschreiben
anlassneutrale Gründe (`PLANNED_ABSENCE`, `UNPLANNED_ABSENCE`, `ASSIGNMENT_ENDED`,
`ADVICE_REQUESTED`) und die Richtung „Fall abgeben". **Beides ist im Code nicht vorhanden.**
Ausgeliefert sind weiterhin `COUNSELLOR_IS_ILL`, `COUNSELLOR_ON_HOLIDAY`, `OTHER_EMERGENCY`,
`COUNSELLOR_ASKED_FOR_ADVICE`, `COUNSELLOR_LEFT`
(`0057_case_handover_request/case-handover-request.sql`). „Fachkraft erkrankt" ist ein
Gesundheitsdatum über die **beratende** Person und wandert bis in den Raum der ratsuchenden
Person — die Art.-9-Vermeidung ist also **entschieden, aber nicht gebaut**. Die DSFA benennt das
jetzt als Beschlusslage (`status: not-deployed`), nicht als Ist-Zustand.

---

## 6 Offene Punkte, die aus dem Code belegbar waren — eingearbeitet

| Punkt | Alter Stand im Dokument | Neuer Stand + Beleg |
|---|---|---|
| Benachrichtigungen ohne Aufbewahrungsfrist | „Eine automatische Aufbewahrungsfrist besteht derzeit nicht; die Datensätze werden beim Löschen des Kontos nicht mitgelöscht." | **Überholt.** 90 Tage nach Kenntnisnahme / 365 Tage absolut, nächtlicher Lauf 03:15, je Umgebung konfigurierbar (`application.properties:94-102`, `EventNotificationRetentionService`); Konto-Löschung entfernt die Zeilen (`DeleteAskerEventNotificationsAction`, `DeleteConsultantEventNotificationsAction`). Fristen sind DSFA-Vorschlag, Sign-off offen. |
| Fallübergabe-Protokolle | keine Aussage zur Frist | **Keine Frist vorhanden** — belegt durch Abwesenheit in `application.properties` und den nur kontobezogenen Löschschritt; gehört ins Löschkonzept. Zum Vergleich benannt: Break-Glass-Protokolle 12 Monate (`SUPPORT_ACCESS_AUDIT_RETENTION_MONTHS`, Helm-Default). |

Nicht angefasst, weil bereits korrekt belegt: Backup-Fristen 30 Tage / 7 Tage (6.17), Megolm
dauerhaft an (6.9), Synapse mit offener Registrierung (6.17).

---

## 7 Entscheidung nötig (Frank)

1. **Anlage 2 Löschkonzept** — ohne sie bleiben Kap. 6.18, 8.6 und 10 unter Vorbehalt. Beim DCV
   nachbeschaffen oder selbst schreiben?
2. **Aufbewahrungsfrist für Fallübergabe-Protokolle** — technisch existiert keine; Wert ist eine
   Entscheidung des Verantwortlichen, nicht ableitbar.
3. **Sign-off der Fristen 90/365 Tage** für Benachrichtigungen (US#1015) durch die
   Datenschutzbeauftragung.
4. **Aufbewahrungsfrist für Team-Besprechungs-Archive und Supervisions-Notizen** — beide heute
   unbefristet lesbar (6.13, ADR-008).
5. **Umsetzungstermin der anlassneutralen Übergabegründe.** Das Addendum sagt „vor Go-Live, nicht
   danach"; bereits gesendete Raum-Ereignisse sind unveränderlich. Ticket fehlt.
6. **Termine (ADR-020)** — dauerhaft entfallen oder vor Go-Live einplanen?
7. **Gast-Teilnahme an Videocalls** — wollen wir das?
8. **Sentry self-hosted oder SaaS** (Drittland-/AV-Frage).
9. **Synapse D1–D7** (Helm#282), insbesondere `media_retention` und die Log-Frist.
10. **Vier juristische Einordnungen** aus `dsfa-text/README.md`: Rechtsgrundlage der
    Team-Besprechung, anonyme Nutzung und Anwendungsbereich, Beschäftigtendatenschutz,
    Statistikereignisse mit Quasi-Identifikator-Set.
11. **Admin-Panel-Bearbeitung der organisatorischen Kapitel** — heute zurückgestellt; die
    Kennzeichnung sagt „folgt". Wann wird daraus ein Ticket?
12. **Neubau und Ausrollen der Seite** (v4) auf `understand.oriso.org` — der Live-Stand ist v3
    vom 17.08. und kennt die Trennung noch nicht.
