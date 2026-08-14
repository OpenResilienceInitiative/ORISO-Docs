---
title: ORISO-Infra Enriched Graph Summary
description: Cluster provisioning, bootstrap, and access-management summary for ORISO-Infra.
---

# ORISO-Infra Enriched Graph Summary

## Platform Navigation

- [Overview](../overview.md)
- [Repository map](../repository-map.md)
- [Architecture](../architecture.md)
- [Authentication and Keycloak](../authentication-and-keycloak.md)
- [Database and data model](../database-and-data-model.md)
- [Kubernetes deployment](../kubernetes-deployment.md)
- [Frontend/Admin overview](../frontend-admin-overview.md)
- [Backend services](../backend-services.md)
- [Tenant lifecycle](../tenant-lifecycle.md)
- [User management flow](../user-management-flow.md)
- [Local development](../local-development.md)
- [Onboarding guide](../onboarding-guide.md)
- [Troubleshooting](../troubleshooting.md)
- [Graph validation report](../graph-validation-report.md)
- [Diagrams](../diagrams.md)

## Repository Purpose

Infrastructure repository for the ORISO platform below the Helm layer: declarative provisioning of the dev Kubernetes cluster on Hetzner Cloud (k3s via the `hetzner-k3s` CLI), idempotent in-cluster platform bootstrap (cert-manager, application namespace, storage class), and per-developer cluster access management. Staging and production run on Gridscale GSK managed Kubernetes and are managed separately, outside this repository.

## Main Technologies

Hetzner Cloud, hetzner-k3s CLI, k3s v1.32.0+k3s1, Bash, kubectl, Helm 3, cert-manager v1.16.2, Hetzner CCM/CSI, flannel CNI, Spegel embedded registry mirror, metrics-server

## Important Files and Modules

- apply.sh — one-command entrypoint: provision cluster (Phase 1) + in-cluster bootstrap (Phase 2)
- clusters/dev-hetzner/cluster.yaml — declarative cluster definition (nodes, network, firewall, add-ons)
- clusters/dev-hetzner/README.md — provisioning, upgrade, pool-resize, and teardown procedures
- bootstrap/bootstrap.sh — idempotent in-cluster baseline (cert-manager, namespace, StorageClass)
- bootstrap/values/cert-manager.yaml — cert-manager Helm values (CRDs enabled+kept, single replicas, no Prometheus)
- bootstrap/manifests/caritas-namespace.yaml — application namespace
- bootstrap/manifests/block-storage-sc.yaml — `block-storage` StorageClass alias to Hetzner `hcloud-volumes`
- add-developer.sh / remove-developer.sh — grant/revoke per-developer cluster access
- ACCESS-MANAGEMENT.md — admin and developer access procedures
- README.md — repository layout and environment matrix

## Architecture Summary

Two clean layers, both idempotent and re-runnable:

1. **Provider level** (`clusters/dev-hetzner/`): `hetzner-k3s create --config cluster.yaml` provisions the `oriso-dev` cluster in Nuremberg (nbg1) — private network 10.0.0.0/16, Hetzner Cloud Firewall, one CX23 control-plane node, an autoscaling worker pool of CX33 nodes (min 2, max 5), a load balancer in front of the API server, k3s with Hetzner CCM + CSI. Add-ons: metrics-server and the Spegel embedded registry mirror enabled; Traefik and ServiceLB explicitly disabled (the ORISO platform chart brings its own ingress-nginx). The kubeconfig is written next to `cluster.yaml` and gitignored. Etcd snapshot configuration exists but is commented out (backups not yet set up).
2. **In-cluster bootstrap** (`bootstrap/`): installs only what the ORISO platform Helm chart expects to pre-exist — cert-manager (pinned `v1.16.2`, CRDs installed and kept on uninstall), the `caritas` namespace, and the `block-storage` StorageClass (alias for `csi.hetzner.cloud` / `hcloud-volumes`, WaitForFirstConsumer, expansion allowed) referenced by the chart's Matrix Synapse PVCs.

`apply.sh` chains both phases; each can also run standalone. Application deployment itself (the platform umbrella chart) is out of scope here and happens afterwards with a local, gitignored `values-dev.yaml`.

## Access Management

- Model: each developer gets `ServiceAccount/dev-<user>` in `caritas`, bound to the built-in `admin` ClusterRole via a namespace-scoped RoleBinding, plus a long-lived token Secret — full freedom inside `caritas`, no cluster-level or cross-namespace rights.
- `add-developer.sh <username>` applies the RBAC trio (all labelled `oriso.io/user=<name>`), waits for the token controller, and emits `<username>-kubeconfig.yaml` (mode 600) with hand-off instructions (secure one-time channel, then delete the local copy).
- `remove-developer.sh <username>` deletes ServiceAccount, RoleBinding, and Secret by label; the issued kubeconfig becomes invalid immediately.
- The cluster admin keeps the full-cluster kubeconfig from `hetzner-k3s create` for platform-level operations.

