# ADR-006: `conversation_type` als gespeicherte Beratungsform, zuerst über zentralen Selektor eingeführt

- **Status:** Angenommen — 2026-06-28 (grill-with-docs-Sitzung). Entscheidung getroffen, Umsetzung eingeplant.
- **Datum:** 2026-06-28
- **Entscheider:** Frank (Produkt/Frontend) und KI (Backend)
- **Verwandt:** `CONTEXT-conversation-types.md` (verbindliches Glossar), `ADR-001-counselling-modalities-as-modules.md` (Registrierungssicht derselben Achsen), Chattransport (`ADR-004`/`ADR-005`), Memories `oriso-dev-cluster-liquibase-disabled-configmap`, `oriso-tenantservice-liquibase-disabled`, `oriso-predev-deploy-and-ci-model`. `ADR-009` vom 2026-07-01 ergänzt bearbeitbare/übersetzbare **Anzeigebezeichnungen** der vier Werte; Enum und Codepfade bleiben unverändert.

## Ersetzender Einführungshinweis — 2026-07-11

- Frontend PR #340 hat `getModality()` gemergt; Produktionskomponenten verwenden den Selektor noch nicht. Umstellung der Aufrufstellen bleibt in Frontend #409 offen.
- UserService speichert `conversation_type` noch nicht. #382 verantwortet Enum, Liquibase-Migration/Nachbefüllung, Kennzeichnung bei Erstellung und DTO-Abbildung.
- Die Annahme deaktivierten Liquibase unten ist historisch. Aktuelles PreDev zeigt bei allen vier Backend-Deployments `SPRING_LIQUIBASE_ENABLED=true`; UserService, TenantService und AgencyService protokollieren erfolgreiche Changelog-Läufe. ADR-006 verwendet deshalb ein beim Start registriertes UserService-Changeset statt manuellem `ALTER` je Umgebung.
- Sicherheitsregel erhalten: Schemamigration muss vor Hibernate-Prüfung neuer Entity-Felder fertig sein. PreDev muss Changeset-Ausführung und Pod-Bereitschaft belegen.
- Frontend #410 ist aktueller Epic; #408 echte Browserprüfung aller vier Formen. Erreichbare E-Mail liegt außerhalb dieses ADR.

---

## Kontext

Die Plattform hat vier **Beratungsformen**: Beratungsstellenberatung, Live-Chat, interner Gruppenchat und Selbsthilfegruppe. **Kein Feld speichert die Form eines Gesprächs.** Sie wird aus verteilten Merkmalen abgeleitet: `registrationType`, `postcode`, Präfix `Anonymous-`, `teamSession`, `repetitive`, abweichender `consultant`, vorhandenes `matrixRoomId`. Dies geschieht an etwa 90 Frontend-Stellen und in Backend-Abfragen. Das ist die geprüfte Ursache wiederkehrender unscharfer Chatzuordnung nach Live-Chat-Änderungen. Beratungsform, Lebenszyklus und Struktur werden vermischt. Etwa gibt `getSessionType()` `enquiry | archived | group | session` zurück und vermischt drei Achsen.

Prüfung mit fünf Agenten am 2026-06-28 ergab:

1. **Entities sind nicht sauber getrennt.** Beratungsstellenberatung und Live-Chat sind `Session`-Zeilen, Selbsthilfe eine `Chat`-Zeile. **Interner Gruppenchat ist doppelt gespeichert:** `createSimplifiedGroupChat` schreibt `Session` mit `teamSession=true`, `registrationType=REGISTERED` und eine `Chat`-Zeile. Dessen `Session`-Struktur unterscheidet sich **nur durch `teamSession`**. Deshalb muss `teamSession` vor `registrationType` ausgewertet und die Spalte sowohl in `session` als auch `chat` angelegt werden.
2. **Einfach die Spalte ergänzen verursacht den typischen ORISO-Startabsturz, schlimmer als HTTP 500.** ConfigMap `oriso-userservice-config` erzwingt auf Dev `SPRING_LIQUIBASE_ENABLED=false` und überschreibt `application-dev.properties`. Überall gilt `spring.jpa.hibernate.ddl-auto=validate`. Eine `@Column` ohne Datenbankspalte lässt `SessionFactory` scheitern: **Pod beim Start in CrashLoopBackOff**, der ganze UserService startet nicht. Dasselbe gilt für Pre-Dev/Staging/Produktion mit Prüfung und deaktiviertem Liquibase.

## Entscheidung

