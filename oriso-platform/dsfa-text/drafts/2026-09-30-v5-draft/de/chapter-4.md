Kapitel 4

## Akteure, Rollen und Governance

Technischer Teil — von ORISO gepflegt — Abschnitt 4.5 ist organisatorisch —

Partner, Träger und Betreiber entscheiden gemeinsam über Zwecke und Mittel der Verarbeitung;
        es besteht eine Vereinbarung über die gemeinsame Verantwortlichkeit
        (§ 28 Abs. 1 S. 2 KDG / Art. 26 Abs. 1 DSGVO).
        Träger und Beratungsstellen bleiben für die fachliche Beratung verantwortlich, einschließlich
        der Falldokumentation außerhalb der Plattform. Die Plattform bildet den Abschluss der
        Auftragsverarbeitungs­vereinbarungen mit den Trägern digital ab; Träger-Vertreter:innen
        unterzeichnen über personalisierte, tokenisierte Links, ohne selbst Nutzer:innen der
        Beratungsanwendung zu sein.

[Governance-Beschreibung des Betreibers: Kooperationsstruktur, Gremien, Entscheidungswege — betreiberspezifischer Freitext]

### 4.1 Auftragsverarbeiter und Empfänger

Tabelle bei schmalen Viewports horizontal scrollbar

| Name | Tätigkeit | Standort | Gemeinsam Verantwortlich | Auftragsverarbeiter | AVV |
| --- | --- | --- | --- | --- | --- |
| Beratungsstellen bzw. Träger | Fachliche Beratung | Deutschland | Ja | Nein | Nein |
| neusta integrate GmbH | Server-Hosting, Betrieb der Produktivumgebung | Deutschland | Nein | Ja | Ja |
| GS Design GmbH Kreuzbergstr. 30 VH, 10965 Berlin | Entwicklung, Wartung, Support | Deutschland | Nein | Ja | Ja |
| Greyt.IT UG Richardstr. 11, 12043 Berlin — Subunternehmen der GS Design GmbH | Technische Entwicklung | Deutschland | Nein | Ja | Ja |

Von den Entwicklungsarbeitsplätzen besteht kein Zugriff auf personenbezogene Produktivdaten; Entwicklung und Test arbeiten ausschließlich mit synthetischen Daten. Produktivbetrieb und Administration liegen beim Betriebsdienstleister im Rechenzentrum (Anhang 3 zum Auftragsverarbeitungsvertrag, Stand 14.08.2026).

### 4.2 Rollen und Berechtigungen

Die Plattform kennt vier Personalebenen und die anonyme ratsuchende Person. Intern bilden
        vierzehn Keycloak-Realm-Rollen die feingranularen API-Rechte ab. Zwei Regeln gelten
        durchgängig: **hierarchische Isolation** — kein Träger sieht einen anderen, keine
        Beratungsstelle sieht Ratsuchende oder Beratende einer anderen — und **Vererbung der
        Rechtstexte**: Impressum, Datenschutzerklärung und Einwilligungstext bestehen auf jeder
        Ebene; ohne eigene Fassung gilt die der übergeordneten Ebene.

Plattform-Admin

Betreibt die Plattform, legt Träger an und pflegt die
            Rechtstext-Vorlagen der Plattform-Ebene. Kann Chat-Inhalte technisch nicht einsehen.

user-admin2FA Pflicht

Träger-Admin

Verantwortet einen Träger: legt Beratungsstellen und deren
            Administration an, pflegt die Rechtstexte der Träger-Ebene. Von anderen Trägern
            vollständig isoliert.

tenant-adminsingle-tenant-admin2FA Pflicht

Beratungsstellen-Admin

Leitet eine Beratungsstelle: lädt Beratende ein, konfiguriert
            Live-Chat-Link, Themen und PLZ-Zuordnung, kann die Rechtstexte der eigenen Stelle
            überschreiben.

agency-adminrestricted-agency-adminrestricted-consultant-admin

Beratende:r

Nimmt Anfragen aus dem Warteraum an (älteste zuerst) und führt die
            verschlüsselte Beratung. Supervision ist eine Funktion an dieser Rolle, keine eigene
            Rolle.

consultantgroup-chat-consultantsupervisor-consultant

