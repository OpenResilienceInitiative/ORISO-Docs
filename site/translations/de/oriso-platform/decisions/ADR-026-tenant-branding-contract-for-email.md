# ADR-026: Ein Branding-Vertrag pro Mandant für E-Mails; Farben ohne ausreichenden Kontrast zu weißem Text werden abgelehnt

- **Status:** Angenommen — Frank, 2026-09-15
- **Implementierung:** teilweise auf `dev` — Entscheidung 4 ja, Entscheidung 3 auf einem Pfad, Entscheidungen 1, 2 und 5 nicht (siehe Implementierungsstand)
- **Datum:** 2026-09-15 (Implementierungsstand auf `dev` am 2026-09-22 erneut gemessen)
- **Änderung:** 2026-09-30 — Frank hat entschieden, dass für die Installation ein eigener, separat
  erforderlicher rechtlicher Organisationsname angegeben werden muss; das ersetzt den Rückfall auf den
  Organisationsnamen in Entscheidung 4.
- **Änderung:** 2026-10-02 — Frank hat entschieden, dass E-Mail-Farben derselben Design-Token-Logik folgen
  wie das Web-Frontend; das ersetzt Entscheidung 3 (siehe die Änderung weiter unten).
- **Entscheider:** Frank (Produkt) + KI (Engineering)
- **Bezug:** `ADR-010` (plattformgesteuerte Freigabeliste für das Erscheinungsbild pro Mandant); `ADR-024`
  (Benachrichtigungsmatrix); `ADR-025` (Ersatz des Upstream-Mailpfads); EPIC `ORISO-Frontend#828`;
  `ORISO-Frontend#862` (diese Entscheidung); `ORISO-TenantService#154` (Akzentfeld);
  `ORISO-TenantService#269` und `ORISO-UserService#1229` (an den Mandanten gebundene Logo-Route, zusammengeführt
  am 2026-09-22)
- **Geltungsbereich:** Welche Markenwerte ausgehende E-Mails verwenden, woher sie kommen und was passiert,
  wenn sie fehlen oder unbrauchbar sind; der datierte Nachtrag unten legt außerdem fest, wem der
  Sender-Transport gehört.

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

   **Ersetzt am 2026-10-02:** siehe „Änderung — E-Mail-Farben folgen den Design-Tokens“ weiter unten.
   Eine helle Farbe wird nicht mehr abgelehnt.

4. **Keine E-Mail wird mit einer leeren Organisationszeile dargestellt.** Eine neue Installation muss
   sowohl ihren Produktnamen als auch ihren separaten rechtlichen Organisationsnamen ausdrücklich
   konfigurieren. Der rechtliche Name wird weder aus dem Produktnamen noch aus `ORISO` abgeleitet.
   Fehlende Werte stoppen die Installation bzw. den Start des E-Mail-Themes mit einem benannten
   Konfigurationsfehler. Mandantenspezifische Werte werden über den freigegebenen Branding-Vertrag
   aufgelöst; ein Logo darf fehlen. Impressums- und Datenschutzlinks verwenden weiterhin den geprüften
   Ursprung der Installation. Weder ein Name noch ein öffentlicher Link fällt stillschweigend auf die
   Identität einer anderen Installation zurück.

5. **Branding wird für jede E-Mail frisch aufgelöst, mit einem kurzen Cache.** Mandantendaten werden
   über `getRestrictedTenantDataFresh` mit einem TTL-Cache von zehn Sekunden gelesen. Der Cache ist auf
   1000 Einträge begrenzt und speichert auch negative Ergebnisse. Ändert ein Träger sein Logo, muss er
   nicht auf eine Bereitstellung warten; ein Digest-Stapel belastet TenantService nicht mit unnötigen Abfragen.

## Historischer Implementierungsstand (auf `dev` gemessen, 2026-09-22)

Die folgende Tabelle hält diese datierte Messung fest. Sie ist älter als die Änderung vom 2026-09-30
und sagt nichts über den heutigen Stand von Quellcode, Bereitstellung oder empfangenen E-Mails aus.

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

## Nachtrag — Sender-Transport und Konfiguration (angenommen 2026-09-25)

