# ADR-031 — Keep production SigNoz behind a telemetry protection boundary

**Status:** Proposed. **Date:** 2026-11-07.
**Scope:** ORISO production signal collection, SigNoz access, storage and recovery. [E2E #99 F.4](https://github.com/OpenResilienceInitiative/ORISO-E2E/issues/99)

## Context

Operators need to diagnose error rates, latency and regressions in production. A collector can receive identifiers and counselling content in URLs, exceptions, span names, resource attributes and log bodies. Stored signals, copies and exported reports all need the same boundary. Dev and Pre-Dev supply the synthetic proving ground.

Helm PR #65 implemented an opt-in transform and keyed hash in a previous gateway template. The current vendored SigNoz collector uses a different config path and needs its own end-to-end proof. The Dev chart also has a retained-volume hook and a SQLite metadata backup job. That job covers SigNoz configuration and accounts. ClickHouse signal data needs a separate backup and recovery decision. [Historical Helm PR #65](https://github.com/OpenResilienceInitiative/ORISO-Helm/pull/65), [current collector template](https://github.com/OpenResilienceInitiative/ORISO-Helm/blob/7d9adaf2c4d0bd01ae7bd7a148109fb66efe2166/charts/signoz/templates/otel-collector/configmap.yaml), [Dev backup runbook](https://github.com/OpenResilienceInitiative/ORISO-Helm/blob/7d9adaf2c4d0bd01ae7bd7a148109fb66efe2166/runbooks/signoz-dev.md#signozdb-backup-and-restore)

## Proposed decision

Keep production emission and public routing off while preparing internal SigNoz services. Use a dedicated, fail-closed collector boundary for the smallest set of signals required to diagnose service health. The boundary must run before any exporter, connector, queue or durable storage sees the signal. Limit accepted attribute values, resource and scope attributes, signal names and nested fields as well as attribute keys. Prefer bounded operation names, status codes and aggregate metrics. Drop free text, raw paths and query strings, payloads, IP addresses and direct user, tenant, agency and session identifiers. Keep log export off until an explicitly reviewed structured log contract and its body handling pass the same tests. Use keyed correlation only for an approved purpose, with the key outside chart values, isolated by environment and covered by a rotation procedure.

Keep the UI and ingestion routes private by default. Before opening operator access, enforce named authentication and least-privilege roles on the UI and API. Bind service identities to their individual jobs, and prove the same access boundary from all configured routes. Apply the access controls to stored signals, metadata, backups and restored copies. The Pre-Dev ingress hardening in Helm #304 is tracked separately and can supply a test case for external access. [Helm #304](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/304)

Keeping telemetry off preserves the current production boundary but leaves operators without live diagnosis. Sending ordinary Dev telemetry to a private instance would improve diagnosis while allowing free text and identifiers into ClickHouse and its copies. A restricted pipeline supplies aggregate diagnosis at the cost of less detail and an ongoing test obligation whenever collectors, instrumentation or allowed fields change.

## Before activation

- **Signal boundary.** Run the pinned collector with synthetic canaries for resource and scope metadata, span names, events and links, metric names and datapoints, and log bodies and attributes. Include malformed values, errors, missing keys if keyed correlation is enabled, and each enabled ingress and scrape path. Prove permitted signals reach queries and forbidden values are absent from storage, collector diagnostics, retries and downstream reports. Keep all untested signal paths disabled.
- **Retention and recovery.** Obtain owner-approved TTLs for each ClickHouse signal and backup class, including delete behavior after a restore. Select a protected backup destination and recovery targets. Restore SigNoz metadata and ClickHouse data into an isolated environment, verify access and recovery, and measure the effective retention and restore time against the approved settings.
- **Access and rollback.** Verify anonymous denial and authorized operator access externally for the chosen UI and API routes. Verify that exporter disablement and route removal work on the intended production configuration. Keep the last accepted config and document how operators will stop collection and handle previously stored data after a rollback.

Production activation requires the platform owner and the relevant deployment, security and privacy owners to accept the technical evidence and the retention, recovery and access policy. The privacy owner records the applicable review, including the KDG question tracked in F.4. Record the accepted values and sign-off in the delivery ticket before enabling a signal or route. Until then, apply the production overlay and keep its export and route switches off.
