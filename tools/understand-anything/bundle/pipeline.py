"""Fetch exact source revisions, build in isolation, then publish once."""

from __future__ import annotations
import collections
import datetime as dt
import json
import hashlib
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


def validate_narrative_report(output):
    def unique_fields(pairs):
        fields = {}
        for key, value in pairs:
            require(key not in fields, "duplicate narrative report field")
            fields[key] = value
        return fields

    try:
        report = json.loads(
            output,
            object_pairs_hook=unique_fields,
            parse_constant=lambda value: require(False, "invalid JSON constant"),
        )
    except ValueError as error:
        raise ContractError("missing or malformed platform narrative report") from error
    require(isinstance(report, dict), "platform narrative report must be an object")
    for field in ("droppedRefs", "missingStats"):
        require(
            report.get(field) == [], f"platform narrative {field} must be an empty list"
        )


def exclude_unbound_platform_narrative(graph_path, enrichment_path):
    """Retain historical source bytes, disclose the review gap, never apply it."""
    raw = Path(enrichment_path).read_bytes()
    enrichment = json.loads(raw)
    require(isinstance(enrichment, dict), "platform narrative input must be an object")
    # No aggregate reviewed-vector evaluator exists in the current applier.
    # Only its explicit legacy shape can be excluded; claimed bindings fail closed.
    require(set(enrichment) <= {"meta", "serviceSummaries", "layerDescriptions", "concepts", "tour"}, "reviewed platform narrative method unsupported or unknown input fields")
    meta = enrichment.get("meta", {})
    require(isinstance(meta, dict) and set(meta) <= {"generatedAt", "generatedBy"}, "reviewed platform narrative vector verification unsupported")
    def review_claim(value):
        if isinstance(value, dict):
            return any(key in {"claim", "reviewedAt", "sourceCommit", "sourceSHA", "releaseBinding", "evidence", "confidence", "generationId", "sourceRepositories"} or key == "status" and item != "unbound" or review_claim(item) for key, item in value.items())
        return isinstance(value, list) and any(review_claim(item) for item in value)
    require(not review_claim(enrichment), "reviewed platform narrative vector verification unsupported")
    for field in ("serviceSummaries", "layerDescriptions"):
        entries = enrichment.get(field, {})
        require(isinstance(entries, dict) and all(isinstance(value, str) for value in entries.values()), "reviewed platform narrative values unsupported")
    for field, allowed in [("concepts", {"id", "name", "summary", "tags", "related"}), ("tour", {"order", "title", "description", "nodeIds"})]:
        entries = enrichment.get(field, [])
        require(isinstance(entries, list) and all(isinstance(value, dict) and set(value) <= allowed for value in entries), "reviewed platform narrative item fields unsupported")
    graph = read_json(graph_path)
    graph.setdefault("metadata", {})["narrativeCoverage"] = {
        "status": "excluded-unbound", "reason": "missing-review",
        "input": {"path": "platform/narrative/platform-enrich.json", "sha256": hashlib.sha256(raw).hexdigest(), "generatedAt": meta.get("generatedAt"), "generatedBy": meta.get("generatedBy")},
        "appliedReviewedClaims": 0, "runtimeVerified": False,
    }
    write_json(graph_path, graph)
    return graph["metadata"]["narrativeCoverage"]


def normalize_ref(ref):
    if ref.startswith(('refs/heads/', 'refs/tags/')) or re.fullmatch(r'[a-f0-9]{40}', ref):return ref
    require(bool(re.fullmatch(r'[A-Za-z0-9_.+/-]+', ref)) and not ref.startswith('-') and '..' not in ref, 'invalid input ref')
    return 'refs/heads/'+ref

def fetch_source(repository, ref, expected_sha=None):
    ref=normalize_ref(ref)
    require(bool(re.fullmatch(r'(refs/(heads|tags)/[A-Za-z0-9_.+/-]+|[a-f0-9]{40})',ref)) and '..' not in ref, 'exact source ref required')
    # Separate private tracking ref avoids silently reusing a stale local tag.
    import hashlib
    target='refs/oriso-inputs/'+hashlib.sha256(ref.encode()).hexdigest()
    run(['git','-C',str(repository),'fetch','--no-tags','origin',f'+{ref}:{target}'],timeout=90)
    sha=run(['git','-C',str(repository),'rev-parse','--verify',target+'^{commit}'],timeout=10)
    if expected_sha is not None:require(sha==expected_sha,'released source SHA differs from fetched exact ref')
    return sha


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


def internal_report_directory(destination, publish_root):
    destination = Path(destination).resolve()
    public = Path(publish_root).resolve()
    require(destination != public and public not in destination.parents,
            "internal report must be outside public root")
    return destination


def refresh(base, tools, publish_root, specs=None, release_evidence=None, internal_report_root=None):
    base = Path(base).resolve()
    tools = Path(tools).resolve()
    publish_root = Path(publish_root).resolve()
    specs = specs or REPOS
    report_root = internal_report_directory(internal_report_root, publish_root) if internal_report_root is not None else None
    if report_root is not None:
        require("ORISO-Docs" in {name for name, _, _ in specs}, "pinned Docs authored source required for internal report")
    env = os.environ.copy()
    with locked(publish_root):
        with tempfile.TemporaryDirectory(prefix=".build-", dir=publish_root) as tmp:
            work = Path(tmp)
            stage = work / "generation"
            source_root = work / "sources"
            stage.mkdir()
            source_root.mkdir()
            sources = []
            expected = {name: normalize_ref(branch) for name, branch, _ in specs}
            released_shas = {s["repository"]:s["sourceSHA"] for s in release_evidence["lock"]["sources"]} if release_evidence else {}
            # Fetch ALL inputs before any analysis; a failed archived fetch is still a failure.
            for name, branch, _ in specs:
                repository = base / name
                sha = fetch_source(repository, expected[name], expected_sha=released_shas.get(name))
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
            narrative_coverage = exclude_unbound_platform_narrative(
                platform_dir / "knowledge-graph.json",
                tools / "platform/narrative/platform-enrich.json",
            )
            print("PLATFORM-NARRATIVE " + json.dumps(narrative_coverage, sort_keys=True), flush=True)
            if release_evidence:
                for name, ref, _ in specs:fetch_source(base/name, normalize_ref(ref), expected_sha=released_shas[name])
            manifest = seal(stage, sources, expected_refs=expected, release=release_evidence)
            run(
                [str(runner), str(tools / "ua-validate-consumer.mjs"), str(stage)],
                cwd=tools,
                env=env,
            )
            if report_root is not None:
                # Fresh immutable source checkouts still exist here. Historical
                # authored bytes come from the pinned Docs input, never dirty tooling.
                run([
                    str(runner), str(tools / "ua-claim-candidates.mjs"),
                    "--generation", str(stage), "--public-root", str(publish_root),
                    "--sources", str(source_root),
                    "--inputs", str(tools / "review/claim-packages.json"),
                    "--authored-root", str(source_root / "ORISO-Docs"),
                    "--out", str(report_root / (manifest["generationId"] + ".json")),
                ], cwd=tools, env=env)
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
