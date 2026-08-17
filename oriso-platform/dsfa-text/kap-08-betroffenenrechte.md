# 8 Schutz der Betroffenen — Betroffenenrechte 8.4 bis 8.10

Die Betroffenenrechte nach §§ 14 ff. KDG (Art. 12 ff. DSGVO) können bei jedem gemeinsam
Verantwortlichen geltend gemacht werden; die interne Zuteilung regelt die Vereinbarung über die
gemeinsame Verantwortlichkeit. Die nachfolgenden Abschnitte beschreiben je Recht, **was technisch
möglich ist und was technisch nicht möglich ist**. Diese Trennung ist bewusst so scharf gezogen:
Die durchgängige Ende-zu-Ende-Verschlüsselung, die weitgehende Datenminimierung und das
Selbstlöschungsmodell erweitern die Rechte der Betroffenen an mehreren Stellen erheblich, setzen
ihnen an anderen Stellen aber eine technische Grenze, die auch mit organisatorischem Aufwand nicht
zu überwinden ist.

*Die Abschnitte 8.1 (Identitätsüberprüfung), 8.2 (Besonderheiten bei anonymer Nutzung), 8.3
(Datenschutzhinweise) und 8.11 (Datenweitergabe an Ermittlungsbehörden) sind betreiberspezifisch
und werden vom Verantwortlichen gepflegt; für 8.1, 8.3 und 8.11 stehen vorausgefüllte Entwürfe
bereit.*

## 8.4 Recht auf Auskunft (§ 17 KDG / Art. 15 DSGVO)

**Technisch möglich.** Der Plattformbetreiber kann über die bei ihm gespeicherten Stamm- und
Systemdaten Auskunft erteilen. Dies sind im Wesentlichen: das systemgenerierte Pseudonym, eine
etwaig hinterlegte E-Mail-Adresse, die Postleitzahl, die Zuordnung zu Beratungsstelle und
Fachbereich, die gewählten Beratungsthemen und fachbereichsbezogenen Angaben, die Zeitpunkte der
Registrierung sowie der Zustimmung zu Nutzungsbedingungen und Datenschutzhinweisen, der Status der
Zwei-Faktor-Authentisierung, Spracheinstellung und Benachrichtigungseinstellungen, die
Metadaten der Beratungssitzungen (Anlage, Zuweisung, Archivierung), die Einträge im
Benachrichtigungsverlauf sowie die zu ihrer Person geführten Protokolleinträge des
Fallübergabeverfahrens.

**Technisch nicht möglich.** Über die **Inhalte** der Beratungskommunikation — Nachrichten,
Dateien, Sprachnachrichten, Video- und Audiogespräche — kann der Plattformbetreiber keine
Auskunft erteilen. Sie liegen ausschließlich als Chiffrat vor; die zur Entschlüsselung
erforderlichen Schlüssel befinden sich allein auf den Endgeräten der Gesprächsbeteiligten
(Abschnitt 6.9). Der Betreiber kann diese Inhalte weder lesen noch ausleiten noch in eine
Auskunft aufnehmen. Ratsuchende haben die Inhalte demgegenüber in ihrer Anwendung vollständig und
jederzeit vor Augen; die Auskunft über den Beratungsinhalt erfolgt damit faktisch durch die
Anwendung selbst und, soweit erforderlich, durch die beratende Stelle.

**Ehrlich zu benennende Grenze.** Zwei Bestände verdienen besondere Erwähnung, weil sie Daten
**über** eine ratsuchende Person außerhalb ihres eigenen Beratungsraums enthalten: die
Team-Besprechung, in der Berater:innen eine noch nicht angenommene Anfrage untereinander erörtern,
und der Begründungsfreitext des Fallübergabeverfahrens. Beide sind der ratsuchenden Person nicht
sichtbar. Der Übergabefreitext ist beim Verantwortlichen im Klartext verfügbar und daher
auskunftsfähig; die Inhalte der Team-Besprechung sind es aus denselben kryptografischen Gründen
nicht wie die Beratungsinhalte selbst — auskunftsfähig sind insoweit nur die Metadaten
(Bestehen des Raums, Zeitpunkt, teilnehmende Fachkräfte). Für den Auskunftsanspruch bedeutet dies:
Die Auskunft ist zu erteilen, sie kann den Inhalt der kollegialen Erörterung aber nicht umfassen.
Diese Einschränkung ist im Auskunftsschreiben ausdrücklich zu benennen; sie darf nicht durch eine
pauschale Formulierung verdeckt werden.

