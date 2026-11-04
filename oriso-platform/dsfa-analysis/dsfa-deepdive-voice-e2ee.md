# DSFA-Tiefenbohrung 4: Sprachnachrichten — E2EE-Nachweis

**Franks Frage:** „Sprachnachrichten sind optional, aber wenn an, dann auch E2EE verschlüsselt, richtig?"
**Kurzantwort: Ja — mit zwei präzisierenden Fußnoten** (Dauer steckt im Dateinamen *innerhalb* des Ciphertexts → unkritisch; Media-Repo liefert Ciphertext derzeit unauthentifiziert aus und hat keine Retention → Formulierungssache bzw. Härtungspunkt).

Stand: 2026-08-14 · Quellen: ORISO-Frontend, ORISO-Admin, ORISO-UserService, ORISO-Helm, ADR-004/-014/-015/-019

---

## 1. Optionalität: Wo ist der Schalter, was ist der Default?

Sprachnachrichten haben eine **eigene Flag-Familie** nach dem ADR-015-Muster (Master + 4 Chat-Typ-Varianten), getrennt von `featureMediaUpload*`:

```
featureVoiceMessagesEnabled
featureVoiceMessagesAnonymousChatsEnabled
featureVoiceMessagesOneOnOneChatsEnabled
featureVoiceMessagesGroupChatsEnabled
featureVoiceMessagesSupervisionChatsEnabled
```

- **Frontend-Typ:** `ORISO-Frontend/src/globalState/interfaces/TenantDataInterface.ts:76–80`
- **Frontend-Gate:** `messageSubmitInterfaceComponent.tsx:1990–2006` — `isVoiceMessageEnabledForCurrentChat` prüft Master-Flag **und** die zum aktuellen Chat-Typ passende Variante (`anonymous`/`oneOnOne`/`group`/`supervision`). Zusätzliche Vorbedingung: `hasUploadFunctionality` (= `featureMediaUpload*`-Familie für den Chat-Typ, ADR-015) muss ebenfalls an sein — ohne Medien-Upload keine Sprachnachricht (`startVoiceRecording`, Zeile 2880 ff.).
- **Admin-Panel:** Tenant → App Settings → **Permissions Settings**, Chat-Typ-Karten (`ORISO-Admin/src/components/Tenants/AppSettings/PermissionsSettings/chatTypeCards.ts`, Label `tenants.permissions.feature.voiceMessages` je Karte). Plattform-Governance über `allowedPermissionToggles`-Keys `voiceMessages*` (`permissionsSettingsUtils.ts:110–120, 295–299`) — die Plattform kann den Toggle also pro Tenant sperren/erzwingen.
- **Ebene:** **Tenant-Ebene** (Träger). Eine Agency-/Beratungsstellen-Variante der Voice-Flags existiert (noch) nicht — das Frontend liest ausschließlich `tenant?.settings`.
- **Default: AN.** Sowohl das Frontend (Destructuring-Defaults `= true` + `!== false`-Checks, Zeile 1991–1996) als auch die Admin-Defaults (`permissionsSettingsUtils.ts:28–32`, alle `true`) behandeln ein fehlendes Feld als „eingeschaltet". Für die DSFA korrekt formulieren: *abschaltbar, aber standardmäßig aktiv* — nicht „opt-in".
- Aufnahme ist auf **180 s** begrenzt (`VOICE_RECORDING_MAX_DURATION_SEC = 180`, `messageSubmitInterfaceComponent.tsx:125`).

## 2. E2EE-Pfad: Wird die Audiodatei verschlüsselt gesendet?

**Ja, doppelt — und es gibt keinen unverschlüsselten Sendepfad.**

**a) Aufnahme:** `startVoiceRecording` (`messageSubmitInterfaceComponent.tsx:2880 ff.`) nutzt `getUserMedia` + `MediaRecorder` (Opus in webm/ogg), baut ein `File` und ruft `sendMessage('', voiceFile, …)`.

**b) Attachment-Verschlüsselung (Layer 1, Datei selbst):** Jeder Datei-Send läuft durch `matrixClientService.uploadFileMessageContent` (`matrixClientService.ts:727 ff.`):
- `encryptMatrixAttachment(file)` (`src/utils/matrixEncryptedAttachment.ts`) — **AES-256-CTR mit frischem Zufallsschlüssel + IV pro Datei**, SHA-256-Hash, Matrix-`EncryptedFile` v2 (Spec-konform wie Element).
- Upload ins Media-Repo als `application/octet-stream` **mit `includeFilename: false`** — der Server bekommt weder Dateinamen noch MIME-Typ, nur einen opaken Ciphertext-Blob.
- Es gibt **keinen** Codepfad, der eine Datei unverschlüsselt hochlädt; `encryptMatrixAttachment` wird unkonditional aufgerufen. Sessions ohne Matrix-Raum können gar keine Attachments mehr senden (Abbruch mit Fehler, `messageSubmitInterfaceComponent.tsx:1421–1428`).

