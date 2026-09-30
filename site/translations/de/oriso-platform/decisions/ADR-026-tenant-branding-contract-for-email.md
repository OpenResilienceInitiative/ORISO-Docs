# ADR-026: Ein Branding-Vertrag pro Mandant für E-Mails; Farben ohne ausreichenden Kontrast zu weißem Text werden abgelehnt

- **Status:** Angenommen — Frank, 2026-09-15
- **Implementierung:** teilweise auf `dev` — Entscheidung 4 ja, Entscheidung 3 auf einem Pfad, Entscheidungen 1, 2 und 5 nicht (siehe Implementierungsstand)
- **Datum:** 2026-09-15 (Implementierungsstand auf `dev` am 2026-09-22 erneut gemessen)
- **Entscheider:** Frank (Produkt) + KI (Engineering)
- **Bezug:** `ADR-010` (plattformgesteuerte Freigabeliste für das Erscheinungsbild pro Mandant); `ADR-024`
  (Benachrichtigungsmatrix); `ADR-025` (Ersatz des Upstream-Mailpfads); EPIC `ORISO-Frontend#828`;
  `ORISO-Frontend#862` (diese Entscheidung); `ORISO-TenantService#154` (Akzentfeld);
  `ORISO-TenantService#269` und `ORISO-UserService#1229` (an den Mandanten gebundene Logo-Route, zusammengeführt
  am 2026-09-22)
- **Geltungsbereich:** Welche Markenwerte ausgehende E-Mails verwenden, woher sie kommen und was passiert,
  wenn sie fehlen oder unbrauchbar sind.

---

## Kontext

Drei Mechanismen bestimmten das Aussehen einer E-Mail und widersprachen sich.

1. **Spring-Eigenschaften `email.brand.*`** — pro Umgebung, nicht pro Träger. Alle Träger einer
   Umgebung mit mehreren Mandanten verschickten E-Mails mit demselben Organisationsnamen und Logo.
2. **`EmailBrandingResolver`** — tatsächliches TenantService-Theming, aber nur im Einladungs- und DPA-Pfad verwendet.
3. **`emailThemeColor` in den SMTP-Einstellungen** — eine Transporteinstellung, die der Katalog-Renderer
   als Gestaltungsvorgabe verwendete. Der Einladungspfad ignorierte sie bewusst mit der Begründung,
   dass eine Transporteinstellung keine Gestaltungsvorgabe ist. Zwei Sender, zwei gegensätzliche Regeln,
   dieselbe Plattform.

Darunter liegt ein schwierigeres Problem: Eine E-Mail ist keine Webseite. Sie wird von einem Client
abgerufen, den die Plattform nicht kontrolliert, oft mit blockierten Bildern und häufig auf einem Gerät,
das nicht dem Empfänger gehört. Daraus folgen zwei Anforderungen, die ein Branding-Vertrag für Webseiten
nicht berücksichtigen muss.

## Entscheidung

1. **Ein Resolver für jede E-Mail.** `EmailBrandingResolver` ist die einzige Quelle für Markenwerte;
   `OrisoEmailBrand.valuesForTenant(appUrl, tenantId)` ist der einzige Weg, auf dem ein Sender sie bezieht.
   Die Eigenschaften `email.brand.platform-name`, `email.brand.org-name` und `email.brand.logo-url`
   werden entfernt. Die SMTP-Eigenschaft `emailThemeColor` dient nicht mehr als Gestaltungsvorgabe.

2. **Ein Logo wird nur vom eigenen Ursprung der Plattform geladen.** Eine Logo-URL wird nur verwendet,
   wenn Schema, Host und Port mit `app.base.url` übereinstimmen. Ein gespeichertes Bild (keine URL) wird
   über `<appBase>/service/tenant/public/branding/{tenantId}/logo` aufgelöst. Alles andere wird verworfen;
   die E-Mail verwendet stattdessen die Wortmarke als Text.

   Der Grund ist nicht Ordnung. Ein Bild in einer E-Mail wird beim Lesen vom Client des Empfängers
   abgerufen, von dem Ziel der URL. Dadurch erfährt ein Dritter, dass diese Person diese E-Mail zu diesem
   Zeitpunkt von dieser Adresse geöffnet hat. Ein Trägerlogo auf einem fremden CDN macht jede
   Beratungs-E-Mail zu einem Tracking-Pixel. Der Keycloak-Theme-Generator enthält dieselbe Prüfung;
   ein fehlendes Logo hinterlässt daher keine Lücke im Layout statt eines defekten Bildes.

