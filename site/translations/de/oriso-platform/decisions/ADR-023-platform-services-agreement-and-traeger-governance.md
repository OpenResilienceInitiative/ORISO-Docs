# ADR-023: Plattformvertrag, aktuell gehaltene Vorlagen und verhältnismäßige Eskalation

- **Status:** Angenommen — Frank, 2026-08-16 (grill-with-docs-Sitzung)
- **Datum:** 2026-08-16
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** `ADR-021` (Hierarchie/Versionierung), `ADR-022` (Einwilligung Ratsuchender), AVV-/DPA-Epic aus `ADR-003`-Zeit, `tenant_dpa_version`, `DpaLegalForm`; `PLAN-dsfa-living-document-2026-08-13.md` Abschnitt 7.6 (verhältnismäßige Eskalation); `CONTEXT-legal-documents.md`
- **Umfang:** Beziehung **Plattformbetreiber/Träger**, ohne Ratsuchende.

---

## Kontext

Admin zeigt AVV wie den ganzen Vertrag, obwohl nur Anlage. Daneben Leistungsbedingungen, technische/organisatorische Maßnahmen, Unterauftragsverarbeiterliste und weitere Verweise wie DSFA. „AVV unterzeichnen“ bedeutet tatsächlich Abschluss eines umfassenderen Vertrags. Modul benennt und zeigt dies unzureichend.

ADR-021 führt Vorlage für Träger-Einwilligung ein. Ohne gepflegte Herkunftsverbindung nur Kopie: zentrale Rechtskorrekturen erreichen alte Kopien nicht.

Bei verpflichtender Übernahme wird Ablehnung zur Produktentscheidung mit Sicherheitsfolgen. U25-Suizidprävention: Durchsetzung darf Beratung nicht beenden und damit Geschützte gefährden.

## Entscheidung

1. **Vertrag als solcher benennen, AVV als Anlage.**

   | | Deutsch für Oberfläche/Träger | Englisch für Code/ADRs/GitHub |
   |---|---|---|
   | Ganzes | **Plattformvertrag** | **Platform Services Agreement** |
   | Anlage 1 | Auftragsverarbeitungsvertrag (AVV), Art. 28 DSGVO | Data Processing Agreement (DPA) |
   | Anlage 2 | Technische und organisatorische Maßnahmen (TOM), Art. 32 | Technical and Organisational Measures |
   | Anlage 3 | Unterauftragsverarbeiter | Subprocessor list |
   | Anlage 4 | Leistungsbeschreibung / Nutzungsbedingungen | Service description / terms of use |
   | Daneben | Verweise auf DSFA/Plattformdatenschutzerklärung | References — verlinkt, nicht mitunterzeichnet |

   Handlung **Vertragsabschluss**, Nachweis **Unterzeichnung** mit Datum, Person, Rolle. „Vereinbarung“ vermeiden: Klick schließt bindenden Vertrag. Englisch „Agreement“ als üblicher bindender Begriff behalten. Entities `platform_agreement`, `agreement_annex`, `agreement_signature`.

   Bestehendes Modul umbenennen/neu einordnen, Unterzeichnende und Dokumente unverändert. AVV-Tickets **umbenennen**, nicht ersetzen.

2. **Vorlage bleibt mit Herkunft verbunden.**
   - Trägertext speichert **Vorlagenversion** der Ableitung; ADR-021 Punkt 3 liefert Versionen bereits.
   - Neue Plattformvorlage macht ältere Referenzen automatisch veraltet, einfacher Nummernvergleich statt Benachrichtigungssystem.
   - Admin zeigt Hinweis mit **nebeneinanderliegendem Vergleich**. Übernahme: Träger veröffentlicht eigene neue Version; Ablehnung löscht Hinweis.
   - Vorhandener geteilter Button „neu aus Vorlage“ im PlaceholderTemplate-Modul ist genau dieser Mechanismus.
3. **Vorlage und geltendes Plattformdokument getrennt.** Vorlage ohne Rechtswirkung; Hauptmandanten-Datenschutzerklärung gilt ohne aufgelösten Träger. Vorschlagsänderung darf nicht geltendes Recht für unzugeordnete Besucher setzen. Auch ADR-021 Punkt 8 als Datenmodellgrenze.
4. **Änderung empfohlen oder verpflichtend kennzeichnen.** Nur verpflichtend mit Frist. Kosmetik folgenlos ignorierbar, gesetzlich erzwungene Änderung nicht.
5. **Eskalation stufenweise mit fester Grenze.** Nicht rechtzeitig übernommen: Hinweis → Warnbanner → **neue Registrierungen dieses Trägers aussetzen**.

   **Unverhandelbar:** Laufende Beratung, Anmeldung bestehender Ratsuchender und bestehende Verläufe **immer erhalten**. Datenschutz darf Schutzinteresse nicht gefährden. Vorbild AVV-Schranke, die nur neue Beratungsstellen blockiert und sonst warnt. Plattformweiter Grundsatz zu DSGVO Art. 35(7)(d), Schutzmaßnahmen für Betroffene; dokumentiert in DSFA-Plan 7.6.

