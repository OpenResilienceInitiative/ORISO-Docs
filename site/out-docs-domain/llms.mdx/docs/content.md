# ORISO Dokumentation (/)



<Cards>
  <Card title="DSFA — Datenschutz-Folgenabschätzung" href="/legal/dsfa">
    Die Kapitel, die das Entwicklungsteam verantworten kann: Schwellwertanalyse, Verfahren und
    Technik, Rechtsgrundlagen, Betroffenenrechte, Ergebnis. Jede code-gestützte Aussage trägt ihren
    Beleg mit Repository, Pfad und Zeilenbereich.
  </Card>

  <Card title="Architekturentscheidungen (ADR)" href="/decisions">
    Die plattformweite ADR-Reihe 001–023. Die DSFA verweist auf sie; jede Nennung im Text ist
    verlinkt.
  </Card>
</Cards>

## Drei Regeln, nach denen die Texte geschrieben sind [#drei-regeln-nach-denen-die-texte-geschrieben-sind]

1. **Was nicht live ist, wird nicht als vorhanden beschrieben.** Der Status jedes Belegs
   (`live`, `standardmäßig aus`, `nicht ausgeliefert`, `Live-Prüfung offen`) steht neben der Aussage.
2. **Risiko benennen, Kompensation sofort nachschieben.**
3. **Grenzen ehrlich benennen.** „Beinahe unmöglich", „nicht haltbar", „darf nicht behauptet werden"
   sind Absicht.

## Wie die Belege funktionieren [#wie-die-belege-funktionieren]

Unter jedem technischen Abschnitt liegt ein Block &#x2A;*„Belege aus dem Code"**. „Code anzeigen" öffnet
den Quelltext aus dem Understand-Anything-Knowledge-Graphen mit hervorgehobenem Zeilenbereich;
„GitHub" führt auf denselben Pfad im Repository. Die Belegtabelle selbst liegt maschinenlesbar in
`oriso-platform/dsfa-text/evidence-map.yaml`.
