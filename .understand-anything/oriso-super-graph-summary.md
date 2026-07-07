# ORISO Enriched Super Graph Summary

Generated: 2026-05-28T17:04:27.271Z

This graph combines existing Understand-Anything graphs with direct source/config inspection of all nine target repositories.

## Outputs

- .understand-anything/oriso-super-graph.json
- .understand-anything/knowledge-graph.json
- .understand-anything/oriso-super-graph-summary.md
- docs/platform/graph-validation-report.md
- docs/platform/repo-graphs/*.md

## Graph Size

- Nodes: 95
- Edges: 128

## Inputs

- ORISO-Frontend: graph found, direct inspection completed
- ORISO-Admin: graph found, direct inspection completed
- ORISO-UserService: graph found, direct inspection completed
- ORISO-AgencyService: graph found, direct inspection completed
- ORISO-ConsultingTypeService: graph found, direct inspection completed
- ORISO-TenantService: graph found, direct inspection completed
- ORISO-Database: graph found, direct inspection completed
- ORISO-Keycloak: graph found, direct inspection completed
- ORISO-Kubernetes: graph found, direct inspection completed

## Major Gaps

- TenantId claim generation in Keycloak needs verification.
- UploadService and Rocket.Chat are referenced by infrastructure/config but are not included as analyzed repos.
- Kubernetes lacks verified HPA, NetworkPolicy and PDB coverage.
- Active production/staging values may differ from committed examples.
