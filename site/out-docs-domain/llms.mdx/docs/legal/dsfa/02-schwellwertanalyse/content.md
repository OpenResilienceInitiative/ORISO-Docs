# 2 Schwellwertanalyse (/legal/dsfa/02-schwellwertanalyse)



Vor der Durchführung einer Datenschutz-Folgenabschätzung (nachfolgend „DSFA") ist zu prüfen, ob
die Verarbeitungstätigkeit voraussichtlich ein hohes Risiko für die Rechte und Freiheiten
natürlicher Personen zur Folge hat und die DSFA damit nach § 35 KDG (Art. 35 DSGVO) verpflichtend
ist. Die Prüfung erfolgt zweistufig: zunächst über die beiden Vorfragen (Muss-Liste der
zuständigen Aufsicht sowie Regelbeispiele), sodann anhand der zehn Prüffragen, die den Kriterien
der Arbeitsgruppe nach Art. 29 (WP 248) entsprechen.

## 2.1 Vorfragen [#21-vorfragen]

| Vorfrage                                                                                                                                            | Norm                                   | Antwort     |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------- |
| Ist die Verarbeitung in der Liste der Verarbeitungsvorgänge aufgeführt, für die die zuständige Aufsicht eine DSFA zwingend vorsieht („Muss-Liste")? | § 35 Abs. 5 KDG (Art. 35 Abs. 4 DSGVO) | ☐ Ja ☒ Nein |
| Ist ein Regelbeispiel erfüllt, bei dem das Gesetz ein hohes Risiko vermutet?                                                                        | § 35 Abs. 4 KDG (Art. 35 Abs. 3 DSGVO) | ☒ Ja ☐ Nein |

Das Regelbeispiel ist erfüllt, weil die Verarbeitung besondere Kategorien personenbezogener Daten
im Sinne des § 11 KDG (Art. 9 DSGVO) — insbesondere Gesundheitsdaten, Angaben zum Sexualleben,
zur religiösen oder weltanschaulichen Überzeugung — in erheblichem Umfang zum Gegenstand hat und
sich zugleich an einen teilweise besonders schutzbedürftigen Personenkreis richtet.

> **Hinweis zum Compliance-Preset.** Unter der Datenschutz-Grundverordnung verläuft der
> Herleitungspfad abweichend: Eine Online-Beratung mit Krisen- und Gesundheitsbezug über
> digitale Kanäle ist regelmäßig bereits in den Muss-Listen der zuständigen
> Landesdatenschutzbehörden aufgeführt, sodass die erste Vorfrage dort zu bejahen ist. Das
> Ergebnis der Schwellwertanalyse bleibt in beiden Regimen dasselbe; nur die Begründungskette
> wechselt.

## 2.2 Prüffragen [#22-prüffragen]

Es gilt die Entscheidungsregel: &#x2A;*Werden zwei oder mehr Fragen bejaht, ist die Durchführung einer
DSFA erforderlich.**

| #  | Prüffrage                                                                                                 | Antwort     |
| -- | --------------------------------------------------------------------------------------------------------- | ----------- |
| 1  | Werden betroffene Personen bewertet oder eingestuft (Scoring, Profiling)?                                 | ☐ Ja ☒ Nein |
| 2  | Erfolgen automatisierte Entscheidungen mit rechtlicher Wirkung oder ähnlich erheblicher Beeinträchtigung? | ☐ Ja ☒ Nein |
| 3  | Findet eine systematische Überwachung betroffener Personen statt?                                         | ☐ Ja ☒ Nein |
| 4  | Werden vertrauliche, höchstpersönliche oder besondere Kategorien personenbezogener Daten verarbeitet?     | ☒ Ja ☐ Nein |
| 5  | Erfolgt die Verarbeitung in großem Umfang?                                                                | ☒ Ja ☐ Nein |
| 6  | Werden Datensätze abgeglichen oder zusammengeführt?                                                       | ☐ Ja ☒ Nein |
| 7  | Sind schutzbedürftige betroffene Personen betroffen bzw. wirken mehrere Verantwortliche zusammen?         | ☒ Ja ☐ Nein |
| 8  | Werden innovative Technologien in neuartiger Weise eingesetzt?                                            | ☐ Ja ☒ Nein |
| 9  | Führt die Verarbeitung dazu, dass betroffene Personen an der Ausübung eines Rechts gehindert werden?      | ☐ Ja ☒ Nein |
| 10 | Erfolgt die Verarbeitung an öffentlich zugänglichen Orten?                                                | ☐ Ja ☒ Nein |

**Zu Frage 4.** Gegenstand der Beratung sind ihrer Natur nach vertrauliche Inhalte; je nach
Fachbereich sind Gesundheitsdaten, Angaben zu Suchtmittelgebrauch, Schwangerschaft, familiärer
Gewalt oder Suizidalität zu erwarten. Der Erhebungsumfang wird je Fachbereich über die
Konfiguration der Beratungsart gesteuert (unter anderem Alter, Geschlecht, Bundesland,
Suchtmittel, Beratungsanlass); die Plattform speichert diese Angaben strukturiert neben der
Beratungssitzung. Ergänzend werden mit den Beratungsthemen kategorisierende Angaben verarbeitet,
die für sich genommen bereits einen Rückschluss auf den Beratungsanlass zulassen.

**Zu Frage 5.** Die Plattform ist als mandantenfähiges Angebot für eine Vielzahl von Trägern,
Beratungsstellen und Fachbereichen ausgelegt; die Zahl der registrierten Ratsuchenden, der
Beratungsstellen und der aktiven Beratenden ist in Kapitel 3 mit Stichtag ausgewiesen. Bereits die
Größenordnung der erreichten Personen spricht für ein erhöhtes Risiko.

**Zu Frage 7.** Es wirken mehrere Verantwortliche zusammen (Plattformbetreiber, Träger und
Beratungsstellen, vgl. Kapitel 5). Zugleich richten sich einzelne Fachbereiche ausdrücklich an
schutzbedürftige Personengruppen, insbesondere an Minderjährige und junge Erwachsene sowie an
Personen in akuten Krisen- und Abhängigkeitslagen.

**Zu Frage 8 — Abgrenzung.** Die eingesetzten Verfahren (Matrix-Protokoll mit Olm-/Megolm-
Ende-zu-Ende-Verschlüsselung, WebRTC-Videokommunikation über eine selbst betriebene
Medienvermittlung, zentrales Identitätsmanagement) sind etablierte, quelloffene und in breitem
Einsatz befindliche Standardverfahren. Sie werden hier nicht in neuartiger Weise, sondern
bestimmungsgemäß verwendet; die Frage wird daher verneint. Ihr Einsatz wirkt risikomindernd und
ist in Kapitel 6 im Einzelnen beschrieben.

**Zu Frage 3 — Abgrenzung.** Eine systematische Überwachung findet nicht statt: Es werden weder
Tracking- oder Analysedienste noch Werbenetzwerke, externe Schriftarten oder
Drittanbieter-Skripte eingesetzt; im Browser der Nutzer:innen wird keinerlei Produkt- oder
Fehlertelemetrie erhoben. Ehrlichkeitshalber ist gleichwohl festzuhalten, dass die Plattform
betriebsbedingt Verhaltens- und Anwesenheitsmetadaten verarbeitet — Lesezeitpunkte von
Benachrichtigungen, Online-Status (Presence) im Chat-Dienst, Lesebestätigungen und
Aktivitätszeitpunkte —, ohne dass diese zu einer Bewertung oder Überwachung einzelner Personen
zusammengeführt würden. Die betreffenden Verarbeitungen und die vorgesehenen
Minimierungsmaßnahmen sind in den Abschnitten 6.10, 6.12 und 6.14 dargestellt.

## 2.3 Ergebnis [#23-ergebnis]

Drei der zehn Prüffragen sind zu bejahen; damit ist die Schwelle der Entscheidungsregel
überschritten. &#x2A;*Eine DSFA ist durchzuführen.** Maßgeblich sind die zu erwartenden besonderen
Kategorien personenbezogener Daten nach § 11 KDG (Art. 9 DSGVO), der große Umfang der
Verarbeitung sowie das Zusammenwirken mehrerer Verantwortlicher bei einem teilweise besonders
schutzbedürftigen Personenkreis. Die vorliegende DSFA setzt diese Pflicht um.

Der Ergebnisabsatz ist zugleich der Ort, an dem der Betreiber seine eigene Bewertung des
verbleibenden Risikos festhält; die betreiberspezifische Fassung wird über den
Freitext-Slot `resultParagraph` gepflegt.
