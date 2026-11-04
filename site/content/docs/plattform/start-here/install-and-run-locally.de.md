---
title: "Installieren und lokal starten"
description: "Der Einstieg für neue Entwickler: Voraussetzungen, Repositories und der erste startbare Befehl für Frontend, Admin und Backend."
source: "docs/platform/install-and-run-locally.md"
---

Beginne hier. Diese Seite führt dich von einem noch nicht eingerichteten Rechner zu einem laufenden Teil von ORISO. Wähle einen der drei Wege passend zu deinem ersten Ticket. Die anderen brauchst du erst später.

Die Laufzeitversionen unten stammen aus den Service- und UI-Quellen auf `dev`.
Die Überarbeitung des lokalen Runners wird in [ORISO-Docs Issue 48](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/48)
und [PR 142](https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/142) geführt.
Die lokale API-/Admin-Basis wurde am 01.10.2026 mit Runner-Revision
[`bd6250215d6f`](https://github.com/OpenResilienceInitiative/ORISO-Docs/tree/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0)
geprüft. Der [Prüfbeleg](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0/services-local-setup/verification/2026-10-01-reviewed-baseline.json)
hält die genauen Service-/UI-Commits und den Umfang fest. Verwende diese Commits,
um den Lauf zu wiederholen; ein neuerer `dev`-Checkout kann abweichen.
Quellprüfung, lokale Ausführung und ein veröffentlichter Release sind getrennte
Nachweise.

## Wähle deinen Weg

| Dein Arbeitsbereich | Weg | Benötigt |
| --- | --- | --- |
| Oberfläche der Beratungsanwendung | [Frontend](#track-a-frontend) | Nur Node oder Node mit einem erreichbaren Backend |
| Admin-Oberfläche | [Admin](#track-b-admin-panel) | Node und Backends (lokal oder in der gemeinsamen Dev-Umgebung) |
| Ein Spring-Boot-Service | [Backend](#track-c-a-backend-service) | JDK, Docker, Datenbanken, Keycloak |
| Der gesamte Stack | [Vollständiger lokaler Stack](#the-full-local-stack) | Alles oben Genannte |

## Voraussetzungen

| Werkzeug | Version | Quelle der Version |
| --- | --- | --- |
| Node.js | 22.12.0 | [`ORISO-Frontend/.nvmrc`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/.nvmrc) und [`ORISO-Admin/.nvmrc`](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/dev/.nvmrc) |
| Versionsbereich im engine-Feld | `>=22 <23` (frontend), `^22.12.0` (admin) | [`ORISO-Frontend/package.json#L11-L13`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/package.json#L11-L13), [`ORISO-Admin/package.json#L6-L8`](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/dev/package.json#L6-L8) |
| JDK | 21 | [`ORISO-UserService/pom.xml#L28`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/pom.xml#L28), [`ORISO-AgencyService/pom.xml#L29`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/pom.xml#L29), [`ORISO-TenantService/pom.xml#L30`](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/dev/pom.xml#L30), [`ORISO-ConsultingTypeService/pom.xml#L31`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/pom.xml#L31) |
| Maven | keine separate Installation — jeder Service enthält `./mvnw` | die Service-Repositories |
| Python | 3.10 oder neuer | der lokale Runner |
| Docker mit Compose | Compose v2 | mitgelieferte lokale Datenbanken, Cache, Warteschlange und Keycloak |
| Git, curl | beliebig | Klonen und Zustandsprüfungen |

`nvm use` liest in beiden UI-Repositories die `.nvmrc`. Jede JDK-21-Distribution ist
geeignet. `JAVA_HOME` und `PATH` müssen dasselbe JDK auswählen. Der Runner liest
`pom.xml` der gewählten Dienste und `package.json` der Oberflächen und bricht bei
einem Versionskonflikt ab.

## Repositories klonen

Service- und UI-Repositories müssen **nebeneinander in einem gemeinsamen
Workspace-Ordner** liegen. Git-Worktrees werden unterstützt. Der Runner darf in
einem getrennten Docs-Checkout oder Worktree liegen. Gib seinen Pfad und den
Quell-Workspace unten getrennt an. Die mitgelieferte lokale Basis benötigt keine
Checkouts von ORISO-Database, ORISO-Keycloak oder Deployment. ORISO-Frontend wird
nur benötigt, wenn es ausgewählt ist.

Klone die Service-Quellen von `dev`. Wähle bis zum Merge von PR 142 die geprüfte
Docs-Runner-Revision ausdrücklich aus. Setze nicht voraus, dass der Standardbranch
von Docs sie bereits enthält. Der Prüfbeleg nennt die Service-Revisionen des
lokalen Nachweises.

```bash
mkdir ORISO && cd ORISO

git clone https://github.com/OpenResilienceInitiative/ORISO-Docs.git
git -C ORISO-Docs checkout --detach bd6250215d6f4dbcb3d68a056a88f06a2277d0b0
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-UserService.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-TenantService.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-AgencyService.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-Admin.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-Frontend.git
```

Die Zuständigkeiten der Repositories findest du in der [Repository-Übersicht](/de/plattform/flows-und-reference/repository-map).

## Weg A: Frontend

```bash
cd ORISO-Frontend
nvm use            # 22.12.0
npm ci
cp .env.example .env
npm run dev        # dev server
```

`npm run dev` führt dieses Skript aus: [`scripts/start.js`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/package.json#L231);
`npm start` stellt dagegen die gebaute Anwendung über den Proxy in `proxy/server.js` bereit. API-Host, Matrix-URL, Cookie-Namen, LiveKit und Links zu Rechtstexten stammen aus
[`.env.example`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/.env.example) —
kopiere diese Datei und setze `REACT_APP_API_URL` auf dein lokales Gateway oder die gemeinsame Dev-API.

Für die Arbeit an Komponenten brauchst du kein Backend:

```bash
npm run storybook          # http://localhost:6006
npm run test:storybook     # the same stories as CI component tests
npm run test:unit
```

Storybook bietet den schnellsten Ablauf für visuelle Arbeit. Die Stories werden in CI als Komponententests ausgeführt; führe `npm run test:storybook` aus, um sie zu prüfen. Die Darstellung allein ist kein Testnachweis.

## Weg B: Admin-Oberfläche

```bash
cd ORISO-Admin
nvm use            # 22.12.0
npm ci --legacy-peer-deps
cp .env.example .env
npm start          # Vite, http://localhost:9000/admin
```

`npm start` führt zuerst `prestart` aus. Dieser Schritt schreibt die Laufzeitkonfiguration, die die Anwendung beim Start liest —
[`scripts/generate-runtime-env.js`](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/dev/scripts/generate-runtime-env.js).
Diese erzeugte Datei hat zur Laufzeit Vorrang vor `.env`. Prüfe sie zuerst, wenn eine Einstellung ignoriert erscheint. Entwicklungsserver und Proxy werden hier konfiguriert:
[`vite.config.ts`](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/dev/vite.config.ts).

Wie beim Frontend benötigt die reine UI-Arbeit kein Backend:

```bash
npm run storybook
npm run test:storybook
npm run lint
```

## Weg C: ein Backend-Service

Die Dienste werden mit Maven-Wrapper und JDK 21 gebaut. Verwende für lokale
Entwicklung vorzugsweise den verwalteten Runner unten. Er stellt lokale
Infrastruktur und die Dienstumgebung bereit. Der Runner wählt das Spring-Profil
`dev` und die Liquibase-Kontexte `dev,seed`. Ein gemeinsam unterstütztes Profil
`local` gibt es nicht für alle vier Dienste.

Das folgende manuelle Beispiel gilt nur für einen bereits lokal konfigurierten
Dienst. Starte zuerst seine Abhängigkeiten und gib ausdrücklich lokale Datenbank-,
Authentifizierungs- und Dienst-Endpunkte auf Loopback, Fixture-Zugangsdaten,
erforderliche Rückruf-URLs und Einstellungen der technischen Clients an. Der
Profilname `dev` bedeutet nicht, dass Ressourcen der gemeinsamen Dev-Umgebung
verwendet werden sollen. Der Befehl allein liefert diese Konfiguration nicht und
belegt keinen erfolgreichen Start:

```bash
cd ORISO-AgencyService
SPRING_LIQUIBASE_CONTEXTS=dev,seed ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev -DskipTests
```

Der Wrapper-Befehl hat für `ORISO-UserService`, `ORISO-TenantService` und
`ORISO-ConsultingTypeService` dieselbe Form. Jeder Dienst benötigt jedoch seine
eigene vollständige lokale Umgebung. Die Tabelle fasst Abhängigkeiten zusammen;
sie ist keine vollständige Startkonfiguration:

| Service | Benötigt | Vertrag |
| --- | --- | --- |
| [UserService](https://github.com/OpenResilienceInitiative/ORISO-UserService) | MariaDB `userservice`, Keycloak, URLs anderer Services; Matrix/Redis/RabbitMQ je nach Profil | [`api/userservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/api/userservice.yaml), [`api/useradminservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/api/useradminservice.yaml) |
| [AgencyService](https://github.com/OpenResilienceInitiative/ORISO-AgencyService) | MariaDB `agencyservice`, Keycloak, TenantService | [`api/agencyservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/api/agencyservice.yaml), [`api/agencyadminservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/api/agencyadminservice.yaml) |
| [TenantService](https://github.com/OpenResilienceInitiative/ORISO-TenantService) | MariaDB `tenantservice`, Keycloak, ConsultingType/ApplicationSettings/UserAdmin APIs | [`api/tenantservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/dev/api/tenantservice.yaml) |
| [ConsultingTypeService](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService) | MongoDB-Collections für Beratung und Anwendung, MariaDB `consultingtypeservice`, Keycloak, TenantService | [`api/consultingtypeservice.yml`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/api/consultingtypeservice.yml), [`api/topicservice.yml`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/api/topicservice.yml) |

Lies zuerst den Vertrag und danach den Controller. Diese Reihenfolge spart eine Stunde pro Endpunkt — siehe [Backend-Services](/de/plattform/core-systems/backend-services).

Verwende für eine verwaltete lokale Basis den Runner unten. Er startet die lokalen
Abhängigkeiten und gewählten Dienste zusammen. Tabellen und Entwicklungsdaten
erzeugen die aktuellen Liquibase-Master der Dienste mit den Kontexten `dev,seed`.
Verwende weder kopiertes ORISO-Database-SQL noch nachträgliche Schema-Reparaturen,
um einen Dienst zum Starten zu bringen.

## Der vollständige lokale Stack

Der Runner-Vertrag umfasst die lokale Basis für API- und Admin-Entwicklung: vier
Java-Dienste, Admin, einen Gateway auf Loopback, MariaDB, MongoDB, Redis, RabbitMQ,
unverändertes lokales Keycloak und den lokalen SMTP-Auffangdienst Mailpit.
Die Infrastruktur stammt aus mitgelieferten
lokalen Fixtures mit künstlichen Zugangsdaten. Veröffentlichte Ports sind an
Loopback gebunden. Verwende für den ersten Nachweis getrennte Checkouts und
Testdaten. Chat, Anrufe, ausgehende E-Mails sowie spezielle ORISO-Keycloak-SPI-
Registrierungs- und Wiederherstellungsabläufe gehören nicht zu dieser Basis.

Ersetze beide Beispielpfade. Der Workspace wählt die Service-Quellen aus; der
Runner-Pfad wählt die getestete Docs-Revision. Die Verzeichnisse dürfen verschieden
sein.

```bash
export ORISO_WORKSPACE_ROOT="/path/to/ORISO"
export ORISO_LOCAL_RUNNER="/path/to/selected/ORISO-Docs/services-local-setup/run-oriso-local.sh"
"$ORISO_LOCAL_RUNNER" doctor --json
```

Doctor liest ausschließlich. Es zeigt Quellrevisionen, Branches, gewählte Werkzeuge
und Ports sowie unterstützte Fähigkeiten. Exit 1 bedeutet, dass die genannte
Voraussetzung vor dem Start behoben werden muss. Es installiert nichts, gibt keine
Zugangsdaten aus und beendet keine fremden Port-Nutzer. Standard sind vier Backends
und Admin. `--ui frontend`, `--ui both`, `--ui none` oder
`--services "userservice tenantservice"` ändern die Auswahl.

```bash
"$ORISO_LOCAL_RUNNER" start all
"$ORISO_LOCAL_RUNNER" status
"$ORISO_LOCAL_RUNNER" logs tenantservice
"$ORISO_LOCAL_RUNNER" stop all
```

Start installiert gegebenenfalls UI-Abhängigkeiten, baut Dienste und erzeugt eigene
Laufzeitdateien sowie lokale Datenbank-Volumes. Sein Bereitschaftsvertrag verlangt
Health-Ergebnisse der gewählten Anwendungen und lokale OIDC-Metadaten. Ein offener
Port allein reicht nicht. `start infra` prüft ausschließlich Infrastruktur.
`stop all` beendet eigene Prozessgruppen und Compose-Container; benannte Volumes
und fremde Ressourcen bleiben erhalten. `stop` ohne `all` lässt die Infrastruktur
laufen. Lösche keine Volumes, um einen ungeklärten Migrationsfehler zu beheben.
Sichere zuerst das fehlerhafte Log und den Quellstand.

Standardadressen sind Admin `http://localhost:9000`, Gateway `http://localhost:8088`
und lokale Authentifizierung `http://localhost:8080`. Das ausgewählte Frontend
verwendet Port `9002`. Der künstliche Realm dient der Entwicklung; seine Benutzer
sind keine echten Betreiber-Identitäten. Halte Doctor-JSON, Quellrevisionen,
Health-Antworten und den geprüften Browserablauf fest.

Lokaler SMTP-Empfang verwendet `127.0.0.1:1025`. Abgefangene Test-E-Mails sind im
Mailpit-Posteingang unter `http://localhost:8025` sichtbar. Mailpit hat keine
Weiterleitung nach außen. Diese lokale Auffangfunktion belegt weder einen
E-Mail-Ablauf der Plattform noch externe Zustellung. Tatsächliche Plattform-Mails
und ausgehende Zustellung bleiben ungeprüft.

Die App-Link-Ursprünge verwenden den echten lokalen HTTPS-Einstieg
`https://localhost:9443`. Sein Zertifikat bleibt im eigenen Laufzeitordner. Die
Bereitschaftsprüfung vertraut ihm ausdrücklich, ohne System- oder Browservertrauen
zu ändern. Ohne Frontend liefern App-Routen 503. Der optionale HTTPS-Frontend-Proxy
ist kein geprüfter Browser-/API-/Auth- oder DPA-Ablauf. Admin wird über seinen
tatsächlichen lokalen HTTP-Einstieg geprüft. OpenSSL erzeugt das Testzertifikat.
Browser-Zertifikatswarnungen dürfen für einen Nachweis nicht umgangen werden.

Der isolierte lokale Lauf im Prüfbeleg lieferte `UP` für alle vier Service-
Health-Endpunkte nach getrenntem Infrastruktur- und Dienststart. Die Browser-Prüfung
im vorherigen Beleg zeigte auf derselben Admin-Quellrevision Username, Password
und Sign in; es wurde keine Anmeldung abgesendet. Der neue Beleg prüft Admin per HTTP. Geprüft wurden das Zertifikat des
HTTPS-Einstiegs, lokale OIDC-Metadaten und Subjekt/Rolle des technischen Fixture-
JWTs sowie die Annahme einer Testnachricht mit anschließendem Lesen im Mailpit-
Posteingang. Das Beenden eigener Ressourcen gab alle 14 gewählten Ports frei,
erhielt fünf benannte Volumes und ließ bereits vorhandene Element-Call-Container
unverändert. Das belegt die API-/Admin-Basis und lokalen SMTP-Empfang.
Plattform-Mails, externe Zustellung, DPA-Unterzeichnung, spezielle Keycloak-SPIs,
Chat/Anrufe, Dev-Deployment und öffentliche Release-Prüfung bleiben offen. Eine
Admin-Login-Seite belegt keinen angenommenen authentifizierten Browserablauf.

Der lokale Modus verwendet mitgelieferte Authentifizierung. Hybridmodus verlangt
`--hybrid` und eine ausdrücklich freigegebene `ORISO_DEV_KEYCLOAK_URL`. Er verwendet
externe Authentifizierung, ohne sie einzurichten. Übergib entfernte Zugangsdaten
über den freigegebenen lokalen Secret-Mechanismus. Lokale Fixture-Zugangsdaten
werden nie an entfernte Authentifizierung gesendet. Ein Erfolg im lokalen Modus
belegt keine Hybrid-Bereitschaft.

Der Runner verwendet die ausgecheckten Quellen der gewählten Repositories. Er
wechselt keine Branches und führt kein Pull aus. Quellrevision, Review, Merge,
Deployment und Release-Prüfung bleiben getrennte Nachweise. Alle Port-Optionen,
die Fehlersuche und Nachweisgrenzen stehen im
[Runbook für lokale Entwicklung](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0/services-local-setup/ORISO-local-development-runbook.md).
Lies den [deutschen Einstieg](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0/services-local-setup/README.de.md)
und [`run-oriso-local.sh`](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0/services-local-setup/run-oriso-local.sh)
auf der geprüften Revision aus [PR 142](https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/142).

## Nächste Schritte

1. [Architektur](/de/plattform/start-here/architecture) — die Services und ihre Aufrufe untereinander.
2. [Authentifizierung und Keycloak](/de/plattform/core-systems/authentication-and-keycloak) — bevor du Anmeldung, Rollen oder Tokens änderst.
3. [Backend-Services](/de/plattform/core-systems/backend-services) — um den für deine Änderung zuständigen Service zu finden.
4. [Datenbank und Datenmodell](/de/plattform/core-systems/database-and-data-model) — bevor du Persistenz änderst.
5. [Wie wir die Dokumentation verlässlich halten](/de/plattform/knowledge-graphs/understand-anything) — die Codegraphen hinter diesen Seiten und die Dashboards für eigene Abfragen.
