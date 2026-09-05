# Audit der Entwicklerdokumentation — 05.09.2026

Interner Prüfbericht, **nicht Teil der Navigation**: `docs/platform/reports/` steht in keiner
Gruppe von `docs.json` und wird deshalb von `site/scripts/sync-content.mjs` nicht in die Site
übernommen. Geprüft wurde der Stand `docs/dev-dokumentation-2026-09` auf Basis `origin/dev`
(6b8d699), Code-Abgleich gegen `origin/dev` der Repositories unter `~/ORISO/ORISO-*`.

Prüfwerkzeug: `tools/audit/docs-link-check.mjs` — arbeitet offline, prüft
(1) ob jede Seite aus `docs.json` eine Quelldatei hat, (2) jeden Link im **erzeugten**
Seitenbaum so, wie die Site ihn auflöst, (3) jeden GitHub-`blob`-Link gegen den lokalen
Checkout (Ref vorhanden? Pfad vorhanden? Zeilenbereich innerhalb der Datei?).

```bash
node tools/audit/docs-link-check.mjs            # Zusammenfassung
node tools/audit/docs-link-check.mjs --markdown # Tabellen für diesen Bericht
node tools/audit/docs-link-check.mjs --strict   # Exit 1 bei Fund (CI-tauglich)
```

---

## 1. Kennzahlen vorher / nachher

| Kennzahl | vorher | nachher |
| --- | ---: | ---: |
| Seiten in `docs.json` | 79 | 81 |
| davon ohne Quelldatei | 0 | 0 |
| Erzeugte Seiten (inkl. ADR) | 104 | 106 |
| Links gesamt | 619 | 829 |
| davon geprüfte Code-Links auf GitHub | 0 | **123** |
| **Tote interne Links** | **545** | **0** |
| Tote Anker | 0 | 0 |
| Tote Code-Links | 0 | 0 |
| Fehlende Bilddateien | 0 | 0 |

545 von 611 internen Links waren tot — 89 %. Das ist genau der Befund „viele Links
funktionieren nicht gut“, und er hatte **eine** Ursache (Abschnitt 2).

Verteilung der toten Links vorher: Plattform-Tab 334, Produkt-Tab 124, Betrieb-Tab 86.
Spitzenreiter waren die 12 Repository-Graph-Seiten und `overview` mit je 15 toten Links —
das ist der auf jeder Seite wiederholte Block „Platform Navigation“.

## 2. Ursache der toten Links

Die Seiten stammen aus einer Mintlify-Navigation und verlinken auf zwei Arten, von denen im
Fumadocs-Baum **keine** stimmt:

| Form im Quelltext | Beispiel | Warum tot |
| --- | --- | --- |
| Mintlify-Seiten-ID, absolut | `/oriso-platform/troubleshooting` | diesen Pfad gibt es auf der Site nicht; die Seite liegt unter `/betrieb/operations/troubleshooting` |
| Repository-Nachbardatei, relativ | `./backend-services.md` | `sync-content.mjs` legt Seiten in **Gruppenordner**; Nachbarn im Repo landen in verschiedenen Ordnern |
| Datei, die keine Seite ist | `./diagrams/auth-flow.mmd` | wird nie übernommen |
| Anker mit Nummern | `#4-5-4-multi-recipient-send` | der Renderer bildet `4.5.4` auf `454` ab |

**Behoben in `site/scripts/sync-content.mjs`**: das Skript kennt die Abbildung
Seiten-ID → Ziel-URL und schreibt jetzt beim Übernehmen alle vier Formen um —
Seitenlinks auf die echte URL, Anker gegen die tatsächlichen Überschriften der Zielseite,
Repository-Dateien ohne Seite auf ihren GitHub-Blob-Link. Nicht auflösbare Ziele meldet
das Skript beim Lauf.

Zwei Nebenbefunde derselben Klasse:

- `site/content/docs/index.mdx` (handgeschrieben, nicht generiert) verlinkte
  Gruppenordner-URLs hart und wäre bei jeder Umbenennung einer Gruppe gebrochen — korrigiert
  und um die neue Einstiegsseite ergänzt.
- Jede Seite trug ihre H1 doppelt (Frontmatter-Titel **und** `# …` im Text). Das Sync-Skript
  entfernt die zweite jetzt, wenn sie dem Titel entspricht.

## 3. Neuer Tab öffnen — kein Bauteil nötig

Geprüft: `site/app/(docs)/[[...slug]]/page.tsx` reicht `a: createRelativeLink(...)` durch,
Fumadocs' Standard-`a` ist `fumadocs-core/link`, und der rendert für alles mit Protokoll
`target="_blank" rel="noreferrer noopener"`. Eine eigene `CodeRef`-Komponente ist damit
**nicht nötig** — und wäre schädlich, weil die Kernseiten `.md` sind und dort kein JSX
erlaubt ist. Code-Verweise sind deshalb normale Markdown-Links auf
`https://github.com/OpenResilienceInitiative/<Repo>/blob/dev/<Pfad>#L<von>-L<bis>`; sie
funktionieren zusätzlich unverändert in der GitHub-Ansicht des Repos.

