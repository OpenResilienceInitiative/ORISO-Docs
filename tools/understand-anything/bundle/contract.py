"""Strict, non-sanitizing validation of a complete source-bound generation.

Unknown provenance fields are retained. Unknown structural types, discarded
references and inconsistent coverage are errors, never repaired during validation.
"""

from __future__ import annotations

import collections
import datetime as dt
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import re
import uuid

SCHEMA = "oriso.ua.generation/v1"
GRAPH_SCHEMA = "oriso.ua.graph/v1"
SHA = re.compile(r"[0-9a-f]{40}")
NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]*")
_SCHEMA_DOCUMENT = json.loads(Path(__file__).with_name("schema.json").read_text())
NODES = set(_SCHEMA_DOCUMENT["$defs"]["node"]["properties"]["type"]["enum"])
EDGES = set(_SCHEMA_DOCUMENT["$defs"]["edge"]["properties"]["type"]["enum"])
MAX_FILE = 256 * 1024 * 1024


class ContractError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ContractError(message)


def now_utc():
    return dt.datetime.now(dt.timezone.utc)


def timestamp(value):
    require(isinstance(value, str), "timestamp must be a string")
    try:
        result = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ContractError("invalid timestamp") from error
    require(result.tzinfo is not None, "timestamp requires timezone")
    return result.astimezone(dt.timezone.utc)


def check_time(value, now, max_age):
    age = (now - timestamp(value)).total_seconds()
    require(0 <= age <= max_age, f"timestamp stale or future: {value}")


def read_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, f"duplicate JSON key: {key}")
            result[key] = value
        return result

    try:
        require(
            path.stat().st_size <= MAX_FILE, f"file exceeds size budget: {path.name}"
        )
        return json.loads(
            path.read_text(),
            object_pairs_hook=unique,
            parse_constant=lambda x: (_ for _ in ()).throw(
                ContractError("nonfinite JSON number")
            ),
        )
    except (OSError, ValueError) as error:
        raise ContractError(f"invalid required JSON {path.name}: {error}") from error


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    )


def relative(value):
    require(
        isinstance(value, str) and value and "\\" not in value, "invalid asset path"
    )
    path = PurePosixPath(value)
    require(
        not path.is_absolute() and ".." not in path.parts and str(path) == value,
        "unsafe asset path",
    )
    return path


def asset(root, value):
    rel = relative(value)
    path = root.joinpath(*rel.parts)
    cursor = root
    for part in rel.parts:
        cursor = cursor / part
        require(not cursor.is_symlink(), f"symlink asset forbidden: {value}")
    return path


def string(value, label, empty=False):
    require(isinstance(value, str) and (empty or bool(value)), f"invalid {label}")


def integer(value, label):
    require(type(value) is int and value >= 0, f"invalid {label}")


