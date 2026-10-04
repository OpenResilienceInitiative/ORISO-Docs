# ADR-017: Chat-Threads auf nativen Matrix-Relationen `m.thread` neu aufbauen — vollständiger Wechsel ohne doppelten Lesepfad

- **Status:** Angenommen — Frank, 2026-07-18 (grill-with-docs-Sitzung)
- **Datum:** 2026-07-18
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** ADR-004 (eigene Oberfläche behalten, Matrix-SDK verwenden), ADR-016 (Team-Besprechung bleibt flach und hängt hiervon nicht ab), Memory `feedback-no-prod-users-skip-migration`, Memory `oriso-team-besprechung-design`

---

## Kontext

Prüfung von `origin/pre-dev` am 2026-07-18: Die vorhandene Thread-Funktion ist **vollständig selbst gebaut**. Die Thread-Zuordnung wird als Klartext-Token `[THREAD:<rootEventId>]` vor den Nachrichtentext gesetzt (`messageConstants.ts`) und im Client je Nachricht wieder ausgewertet. MSC3440 und die nativen Threads von matrix-js-sdk werden nicht verwendet, obwohl das ausgelieferte SDK v38 sie vollständig unterstützt. Folgen: keine Zusammenarbeit mit anderen Clients, die das rohe Token anzeigen; Zusammenfassungen und Zähler nur für geladene Nachrichten; keine Thread-Seitenaufteilung; keine Lesebestätigungen je Thread; die Zuordnung bricht bei Bearbeitung oder Löschung des Ausgangsereignisses. Frank möchte Threads erweitern, daher muss zuerst die Grundlage tragfähig werden.

## Entscheidung

Sende- **und** Lesepfad auf native Matrix-Threads umstellen (`m.relates_to: { rel_type: "m.thread", event_id, is_falling_back: true, "m.in_reply_to": … }`; Oberfläche über `room.getThreads()`, `Thread`-Zeitleisten und Thread-Lesebestätigungen). **Vollständiger Wechsel:** Die Konvention mit dem Präfix `[THREAD:]` und ihr Parser werden vollständig entfernt. Es gibt keinen Kompatibilitätspfad mit zwei Leseverfahren. Bereits vorhandene Präfixnachrichten erscheinen als normale flache Nachrichten. Ein kleiner Darstellungsfilter entfernt verbleibende sichtbare Tokens `[THREAD:…]` aus dem Nachrichtentext, ausschließlich kosmetisch und ohne Thread-Bedeutung.

## Erwogene Optionen

- **Eigenes Präfixsystem erweitern.** Verworfen: Baut SDK-Funktionen nach, behält alle genannten Fehler und erzeugt immer mehr Altdaten mit `[THREAD:]`.
- **Übergang mit zwei Lesepfaden (zuerst nativ, Präfix als Rückfall).** Unter der Regel „keine Produktionsbenutzer → keine Migrationslasten mittragen“ verworfen. Pre-Dev-Daten sind verzichtbar, und gerade der alte Parser soll verschwinden. Zwei dauerhafte Lesepfade für verzichtbare Daten lohnen sich nicht.

## Folgen

**Positiv:** Das SDK liefert Thread-Funktionen auf Element-Niveau: Thread-Liste, Seitenaufteilung, ungelesene Nachrichten und Lesebestätigungen je Thread sowie Zusammenarbeit mit anderen Clients. Die eigenen Benachrichtigungsendpunkte wie `thread.reply.new` bleiben als Ergänzung bestehen und funktionieren weiter. **Aufwand:** Bestehende Pre-Dev-Thread-Gespräche werden flach dargestellt; dies ist akzeptiert, da es keine Produktionsbenutzer gibt. Sendeweg (`matrixClientService.sendMessage`) und Leseweg (Präfixauswertung → `event.getThread()`) werden tatsächlich neu aufgebaut statt schrittweise angepasst.
