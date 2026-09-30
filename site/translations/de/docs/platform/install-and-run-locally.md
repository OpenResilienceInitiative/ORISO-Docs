---
title: "Installieren und lokal starten"
description: "Der Einstieg für neue Entwickler: Voraussetzungen, Repositories und der erste startbare Befehl für Frontend, Admin und Backend."
---

# Installieren und lokal starten

Beginne hier. Diese Seite führt dich von einem noch nicht eingerichteten Rechner zu einem laufenden Teil von ORISO. Wähle einen der drei Wege passend zu deinem ersten Ticket. Die anderen brauchst du erst später.

Alle Versionen und Befehle unten stammen aus den Repositories selbst. Die Links öffnen die genaue Datei auf `dev` in einem neuen Tab.

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
| Docker mit Compose | eine aktuelle Version | Datenbanken, Cache, Warteschlange, lokales Keycloak |
| Git, curl | beliebig | Klonen und Zustandsprüfungen |

`nvm use` liest in beiden UI-Repositories die `.nvmrc`. Jede JDK-21-Distribution ist geeignet. SDKMAN hilft, wenn du zusätzlich ältere JDKs benötigst.

## Repositories klonen

Alle Repositories müssen **nebeneinander in einem gemeinsamen Workspace-Ordner** liegen. Der lokale Runner und mehrere Skripte lösen Pfade anhand dieser Struktur auf.

```bash
mkdir ORISO && cd ORISO

git clone https://github.com/OpenResilienceInitiative/ORISO-Docs.git
git clone https://github.com/OpenResilienceInitiative/ORISO-Database.git
git clone https://github.com/OpenResilienceInitiative/ORISO-Keycloak.git

git clone https://github.com/OpenResilienceInitiative/ORISO-UserService.git
git clone https://github.com/OpenResilienceInitiative/ORISO-TenantService.git
git clone https://github.com/OpenResilienceInitiative/ORISO-AgencyService.git
git clone https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService.git

git clone https://github.com/OpenResilienceInitiative/ORISO-Admin.git
git clone https://github.com/OpenResilienceInitiative/ORISO-Frontend.git
```

Die Zuständigkeiten der Repositories findest du in der [Repository-Übersicht](./repository-map.md).

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

Jeder der vier Services ist eine gewöhnliche Spring-Boot-Anwendung mit Maven-Wrapper und JDK 21:

```bash
cd ORISO-AgencyService
./mvnw spring-boot:run -Dspring-boot.run.profiles=local -DskipTests
```

Dasselbe Muster funktioniert für `ORISO-UserService`, `ORISO-TenantService` und `ORISO-ConsultingTypeService`. Für den Start braucht jeder Service zusätzlich:

| Service | Benötigt | Vertrag |
| --- | --- | --- |
| [UserService](https://github.com/OpenResilienceInitiative/ORISO-UserService) | MariaDB `userservice`, Keycloak, URLs anderer Services; Matrix/Redis/RabbitMQ je nach Profil | [`api/userservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/api/userservice.yaml), [`api/useradminservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/api/useradminservice.yaml) |
| [AgencyService](https://github.com/OpenResilienceInitiative/ORISO-AgencyService) | MariaDB `agencyservice`, Keycloak, TenantService | [`api/agencyservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/api/agencyservice.yaml), [`api/agencyadminservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/api/agencyadminservice.yaml) |
| [TenantService](https://github.com/OpenResilienceInitiative/ORISO-TenantService) | MariaDB `tenantservice`, Keycloak, ConsultingType/ApplicationSettings/UserAdmin APIs | [`api/tenantservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/dev/api/tenantservice.yaml) |
| [ConsultingTypeService](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService) | MongoDB-Collections für Beratung und Anwendung, MariaDB `consultingtypeservice`, Keycloak, TenantService | [`api/consultingtypeservice.yml`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/api/consultingtypeservice.yml), [`api/topicservice.yml`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/api/topicservice.yml) |

Lies zuerst den Vertrag und danach den Controller. Diese Reihenfolge spart eine Stunde pro Endpunkt — siehe [Backend-Services](./backend-services.md).

Startreihenfolge bei mehreren Services: TenantService, ConsultingTypeService, AgencyService, UserService. Keycloak und seine Datenbank müssen vorher laufen.

## Der vollständige lokale Stack

`ORISO-Docs` enthält einen experimentellen Runner für Infrastruktur, Datenbanken, Gateway, Dienste und UI. Seine Java-Auswahl verwendet standardmäßig noch 11/17, während die Dienstquellen Java 21 verlangen. Verwende die manuellen Wege oben, bis du für beide alten Auswahlvariablen ausdrücklich einen installierten Java-21-Kandidaten eingerichtet hast. Für das Frontend muss außerdem `ORISO_FRONTEND_NODE_BIN` auf Node 22 zeigen; `nvm use` allein überschreibt den Node-18-Pfad des Runners nicht. Ein erfolgreicher Start des gesamten Stacks ist hier nicht nachgewiesen. Der unterstützte Vorabcheck heißt `check`; einen Unterbefehl `doctor` gibt es nicht.

Prüfe die Runner-Konfiguration vor diesen Befehlen:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh check
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui admin
./ORISO-Docs/services-local-setup/run-oriso-local.sh status
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs -f userservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh stop
```

Im Hybridmodus laufen die ORISO-Services lokal; die Anmeldung erfolgt am gemeinsamen Dev-Keycloak. Der Realm-Import entfällt vollständig. Das ist die übliche Wahl für Admin- und Backend-Arbeit:

Setze vorher `DEV_KEYCLOAK_ISSUER_URL` auf die freigegebene Dev-Issuer-URL; der Runner verlangt diese ausdrückliche Angabe.

```bash
ORISO_DEV_KEYCLOAK_URL="$DEV_KEYCLOAK_ISSUER_URL" \
  ./ORISO-Docs/services-local-setup/run-oriso-local.sh start --hybrid --ui admin
```

Standardports: gateway `8088`, admin `9000`, frontend `9002`.

Der Runner wird noch entwickelt und verwendet immer den gerade ausgecheckten Branch jedes Repositories. Er wechselt keine Branches und führt kein Pull aus. Alle Optionen, Umgebungsvariablen und bekannten Lücken stehen im
[Runbook für lokale Entwicklung](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/services-local-setup/ORISO-local-development-runbook.md),
das Skript selbst ist
[`run-oriso-local.sh`](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/services-local-setup/run-oriso-local.sh).

Zwei Angaben im Runbook weichen vom Code ab. Beachte sie, bevor du die Anleitung wörtlich befolgst:

- es verlangt JDK 11 und 17, aber alle vier Services verwenden heute **JDK 21** (siehe die Tabelle mit Voraussetzungen oben);
- der Standardpfad für Frontend-Node verweist auf eine 18.x-Installation, während `.nvmrc` 22.12.0 vorgibt — setze `ORISO_FRONTEND_NODE_BIN` ausdrücklich auf das Bin-Verzeichnis von Node 22.

## Nächste Schritte

1. [Architektur](./architecture.md) — die Services und ihre Aufrufe untereinander.
2. [Authentifizierung und Keycloak](./authentication-and-keycloak.md) — bevor du Anmeldung, Rollen oder Tokens änderst.
3. [Backend-Services](./backend-services.md) — um den für deine Änderung zuständigen Service zu finden.
4. [Datenbank und Datenmodell](./database-and-data-model.md) — bevor du Persistenz änderst.
5. [Wie wir die Dokumentation verlässlich halten](./understand-anything.md) — die Codegraphen hinter diesen Seiten und die Dashboards für eigene Abfragen.