def coverage(graph):
    counts = collections.Counter(edge["type"] for edge in graph["edges"])
    result = graph.get("relationCoverage")
    require(isinstance(result, dict) and result, "relationCoverage required")
    require(set(counts) <= set(result), "emitted relation missing coverage")
    for relation, item in result.items():
        require(
            relation in EDGES and isinstance(item, dict),
            f"invalid relation coverage: {relation}",
        )
        for key in ("emitted", "unresolved", "unsupported"):
            integer(item.get(key), f"{relation}.{key}")
        require(
            item["emitted"] == counts[relation], f"coverage count mismatch: {relation}"
        )
        require(
            item.get("status") in ("complete", "partial", "unsupported"),
            "invalid coverage status",
        )
        if item["status"] == "complete":
            require(
                item["unresolved"] == 0 and item["unsupported"] == 0,
                "complete relation has unresolved/unsupported inputs",
            )
        if item["status"] == "unsupported":
            require(
                item["emitted"] == 0 and item["unsupported"] > 0,
                "unsupported relation must disclose unsupported inputs",
            )
        if item["unresolved"] > 0:
            require(item["status"] == "partial", "unresolved relation must be partial")
    extraction = graph.get("metadata", {}).get("extraction", {})
    require(isinstance(extraction, dict), "invalid extraction metadata")
    diagnostics = extraction.get("diagnostics", {})
    require(isinstance(diagnostics, dict), "invalid extraction diagnostics")
    for relation, key in (
        ("imports", "unresolvedImports"),
        ("calls", "unresolvedCalls"),
    ):
        if key in diagnostics:
            item = diagnostics[key]
            require(isinstance(item, dict), f"invalid diagnostics: {key}")
            integer(item.get("total"), f"diagnostics.{key}.total")
            require(
                relation in result and result[relation]["unresolved"] == item["total"],
                f"coverage/diagnostic mismatch: {relation}",
            )
        if key in extraction:
            require(
                isinstance(extraction[key], list), f"invalid diagnostic samples: {key}"
            )
            require(
                relation in result
                and result[relation]["unresolved"] >= len(extraction[key]),
                f"coverage understates diagnostic samples: {relation}",
            )
    if "unsupportedInputs" in diagnostics:
        unsupported = diagnostics["unsupportedInputs"]
        require(isinstance(unsupported, dict), "invalid unsupported diagnostic")
        integer(unsupported.get("total"), "unsupportedInputs.total")
        by_relation = unsupported.get("byRelation")
        require(
            isinstance(by_relation, dict) and set(by_relation) <= {"imports", "calls"},
            "unsupported relation diagnostic required",
        )
        for relation, count in by_relation.items():
            integer(count, f"unsupportedInputs.{relation}")
        require(
            sum(by_relation.values()) == unsupported["total"],
            "unsupported diagnostic totals mismatch",
        )
        for relation in ("imports", "calls"):
            expected = by_relation.get(relation, 0) + (
                counts["calls_unconfirmed"] if relation == "calls" else 0
            )
            require(
                relation in result and result[relation]["unsupported"] == expected,
                f"coverage/unsupported diagnostic mismatch: {relation}",
            )
    return result


def optional_fields(content, strings=(), arrays=(), enums=None):
    for key in strings:
        if key in content:
            string(content[key], key, empty=True)
    for key in arrays:
        if key in content:
            require(
                isinstance(content[key], list)
                and all(isinstance(x, str) for x in content[key]),
                f"invalid {key}",
            )
    for key, values in (enums or {}).items():
        if key in content:
            require(content[key] in values, f"invalid {key}")