**c) Event-Verschlüsselung (Layer 2, Megolm):** Der Event-Content (`msgtype: 'm.audio'`, `body`/`filename`, `file`-Objekt mit AES-Key, `info` mit mimetype/size — `buildMatrixFileMessageContent`, `matrixClientService.ts:48–65`) wird per `client.sendMessage()` gesendet. Da
- alle Räume serverseitig mit `m.room.encryption` / `m.megolm.v1.aes-sha2` angelegt werden (`ORISO-UserService …/adapters/matrix/MatrixRoomClient.java:32–33, 101–110`, gesteuert durch `matrix.encryptionEnabled`),
- das Flag im Deployment fest auf **true** steht (`ORISO-Helm/values.yaml.default:258 matrixEncryptionEnabled: "true"`; ConfigMap-Default ebenfalls `"true"`; Java-Default `false` ist nur der Fallback ohne Env),
- der Client Rust-Crypto unconditional initialisiert (`matrixClientService.ts:154 initRustCrypto`),

Megolm-verschlüsselt das SDK **jeden** Send in diesen Räumen automatisch (`m.room.encrypted`). Der Kommentar im Code sagt es wörtlich (`messageSubmitInterfaceComponent.tsx:1619–1627`): der alte `isEncrypted`-Parameter ist ein No-op-Überbleibsel; Verschlüsselung hängt am Raumzustand, nicht an einem Flag. Client-DM-Räume setzen `m.room.encryption` ebenfalls im `initial_state` (`matrixClientService.ts:createDirectMessageRoom`). Für Calls existiert sogar ein Fail-closed-Assert (`assertMatrixRoomEncrypted`), für Datei-Sends verlässt sich der Code auf die Rauminvariante.

