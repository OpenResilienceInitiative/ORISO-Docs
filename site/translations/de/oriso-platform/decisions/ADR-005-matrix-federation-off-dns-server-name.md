# ADR-005: Matrix-Föderation bewusst AUS; echter DNS-server_name durch sauberen Homeserver-Neuaufbau

- **Status:** Angenommen — 2026-06-26 (grill-with-docs-Sitzung). Zeitpunkt festgelegt: sauberer Neuaufbau Anfang Juli, vor SDK-Verschlüsselungsarbeit und vor der Aufnahme echter Träger.
- **Datum:** 2026-06-26
- **Entscheider:** Frank und neusta (Betrieb verantwortet Homeserver-/SSH-Zugriff)
- **Verwandt:** [[1 Analysis/ADRS/ADR-004-chat-keep-custom-ui-adopt-matrix-sdk-megolm]] (SDK-Megolm benötigt stabile MXIDs), Befunde K8-M09 / K8-M06 (unsichere Schlüsselbehandlung) / DB-H04 / DB-M09 (IP-server_name in MXIDs eingebettet)

## Ausnahme für PreDev-Implementierung — 2026-07-11

Die Reihenfolgeregel wird ausschließlich für verzichtbare PreDev-Prüfungen ergänzt:

1. SDK-/Rust-Megolm darf auf dem bestehenden alten IP-Namensraum laufen, um das Anwendungsverhalten vor dem vom Betrieb verantworteten Neuaufbau zu belegen.
2. Alle unter diesem Namensraum angelegten Konten, Räume, Geräte und Kryptospeicher sind verzichtbar und dürfen nicht zu dauerhaften Identitäten für die Aufnahme werden.
3. Der saubere Neuaufbau unter `matrix.oriso-dev.site` mit ausgeschalteter Föderation bleibt vor der Aufnahme echter Träger verpflichtend.
4. Nach dem Neuaufbau erneut Nachrichten zwischen mehreren Benutzern, Neuladen, mehrere Geräte/Wiederherstellung sowie Audio und Video belegen.

Diese Ausnahme dokumentiert beobachtete Realität. Sie macht `server_name` nicht veränderbar und akzeptiert den IP-Namensraum nicht als endgültige Architektur. Helm #31 verfolgt den Neuaufbau. Helm PR #32 wurde ohne Merge geschlossen; UserService PR #370 bleibt offen.

---

## Kontext

Matrix-Föderation in ORISO ist derzeit **falsch konfiguriert statt bewusst ausgeschaltet — die ungünstigste Kombination**. Synapse aktiviert Föderation **standardmäßig**: Die Listener-Ressourcen des Homeservers enthalten `federation`, nirgends steht `federation_domain_whitelist` / `send_federation: false`, ein Föderationsport 8009/8448 ist erreichbar und eine Delegation über `.well-known/matrix/server` wird veröffentlicht. Gleichzeitig ist sie defekt und geschwächt:

- **`server_name` ist eine reine IP-Adresse** (`91.99.219.182`, zuvor `91.99.183.160`). Dieses bekannte Fehlmuster bettet die IP in **jede** MXID ein (`@user:91.99.219.182`). Jede IP-Änderung verwaist dadurch Benutzer und Räume, und die Föderation funktioniert nicht korrekt.
- `accept_keys_insecurely: true` und `suppress_key_validation_warnings: true` schwächen die aktiv gebliebene Föderation ausdrücklich.
- Der einzige vorhandene Ausschalter ist kosmetisch und clientseitig (`ORISO-Element/config.json`, `disable_federation: true`), mit einer nicht einmal passenden Domain.

`server_name` ist **nach dem ersten Homeserver-Start unveränderlich** und bereits in MXIDs eingebettet. Das lässt sich nicht im laufenden Bestand reparieren. Heute gibt es **keine Produktionsbenutzer**.

## Entscheidungsgründe

- ORISO ist eine **geschlossene Beratungsplattform auf einem einzigen Homeserver**. Es gibt keinen Anwendungsfall für Föderation mit dem offenen Matrix-Netz. Sie vergrößert nur die Angriffsfläche.
- **Stabile MXIDs sind eine feste Voraussetzung** für Megolm-Verschlüsselung mit matrix-js-sdk ([[1 Analysis/ADRS/ADR-004-chat-keep-custom-ui-adopt-matrix-sdk-megolm]]). Geräteschlüssel und Schlüsselsicherungen sind an MXIDs gebunden. `server_name` muss daher vor Aktivierung der Verschlüsselung endgültig sein.
- Keine Produktionsbenutzer → keine Migrationskosten. Löschen und neu anlegen ist nach der Projektregel „vor Produktion, Migration überspringen“ akzeptabel.

## Entscheidung

Einen **sauberen Homeserver-Neuaufbau** durchführen mit:

- stabilen Matrix-Identitätsnamen je Umgebung, niemals reinen IP-Adressen:
  - Pre-Dev: `server_name = matrix.oriso-dev.site`;
  - Dev: `server_name = matrix.oriso.org`;
  - Produktion/Main liegt außerhalb des genehmigten Umfangs dieser Arbeit;
  - Das sind Namen der eigenen ORISO-Installationen, keine Standardwerte. Das Helm-Chart enthält einen Platzhalter (`values.yaml.default`); jede Installation legt ihr eigenes `matrixServerName` fest. Die ORISO-Werte stehen ausschließlich in den Dev-/Produktions-Overlays.
- Föderation **ausdrücklich ausgeschaltet**: `federation_domain_whitelist: []` oder `send_federation: false`; Föderationslistener, Port 8009/8448 und Delegation `.well-known/matrix/server` entfernen;
- `accept_keys_insecurely` und `suppress_key_validation_warnings` entfernen.

