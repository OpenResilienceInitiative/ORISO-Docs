---
scope: email-templates
inherits: default
metrics:
  email-render: {threshold: 0, weight: 3}
  email-links: {threshold: 0, weight: 2}
  email-languages: {threshold: 7, weight: 2}
tests:
  - npm run emails:build (ORISO-Frontend)
  - npm run test:unit -- src/emails (ORISO-Frontend)
---
You review e-mail templates. A frontend metric such as CRAP does not apply here; templates are judged by what the recipient receives.

- Render: every template must render to HTML and plain text without errors. The threshold is the number of templates that fail, so 0.
- Links: every link in every rendered template must resolve to a real target, and no link may carry a placeholder that was not filled. The threshold is the number of broken links, so 0.
- Languages: the kit ships seven language and tone variants (de-sie, de-du, en, fr, ru, ti, tr). Report variants that are missing for an occasion. Variants that are machine translated and pending human review are present, but say so in the reasons.

Size, test ratio, lint and duplication are inherited from the default. Language variants were taken from the e-mail kit README in ORISO-Frontend (src/emails).