def graph_check(graph):
    require(isinstance(graph, dict), "graph must be an object")
    string(graph.get("version"), "version")
    optional_fields(
        graph,
        strings=("schemaVersion", "generationId"),
        enums={
            "kind": (
                "codebase",
                "knowledge",
                "design",
                "oriso-platform",
                "oriso-super-graph",
            )
        },
    )
    for key in ("metadata", "mergeMetadata"):
        if key in graph:
            require(isinstance(graph[key], dict), f"invalid graph.{key}")
    project = graph.get("project")
    require(isinstance(project, dict), "project required")
    require(
        "gitCommitHash" in project
        and (
            project["gitCommitHash"] is None
            or isinstance(project["gitCommitHash"], str)
        ),
        "project.gitCommitHash required",
    )
    string(project.get("name"), "project.name")
    timestamp(project.get("analyzedAt"))
    string(project.get("description"), "project.description", empty=True)
    for key in ("languages", "frameworks"):
        require(
            isinstance(project.get(key), list)
            and all(isinstance(x, str) for x in project[key]),
            f"invalid project.{key}",
        )
    require(isinstance(graph.get("layers"), list), "layers required")
    nodes = graph.get("nodes")
    edges = graph.get("edges")
    require(isinstance(nodes, list) and nodes, "nonempty nodes required")
    require(isinstance(edges, list), "edges required")
    ids = set()
    for node in nodes:
        require(isinstance(node, dict), "invalid node")
        string(node.get("id"), "node.id")
        require(node["id"] not in ids, "duplicate node id")
        ids.add(node["id"])
        require(
            isinstance(node.get("type"), str) and node["type"] in NODES,
            "unknown node type",
        )
        for key in ("name", "summary"):
            string(node.get(key), f"node.{key}", empty=key == "summary")
        require(
            isinstance(node.get("tags"), list)
            and all(isinstance(t, str) for t in node["tags"]),
            "invalid tags",
        )
        require(
            node.get("complexity") in ("simple", "moderate", "complex"),
            "invalid complexity",
        )
        optional_fields(node, strings=("filePath", "languageNotes"))
        for key in ("metadata", "domainMeta", "knowledgeMeta", "figmaMeta"):
            if key in node:
                require(isinstance(node[key], dict), f"invalid node.{key}")
        optional_fields(
            node.get("domainMeta", {}),
            strings=("entryPoint",),
            arrays=("entities", "businessRules", "crossDomainInteractions"),
            enums={"entryType": ("http", "cli", "event", "cron", "manual")},
        )
        optional_fields(
            node.get("knowledgeMeta", {}),
            strings=("category", "content"),
            arrays=("wikilinks", "backlinks"),
        )
        figma = node.get("figmaMeta", {})
        optional_fields(
            figma,
            strings=(
                "fileKey",
                "nodeId",
                "figmaType",
                "thumbnailUrl",
                "tokenValue",
                "componentKey",
            ),
            arrays=("prototypeTargets",),
            enums={"tokenKind": ("color", "type", "spacing", "effect", "grid")},
        )
        if "dimensions" in figma:
            dimensions = figma["dimensions"]
            require(
                isinstance(dimensions, dict) and set(dimensions) == {"width", "height"},
                "invalid figma dimensions",
            )
            require(
                all(
                    type(x) in (int, float) and math.isfinite(x)
                    for x in dimensions.values()
                ),
                "invalid figma dimensions",
            )
        if "lineRange" in node:
            line = node["lineRange"]
            require(
                isinstance(line, list)
                and len(line) == 2
                and all(type(x) is int and x > 0 for x in line)
                and line[0] <= line[1],
                "invalid line range",
            )
    edge_ids = set()
    for edge in edges:
        require(
            isinstance(edge, dict)
            and isinstance(edge.get("source"), str)
            and isinstance(edge.get("target"), str)
            and edge.get("source") in ids
            and edge.get("target") in ids,
            "dangling edge",
        )
        require(
            isinstance(edge.get("type"), str) and edge["type"] in EDGES,
            "unknown edge type",
        )
        require(
            edge.get("direction") in ("forward", "backward", "bidirectional"),
            "invalid edge direction",
        )
        weight = edge.get("weight")
        require(
            type(weight) in (int, float) and math.isfinite(weight) and 0 <= weight <= 1,
            "invalid edge weight",
        )
        optional_fields(edge, strings=("description",))
        if "id" in edge:
            string(edge["id"], "edge.id")
            require(edge["id"] not in edge_ids, "duplicate edge id")
            edge_ids.add(edge["id"])
    layer_ids = set()
    for layer in graph.get("layers", []):
        require(isinstance(layer, dict), "invalid layer")
        require(
            set(layer) <= {"id", "name", "description", "nodeIds"},
            "unsupported layer field would be dropped by consumer",
        )
        string(layer.get("id"), "layer.id")
        require(layer["id"] not in layer_ids, "duplicate layer id")
        layer_ids.add(layer["id"])
        for key in ("name", "description"):
            string(layer.get(key), f"layer.{key}", empty=key == "description")
        require(
            isinstance(layer.get("nodeIds"), list)
            and all(isinstance(x, str) and x in ids for x in layer["nodeIds"]),
            "dangling layer reference",
        )
    tour = graph.get("tour")
    require(isinstance(tour, list), "tour must be an array")
    orders = set()
    for step in tour:
        require(isinstance(step, dict), "invalid tour step")
        require(
            set(step) <= {"order", "title", "description", "nodeIds", "languageLesson"},
            "unsupported tour field would be dropped by consumer",
        )
        optional_fields(step, strings=("languageLesson",))
        integer(step.get("order"), "tour.order")
        require(step["order"] not in orders, "duplicate tour order")
        orders.add(step["order"])
        for key in ("title", "description"):
            string(step.get(key), f"tour.{key}", empty=key == "description")
        require(
            isinstance(step.get("nodeIds"), list)
            and all(isinstance(x, str) and x in ids for x in step["nodeIds"]),
            "dangling tour reference",
        )
    coverage(graph)