3. **Eine Markenfarbe ohne ausreichenden Kontrast zu weißem Text wird abgelehnt.** Die Beschriftung der
   Schaltfläche ist weiß. Der Kontrast wird gegen Weiß gemessen; unter 4,5:1 wird stattdessen die
   ORISO-Primärfarbe verwendet und eine Warnung protokolliert. Das wird Farben ablehnen, die manche
   Träger im Druck verwenden. Das ist beabsichtigt und muss mit ihnen besprochen werden; die Regel soll
   deshalb nicht abgeschwächt werden. Text- und Rahmenfarben werden aus der akzeptierten Farbe
   abgeleitet und nie separat gespeichert.

4. **Keine E-Mail wird mit einer leeren Organisationszeile dargestellt.** Jeder Wert hat einen
   funktionierenden Rückfall: Der Markenname fällt auf den Plattformnamen und schließlich auf `ORISO`
   zurück; Impressums- und Datenschutz-URLs werden aus der Basis-URL des Mandanten gebildet; das Logo
   darf fehlen. Ein fehlendes Feld schränkt die Darstellung ein, macht sie aber nie leer.

5. **Branding wird für jede E-Mail frisch aufgelöst, mit einem kurzen Cache.** Mandantendaten werden
   über `getRestrictedTenantDataFresh` mit einem TTL-Cache von zehn Sekunden gelesen. Der Cache ist auf
   1000 Einträge begrenzt und speichert auch negative Ergebnisse. Ändert ein Träger sein Logo, muss er
   nicht auf eine Bereitstellung warten; ein Digest-Stapel belastet TenantService nicht mit unnötigen Abfragen.

## Implementierungsstand (auf `dev` gemessen, 2026-09-22)

| Entscheidung | Stand auf `dev` |
|---|---|
| 1. Ein Resolver | **Nicht implementiert.** In ORISO-UserService bestehen weiterhin zwei Mechanismen. `OrisoEmailBrand` (Passwort zurücksetzen, Anmeldung per Magic Link, Willkommen, hinzugefügter Supervisor) liest weiterhin Eigenschaften `email.brand.*` und verwendet SMTP-`emailThemeColor` als Primärfarbe. Es hat keine TenantService-Anbindung und kein `valuesForTenant`. `EmailBrandingResolver` (TenantService-Theming, Eigenschaften `email.branding.name` / `email.branding.logo-url`) wird nur im Einladungspfad über `InviteFrameMailRenderer` verwendet. |
| 2. Nur eigener Ursprung | **Nicht implementiert.** Seit 2026-09-22 auf `dev`: Ein gespeichertes Trägerlogo (keine URL) wird über `<app.base.url>/service/tenant/public/branding/{tenantId}/logo` aufgelöst (`ORISO-UserService#1229`). Die neue TenantService-Route `GET /tenant/public/branding/{tenantId}/{asset}` liefert es aus; `asset` ist `logo` oder `favicon` (`ORISO-TenantService#269`). Keine Authentifizierung, keine Cookies, 404 für einen unbekannten Mandanten; sie ruft niemals ein externes Bild ab. Die Mandanten-ID im Pfad wählt den Mandanten, sodass die Route nicht durch Host-Auflösung das Bild eines anderen Trägers ausliefern kann. **Aber** eine absolute Logo-URL des Mandanten wird weiterhin unverändert verwendet, unabhängig vom Ursprung; dasselbe gilt für `email.branding.logo-url` der Plattform. Das oben genannte Tracking-Pixel-Risiko besteht deshalb weiter für Träger mit externer Logo-URL. `#1229` erklärt ausdrücklich, dass die Ursprungsregel nicht übernommen wird. |
| 3. Kontrast gegen Weiß | **Nur im Katalogpfad implementiert.** `OrisoEmailBrand` lehnt eine Farbe unter 4,5:1 gegen Weiß ab, fällt auf die ORISO-Primärfarbe zurück und protokolliert eine Warnung. Der Einladungspfad (`EmailBrandingResolver` mit `EmailColors`) lehnt Farben nicht ab; er leitet lesbare Vordergrundfarben aus der vom Träger gewählten `primaryColor` ab. |
| 4. Keine leere Organisationszeile | **Implementiert** auf beiden Pfaden: Beide haben einen Namensrückfall bis zu `ORISO` und bilden Impressums- und Datenschutz-URLs. Seit `#1229` wird eine Mandanten-Basis-URL ohne Host (leere Subdomain) abgelehnt. Der Footer fällt deshalb auf die Anwendungs-Basis-URL zurück statt auf `https://.<host>`. |
| 5. Frisches Lesen, Cache für zehn Sekunden | **Nicht implementiert.** `EmailBrandingResolver` auf `dev` liest `getRestrictedTenantData`, das den allgemeinen Spring-Mandantencache verwendet, nicht `getRestrictedTenantDataFresh`. Die Variante mit begrenzter TTL existiert nur im Branch `origin/email-v2.1`. |

