# ConsultingTypeService#207 — topic category names showed "&amp;"

Evidence for OpenResilienceInitiative/ORISO-ConsultingTypeService#208.

| File | What it shows |
| --- | --- |
| `before-desktop-1440x900.png` | Live Dev, 2026-11-18, frontend v2.0.16-41c4bc3: "Besondere Lebenssituationen &amp;amp; Krisen", "Gesundheit &amp;amp; Sucht". |
| `after-preview-*.png` | **Pre-deploy preview.** The same Dev page, with the live `/service/topic-groups` response decoded exactly as changeset `0015_topic_text_html_entities` does. Not a deployed result. |

Re-capture: `node capture.cjs <output-dir>` (uses Playwright from `ORISO-E2E/node_modules`). After deploy, the "before" shot of the script is the real after-shot.
