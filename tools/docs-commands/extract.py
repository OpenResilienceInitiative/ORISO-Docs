"""Read Markdown command contracts; never execute commands or verification text."""

import argparse
import hashlib
import json
import re
from pathlib import Path

FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})([^\r\n]*)[\r\n]*$")


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate key: " + key)
        result[key] = value
    return result


def _reject_constant(value):
    raise ValueError("Invalid JSON constant: " + value)


def _contract(payload):
    contract = json.loads(payload, object_pairs_hook=_unique_object, parse_constant=_reject_constant)
    if not isinstance(contract, dict) or set(contract) != {"id", "environment", "verification", "risk"}:
        raise ValueError("Contract requires exactly id, environment, verification and risk.")
    for key in ("id", "verification"):
        if not isinstance(contract[key], str) or not contract[key].strip():
            raise ValueError(key + " must be a nonempty string.")
    if contract["environment"] not in ("local", "dev", "stage", "greenfield"):
        raise ValueError("Environment must be local, dev, stage or greenfield.")
    if contract["risk"] not in ("read-only", "disposable-only", "operator-approved"):
        raise ValueError("Risk must be read-only, disposable-only or operator-approved.")
    return contract


def extract_sources(sources):
    """Return a JSON-compatible report for only the supplied file/text mapping."""
    report = {"schema_version": 1, "sources": [], "commands": [], "findings": []}
    ids = {}
    def finding(code, message, filename, line):
        report["findings"].append({"code": code, "message": message, "source_file": filename, "line": line})

    for filename, text in sources.items():
        report["sources"].append({"file": filename, "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()})
        lines = text.splitlines(keepends=True)
        annotation = None
        index = 0
        while index < len(lines):
            line = lines[index]
            if re.match(r"^ {0,3}<!--\s*oriso-command\b", line):
                if annotation:
                    finding("orphan-contract", "Contract must immediately precede a shell fence (blank lines allowed).", filename, annotation[1])
                start = index
                comment = line
                while "-->" not in comment and index + 1 < len(lines) and not FENCE.match(lines[index+1]):
                    index += 1
                    comment += lines[index]
                match = re.fullmatch(r" {0,3}<!--\s*oriso-command:\s*(.*?)\s*-->[ \t]*(?:\r?\n)?", comment, re.DOTALL)
                try:
                    if not match:
                        raise ValueError("Malformed command annotation; expected a complete standalone HTML comment.")
                    annotation = (_contract(match[1]), start+1)
                    command_id = annotation[0]["id"]
                    if command_id in ids:
                        finding("duplicate-id", "Duplicate id " + command_id + "; first defined at " + ids[command_id] + ".", filename, start+1)
                    else:
                        ids[command_id] = filename + ":" + str(start+1)
                except ValueError as error:
                    finding("invalid-contract", str(error), filename, start+1)
                    annotation = None
                index += 1
                continue
            fence = FENCE.match(line)
            # A backtick fence cannot have backticks in its info string.
            if fence and fence[1][0] == "`" and "`" in fence[2]:
                fence = None
            if fence:
                marker, info = fence.groups()
                end = index + 1
                closing = re.compile(r"^ {0,3}" + re.escape(marker[0]) + "{" + str(len(marker)) + r",}[ \t]*[\r\n]*$")
                while end < len(lines) and not closing.match(lines[end]):
                    end += 1
                shell = info.strip().split()[:1] in (["bash"], ["sh"], ["shell"])
                if end == len(lines):
                    finding("unclosed-fence", "Code fence has no closing fence.", filename, index+1)
                if shell:
                    if annotation and end < len(lines):
                        report["commands"].append({**annotation[0], "command": "".join(lines[index+1:end]), "source_file": filename, "annotation_line": annotation[1], "fence_line": index+1, "line": index+2, "end_line": end})
                    elif not annotation:
                        finding("missing-contract", "Shell fence has no adjacent command contract.", filename, index+1)
                elif annotation:
                    finding("orphan-contract", "Command contract precedes a non-shell fence.", filename, annotation[1])
                annotation = None
                index = end
            elif line.strip() and annotation:
                finding("orphan-contract", "Contract must immediately precede a shell fence (blank lines allowed).", filename, annotation[1])
                annotation = None
            index += 1
        if annotation:
            finding("orphan-contract", "Command contract has no following shell fence.", filename, annotation[1])
    return report


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError(message)


def main(argv=None):
    """Print one JSON report; 0=report, 1=strict findings, 2=input/usage error."""
    parser = _Parser(description=__doc__)
    parser.add_argument("--strict", action="store_true", help="Fail on any contract finding.")
    parser.add_argument("files", nargs="+", help="Only these UTF-8 Markdown files are inspected.")
    try:
        args = parser.parse_args(argv)
    except ValueError as error:
        report = extract_sources({})
        report["findings"].append({"code": "cli-error", "message": str(error), "source_file": None, "line": None})
        print(json.dumps(report, indent=2))
        return 2

    sources = {}
    errors = []
    for filename in args.files:
        try:
            sources[filename] = Path(filename).read_bytes().decode("utf-8")
        except (OSError, UnicodeError) as error:
            errors.append({"code": "read-error", "message": str(error), "source_file": filename, "line": None})
    report = extract_sources(sources)
    report["findings"].extend(errors)
    print(json.dumps(report, ensure_ascii=True, indent=2))
    return 2 if errors else int(args.strict and bool(report["findings"]))


if __name__ == "__main__":
    raise SystemExit(main())
