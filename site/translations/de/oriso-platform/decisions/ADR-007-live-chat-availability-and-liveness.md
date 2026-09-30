# ADR-007: Live-Chat-Aktivität — die Anzeige liest die Backend-Verfügbarkeit, statt sie zu spiegeln oder abzuleiten

- **Status:** Angenommen — 2026-06-28 (grill-with-docs-Sitzung). Ursachen geprüft; Korrektur eingeplant.
- **Datum:** 2026-06-28
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** `CONTEXT-conversation-types.md` (Begriffe Verfügbarkeit / Warteraum), `ADR-005-matrix-federation-off-dns-server-name` (betrifft die Abwägung zur Badge-Steuerung), `ADR-006` (Feld für die Beratungsform). Befunde aus der Prüfung der Live-Anzeige vom 2026-06-28.

---

## Kontext

Die wiederkehrende Beschwerde „der Live-Chat zeigt Personen als *live*, obwohl niemand verfügbar ist“ ist entgegen dem ersten Eindruck **keine Architekturlücke**. Die Prüfung zeigte: Das Backend-Modell **Availability** ist tragfähig und implementiert bereits genau die Produktabsicht — ein ausdrücklicher Schalter zum Verfügbarwerden, automatische Abschaltung bei Abmeldung und zeitlich begrenzte Gültigkeit:

- `ConsultantActivityRegistry` im Arbeitsspeicher enthält aktuell verfügbare Berater. `CONSULTANT_AVAILABILITY_ACTIVE_WINDOW_MS = 120000` bedeutet eine TTL von 120 Sekunden. `ConsultantActivityInterceptor.refreshIfAvailable` erneuert diese durch jeden authentifizierten Berateraufruf. Die Abmeldung ruft `apiSetLiveChatAvailability(false)` auf.
- Das ist **bewusst von Matrix-/RC-Präsenz getrennt**, weil Matrix-Präsenz für Live-Chat unzuverlässig ist (in `TopicConsultantRoutingService` dokumentiert).

Der Fehler: Die **sichtbare** Live-Anzeige hat **drei unabhängige falsche Quellen**, die alle das maßgebliche Modell nicht lesen:

1. **Grüne Navigationsanzeige:** vollständig von einem `localStorage`-Flag gesteuert (`caritas_liveChatAvailability`, `liveChatToggle.ts`). Dieser *nur geschriebene Spiegel* bestätigt Frontend→Backend wiederholt, liest aber nie Backend→Frontend. Wenn die TTL von 120 Sekunden den Berater entfernt, bleibt die Anzeige unbegrenzt grün (`NavigationBar.tsx`).
2. **„Live“-Badge je Sitzung:** aus dem Chat**typ** abgeleitet (`isAnonymousChat ? 'live' : 'nearby'`, `SessionHeaderComponent.tsx:742`). Daher erscheint *jede* Live-Chat-Sitzung unabhängig von Präsenz als „live“.
3. **Gespeicherter `Session.status = ACTIVE`:** wird beim Verlassen eines Live-Chats nie zurückgesetzt. Der Bereinigungsdienst `DeactivateAnonymousUserService` prüft erst nach sechs Stunden (`deactivateworkflow.periodMinutes=360`). Eine tote Sitzung erscheint deshalb stundenlang aktiv.

Zusätzlich verwendet die Live-Chat-Warteschlange `ORDER BY s.createDate DESC` in drei `SessionRepository`-Abfragen (Zeilen 211/229/248), also neueste zuerst. Die Position „Personen vor mir“ für Ratsuchende zählt hingegen älteste zuerst. Reihenfolge und Position widersprechen sich: ein FIFO-Fehler.

## Entscheidung

1. **Verfügbarkeit bleibt im Backend maßgeblich; die Anzeige LIEST sie statt sie zu spiegeln.** `GET /conversations/consultants/availability` für den eigenen Status ergänzen; gibt `{available}` aus `ConsultantActivityRegistry.filterActive()` zurück. Die Navigation fragt dies regelmäßig ab, mit einem Intervall unter der TTL von 120 Sekunden, etwa 30–45 Sekunden, und steuert damit die Anzeige. Der `localStorage`-Speicher erhält eine Ablaufzeit und wird bei nicht verfügbarer oder leerer Antwort als AUS behandelt. Eine erneute Frontend→Backend-Bestätigung darf einen Berater nicht still ohne dessen Absicht verfügbar machen.
2. **Das Badge je Sitzung hängt nicht mehr am Chattyp.** „Live“ wird durch Availability und den aktiven Sitzungszustand gesteuert, niemals bei `DONE` angezeigt und **nicht** aus `isAnonymousChat` abgeleitet.
3. **Verlassene Live-Sitzungen werden zeitnah und speziell für Live-Chat beendet.** Die zugehörige Sitzung `IN_PROGRESS` wird bei Abmeldung oder Ausschalten durch den Berater auf `DONE` gesetzt, unter Wiederverwendung von `DeactivateSessionActionCommand`. Zusätzlich gilt ein Live-Chat-Timeout in Minuten, getrennt vom Sechs-Stunden-Fenster zur Deaktivierung anonymer Benutzer.
4. **Die Warteschlange wird wirklich FIFO.** Die drei Stellen `ORDER BY createDate DESC` auf `ASC` ändern, damit Listenreihenfolge und Positionszähler übereinstimmen.
5. **Warteraum getrennt halten.** Ratsuchende sehen weiterhin ausschließlich ihre FIFO-Position, nie die Beraterverfügbarkeit (siehe CONTEXT). Dafür ist keine Schemaänderung nötig; das Risiko des deaktivierten Liquibase wird nicht berührt.

