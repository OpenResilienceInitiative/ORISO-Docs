# ADR-016: Team-Besprechung — separater Nebenraum je offener Anfrage, endgültiges Schließen bei Annahme

- **Status:** Angenommen — Frank, 2026-07-18 (grill-with-docs-Sitzung)
- **Datum:** 2026-07-18
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** ADR-002 (stille Mitgliedschaft / Zugriffsschranke), ADR-008 (Supervisionsseitenkanal als eigener Raum), `CONTEXT-conversation-types.md` (Team-Besprechung als zusätzliche Ebene), `ORISO-Frontend/CONTEXT.md` (vollständiger Glossareintrag), Memory `oriso-team-besprechung-design`

---

## Kontext

Beraterteams möchten sich vor der Annahme einer eingehenden Anfrage abstimmen: „Wer übernimmt das, was meint ihr?“ Dies soll für Ratsuchende unsichtbar sein; danach läuft die normale 1:1-Beratung. Naheliegend wären versteckte Nachrichten oder ein Team-Thread im Gespräch des Klienten. Matrix liefert jedoch jedes Ereignis an jedes Gerät jedes Raummitglieds. Das Verstecken innerhalb desselben Raums war genau die U25-Schutzlücke, die ADR-008 beseitigte. Auf `origin/pre-dev` geprüft: Der ADR-008-Nebenraum ist vorhanden — ein Matrix-Raum je Sitzung, in den der Klient nie eingeladen wird, mit Abbruch beim Senden bei erkannter Offenlegung. Er wird aber erst bei *Annahme* angehängt und setzt einen zugewiesenen Berater voraus. Der alte Caritas-Feedback-Chat wurde entfernt (Changeset 0046).

## Entscheidung

1. **Team-Besprechung = separater Matrix-Raum an einer offenen Anfrage der Beratungsstellenberatung.** Das erweitert das Nebenraumprinzip aus ADR-008 auf die Phase vor der Zuweisung. Verbindliche Regel: **Teamabstimmung findet niemals im Raum des Klienten statt, auch nicht „versteckt“.**
2. **Endgültiges Schließen bei Annahme.** Sobald die Anfrage angenommen wird, wird die Besprechung archiviert. Sie wird *nicht* in den aktiven Fall übernommen. Danach erfolgen Abstimmungen über die vorhandenen Werkzeuge: **Supervision** (lesende Begleitung) oder **Fallübergabe** (Mitbearbeitung/Übernahme). So bleiben drei klar getrennte Werkzeuge statt eines unklaren Mischmodells.
3. **Erneuter Archivzugriff ist ausschließlich lesend** (verbindliche Regel). Zugriffsregeln bleiben zunächst locker: Teammitglieder dürfen ohne formale Mitbearbeitung lesen. Die Aufbewahrung nutzt die bestehende automatische Archivlöschung, ohne neuen TTL-Mechanismus.
4. **Teilnahmerecht = Recht, die Anfrage zu sehen.** Genau die Berater, die eine Anfrage sehen und annehmen könnten, dürfen sie besprechen. Es gibt keine neue Berechtigungsebene. Ein mandantenbezogener Funktionsschalter steuert die gesamte Funktion.
5. **Die Besprechung ist flach.** Der Nebenraum gehört bereits zu genau einer Anfrage und *ist* damit deren einzelner „Thread“. Er enthält keine weitere Thread-Struktur. Gilt nur für Beratungsstellenberatung: Live-Chat ist anonym und kurzlebig und nach ADR-002 ausgeschlossen; die anderen Beratungsformen haben keinen Anfragebereich.
6. Oberfläche: ein Panel/Tab an der Anfrage im Anfragebereich, mit Beitragszähler und dauerhaftem Hinweis „nur für das Team — unsichtbar für Ratsuchende“. So ist jederzeit klar, auf welcher Seite ein Berater schreibt.

## Erwogene Optionen

- **Thread im Raum des Klienten, nur im Client verborgen.** Verworfen: mit Matrix nicht sicher versteckbar; öffnet erneut dieselbe Lückenklasse wie ADR-008.
- **Nebenraum in den aktiven Fall übernehmen.** Durch Produktentscheidung verworfen: Nach Annahme gehört Abstimmung zu Supervision/Fallübergabe. Ein weiterlaufender Raum verwischt diese Grenze. Lesender Archivzugriff erhält stattdessen den Zusammenhang: eingefroren und bei Bedarf lesbar statt dauerhaft offen.
- **Auf Megolm-Empfängeruntergruppen warten (ein Raum, kryptografisches Verstecken).** Bereits in ADR-008 verschoben; vor dem geplanten Start am 2026-10-01 unrealistisch.

## Folgen

**Positiv:** Verwendet einen ausgelieferten Nebenraummechanismus mit Schutz vor Offenlegung; kein neues Berechtigungsmodell; klare Lebenszyklusgrenze passend zur vorhandenen Einteilung der Werkzeuge. **Aufwand:** Raum beim Eingang der Anfrage bereitstellen, einschließlich Bedienung vor der Zuweisung — die heutige Fassade setzt einen zugewiesenen Berater voraus. Die Verteilung von Benachrichtigungen an mehrere Empfänger muss gebaut werden; aktuelle Nachrichtenerzeuger setzen Benutzer und Berater fest voraus. Außerdem ist eine Oberfläche für erneuten Archivzugriff nötig.
