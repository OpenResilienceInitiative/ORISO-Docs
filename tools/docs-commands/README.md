# Documentation command contracts

Extract only the Markdown files supplied on the command line:

```text
python3 tools/docs-commands/extract.py --strict services-local-setup/README.md
python3 -m unittest discover -s tools/docs-commands -p 'test_*.py' -v
```

Immediately before each `bash`, `sh` or `shell` fence, add this standalone
HTML comment. Blank lines between the comment and fence are allowed.

```text
<!-- oriso-command: {"id":"local-doctor","environment":"local","verification":"Reports prerequisite results without starting services","risk":"read-only"} -->
```

The contract has exactly four keys:

| Key | Allowed value |
| --- | --- |
| `id` | Nonempty string, unique across all supplied files |
| `environment` | `local`, `dev`, `stage`, `greenfield` |
| `verification` | Nonempty string describing the expected result |
| `risk` | `read-only`, `disposable-only`, `operator-approved` |

The extractor accepts backtick and tilde fences indented by up to three spaces.
It skips contents of other fenced code blocks, retains the shell content
verbatim, and reports one-based source lines and SHA-256 hashes for the supplied
sources. The Python interface is `extract_sources({"guide.md": markdown_text})`.

The JSON report contains `schema_version`, `sources`, `commands` and `findings`.
Each command carries its four contract fields, `command`, `source_file`,
`annotation_line`, `fence_line`, `line` (first content line), and `end_line` (last
content line, before the closing fence). An empty block has `end_line < line`.
Findings contain `code`, `message`, `source_file` and `line`. Usage and file
read errors also produce JSON, with `line: null`.

Without `--strict`, findings remain visible and the command exits 0. Strict
mode exits 1 for any finding. Input or usage errors exit 2 in either mode.

Extraction checks the written contract and fence structure. It never runs a
command, evaluates an ID or verification string, or changes a source file.
An annotation is not approval, and its `verification` text is not test evidence.
Destructive or operator actions still require the runner's runtime approval
and disposable-target gates. Unselected legacy guides remain outside this
report; the extractor does not scan directories or claim they were checked.
