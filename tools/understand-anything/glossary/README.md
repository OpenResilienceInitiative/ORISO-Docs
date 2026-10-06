# Understand shared vocabulary

`catalog.json` is the maintained DE/EN vocabulary source used by the glossary,
curated graph projection and publication. It contains79 concepts:47 reviewed
seed concepts plus32 project terms, with36 explicit dispositions for Björn's
original rows. New human copy uses Provider, Counselling Centre, Counsellor and
Help-seeker. Aliases and expandable mappings explain inherited names; application
identifiers, database schemas, permissions and API contracts remain unchanged.

## Editorial and selected-source evidence

- `editorialState` distinguishes source-backed vocabulary, editorial choices,
  draft practice concepts and historical environment names.
- Architecture `sources` preserve their original reviewed Git revision, SHA256
  whole-file hash, title and actual Accepted/Proposed state. Accepted design is
  separate from implemented/released behaviour. ADR-008 remains Proposed; ADR-024
  has a documented local/versioned title collision and is not a unique authority.
- Input snapshots under `sources/` have a content hash and null original commit.
  External EUR-Lex authority is a public HTTPS reference, without a fictitious
  repository source binding.
- `codeMappings` are dated historical review evidence. `graphMappings` are candidate
  source-file links or existing curated domain concepts; missing/stale targets
  must be explained. File symbols are preserved; preferred words can be searchable
  tags and curated concept labels. A path/node ID match alone never establishes
  source freshness.
- `assessSourceBinding(source, selected)` verifies bytes of an immutable selected
  repository revision while retaining the older editorial review provenance.
  Changed bytes return stale; missing source/mutable ref returns unavailable.

`validateGlossary(data)` is the public content gate. It rejects missing DE/EN
content/examples, duplicated IDs, invalid relationships/provenance, lost partner
rows and unqualified deprecated human terms. `copyPolicy.allowlist` requires a
specific concept, language, field, term and reason if compatibility wording must
appear in a human definition. Alias/code/source fields preserve technical vocabulary.
Categories organise the UI; they do not create DDD contexts or access rights.
Unestablished context/responsibility/invariants are explicitly unconfirmed.

## Reproduce the bounded naming inventory

From the Docs repository, with the named source repositories beside each other:

```sh
python3 tools/understand-anything/glossary/audit.py \
  --repositories /path/to/project-parent \
  --out /path/to/new-audit-artifact-directory \
  --check tools/understand-anything/glossary/audit-summary.json
node --test tools/understand-anything/glossary/test/*.test.mjs
```

`audit-policy.json` defines exact immutable source revisions, file gate,26 primary
family predicates,8 catch-all legal families, targeted findings and exclusions.
The runner reads `git ls-tree`/`git archive` at those pins; dirty files, untracked
build output and moving branch tips cannot enter. The four relevant Database DDL
exports are read from an immutable GitHub tree/blob when no local Git repo exists.
`gh` authentication is required for this private source fallback; no credentials
are printed or written into outputs.

The output directory must be new. It receives `summary.json` and
`occurrences.jsonl`; every family/line occurrence records exact source SHA/file
hash, raw matching tokens with columns, disposition, reason and reviewed-finding
ID where applicable. A line can match several families; counts overlap. Every
candidate has a recorded disposition, but **unresolved means no semantic review**.
Migration history and contract/generator ownership are labelled by their surface;
that classification does not call a historical wire name incorrect. Only exact
reviewed findings get their concrete naming disposition. Full output remains a
review artifact rather than adding hundreds of thousands of source occurrences
to the static UI or repository.

`audit-summary.json` commits the reproducible summary and occurrence-file hash;
`audit-ledger.json` explains all families and the evidence boundary. The original
6,725-file investigation is retained as historical input in
`sources/naming-audit.md`. The maintained runner includes all tracked tests/contracts
and33 Docs graph-enrichment inputs that the original gate excluded. Its expanded
coverage and explicit predicates are separately reported; old counts are not
silently claimed to reproduce under a different gate.

When a reviewed occurrence is resolved, add its exact source hash, source line,
family and reason to the policy. Run the audit again and update the committed
summary. No regular expression can certify every occurrence semantically correct.
Renames/migrations require separately reviewed application delivery.
