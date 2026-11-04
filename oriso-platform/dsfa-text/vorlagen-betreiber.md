# Vorlagen für die betreiberspezifischen Kapitel

Die folgenden Kapitel sind **nicht** aus Code oder Architekturentscheidungen ableitbar; sie
beschreiben die Organisation, die Entscheidungswege und die juristische Abwägung des jeweiligen
Verantwortlichen. Sie werden daher vom Betreiber verfasst.

Damit niemand vor einem leeren Feld sitzt, steht je Slot ein **vorausgefüllter Entwurf** im
richtigen Ton bereit. Lücken sind mit eckigen Klammern markiert; der jeweils letzte Absatz
(„Hinweis") erklärt, was hineingehört und warum das Gesetz es verlangt — er ist vor der
Veröffentlichung zu entfernen.

Die maschinenlesbare Fassung dieser Entwürfe liegt in `dsfa-editor-defaults.ts` und ist so
geschnitten, dass der DSFA-Freitext-Editor im Administrationsbereich sie als Startinhalt anzeigen
kann. Die Slot-Kennungen entsprechen `DPIA_SECTIONS` in
`ORISO-Admin/src/components/Tenants/DpiaSettings/utils/dpiaSections.ts`.

| Slot-ID | Kapitel | Titel |
|---|---|---|
| `governance` | 4 | Akteure und Governance |
| `accountability` | 5 | Verantwortlichkeit |
| `identityCheck` | 8.1 | Identitätsüberprüfung |
| `informationChannels` | 8.3 | Datenschutzhinweise und Informationswege |
| `escalationChain` | 8.11 | Eskalationskette und Datenweitergabe an Ermittlungsbehörden |
| `proportionalityPurpose` | 9.1 | Legitimer Zweck |
| `proportionalitySuitability` | 9.2 | Geeignetheit |
| `proportionalityNecessity` | 9.3 | Erforderlichkeit |
| `proportionalityBalance` | 9.4 | Angemessenheit |
| `resultParagraph` | 2 | Ergebnisabsatz der Schwellwertanalyse |
| `annexIndex` | A | Anlagenverzeichnis |

---

## 4 — Akteure und Governance (`governance`)

Die Plattform wird von [Name des Verantwortlichen] gemeinsam mit [Bezeichnung des Verbundes bzw.
der Kooperation] betrieben; sie ist ein Angebot an die angeschlossenen Träger und deren
Beratungsstellen. Zentrales Steuerungsgremium ist [Name des Gremiums, z. B. Lenkungsausschuss],
das sich aus [Zusammensetzung: Anzahl und entsendende Stellen] zusammensetzt und [Turnus, z. B.
zweimal jährlich] tagt; es entscheidet über Zwecke und Mittel der Verarbeitung, über
Grundsatzfragen und über das Budget. Die operative Geschäftsführung liegt bei [Stelle/Referat],
die dem Gremium mindestens [Turnus] berichtet. Fachlich beraten wird das Gremium durch
[weitere Gremien, z. B. Fachbeirat Datenschutz, Steuerkreis Technische Entwicklung], deren
Aufgaben und Besetzung in [Verweis auf Kooperationsvereinbarung/Geschäftsordnung] geregelt sind.
Träger und Beratungsstellen sind rechtlich selbstständige Organisationen; sie sind über
[Entsendungs- oder Beteiligungsverfahren] in die Entscheidungsfindung eingebunden.

*Hinweis (vor Veröffentlichung entfernen): Hier gehören die Organisationsstruktur, die
Entscheidungsgremien, deren Zusammensetzung und Tagungsturnus sowie die Einbindung der Träger
hinein. Die DSFA muss nach § 35 Abs. 7 KDG (Art. 35 Abs. 7 DSGVO) die Verarbeitungsvorgänge und
ihre Zwecke systematisch beschreiben — dazu gehört, wer über Zwecke und Mittel tatsächlich
entscheidet. Ohne diese Beschreibung lässt sich die gemeinsame Verantwortlichkeit in Kapitel 5
nicht begründen.*

---

## 5 — Verantwortlichkeit (`accountability`)

Verantwortlicher im Sinne des § 4 Nr. 9 KDG (Art. 4 Nr. 7 DSGVO) ist [Name, Rechtsform,
Anschrift]. Die Verarbeitung erfolgt in gemeinsamer Verantwortlichkeit nach § 28 Abs. 1 KDG
(Art. 26 DSGVO) mit [Aufzählung: Träger, Kooperationspartner]; eine Vereinbarung über die
gemeinsame Verantwortlichkeit nach § 28 Abs. 1 S. 2 KDG (Art. 26 Abs. 1 S. 2 DSGVO) besteht seit
[Datum] und regelt in ihren Anlagen [Nummern] die Zuteilung der Pflichten, insbesondere die
Erfüllung der Betroffenenrechte und der Informationspflichten. Die Träger bleiben für die
fachliche Beratung einschließlich der Falldokumentation außerhalb der Plattform verantwortlich.
Als Auftragsverarbeiter nach § 29 KDG (Art. 28 DSGVO) sind eingebunden: [Name des
Hosting-Betreibers] für Betrieb und Hosting der Produktivumgebung sowie [Name des
Entwicklungs-/Supportdienstleisters] für Entwicklung, Wartung und Support; mit beiden bestehen
Auftragsverarbeitungsvereinbarungen, der Verarbeitungsort ist [Land]. Die Datenschutzbeauftragung
nimmt [Name, Organisation, Kontakt] wahr; zuständige Aufsicht ist [Name und Anschrift der
Aufsichtsbehörde].

*Hinweis (vor Veröffentlichung entfernen): Zu benennen sind der Verantwortliche, die
gemeinsame Verantwortlichkeit samt Vereinbarung und Pflichtenzuteilung, sämtliche
Auftragsverarbeiter mit Verarbeitungsort und AVV-Status, die Datenschutzbeauftragung und die
zuständige Aufsicht. § 28 KDG (Art. 26 DSGVO) verlangt eine transparente Festlegung, wer welche
Pflicht erfüllt; § 29 KDG (Art. 28 DSGVO) verlangt den Nachweis der Auftragsverarbeitung.
Etwaige Unterauftragsverarbeiter des Hosting-Betreibers sind mit aufzunehmen.*

---

## 8.1 — Identitätsüberprüfung (`identityCheck`)

Vor der Bearbeitung eines Betroffenenantrags ist die Identität der antragstellenden Person zu
überprüfen. Beim Plattformbetreiber ist diese Prüfung **beinahe unmöglich**: Die Plattform kennt
weder Klarnamen noch verifizierte Kontaktdaten, sondern lediglich ein systemgeneriertes Pseudonym
und gegebenenfalls eine freiwillig hinterlegte, nicht verifizierte E-Mail-Adresse. Der Betreiber
ermittelt daher die zuständige Beratungsstelle und bittet diese um die Prüfung; die
Beratungsstelle gleicht die vorliegenden Angaben mit dem ihr bekannten Beratungsverlauf ab und
bestätigt die Zuordnung über [Kanal, z. B. Rückmeldung im Beratungschat]. Ergänzend kommen in
Betracht: [weitere Legitimationsmittel, z. B. Rückbestätigung über die hinterlegte E-Mail-Adresse,
Nennung fallbezogener Merkmale]. Bestehen begründete Zweifel an der Identität, werden nach
§ 17 Abs. 3 KDG (Art. 12 Abs. 6 DSGVO) zusätzliche Informationen angefordert; kann die Identität
nicht festgestellt werden, wird der Antrag mit Begründung abgelehnt. Zuständig für die Durchführung
ist [Stelle/Funktion], Bearbeitungsfrist ist [Frist].

*Hinweis (vor Veröffentlichung entfernen): Beschreiben Sie das konkrete Verfahren, die
beteiligten Stellen und die Fristen. Das Gesetz verlangt die Prüfung, weil eine Auskunft an die
falsche Person selbst eine unbefugte Offenlegung wäre — bei einer bewusst anonym nutzbaren
Beratungsplattform ist die ehrliche Benennung der Grenzen wichtiger als ein formal wirkendes
Verfahren, das die Identität in Wahrheit nicht feststellen kann.*

---

## 8.3 — Datenschutzhinweise und Informationswege (`informationChannels`)

Die Datenschutzhinweise nach §§ 15 und 16 KDG (Art. 13 und 14 DSGVO) sind vor der Registrierung
auf der Registrierungsseite sowie nach der Anmeldung dauerhaft in der Anwendung verlinkt; für den
registrierungsfreien Live-Chat werden sie auf der vorgeschalteten Einstiegsseite angezeigt.
Impressum, Datenschutzerklärung und Einwilligungstext bestehen auf jeder Ebene der Plattform;
pflegt eine Beratungsstelle keine eigene Fassung, gilt die des Trägers, andernfalls die
Plattform-Vorlage — Ratsuchende sehen damit stets einen vollständigen Satz Rechtstexte. Über
**ihre eigene** Verarbeitung — insbesondere die Falldokumentation außerhalb der Plattform —
informieren die Beratungsstellen selbst, und zwar über [Kanal, z. B. Hinweis im Beratungschat,
Dokument-Upload, Verlinkung der eigenen Datenschutzerklärung]. Änderungen der Datenschutzhinweise
werden [Verfahren, z. B. über einen Hinweis beim nächsten Anmelden] bekannt gemacht. Für Rückfragen
steht [Kontaktkanal] zur Verfügung.

*Hinweis (vor Veröffentlichung entfernen): Anzugeben sind die konkreten Kanäle, über die
Ratsuchende und Beratende informiert werden, sowie die Arbeitsteilung zwischen Plattform und
Beratungsstelle. §§ 15 f. KDG (Art. 13 f. DSGVO) verlangen die Information zum Zeitpunkt der
Erhebung — bei mehreren Verantwortlichen muss erkennbar sein, wer worüber informiert. Für den
Bulk-Import einzuladender Beratender greift zusätzlich die Informationspflicht bei Erhebung bei
Dritten (§ 16 KDG / Art. 14 DSGVO).*

---

## 8.11 — Eskalationskette und Datenweitergabe an Ermittlungsbehörden (`escalationChain`)

Für den Fall, dass im Beratungsverlauf eine anzeigepflichtige Straftat angekündigt oder eine
akute Gefährdung erkennbar wird („Worst-Case-Fall"), besteht eine gemeinsam erarbeitete
Handlungsempfehlung mit folgender Verantwortungskette: (1) Die beratende Person informiert
unverzüglich [Leitung der Beratungsstelle]; (2) es erfolgt eine fachliche Gefährdungseinschätzung
durch [Funktion], erforderlichenfalls unter Hinzuziehung von [Fachdienst]; (3) liegen die
Voraussetzungen des § 138 StGB oder eine Kindeswohlgefährdung vor, leitet **die Beratungsstelle**
— nicht der Plattformbetreiber — die erforderlichen Angaben an [Polizei / Jugendamt] weiter;
(4) parallel werden [Referatsleitung, Datenschutzbeauftragung, Trägervertretung] informiert.
Weitergegeben werden können ausschließlich der von der beratenden Person eingesehene
Nachrichteninhalt, der systemseitig vermerkte Zeitpunkt und die Anschrift des Auftragsverarbeiters;
**IP-Adressen der Ratsuchenden werden in den Fachdatenbeständen nicht geführt und können daher
nicht herausgegeben werden**, und Beratungsinhalte liegen dem Plattformbetreiber wegen der
Ende-zu-Ende-Verschlüsselung nicht im Klartext vor. Für Datenschutzvorfälle nach § 33 KDG
(Art. 33 DSGVO) gilt gesondert: Meldung an [Aufsicht] binnen 72 Stunden über [Meldeweg], interne
Alarmierung von [Funktionen] binnen [Frist], Vertretung durch [Funktion].

*Hinweis (vor Veröffentlichung entfernen): Hier gehören zwei Ketten hinein, die oft verwechselt
werden — die fachliche Eskalation bei Gefahr für Leib und Leben und die datenschutzrechtliche
Meldekette bei einer Verletzung des Schutzes personenbezogener Daten. Nennen Sie Funktionen,
Reihenfolge, Fristen und Vertretungen. § 33 KDG (Art. 33 DSGVO) setzt eine 72-Stunden-Frist; ohne
benannte Vertretungen ist sie im Urlaubs- oder Krankheitsfall nicht einzuhalten. Ergänzen Sie den
Hinweis, dass die Weitergabe an Ermittlungsbehörden bei der Beratungsstelle liegt und die
technische Auskunftsfähigkeit des Betreibers begrenzt ist.*

---

## 9.1 — Legitimer Zweck (`proportionalityPurpose`)

Die Verarbeitung verfolgt den Zweck, ratsuchenden Menschen eine niedrigschwellige, vertrauliche
und ortsunabhängige Beratung zu ermöglichen. [Name des Verantwortlichen] nimmt damit seinen
[satzungsmäßigen / gesetzlichen / kirchlichen] Auftrag wahr, Menschen in Not- und Konfliktlagen zu
unterstützen; Grundlage ist [Verweis auf Leitbild, Satzung oder gesetzlichen Auftrag]. Der Zweck
ist legitim, weil er dem Abbau von Zugangsbarrieren dient: Erreicht werden insbesondere Personen,
die eine Beratungsstelle aus Scham, aus Mobilitätsgründen, wegen zeitlicher Zwänge oder aus Angst
vor Stigmatisierung nicht aufsuchen würden. Ergänzend verfolgt die Verarbeitung das Ziel, die
Beratung digital in der Qualität und Vertraulichkeit anzubieten, die auch für die Beratung vor Ort
gilt.

*Hinweis (vor Veröffentlichung entfernen): Stufe 1 der Vier-Stufen-Prüfung. Benennen Sie den
Zweck aus Ihrem eigenen Auftrag heraus und belegen Sie ihn mit Ihrer Rechts- oder
Satzungsgrundlage. Die Verhältnismäßigkeitsprüfung nach § 35 Abs. 7 lit. b KDG (Art. 35 Abs. 7
lit. b DSGVO) beginnt hier: Ohne legitimen Zweck lässt sich keine der folgenden Stufen begründen.*

---

## 9.2 — Geeignetheit (`proportionalitySuitability`)

Die Verarbeitung ist zur Erreichung des Zwecks geeignet. Eine zentrale, unter einem eingeführten
Namen auffindbare und pseudonym nutzbare Plattform erreicht nachweislich Personen, die andernfalls
keine Hilfe in Anspruch nähmen; dies belegen [Kennzahlen, z. B. Anzahl der Erstanfragen, Anteil
anonymer Erstkontakte, Erhebung/Evaluation vom [Datum]]. Die eingesetzten technischen Verfahren
sind geeignet, die zugesagte Vertraulichkeit tatsächlich herzustellen: Beratungsinhalte werden
Ende-zu-Ende-verschlüsselt übertragen und gespeichert, sodass sie weder dem Betreiber noch seinen
Dienstleistern zugänglich sind. Die einheitliche Plattform ermöglicht zudem ein gemeinsames
Qualitäts-, Sicherheits- und Fortbildungsniveau, das einzelne Träger jeweils für sich nicht
erreichen könnten.

*Hinweis (vor Veröffentlichung entfernen): Stufe 2. Geeignetheit heißt: Der Zweck wird durch die
Verarbeitung tatsächlich gefördert — nicht: sie ist die beste Lösung. Belegen Sie das möglichst
mit eigenen Zahlen oder einer Evaluation; eine bloße Behauptung trägt die Abwägung nicht.*

---

## 9.3 — Erforderlichkeit (`proportionalityNecessity`)

Ein milderes, gleich geeignetes Mittel steht nicht zur Verfügung. Geprüft und verworfen wurden:
(1) der Verzicht auf jede Registrierung — er würde eine kontinuierliche, über mehrere Kontakte
hinweg getragene Beratung und den Aufbau eines Vertrauensverhältnisses unmöglich machen; für den
Erstkontakt bleibt der registrierungsfreie Live-Chat als mildere Variante erhalten;
(2) dezentrale Einzellösungen der Träger — sie fragmentieren das Angebot, überfordern kleinere
Träger technisch und finanziell und schwächen die Auffindbarkeit für Ratsuchende erheblich;
(3) [weitere geprüfte Alternative, z. B. reine Telefon- oder Vor-Ort-Beratung] — [Begründung der
Verwerfung]. Der Umfang der erhobenen Daten ist auf das Erforderliche begrenzt: Pflichtangabe ist
allein die Postleitzahl zur Zuordnung der zuständigen Beratungsstelle; der Benutzername wird
systemseitig erzeugt, alle weiteren Angaben sind freiwillig.

*Hinweis (vor Veröffentlichung entfernen): Stufe 3. Entscheidend ist, dass Sie Alternativen
tatsächlich geprüft und die Verwerfung begründet haben — die Aufsicht fragt danach. Nennen Sie
mindestens zwei geprüfte Alternativen und je einen konkreten Grund, warum sie den Zweck nicht
gleich gut erreichen.*

---

## 9.4 — Angemessenheit (`proportionalityBalance`)

Die Interessenabwägung fällt zugunsten der Verarbeitung aus. Für die Betroffenen streiten die
Sensibilität der Beratungsinhalte und die besondere Schutzbedürftigkeit eines Teils der
Ratsuchenden; für die Verarbeitung streiten der Nutzen des Angebots und die Tiefe der ergriffenen
Schutzmaßnahmen. Maßgeblich sind vier Gesichtspunkte: (1) **Freiwilligkeit** — die Nutzung, die
Registrierung und sämtliche Zusatzangaben sind freiwillig, ein Widerruf ist jederzeit und
unmittelbar wirksam; (2) **Datenminimierung** — der Benutzername wird systemseitig erzeugt,
Pflichtangabe ist allein die Postleitzahl, es findet weder Tracking noch Profilbildung noch
Werbung statt; (3) **begrenzte Verarbeitungstätigkeiten** — der Betreiber wertet Beratungsdaten
nicht aus, Statistiken sind aggregiert und mit einer Kleinstzellen-Unterdrückung versehen;
(4) **umfangreiche technische und organisatorische Maßnahmen** — insbesondere die durchgängige
Ende-zu-Ende-Verschlüsselung aller Beratungsformen, die Selbstlöschung von Nachrichten und Konten,
die verpflichtende Zwei-Faktor-Authentisierung der Beratenden und das protokollierte
Übergabeverfahren. Die verbleibenden Risiken und die ihnen zugeordneten Maßnahmen sind in der
Risikoanalyse (Anlage 1) im Einzelnen ausgewiesen; als noch nicht abschließend behandelt gelten
[Aufzählung der aus Kapitel 10 übernommenen offenen Punkte].

*Hinweis (vor Veröffentlichung entfernen): Stufe 4 und die eigentliche Abwägung. Benennen Sie
zuerst, was gegen die Verarbeitung spricht, und erst danach die kompensierenden Maßnahmen — eine
Abwägung, die nur eine Seite nennt, ist keine. Übernehmen Sie die offenen Punkte aus Kapitel 10
wörtlich; die Angemessenheit steht und fällt mit ihrer Abarbeitung.*

---

## 2 — Ergebnisabsatz der Schwellwertanalyse (`resultParagraph`)

Drei der zehn Prüffragen sind zu bejahen; die Schwelle ist damit überschritten und eine
Datenschutz-Folgenabschätzung ist durchzuführen. Tragend sind die zu erwartenden besonderen
Kategorien personenbezogener Daten nach § 11 KDG (Art. 9 DSGVO), der große Umfang der
Verarbeitung — zum Stichtag [Datum] [Zahl] registrierte Ratsuchende in [Zahl] Beratungsstellen —
sowie das Zusammenwirken mehrerer Verantwortlicher bei einem teilweise besonders schutzbedürftigen
Personenkreis. [Ergänzende Bewertung des Verantwortlichen, z. B. zur Risikoeinstufung oder zu
Besonderheiten einzelner Fachbereiche.] Die vorliegende DSFA setzt diese Pflicht um; ihr Ergebnis
ist in Kapitel 10 festgehalten.

*Hinweis (vor Veröffentlichung entfernen): Ergänzen Sie die eigenen Kennzahlen mit Stichtag und
Ihre Bewertung. § 35 Abs. 1 KDG (Art. 35 Abs. 1 DSGVO) verlangt die Prognose eines voraussichtlich
hohen Risikos — die Begründung sollte auf Ihre konkrete Größenordnung und Ihren Angebotszuschnitt
Bezug nehmen, nicht nur auf die abstrakten Prüffragen.*

---

## A — Anlagenverzeichnis (`annexIndex`)

Zu dieser Datenschutz-Folgenabschätzung gehören: **Anlage 1 — Risikoanalyse** (Risiko-/
Maßnahmen-Matrix mit stabilen Kennungen je Risiko und Maßnahme, Stand [Datum]); **Anlage 2 —
Löschkonzept** (Aufbewahrungs- und Löschfristen je Datenkategorie einschließlich Protokoll- und
Sicherungsdaten, Stand [Datum]); **Anlage 3 — Vereinbarung über die gemeinsame Verantwortlichkeit**
nach § 28 Abs. 1 S. 2 KDG (Art. 26 DSGVO) mit ihren Anlagen [Nummern]; **Anlage 4 —
Auftragsverarbeitungsvereinbarungen** mit [Hosting-Betreiber] und [Entwicklungsdienstleister];
**Anlage 5 — Verzeichnis der Verarbeitungstätigkeiten** nach § 31 KDG (Art. 30 DSGVO), Auszug;
**Anlage 6 — [Handlungsempfehlung Worst-Case-Fall / weitere Anlage]**. Jede Anlage wird
eigenständig versioniert; maßgeblich ist der jeweils im Dokumentkopf ausgewiesene Stand.

*Hinweis (vor Veröffentlichung entfernen): Führen Sie hier alle mitgeltenden Dokumente mit Stand
auf. Anlage 1 und Anlage 2 sind nicht optional: Ohne Risikoanalyse ist das Ergebnis der DSFA nach
§ 35 Abs. 7 lit. d KDG (Art. 35 Abs. 7 lit. d DSGVO) unvollständig, und ohne Löschkonzept fehlen
die Fristen, auf die die Kapitel 6 und 8 durchgängig verweisen.*
