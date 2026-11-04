# 6 Verfahren und Technik (/legal/dsfa/06-verfahren-und-technik)



## 6.1 Zweck [#61-zweck]

Zweck der Verarbeitung ist die Bereitstellung und der technische Betrieb einer
Online-Beratungsplattform (nachfolgend „Plattform"), über die Träger und Beratungsstellen ihren
fachlichen Beratungsauftrag digital, ortsunabhängig und niedrigschwellig erfüllen können. Die
inhaltliche Beratung selbst sowie deren Fachdokumentation verantworten die Träger; eine
inhaltliche Falldokumentation findet auf der Plattform nicht statt. Beratungsinhalte werden
Ende-zu-Ende-verschlüsselt übertragen und gespeichert (im Einzelnen Abschnitt 6.9).

## 6.2 Beratungsarten [#62-beratungsarten]

### 6.2.1 Einzelberatung (1:1-Chat) [#621-einzelberatung-11-chat]

Registrierte Ratsuchende richten ihre Erstanfrage an eine Beratungsstelle; die Zuordnung erfolgt
über die angegebene Postleitzahl sowie das gewählte Beratungsthema. Der Beratungsverlauf findet in
einem eigenständigen, nicht öffentlich auffindbaren, Ende-zu-Ende-verschlüsselten Chatraum statt;
Beratung ist sowohl synchron als auch asynchron möglich. Der Zugriff einer weiteren beratenden
Person auf einen bestehenden Fall ist ausschließlich über das protokollierte Übergabeverfahren
vorgesehen (Abschnitt 6.13).

### 6.2.2 Anonymer Live-Einzelchat [#622-anonymer-live-einzelchat]

Der Live-Einzelchat ist ohne Registrierung nutzbar. Die ratsuchende Person betritt einen
virtuellen Warteraum unter einem systemgenerierten Pseudonym; personenbezogene Angaben werden
nicht erhoben. Auch dieser Chat ist Ende-zu-Ende-verschlüsselt. Anonyme Konten werden nach
Inaktivität automatisiert deaktiviert und anschließend gelöscht (Abschnitt 6.18).

### 6.2.3 Gruppenchat [#623-gruppenchat]

Der Gruppenchat ermöglicht moderierte n:n-Beratung, insbesondere für Selbsthilfeformate. Die
Moderation legt Chatangebote mit Thema, Datum, Uhrzeit sowie einmaliger oder wiederkehrender
Terminfolge an; abgelaufene Gruppenchats werden automatisiert deaktiviert. Auch Gruppenräume
werden mit aktivierter Ende-zu-Ende-Verschlüsselung angelegt.

**Risiko und Kompensation.** In einer Gruppe nehmen die Teilnehmenden einander wahr; die
Vertraulichkeit gegenüber anderen Ratsuchenden beruht damit auf der Pseudonymität und auf der
Moderation, nicht auf technischer Trennung. Kompensierend wirken die systemgenerierten Pseudonyme
(Abschnitt 6.3), die Moderationsrechte einschließlich des Entfernens von Teilnehmenden sowie die
Beschränkung der Teilnehmendenzahl. Eine wiederkehrende Terminserie kann für sich genommen ein
Teilnahmeprofil erkennen lassen; dieses Restrisiko ist im Rahmen der Moderation und der
Aufklärung der Teilnehmenden zu adressieren.

### 6.2.4 Video- und Audio-Beratung [#624-video--und-audio-beratung]

Die Videoberatung erfolgt browserbasiert über eine selbst betriebene Medienvermittlung; sie ist in
Abschnitt 6.10 gesondert beschrieben.

### 6.2.5 Sprachnachrichten [#625-sprachnachrichten]

Sprachnachrichten sind in allen Chat-Formen möglich und je Träger und Chat-Typ abschaltbar; sie
sind wegen ihres besonderen Risikoprofils in Abschnitt 6.11 gesondert beschrieben.

### 6.2.6 Terminverwaltung — nicht ausgeliefert [#626-terminverwaltung--nicht-ausgeliefert]

Eine Terminverwaltung im Sinne eines Kalender- oder Buchungsmoduls ist **nicht Bestandteil des
aktuellen Leistungsumfangs**. Ein entsprechendes Modell ist als Architekturentscheidung
beschrieben ([ADR-020](/decisions/adr-020), „Scheduled calls, secure invitations, and a unified contact calendar",
Status „Accepted"); ausgeliefert ist davon bisher nichts. Ein im Datenmodell vorhandener
Termin-Datensatz stammt aus der Vorgängerplattform und ist im Auslieferungsstand nicht aktiviert.
Diese DSFA bewertet die geplante Funktion daher nicht; sie ist bei Auslieferung zu ergänzen.

<RelatedAdrs numbers="[&#x22;020&#x22;]" />

<RelatedAdrs numbers="[&#x22;001&#x22;,&#x22;006&#x22;,&#x22;007&#x22;,&#x22;012&#x22;]" />

## 6.3 Registrierung, Anonymität und Pseudonymität der Ratsuchenden [#63-registrierung-anonymität-und-pseudonymität-der-ratsuchenden]

Die Registrierung ist ohne Angabe identifizierender Daten möglich. Der Benutzername wird
**systemseitig erzeugt** (Kombination aus Adjektiv, Tierbezeichnung und Namensbestandteil, ergänzt
um eine Avatarfarbe); ein frei gewählter, potenziell identifizierender Klarname ist
konstruktionsbedingt ausgeschlossen. Dies ist eine bewusste Verbesserung gegenüber der
Vorgängerplattform, auf der Benutzernamen frei wählbar waren. Pflichtangabe ist die Postleitzahl
zur Zuordnung der zuständigen Beratungsstelle; ihre Richtigkeit wird nicht geprüft. Die Angabe
einer E-Mail-Adresse ist optional.

**Ehrliche Einordnung.** Ein systemgeneriertes Pseudonym ist **kein anonymes Datum**. Es ist über
die Kontokennung dauerhaft mit allen Beratungsvorgängen derselben Person verkettbar und daher
personenbezogen zu behandeln. Vollständige Anonymität besteht allein im registrierungsfreien
Live-Einzelchat, solange die ratsuchende Person keine identifizierenden Angaben von sich aus
macht. Ob eine Nutzung anonym ist, ergibt sich damit aus dem gewählten Zugangsweg und dem
Kontostatus — sie lässt sich insbesondere **nicht aus dem angezeigten Namen ableiten**.

**Wirksame Datenminimierung, aber begrenzt.** Neben der Sitzung werden je nach Fachbereich
Angaben gespeichert, die zusammen ein enges Quasi-Identifikator-Set bilden: Postleitzahl, Alter,
Geschlecht, Beratungsanlass und Beziehungskonstellation stehen in einer Datenzeile nebeneinander.
Für kleine Beratungsstellen ist damit ein Re-Identifikationsrisiko nicht auszuschließen.
Kompensierend wirken die Freiwilligkeit der Zusatzangaben, die fachbereichsbezogene Steuerung des
Erhebungsumfangs und der Verzicht auf jede Verknüpfung mit externen Datenquellen. Ebenfalls
gespeichert wird ein Herkunftsverweis (Referrer) der Registrierung; er ist für die
Zwecke der Beratung nicht erforderlich und als Minimierungskandidat auszuweisen.

<RelatedAdrs numbers="[&#x22;003&#x22;,&#x22;014&#x22;,&#x22;021&#x22;,&#x22;022&#x22;]" />

<Evidence chapter="6.3" slugs="[&#x22;username-base32-not-encrypted&#x22;,&#x22;session-quasi-identifier-set&#x22;,&#x22;session-data-initializing-scope&#x22;]" />

## 6.4 Konten der Beratenden, Administration und Einladungsverfahren [#64-konten-der-beratenden-administration-und-einladungsverfahren]

Konten für Beratende und für administrative Rollen werden nicht durch die Betroffenen selbst
angelegt, sondern über ein Einladungsverfahren durch die Administration des jeweiligen Trägers
bzw. der Beratungsstelle. Verarbeitet werden dabei Vor- und Nachname, die dienstliche
E-Mail-Adresse, die Zielrolle sowie die Zuordnung zu Träger und Beratungsstelle. Die Einladung
wird per E-Mail mit einem zeitlich befristeten, kryptografisch gesicherten Link zugestellt; der
Zugriffsschlüssel wird nur als Hashwert gespeichert.

Bei Beratenden handelt es sich um Klarnamen; der Anzeigename im Chat-Dienst entspricht dem
Realnamen, während Ratsuchende ausschließlich unter ihrem Pseudonym erscheinen. Ein Bulk-Import
einzuladender Personen aus einer Datei ist möglich; in diesem Fall stammen die Daten nicht von der
betroffenen Person selbst, weshalb die Informationspflicht bei Erhebung bei Dritten nach
§ 16 KDG (Art. 14 DSGVO) durch den einladenden Träger zu erfüllen ist.

**Restrisiko.** Der Versandvorgang wird mit einer vollständigen Kopie der versendeten Nachricht
einschließlich Empfängeradresse archiviert; eine Aufbewahrungsfrist ist bislang nicht definiert.
Ebenso ist für abgelaufene, nicht angenommene Einladungen kein Löschlauf eingerichtet. Beide
Punkte sind als Löschkonzept-Maßnahmen ausgewiesen (Abschnitt 6.18).

<RelatedAdrs numbers="[&#x22;023&#x22;]" />

<Evidence chapter="6.4" slugs="[&#x22;account-invite-pii-before-registration&#x22;,&#x22;invite-email-delivery-full-body-archive&#x22;]" />

## 6.5 Authentifizierung, Rollen und Zwei-Faktor-Authentisierung [#65-authentifizierung-rollen-und-zwei-faktor-authentisierung]

Die Anmeldung erfolgt über ein zentrales Identitätsmanagement (Keycloak) auf Basis von OAuth 2.0
und OpenID Connect mit signierten Token; Passwörter werden ausschließlich als gesalzene Hashwerte
im Identitätsmanagement gespeichert und sind der Anwendung zu keinem Zeitpunkt im Klartext
zugänglich. Sämtliche Verbindungen sind transportverschlüsselt.

**Rollenmodell.** Die Plattform kennt vier Personalebenen sowie die ratsuchende Person; intern
bilden feingranulare Realm-Rollen die API-Rechte ab.

| Ebene                           | Aufgabe                                                                                                                          | Zugriff auf Beratungsinhalte |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Plattform-Administration        | Betrieb der Plattform, Anlage von Trägern, Pflege der Rechtstext-Vorlagen der Plattformebene                                     | nein                         |
| Träger-Administration           | Verantwortung für einen Träger: Anlage von Beratungsstellen und deren Administration, Pflege der Rechtstexte der Trägerebene     | nein                         |
| Beratungsstellen-Administration | Leitung einer Beratungsstelle: Einladung Beratender, Konfiguration von Themen, Postleitzahlbereichen und Live-Chat-Zugang        | nein                         |
| Beratende                       | Annahme von Anfragen und Führung der verschlüsselten Beratung; Supervision ist eine Funktion an dieser Rolle, keine eigene Rolle | nur eigene Fälle             |
| Ratsuchende                     | Nutzung der Beratung                                                                                                             | nur eigene Sitzung           |

Es gelten zwei durchgängige Regeln: **hierarchische Isolation** — kein Träger sieht einen anderen,
keine Beratungsstelle sieht Ratsuchende oder Beratende einer anderen — und **Vererbung der
Rechtstexte**: Impressum, Datenschutzerklärung und Einwilligungstext bestehen auf jeder Ebene;
ohne eigene Fassung gilt die der übergeordneten Ebene.

**Komposit-Rollen der Administration.** Die Anlage einer Träger-Administration vergibt
systemseitig ein Bündel mehrerer Rollen (Nutzerverwaltung, Agenturverwaltung,
Mandantenverwaltung sowie, außerhalb des Single-Domain-Betriebs, Themenverwaltung). Die
Plattform-Administration ist technisch dieselbe Rollenkombination ohne Mandantenbindung; sie ist
damit **trägerübergreifend lesend umfassend berechtigt**. Eine Rolle, die den Betrieb eines
Trägers erlaubt, ohne dessen vertrauliche Betriebs- und Beratungsmetadaten einsehen zu können,
existiert derzeit nicht. Dieses Restrisiko ist in Abschnitt 6.16 behandelt.

**Zwei-Faktor-Authentisierung.** Als zweiter Faktor stehen eine Authenticator-Anwendung (TOTP,
sechsstelliger Code, 30-Sekunden-Intervall) sowie ein E-Mail-Einmalcode (sechsstellig,
Gültigkeit 15 Minuten, höchstens drei Fehlversuche) zur Verfügung. Für Ratsuchende ist die
Einrichtung optional. Für alle über das Einladungsverfahren angelegten Konten — insbesondere
Träger- und Beratungsstellen-Administration sowie Beratende — ist die Einrichtung **verbindlicher
Bestandteil der Kontoaktivierung**: Das Konto bleibt gesperrt, bis ein zweiter Faktor aktiv ist.
Eine Befreiung ist ausschließlich administrativ möglich, setzt die Angabe eines Grundes voraus und
wird personenbezogen mit Zeitpunkt und veranlassender Person dokumentiert. Für die
Plattform-Administration besteht demgegenüber lediglich eine Aufforderung beim Anmelden, die
sitzungsweise zurückgestellt werden kann („später einrichten") und bei der nächsten Anmeldung
erneut erscheint; ein technischer Zwang besteht insoweit nicht.

> **Ehrliche Grenzbenennung.** Die maßgebliche Konfiguration des Identitätsmanagements wird beim
> Erststart importiert und anschließend zur Laufzeit durch Skripte verändert; keine der im
> Quellcode versionierten Konfigurationsdateien ist daher für den Live-Zustand autoritativ. Für
> die abschließende Fassung dieser DSFA ist ein Export des Live-Realms erforderlich. Aus den
> versionierten Ständen ergibt sich ferner, dass ein automatischer Anmeldeschutz gegen
> systematisches Durchprobieren (Brute-Force-Sperre) **nicht aktiviert** ist — was zugleich
> bedeutet, dass keine Fehlversuchs- und IP-Historie gespeichert wird — und dass die
> Gültigkeitsdauer von Zugriffstoken mit fünf Stunden großzügig bemessen ist. Eine
> Passwortrichtlinie (Mindestlänge, Zeichenklassen) ist aus den Repositorien **nicht belegbar**
> und darf in dieser DSFA nicht behauptet werden, bevor sie am Live-System nachgewiesen ist.

<RelatedAdrs numbers="[&#x22;013&#x22;]" />

<Evidence chapter="6.5" slugs="[&#x22;tenant-admin-composite-roles&#x22;,&#x22;invite-two-factor-gate-blocking&#x22;,&#x22;two-factor-waiver-documented&#x22;,&#x22;platform-admin-two-factor-deferrable&#x22;,&#x22;otp-mechanics&#x22;,&#x22;keycloak-brute-force-disabled&#x22;,&#x22;keycloak-token-lifetimes&#x22;]" />

## 6.6 Verarbeitung der IP-Adresse und Protokollierung im Transportweg [#66-verarbeitung-der-ip-adresse-und-protokollierung-im-transportweg]

Die Anwendungsdienste selbst speichern keine IP-Adressen betroffener Personen in ihren
Fachdatenbeständen; sie arbeiten mit pseudonymen Kennungen und signierten Token. Für die
Weitergabe der Client-IP an die Fachdienste existiert ein Filter mit einem strengen Modus, der den
entsprechenden Weiterleitungs-Header entfernt; **standardmäßig ist dieser strenge Modus nicht
aktiv**.

Ehrlich auszuweisen ist, dass IP-Adressen an anderer Stelle des Transportwegs anfallen:

* Der vorgelagerte Eingangs-Proxy (Ingress) protokolliert im Standardformat die Client-IP, den
  aufgerufenen Pfad und die Browserkennung. Ein zentraler Log-Versand ist nicht eingerichtet; die
  Aufbewahrung folgt der Rotationsvorgabe der Container-Plattform und ist damit **nicht
  ausdrücklich festgelegt**.
* Das Identitätsmanagement persistiert zwar keine Anmeldeereignisse in seiner Datenbank, schreibt
  diese aber über den aktiven Protokoll-Zuhörer **einschließlich der IP-Adresse in den
  Server-Log-Strom**. Eine IP-freie Variante dieses Zuhörers liegt vor, ist jedoch nicht
  aktiviert — eine naheliegende und aufwandsarme Härtungsmaßnahme.
* Einzelne Endpunkte der Zwei-Faktor-Erweiterung führen den Benutzernamen im URL-Pfad; er gelangt
  dadurch in die Zugriffsprotokolle der vorgelagerten Komponenten.
* Beim Aufbau einer Videoverbindung werden derzeit öffentliche STUN-Server eines
  US-amerikanischen Anbieters angefragt; dabei werden Client-IP-Adressen an einen Empfänger in
  einem Drittland übermittelt (Abschnitt 6.10).

**Kompensation und Maßnahme.** Der Container der Administrationsoberfläche protokolliert bereits
bewusst ohne Client-IP; dasselbe Format ist für die übrigen Web-Container vorgesehen. Als
Maßnahmen sind festzuhalten: Aktivierung des IP-freien Protokoll-Zuhörers im Identitätsmanagement,
Festlegung einer ausdrücklichen Aufbewahrungsfrist für Zugriffsprotokolle, Maskierung
tokenhaltiger URL-Parameter in den Zugriffsprotokollen sowie Ersetzung der externen STUN-Server
durch eigene Komponenten. Die Aussage der Vorgängerdokumentation, IP-Adressen würden „zu keiner
Zeit vom System mitgeschrieben", ist für diese Plattform in dieser Absolutheit **nicht haltbar**
und wird bewusst nicht übernommen.

<Evidence chapter="6.6" slugs="[&#x22;ip-header-filter-default-standard&#x22;,&#x22;ingress-access-log-with-ip&#x22;,&#x22;admin-access-log-without-ip&#x22;,&#x22;keycloak-login-events-with-ip-in-log&#x22;,&#x22;otp-username-in-url-path&#x22;]" />

## 6.7 Cookies und Websitenutzungsdaten [#67-cookies-und-websitenutzungsdaten]

Die Plattform verzichtet vollständig auf Tracking, Analysedienste, Werbenetzwerke, externe
Schriftarten und Drittanbieter-Skripte; sämtliche Bestandteile werden von der Plattform selbst
ausgeliefert. Im Browser der Nutzer:innen wird keine Produkt- oder Fehlertelemetrie an Dritte
erhoben. Es werden ausschließlich technisch notwendige Cookies eingesetzt; ein Einwilligungsbanner
ist daher nicht erforderlich. Ohne Cookie-Unterstützung ist die Anwendung nicht nutzbar; hierauf
wird vor der Anmeldung hingewiesen.

| Cookie                                                                                                                                | Setzende Stelle           | Zweck                                                         | Speicherdauer                                 | Attribute               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------- | --------------------------------------------- | ----------------------- |
| `keycloak`                                                                                                                            | Anwendung                 | API-Authentifizierung (Zugriffstoken)                         | Sitzung                                       | SameSite=Strict, Secure |
| `refreshToken`                                                                                                                        | Anwendung                 | Erneuerung der Anmeldesitzung                                 | Sitzung                                       | SameSite=Strict, Secure |
| `CSRF-TOKEN`                                                                                                                          | Anwendung                 | Schutz vor Cross-Site-Request-Forgery                         | Sitzung                                       | SameSite=Strict         |
| `lang`                                                                                                                                | Anwendung                 | Sprachwahl                                                    | Sitzung                                       | SameSite=Strict         |
| `useInformal`                                                                                                                         | Anwendung                 | Du-/Sie-Anrede                                                | Sitzung                                       | SameSite=Strict         |
| `tenantId`                                                                                                                            | Anwendung                 | Mandantenzuordnung                                            | Sitzung                                       | SameSite=Strict         |
| `ui-version`                                                                                                                          | Anwendung                 | Wahl der Oberflächenversion                                   | befristet (Ablaufdatum)                       | SameSite=Lax            |
| `matrix_sso_user_id`, `matrix_sso_access_token`, `matrix_sso_device_id`, `matrix_sso_hs_url`                                          | Anwendung                 | Übergabe der Chat-Sitzung beim Wechsel der Oberflächenversion | Sitzung                                       | SameSite=Lax, Secure    |
| `oriso-admin.language`                                                                                                                | Administrationsoberfläche | Sprachwahl                                                    | befristet                                     | —                       |
| `AUTH_SESSION_ID`, `KEYCLOAK_IDENTITY`, `KEYCLOAK_SESSION`, `KC_RESTART`, `KEYCLOAK_LOCALE`, `KC_AUTH_STATE` (jeweils ggf. `_LEGACY`) | Identitätsmanagement      | Single-Sign-on-Sitzung                                        | an die Sitzungslaufzeiten des Realms gebunden | HttpOnly, Secure        |

**Restrisiko.** Die beiden Authentifizierungs-Cookies der Anwendung sind nicht mit dem Attribut
`HttpOnly` versehen und werden zusätzlich im lokalen Speicher des Browsers gespiegelt; sie sind
damit für Skripte im Seitenkontext lesbar. Die Cookies zur Übergabe der Chat-Sitzung tragen
zudem ein Matrix-Zugriffstoken bei gelockertem `SameSite`-Attribut. Beides erhöht die Auswirkung
einer erfolgreichen Cross-Site-Scripting-Attacke und ist als Härtungsmaßnahme (`HttpOnly`,
serverseitige Sitzungsführung, Verzicht auf die Spiegelung) auszuweisen. Eine Content-Security-
und Referrer-Policy ist am Eingangs-Proxy derzeit nicht gesetzt.

<Evidence chapter="6.7" slugs="[&#x22;auth-cookies-not-httponly&#x22;,&#x22;matrix-sso-cookies-lax&#x22;,&#x22;no-consent-banner-only-essential-cookies&#x22;]" />

## 6.8 Nutzung auf verschiedenen Endgeräten [#68-nutzung-auf-verschiedenen-endgeräten]

Die fachliche Verarbeitung erfolgt serverseitig; auf den Endgeräten verbleiben Sitzungsdaten,
Anzeigeeinstellungen und — konstruktionsbedingt — das kryptografische Schlüsselmaterial der
Ende-zu-Ende-Verschlüsselung. Die Absicherung des Endgeräts liegt in der Verantwortung der
Nutzer:innen; für Beratende gelten zusätzlich die organisatorischen Vorgaben ihres Trägers
(dienstliche bzw. freigegebene Geräte).

Im Einzelnen werden auf dem Endgerät abgelegt: Zugriffs- und Erneuerungstoken sowie deren
Gültigkeitszeitpunkte, die Anmeldedaten des Chat-Dienstes (Zugriffstoken, Nutzer- und
Gerätekennung), der kryptografische Speicher der Ende-zu-Ende-Verschlüsselung in einer
Browser-Datenbank (IndexedDB) sowie Oberflächeneinstellungen.

**Zwei Befunde sind offen auszuweisen.** Erstens werden **noch nicht versendete
Nachrichtenentwürfe im Klartext** im lokalen Speicher des Browsers abgelegt; die
Ende-zu-Ende-Verschlüsselung greift erst mit dem Versand. Auf gemeinsam genutzten Geräten kann
dies Beratungsinhalte offenlegen. Zweitens wird beim Abmelden zwar der lokale und der
Sitzungsspeicher geleert, **nicht jedoch der kryptografische Speicher in der Browser-Datenbank**;
Schlüsselmaterial verbleibt daher nach dem Abmelden auf dem Gerät. Beides ist als Maßnahme zu
führen (Verschlüsselung bzw. Verzicht auf persistente Entwürfe; vollständiger Wipe des
Krypto-Speichers beim Abmelden). Bis dahin ist der Hinweis auf die Nutzung eigener,
gesperrter Geräte Teil der Nutzerinformation.

<Evidence chapter="6.8" slugs="[&#x22;chat-drafts-plaintext-localstorage&#x22;,&#x22;indexeddb-crypto-store-survives-logout&#x22;]" />

## 6.9 Ende-zu-Ende-Verschlüsselung und Schlüsselkonzept [#69-ende-zu-ende-verschlüsselung-und-schlüsselkonzept]

Die Plattform basiert auf dem offenen Kommunikationsprotokoll **Matrix** mit einem selbst
betriebenen Heimserver. Sämtliche Beratungsräume — Einzelberatung, anonymer Live-Chat,
Gruppenchat, Supervision und interne Fallkoordination — werden **serverseitig verpflichtend mit
aktivierter Ende-zu-Ende-Verschlüsselung angelegt**; ein unverschlüsselter Sendepfad existiert
nicht.

**Schlüsselkonzept.**

1. **Geräteschlüssel und Olm.** Jedes Endgerät erzeugt bei der ersten Anmeldung ein eigenes
   Schlüsselpaar. Der direkte Austausch zwischen Geräten (insbesondere die Weitergabe von
   Raumschlüsseln) erfolgt paarweise verschlüsselt nach dem Olm-Verfahren.
2. **Raumschlüssel und Megolm.** Nachrichteninhalte werden mit einem Raumschlüssel nach dem
   Megolm-Verfahren (`m.megolm.v1.aes-sha2`) verschlüsselt. Der Raumschlüssel wird ausschließlich
   an die berechtigten Endgeräte der Raummitglieder verteilt; der Server erhält ihn zu keinem
   Zeitpunkt. Die Verschlüsselung ist Eigenschaft des Raums, nicht eines Schalters in der
   Oberfläche — ein Herabstufen einzelner Nachrichten ist konstruktionsbedingt ausgeschlossen.
3. **Geräteprüfung (Cross-Signing).** Schlüssel werden grundsätzlich nur an gegengezeichnete,
   also verifizierte Geräte weitergegeben. Ausgenommen sind die Endgeräte anonymer
   Live-Chat-Nutzer:innen, bei denen die Erreichbarkeit der Beratung Vorrang vor der
   Geräteisolation hat; die Verschlüsselung selbst bleibt auch dort vollständig wirksam.
4. **Dateianhänge.** Dateien werden zusätzlich clientseitig mit einem einmaligen
   AES-256-Schlüssel verschlüsselt, bevor sie das Endgerät verlassen. Der Server erhält weder
   Dateinamen noch Inhaltstyp, sondern einen nicht entschlüsselbaren Datenblock; der zugehörige
   Schlüssel wird ausschließlich innerhalb der Megolm-verschlüsselten Nachricht transportiert.
5. **Serverseitiges Schlüssel-Backup („Silent Key Backup").** Zur Wiederherstellung nach
   Geräteverlust oder Neuanmeldung wird ein serverseitiges, seinerseits verschlüsseltes Backup
   aller Raumschlüssel geführt. Der Schlüssel zu diesem Backup liegt in einem verschlüsselten
   Geheimspeicher (Secret Storage), der ausschließlich über einen beim Nutzer verbleibenden
   Wiederherstellungsschlüssel geöffnet werden kann. Der Server kann die gesicherten Schlüssel
   nicht lesen. Ein Zurücksetzen des Backups ist destruktiv: Die zuvor gesicherte Historie wird
   dauerhaft unlesbar.
6. **Geparktes Gerät (Device Dehydration).** Ein zusätzliches, hinterlegtes Pseudo-Gerät zur
   nahtlosen Wiederaufnahme ist implementiert, steht jedoch unter einem Freigabeschalter und ist
   nur bei dessen Aktivierung wirksam. Es erweitert die Angriffsfläche um eine serverseitig
   geparkte Identität und ist bei Aktivierung gesondert zu bewerten.
7. **Schlüsselübergabe bei Fallübergabe.** Für die Weitergabe der Beratungshistorie an eine neu
   hinzutretende, berechtigte Fachkraft werden die betreffenden Raumschlüssel gezielt und
   verschlüsselt an deren Gerät übertragen (Abschnitt 6.13).

**Keine Föderation.** Der Verbund mit fremden Matrix-Servern ist bewusst deaktiviert; es verlassen
keine Beratungsdaten den Heimserver der Plattform in Richtung fremder Server.

> **Ehrliche Abgrenzung — was zugesichert wird und was nicht.** Zugesichert wird, dass
> Beratungsinhalte den Server ausschließlich verschlüsselt erreichen und verlassen und dass
> Betreiber und Dienstleister sie nicht im Klartext einsehen können. **Nicht** zugesichert wird
> ein kryptografischer Ausschluss jeder denkbaren Betreiberhandlung: Der Heimserver verfügt über
> administrative Funktionen, mit denen sich Sitzungstoken für Nutzerkonten ausstellen lassen; ein
> so erlangter Zugang könnte künftige Schlüssel empfangen. Innerhalb einer Beratungsstelle ist die
> maßgebliche Vertraulichkeitsgrenze zudem nicht die Verschlüsselung, sondern die
> anwendungsseitige Zugriffskontrolle in Verbindung mit dem protokollierten Übergabeverfahren
> ([ADR-002](/decisions/adr-002), Abschnitt 6.13). Diese Unterscheidung wird bewusst offengelegt, weil ein pauschales
> Verschlüsselungsversprechen den tatsächlichen Schutz falsch beschreiben würde. Als
> flankierende organisatorische Maßnahme ist der administrative Zugriff auf den Heimserver beim
> Betreiber vertraglich zu binden und zu protokollieren.

**Verbesserung gegenüber der Vorgängerplattform.** Auf der Vorgängerplattform war die
Ende-zu-Ende-Verschlüsselung funktionsschaltergesteuert und stand neben einem serverseitigen
Verschlüsselungspfad, dessen Schlüsselbestandteile vollständig auf dem Server lagen; der Betreiber
konnte Inhalte dort technisch entschlüsseln. Der anonyme Live-Chat war von der
Ende-zu-Ende-Verschlüsselung praktisch ausgenommen, weil das Schlüsselmaterial aus dem
Anmeldepasswort abgeleitet wurde. Ferner bestand für Teilnehmende ohne eigenen öffentlichen
Schlüssel ein Rückfallverfahren, dessen Ersatzschlüssel aus einer serverbekannten Kennung
ableitbar war, sowie ein stiller Rückfall auf die serverseitige Verschlüsselung im Fehlerfall. In
der vorliegenden Plattform bestehen weder ein serverseitiger Entschlüsselungspfad noch ein
Rückfallverfahren; die Verschlüsselung gilt durchgängig für alle Chat-Formen einschließlich des
anonymen Live-Chats sowie für Dateien und Sprachnachrichten.

**Systembedingt verbleibende Metadaten.** Auch bei wirksamer Ende-zu-Ende-Verschlüsselung
verarbeitet der Heimserver Metadaten: Raumzugehörigkeit und Mitgliedschaften, pseudonyme
Absenderkennung, Zeitstempel, Ereignistyp, Bezugsereignis bei Antworten und Reaktionen, Größe des
Chiffrats, Lesebestätigungen sowie den Online-Status (Presence). Der Online-Status ist derzeit
**nicht deaktiviert**; für eine Beratungsplattform ist die Abschaltung als Maßnahme zu prüfen.
Reaktionen und Beziehungsangaben zwischen Ereignissen sind serverseitig sichtbar; für
Reaktionsereignisse ist dies protokollbedingt.

<RelatedAdrs numbers="[&#x22;002&#x22;,&#x22;004&#x22;,&#x22;005&#x22;]" />

<Evidence chapter="6.9" slugs="[&#x22;rooms-created-with-megolm&#x22;,&#x22;attachment-encryption-aes256&#x22;,&#x22;server-key-backup-secret-storage&#x22;,&#x22;device-dehydration-behind-toggle&#x22;,&#x22;key-sharing-cross-signed-only&#x22;,&#x22;matrix-federation-off&#x22;,&#x22;synapse-admin-login-as-user&#x22;,&#x22;presence-not-disabled&#x22;]" />

## 6.10 Video- und Audio-Beratung [#610-video--und-audio-beratung]

Die Video- und Audioberatung erfolgt browserbasiert über eine im eigenen Betrieb befindliche
Medienvermittlung (LiveKit) und die darauf aufsetzende Anwendung Element Call. Die Räume für
Anrufe werden nicht öffentlich beitretbar angelegt; Zutritt erhalten nur Mitglieder des zugehörigen
Beratungsraums. Die Medienströme werden zwischen den Teilnehmenden Ende-zu-Ende verschlüsselt; ist
die Verschlüsselung nicht verfügbar, wird der Anruf nicht aufgebaut (Fail-closed). Eine
Aufzeichnung ist nicht konfiguriert; ein Aufzeichnungs- oder Ausleitungsdienst ist nicht
Bestandteil des Auslieferungsstands. Räume ohne Teilnehmende werden nach kurzer Frist automatisch
verworfen. Die ausgelieferte Konfiguration der Anrufanwendung enthält keine Produkt-,
Absturz- oder Fehlertelemetrie an Dritte.

**Restrisiko.** Beim Verbindungsaufbau werden derzeit öffentliche STUN-Server eines
US-amerikanischen Anbieters angefragt. Dabei werden Client-IP-Adressen an einen Empfänger in einem
Drittland übermittelt. Die Umstellung auf eigene STUN-/TURN-Komponenten ist eine erforderliche
Maßnahme; bis dahin ist die Übermittlung in der Datenschutzerklärung auszuweisen.

**Verbesserung gegenüber der Vorgängerplattform.** Dort war die Medienverschlüsselung nur unter
engen Bedingungen wirksam (bestimmte Browserfamilien, Unterstützung durch alle Teilnehmenden) und
wurde beim Eintreffen weiterer Personen im Warteraum automatisch abgeschaltet; im Regelfall sah
die Medienvermittlung die Inhalte.

<RelatedAdrs numbers="[&#x22;020&#x22;]" />

<Evidence chapter="6.10" slugs="[&#x22;livekit-no-recording&#x22;,&#x22;element-call-no-third-party-telemetry&#x22;,&#x22;google-stun-third-country&#x22;]" />

## 6.11 Sprachnachrichten [#611-sprachnachrichten]

Die Plattform erlaubt das Versenden kurzer Sprachnachrichten (höchstens drei Minuten) in allen
Beratungs-Chat-Formen. Die Funktion ist je Träger und je Chat-Typ — Einzelberatung, anonymer
Live-Chat, Gruppen, Supervision — im Administrationsbereich abschaltbar; sie ist **standardmäßig
aktiviert** und zusätzlich an die Freigabe des Medien-Uploads gekoppelt. Eine Abschaltung auf
Ebene einzelner Beratungsstellen ist derzeit nicht vorgesehen.

**Besonderes Risiko.** Die menschliche Stimme ist ein identifizierendes, biometrienahes Merkmal.
In einem pseudonymen Beratungssetting schwächt eine Sprachnachricht die Pseudonymität der
ratsuchenden Person gegenüber der beratenden Person — nicht jedoch gegenüber Plattform- oder
Serverbetreiber. Ratsuchende geben ihre Stimme freiwillig und aktiv preis (bewusste Aufnahme mit
Vorschau- und Verwerfen-Möglichkeit); eine heimliche Erhebung findet nicht statt.

**Schutzmaßnahmen.** Sprachnachrichten werden ausschließlich Ende-zu-Ende-verschlüsselt
übertragen: Die Audiodatei wird clientseitig mit einem einmaligen AES-256-Schlüssel verschlüsselt,
bevor sie das Endgerät verlässt; der Schlüssel wird ausschließlich innerhalb der
Megolm-verschlüsselten Chat-Nachricht transportiert. Der Server speichert nur nicht
entschlüsselbares Chiffrat ohne Dateinamen und ohne Inhaltstyp; auch Aufnahmedauer und -zeitpunkt
liegen ausschließlich im verschlüsselten Nachrichteninhalt. Betreiber und Dienstleister können
Sprachnachrichten weder anhören noch inhaltlich auswerten. Auf dem Endgerät wird kein Audio
dauerhaft gespeichert. Systembedingt verbleibende Metadaten beim Serverbetreiber sind:
Raumzuordnung, pseudonyme Absenderkennung, Zeitstempel und Größe des Chiffrats — aus der Größe
lässt sich die Aufnahmedauer grob schätzen.

**Restrisiko und geplante Maßnahmen.** Die Speicherdauer verschlüsselter Mediendateien auf dem
Server ist derzeit unbegrenzt; eine automatische Löschfrist (Media-Retention) sowie die Umstellung
auf authentifizierte Medien-Downloads sind als technische Härtungsmaßnahmen vorgesehen.

<Evidence chapter="6.11" slugs="[&#x22;voice-message-flags-default-on&#x22;,&#x22;voice-message-max-duration&#x22;]" />

## 6.12 Medien-Uploads und Prüfung auf Schadsoftware [#612-medien-uploads-und-prüfung-auf-schadsoftware]

Die Plattform erlaubt Bild-Uploads in Chats — einschließlich des anonymen, registrierungsfreien
Live-Chats — sowie in den redaktionellen Editoren für Rechtstexte. Für redaktionelle Bilder
besteht eine serverseitige Formatvalidierung (Prüfung der Dateisignatur, zugelassen sind PNG, JPEG
und WebP, kein SVG, Begrenzung auf 2 MB, authentifizierter Upload).

Für Chat-Medien existiert derzeit **kein automatisierter Viren- oder Inhaltsscan**. Als
risikomindernde Übergangsmaßnahme werden Bilder anonymer Gäste im Live-Chat den Beratenden
zunächst unkenntlich (unscharf) angezeigt und erst nach bewusster Einzelfreigabe durch die
beratende Person dargestellt; ein Sperrvermerk kann von der absendenden Person nicht manipuliert
werden. Diese Prüfung ist clientseitig durchgesetzt; die Datei selbst bleibt serverseitig
abrufbar. Außerhalb des anonymen Live-Chats erfolgt keine Vorprüfung der Anzeige.

Die Zielarchitektur ist als Architekturentscheidung festgelegt (ADR „Media scanning via
matrix-content-scanner, fail-closed"): ein vorgeschalteter Prüf-Proxy mit Virenscan und optionaler
KI-gestützter Bildprüfung, der ungeprüfte oder beanstandete Dateien **serverseitig** unzugänglich
hält. Die Implementierung liegt als geprüfter, standardmäßig deaktivierter Proof of Concept vor,
ist jedoch **nicht produktiv ausgerollt**; die Inbetriebnahme wurde im Juli 2026
priorisierungsbedingt zurückgestellt. Ein Aktivierungstermin ist nicht festgelegt. Da die
Ende-zu-Ende-Verschlüsselung seit der Architekturentscheidung dauerhaft aktiv ist, setzt der
Betrieb des Prüf-Proxys zusätzlich die Umsetzung des Protokolls für verschlüsselte Medien voraus.
Vor Aktivierung der KI-gestützten Bildprüfung ist der Abschluss einer Auftragsverarbeitungs- bzw.
Unterauftragsvereinbarung mit Zusicherung der Nichtspeicherung erforderlich; der reine Virenscan
ist davon unabhängig aktivierbar. Eine ebenfalls vorgesehene Bot-Abwehr am Eingang des anonymen
Live-Chats ist gleichfalls nicht in Betrieb.

**Restrisiko.** Schadsoftware oder rechtswidrige Bildinhalte können technisch übertragen und
abgerufen werden; die Exposition ist durch die Unschärfe- und Freigabemechanik sowie die
Formatvalidierung nur teilweise begrenzt. Verschärfend wirkt, dass Medien-Downloads am Heimserver
derzeit **ohne Authentifizierung** möglich sind: Wer eine Medienadresse kennt, kann den
(verschlüsselten) Datenblock abrufen. Inhaltlich ist dies durch die Dateiverschlüsselung
abgesichert; als Zusicherung „Zugriff nur für Berechtigte" ist es nicht tragfähig und daher als
Härtungsmaßnahme geführt.

<RelatedAdrs numbers="[&#x22;015&#x22;,&#x22;019&#x22;]" />

<Evidence chapter="6.12" slugs="[&#x22;media-scanner-not-deployed&#x22;,&#x22;media-blur-click-to-reveal&#x22;,&#x22;tenant-media-magic-bytes&#x22;,&#x22;unauthenticated-media-downloads&#x22;]" />

## 6.13 Kollegiale Fallkoordination (Team-Besprechung) und Fallübergabe [#613-kollegiale-fallkoordination-team-besprechung-und-fallübergabe]

**(1) Team-Besprechung.** Zur Koordination einer noch nicht angenommenen Beratungsanfrage steht den
Berater:innen der zuständigen Beratungsstelle ein separater, technischer Besprechungsraum zur
Verfügung ([ADR-016](/decisions/adr-016)). Der Raum ist ein eigenständiger Matrix-Raum; die ratsuchende Person ist zu
keinem Zeitpunkt Mitglied dieses Raums, kann ihn nicht einsehen und nicht auffinden. Die
Teilnahmeberechtigung ist deckungsgleich mit der Berechtigung, die Anfrage zu sehen: ausschließlich
Berater:innen mit aktiver Zuordnung zur Beratungsstelle des Falls; ein Zugriff durch andere
Beratungsstellen, den Träger oder den Plattformbetreiber über die Anwendung ist nicht vorgesehen
(serverseitige Durchsetzung). Mit Annahme der Anfrage wird der Besprechungsraum automatisch und
dauerhaft geschlossen; er bleibt für die Berater:innen der Beratungsstelle ausschließlich lesend
erreichbar (technisch erzwungen über Matrix-Berechtigungsstufen). Anlage des Raums und Teilnahme
der Berater:innen werden mit Zeitstempel protokolliert; Nachrichteninhalte werden nicht
protokolliert. Ein Zustimmungs- oder Widerspruchsrecht der ratsuchenden Person besteht für die
Team-Besprechung nicht; die Verarbeitung stützt sich insoweit nicht auf eine Einwilligung, sondern
ist als interne fachliche Koordination ohne Offenlegung der Beratungsinhalte an zusätzliche
Empfängerkreise ausgestaltet.

> **Ehrliche Grenzbenennung.** In der Team-Besprechung wird **über** eine ratsuchende Person
> gesprochen, ohne dass diese davon Kenntnis erlangt; das Archiv bleibt dauerhaft lesbar. Damit
> entsteht ein Datenbestand über die betroffene Person außerhalb ihres Beratungsraums, der beim
> Auskunftsrecht zu berücksichtigen ist (Abschnitt 8.4) und für den eine Aufbewahrungsfrist
> festzulegen ist. Protokolliert werden derzeit ausschließlich Anlage und Teilnahme, nicht
> Lese- oder Archivzugriffe.

**(2) Fallübergabe.** Der Zugriff einer weiteren Beraterin oder eines weiteren Beraters auf einen
bestehenden Beratungsfall — etwa bei Vertretung im Krankheitsfall, Urlaubsvertretung, kollegialer
Beratung oder Ausscheiden — erfolgt ausschließlich über ein strukturiertes Übergabeverfahren.
Antragsberechtigt sind nur Berater:innen derselben Beratungsstelle. Jeder Antrag erfordert die
Angabe eines katalogisierten Grundes sowie einer Begründung. Je Grund ist festgelegt, ob die
vorherige Zustimmung der ratsuchenden Person erforderlich ist. Ist die Zustimmung erforderlich,
verbleibt der Antrag im Status „ausstehend"; die ratsuchende Person entscheidet selbst in der
Anwendung über Annahme oder Ablehnung; erst danach wird der Zugriff gewährt oder verweigert. Ist
keine Zustimmung erforderlich — Standardfall bei Krankheit, Urlaub, Notfall und Ausscheiden —,
wird die ratsuchende Person unmittelbar nach der Übernahme durch eine Systemnachricht im
Beratungsverlauf über die Übernahme und deren Grund informiert. Die bisherige Fachkraft bleibt
Mitglied des Raums, sodass eine Rückübernahme möglich ist.

**(3) Protokollierung.** Jeder Übergabeantrag — einschließlich verweigerter Anträge — wird
revisionsfähig gespeichert (antragstellende und bisherige Fachkraft, Grund, Ergebnis,
Zustimmungserfordernis, maßgebliche Richtlinie, Zeitstempel). Beratungsinhalte sind nicht
Bestandteil der Protokolldaten. Die Einsichtnahme in die Protokolle ist rollenbasiert beschränkt
und mandanten- sowie beratungsstellenscharf gefiltert; Administratorkonten ohne
Beratungsstellen-Zuordnung erhalten keinen Protokollzugriff (Fail-closed-Prinzip).

> **Restrisiko.** Das Pflicht-Freitextfeld „Begründung" wird gespeichert und der Administration
> angezeigt; es kann im Einzelfall fallbezogene Inhalte enthalten. Solange keine Maskierung
> erfolgt, ist die Aussage „ohne Inhalte" nur mit dieser Einschränkung zutreffend. Als Maßnahmen
> sind ein Hinweis in der Eingabemaske („keine Fallinhalte in die Begründung") sowie die
> Maskierung des Feldes in den Administrationsprotokollen vorgesehen. Ein Grund aus dem Katalog
> („Fachkraft erkrankt") ist zugleich ein Gesundheitsdatum der **beratenden Person** und daher
> beschäftigtendatenschutzrechtlich zu würdigen.

**(4) Technische Vertraulichkeit.** Beide Raumtypen werden serverseitig als private, nicht
auffindbare Matrix-Räume mit aktivierter Ende-zu-Ende-Verschlüsselung angelegt. Die maßgebliche
Vertraulichkeitsgrenze gegenüber nicht fallführenden Berater:innen derselben Beratungsstelle ist
jedoch nicht die Verschlüsselung, sondern die anwendungsseitige Zugriffskontrolle
(Sichtbarkeits- und Berechtigungssteuerung, beratungsstellenscharfe Suche) in Verbindung mit dem
protokollierten Übergabeverfahren; gegenüber Dritten außerhalb der Beratungsstelle besteht
zusätzlich eine Trennung auf Ebene der Raum-Mitgliedschaft.

**(5) Konfigurierbarkeit.** Die Team-Besprechung ist je Mandant (Träger) durch die
Plattformadministration aktivierbar bzw. deaktivierbar; zusätzlich besteht ein deployment-weiter
Schalter. Der Grundkatalog der Fallübergabe einschließlich des Zustimmungserfordernisses je Grund
ist administrativ konfigurierbar, derzeit jedoch **plattformweit** und nicht je Träger. Eine
durchgängige Delegationskaskade bis auf die Ebene einzelner Beratungsstellen besteht für diese
beiden Funktionen **nicht**; sie darf für sie nicht behauptet werden.

**(6) Supervision — Abgrenzung.** Die Supervision ist ein hiervon getrenntes drittes Werkzeug: Sie
ist als begleitender Lesezugriff ausgestaltet und verfügt über ein eigenes Widerspruchsverfahren
(Opt-out) für die ratsuchende Person. Zu Supervisionsvorgängen können Freitext-Notizen erfasst
werden; für diese ist eine Aufbewahrungsfrist festzulegen.

<RelatedAdrs numbers="[&#x22;002&#x22;,&#x22;008&#x22;,&#x22;016&#x22;]" />

<Evidence chapter="6.13" slugs="[&#x22;team-discussion-agency-scoped&#x22;,&#x22;team-discussion-hard-close&#x22;,&#x22;case-handover-consent-policy&#x22;,&#x22;case-handover-audit-trail&#x22;,&#x22;case-handover-explanation-freetext&#x22;,&#x22;case-handover-policy-platform-scoped&#x22;]" />

## 6.14 In-App-Benachrichtigungen und E-Mail-Benachrichtigungen [#614-in-app-benachrichtigungen-und-e-mail-benachrichtigungen]

**In-App-Benachrichtigungen („Zeitstrahl").** Je Benachrichtigungsereignis wird serverseitig ein
Datensatz gespeichert (mandantengetrennt): Empfänger-Pseudonym, Ereignistyp, Erstell- und
Lesezeitpunkt, Sitzungsreferenz, ein anwendungsinterner Verweis sowie Anzeigetexte und
strukturierte Metadaten.

*Inhalte der Beratungskommunikation werden nicht gespeichert:* Nachrichtentexte aus der
Ende-zu-Ende-verschlüsselten Chat-Kommunikation erreichen die Benachrichtigungsverarbeitung
konstruktionsbedingt nicht, da verschlüsselte Ereignisse keinen Nachrichtenkörper tragen; der
konfigurierbare Vorschaumodus ist in allen Umgebungen fest auf „keine Vorschau" gesetzt, sodass
auch clientseitig übermittelte Vorschautexte verworfen werden.

Gespeichert werden jedoch **Kommunikationsmetadaten**: wer wem wann in welcher Sitzung
geschrieben hat, der Inhaltstyp der Nachricht, Anzeigenamen von Beratenden und bei neuen Anfragen
die Themenkategorie der Beratung, die für sich genommen bereits einen Rückschluss auf den
Beratungsanlass zulässt. Bei Fallübergaben fließt derzeit zusätzlich der von Beratenden verfasste
Begründungs-Freitext in die Anzeigetexte ein und kann im Einzelfall Rückschlüsse auf
Beratungsinhalte zulassen. Der Lesezeitpunkt wird sekundengenau je Benachrichtigung gespeichert
und ermöglicht ein Nutzungs- und Anwesenheitsprofil.

Der Zugriff ist strikt auf den jeweiligen Empfänger beschränkt; ein administrativer Lesezugriff
über die Schnittstelle besteht nicht. Betroffene können ihren Benachrichtigungsverlauf jederzeit
selbst vollständig löschen. &#x2A;*Eine automatische Aufbewahrungsfrist besteht derzeit nicht; die
Datensätze werden beim Löschen des Kontos nicht mitgelöscht.**

*Geplante Abhilfemaßnahmen:* (1) Abschluss der laufenden Umstellung auf rein clientseitig
gerenderte Benachrichtigungstexte, wodurch die serverseitigen Klartext-Anzeigetexte einschließlich
des Fallübergabe-Freitexts vollständig entfallen; (2) Einführung einer Regel-Aufbewahrungsfrist
mit automatischem Löschlauf und Anbindung an den Konto-Löschworkflow; (3) Reduktion des
Lesezeitstempels auf ein Gelesen-Kennzeichen; (4) Entfernung des Vorschaumodus aus dem Quellcode,
damit eine bloße Konfigurationsänderung die Tabelle nicht in einen Inhaltsspeicher verwandeln kann.

**E-Mail-Benachrichtigungen.** Benachrichtigungen per E-Mail verlassen die Domäne der
Ende-zu-Ende-Verschlüsselung. Versendet werden Einladungen, Passwort-Zurücksetzungen,
Einmalcodes für die Zwei-Faktor-Authentisierung, Hinweise auf neue Anfragen sowie Meldungen zur
Vertragsunterzeichnung. **Chat- oder Beratungsinhalte sind nicht Bestandteil dieser Nachrichten**;
verifiziert ist, dass keine Nachrichtentexte versendet werden. Enthalten sind jedoch je nach
Anlass die Postleitzahl der Anfrage, der Name der Beratungsstelle, der Name der beratenden Person
sowie in einzelnen Fällen das Pseudonym der ratsuchenden Person. Bereits die Zustellung offenbart
gegenüber der Mail-Infrastruktur das Bestehen einer Beratungsbeziehung. Der Versand erfolgt über
mehrere Wege (Anwendungsdienste, Mandanten-Mailserver, Beratungstypdienst) mit verpflichtender
Transportverschlüsselung (STARTTLS).

*Restrisiko.* Zugangsdaten der Mailserver werden nicht einheitlich geschützt: An einer Stelle
liegen sie verschlüsselt vor, an einer weiteren nur dann, wenn ein Geheimnis gesetzt ist, und an
einer dritten unverschlüsselt in einem Konfigurationsdatensatz. Die Vereinheitlichung
(Verschlüsselung ruhender Daten, ausschließlich schreibender Zugriff über die Schnittstelle) ist
eine erforderliche Maßnahme (siehe auch Abschnitt 6.16). Push-Benachrichtigungen an mobile Geräte
über einen US-amerikanischen Dienst sind im Auslieferungsstand deaktiviert; sie enthalten
konstruktionsbedingt keine Inhalte, würden aber Metadaten in ein Drittland übermitteln und wären
vor Aktivierung gesondert zu bewerten.

<RelatedAdrs numbers="[&#x22;018&#x22;]" />

<Evidence chapter="6.14" slugs="[&#x22;notification-preview-mode-none&#x22;,&#x22;event-notification-no-retention&#x22;,&#x22;event-notification-read-timestamp&#x22;,&#x22;case-handover-explanation-in-notification&#x22;,&#x22;no-chat-content-in-emails&#x22;,&#x22;smtp-starttls-required&#x22;,&#x22;firebase-push-disabled&#x22;]" />

## 6.15 Statistische Auswertung [#615-statistische-auswertung]

Statistische Auswertungen erfolgen ausschließlich aggregiert und losgelöst von einzelnen
Beratungsfällen. Im Administrationsbereich steht ein Statistik-Dashboard zur Verfügung, das
Aggregatzahlen anzeigt (neue Beratungsanfragen, aktive Fälle, Themenverteilung, Anzahl Beratender,
Gruppenchats — je Träger bzw. Beratungsstelle, tages-, wochen- und monatsweise); Einzelpersonen
sind daraus nicht ablesbar. Zum Schutz vor Rückschlüssen aus kleinen Gruppen greift eine
**Kleinstzellen-Unterdrückung**: Aggregate werden erst ab mindestens fünf beitragenden Beratenden
ausgewiesen, andernfalls wird der Wert unterdrückt; die Prüfung ist fail-closed ausgelegt und in
der Produktivumgebung erzwungen.

Für die Nachrichtenstatistik der Beratenden wird keine Klarkennung gespeichert: Die Zählung
erfolgt unter einem kryptografischen Pseudonym (HMAC-SHA256 über die Beraterkennung mit
serverseitig verwaltetem Geheimnis). Beratende können ausschließlich ihre eigenen Kennzahlen
einsehen; eine personenbezogene Leistungsauswertung durch Dritte findet über die Anwendung nicht
statt.

> **Ehrliche Grenzbenennung.** Die Pseudonymisierung ist nicht vollständig wirksam: Neben dem
> Pseudonym wird die Kennung der auslösenden Beratungssitzung im Klartext geführt, sodass eine
> Re-Identifikation über eine Verknüpfung mit den Sitzungsdaten möglich bleibt. Eine
> Aufbewahrungsfrist besteht für diese Zähldaten nicht, und sie werden beim Löschen eines
> Beraterkontos nicht entfernt. Ferner besteht ein Einzelfall-Endpunkt für Sitzungsdaten
> einschließlich Postleitzahl, der technischen Dienstkonten vorbehalten ist. Schließlich kann die
> Anwendung Statistikereignisse an einen Nachrichtenbus veröffentlichen; das Registrierungsereignis
> enthielte Kontokennung, Alter, Geschlecht, Postleitzahl, Thema und Herkunftsverweis in einem
> Datensatz. Diese Veröffentlichung ist im Auslieferungsstand **abgeschaltet**, ein
> verarbeitender Empfänger ist in den geprüften Beständen nicht auffindbar, und eine
> Transportverschlüsselung des Nachrichtenbusses ist nicht konfiguriert. Vor Aktivierung sind
> Empfänger, Speicherort, Aufbewahrung und Löschpropagation zu klären und der Ereignisinhalt zu
> minimieren.

<Evidence chapter="6.15" slugs="[&#x22;small-cell-suppression&#x22;,&#x22;consultant-message-stat-hmac&#x22;,&#x22;statistics-events-disabled&#x22;,&#x22;session-statistics-single-record-endpoint&#x22;]" />

## 6.16 Mandantentrennung [#616-mandantentrennung]

Die Plattform ist mandantenfähig: Jeder Träger bildet einen Mandanten, dem Beratungsstellen,
Beratende, Rechtstexte und Konfiguration zugeordnet sind. Die Trennung wird über eine
Mandantenkennung an den Datensätzen und einen anwendungsseitigen Filter durchgesetzt; sie ist
damit **applikationsseitig, nicht datenbankseitig** realisiert. Fachliche Datenbestände wie die
Fallübergabe-Protokolle und die Benachrichtigungen tragen die Mandantenkennung und werden
entsprechend gefiltert; administrative Auswertungen sind auf die Agenturen der aufrufenden Person
beschränkt und verhalten sich fail-closed.

**Risiko und Kompensation.** Eine rein anwendungsseitige Trennung ist gegenüber Fehlkonfiguration
und Programmierfehlern empfindlich; ein trägerübergreifender Sichtbarkeitsfehler ist in der
Vergangenheit aufgetreten und behoben worden. Kompensierend wirken die konsequente Filterung an
den Zugriffsschichten, das fail-closed-Verhalten administrativer Auswertungen sowie eine
eingeschränkte Agentur-Administrationsrolle. Als Maßnahmen sind Regressionstests für die
Mandantentrennung sowie eine Prüfung datenbankseitiger Trennung auszuweisen.

> **Offen auszuweisender Befund.** Die Plattform-Administration kann die vollständigen
> Einstellungen jedes Mandanten abrufen. Darin enthalten sind derzeit auch
> **Mailserver-Zugangsdaten des Trägers im Klartext**, die zudem unverschlüsselt gespeichert
> werden; ebenso sind die Signaturdaten der Auftragsverarbeitungsvereinbarungen
> trägerübergreifend einsehbar. Erforderlich sind: ausschließlich schreibender Zugriff auf
> Geheimnisse über die Schnittstelle, deren Verschlüsselung im Ruhezustand sowie eine Trennung
> zwischen Betriebs- und Einsichtsrechten (Break-Glass-Zugriff mit Freigabe des Trägers,
> zeitlicher Befristung und Protokollierung). Bis zur Umsetzung ist der Kreis der
> Plattform-Administrator:innen eng zu halten, vertraglich zu binden und zu dokumentieren.

<RelatedAdrs numbers="[&#x22;010&#x22;,&#x22;011&#x22;,&#x22;023&#x22;]" />

<Evidence chapter="6.16" slugs="[&#x22;tenant-separation-application-side&#x22;,&#x22;platform-admin-sees-tenant-smtp-plaintext&#x22;,&#x22;cts-smtp-encryption-conditional&#x22;]" />

## 6.17 Betrieb, Observability und Telemetrie [#617-betrieb-observability-und-telemetrie]

**Protokollierung der Dienste.** Die Anwendungsdienste schreiben strukturierte Protokolle auf die
Standardausgabe; eine Rotation oder Aufbewahrung findet in den Diensten selbst nicht statt, sie
obliegt der Container-Plattform. Der Protokollkontext enthält keine Kontokennung, sondern eine
Korrelationskennung. Gleichwohl gelangen an einzelnen Stellen personenbezogene Angaben in
Protokolltexte: Kontokennungen, Benutzernamen im Klartext, in Einzelfällen vollständige
E-Mail-Adressen sowie — auf Fehlersuchstufe — Inhalte von Zugriffstoken. Die Protokollstufe ist
zur Laufzeit über einen freigegebenen Verwaltungsendpunkt veränderbar. &#x2A;*Maßnahmen:** Absicherung
des Verwaltungsendpunkts, Entfernen der Datensatz-Ausgaben mit Namen und E-Mail-Adressen,
Bereinigungsfilter für personenbezogene Angaben sowie eine ausdrückliche Aufbewahrungsfrist für
den Protokollbestand.

**Ablaufverfolgung und Metriken.** Eine Anbindung an eine Beobachtungsplattform (SigNoz) ist
vorbereitet; der Export ist im Auslieferungsstand **standardmäßig und in der Produktivumgebung
deaktiviert**. In der Vorabumgebung werden ausschließlich Metriken exportiert, keine
Ablaufverfolgungen. Vor einer Aktivierung ist zu prüfen, ob Ablaufverfolgungen Pfade mit
Kennungen tragen; Aufbewahrung und Zugriffsschutz der Beobachtungsplattform sind festzulegen.

**Fehlermeldungen aus dem Browser.** Die Anwendung kann Fehlermeldungen aus dem Browser an den
Server melden (Meldungstext, aufgerufene Adresse, Browserkennung, Aufrufkette, Korrelationskennung,
jeweils längenbegrenzt). Diese Angaben können Personenbezug tragen und unterliegen der
Protokoll-Aufbewahrung. Eine Übermittlung an externe Telemetriedienste findet aus dem Browser
**nicht** statt.

**Sicherung und Wiederherstellung.** Für die Datenbank des Chat-Dienstes bestehen Sicherungs- und
Wiederherstellungsverfahren mit einer Aufbewahrung von 30 Tagen für Vollsicherungen und sieben
Tagen für die fortlaufende Protokollsicherung. Für die übrigen Kern-Datenbanken sind im
Auslieferungsstand **keine Sicherungsaufträge** hinterlegt — eine Verfügbarkeitslücke im Sinne der
Sicherheit der Verarbeitung nach § 26 KDG (Art. 32 DSGVO). Vor allem aber enthalten die
Sicherungsskripte einen Pfad, der Datenbankauszüge in ein externes Quellcode-Verwaltungssystem
eines US-amerikanischen Anbieters überträgt. &#x2A;*Ob dieser Pfad aktiviert ist, ist vor Freigabe
dieser DSFA verbindlich zu klären; bei Aktivierung liegt eine unzulässige Drittlandübermittlung
mit praktisch unlöschbarer Historie vor.** Ferner ist zu beachten, dass gelöschte Daten bis zum
Ablauf der Sicherungsfrist in den Sicherungen fortbestehen.

**Übersetzung von Rechtstexten.** Für die Übersetzung der mandantenspezifischen Rechtstexte
(Impressum, Datenschutzerklärung, Auftragsverarbeitungsvereinbarung) kann eine externe
Sprachmodell-Schnittstelle genutzt werden. Übermittelt wird der vollständige Text einschließlich
der darin enthaltenen Namen, Anschriften und E-Mail-Adressen der Verantwortlichen und
Datenschutzbeauftragten. Die Anbieter haben ihren Sitz außerhalb des Geltungsbereichs; die
Nutzung setzt eine Auftragsverarbeitungsvereinbarung sowie eine Prüfung der
Drittlandübermittlung voraus. &#x2A;*Beratungsinhalte werden zu keinem Zeitpunkt an
Sprachmodell-Dienste übermittelt.**

**Betriebsseitige Härtungspunkte am Chat-Dienst.** Im Auslieferungsstand sind die offene
Registrierung ohne Verifikation aktiviert, die Ratenbegrenzungen praktisch aufgehoben, Medien
ohne Authentifizierung abrufbar und weder für Nachrichten noch für Medien eine Aufbewahrungsfrist
gesetzt. Diese Punkte widersprechen dem Grundsatz, dass Konten ausschließlich über die Anwendung
entstehen, und sind vor Produktivbetrieb zu schließen.

<RelatedAdrs numbers="[&#x22;005&#x22;,&#x22;011&#x22;]" />

<Evidence chapter="6.17" slugs="[&#x22;synapse-open-registration&#x22;,&#x22;otel-export-disabled&#x22;,&#x22;pii-in-service-logs&#x22;,&#x22;browser-error-ingestion&#x22;,&#x22;matrix-backup-github-sync&#x22;,&#x22;no-backup-for-core-databases&#x22;,&#x22;legal-text-translation-third-country&#x22;]" />

## 6.18 Löschung und Aufbewahrung [#618-löschung-und-aufbewahrung]

Die Löschfristen je Datenkategorie sind im Löschkonzept (Anlage 2) zusammengeführt. Technisch
bestehen folgende Verfahren:

* **Kontolöschung durch die betroffene Person.** Ratsuchende können ihr Konto selbst löschen. Die
  Löschung durchläuft ein Schutzfenster von 48 Stunden mit ausschließlich lesendem Zugriff und
  wird anschließend automatisiert vollzogen. Der Löschlauf entfernt in fester Reihenfolge das
  Identitätskonto, das Chat-Konto (mit ausdrücklichem Löschkennzeichen und Bereinigung der
  Räume), Sitzungen und deren Zusatzdaten, Themenzuordnungen, Supervisionszuordnungen,
  Fallübergabe-Anträge, Agenturzuordnungen, den Eintrag in der Pseudonym-Registrierung, mobile
  Gerätekennungen und schließlich den Kontodatensatz. Eine Aussetzung der Löschung ist für
  drei bis höchstens zwölf Monate möglich und wird mit Grund dokumentiert.
* **Anonyme Konten.** Deaktivierung nach 360 Minuten Inaktivität, Löschung nach 2 820 Minuten
  (47 Stunden), jeweils stündlich geprüft.
* **Gruppenchats.** Abgelaufene Gruppenchats werden minütlich geprüft und deaktiviert.
* **Nur registrierte Konten ohne Beratung.** Ein Löschlauf nach 30 Tagen ist implementiert, im
  Auslieferungsstand jedoch deaktiviert; bleibt er aus, verbleiben Konten mit hinterlegter
  E-Mail-Adresse unbegrenzt.
* **Nachweisdaten.** Signaturen zu Auftragsverarbeitungsvereinbarungen werden im Zustand
  „abgelehnt" nach einer konfigurierten Frist gelöscht, im Zustand „unterzeichnet" zu
  Nachweiszwecken aufbewahrt. Das Prüfprotokoll der Support-Zugriffe wird nach zwölf Monaten
  automatisiert gelöscht — die einzige im Bestand ausdrücklich dokumentierte Aufbewahrungsfrist.
* **Grabstein-Datensatz.** Nach der endgültigen Löschung verbleibt ein Verweisdatensatz, der die
  vollständige frühere Kontokennung sowie ein neutrales Anzeigekennzeichen enthält, damit
  Verweise in fortbestehenden Datensätzen aufgelöst werden können. Er ist unbefristet angelegt.

> **Ehrliche Lückenbenennung — was der Löschlauf derzeit nicht erfasst.** Vom Konto-Löschlauf
> nicht berührt werden: die In-App-Benachrichtigungen, die serverseitig gespeicherten
> Nachrichtenentwürfe, die pseudonymisierte Nachrichtenstatistik der Beratenden, das Archiv der
> versendeten Einladungs-E-Mails, das Prüfprotokoll der Inaktivitätsbenachrichtigungen sowie eine
> aus der Migration verbliebene Zuordnungstabelle zwischen Person und Chat-Raum, die im
> Datenmodell der Anwendung nicht abgebildet ist und deshalb für alle Löschverfahren unsichtbar
> bleibt. Für keine dieser Kategorien besteht zudem eine zeitliche Aufbewahrungsgrenze. Hinzu
> kommt, dass am Chat-Dienst weder für Nachrichten noch für Mediendateien eine Aufbewahrungsfrist
> gesetzt ist und dass gelöschte Daten bis zum Ablauf der Sicherungsfristen in Sicherungen
> fortbestehen. Die Aussage einer „vollständigen" Löschung darf erst geführt werden, wenn diese
> Lücken geschlossen sind; bis dahin sind sie als Maßnahmen im Löschkonzept aufzunehmen. Diese
> Offenlegung ist bewusst gewählt: Eine DSFA, die eine unvollständige Löschung als vollständig
> beschreibt, verlöre ihren Zweck.

<Evidence chapter="6.18" slugs="[&#x22;delete-workflow-chain&#x22;,&#x22;deletion-read-only-window&#x22;,&#x22;anonymous-account-lifecycle&#x22;,&#x22;registered-only-deletion-disabled&#x22;,&#x22;identity-tombstone-unbounded&#x22;,&#x22;legacy-chat-identifier-archive-invisible&#x22;,&#x22;draft-message-server-side&#x22;,&#x22;support-access-audit-purge-12-months&#x22;,&#x22;matrix-backup-retention-30-days&#x22;,&#x22;no-media-or-message-retention&#x22;]" />
