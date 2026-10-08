# Structural generation and narrative review

The pipeline fetches exact input revisions, extracts repository graphs, constructs
native platform/supergraphs, seals their full source vectors and verifies the pinned
consumer before publication. Generation completeness is structural; it does not
establish semantic review or runtime acceptance.

The Sept4 `platform/narrative/platform-enrich.json` is retained source evidence for
curation. Its legacy metadata has no reviewed release-vector/evidence binding. The
pipeline excludes it **before** invoking any mutating narrative applier and prints
`PLATFORM-NARRATIVE` coverage. Platform graph metadata records
`narrativeCoverage.status: excluded-unbound`, `reason: missing-review`, the exact
relative input path, SHA-256 and original generation date/author, zero applied
reviewed claims and `runtimeVerified: false`. Native nodes, edges and empty tour
remain intact. No historical concepts or tours are promoted to current knowledge.

The current platform applier does not support reviewed aggregate vectors. Any
purported reviewed binding or nonlegacy input fields fail closed instead of being
applied blindly. A future overlay requires reviewed evidence for the exact released
repository/ref/SHA vector, matching node fingerprints/ranges and honest chronology.
The single-repository semantic evaluator cannot establish an aggregate review by
comparing to a null platform commit. This curation remains open (D18).

`validate_narrative_report` retains its strict empty dropped-reference/missing-stat
contract for any attempted overlay; exclusion is an explicit coverage outcome,
not a fabricated successful apply report. See [release inputs](RELEASE-INPUTS.md)
for the independent source-release and activation contract.