Frank hat den ausdrücklichen Servermodus gewählt, der in
[ORISO-Frontend#1562](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1562)
vorgeschlagen wurde. Damit erstreckt sich der Branding-Vertrag auch auf den Absender, den der Empfänger
sieht. Er ersetzt die abweichende Annahme „kein Plattform-Rückfall“ aus ORISO-TenantService#240,
**aber nur, wenn der Träger ausdrücklich den Plattformmodus verwendet**.

1. **Der Plattformserver hat genau einen Eigentümer: die Deployment-Konfiguration.** Host, Port,
   Verschlüsselungsmodus, Absender und Zugangsdaten stammen für alle Plattform-E-Mails aus derselben
   bereitgestellten Konfiguration, einschließlich der Keycloak-Konto-E-Mails und des Admin-Tests. Admin
   zeigt die wirksamen Einstellungen schreibgeschützt an; es kann keine konkurrierende
   Plattformkonfiguration speichern. Wo der Kontozugang eine E-Mail erfordert, meldet die Installation
   bzw. der Start eine fehlende oder ungültige Plattform-SMTP-Einstellung, statt diese Abläufe
   stillschweigend ohne Versandmöglichkeit zu lassen.

2. **Jeder Träger hat einen ausdrücklichen Modus.** Neue Träger verwenden standardmäßig `PLATFORM`; sie
   können `OWN` wählen und eine vollständige Serverkonfiguration speichern. Das Admin-Formular speichert
   angezeigte Plattformwerte nie als Überschreibung des Trägers. Bestehende Datensätze müssen vor der
   Zuweisung eines Modus geprüft werden: Eine vollständige eigene Konfiguration kann für `OWN`
   vorgeschlagen werden, während eine unvollständige Konfiguration eine für Betreiber sichtbare
   Korrektur braucht und nicht stillschweigend als der eine oder andere Modus gedeutet werden darf.

3. **Der Versand richtet sich nach dem gewählten Modus.** `PLATFORM` versendet über den Plattformserver
   mit einem wahrheitsgemäßen Plattformabsender, wobei der Träger gegebenenfalls im Anzeigenamen und in
   der Antwortadresse genannt wird. `OWN` versendet über TenantService, das die Zugangsdaten des Trägers
   besitzt und sie erst beim Versand entschlüsselt. Ist diese Konfiguration unvollständig oder schlägt
   der Versand fehl, meldet der Aufrufer einen Fehler; er versucht es niemals erneut über den
   Plattformserver. Eine Domain des Trägers darf nicht in `From` stehen, während über den
   Plattformserver versendet wird.

4. **Öffentliche Links erhalten nie einen Ersatz-Host.** Ein fehlender, leerer oder Platzhalter-Ursprung
   führt dazu, dass Installation oder Dienststart mit Nennung der Einstellung fehlschlägt. Weder
   Produktion noch localhost dürfen eingesetzt werden. Die optionale `OWN`-SMTP-Konfiguration wird bei
   der Auswahl validiert; ihr Fehlen hindert einen `PLATFORM`-Träger nicht daran, den Plattformserver zu
   verwenden.

5. **Die Geheimnisgrenze bleibt erhalten.** UserService liest das SMTP-Passwort des Trägers nicht über
   ein DTO, das mit dem Benutzer des Endnutzers authentifiziert ist, und speichert es nicht im Cache.
   Der interne Versandendpunkt von TenantService bleibt auf die technische Identität beschränkt. Dass
   der Endpunkt derzeit keinen Plattform-Rückfall hat, ist innerhalb des `OWN`-Modus korrekt; die
   Entscheidung über den Modus gehört zur darüberliegenden Orchestrierung.

Der Nachtrag ist eine Grundsatzentscheidung, keine Aussage über Umsetzung oder Bereitstellung. Die erste
Lieferung muss Versandtests mit zwei Mandanten (Plattform- und eigener Server), Absender-Header,
Prüfungen auf Fehlschlag ohne Rückfall und ein echtes Auslesen des Postfachs auf Dev umfassen. Stage
braucht einen eigenen Betreiber-Rollout und Test.

## Änderung — SMTP-Quelle der Plattform (angenommen 2026-09-29)

Frank und Hassan haben vereinbart, Punkt 1 des Nachtrags vom 2026-09-25 zu ersetzen. **Admin-Einstellungen
/ ConsultingTypeService sind die einzige dauerhafte Laufzeitquelle für das Plattform-SMTP.** Die
ausdrücklichen Mandantenmodi `PLATFORM`/`OWN`, die Geheimnisgrenze für den eigenen Server und die Regel
zur öffentlichen URL bleiben bestehen. Jeder Plattform-Sender, einschließlich Einladung, DPA, Passwort
zurücksetzen, Anmeldelink, Admin-Testmail und Keycloak-Einmalcode, muss denselben gespeicherten
Einstellungen und derselben Rotation der Zugangsdaten folgen. SMTP-Werte aus dem Deployment dürfen diese
Einstellungen weder überschreiben noch als stiller Rückfall dienen.

Eine frische Installation ist anbieterneutral. Das Chart darf weder den bestehenden Mail-Host von ORISO
noch eine Absenderadresse, ein Postfach oder ein bestimmtes SMTP-Produkt voraussetzen. Es darf eine
einmalige Bootstrap-Eingabe nur dann annehmen, wenn der erste Administrator ohne E-Mail nicht in die
Admin-Einstellungen gelangt; diese Eingabe muss die von Admin verwaltete Konfiguration initialisieren und
danach keine Laufzeitquelle mehr sein. Andernfalls kann die Installation ohne SMTP starten, erklären, was
zu konfigurieren ist, und bei E-Mail-abhängigen Vorgängen einen benannten Fehler zurückgeben, bis die
Einstellungen vollständig sind. Die öffentliche URL bleibt eine harte Anforderung an Installation bzw.
Start. Der Schlüssel zum Verschlüsseln gespeicherter SMTP-Passwörter wird unabhängig vom Mail-Anbieter
bereitgestellt.

Keycloak muss abgeglichen werden, wenn sich die Admin-Einstellungen ändern, nicht nur beim Start; ein
Job, der nur bei der Installation oder beim Helm-Upgrade läuft, würde eine Passwortrotation verpassen.
Zugangsdaten dürfen nicht in einen Chart-Wert, ein Protokoll, ein Prozessargument oder ein temporäres
Staging-Secret geschrieben werden. Das Lesen aus den Admin-Einstellungen ändert nicht, wie Keycloak seine
Realm-SMTP-Konfiguration speichert; diese Speicherung ist ein eigenes Sicherheitsthema. Zur Abnahme
gehören ein echter Durchlauf der Einrichtung einer frischen Installation, alle Plattform-Mailarten und
die Rotation, getestet an empfangenen E-Mails auf Dev, sowie das gesonderte Betreiber-Gate für Stage.
Offene Implementierungs-PRs sind kein Abnahmenachweis, solange sie nicht geprüft, zusammengeführt,
bereitgestellt und verifiziert sind.

## Änderung — E-Mail-Farben folgen den Design-Tokens (angenommen 2026-10-02)

Frank hat entschieden, dass eine E-Mail für denselben Träger die Farben zeigen muss, die das Web-Frontend
zeigt. Das ersetzt Entscheidung 3 und den Absatz zu `theming.accent` in „Was TenantService noch fehlt“.
Verfolgt in `ORISO-UserService#1252`.

3'. **E-Mail verwendet dieselbe Token-Logik wie das Web-Frontend.**

- Die `primaryColor` eines Trägers wird unverändert für den Kopfstreifen und die Schaltflächenfüllung
  verwendet.
- Die Beschriftungsfarbe der Schaltfläche wird wie das `on-primary` des Frontends abgeleitet: Weiß, wenn
  die Farbe gegen Weiß 4,5:1 erreicht, andernfalls ein dunkler Ton desselben Farbtons.
- Textlinks auf der weißen Inhaltsfläche werden abgedunkelt, bis sie 4,5:1 erreichen. Streifen und
  Schaltfläche behalten die Farbe des Trägers.
- Eine Farbe, die das Frontend als zu blass (nahezu grau) ignoriert, wird auch in der E-Mail ignoriert,
  sodass beide dieselben Farben ablehnen.
- `accent` und `signal` werden vom Mandanten gelesen, aber nicht verwendet, solange die E-Mail kein
  dunkles Erscheinungsbild hat.
- Hat der Träger keine verwendbare Farbe, wird die Theming-Farbe der Plattform verwendet (TenantService
  übernimmt fehlende Werte bereits von dort). Fehlt auch diese oder ist sie unbrauchbar, verwendet die
  E-Mail den neutralen Installationsstandard `#000000` (Schwarz, weiße Schaltflächenbeschriftung). Es wird
  kein Fehler ausgelöst, und im E-Mail-Code ist keine Markenfarbe fest eingetragen.
- **Der Standard `#000000` ist eine ausdrückliche Ausnahme von der Regel für nahezu graue Farben, die nur
  für E-Mails gilt.** Das Web-Frontend lehnt eine nahezu graue („zu blasse“, Buntheit unter 12) Farbe ab,
  und Schwarz ist eine solche Farbe. Diese Prüfung gilt für eine Farbe, die ein Träger oder die Plattform
  als Ausgangswert *konfiguriert* hat. Der Standard ist kein konfigurierter Ausgangswert, sondern eine
  Konstante im E-Mail-Code und umgeht die Prüfung deshalb. Das Web-Frontend verfährt nicht so: Im selben
  Fall (nirgends eine verwendbare Farbe) behält es seine Standardpalette und nicht Schwarz. E-Mail und Web
  unterscheiden sich hier also absichtlich; diese ADR hält das fest, statt es zu verbergen.
- **Die Installationseinstellung ist die `theming.primaryColor` des Plattform-Mandanten**
  (Plattform-Theming). Sie ist die eine Einstellung, mit der eine Installation den E-Mail-Standard ändert.
  Die Konstante `#000000` gilt nur, solange dieser Wert nicht gesetzt oder unbrauchbar ist (ungültig oder
  nahezu grau). Die weiße Beschriftungsfarbe ergibt sich aus der normalen 4,5:1-Regel, angewandt auf die
  jeweils wirksame Farbe.
- Frontend und UserService werden gegen ein gemeinsames Golden-Fixture aus Ausgangsfarben und erwarteten
  Ergebnissen getestet, das dem Frontend gehört. UserService hält eine Kopie, und die CI prüft, dass die
  Kopie identisch ist.

Warum: Eine helle Markenfarbe durch das Rot von ORISO zu ersetzen, verwirft die Identität des Trägers und
ist das Gegenteil des Ziels dieser ADR. Die Lesbarkeit wird durch Ableitung gesichert, nicht durch
Ablehnung, genau wie in der Web-Oberfläche.

Hier nicht entschieden: fertige Tokens von TenantService an alle Verbraucher auszuliefern (eine
Implementierung statt zwei). Das würde das Paritätsrisiko beseitigen, berührt aber TenantService,
Frontend, Admin und UserService und braucht deshalb eine eigene Entscheidung.

Implementierungsstand: zum Zeitpunkt dieser Änderung auf `dev` nicht implementiert. Der generierte
TenantService-Client von UserService enthält `accent` und `signal` noch nicht.

## Folgen

- Katalog-E-Mails erhalten das Mandantenbranding, sobald Entscheidung 1 umgesetzt ist. Auf `dev` gilt das derzeit nur für Einladungs-E-Mails.
- Die Anrede pro Mandant (`de-sie` gegenüber `de-du`) ist **kein** Teil dieses Vertrags und hat nirgends
  ein Feld. Bis eines existiert, verwendet Deutsch überall die formelle Variante; `de-du` ist nur in Storybook erreichbar.
- Eine Trägerfarbe wird nicht mehr abgelehnt, weil sie hell ist (Änderung 2026-10-02); nur ein ungültiger
  oder nahezu grauer Wert führt zum Rückfall, und der Rückfall wird protokolliert.
- `ADR-010` regelt, was ein Träger am Erscheinungsbild der Anwendung ändern darf; diese ADR regelt, was
  davon in einer E-Mail ankommt. Bei Widersprüchen gilt die engere Regel: Ein Wert, den ADR-010 in der
  Anwendung erlaubt, kann aus den beiden oben genannten Gründen in einer E-Mail weiterhin abgelehnt werden.
- Code zitiert diese Entscheidung als **„ADR-021“** (UserService `OrisoEmailBrand`,
  `InviteFrameMailRenderer`; Frontend `src/emails/scripts/buildKeycloakTheme.mts`). In dieser Reihe
  beschreibt ADR-021 die Hierarchie der Rechtstexte. Der richtige Verweis ist ADR-026.
