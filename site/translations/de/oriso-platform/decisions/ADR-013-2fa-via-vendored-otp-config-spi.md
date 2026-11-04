# ADR-013 — 2FA über mitgelieferte otp-config-SPI (statt AIA im Standard-Keycloak)

**Status:** Angenommen · **Datum:** 2026-07-11
**Kontextdokumente:** `PLAN-2fa-otp-enablement-2026-07-11.md`
**PRs:** ORISO-Helm #55, ORISO-UserService #392

## Kontext

Die 2FA-Funktion von ORISO ist auf beiden Seiten vollständig gebaut. Das Frontend enthält einen vollständigen Einrichtungsassistenten mit QR-Code, TOTP-App, E-Mail-OTP und OTP-Feld bei der Anmeldung. UserService bietet die vier `/users/2fa`-Endpunkte an. Beide verwenden jedoch die **otp-config-Keycloak-SPI** von onlineBeratung, die nie bereitgestellt wurde: Die Plattform verwendet das Standard-Image `quay.io/keycloak/keycloak:26.6.3`. UserService fängt den SPI-Fehler ab und meldet `twoFactorAuth.isEnabled =
false`, wodurch die gesamte Funktion still verborgen bleibt. Das Umschalten der Flags `identity.otp-allowed-*` hatte daher keine sichtbare Wirkung.

Bei der Untersuchung wurde die Einschränkung „kein eigenes Keycloak-Image/Provider“ genannt. Sie widerspricht einer festen Plattformgrenze: **Die Admin-REST-API von Keycloak kann keine OTP-Zugangsdaten anlegen**, sondern nur lesen und löschen. Jede Lösung mit QR-Code-Einrichtung innerhalb der ORISO-Oberfläche benötigt daher die SPI oder nicht unterstützte direkte Datenbankschreibzugriffe.

## Optionen

**A — SPI mitliefern (gewählt).** `Onlineberatung/onlineberatung-keycloak-otp` (AGPL, dieselbe Upstream-Familie wie alle ORISO-Services) auf Keycloak 26.6.3 portieren und als dünne Image-Schicht ausliefern. Die Portierung war minimal: ein API-Austausch (`CredentialHelper.deleteOTPCredential` → `removeStoredCredentialById`), eine Abhängigkeit nur für Tests, alle 53 Upstream-Unit-Tests erfolgreich. Die SPI enthält außerdem Direct-Grant-Authentifikatoren, die das vom Frontend bereits ausgewertete Challenge-JSON `{otpType}` zurückgeben. Sie ermöglicht E-Mail-OTP durchgängig, von der Einrichtungsnachricht bis zu Anmeldecodes, und erreicht damit den Funktionsumfang des Caritas-Upstreams.

**B — Standard-Keycloak und Application-Initiated Action.** Admin-REST für Status und Deaktivierung, Browserweiterleitung auf `kc_action=CONFIGURE_TOTP` für die Einrichtung. Verworfen: Der gebaute Assistent würde durch eine Seite im Keycloak-Theme ersetzt. Bei der Direct-Grant-Anmeldung gibt es kein Keycloak-SSO-Cookie, sodass Benutzer bei der Einrichtung ihre Zugangsdaten erneut eingeben müssten. Standard-Keycloak hat kein E-Mail-OTP. Außerdem müssten der OTP-Adapter von UserService und das Frontend-Panel neu geschrieben werden. Schlechtere Bedienung bei höheren Kosten; eingespart würden nur drei Dockerfile-Zeilen.

## Entscheidung

Den SPI-Quellcode unter `ORISO-Helm/keycloak-image/otp-config-spi/` mitliefern; Herkunft und lokale Anpassungen stehen in dessen README. `ghcr.io/openresilienceinitiative/oriso-keycloak` in CI bauen und den Ablauf `direct-grant-2fa` in `realm.json` für neue Importe sowie über `scripts/keycloak-apply-2fa-flow.sh` für bestehende Realms einbinden. Der Wunsch „kein eigenes Image“ entfällt, weil er auf einer falschen Annahme beruhte. Das Image ist eine Schicht von drei Zeilen über dem Standard-Image und wird wie jedes andere ORISO-Image von CI neu gebaut.

## Folgen

- 2FA funktioniert mit der vorgesehenen Einrichtung innerhalb der Anwendung für App-TOTP und E-Mail-OTP. Rollenbezogene Flags steuern die Sichtbarkeit (Pre-Dev: Berater und Mandantenadministratoren).
- Wir pflegen eine kleine mitgelieferte SPI und müssen sie bei Keycloak-Upgrades erneut prüfen. `mvn test` in CI prüft dies bei jeder Änderung; bisher betrifft die Portierung eine Methode.
- Der Produktions-Rollout benötigt Abstimmung mit Neusta, da Neusta das Produktions-Keycloak betreibt.
- Die 2FA-Schranke im Einladungsablauf wird wirksam: OTP-Aktivierung setzt `PENDING_SETUP → ACTIVE`, Löschung öffnet die Schranke erneut. Administratoren können sie mit dokumentierter Begründung erlassen; die Aufnahme nach dem Vier-Augen-Prinzip bleibt ohne 2FA-Hardware möglich.