def source_check(sources, now, max_age, expected_refs=None):
    require(isinstance(sources, list) and sources, "sources required")
    names = set()
    for source in sources:
        require(isinstance(source, dict), "invalid source")
        name = source.get("repository")
        require(isinstance(name, str) and NAME.fullmatch(name), "invalid repository")
        require(
            name not in names and name not in ("ORISO-Platform", "ORISO-Supergraph"),
            "duplicate or reserved repository source",
        )
        names.add(name)
        ref = source.get("ref")
        require(
            isinstance(ref, str)
            and ref.startswith("refs/heads/")
            and ".." not in ref
            and not any(x.isspace() for x in ref),
            "invalid source ref",
        )
        require(
            isinstance(source.get("sourceSHA"), str)
            and SHA.fullmatch(source["sourceSHA"]),
            "full source SHA required",
        )
        require(source.get("fetchSuccess") is True, "failed source fetch")
        check_time(source.get("fetchedAt"), now, max_age)
        if expected_refs is not None:
            require(expected_refs.get(name) == ref, "unexpected source ref")
    if expected_refs is not None:
        require(names == set(expected_refs), "source inventory mismatch")
    return {s["repository"]: s for s in sources}


def envelope(manifest, now, max_age, expected_refs=None):
    require(
        isinstance(manifest, dict) and manifest.get("schemaVersion") == SCHEMA,
        "unsupported generation schema",
    )
    try:
        uuid.UUID(manifest["generationId"])
    except (ValueError, KeyError, TypeError) as error:
        raise ContractError("invalid generation ID") from error
    check_time(manifest.get("generatedAt"), now, max_age)
    return source_check(manifest.get("sources"), now, max_age, expected_refs)


def source_vectors(graph, meta, fingerprints, records, aggregate=False):
    expected = {s["repository"]: s["sourceSHA"] for s in records}
    for label, content in (
        ("graph", graph),
        ("meta", meta),
        ("project", graph["project"]),
        ("graph.metadata", graph.get("metadata", {})),
        ("fingerprints", fingerprints),
    ):
        require(isinstance(content, dict), f"invalid {label}")
        for key in ("gitCommitHash", "sourceCommit"):
            if key in content:
                scalar = None if aggregate else next(iter(expected.values()))
                require(content[key] == scalar, f"{label}.{key} source SHA mismatch")
        if "sourceRepositories" in content:
            require(
                content["sourceRepositories"] == records,
                f"{label} source provenance mismatch",
            )
        for key in ("sourceCommits", "sourceSHAs"):
            if key in content:
                require(
                    content[key] == expected, f"{label}.{key} source vector mismatch"
                )
    if aggregate:
        require(
            graph["project"].get("sourceCommits") == expected,
            "aggregate project.sourceCommits mismatch",
        )
    for label, entries in (
        ("metadata.sources", graph.get("metadata", {}).get("sources")),
        (
            "mergeMetadata.sourceRepos",
            graph.get("mergeMetadata", {}).get("sourceRepos"),
        ),
    ):
        if entries is not None:
            require(
                isinstance(entries, list) and all(isinstance(x, dict) for x in entries),
                f"invalid {label}",
            )
            require(
                len(entries) == len(expected)
                and {x.get("repo"): x.get("gitCommitHash") for x in entries}
                == expected,
                f"{label} source vector mismatch",
            )
    if "sourceSHAs" in fingerprints:
        require(
            fingerprints["sourceSHAs"] == expected, "fingerprints.sourceSHAs mismatch"
        )


def aggregate_inputs(graph, sources):
    vector = graph["project"].get("sourceCommits")
    require(isinstance(vector, dict) and vector, "aggregate source vector required")
    require(set(vector) <= set(sources), "aggregate has unknown source repository")
    require(
        all(vector[n] == sources[n]["sourceSHA"] for n in vector),
        "aggregate source vector SHA mismatch",
    )
    return [name for name in sources if name in vector]


def extraction_audit(graph):
    extraction = graph.get("metadata", {}).get("extraction", {})
    diagnostics = extraction.get("diagnostics", {})
    for key in ("unresolvedImports", "unresolvedCalls", "unsupportedInputs"):
        require(
            isinstance(diagnostics.get(key), dict) and "total" in diagnostics[key],
            f"repository extraction audit required: {key}",
        )


