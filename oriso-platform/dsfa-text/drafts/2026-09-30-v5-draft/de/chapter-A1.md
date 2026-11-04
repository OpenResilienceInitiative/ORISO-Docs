Anlage 1

## Anlage 1 — Risiken und Maßnahmen (Entwurf)

Technischer Teil — von ORISO gepflegt —

Risiken und Maßnahmen tragen stabile Kennungen (einmal vergeben, nie umnummeriert) und sind
        dadurch in Vorgängen und Audits präzise referenzierbar. Vollständige Matrix: Anlage 1 —
        Risikoanalyse (in Vorbereitung). Auszug des Ist-Stands:

Tabelle horizontal scrollbar

| ID | Risiko | Bewertung | Maßnahmen (Ist-Zustand) | Restrisiko |
| --- | --- | --- | --- | --- |
| R-001 | Unbefugte Kenntnisnahme von Beratungsinhalten durch Betreiber oder Dienstleister | hoch | M-001 Megolm-E2EE dauerhaft aktiv, kein unverschlüsselter Sendepfad · M-002 extern auditierte Implementierung (vodozemac) · M-003 AES-256-Dateiverschlüsselung ohne Metadaten-Upload · M-004 Föderation deaktiviert | gering — administrative Serverfunktionen bestehen; Vertraulichkeitsgrenze innerhalb der Beratungsstelle ist Zugriffskontrolle (Abschnitt 5.3/5.7) |
| R-002 | Übertragung von Schadsoftware oder rechtswidrigen Bildinhalten über Medien-Uploads | mittel | M-005 Blur + Click-to-Reveal im anonymen Live-Chat (fail-closed-Verdikt, Übergangsmaßnahme) · M-006 Formatvalidierung + Größenlimit redaktioneller Uploads · M-007 fail-closed-Scan-Proxy als beschlossene Zielarchitektur (ADR-019, nicht produktiv) | mittel — bis zur Scanner-Inbetriebnahme |
| R-003 | Kontoübernahme durch kompromittierte Anmeldedaten | mittel | M-008 2FA (Authenticator-App/E-Mail-Einmalcode); Einrichtung für Beratende im Einladungsprozess, Befreiung nur dokumentiert · M-009 zentrale, gehashte Passwortspeicherung (Keycloak) | gering |
| R-004 | Re-Identifizierung Einzelner aus statistischen Auswertungen | mittel | M-010 ausschließlich Aggregatzahlen mit Kleinstzellen-Unterdrückung (min. 5, fail-closed) · M-011 HMAC-SHA256-Pseudonymisierung der Beraterstatistik | gering |
| R-005 | Verlust des Schlüsselmaterials der Nutzer:innen (Unlesbarkeit der eigenen Historie) | mittel | M-012 serverseitiges, verschlüsseltes Schlüssel-Backup; Wiederherstellungsgeheimnis verbleibt beim Nutzer | gering |
