"""Fetch exact source revisions, build in isolation, then publish once."""

from __future__ import annotations
import collections
import datetime as dt
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile
from .contract import ContractError, now_utc, read_json, require, seal, write_json
from .storage import locked, _publish

REPOS = [
    ("ORISO-Admin", "dev", "enrich-admin.json"),
    ("ORISO-AgencyService", "dev", "enrich-agencyservice.json"),
    ("ORISO-ConsultingTypeService", "dev", "enrich-cts.json"),
    ("ORISO-Database", "dev", "enrich-database.json"),
    ("ORISO-Frontend", "dev", "enrich-frontend.json"),
    ("ORISO-Keycloak", "dev", "enrich-keycloak.json"),
    ("ORISO-Kubernetes", "dev", "enrich-kubernetes.json"),
    ("ORISO-TenantService", "dev", "enrich-tenantservice.json"),
    ("ORISO-UserService", "dev", "enrich-userservice.json"),
    ("ORISO-Helm", "dev", "enrich-helm.json"),
    ("ORISO-E2E", "main", "enrich-e2e.json"),
    ("ORISO-Infra", "main", "enrich-infra.json"),
    ("ORISO-ElementCall", "dev", "enrich-elementcall.json"),
    ("ORISO-Livekit", "dev", "enrich-livekit.json"),
    ("ORISO-HealthDashboard", "dev", "enrich-healthdashboard.json"),
    ("ORISO-Status", "dev", "enrich-status.json"),
    ("ORISO-SigNoz", "main", "enrich-signoz.json"),
    ("ORISO-Docs", "dev", "enrich-docs.json"),
]


def safe_diagnostic(text):
    """Redact complete input before truncation can cut away a credential prefix."""
    # Terminal coloring may interrupt recognizable URL/header boundaries.
    text = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", text)
    # URLs may hold credentials in userinfo, query, fragment or signed paths.
    # Keep the command context; no remote URL is needed in a public error tail.
    text = re.sub(r"(?i)\b[a-z][a-z0-9+.-]*://[^\s<>\"']+", "[REDACTED URL]", text)
    text = re.sub(
        r"(?im)([\"']?\b(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token)[\"']?\s*[:=]\s*)[^\r\n]+",
        r"\1[REDACTED]",
        text,
    )
    # Relative request targets can still contain access tokens or signed queries.
    text = re.sub(r"([?&][^\s=?#&]+\s*=\s*)[^\s&#\"']*", r"\1[REDACTED]", text)
    text = re.sub(
        r"(?im)(\b[\w-]*(?:token|password|secret|api[_-]?key|auth)[\w-]*[\"']?\s*[:=]\s*)[^\r\n]+",
        r"\1[REDACTED]",
        text,
    )
    return text


