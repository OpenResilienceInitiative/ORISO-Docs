# Public operator snapshot input

`public_operator_snapshot.py` is the canonical pure-Python contract. Its identical
copy is vendored into the legal preparation branch; compare the file SHA-256 before
releasing either consumer. The source contract is TenantService commit
`eea5db184ebaddf80dab16e8f045af8c359c10e1`, `api/tenantservice.yaml`, unauthenticated
`GET /tenant/public/dpia`. `schemaHash` binds the exact API file bytes. Branding is
resolved tenant appearance, not the platform operator's identity.

The helper never fetches, writes an approval or changes operator data. Capture a
previously obtained public response at build time:

```sh
python3 tools/public_operator_snapshot.py --raw public-response.json \
  --operator-id explicit-stable-selector --origin https://operator.example.org \
  --source-date 2026-10-01T10:00:00Z \
  --source-sha eea5db184ebaddf80dab16e8f045af8c359c10e1 > operator-snapshot.json
```

The date is the actual response observation time, not a new renderer timestamp.
`sourceHash` binds the input bytes; `payloadHash` binds the validated canonical
payload; `snapshotHash` binds identity, origin, provenance, status and payload.
Unknown fields, malformed JSON, duplicate keys, secret-bearing fields, wrong
versions and active/remote images fail closed. Missing values stay missing; an
explicit source count of zero remains zero. Optional fields can be absent, so
`partial` is valid source evidence. A fully populated non-branding payload is
`available`; neither status is human confirmation.

Without an input, consumers render `unavailable` and `Unconfirmed`, with no
invented operator, framework, dates or counts. `fallback(previous, operator_id,
origin, current_payload=...)` is an explicit Python operation requiring a validated
previous snapshot, the same selector and origin, and a matching legal name if a
new payload supplies one. It retains original source date/hash and never silently
creates a fresh observation or confirmation. Raster branding remains appearance.

For the hub use `--operator-snapshot PATH`. To display confirmed organisation facts,
add `--operator-confirmation PATH` containing an explicit human review record:

```json
{
  "state": "approved",
  "scope": "operator-only",
  "snapshotHash": "<exact snapshot SHA-256>",
  "operatorId": "<same technical selector>",
  "origin": "<same canonical origin>",
  "legalName": "<same API operator.legalName>",
  "confirmedBy": "<human reviewer>",
  "confirmedAt": "<ISO timestamp with timezone>"
}
```

No actual operator or confirmation record is supplied by this implementation.
The record is an input contract, not legal approval or runtime verification.
Only its confirmation state is exported; reviewer identity is not copied to the
public hub. Unconfirmed raw fields remain source observations in the public
allowlisted snapshot JSON; rendered facts remain unconfirmed. Legacy current-page
builds use `ORISO_OPERATOR_SNAPSHOT` and `ORISO_OPERATOR_CONFIRMATION` with the same
contract; they contain no browser API fetch or static operator defaults.

The current legal renderer is `dsfa_draft.py`. Its source `manifest.json` accepts:

```json
{
  "operatorSnapshot": {"path": "operator-snapshot.json", "snapshotHash": "<exact hash>"},
  "operatorFieldsConfirmed": false
}
```

A human must explicitly confirm the exact snapshot in that versioned manifest.
Technical, operator and legal approval records must still approve the complete
manifest's exact hash and release version; this helper supplies none. HTML, PDF,
locale inputs and artifact manifests carry the same snapshot. The PR119 historical
`build-dsfa-page.py` and historical legal output remain byte frozen; the snapshot
contract applies to the current draft generation path.