## Erwogene Optionen (Badge-Steuerung)

- **Badge je Sitzung anhand der RC-/Matrix-Echtzeitpräsenz steuern.** Am unmittelbarsten, koppelt die Korrektur aber an die unzuverlässige Präsenzschicht und den Matrix-Neuaufbau aus ADR-005. **Vorerst verworfen.**
- **Anhand Availability / aktivem Sitzungszustand steuern (gewählt).** Unabhängig vom Transport, sofort auslieferbar und konsistent mit der bewussten Trennung von Matrix-/RC-Präsenz.

## Folgen

**Positiv:** Grüne Anzeige und Sitzungsbadge bilden endlich die Realität ab. Die gesamte Korrektur ist unabhängig vom Matrix-SDK-Neuaufbau auslieferbar. FIFO-Reihenfolge und Position stimmen überein. **Negativ / Aufwand:** Regelmäßige Abfragen erzeugen geringen, durch die TTL begrenzten Datenverkehr. Nach einem Backend-Neustart ist die Registrierung im Arbeitsspeicher leer. Alle Berater erscheinen daher nicht verfügbar, bis sie den Schalter erneut setzen. Das ist das *richtige* Verhalten und darf nicht durch automatische Bestätigung des veralteten Frontend-Flags „korrigiert“ werden.

## Geklärte Produktfragen (Frank, 2026-06-28)

1. **Zeit bis DONE** bei einer verlassenen Live-Sitzung `IN_PROGRESS` → **10 Minuten**, als eigenes Live-Chat-Fenster getrennt von der Sechs-Stunden-Bereinigung anonymer Benutzer.
2. **Inaktiv, aber eingeschaltet** → vorhandene **automatische Abmeldung nach etwa 2,5 Stunden Inaktivität** behalten. Das Signal je Anfrage hält einen arbeitenden Berater verfügbar; die Verfügbarkeitsabfrage soll ihn nicht selbst ausschalten. **Neue Funktion ausgelagert**, als separate Aufgabe/kleine Spezifikation: **Warnung etwa fünf Minuten vor** der automatischen Abmeldung als Benachrichtigung, optional mit eigenem Abmeldeton und **Verlängerungsbuttons** (+1 Stunde / +3 Stunden / maximal 6 Stunden). Zuerst im bestehenden Abmeldecode verorten, dann bauen oder mindestens dokumentieren.
3. **Badge-Steuerung** → **Option (b):** Das „Live“-Badge je Sitzung anhand Availability / aktivem Sitzungszustand steuern, nicht anhand echter RC-/Matrix-Präsenz. So bleibt die Korrektur unabhängig vom Transport und ADR-005.
4. **Nach Backend-Neustart** → **Berater müssen den Schalter erneut setzen.** Verfügbarkeit nicht automatisch aus dem veralteten Frontend-Flag wiederherstellen, sonst kehrt die festhängende Live-Anzeige zurück.

> Der genaue automatische Abmeldemechanismus (etwa 2,5 Stunden) wird derzeit im Code gesucht, damit Warnung und Verlängerung an die tatsächliche Implementierung angebunden werden.

## Stand und Fortschritt (2026-06-30)

- **Teil 1 von 4 lokal gebaut, ergänzend und erfolgreich getestet:** Der lesende Selbststatus `GET /conversations/consultants/availability` mit Antwort `{available}` aus `ConsultantActivityRegistry.filterActive()` ist auf dem vorhandenen `ConsultantLiveAvailabilityController` implementiert. **Keine Änderung an SecurityConfig:** Die Regel `/conversations/consultants/**` deckt GET bereits ab. Drei Fälle im `WebMvcTest` (aktiv / inaktiv / kein Berater), zuerst fehlschlagend, dann erfolgreich. Worktree `feature/adr007-consultant-availability-read` aus `origin/dev`, **nicht gepusht**.
- **Zurückgestellt wegen offener PRs, eingeplant:** Badge-Steuerung je Sitzung (`SessionHeaderComponent`, konfliktfrei, als Nächstes), lesende Navigationsanzeige (`NavigationBar`, wartet auf #126), FIFO `ASC` und Live-Chat-Beendigung nach zehn Minuten (`SessionRepository`, wartet auf Fallübergabe #186). Nach Merge/Rebase dieser Änderungen bauen.