def preflight_tree(root):
    require(
        root.is_dir() and not root.is_symlink(), "staging root must be a real directory"
    )
    for path in root.rglob("*"):
        require(not path.is_symlink(), "staging symlinks forbidden before mutation")
        require(path.is_file() or path.is_dir(), "unsupported staging filesystem entry")
        relative(path.relative_to(root).as_posix())


def seal(root, sources, generation_id=None, now=None, expected_refs=None):
    root = Path(root)
    preflight_tree(root)
    now = now or now_utc()
    source_map = source_check(sources, now, 86400, expected_refs)
    generation_id = generation_id or str(uuid.uuid4())
    specs = [(name, "repository", [name]) for name in source_map] + [
        (name, kind, list(source_map))
        for name, kind in [
            ("ORISO-Platform", "platform"),
            ("ORISO-Supergraph", "supergraph"),
        ]
    ]
    graphs = []
    # Preflight every output before stamping anything; malformed/old output is not repaired.
    for name, kind, inputs in specs:
        directory = root / name / ".understand-anything"
        graph = read_json(directory / "knowledge-graph.json")
        graph_check(graph)
        if kind != "repository":
            inputs = aggregate_inputs(graph, source_map)
        else:
            extraction_audit(graph)
        meta = (
            read_json(directory / "meta.json")
            if (directory / "meta.json").exists()
            else {}
        )
        fingerprints = (
            read_json(directory / "fingerprints.json")
            if (directory / "fingerprints.json").exists()
            else {}
        )
        require(isinstance(fingerprints, dict), "invalid fingerprints")
        source_vectors(
            graph,
            meta,
            fingerprints,
            [source_map[n] for n in inputs],
            aggregate=kind != "repository",
        )
        if kind == "repository":
            require(graph["project"]["name"] == name, "repository graph name mismatch")
        check_time(graph["project"]["analyzedAt"], now, 86400)
        if kind == "repository":
            require(
                {"imports", "calls"} <= set(graph["relationCoverage"]),
                "required repository relation coverage absent",
            )
            meta = read_json(directory / "meta.json")
            fingerprints = read_json(directory / "fingerprints.json")
            expected = source_map[name]["sourceSHA"]
            require(
                graph["project"].get("gitCommitHash") == expected
                and meta.get("gitCommitHash") == expected,
                "graph/meta/source SHA mismatch",
            )
            require(
                isinstance(fingerprints, dict)
                and fingerprints.get("gitCommitHash") == expected
                and isinstance(fingerprints.get("files"), dict),
                "fingerprint/source SHA mismatch or missing file map",
            )
            check_time(meta.get("lastAnalyzedAt", meta.get("analyzedAt")), now, 86400)
        else:
            require(
                graph["project"].get("gitCommitHash") is None,
                "aggregate commit must be null; use full source list",
            )
        graphs.append(
            dict(
                repository=name,
                kind=kind,
                path=f"{name}/.understand-anything/knowledge-graph.json",
                metaPath=f"{name}/.understand-anything/meta.json",
                sourceRepositories=inputs,
                coverage=graph["relationCoverage"],
            )
        )
    for spec in graphs:
        directory = root / spec["repository"] / ".understand-anything"
        graph = read_json(directory / "knowledge-graph.json")
        graph.update(schemaVersion=GRAPH_SCHEMA, generationId=generation_id)
        graph["sourceRepositories"] = [
            source_map[name] for name in spec["sourceRepositories"]
        ]
        claims = [
            node.get("metadata", {}).get("semanticClaim") for node in graph["nodes"]
        ]
        claims = [claim for claim in claims if isinstance(claim, dict)]
        for claim in claims:
            claim["evaluatedGenerationId"] = generation_id
        semantic_counts = dict(
            collections.Counter(claim.get("status", "unbound") for claim in claims)
        )
        review_dates = [
            claim["reviewedAt"]
            for claim in claims
            if isinstance(claim.get("reviewedAt"), str)
        ]
        write_json(directory / "knowledge-graph.json", graph)
        meta = (
            read_json(directory / "meta.json")
            if (directory / "meta.json").exists()
            else {}
        )
        meta.update(
            schemaVersion=GRAPH_SCHEMA,
            generationId=generation_id,
            gitCommitHash=graph["project"].get("gitCommitHash"),
            lastAnalyzedAt=graph["project"]["analyzedAt"],
            sourceRepositories=graph["sourceRepositories"],
        )
        write_json(directory / "meta.json", meta)
        if spec["kind"] == "platform":
            write_json(directory / "platform-graph.json", graph)
        if spec["kind"] != "repository":
            write_json(
                directory / "fingerprints.json",
                {
                    "kind": "aggregate-inputs",
                    "sourceSHAs": {
                        name: source_map[name]["sourceSHA"]
                        for name in spec["sourceRepositories"]
                    },
                },
            )
        # Semantic recency is never inferred from filesystem mtime or build time.
        write_json(directory / "config.json", {"autoUpdate": False})
        write_json(
            directory / "depth.json",
            {
                "schemaVersion": "oriso.ua.depth/v1",
                "generationId": generation_id,
                "sourceRepositories": graph["sourceRepositories"],
                "semanticCoverage": semantic_counts,
                "semanticReviewedAt": max(review_dates) if review_dates else None,
                "note": "Inspect claim-level source/review provenance; generation time is structural freshness only.",
            },
        )
    files = []
    for path in sorted(root.rglob("*")):
        require(not path.is_symlink(), "staging symlinks forbidden")
        if path.is_file() and path.relative_to(root).as_posix() != "manifest.json":
            data = path.read_bytes()
            files.append(
                {
                    "path": path.relative_to(root).as_posix(),
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "size": len(data),
                }
            )
    manifest = dict(
        schemaVersion=SCHEMA,
        generationId=generation_id,
        generatedAt=now.isoformat(),
        sources=sources,
        graphs=graphs,
        files=files,
    )
    write_json(root / "manifest.json", manifest)
    validate(root, now=now, expected_refs=expected_refs)
    return manifest


