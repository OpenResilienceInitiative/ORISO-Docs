# 10 Ergebnis der Datenschutz-Folgenabschätzung (/legal/dsfa/10-ergebnis)



Die Verarbeitungstätigkeit „Bereitstellung und technischer Betrieb der Online-Beratungsplattform"
kann in der in Kapitel 6 beschriebenen Ausgestaltung umgesetzt werden — &#x2A;*unter Beachtung der
Maßnahmen aus der Risikoanalyse (Anlage 1) und der Fristen des Löschkonzepts (Anlage 2)**. Ohne
diese beiden Anlagen ist das Ergebnis inhaltlich unvollständig; die Freigabe steht unter dem
Vorbehalt der dort festgelegten Maßnahmen.

Tragend für dieses Ergebnis sind die technischen Schutzmaßnahmen, die den Zugriff des
Verantwortlichen und seiner Auftragsverarbeiter auf die eigentlichen Beratungsinhalte
ausschließen: die durchgängige, nicht abschaltbare Ende-zu-Ende-Verschlüsselung aller
Beratungsformen einschließlich Dateien, Sprachnachrichten und Medienströmen, die
Datenminimierung durch systemgenerierte Pseudonyme, der vollständige Verzicht auf Tracking und
Drittanbieter-Telemetrie, die deaktivierte Föderation, die Selbstlöschung von Nachrichten und
Konten sowie die Kleinstzellen-Unterdrückung und die Pseudonymisierung in der Statistik. Gegenüber
der Vorgängerplattform stellt dies in den zentralen Punkten — Nachrichten, Dateien, Video und
anonymer Live-Chat — eine wesentliche Verbesserung des Schutzniveaus dar.

Zugleich ist dieses Ergebnis ausdrücklich **bedingt**. Es setzt voraus, dass die in dieser DSFA
offen benannten Punkte vor dem Produktivbetrieb abgearbeitet werden. Als Bedingungen sind
festzuhalten:

1. **Klärung des Sicherungspfads in ein externes Quellcode-Verwaltungssystem** (Abschnitt 6.17).
   Ist dieser Pfad aktiv, liegt eine unzulässige Drittlandübermittlung mit praktisch unlöschbarer
   Historie vor; die Freigabe entfällt bis zur Abschaltung.
2. **Schließen der Löschlücken** und Festlegung von Aufbewahrungsfristen für die in
   Abschnitt 6.18 benannten Bestände, für die Protokolldaten und für die Medien des Chat-Dienstes.
3. **Härtung des Betriebs des Chat-Dienstes**: Abschaltung der offenen Registrierung,
   Wiederherstellung der Ratenbegrenzungen, authentifizierte Medien-Downloads, Entscheidung über
   die Deaktivierung des Online-Status.
4. **Trennung von Betriebs- und Einsichtsrechten** der Plattform-Administration sowie
   ausschließlich schreibender Umgang mit Zugangsdaten der Träger und deren Verschlüsselung im
   Ruhezustand (Abschnitt 6.16).
5. **Ersetzung der externen STUN-Server** und Aktivierung des IP-freien Protokoll-Zuhörers im
   Identitätsmanagement (Abschnitte 6.6 und 6.10).
6. **Nachweis der Konfiguration des Identitätsmanagements** am Live-System (Passwortrichtlinie,
   Anmeldeschutz, Token-Laufzeiten, Zwei-Faktor-Erzwingung) und Angleichung der DSFA an den
   nachgewiesenen Stand (Abschnitt 6.5).
7. **Klärung der offenen Betreiberfragen** mit dem Hostinganbieter: Verschlüsselung ruhender
   Daten, Speicherort und Verschlüsselung der Sicherungen, Zugriffs- und Adminkonzept der
   Produktivumgebung, Unterauftragsverarbeiter. Ohne diese Antworten bleibt das Kapitel zu den
   technischen und organisatorischen Maßnahmen unvollständig.
8. **Entscheidung über den Medien-Prüf-Proxy** (Abschnitt 6.12): Solange kein automatisierter
   Scan aktiv ist, verbleibt ein mittleres Restrisiko, das in der Risikoanalyse als solches zu
   führen und gegenüber den Trägern transparent zu machen ist.

Nicht Gegenstand dieser DSFA sind Funktionen, die zwar entschieden, aber nicht ausgeliefert sind —
insbesondere die Terminverwaltung (Abschnitt 6.2.6) und der Medien-Prüf-Proxy. Sie werden bei
Auslieferung durch Fortschreibung dieses Dokuments bewertet. Ebenso ist eine Aktivierung der
Statistik-Ereignisveröffentlichung, der Push-Benachrichtigungen oder des geparkten Geräts jeweils
vor Inbetriebnahme gesondert zu bewerten.

Diese DSFA ist als lebendes Dokument angelegt: Sie wird mit jeder Release-Version fortgeschrieben,
und jede technische Aussage ist auf Quellcode, Konfiguration oder Architekturentscheidung
zurückführbar. Eine routinemäßige Überprüfung erfolgt zu dem im Dokumentkopf ausgewiesenen
Zeitpunkt sowie anlassbezogen bei wesentlichen Änderungen der Verarbeitung.

*Die abschließende Bewertung der Verhältnismäßigkeit (Kapitel 9) und die Freigabe durch die
Datenschutzbeauftragung des Verantwortlichen sind betreiberseitig zu ergänzen.*
