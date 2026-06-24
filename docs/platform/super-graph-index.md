---
title: ORISO Super Graph Index
description: Where the detailed merged ORISO graph is saved and how to use or regenerate it.
---

# ORISO Super Graph Index

## What This Is

The ORISO super graph is a merge-only graph built from existing Understand-Anything outputs in all 9 target repositories. It does not re-analyze source code and it does not overwrite sibling repository graphs.

## Repositories Included

- ORISO-Frontend
- ORISO-Admin
- ORISO-UserService
- ORISO-AgencyService
- ORISO-ConsultingTypeService
- ORISO-TenantService
- ORISO-Database
- ORISO-Keycloak
- ORISO-Kubernetes

## JSON Outputs

- `.understand-anything/oriso-super-graph.json`: dashboard-compatible merged graph with all prefixed nodes and edges.
- `.understand-anything/oriso-super-graph-detailed.json`: grouped inspection JSON with raw graphs, inventory, normalized nodes/edges, cross-repo relationships and needs-verification notes.
- `.understand-anything/knowledge-graph.json`: copy used by the Understand-Anything dashboard for ORISO-Docs.

## Markdown Outputs

- [Detailed graph view](./super-graph-detailed.md)
- [Explorer index](./super-graph-explorer.md)
- [Repository map](./repository-map.md)
- [Understand-Anything inventory](./understand-anything-inventory.md)

## How to Update One Repo Graph Later

1. Go to the sibling repo, for example `../ORISO-UserService`.
2. Run the normal Understand-Anything graph generation there.
3. Return to `ORISO-Docs`.
4. Regenerate this super graph from the existing artifacts.
5. Verify that the merged dashboard graph still validates.

## Regeneration Rule

Do not edit sibling `.understand-anything/knowledge-graph.json` files from ORISO-Docs. Treat them as read-only inputs.