1. **Ausdrückliche Beratungsform `conversationType` als einzige maßgebliche Quelle** mit `AGENCY_COUNSELLING · LIVE_CHAT · INTERNAL_GROUP · SELF_HELP`. **Beratungsform und Lebenszyklusstatus sind getrennte Felder und dürfen nie wieder zu einem Typ verschmolzen werden.**
2. **Speichern** als nullable `conversation_type` in `session` und `chat`; Backend wird endgültige Quelle. **Zuerst Selektor einführen**, um halbe Migration und Startabsturz zu vermeiden:
   - **Schritt 1 — Frontend-Lesevertrag zuerst.** Ein reiner Selektor `getModality(conversation): Modality` entscheidet *allein*. Er bevorzugt `dto.conversationType` und nutzt bei null die bestehende Heuristik als **Rückfall**. Etwa 90 Stellen werden sofort darauf umgestellt: ohne Backend-Abhängigkeit, mit vitest geprüft. Geprüfte Reihenfolge: `chat` vorhanden → (`repetitive`+WEEKLY ? `SELF_HELP` : `INTERNAL_GROUP`); sonst `teamSession` → `INTERNAL_GROUP`; sonst `registrationType===ANONYMOUS` → `LIVE_CHAT`; sonst `AGENCY_COUNSELLING`.
   - **Schritt 2 — Spalte, Liquibase vor Hibernate.** Nullable `@Column` und ein registriertes UserService-Changeset für `session` und `chat`, mit deterministischer Altdatenbefüllung und idempotenten Bedingungen. Liquibase beim Start ist jetzt maßgebliche Schemaquelle. Ausführung vor Annahme der Hibernate-Bereitschaft prüfen. Manuelles ALTER nur im Notfall.
   - **Schritt 3 — Kennzeichnung bei Erstellung.** Standard `conversationType` in `SessionService.saveSession` und `ChatService.saveChat`; ausdrücklich in `createSimplifiedGroupChat` für beide Zeilen, `AnonymousConversationCreatorService` (`LIVE_CHAT`) sowie leicht übersehenen Wegen `AskerImportService` und `ChatReCreator` für Übernahme bestehender Werte.
3. **Nachbefüllung einfach und verzichtbar.** Ohne Produktionsbenutzer einmaliges `UPDATE` aus Heuristik oder Löschen/Neuanlegen. Heuristik in `getModality()` bleibt nur null-Rückfall und entfällt, sobald überall gefüllte Spalten bestätigt sind.

## Erwogene Optionen

- **Backend-Feld direkt sofort bereitstellen, Franks erste Idee.** Sauberstes Ziel ohne zwei Wahrheiten. **Als Reihenfolge verworfen, als Ziel behalten:** Gemappte Spalte vor Schema bei Prüfung/deaktiviertem Liquibase verursacht CrashLoopBackOff. Selektor zuerst erreicht dasselbe sicher.
- **Nur Frontend-Selektor, nie Spalte.** Günstig ohne Migration, aber **verworfen**: Heuristik bleibt dauerhaft maßgeblich; Backend-Warteschlange kann nicht sauber filtern; Vermischung über `postcode='00000'` bleibt serverseitig.
- **Weiter je Aufruf ableiten.** **Verworfen:** Bestehende Ursache wiederkehrender Unschärfe.

## Folgen

**Positiv:** Eine Quelle für Beratungsform; etwa 90 Heuristikstellen sofort eine getestete Funktion; Status und Form kollidieren nicht. Neue Formen wie Selbsthilfe oder später Video werden Enum-Ergänzungen. Live-Chat-Warteschlange filtert über `conversation_type` statt `postcode='00000'`.

**Negativ / Aufwand:** Laufende Liquibase-Aktivierung weicht von unfertigen Helm-Standards #10/#11 ab; Migrationslogs und Rechte bei Einführung prüfen. `INTERNAL_GROUP` auf zwei Zeilen kennzeichnen. Mehrdeutige historische `SELF_HELP`-Zeilen nullable lassen oder ausdrücklich prüfen, nicht raten.

## Einführungsanleitung für Entwickler

1. Selektor `getModality()` und vitest mergen; bestätigen, dass etwa 90 Stellen nur diesen lesen.
2. Nullable `@Column`, registriertes Changeset und Befüllung ergänzen; leeres/aktuelles MariaDB-Schema lokal testen.
3. Nach `pre-dev` mergen, reguläres Image bereitstellen und Liquibase-Ausführung vor Hibernate-Prüfung und erfolgreicher Zustandsprüfung belegen.
4. Erstellung aller vier Formen auf PreDev durchgängig prüfen.
5. Nach je einer neuen Form keine `NULL`-Werte in `conversation_type` bestätigen; Heuristik entfernen.

