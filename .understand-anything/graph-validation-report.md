---
title: ORISO Graph Validation Report
description: Artifact-only validation report for the detailed ORISO super graph merge.
---

# ORISO Graph Validation Report

This report validates the existing .understand-anything graph artifacts used by the detailed ORISO super graph merge. No sibling source code was re-analyzed for this merge.

## Merge Summary

- Repositories checked: 9
- Graphs found: 9
- Graphs missing: None
- Original nodes merged: 7194
- Original edges merged: 12725
- Normalized graph nodes: 7204
- Normalized graph edges: 22351

## Repository Graphs

| Repository | Graph found | Size | Last modified | Completeness | Needs verification |
| --- | --- | ---: | --- | --- | --- |
| ORISO-Frontend | yes | 1.7 MB | 2026-05-27T17:49:04.040Z | 1967 nodes; 4204 edges; 884 file/module; 983 class/function; 76 config | No endpoint nodes detected; API/routes may only be represented as files/functions.; No visual graph artifacts found. |
| ORISO-Admin | yes | 692.1 KB | 2026-05-27T17:54:42.539Z | 776 nodes; 1547 edges; 444 file/module; 318 class/function; 10 config | No endpoint nodes detected; API/routes may only be represented as files/functions. |
| ORISO-UserService | yes | 3.2 MB | 2026-05-27T18:55:01.072Z | 2295 nodes; 3854 edges; 908 file/module; 983 class/function; 182 API/route; 91 config | Database tables may be represented in ORISO-Database, not this service graph. |
| ORISO-AgencyService | yes | 784.3 KB | 2026-05-27T19:41:15.738Z | 623 nodes; 835 edges; 221 file/module; 224 class/function; 86 API/route; 35 config | Source graph uses legacy edge direction labels; merge normalized directions and preserves originalDirection. |
| ORISO-ConsultingTypeService | yes | 574.2 KB | 2026-05-28T02:36:14.011Z | 470 nodes; 515 edges; 158 file/module; 160 class/function; 32 API/route; 51 config | No major graph-shape gaps detected; still verify behavior in source before changing production flows. |
| ORISO-TenantService | yes | 466.2 KB | 2026-05-28T03:00:43.072Z | 380 nodes; 623 edges; 107 file/module; 98 class/function; 66 API/route; 16 config | No major graph-shape gaps detected; still verify behavior in source before changing production flows. |
| ORISO-Database | yes | 217.3 KB | 2026-05-28T13:17:38.847Z | 192 nodes; 312 edges; 11 file/module; 13 class/function; 8 config | No major graph-shape gaps detected; still verify behavior in source before changing production flows. |
| ORISO-Keycloak | yes | 133.6 KB | 2026-05-28T03:28:07.952Z | 152 nodes; 247 edges; 9 file/module; 0 class/function; 7 API/route; 2 config | No major graph-shape gaps detected; still verify behavior in source before changing production flows. |
| ORISO-Kubernetes | yes | 347.0 KB | 2026-05-28T16:08:39.879Z | 339 nodes; 588 edges; 13 file/module; 0 class/function; 68 API/route; 53 config | No major graph-shape gaps detected; still verify behavior in source before changing production flows. |

## Follow-Up Actions

- Re-run Understand-Anything in a sibling repo when its source changes, then regenerate this merge from artifacts.
- Do not edit sibling repo graph files from ORISO-Docs.
- Review Needs verification items in [super-graph-explorer](./super-graph-explorer.md).