**Gilt für alle vier Chat-Typen** inkl. anonymem Live-Chat (dort Key-Sharing an alle Geräte statt nur cross-signed, `matrixClientService.ts` #774-Kommentar — Abwägung Erreichbarkeit vs. Geräteisolation, aber weiterhin Megolm-E2EE).

## 3. Metadaten: Aufnahmedauer im Dateinamen — Leck oder nicht?

**Befund bestätigt, aber: die Dauer liegt vollständig INNERHALB des verschlüsselten Contents. Kein serverseitiges Leck.**

- **Erzeugung:** `voice-message-${Date.now()}-s${elapsedSec}-ms${elapsedMs}.webm|ogg` (`messageSubmitInterfaceComponent.tsx:2949–2951`). Der Dateiname kodiert Sende-Timestamp + Dauer in Sekunden und Millisekunden.
- **Wo landet er?** Ausschließlich in `body`/`filename` des `m.audio`-Event-Contents (`buildMatrixFileMessageContent`) — und dieser Content wird in verschlüsselten Räumen komplett Megolm-verschlüsselt. Ans Media-Repo geht der Name **nicht** (`includeFilename: false`, Content-Type octet-stream).
- **Anzeige:** Der Empfänger-Client parst die Dauer aus dem (entschlüsselten) Dateinamen zurück (`MessageAttachment.tsx:225–247`, Regex `-s(\d+)-ms\d+`) — bewusst, damit Sender und Empfänger identische Dauer anzeigen.
- **Keine Waveform-Daten:** Die „Welle" ist ein reiner Fortschrittsbalken (CSS-Breite nach Playback-Position, `MessageAttachment.tsx:285–291`), es werden keine Amplituden übertragen.
- **Was der Server trotzdem sieht (prinzipbedingt, wie bei jeder Matrix-E2EE-Nachricht):** Raum-ID, Absender-Matrix-ID, Event-Timestamp, Ciphertext-**Größe** (aus der Blob-Größe lässt sich die Dauer grob schätzen, da AES-CTR längenerhaltend ist, Opus ≈ 3–6 KB/s). Das ist Traffic-Analyse-Restrisiko, kein Klartext-Leck — DSFA-tauglich als „Umfangsmetadaten" benennen.
- Die Push-/Event-Notification an den UserService enthält nur `roomId`/`threadRootId`/Anzeigename, **keinen Dateinamen und keinen Inhalt** (`chatTransportService.ts:263–269`).

## 4. Speicherung & Retention

- **Matrix-Media-Repo (Synapse):** speichert **nur den AES-CTR-Ciphertext** unter `/data/media_store` (`ORISO-Helm/templates/matrix/matrix-configmaps.yaml:146`). Der Entschlüsselungs-Key liegt ausschließlich im Megolm-verschlüsselten Event — Serverbetreiber (Neusta) kann Audio nicht abspielen.
- ⚠️ **Zwei Härtungspunkte im selben ConfigMap:**
  1. `enable_authenticated_media: false` (Zeile 148–150) — Media-Downloads erfordern **kein** Access-Token; wer eine `mxc://`-URL kennt, kann den (verschlüsselten) Blob ziehen. Inhaltlich durch die Attachment-Verschlüsselung geschützt, aber gegen die aktuelle Spec-Richtung (MSC3916) und in der DSFA nicht als „Zugriff nur für Berechtigte" verkaufbar → als geplante TOM-Härtung führen.
  2. **Keine `media_retention`-Konfiguration** — Synapse-Default = unbegrenzte Aufbewahrung. Sprachnachrichten-Ciphertext liegt bis zur aktiven Löschung (Redaction/Raum-Purge) dauerhaft im Media-Store. Retention-Policy ist eine offene DSFA-Maßnahme, kein Ist-Zustand.
- **Client-seitig:** Aufnahme-Preview als In-Memory-Blob-URL (`URL.createObjectURL`, revoked beim Cleanup); empfangene Sprachnachrichten werden per Fetch geladen, im Speicher entschlüsselt und als Blob-URL abgespielt (`MessageAttachment.tsx:63–133`) — **kein persistentes Audio in IndexedDB**. In IndexedDB liegt nur der Rust-Crypto-Store (Megolm-Schlüssel), geprefixt pro User/Device.
- **Scanner-Einordnung:** Sprachnachrichten laufen als normale Attachments durch die ADR-014/-019-Media-Pipeline (Blocked-State fail-closed in `MessageAttachment.tsx`); der AI-Scan ist per `featureMediaAiScan*` flag-gated — Deployment-Status siehe Tiefenbohrung 1 (Scanner-Status).

## 5. DSFA-Textbaustein (Vorschlag, ehrlich)

> **Sprachnachrichten.** Die Plattform erlaubt optional das Versenden kurzer Sprachnachrichten (max. 3 Minuten) in allen Beratungs-Chat-Formen. Die Funktion ist je Träger und je Chat-Typ (Einzelberatung, anonymer Live-Chat, Gruppen, Supervision) im Administrationsbereich abschaltbar; sie ist standardmäßig aktiviert und zusätzlich an die Freigabe des Medien-Uploads gekoppelt.
>
> **Besonderes Risiko:** Die menschliche Stimme ist ein identifizierendes, biometrienahes Merkmal. In einem pseudonymen Beratungssetting schwächt eine Sprachnachricht die Pseudonymität des Ratsuchenden gegenüber der beratenden Person — nicht jedoch gegenüber Plattform- oder Serverbetreiber (s. u.). Ratsuchende geben ihre Stimme freiwillig und aktiv preis (bewusste Aufnahme mit Vorschau- und Verwerfen-Möglichkeit); eine heimliche Erhebung findet nicht statt.
>
> **Schutzmaßnahmen:** Sprachnachrichten werden ausschließlich Ende-zu-Ende-verschlüsselt übertragen: Die Audiodatei wird clientseitig mit einem einmaligen AES-256-Schlüssel verschlüsselt, bevor sie den Endpunkt verlässt; der Schlüssel wird ausschließlich innerhalb der Megolm-Ende-zu-Ende-verschlüsselten Chat-Nachricht (Matrix, m.megolm.v1.aes-sha2) transportiert. Alle Beratungsräume werden serverseitig verpflichtend mit aktivierter Ende-zu-Ende-Verschlüsselung angelegt; ein unverschlüsselter Sendepfad existiert nicht. Der Server speichert nur nicht entschlüsselbares Chiffrat ohne Dateinamen oder Inhaltstyp; auch Aufnahmedauer und -zeitpunkt liegen ausschließlich im verschlüsselten Nachrichteninhalt. Betreiber und Plattformanbieter können Sprachnachrichten weder anhören noch inhaltlich auswerten. Systembedingt verbleibende Metadaten beim Serverbetreiber sind: Raumzuordnung, pseudonyme Absenderkennung, Zeitstempel und Größe des Chiffrats.
>
> **Restrisiko / geplante Maßnahmen:** Die Speicherdauer verschlüsselter Mediendateien auf dem Server ist derzeit unbegrenzt; eine automatische Löschfrist (Media-Retention) sowie die Umstellung auf authentifizierte Medien-Downloads sind als technische Härtungsmaßnahmen vorgesehen.

## Für Frank auf einen Satz

**„Ja — optional (Tenant-Toggle je Chat-Typ, Default an, zusätzlich an Media-Upload gekoppelt), und wenn an, dann immer doppelt verschlüsselt: AES-256 auf der Datei + Megolm auf dem Event; der Dateiname mit der Dauer liegt im Ciphertext, nicht beim Server. Offene Punkte für die TOM-Liste: unauthentifizierte Media-Downloads und fehlende Media-Retention."**