## Folgen

**Positiv:** Träger sieht tatsächlichen Vertrag. Zentrale Korrekturen erreichen alle ohne Push-Kanal. Gesetzlich nötige Durchsetzung ohne Macht, Beratung abzuschneiden. Benennung stellt AVV nicht mehr als gesamte Beziehung dar.

**Negativ / Aufwand:** Admin wächst von Einzeldokument zu Vertrag mit Anlagen. Herkunftsreferenz, Veraltungsprüfung, Vergleich bauen; neue Frist-/Eskalationslogik. Oberfläche, ADR-Titel, Entity-Namen und Tickets konsistent gemeinsam umbenennen.

## Erwogene Alternativen

- **„Vereinbarung“ behalten.** Zu schwach für bindenden Klickabschluss, verdeckt Anlagencharakter der AVV.
- **Vorlagenkopie ohne Verbindung.** Rechtskorrekturen erreichen Träger nicht.
- **Vorlage maßgeblich, Träger ergänzt nur.** Widerspricht ADR-021 Punkt 2, ein Satz/ein Kästchen.
- **Nur warnen.** Gesetzliche Verpflichtung unbegrenzt aussitzbar.
- **Automatisch nach Frist übernehmen.** Träger veröffentlicht ungelesenen Text.
- **Anmeldung sperren/Sitzungen beenden.** Ausdrücklich verworfen, Punkt 5.

---

## Ergänzung — 2026-10-06: AVV-Erneuerung und neue Beratung