**Verfahrenshinweis.** Da die Auskunft die Identität der antragstellenden Person voraussetzt, die
Plattform diese aber bewusst nicht kennt, ist die Identitätsprüfung nach Abschnitt 8.1 vorgelagert
und praktisch nur über die Beratungsstelle zu leisten.

## 8.5 Recht auf Berichtigung (§ 18 KDG / Art. 16 DSGVO)

**Technisch möglich.** Ratsuchende können ihre E-Mail-Adresse, ihr Passwort, die
Spracheinstellung, die Benachrichtigungseinstellungen und den zweiten Faktor selbst und
unmittelbar in der Anwendung ändern. Beratende und administrative Rollen lassen Namensangaben,
dienstliche E-Mail-Adresse, Abwesenheitshinweis und Zuordnungen über ihre Administration ändern.

**Praktisch begrenzt.** Die übrigen Angaben sind entweder systemseitig erzeugt (das Pseudonym, die
Kontokennung) oder dokumentieren die tatsächliche Systemnutzung (Zeitstempel, Sitzungsstatus,
Protokolleinträge). Solche Dokumentationsdaten sind einer Berichtigung nicht zugänglich, weil eine
Änderung den dokumentierten Vorgang unrichtig machen würde; sie unterliegen stattdessen der
Löschung nach Fristablauf. Die Postleitzahl ist änderbar, ihre inhaltliche Richtigkeit wird
systemseitig ohnehin nicht geprüft.

**Technisch nicht möglich.** Eine Berichtigung von Beratungsinhalten durch den Plattformbetreiber
ist ausgeschlossen. Ratsuchende können eigene Nachrichten jedoch selbst löschen und neu senden;
das ist der praktisch wirksamere Weg.

## 8.6 Recht auf Löschung (§ 19 KDG / Art. 17 DSGVO)

**Technisch möglich — besonders datenschutzfreundlich ausgestaltet.** Ratsuchende können einzelne
Nachrichten sowie ihr gesamtes Konto selbstständig und unmittelbar löschen; einer Antragstellung
beim Verantwortlichen bedarf es dafür nicht. Die Kontolöschung durchläuft ein Schutzfenster von
48 Stunden mit ausschließlich lesendem Zugriff — es dient dem Schutz vor Fehlbedienung — und wird
anschließend automatisiert vollzogen. Der Löschlauf entfernt Identitätskonto, Chat-Konto
(einschließlich ausdrücklichem Löschkennzeichen und Bereinigung der Räume auf dem Chat-Server),
Sitzungen und Sitzungszusatzdaten, Themen- und Supervisionszuordnungen, Fallübergabe-Anträge,
Agenturzuordnungen, den Eintrag in der Pseudonym-Registrierung, mobile Gerätekennungen und
schließlich den Kontodatensatz. Anonyme Konten werden ohne Zutun der betroffenen Person nach
kurzer Frist automatisiert gelöscht.

Beratende werden im Rahmen ihrer Einführung darauf hingewiesen, dass Beratungsdaten jederzeit und
ohne Ankündigung durch die ratsuchende Person entfernt werden können.

**Technisch nicht möglich.** Der Serverbetreiber kann eine **einzelne** Nachricht innerhalb eines
verschlüsselten Verlaufs nicht identifizieren und daher nicht gezielt löschen; er kann jedoch
vollständige Räume samt Medien entfernen. Die Löschung einzelner Nachrichten erfolgt deshalb
ausschließlich durch die betroffene Person selbst in der Anwendung.

**Ehrlich zu benennende Grenzen.**

1. **Nicht erfasste Bestände.** Der Konto-Löschlauf erfasst derzeit nicht: den
   In-App-Benachrichtigungsverlauf, serverseitig gespeicherte Nachrichtenentwürfe, die
   pseudonymisierte Nachrichtenstatistik der Beratenden, das Archiv versendeter Einladungs-Mails,
   das Prüfprotokoll der Inaktivitätsbenachrichtigungen sowie eine aus der Migration verbliebene
   Zuordnungstabelle zwischen Person und Chat-Raum. Das Schließen dieser Lücken ist als Maßnahme
   geführt (Abschnitt 6.18); bis dahin ist die Löschung **nicht vollständig** und darf nicht als
   solche beschrieben werden.