**Ratsuchende:r (anonym)** — betritt den Warteraum ohne Registrierung unter
          einem systemgenerierten Pseudonym; Keycloak-Rolle anonymous.
          Erhoben werden nur Pseudonym, kurzlebiges Sitzungs-Cookie, Warteschlangenposition und das
          über den Link gewählte Thema. Beim Verlassen werden Pseudonym und Raum automatisiert
          entfernt. Die Rolle user ist für einen künftigen registrierten
          Ablauf reserviert.

### 4.3 Berechtigungsmatrix

Tabelle bei schmalen Viewports horizontal scrollbar

| Fähigkeit | Plattform-Admin | Träger-Admin | Stellen-Admin | Beratende:r | Ratsuchende:r |
| --- | --- | --- | --- | --- | --- |
| Träger anlegen | Ja | Nein | Nein | Nein | Nein |
| Beratungsstellen anlegen | Nein | Ja | Nein | Nein | Nein |
| Beratende anlegen / einladen | Ja | Ja | Ja | Nein | Nein |
| Daten des eigenen Trägers sehen | n/a | Ja | nur eigene Stelle | nur eigene Stelle | Nein |
| Daten anderer Träger sehen | Nein | Nein | Nein | Nein | Nein |
| Rechtstexte Plattform-Ebene bearbeiten | Ja | Nein | Nein | Nein | Nein |
| Rechtstexte Träger-Ebene bearbeiten | Nein | Ja | Nein | Nein | Nein |
| Rechtstexte Stellen-Ebene bearbeiten | Nein | Ja | Ja | Nein | Nein |
| Live-Chat-Links erzeugen | Nein | Ja | Ja | Nein | Nein |
| Ticket aus dem Warteraum annehmen | Nein | Nein | Nein | Ja | Nein |
| Eigene Live-Chat-Verfügbarkeit schalten | Nein | Nein | Nein | Ja | Nein |
| Chat-**Inhalte** lesen | E2EE | E2EE | E2EE | nur eigene Sitzung | nur eigene Sitzung |
| Löschung beim Verlassen | Nein | Nein | Nein | Nein | Ja |
| 2FA erzwungen | Ja | Ja | empfohlen | empfohlen | n/a |

### 4.4 Vererbung der Rechtstexte

Plattform-VorlagePlattform-Admin

Träger-FassungTräger-Admin

Fassung der BeratungsstelleStellen-Admin

Wirksamer Text für Ratsuchende

Impressum, Datenschutzerklärung und Einwilligungstext existieren auf
          jeder Ebene. Pflegt eine Beratungsstelle keine eigene Fassung, gilt die des Trägers; pflegt
          der Träger keine, gilt die Plattform-Vorlage. Ratsuchende sehen damit immer einen
          vollständigen Satz Rechtstexte.

### 4.5 Governance und Entscheidungsgremien

Organisatorischer Teil — vom Plattformbetreiber gepflegt (Vertragsunterlagen) — Bearbeitung im Administrationsbereich folgt —

Dieser Abschnitt beschreibt die Organisation, die Entscheidungswege und die juristische Abwägung des Trägers. Er ist aus Quellcode nicht ableitbar und wird deshalb nicht von ORISO gepflegt. Bis der Träger ihn verfasst, trägt das Dokument hier nur den eingeklappten Entwurfstext; die eckigen Klammern darin sind bewusst offene Stellen.

Entwurfstext einblenden

Die Plattform wird von [Name des Verantwortlichen] gemeinsam mit [Bezeichnung des Verbundes bzw. der Kooperation] betrieben; sie ist ein Angebot an die angeschlossenen Träger und deren Beratungsstellen. Zentrales Steuerungsgremium ist [Name des Gremiums, z. B. Lenkungsausschuss], das sich aus [Zusammensetzung: Anzahl und entsendende Stellen] zusammensetzt und [Turnus, z. B. zweimal jährlich] tagt; es entscheidet über Zwecke und Mittel der Verarbeitung, über Grundsatzfragen und über das Budget. Die operative Geschäftsführung liegt bei [Stelle/Referat], die dem Gremium mindestens [Turnus] berichtet. Fachlich beraten wird das Gremium durch [weitere Gremien, z. B. Fachbeirat Datenschutz, Steuerkreis Technische Entwicklung], deren Aufgaben und Besetzung in [Verweis auf Kooperationsvereinbarung/Geschäftsordnung] geregelt sind. Träger und Beratungsstellen sind rechtlich selbstständige Organisationen; sie sind über [Entsendungs- oder Beteiligungsverfahren] in die Entscheidungsfindung eingebunden.
