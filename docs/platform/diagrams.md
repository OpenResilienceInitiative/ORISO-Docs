---
title: Diagrams
description: Where each schematic lives, and how the diagrams on this site are written and kept in sync.
---

# Diagrams

Diagrams are not collected on one page. Each one lives on the page whose subject it
explains, so it is read in context and updated with the text around it.

| Diagram | Page |
| --- | --- |
| Service landscape, with call directions | [Architecture](./architecture.md) |
| Login and token flow, Keycloak to service | [Authentication and Keycloak](./authentication-and-keycloak.md) |
| Tenant resolution fallback chain | [Authentication and Keycloak](./authentication-and-keycloak.md) |
| How to read a service, contract to repository | [Backend services](./backend-services.md) |
| Data ownership across the stores | [Database and data model](./database-and-data-model.md) |
| Deploy path, pull request to pod | [Kubernetes deployment](./kubernetes-deployment.md) |
| Browser request path, component to service | [Frontend and Admin](./frontend-admin-overview.md) |
| How the code graphs are built | [How we keep the docs honest](./understand-anything.md) |

## How they are written

Diagrams are Mermaid, written as a fenced ` ```mermaid ` block directly in the Markdown
source. There is no separate diagram file and no image to regenerate:

- GitHub renders the fence natively, so the diagram is visible in a pull-request diff;
- this site converts the same fence into a rendered diagram at page load, via
  `site/components/mermaid.tsx` and the conversion in
  [`site/scripts/sync-content.mjs`](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/site/scripts/sync-content.mjs);
- a diagram change is therefore a readable text diff, and reviewable like any other.

Keep them schematic. A diagram that tries to show every class stops being a map; the
useful ones show the boxes you might have to open and the direction of the arrows
between them.

## Older diagram sources

An earlier set of standalone Mermaid files is kept in the repository under
[`docs/platform/diagrams/`](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/docs/platform/diagrams).
They were generated from the graph artifacts of May 2026 and are superseded by the
in-page diagrams above.