**Entscheidungsgrundlage:** Die bestätigten Produktentscheidungen in
[der Spezifikation zur AVV-Erneuerung](https://github.com/OpenResilienceInitiative/ORISO-TenantService/issues/294),
insbesondere deren **Further Notes**, präzisieren die Folge einer AVV-Erneuerung
in Entscheidung 5. Die oben angenommenen Entscheidungen bleiben als historische
Aufzeichnung erhalten. Diese Ergänzung hält die bestätigte Richtlinie fest; sie
belegt keine abgeschlossene Implementierung, Bereitstellung oder rechtliche Freigabe.

Ein bestehender Träger braucht Zeit, um eine neu veröffentlichte maßgebliche AVV zu
prüfen. Seine frühere Unterschrift bleibt erhalten und wird als veraltet angezeigt.
Nach Ablauf der Prüffrist darf er keine neue Beratung beginnen, bis er die aktuelle
maßgebliche Version bestätigt hat. Bereits begonnene Beratung wird fortgesetzt.

### Bestätigte Präzisierung

1. **Für jede maßgebliche Veröffentlichung werden Datum und Uhrzeit in der Zukunft gewählt.**
   Der Dialog enthält keine vorausgewählte Dauer und zeigt die Frist vor der Bestätigung.
   Abbrechen oder eine ungültige Eingabe müssen die Veröffentlichung unverändert lassen.
   Veröffentlichung und Frist werden gemeinsam gespeichert und gelten für alle Empfänger,
   für die diese Version maßgeblich ist. Die Frist wird sowohl bei der ersten
   Veröffentlichung als auch bei einer Erneuerung gewählt. Die Gültigkeitsdauer eines
   externen Unterzeichnungslinks ist davon getrennt. Eine künftige Frist erlaubt einer
   erstmals ununterzeichneten Organisation nicht, ihre bestehende Onboarding-Richtlinie
   zu umgehen.

2. **Die Übergangsfrist erhält erlaubte Arbeit; ihr Ablauf verhindert neue Beratung.**
   Ein bestehender Träger, der von einer AVV-Erneuerung betroffen ist, kann während der
   Übergangsfrist seine ansonsten erlaubte Arbeit fortsetzen. Wird die Frist ohne aktuelle
   Bestätigung erreicht, müssen neue Einzelberatung, erste Anfragen, die Annahme von
   Anfragen und neue Gruppenteilnahme dieselbe Einschränkung anwenden. Eine Registrierung
   vor der Veröffentlichung oder eine lediglich gespeicherte Beratung bzw. Zuordnung
   belegt keine begonnene Beratung. Beginn und Fortsetzung müssen anhand des fachlichen
   Beratungszustands oder anhand von Teilnahmenachweisen bestimmt werden.

   Damit wird die ältere Eskalation über **Neuregistrierungen** in Entscheidung 5 für
   AVV-Erneuerungen präzisiert. Die getrennte Richtlinie zur Übernahme verpflichtender
   Vorlagen wird dadurch weder durch eine automatisch übernommene AVV noch durch einen
   bearbeitbaren Entwurfsvergleich ersetzt.

3. **Begonnene Beratung, bestehende Anmeldung und Verlauf bleiben verfügbar.**
   Bestehende Teilnehmer behalten Lesezugriff, Nachrichten und die Rückkehr zu ihrer
   begonnenen Beratung unter den normalen Regeln für Authentifizierung, Mandanten und
   Mitgliedschaft. Fortsetzung gewährt weder ersten Zugang noch hebt sie diese Regeln
   auf. Interne Chats zwischen Kollegen sind von dieser AVV-Beratungssperre ausgenommen.
   Die unten aufgeführten Grenzen bei Folgeterminen und besonderen Rückkehrfällen
   werden durch diese Ausnahme nicht entschieden.

4. **Die Wiederfreigabe bestätigt genau die maßgebliche Version des betroffenen Trägers.**
   TenantService bleibt die maßgebliche Instanz für die gültige Version und die
   Gültigkeit der Unterschrift. Der bestehende Vorrang eigener bzw. älterer AVV und
   historische Unterschriften bleiben erhalten; eine andere Betreiberveröffentlichung
   darf eine korrekt maßgebliche eigene AVV nicht ersetzen. Die bestehenden Wege zur
   Bestätigung sowie zur autorisierten Weiterleitung und Unterzeichnung bleiben
   erreichbar. Die Bestätigung der aktuellen Version erlaubt neue Beratung wieder,
   ohne Kontoreparatur oder Dienstneustart. Eine alte Unterzeichnungsseite, eine
   gleichzeitig neuere Veröffentlichung oder die Unterschrift bzw. Frist eines anderen
   Trägers können diese Anforderung nicht erfüllen.

5. **Eine nicht erreichbare Prüfung ist ein Dienstfehler, keine bestätigte rechtliche Ablehnung.**
   Geschützte neue Arbeit wird sicher abgelehnt, wenn die Prüfung nicht abgeschlossen
   werden kann. Dafür gelten die bestehende Antwort für Fehler eines abhängigen Dienstes
   und bereinigte Diagnosen. Eine bestätigte Ablehnung nach der Richtlinie verwendet
   die bestehende Berechtigungsantwort. Diese Fehler dürfen in der Erklärung für den
   Benutzer nicht verwechselt werden.

### Offene Grenzen und Abnahme

Es ist **nicht** entschieden, ob die Teilnahme an einem früheren Termin einer
wiederkehrenden Gruppe nach Fristablauf die Fortsetzung bei einem späteren Termin
erlaubt oder verweigert. Die Einordnung dieses Folgetermins bleibt **unentschieden**.
Die Rückkehr nach ausdrücklichem Verlassen und die direkte Annahme einer Matrix-Einladung
bleiben ungeprüfte Grenzen. Diese Ergänzung behauptet für beide weder eine abgeschlossene
Implementierung noch eine Abnahme.

Die Umsetzung verwendet die folgenden bestehenden Issues:

| Issue | Umfang |
| --- | --- |
| [TenantService 294](https://github.com/OpenResilienceInitiative/ORISO-TenantService/issues/294) | Erneuerungsrichtlinie und repositoryübergreifende Abnahme |
| [TenantService 295](https://github.com/OpenResilienceInitiative/ORISO-TenantService/issues/295) | Veröffentlichung, Frist und Empfängerbestätigung |
| [UserService 1322](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1322) | Neue Einzelberatung und erhaltene Fortsetzung |
| [UserService 1323](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1323) | Neue Gruppenteilnahme, Rückkehr und offene Folgetermine |

Die öffentlichen AVV-/Beratungs-APIs und Komponententests sind bestätigte
Abnahmegrenzen. Quellcode, lokale Tests, CI, menschliche Prüfung, Merge, Bereitstellung
und die Dev-Abnahme mit direkten Rollen bleiben getrennte Nachweise. Die Dev-Abnahme
muss direkte Träger- und Beratungsstellenadministratoren, Berater und Ratsuchende
einbeziehen; der Fernzugriff eines Plattformadministrators allein reicht nicht aus.
Die Issues enthalten die aktuellen Umsetzungsnachweise, nicht dieser datierte
Richtlinieneintrag.