## Stand und Fortschritt (2026-06-30)

- **Schritt 1 lokal gebaut, ergänzend und erfolgreich geprüft:** Reiner Selektor `getModality(item): Modality` und Enum `Modality` (`AGENCY_COUNSELLING · LIVE_CHAT · INTERNAL_GROUP · SELF_HELP`) unter `src/components/session/getModality.ts`, mit geprüfter Rückfallfolge und Vorrang von `conversationType`, acht vitest-Fälle erst fehlgeschlagen, dann erfolgreich, `tsc --noEmit` sauber. Worktree `feature/adr006-getmodality-selector` aus `origin/dev`, **nicht gepusht**.
- Umstellung der etwa 90 Stellen **bewusst verschoben**, wegen PRs #126/#275 auf betroffenen Dateien. Nur Selektor und Tests geliefert; Schritte 2–3 mit Spalte `conversation_type` und manuellem ALTER vor Deployment bleiben Backend-Arbeit nach Überschneidungen.

## Ergänzung 2026-09-04: `teamSession` ist Sichtbarkeitsflag, keine Beratungsform

Ausgelöst durch UserService#1111 / Frontend#1299: Berater einer **Team**-Beratungsstelle nimmt normalen 1:1-Fall an; Server speichert `INTERNAL_GROUP`. Frontend zeigt „Interna“, rendert strukturierte Erstantwort als rohes JSON; Fallübergabe behandelt ihn als Teamsitzung.

**Fehler dieses ADR:** Oben gilt `teamSession` als ausreichender Gruppenchatnachweis. Rückfall in Schritt 1 sagt `teamSession` → `INTERNAL_GROUP`; Schritt 3 kennzeichnet so bei `SessionService.saveSession`. Kontext begründete dies mit dem Unterschied der `Session` **nur `teamSession`**. Beobachtung richtig, Schluss falsch: Flag hat zwei unabhängige Bedeutungen:

1. **Interner Gruppenchat**, erzeugt durch `CreateChatFacade.createSimplifiedGroupChat`, mit `Session`- und `Chat`-Zeile.
2. **1:1-Fall einer Team-Beratungsstelle:** gewöhnliche Beratung, für alle Berater dieser Stelle sichtbar, kein Gruppenchat.

Nur Ersteres ist Beratungsform, Zweiteres Sichtbarkeit.

**Entscheidung:** `teamSession` reicht niemals zur Ableitung einer Beratungsform.

1. **`SessionService.saveSession` leitet kein `INTERNAL_GROUP` mehr ab.** Standard nur aus Registrierung: `ANONYMOUS → LIVE_CHAT`, sonst `AGENCY_COUNSELLING`. Sicher, weil nur `CreateChatFacade` Sitzungen `INTERNAL_GROUP`/`SELF_HELP` produziert und ausdrücklich vor Speichern kennzeichnet. Alles im Standardpfad ist 1:1.
2. **Liquibase-Changeset `0091` kennzeichnet falsch beschriftete Zeilen neu**, wie der neue Standard in `saveSession`, nach Registrierungstyp. Echte Gruppenchats werden anhand exklusiver Gruppenchatmerkmale ausgeschlossen. Eines von drei Signalen reicht: `group_chat_participant`-Zeile für Sitzung (historische Spalte `chat_id` speichert **Sitzungs**-ID, siehe Entity-Javadoc); `chat`-Zeile mit gleicher Matrix-Raum-ID; Mandantensystembenutzer `group-chat-system[-<tenant>]` als Sitzungsbenutzer. Alle drei Ausschlüsse sind **sicher**: Mehrdeutige Zeile behält alten Wert, statt echten Gruppenchat umzubenennen. `SELF_HELP` bleibt unberührt. Nur Datenmigration, idempotent, Rücknahme bewusst ohne Aktion: Voriger Wert `INTERNAL_GROUP` war der Fehler, nichts Korrektes wiederherzustellen.

**Folge für Selektor:** `getModality()` bevorzugt Backend-`conversationType` und ist bei gekennzeichneten Zeilen korrekt. Null-Rückfall bleibt falsch: enthält weiterhin `teamSession → INTERNAL_GROUP` in `getModality.ts`; `getModality.test.ts` legt dies als beabsichtigt fest. Nach `0091` sollte Rückfall bei bestehenden Zeilen unerreichbar sein, doch falsche Regel bleibt in Code und Test.

**Noch offen:** `teamSession`-Zweig in `getModality()` und zugehörigen Test korrigieren oder Heuristik ganz entfernen, sobald `conversation_type` überall nicht-null bestätigt ist, wie Schritt 5 bereits verlangt.