2. **Verweisdatensatz nach der Löschung.** Nach dem Vollzug verbleibt ein Verweisdatensatz mit der
   vollständigen früheren Kontokennung, damit Verweise in fortbestehenden Datensätzen aufgelöst
   werden können. Der Personenbezug überdauert damit die Löschung. Für diesen Datensatz ist eine
   Frist festzulegen oder die Kennung ihrerseits zu pseudonymisieren.
3. **Sicherungen.** Gelöschte Daten bestehen bis zum Ablauf der Sicherungsfristen (30 Tage
   Vollsicherung, sieben Tage fortlaufende Protokollsicherung des Chat-Dienstes) in den
   Sicherungen fort. Das ist bei zeitlich gestaffelten Sicherungen üblich und im Löschkonzept
   auszuweisen.
4. **Protokoll- und Nachweisdaten.** Protokoll- und Nachweisdaten mit eigener Rechtsgrundlage und
   eigener Frist sind von Löschanträgen ausgenommen (Abschnitt 7.5).
5. **Beratende.** Konten Beratender können während der aktiven Tätigkeit nicht gelöscht werden;
   maßgeblich ist insoweit die Beendigung des Tätigkeitsverhältnisses beim Träger.
6. **Team-Besprechungs-Archiv.** Der geschlossene Besprechungsraum bleibt lesend erhalten; eine
   Aufbewahrungsfrist ist festzulegen.

## 8.7 Recht auf Einschränkung der Verarbeitung (§ 20 KDG / Art. 18 DSGVO)

**Technisch nicht umsetzbar in der eigentlichen Form.** Eine Kennzeichnung von Daten als „nur
gespeichert, aber nicht verarbeitet" sieht die Plattform nicht vor; eine solche Kennzeichnung
wäre bei Ende-zu-Ende-verschlüsselten Inhalten auch wirkungslos, weil der Verantwortliche sie
ohnehin nicht verarbeitet.

**Technisch möglich als funktionale Entsprechung.** Zur Verfügung stehen: die **Aussetzung des
Löschvorgangs** für drei bis höchstens zwölf Monate mit dokumentiertem Grund — sie hält den
Bestand unverändert, ohne ihn zu löschen —, das **Lesefenster** von 48 Stunden im Löschlauf, in
dem keine schreibende Verarbeitung mehr stattfindet, sowie die **Sperrung oder Löschung des
Kontos** über den Verantwortlichen. Für Beratende steht zusätzlich die vorübergehende
Deaktivierung des Kontos zur Verfügung; sie ist die praktisch nächstliegende Entsprechung einer
Einschränkung.

Ratsuchende können ihr Konto selbst nicht sperren, sondern nur löschen. Ein Antrag auf
Einschränkung ist daher an den Verantwortlichen zu richten, der die Sperrung veranlasst.

## 8.8 Recht auf Datenübertragbarkeit (§ 22 KDG / Art. 20 DSGVO)

**Technisch möglich.** Die auf Einwilligung gestützten Stammdaten (Pseudonym, E-Mail-Adresse,
Postleitzahl, Themen- und Fachbereichszuordnung, freiwillige Zusatzangaben, Zeitpunkte der
Zustimmungen) lassen sich in einem strukturierten, gängigen und maschinenlesbaren Format
bereitstellen.

**Technisch nicht möglich.** Ein maschinenlesbarer Export der Beratungsinhalte durch den
Verantwortlichen scheidet aus, weil dieser sie nicht entschlüsseln kann. Ratsuchende können die
Inhalte in ihrer Anwendung vollständig einsehen und auf ihrem Endgerät sichern; eine
serverseitig erzeugte Ausleitung existiert nicht. Ein clientseitiger Export der entschlüsselten
Historie ist als mögliche Produktmaßnahme zu prüfen, derzeit jedoch nicht umgesetzt. Die
Einschränkung ist die unmittelbare Kehrseite der Verschlüsselung — sie ist der Preis für einen
Schutz, der ohne sie nicht bestünde, und wird daher offen ausgewiesen statt beschönigt.

