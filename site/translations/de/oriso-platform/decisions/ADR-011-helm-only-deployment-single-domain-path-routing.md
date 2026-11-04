# ADR-011: Deployment ausschließlich mit Helm; pfadbasiertes Routing über eine Domain ersetzt Subdomains je Service

- **Status:** Angenommen — bereits implementiert und auf Pre-Dev in Betrieb.
- **Datum:** 2026-07-07
- **Entscheider:** Jonas Rogg / Betrieb, teamweit beim Jour-Fix am 2026-06-30 angekündigt
- **Verwandt:** ADR-005 (Matrix behält eine eigene Subdomain — die bewusste Ausnahme dieser Entscheidung)

---

## Kontext

ORISO wurde ursprünglich über **ORISO-Kubernetes** bereitgestellt: einzelne `kubectl`-Manifeste und Helm-Subcharts mit einer Subdomain je Bereich — `app.`, `admin.`, `api.`, `auth.`, `matrix.<domain>` (weiterhin im Abschnitt „Access URLs“ der Repository-README dokumentiert).

Seit der Ankündigung beim Jour-Fix am 2026-06-30 ist **ORISO-Helm** das maßgebliche Repository für alle Änderungen an Deployment, Helm-Charts, Schemas, Keycloak, Redis und Matrix-Infrastruktur. Sein aktuelles Chart implementiert bereits eine andere Struktur: `main-ingress.yaml` routet alles über **einen Host** (`global.domainName`) mit Pfadregeln — `/` → Frontend, `/admin` → Admin-Oberfläche, `/service/*` → Backend-APIs, `/auth` → Keycloak, `/room` → Element Call. Das ist kein Zukunftsplan: Es läuft bereits auf Pre-Dev und ist die Zielstruktur für den endgültigen verwalteten Cluster auf Gridscale.

ORISO hat **keine aktiven Produktionsbenutzer**. Es ist ein Neuaufbau eines älteren Webportals vor dem Start. Die Inbetriebnahme bedeutet daher neue Benutzerregistrierungen statt einer Migration laufenden Datenverkehrs. Es gibt somit kein Umstellungsrisiko, das diese Entscheidung erzwingt. Die Routingstruktur lässt sich dennoch schwer ändern, sobald echte Integrationen wie CORS-Freigabelisten, Cookie-Domains, eingebettete Links und TLS-Zertifikate davon abhängen.

## Entscheidung

**ORISO-Helm ist die einzige maßgebliche Definition der ORISO-Deployment-Topologie; ORISO-Kubernetes ist es nicht.** Alle Umgebungen einschließlich des endgültigen von Gridscale verwalteten Clusters werden auf eine öffentliche Domain mit pfadbasiertem Routing ausgerichtet. Das ersetzt das Schema mit einer Subdomain pro Service. Matrix ist die einzige bewusst gewählte Ausnahme und behält seine eigene Subdomain (Föderations-/Homeserver-Anforderungen, siehe ADR-005).

## Entscheidungsgründe

- Ein TLS-Zertifikat und ein cert-manager-`Issuer` statt je eines pro Subdomain.
- Keine Cross-Origin-Anfragen zwischen App, Admin und Services. Die durch getrennte Subdomains entstehende Komplexität bei CORS und Cookie-/Sitzungsdomains entfällt.
- Entspricht dem vorgesehenen Betrieb des endgültigen Clusters durch Neusta: ein Ingress, ein DNS-Eintrag.

## Erwogene Optionen

- **Subdomains je Service behalten** (bisheriger Stand in ORISO-Kubernetes). Verworfen: benötigt ein Wildcard-Zertifikat oder N Zertifikate. Cookies werden trotzdem auf die übergeordnete Domain begrenzt. Die versprochene Isolation durch Subdomains wurde nie wirklich erreicht.
- **Hybrid** (App und Admin zusammenlegen, API und Auth auf Subdomains behalten). Verworfen: Nach der nötigen CORS-/Cookie-Arbeit gibt es keinen Nutzen mehr, alte Subdomains zu behalten. ORISO-Kubernetes bliebe lediglich eine zweite maßgebliche Quelle.

## Folgen

- Die README von ORISO-Kubernetes mit den Subdomain-„Access URLs“ ist jetzt **historisch und nicht aktuell**. Wer dort für Routing-/Ingress-Arbeit landet, sollte zu ORISO-Helm weitergeleitet werden.
- ORISO-Kubernetes **kann nicht einfach archiviert werden**: `.github/workflows/build-and-push.yml` ist weiterhin die tatsächliche CI-Pipeline, die die Container-Images aller Services baut und nach `ghcr.io` überträgt. Bis dieser Workflow nach ORISO-Helm oder an eine eigene CI-Stelle umzieht, bleibt das Repository aktiv. Dort geöffnete PRs kommen in der Praxis nicht weiter; Jonas Rogg bestätigte dies in `#oriso-dev-team` am 2026-07-07 zu PR #84, obwohl GitHub das Repository nicht als archiviert kennzeichnet.
- Oben in `ORISO-Kubernetes/README.md` wurde ein Verweis auf diesen ADR ergänzt. Dadurch sehen die nächsten Leser wie der Autor von PR #84 die Weiterleitung und die CI-Einschränkung sofort, statt die Frage erneut in Slack zu stellen.

## Stand und Fortschritt (2026-07-07)

- Die Routingstruktur ist bereits über `ORISO-Helm/templates/nginx/main-ingress.yaml` implementiert und auf Pre-Dev in Betrieb.
- Es gibt keine geplante oder bestehende Umstellung durch Migration aktiver Benutzer. Das endgültige Ziel ist ein neuer Start mit demselben Schema auf dem von Gridscale verwalteten Cluster.
- Offene Voraussetzung für das Archivieren von ORISO-Kubernetes: `build-and-push.yml` aus diesem Repository verschieben.