def run(command, *, cwd=None, env=None, timeout=900):
    try:
        result = subprocess.run(
            command, cwd=cwd, env=env, text=True, capture_output=True, timeout=timeout
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ContractError(
            f"command failed: {command[0]} ({type(error).__name__})"
        ) from error
    if result.returncode:
        # Do not include remote URLs, auth headers or an entire process environment.
        raise ContractError(
            f"command failed ({result.returncode}): {Path(str(command[0])).name}; {safe_diagnostic(result.stderr)[-1800:]}"
        )
    return result.stdout.strip()


def fetch_source(repository, ref):
    branch = ref.removeprefix("refs/heads/")
    require(
        ref.startswith("refs/heads/") and branch and not branch.startswith("-"),
        "expected branch ref required",
    )
    run(
        [
            "git",
            "-C",
            str(repository),
            "fetch",
            "--no-tags",
            "origin",
            f"+{ref}:refs/remotes/origin/{branch}",
        ],
        timeout=90,
    )
    return run(
        [
            "git",
            "-C",
            str(repository),
            "rev-parse",
            "--verify",
            f"refs/remotes/origin/{branch}^{{commit}}",
        ],
        timeout=10,
    )


def aggregate_coverage(path, repo_graphs):
    graph = read_json(path)
    counts = collections.Counter(edge["type"] for edge in graph["edges"])
    inputs = collections.defaultdict(lambda: {"unresolved": 0, "unsupported": 0})
    for source in repo_graphs:
        for relation, coverage in source["relationCoverage"].items():
            for key in ("unresolved", "unsupported"):
                inputs[relation][key] += coverage[key]
    result = {}
    for relation in set(counts) | set(inputs):
        detail = inputs[relation]
        emitted = counts[relation]
        status = (
            "partial"
            if detail["unresolved"] or (detail["unsupported"] and emitted)
            else ("unsupported" if detail["unsupported"] else "complete")
        )
        result[relation] = dict(emitted=emitted, **detail, status=status)
    graph["relationCoverage"] = result
    write_json(path, graph)


def refresh(base, tools, publish_root, specs=None):
    base = Path(base).resolve()
    tools = Path(tools).resolve()
    publish_root = Path(publish_root).resolve()
    specs = specs or REPOS
    env = os.environ.copy()
    with locked(publish_root):
        with tempfile.TemporaryDirectory(prefix=".build-", dir=publish_root) as tmp:
            work = Path(tmp)
            stage = work / "generation"
            source_root = work / "sources"
            stage.mkdir()
            source_root.mkdir()
            sources = []
            expected = {name: f"refs/heads/{branch}" for name, branch, _ in specs}
            # Fetch ALL inputs before any analysis; a failed archived fetch is still a failure.
            for name, branch, _ in specs:
                repository = base / name
                sha = fetch_source(repository, expected[name])
                fetched = now_utc().isoformat()
                sources.append(
                    dict(
                        repository=name,
                        ref=expected[name],
                        sourceSHA=sha,
                        fetchedAt=fetched,
                        fetchSuccess=True,
                    )
                )
                source = source_root / name
                run(
                    [
                        "git",
                        "clone",
                        "--shared",
                        "--no-checkout",
                        "--quiet",
                        str(repository),
                        str(source),
                    ],
                    timeout=120,
                )
                run(
                    ["git", "-C", str(source), "checkout", "--quiet", "--detach", sha],
                    timeout=120,
                )
                # Policies must be reproducible from the pinned tooling or exact
                # source checkout. Untracked server-only policy is never inherited.
                policy = tools / "analysis-config" / f"{name}.understandignore"
                tracked_policy = source / ".understandignore"
                if policy.is_file() or tracked_policy.is_file():
                    import hashlib

                    from_tooling = policy.is_file()
                    data = (policy if from_tooling else tracked_policy).read_bytes()
                    tracked_policy.write_bytes(data)
                    sources[-1]["analysisConfig"] = {
                        "path": (
                            f"analysis-config/{name}.understandignore"
                            if from_tooling
                            else ".understandignore"
                        ),
                        "source": (
                            "versioned-tooling" if from_tooling else "source-repository"
                        ),
                        "sha256": hashlib.sha256(data).hexdigest(),
                        "artifactPath": f"{name}/.understand-anything/analysis-config.understandignore",
                    }
            runner = tools / "ua-node"
            for name, _, enrichment in specs:
                output = stage / name / ".understand-anything"
                output.mkdir(parents=True)
                source_record = next(s for s in sources if s["repository"] == name)
                if "analysisConfig" in source_record:
                    (output / "analysis-config.understandignore").write_bytes(
                        (source_root / name / ".understandignore").read_bytes()
                    )
                run(
                    [
                        str(runner),
                        str(tools / "ua-generate.mjs"),
                        str(source_root / name),
                        name,
                        str(output),
                    ],
                    cwd=tools,
                    env=env,
                )
                enrichment_path = tools / "enrichments" / enrichment
                if not enrichment_path.exists():
                    enrichment_path = tools / enrichment
                if enrichment:
                    env["UA_SOURCE_ROOT"] = str(source_root / name)
                    require(
                        enrichment_path.is_file(),
                        f"required enrichment missing: {enrichment}",
                    )
                    run(
                        [
                            str(runner),
                            str(tools / "ua-enrich-merge.mjs"),
                            str(output),
                            str(enrichment_path),
                        ],
                        cwd=tools,
                        env=env,
                    )
                print(
                    f'ANALYZED {name} {next(s["sourceSHA"]for s in sources if s["repository"]==name)}',
                    flush=True,
                )
            env.update(
                UA_BASE=str(stage),
                UA_REPOSITORIES=",".join(name for name, _, _ in specs),
                NODE_OPTIONS="--max-old-space-size=2048",
            )
            super_dir = stage / "ORISO-Supergraph/.understand-anything"
            run(
                [
                    str(runner),
                    str(tools / "ua-build-supergraph.mjs"),
                    "--out",
                    str(super_dir),
                ],
                cwd=tools,
                env=env,
            )
            aggregate_coverage(
                super_dir / "knowledge-graph.json",
                [
                    read_json(
                        stage / name / ".understand-anything/knowledge-graph.json"
                    )
                    for name, _, _ in specs
                ],
            )
            platform_dir = stage / "ORISO-Platform/.understand-anything"
            run(
                [
                    str(runner),
                    str(tools / "platform/ua-platform-graph.mjs"),
                    "--graphs-dir",
                    str(stage),
                    "--repos-dir",
                    str(source_root),
                    "--out",
                    str(platform_dir),
                ],
                cwd=tools,
                env=env,
            )
            run(
                [
                    str(runner),
                    str(tools / "platform/narrative/apply-platform-enrich.mjs"),
                    str(platform_dir / "knowledge-graph.json"),
                    str(tools / "platform/narrative/platform-enrich.json"),
                ],
                cwd=tools,
                env=env,
            )
            manifest = seal(stage, sources, expected_refs=expected)
            run(
                [str(runner), str(tools / "ua-validate-consumer.mjs"), str(stage)],
                cwd=tools,
                env=env,
            )
            _publish(stage, publish_root)
            print(
                f'PUBLISHED {manifest["generationId"]} ({len(sources)} sources, complete generation)',
                flush=True,
            )
            print(
                (
                    "MIRROR-UNSUPPORTED: configured legacy mirror was not used; it cannot atomically publish this generation"
                    if os.environ.get("UA_MIRROR")
                    else "MIRROR-DISABLED: no atomic mirror transport configured"
                ),
                flush=True,
            )
            return manifest