Für Beratende ist das Recht regelmäßig nicht einschlägig, weil ihre Daten weder auf Einwilligung
noch auf einem mit ihnen geschlossenen Vertrag mit dem Plattformbetreiber beruhen.

## 8.9 Recht auf Widerspruch (§ 23 KDG / Art. 21 DSGVO)

**Praktisch enger Anwendungsbereich.** Der Widerspruch richtet sich gegen Verarbeitungen auf
Grundlage berechtigter Interessen. Bei Ratsuchenden betrifft dies allein die technischen
Nutzungs- und Betriebsdaten (Abschnitt 7.2 Absatz 1). Diese sind für den Betrieb zwingend
erforderlich; ein Widerspruch führte dazu, dass die Plattform nicht mehr genutzt werden kann. Er
läuft damit auf die Beendigung der Nutzung — und damit auf das Löschungsrecht nach Abschnitt 8.6 —
hinaus. Verarbeitungen zu Werbe- oder Marketingzwecken, gegen die ein voraussetzungsloser
Widerspruch bestünde, finden nicht statt.

Bei Beratenden überwiegen regelmäßig zwingende schutzwürdige Gründe des Verantwortlichen, weil
ohne Konto, Rollenzuordnung und Protokollierung weder Beratung noch deren Nachweisbarkeit möglich
sind. Ein Widerspruch ist im Einzelfall zu prüfen, insbesondere bei der Tätigkeitsstatistik
(Abschnitt 6.15), bei der die Abwägung wegen des Leistungsbezugs sorgfältig zu dokumentieren ist.

## 8.10 Recht auf Widerruf der Einwilligung (§ 8 Abs. 6 KDG / Art. 7 Abs. 3 DSGVO)

**Technisch möglich und unmittelbar wirksam.** Der Widerruf kann gegenüber der Beratungsstelle
oder gegenüber dem Plattformbetreiber erklärt werden. Da die Registrierung und die Beratung auf
Einwilligung beruhen, entzieht der Widerruf ihnen die Grundlage; er wird durch die Löschung des
Kontos unmittelbar vollzogen, die die betroffene Person selbst auslösen kann. Teilwiderrufe sind
für die freiwilligen Zusatzangaben möglich: Die E-Mail-Adresse und die
Zwei-Faktor-Authentisierung lassen sich jederzeit selbst entfernen.

Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt. Für Beratende ist
das Widerrufsrecht nicht einschlägig, weil ihre Datenverarbeitung nicht auf Einwilligung beruht
(Abschnitt 7.3).

> **Nachweis der Einwilligung — offener Punkt.** Die Zustimmung zu Nutzungsbedingungen und
> Datenschutzhinweisen wird mit Zeitstempel gespeichert. Für einen Teil des Registrierungsflusses
> ist eine ausschließlich clientseitige Prüfung der Bestätigung dokumentiert; ein serverseitig
> erzwungener Nachweis ist zur Erfüllung der Nachweispflicht nach § 8 Abs. 2 KDG
> (Art. 7 Abs. 1 DSGVO) sicherzustellen. Dieser Punkt ist als Maßnahme geführt.

## 8.12 Zusammenfassende Bewertung je Recht

| Recht | Norm KDG (DSGVO) | Umsetzbarkeit |
|---|---|---|
| Auskunft | § 17 KDG (Art. 15) | eingeschränkt — Stamm- und Systemdaten ja, Beratungsinhalte technisch nicht |
| Berichtigung | § 18 KDG (Art. 16) | eingeschränkt — änderbare Felder selbst pflegbar, Dokumentationsdaten nicht berichtigungsfähig |
| Löschung | § 19 KDG (Art. 17) | weitgehend — Selbstlöschung von Nachrichten und Konto; benannte Restbestände offen |
| Einschränkung | § 20 KDG (Art. 18) | eingeschränkt — nur Sperrung, Löschaussetzung oder Deaktivierung |
| Datenübertragbarkeit | § 22 KDG (Art. 20) | eingeschränkt — Stammdaten exportierbar, Beratungsinhalte nicht |
| Widerspruch | § 23 KDG (Art. 21) | praktisch kaum einschlägig — Betriebsdaten zwingend erforderlich |
| Widerruf | § 8 Abs. 6 KDG (Art. 7 Abs. 3) | vollständig — unmittelbar durch Selbstlöschung vollziehbar |