def validate(root, now=None, max_age=86400, expected_refs=None):
    root = Path(root).resolve(strict=True)
    now = now or now_utc()
    manifest = read_json(root / "manifest.json")
    sources = envelope(manifest, now, max_age, expected_refs)
    files = manifest.get("files")
    require(isinstance(files, list) and files, "files required")
    listed = set()
    for entry in files:
        require(isinstance(entry, dict), "invalid asset entry")
        name = entry.get("path")
        path = asset(root, name)
        require(
            name not in listed and name != "manifest.json", "duplicate/reserved asset"
        )
        listed.add(name)
        require(
            isinstance(entry.get("sha256"), str)
            and re.fullmatch("[0-9a-f]{64}", entry["sha256"]),
            "invalid checksum",
        )
        integer(entry.get("size"), "asset.size")
        require(entry["size"] <= MAX_FILE, "asset size budget exceeded")
        try:
            data = path.read_bytes()
        except OSError as error:
            raise ContractError(f"missing required asset: {name}") from error
        require(
            len(data) == entry["size"]
            and hashlib.sha256(data).hexdigest() == entry["sha256"],
            f"asset checksum mismatch: {name}",
        )
        if name.endswith(".json"):
            read_json(path)
    require(
        not any(p.is_symlink() for p in root.rglob("*")),
        "generation contains symlink assets",
    )
    actual = {
        p.relative_to(root).as_posix()
        for p in root.rglob("*")
        if p.is_file() and p.relative_to(root).as_posix() != "manifest.json"
    }
    require(actual == listed, "unlisted or missing generation files")
    for source in sources.values():
        policy = source.get("analysisConfig")
        if policy is not None:
            require(
                isinstance(policy, dict)
                and policy.get("source") in ("versioned-tooling", "source-repository"),
                "invalid analysis config provenance",
            )
            relative(policy.get("path"))
            policy_path = policy.get("artifactPath")
            require(policy_path in listed, "analysis config artifact missing")
            require(
                hashlib.sha256(asset(root, policy_path).read_bytes()).hexdigest()
                == policy.get("sha256"),
                "analysis config hash mismatch",
            )
    graphs = manifest.get("graphs")
    require(isinstance(graphs, list), "graphs required")
    names = set()
    for spec in graphs:
        require(isinstance(spec, dict), "invalid graph specification")
        name = spec.get("repository")
        require(
            isinstance(name, str) and NAME.fullmatch(name) and name not in names,
            "invalid or duplicate graph",
        )
        names.add(name)
        kind = spec.get("kind")
        require(kind in ("repository", "platform", "supergraph"), "invalid graph kind")
        require(
            (kind == "repository" and name in sources)
            or (kind == "platform" and name == "ORISO-Platform")
            or (kind == "supergraph" and name == "ORISO-Supergraph"),
            "graph kind/repository mismatch",
        )
        expected = [name] if kind == "repository" else spec.get("sourceRepositories")
        require(
            isinstance(expected, list)
            and expected
            and all(isinstance(x, str) for x in expected)
            and len(expected) == len(set(expected))
            and set(expected) <= set(sources),
            "invalid graph source inventory",
        )
        require(
            spec.get("sourceRepositories") == expected,
            "graph source inventory mismatch",
        )
        required = [
            spec.get("path"),
            spec.get("metaPath"),
            f"{name}/.understand-anything/fingerprints.json",
            f"{name}/.understand-anything/depth.json",
        ]
        require(all(p in listed for p in required), "required graph assets missing")
        graph = read_json(asset(root, spec["path"]))
        meta = read_json(asset(root, spec["metaPath"]))
        graph_check(graph)
        if kind != "repository":
            require(
                expected == aggregate_inputs(graph, sources),
                "aggregate source inventory mismatch",
            )
        else:
            extraction_audit(graph)
        fingerprints = read_json(root / name / ".understand-anything/fingerprints.json")
        require(isinstance(fingerprints, dict), "invalid fingerprints")
        source_vectors(
            graph,
            meta,
            fingerprints,
            [sources[n] for n in expected],
            aggregate=kind != "repository",
        )
        if kind != "repository":
            require(
                fingerprints.get("sourceSHAs")
                == {n: sources[n]["sourceSHA"] for n in expected},
                "aggregate fingerprints source vector mismatch",
            )
        else:
            require(graph["project"]["name"] == name, "repository graph name mismatch")
        for content in (graph, meta):
            require(
                content.get("generationId") == manifest["generationId"]
                and content.get("schemaVersion") == GRAPH_SCHEMA,
                "graph/meta generation/schema mismatch",
            )
            require(
                content.get("sourceRepositories") == [sources[n] for n in expected],
                "graph/meta source provenance mismatch",
            )
        check_time(graph["project"]["analyzedAt"], now, max_age)
        check_time(meta.get("lastAnalyzedAt"), now, max_age)
        sha = sources[name]["sourceSHA"] if kind == "repository" else None
        require(
            graph["project"].get("gitCommitHash") == sha
            and meta.get("gitCommitHash") == sha,
            "graph/meta SHA mismatch",
        )
        require(
            meta.get("lastAnalyzedAt") == graph["project"]["analyzedAt"],
            "graph/meta timestamp mismatch",
        )
        require(
            spec.get("coverage") == graph["relationCoverage"],
            "manifest coverage mismatch",
        )
        if kind == "repository":
            require(
                {"imports", "calls"} <= set(graph["relationCoverage"]),
                "required repository relation coverage absent",
            )
            fingerprints = read_json(
                root / name / ".understand-anything/fingerprints.json"
            )
            require(
                isinstance(fingerprints, dict)
                and fingerprints.get("gitCommitHash") == sha
                and isinstance(fingerprints.get("files"), dict),
                "fingerprint/source SHA mismatch",
            )
        depth = read_json(root / name / ".understand-anything/depth.json")
        require(
            depth.get("generationId") == manifest["generationId"]
            and depth.get("sourceRepositories") == [sources[n] for n in expected],
            "depth provenance mismatch",
        )
        if kind == "platform":
            alias = f"{name}/.understand-anything/platform-graph.json"
            require(
                alias in listed
                and asset(root, alias).read_bytes()
                == asset(root, spec["path"]).read_bytes(),
                "platform alias mismatch",
            )
    require(
        names == set(sources) | {"ORISO-Platform", "ORISO-Supergraph"},
        "required graph inventory mismatch",
    )
    return manifest
