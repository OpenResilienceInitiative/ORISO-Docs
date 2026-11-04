# ORISO lokal entwickeln

[English](README.md) · [Ausführliches Runbook (Englisch)](ORISO-local-development-runbook.md)

Der Runner startet die lokale Basis für API- und Admin-Entwicklung: vier Java-Dienste, Admin, einen lokalen Gateway, Keycloak, MariaDB, MongoDB, Redis, RabbitMQ und den lokalen SMTP-Auffangdienst Mailpit. Tabellen und Entwicklungsdaten erzeugen die Liquibase-Master der jeweiligen Dienste. Kopierte SQL-Schemas werden nicht benötigt. Chat, Anrufe, ausgehende E-Mails, DPA-Unterzeichnung und spezielle Keycloak-Registrierungsabläufe gehören nicht zu dieser Basis.

## Workspace vorbereiten

Benötigt werden benachbarte Git-Repositories: ORISO-Docs, ORISO-UserService, ORISO-TenantService, ORISO-AgencyService, ORISO-ConsultingTypeService und ORISO-Admin. ORISO-Frontend wird nur benötigt, wenn es ausgewählt ist. Git-Worktrees werden unterstützt. Deployment und ORISO-Database sind nicht erforderlich.

Voraussetzungen sind Python 3.10+, Git, OpenSSL, Docker mit Compose v2, Java 21 sowie Node 22.12.0 mit npm. JAVA_HOME und PATH müssen dasselbe Java auswählen. Der Runner liest pom.xml und package.json der ausgewählten Quellen. Neuere Anforderungen dieser Quellen haben Vorrang vor dieser Zusammenfassung. Bei einem Versionskonflikt bricht er ab.

Gib den Workspace ausdrücklich an, besonders wenn ORISO-Docs selbst in einem verwalteten Worktree liegt. Ersetze die Beispielpfade durch deinen Ordner mit den benachbarten Repositories und den Runner im ausgewählten Docs-Checkout/Worktree. Die beiden Pfade dürfen verschieden sein.

<!-- oriso-command: {"id": "readme-de-doctor", "environment": "local", "verification": "ready ist true; Quellrevisionen und Laufzeitversionen werden angezeigt; bei Exit 1 zuerst die Fehler beheben", "risk": "read-only"} -->
```bash
export ORISO_WORKSPACE_ROOT="/path/to/ORISO"
export ORISO_LOCAL_RUNNER="/path/to/selected/ORISO-Docs/services-local-setup/run-oriso-local.sh"
"$ORISO_LOCAL_RUNNER" doctor --json
```

Doctor liest ausschließlich. Es zeigt Quellstände, Branches, Werkzeuge, Ports und unterstützte Fähigkeiten. Es gibt keine Zugangsdaten aus, installiert nichts und beendet keine fremden Port-Nutzer. Standard sind vier Backends und Admin. --ui frontend, --ui both oder --ui none ändern die Oberfläche. --services "userservice tenantservice" wählt eine Backend-Teilmenge.

## Starten und stoppen

Die mitgelieferte Infrastruktur verwendet ausschließlich lokale Test-Zugangsdaten und bindet veröffentlichte Ports an Loopback. Verwende für den ersten Nachweis getrennte Checkouts und Testdaten. Start installiert bei Bedarf UI-Abhängigkeiten und baut Dienste. Dabei entstehen eigene Laufzeitdateien und lokale Datenbank-Volumes.

<!-- oriso-command: {"id": "readme-de-start", "environment": "local", "verification": "Exit 0 erst nach erreichbarer Health-Prüfung aller gewählten Anwendungen und lokalen OIDC-Metadaten; bei Fehler eigene Logs prüfen", "risk": "disposable-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" start all
```

Abgefangene Test-E-Mails sind unter http://localhost:8025 sichtbar. Mailpit hat keine Weiterleitung nach außen. Der E-Mail-Ablauf der Plattform und externe Zustellung bleiben ungeprüft.

Admin läuft auf http://localhost:9000, der Gateway auf http://localhost:8088 und lokale Authentifizierung auf http://localhost:8080. Der künstliche Realm dient der Entwicklung; seine Benutzer sind keine echten Betreiber-Identitäten. Ein erfolgreicher Start belegt diese lokale Basis, nicht sämtliche Plattform-Abläufe.

Die Callback-Ursprünge der Dienste verwenden den echten lokalen HTTPS-App-Einstieg auf https://localhost:9443. Sein Zertifikat bleibt im eigenen Laufzeitordner. Die Bereitschaftsprüfung vertraut diesem Zertifikat ausdrücklich, ohne den System- oder Browser-Zertifikatsspeicher zu ändern. Ohne ausgewähltes Frontend liefern App-Routen 503. Admin bleibt über lokales HTTP erreichbar. Der optionale HTTPS-Frontend-Proxy belegt keinen geprüften Browser-, Authentifizierungs- oder DPA-Ablauf. Browser-Zertifikatswarnungen dürfen für einen solchen Nachweis nicht umgangen werden.

<!-- oriso-command: {"id": "readme-de-status", "environment": "local", "verification": "Ausgewählte Anwendungen, eigener Gateway/Auth-Zugriff und zertifikatgeprüfter HTTPS-Zugang melden bereit; Infrastrukturstatus wird angezeigt", "risk": "read-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" status
```

<!-- oriso-command: {"id": "readme-de-stop", "environment": "local", "verification": "Nur Prozesse und Container dieser Laufzeit stoppen; fremde Port-Nutzer und benannte Volumes bleiben erhalten", "risk": "disposable-only"} -->
```bash
"$ORISO_LOCAL_RUNNER" stop all
```

Lösche keine Volumes, um einen ungeklärten Migrationsfehler zu beseitigen. Sichere zuerst das fehlerhafte Log und den Quellstand. Das Runbook erklärt getrennte Ports, Fehlersuche, Hybrid-Authentifizierung und die Nachweisgrenzen.

## Quellen und Nachweise

Gepflegt über ORISO-Docs [Issue 48](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/48). Beide Sprachfassungen verwenden denselben Runner-Vertrag. Die aktuellen Anforderungen wurden am 01.10.2026 gegen origin/dev geprüft. Befehlsannotationen beschreiben Umgebung und erwartetes Ergebnis. Sie erteilen keine Freigabe und belegen keine Ausführung. CI prüft ihre Extraktion, ohne Befehle auszuführen. Quellprüfung, lokale Laufzeit und öffentlich geprüfter Release bleiben getrennte Nachweise.