## Was TenantService noch fehlt

Dieser Vertrag verlangt mehr, als das Mandantenschema bietet. Die Lücke wird hier festgehalten,
statt sie hinter Rückfällen zu verstecken:

| Gewünscht | Stand |
|---|---|
| `theming.accent` (der helle Akzent) | **In der TenantService-API auf `dev`** (`ORISO-TenantService#154` geschlossen). UserService liest ihn noch nicht — `EmailBrandingResolver` dokumentiert ihn weiterhin als fehlend — daher werden E-Mails weiterhin nur im hellen Erscheinungsbild dargestellt. |
| `theming.secondaryColor` | Im Schema, aber ORISO-Admin schreibt bei jedem Speichern des Themings `null`; daher praktisch nicht vorhanden. (Am 2026-09-22 nicht erneut gemessen.) |
| Absenderidentität pro Träger | Fehlt. `smtpFrom` gilt pro Umgebung; in einer Umgebung mit mehreren Trägern senden daher alle von derselben Adresse. (Am 2026-09-22 nicht erneut gemessen.) |
| Organisationsadresse und Kontaktzeile | Fehlen — derzeit erzeugt oder ausgelassen. |
| Impressums- und Datenschutz-URLs | Keine Felder; fest vorgegebene Pfade `/impressum` und `/datenschutz` werden an eine Basis-URL angehängt (in `EmailBrandingResolver` auf `dev` bestätigt). |

Solange die Absenderidentität fehlt, sieht der Empfänger die richtige Organisation **in** der E-Mail
und die falsche in der Zeile `From:`. Das ist der auffälligste verbleibende Mangel dieses Vertrags und
erfordert eine Änderung in TenantService, keine E-Mail-Änderung.

## Folgen

- Katalog-E-Mails erhalten das Mandantenbranding, sobald Entscheidung 1 umgesetzt ist. Auf `dev` gilt das derzeit nur für Einladungs-E-Mails.
- Die Anrede pro Mandant (`de-sie` gegenüber `de-du`) ist **kein** Teil dieses Vertrags und hat nirgends
  ein Feld. Bis eines existiert, verwendet Deutsch überall die formelle Variante; `de-du` ist nur in Storybook erreichbar.
- Die Ablehnung einer Trägerfarbe ist sichtbares Verhalten, keine stille Ersetzung: Der Rückfall wird protokolliert.
- `ADR-010` regelt, was ein Träger am Erscheinungsbild der Anwendung ändern darf; diese ADR regelt, was
  davon in einer E-Mail ankommt. Bei Widersprüchen gilt die engere Regel: Ein Wert, den ADR-010 in der
  Anwendung erlaubt, kann aus den beiden oben genannten Gründen in einer E-Mail weiterhin abgelehnt werden.
- Code zitiert diese Entscheidung als **„ADR-021“** (UserService `OrisoEmailBrand`,
  `InviteFrameMailRenderer`; Frontend `src/emails/scripts/buildKeycloakTheme.mts`). In dieser Reihe
  beschreibt ADR-021 die Hierarchie der Rechtstexte. Der richtige Verweis ist ADR-026.
