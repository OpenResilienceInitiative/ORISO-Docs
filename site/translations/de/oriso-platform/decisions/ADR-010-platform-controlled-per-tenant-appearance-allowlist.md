# ADR-010: Plattformgesteuerte Freigabeliste je Träger für den Bereich Erscheinungsbild (Darstellung/Theme)

- **Status:** Vorgeschlagen — 2026-07-06 (diese Sitzung); wartet auf Franks Bestätigung des Datenmodells, danach Umsetzung.
- **Datum:** 2026-07-06
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** THB-Theme-Builder-Arbeiten (PRs #123/#124/#125 geschlossen, #153 mit Telefonvorschau am 06-17 gemergt, #126 THB-06 am 07-02 gemergt); Sichtbarkeitssteuerung über `ProtectedPageLayoutWrapper.tsx` / `settingsTabs.ts`; ORISO-Admin `GlobalSettings` (nur für SuperAdmin, Tabs für Login und SMTP); TenantService `TenantAdminControlsService` (ein plattformweiter Steuerungsdatensatz); Memory `oriso-design-rule-disable-not-hide` (dieser ADR ist eine **bewusste, begrenzte Ausnahme**, siehe Entscheidung §3).

---

## Kontext

Nach der Modernisierung auf React 19 / antd 5 wurde der Bereich „Erscheinungsbild“ als verschwunden gemeldet. Die Prüfung am 2026-07-06 zeigte: Er ist **nicht verschwunden**. Der THB-Theme-Builder (`src/pages/Tenants/Edit/ThemeSettings` → `components/Tenants/GeneralSettings` → `ThemeBuilder` mit Telefonvorschau `iphone-14-pro.png` und `MiniChatPreview`) ist auf `dev` vorhanden und durch die Modernisierung bytegleich geblieben. Er ist ein **Unterbereich der Mandantenbearbeitung**, dessen Sichtbarkeit über Rolle und Mehrmandantenmodus durch `shouldShowThemeSettings` gesteuert wird (`ProtectedPageLayoutWrapper.tsx:82`, `App.tsx:77`, `settingsTabs.ts:63`).

Zwei Fakten begründen diesen ADR:

1. **Ein Berechtigungsschalter `appearance` ist bereits vorhanden:** `settings.tenantAdminControls.allowedPermissionToggles.appearance`, gelesen in `GeneralSettings/index.tsx` als `appearanceEditable`. Er schaltet den ThemeBuilder jedoch nur auf **Lesezugriff** und gilt **plattformweit statt je Mandant**. `TenantAdminControlsService` lädt **eine einzige Zeile** (`findTopByOrderByIdAsc`) und ergänzt die Einstellungen *aller* Mandanten um *dasselbe* Steuerungsobjekt. Die Kommentare nennen es plattformweite Admin-Steuerung. Heute gilt es somit für alle oder keinen Mandanten und erlaubt nur eine Umschaltung auf Lesezugriff.

2. **Die Anforderung gilt je Träger.** Ein Plattformadministrator (SuperAdmin) muss über eine **Mehrfachauswahl von Trägern** festlegen, welche Mandanten das Erscheinungsbild bearbeiten dürfen. Erlaubt → Bereich sichtbar und bearbeitbar. Nicht erlaubt → Unterbereich für diesen Träger **vollständig versteckt**.

SuperAdmin-Identität: `useUserRoles.hook.ts:39` — `AgencyAdmin && TenantAdmin && tenantId === 0`.

## Entscheidung (vorgeschlagen)

1. **Eine plattformweite Freigabeliste mit Träger-IDs einführen: `appearanceAllowedTenantIds: number[]` im vorhandenen JSON-Block `tenant_admin_controls`.** Keine Schemamigration: `controls` ist JSON in `LONGTEXT`, daher ist das zusätzliche Feld möglich. Dies ist die einzige maßgebliche Quelle und wird nur durch SuperAdmin bearbeitet.

2. **Den Wert je Mandant serverseitig berechnen.** Wenn TenantService die Einstellungen eines konkreten Mandanten ergänzt (`enrichSettingsWithTenantAdminControls`), wird `allowedPermissionToggles.appearance = appearanceAllowedTenantIds.contains(tenantId)` für diesen Mandanten gesetzt. Das **verwendet den bereits vom Frontend gelesenen booleschen Wert weiter**. Die vollständige Liste bleibt auf dem Server; der Client eines Mandantenadministrators erfährt nur die eigene Freigabe.

3. **Frontend: verstecken statt nur lesend anzeigen.** Wenn `appearance !== true` und der Benutzer kein SuperAdmin ist, wird der Unterbereich Erscheinungsbild **vollständig versteckt** statt `readOnly`: sowohl die Karte *als auch* Tab-/Navigationseintrag. Dies ist eine **bewusste Ausnahme** von der oberflächenweiten Regel „deaktivieren, nicht verstecken“ (`oriso-design-rule-disable-not-hide`). Diese Regel betrifft Einstellungen, die eine Rolle sehen, aber nicht ändern darf. Hier ist die Bearbeitung eine **von der Plattform gewährte Fähigkeit**, auf die ein nicht freigegebener Träger keinen Anspruch hat und die ihm nicht angezeigt werden soll.

4. **Neue Mehrfachauswahl nur für SuperAdmin** als neuer Tab in `GlobalSettings` (`/admin/global-settings/appearance`). Sie listet alle Träger (`searchTenantData`, Bezeichnung `name`, Wert `id`) und verwendet `SelectFormField` mit `isMulti`. Die Auswahl entspricht `appearanceAllowedTenantIds` und wird über den vorhandenen Endpunkt für globale Steuerungswerte gespeichert, auf demselben Weg wie globale SMTP-Einstellungen. Nur für SuperAdmin sichtbar und bearbeitbar.

5. **SuperAdmin sieht und bearbeitet das Erscheinungsbild immer**, unabhängig von der Freigabeliste. So kann die Plattform das Theme jedes Trägers konfigurieren.

## Erwogene Optionen

- **Boolesche Spalte je Mandant** durch `tenant_id` in `tenant_admin_controls` oder ein neues Mandantenflag. Verworfen: benötigt Schemamigration, Liquibase-Changeset und Schreibvorgänge je Mandant, ohne Vorteil gegenüber einem zusätzlichen JSON-Array.
- **Den einzelnen globalen Wert `appearance` behalten.** Verworfen: kann unterschiedliche Freigaben für Träger nicht ausdrücken.
- **Nur lesend statt versteckt.** Durch Produktentscheidung verworfen: für nicht freigegebene Träger vollständig verstecken.
- **Die ganze Liste an jeden Client liefern und im Browser filtern.** Verworfen: legt die gesamte Freigabeliste unnötig jedem Mandantenadministrator offen. Stattdessen den individuellen Wert serverseitig berechnen (§2).

## Folgen

**Positiv:** Kleine, überwiegend ergänzende Änderung ohne Datenbankmigration, da JSON-Feld. Der vorhandene Service/Endpunkt für globale Steuerungswerte und der vom Frontend bereits gelesene Wert `appearance` bleiben nutzbar. Im Frontend hauptsächlich `readOnly → hidden` und eine neue SuperAdmin-Seite. Für freigegebene Träger „kehrt“ der Bereich zurück. **Negativ / Aufwand:** Der globale Wert `appearance` bedeutet jetzt nicht mehr global an/aus, sondern wird aus der Freigabeliste je bedientem Mandanten berechnet. Jeder Verbraucher mit der alten Bedeutung muss geprüft werden. SuperAdmin muss die Liste pflegen; entfernte Mandanten verlieren den Bereich beim nächsten Laden.

## Tests (was benötigt wird)

**Unit-Tests (ORISO-Admin, vitest):**
- Reine Prüffunktion `isAppearanceEditingAllowed({ appearanceToggle, isSuperAdmin })` oder entsprechend: Freigabe true → true; false/undefined → false; SuperAdmin unabhängig davon → true.
- Sichtbarkeit: Bei `appearance !== true` ohne SuperAdmin werden Unterbereich **und** Tab-/Navigationseintrag **nicht gerendert**. Abwesenheit im DOM prüfen, nicht nur eine `readOnly`-Eigenschaft.
- Die Mehrfachauswahlseite wird nur für SuperAdmin gerendert; andere Benutzer erreichen sie nicht.

**Unit-/Slice-Tests (ORISO-TenantService):**
- `TenantAdminControlsService` speichert und liest `appearanceAllowedTenantIds` über JSON-`controls`: Serialisierung/Deserialisierung, leere Standardliste, kompatibel mit bestehenden Zeilen ohne das Feld.
- Die Ergänzung berechnet `allowedPermissionToggles.appearance = allowlist.contains(servedTenantId)`: true für gelistete, false für nicht gelistete Mandanten. Die vollständige Liste erscheint nicht in der ergänzten Mandantenantwort.

**Integration / E2E (Admin-Prüfung, Playwright/Cypress):**
- SuperAdmin: Globale Einstellungen → Erscheinungsbild → Mehrfachauswahl zeigt Träger → Träger aktivieren → speichern → dessen Administrator sieht und bearbeitet den Bereich. Deaktivieren → Bereich verschwindet für diesen Träger.
- Mandantenadministrator ohne SuperAdmin: sieht nie die Mehrfachauswahl; sieht den Bereich genau dann, wenn sein Mandant freigegeben ist.

## Offen (wartet auf Frank)

- Datenmodell bestätigen: plattformweite Array-Freigabeliste oder echtes Flag je Mandant. Empfehlung: Array im vorhandenen Steuerungs-JSON (§1).
- Bestehende Verbraucher des globalen Werts `appearance`, die dessen globale Bedeutung voraussetzen: vor der Umstellung durch Quellcodesuche prüfen.
- i18n-Schlüssel und genaue deutsche Bezeichnungen für den neuen Tab („Erscheinungsbild“) und die Mehrfachauswahl („Welche Träger dürfen das Erscheinungsbild ändern?“).
- Ob SingleTenantAdmin im Ein-Domain-Modus jemals die Plattformliste pflegt oder dies ausschließlich SuperAdmin vorbehalten ist.