**Zeitpunkt:** Anfang Juli, **nach** dem 30. Juni und **vor** SDK-Verschlüsselungsarbeit und Aufnahme echter Träger. Der Neuaufbau ist *keine* Voraussetzung für die Funktionen vom 30. Juni, die auf dem bestehenden Homeserver laufen. Keine Datenmigration: Testkonten und -räume werden verworfen und neu angelegt.

**Zuständigkeit:** neusta/Betrieb verantworten Homeserver und SSH-/kubectl-Zugriff. Die KI kann und wird den Neuaufbau nicht durchführen; die Infrastruktur ist ihr nicht zugeordnet. Sie bereitet ausschließlich Konfiguration und Prüfschritte vor.

## Erwogene Optionen

- **IP-Konfiguration mit teilweise aktiver Föderation behalten.** **Verworfen:** Jedes zusätzliche Konto bekommt eine fehlerhafte Identität `@user:IP`; Föderation bleibt aktiv und geschwächt; SDK-Verschlüsselung bleibt blockiert. Der Bereinigungsaufwand wächst täglich.
- **Föderation eingeschaltet lassen, aber korrekt betreiben** mit echtem DNS, Schlüsselprüfung und Freigabeliste. **Verworfen:** Kein Beratungsanwendungsfall benötigt Föderation. Sie bedeutet zusätzliche Angriffsfläche und Betriebskomplexität.
- **`server_name` ohne Neuaufbau im Bestand ändern.** **Unmöglich:** `server_name` ist nach dem ersten Start unveränderlich und bereits in jeder MXID enthalten.

## Folgen

**Positiv:** Stabile DNS-basierte MXIDs überstehen IP-Änderungen; kleinere, zur Beratungsanwendung passende Angriffsfläche; ermöglicht die SDK-Megolm-Einführung aus ADR-004; behebt DB-H04 / K8-M09 / K8-M06 gemeinsam.

**Negativ / Aufwand:** Benötigt sauberen Neuaufbau und Zeit des Betriebs (neusta). Alle bestehenden Testkonten/-räume werden verworfen. Muss **vor** der Verschlüsselungseinführung erfolgen, sonst wird deren Arbeit wiederholt. Dadurch wartet Schritt 2 aus ADR-004, SDK-Megolm, auf diese Entscheidung.

## Stand und Fortschritt (aktualisiert am 2026-07-02)

- **Umgebungszuordnung am 2026-07-10 geklärt:** Pre-Dev ist die maßgebliche Laufzeitumgebung dieser Initiative und muss `matrix.oriso-dev.site` verwenden. Die separate Dev-Umgebung darf `matrix.oriso.org` verwenden. ORISO-Helm PR #32 mit Basis `dev` macht den Wert konfigurierbar und ergänzt zuerst fehlschlagende, dann erfolgreiche Schutztests gegen IP-Identitätskonfiguration. Sein Standard `matrix.oriso.org` darf aber nicht mit dem Pre-Dev-Overlay verwechselt werden. Der PR ist erfolgreich geprüft und offen; Pre-Dev-Wert, DNS/TLS und saubere laufende Installation stehen noch aus.

- **Teilweise auf Pre-Dev (oriso-dev.site) am 2026-07-02 umgesetzt**, im Rahmen der vollständigen Matrix-Migration: Synapse von **1.153.0 auf v1.155.0** aktualisiert, damals neueste stabile Version mit festem Tag statt `:latest`; **Föderationslistener-Ressource entfernt** (`/_matrix/federation` gibt jetzt 404), `federation_domain_whitelist: []` gesetzt und `accept_keys_insecurely` / `suppress_key_validation_warnings` **entfernt**. Über `kubectl` auf dem Pre-Dev-Knoten angewendet, wie beim genehmigten UserService-Hot-Deploy. Sicherungen: ConfigMap und SQLite-Online-Sicherung (`/data/homeserver.db.bak-20260702-pre1155`), lokale Kopien unter `~/ORISO/_e2e-artifacts/matrix-upgrade-20260702/`. **Hinweis:** Das Deployment wird durch Helm verwaltet (`oriso-platform-matrix-synapse`). Ein späteres `helm upgrade` aus ORISO-Kubernetes setzt Image/Konfiguration zurück, sofern das Chart nicht aktualisiert wurde. Diese Chart-Anpassung gehört zum neusta-Neuaufbau.
- **`server_name` bewusst NICHT geändert:** weiterhin die IP `91.99.183.160`. Eine Änderung erfordert den sauberen Neuaufbau und löscht MXIDs. Das bleibt **Zuständigkeit von neusta/Betrieb**. Keine KI-Aktion an diesem Teil: Der Homeserver-Neuaufbau selbst ist ihr nicht zugeordnete Infrastruktur.
- Die Frontend-Arbeit vom 30. Juni ([[1 Analysis/ADRS/ADR-004-chat-keep-custom-ui-adopt-matrix-sdk-megolm]]) läuft auf dem bestehenden IP-Homeserver und ändert **keine** Verschlüsselung. Sie ist daher nicht durch den Neuaufbau blockiert. Die unabhängige react-router-v7-Migration auf `dev` (PR #329) hat hier keinen Einfluss.
- **Aufgabe für Frank/neusta:** DNS/TLS für `matrix.oriso-dev.site` auf Pre-Dev und separat `matrix.oriso.org` auf Dev bereitstellen. Danach sauberer Neuaufbau: Föderation aus, Föderationslistener und `.well-known` entfernen, `accept_keys_insecurely` entfernen. Dies ist die erste feste Voraussetzung für den Verschlüsselungsschritt im Juli und muss vor `initRustCrypto` erfolgen.