## Network and Security Posture

- Kubernetes API server: open to `0.0.0.0/0`; authentication via mTLS (admin kubeconfig) and ServiceAccount tokens.
- SSH to nodes: `cluster.yaml` currently also allows `0.0.0.0/0` (the inline comment and ACCESS-MANAGEMENT.md still describe an admin-IP-only rule).
- Stated long-term plan: move both behind a Tailscale mesh VPN (CGNAT allowlist).
- Secrets policy: Hetzner API token only via `HCLOUD_TOKEN` env var; kubeconfigs, `values-dev.yaml`, `.env*` and `secrets.yaml` are gitignored; developer kubeconfig tokens are long-lived and must be treated as passwords.

## ORISO Dependencies

- **ORISO platform Helm chart** (ORISO-Kubernetes / ORISO-Helm): consumes the bootstrap outputs — expects the `caritas` namespace, the `block-storage` StorageClass, cert-manager CRDs (for its ClusterIssuer), and `Secret/registry-secret` with GHCR pull credentials. The chart bundles its own ingress-nginx, which is why Traefik/ServiceLB are disabled at the k3s level.
- **GHCR** (ghcr.io): image registry; pull secret is created manually post-bootstrap.
- No other ORISO repository depends on this one at build time; it is purely operational.

## Local Development Notes

- One-time prerequisites: Hetzner Cloud project + read/write API token, an SSH keypair (`~/.ssh/oriso_dev`), and `hetzner-k3s`, `kubectl` (1.30+), `helm` 3.x installed (brew on macOS).
- Always run `hetzner-k3s` from `clusters/dev-hetzner/` — `kubeconfig_path: "./kubeconfig"` is relative to the working directory; `apply.sh` handles this automatically.
- Bootstrap can be run standalone against an existing cluster (`export KUBECONFIG=...; bash bootstrap/bootstrap.sh`), e.g. for a cert-manager version bump.
- Developers configure `~/.kube/oriso-dev` from their personal kubeconfig; `kubectl get pods -n kube-system` returning `forbidden` is expected.

## Deployment Notes

- Full flow: `export HCLOUD_TOKEN=...; ./apply.sh` (~5-7 minutes for cluster creation), then create `registry-secret`, prepare local `values-dev.yaml`, and `helm upgrade --install oriso-platform ... -n caritas`.
- Updates (resize pools, change allowlists, add nodes): edit `cluster.yaml` and re-run `hetzner-k3s create` — idempotent, applies the delta. Instance-type changes require an add-new-pool / drain-old-pool cycle (documented in the cluster README). `cluster_name` and the private subnet cannot change without recreation.
- k3s upgrades via `hetzner-k3s upgrade --new-k3s-version ...`; teardown via `hetzner-k3s delete`.
- cert-manager version is pinned in `bootstrap.sh` (`CERT_MANAGER_VERSION`); bump deliberately against upstream release notes.

## Risks and Gaps

- SSH allowlist drift: `cluster.yaml` opens SSH to `0.0.0.0/0` while its own comment, the cluster README troubleshooting section, and ACCESS-MANAGEMENT.md describe an admin-IP-only rule. Either the file or the docs are wrong; the Tailscale migration that would resolve this is still backlog.
- Kubernetes API is internet-exposed by design (accepted risk for dev, standard scanner noise).
- Etcd snapshots/backups are commented out — no cluster state backup is configured.
- Developer tokens are long-lived ServiceAccount token Secrets with no expiry or rotation story beyond manual removal.
- Doc drift in `bootstrap/README.md`: the step table still lists "Remove default Traefik" and mentions `kubectl config rename-context`, but `bootstrap.sh` has neither (Traefik is now disabled declaratively in `cluster.yaml`); `clusters/dev-hetzner/README.md` still shows a manual Traefik-removal section and says "2 workers" in one place while the pool autoscales 2-5.
- `cluster.yaml` comment references `bootstrap/access/add-developer.sh`, but the scripts live at the repository root.
- No GitOps yet: the README calls GitOps "future"; cluster/bootstrap changes are applied manually from a workstation.
- No CI in the repository (nothing under .github/), so scripts and manifests are unlinted/untested.

## Needs Verification

- Whether the live Hetzner firewall actually matches `cluster.yaml` (SSH 0.0.0.0/0) or was tightened manually in the console.
- Which repository's platform chart is currently deployed on this cluster — bootstrap docs reference the ORISO-Kubernetes `helm/oriso-platform` chart, while ORISO-Helm is the canonical infra repo for pre-dev.
- Whether the dev cluster described here is the active pre-dev environment or a parallel/legacy cluster.
- Current cert-manager version actually running vs the pinned `v1.16.2`.
- Gridscale GSK staging/prod management process (explicitly out of scope of this repository).