Alle 123 dieser Links sind vom Prüfskript gegen `origin/dev` verifiziert: Pfad existiert,
Zeilenbereich liegt in der Datei. Wichtig für die Zukunft: das Skript zieht bewusst die
**Remote-Tracking-Ref** vor, weil lokale `dev`-Branches in mehreren Checkouts Monate
zurückliegen und sonst Fehlalarme erzeugen.

## 4. Diagramme

Mermaid, als ```` ```mermaid ````-Zaun direkt in der Markdown-Quelle. `sync-content.mjs`
wandelt den Zaun beim Übernehmen in `<Mermaid chart={…} />` (JSON-String, damit MDX nichts
zerlegt) und schaltet die Zieldatei auf `.mdx`; `site/components/mermaid.tsx` zeichnet ihn
im Browser, hell/dunkel passend, mit `securityLevel: 'strict'`. Der Zaun bleibt in der
Quelle stehen — GitHub rendert ihn nativ, ein Diagramm-Diff bleibt also im PR lesbar.

Neu dazugekommen: `mermaid@11.17.2` als Abhängigkeit von `site/`.

Acht Diagramme, jedes auf der Seite, die es erklärt (kein Sammel-Anhang):
Servicelandschaft mit Aufrufrichtung, Login-/Token-Fluss, Tenant-Auflösungskette,
Leseweg durch einen Dienst, Datenhoheit, Deploy-Pfad, Request-Weg im Browser,
Aufbau der Wissensgraphen.

## 5. Seitenbewertung

### 5.1 Plattform-Architektur (der Auftrag)

| Seite | Stand vorher | tote Links vorher | Befund | Maßnahme |
| --- | --- | ---: | --- | --- |
| `overview` | 28.05. | 15 | reine Linkliste, keine Einstiegsführung | **neu geschrieben** als Hub mit 3-Klick-Pfad |
| `install-and-run-locally` | — | — | fehlte komplett | **neu**: Voraussetzungen aus `.nvmrc`/`engines`/`pom.xml`, Klonreihenfolge, drei Tracks, lokaler Runner |
| `architecture` | 28.05. | 15 | Datei-Dumps ohne Links; keine Aufrufrichtungen | **neu geschrieben**: Diagramm, Owner-Tabelle, „Wo greife ich ein?“ |
| `backend-services` | 28.05. | 15 | 431 Zeilen Pfad-Dumps | **neu geschrieben**: pro Dienst Verträge, Security, Peers, Zahlen |
| `frontend-admin-overview` | 28.05. | 15 | 100+ Dateinamen ohne Kontext | **neu geschrieben**: Request-Weg, Runtime-Config-Falle, Storybook-Schleife |
| `authentication-and-keycloak` | 28.05. | 15 | Realm-Tabellen brauchbar, Rest 80 Zeilen Pfadliste | **neu geschrieben**: Sequenzdiagramm, Resolver-Kette, Fehlerbilder |
| `database-and-data-model` | 28.05. | 15 | Schema-Tabelle brauchbar | **neu geschrieben**: Hoheitsdiagramm, FK-Falle, Eingriffstabelle |
| `kubernetes-deployment` | 28.05. | 15 | **veraltet**: beschreibt ORISO-Kubernetes und Subdomains als Ist-Zustand | **neu geschrieben** auf ORISO-Helm + Pfad-Routing; Altstand als „Historisch“ markiert, ADR-011 verlinkt |
| `diagrams` | 28.05. | 15 | 9 Links auf `.mmd`-Dateien, alle tot | **neu**: Index auf die In-Page-Diagramme + Hinweis auf die Altquellen |
| `tenant-lifecycle` | 28.05. | 15 | inhaltlich plausibel | Nav-Block entfernt, Links repariert |
| `repository-map` | 28.05. | 15 | Zahlen aus dem Graph-Snapshot Mai 2026 | Hinweis „teilweise veraltet“ |
| `troubleshooting` | 28.05. | 15 | brauchbar | Nav-Block entfernt |
| `understand-anything` | — | — | fehlte | **neu**: was der Graph ist, was er bringt, wie eine Seite daraus entsteht |
| `local-development` | 28.05. | 15 | von der neuen Install-Seite überholt | **Archiv** + Hinweis |
| `onboarding-guide` | 28.05. | 15 | 5-Tage-Plan, als Einstieg überholt | **Archiv** + Hinweis |
| `user-management-flow` | 28.05. | 15 | **falsch**: beschreibt Rocket.Chat, das der Code nicht mehr enthält | **Archiv** + Warnhinweis, ADR-004/017 verlinkt |
| `super-graph-index` / `-explorer` / `-detailed` | 28.05. | je 15 | interner Merge-Dump Mai 2026, 4.611 Zeilen allein `-detailed` | **Archiv** + Hinweis auf understand.oriso.org |
| `understand-anything-inventory` | 28.05. | 15 | Datei-für-Datei-Inventar von Build-Artefakten — für Leser wertlos | **Archiv** + Hinweis |
| `graph-validation-report` | 28.05. | 15 | Snapshot-Zahlen Mai 2026 | **Archiv** + Hinweis |
| `repo-graphs/*` (12 Seiten) | 14.08. | je 15 | dupliziert, was die Dashboards nächtlich erzeugen | **Archiv**, nichts gelöscht |

### 5.2 Produkt-Tab (20 Seiten, alle 28.05.)

Inhaltlich nicht geprüft — das ist Produktbeschreibung, nicht Codewahrheit, und stand
nicht im Auftrag. Mechanisch: 124 tote Links, davon der größere Teil Anker der Form
`#4-5-4-…`. Alle repariert durch die Anker-Auflösung im Sync-Skript. Empfehlung: eine
inhaltliche Durchsicht gegen den heutigen Funktionsstand separat beauftragen.

### 5.3 Betrieb & Einrichtung (24 Seiten)

10 Seiten vom 20.01., 14 vom 21.06. 86 tote Links, alle vom Typ „Mintlify-Seiten-ID“,
alle repariert. Inhaltlich zwei Konflikte mit dem Code, die eine Entscheidung brauchen
(Abschnitt 7): die Deploy-Kapitel beschreiben teils den Subdomain-Stand aus
ORISO-Kubernetes, den ADR-011 abgelöst hat.

## 6. Inhaltliche Abweichungen Doku ↔ Code

Gegen `origin/dev` der Repositories geprüft:

| Aussage in der Doku | Realität im Code | Fundort |
| --- | --- | --- |
| Java 11 und Java 17 für die Dienste | **Java 21** in allen vier `pom.xml` und in `release-image.yml` | `services-local-setup/ORISO-local-development-runbook.md`, `README.md` |
| Frontend-Node aus einem 18.x-Pfad | `.nvmrc` = **22.12.0**, `engines` = `>=22 <23` | `services-local-setup/run-oriso-local.sh` (`ORISO_FRONTEND_NODE_BIN`) |
| Deployment über ORISO-Kubernetes, Subdomains `app./admin./api./auth.` | ORISO-Helm, ein Host, Pfad-Prefixe `/admin`, `/auth`, `/service/*` | `docs/platform/kubernetes-deployment.md` (korrigiert), Teile des Betrieb-Tabs (offen) |
| Rocket.Chat im User-Management-Flow | Matrix; Rocket.Chat nur noch als Altlast in ORISO-Kubernetes-Ingress | `docs/platform/user-management-flow.md` (archiviert) |
| „21 Dienste per Helm“ (Repo-README) | Chart `online-counseling` 2.0.1; die Zahl stimmt so nicht mehr | `README.md` — nicht angefasst, siehe Abschnitt 8 |
| Repo-README verweist auf `docs.oriso.site` und `mint dev` | Site ist Fumadocs unter `site/`, live auf `docs.oriso.org` | `README.md` — offen |

Nicht prüfbar, weil kein lokaler Checkout existiert: **ORISO-Database**. Die Seite
`database-and-data-model` verweist deshalb für Schemadateien auf die Kopien im Helm-Chart
(dort verifiziert) und nennt ORISO-Database nur ohne Zeilenlink.

Ohne `dev`-Branch, also für `blob/dev`-Links ungeeignet: **ORISO-E2E** und **ORISO-Infra**.
In den neuen Seiten wird deshalb nicht in diese beiden Repos hinein verlinkt.

## 7. Offene Entscheidungen

1. **Betrieb-Tab gegen ADR-011 nachziehen.** Die Deploy-Kapitel (`deploy-*`, `dns-ssl`,
   `network-firewall`) beschreiben stellenweise noch das Subdomain-Modell. Das ist eine
   eigene, größere Runde und war nicht beauftragt.
2. **Repo-`README.md`** nennt Mintlify, `mint dev` und `docs.oriso.site`. Ein Ersetzen
   berührt die Erwartungen aller, die das Repo bisher so benutzt haben — bewusst nicht
   einseitig geändert.
3. **Produkt-Tab inhaltlich prüfen** (20 Seiten, Stand 28.05.).
4. **Archiv-Gruppe:** 20 Seiten stehen jetzt unter „Archive“, nichts wurde gelöscht.
   Wenn sie stattdessen ganz aus der Navigation sollen, ist das ein Einzeiler in
   `docs.json` — aber dann sind sie nur noch im Repo auffindbar.
5. **Link-Check in CI.** `--strict` gibt Exit 1 zurück. Ein Job in
   `.github/workflows/` würde verhindern, dass die 545 wiederkommen; er braucht aber die
   Nachbar-Checkouts oder Netzzugriff und ist deshalb noch nicht eingerichtet.

## 8. Nicht gemacht

- Kein Push, keine PRs — auftragsgemäß.
- `README.md` des Repos unverändert (siehe 7.2).
- Produkt- und Betriebs-Seiten nur mechanisch repariert, nicht inhaltlich überarbeitet.
- Keine Server-, Zugangs- oder Ticket-Interna in den öffentlichen Seiten; die
  Understand-Anything-Seite nennt nur das öffentliche Dashboard, keine Hosts, Pfade oder
  Pipelines.
- Keine `CodeRef`-Komponente (Abschnitt 3 begründet, warum sie schädlich wäre).
