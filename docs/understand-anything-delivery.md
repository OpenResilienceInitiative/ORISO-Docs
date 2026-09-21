# How the knowledge graph reaches the people and jobs that read it

This describes the *delivery* of the Understand Anything graph, not how it is
built. For the producer's internals, the graph contract and the relationship
semantics, read `tools/understand-anything/README.md`.

## In one paragraph (ORISO-Docs#129)

Once a day GitHub Actions builds one generation from the **`main`** branch of
every public ORISO repository — released code, not whatever reached `dev` that
evening — and publishes it on the `ua-graph-latest` release of this repository.
**understand.oriso.org** downloads that release every morning, shows it in its
dashboards, and serves the complete generation under `/ua/`. Everything else
reads from there: `ua-pull` for developers and agents, the AI PR reviewer from
the release directly. Nothing is built on PreDev or on the website server any
more, and no repository commits generated graphs.

```
02:40 UTC  ua-graph-refresh.yml (main)  ->  release ua-graph-latest
04:15 UTC  understand.oriso.org: site/ua-site-sync.sh
             -> dashboards, /status.json, /ua/current (ua-pull)
```

The schedule only fires from the repository's default branch, `main`, so the
workflow reaches production through the normal release PR `dev -> main`.

## The problem this replaced

The producer ran as a root cron on the PreDev host:

```
17 */2 * * * /opt/oriso-understand/_rebuild/ua-refresh.sh >> /var/log/ua-refresh.log 2>&1
```

It published into `/opt/oriso-understand/published`. Consumers fetched from
there with `ua-pull`, over SSH, into a cache **outside** the Git checkout — the
tooling README is explicit that the client "does not overwrite tracked graphs".

The AI PR reviewer (`ai-pr-review.yml` in ORISO-Frontend and ORISO-Admin) runs
on a GitHub-hosted runner. It has no SSH access to PreDev, never called
`ua-pull`, and read `.understand-anything/` straight from the checkout. So it
could only ever see the copy a person had last committed by hand.

That left two different artefacts under one name:

| | Fresh generation | Committed copy |
| --- | --- | --- |
| Built by | the PreDev cron, every two hours | a person, occasionally |
| Lives in | a cache outside the checkout | the repository |
| Read by the reviewer | never | always |

On 2026-09-19 the committed Frontend graph was built from a commit **764
commits** behind `dev`, and nothing anywhere said so. The reviewer was told to
treat it as mandatory context.

Two further facts made this urgent rather than merely untidy. PreDev is being
decommissioned, so the only producer was on a machine that is going away. And
`tools/understand-anything/provenance/activation.md` states plainly that it "is
an activation plan, not evidence that activation has happened" — nobody had
established that the scheduled run still produced anything.

## What runs now

`.github/workflows/ua-graph-refresh.yml`, daily (from `main`) and on demand:

1. Installs the pinned toolchain from `tools/understand-anything/` inside the
   Node image named in `toolchain.lock.json`.
2. Reads the input inventory from `bundle.pipeline.REPOS` — the tooling stays
   the single source of truth — and clones each input at its pinned branch.
3. Builds one complete generation, then runs `bundle refresh verify`, which
   re-fetches every source ref and checks the full SHA in the manifest. That is
   the difference between "a generation exists" and "this generation is the code
   that is on `main` right now".
4. Publishes each graph as a release asset on the rolling `ua-graph-latest`
   tag of this repository, plus the generation's `manifest.json` when no graph
   was withheld, so the website can reassemble the complete generation.

Measured: a full 16-input generation takes **under three minutes**.

Consumers fetch over plain HTTPS, no credential:

```
https://github.com/OpenResilienceInitiative/ORISO-Docs/releases/download/ua-graph-latest/<repository>.tar.gz
```

## Why the archive is attested

The consumer is an AI reviewer holding a write-capable token. HTTPS proves who
served the bytes, not that they are a graph this organisation built, and the tag
is rolling — so a compromised publisher or release could feed attacker-chosen
content into a session that can push.

The workflow therefore packs, attests and uploads as three separate steps:
`actions/attest-build-provenance` runs between packing and uploading, so the
attested bytes and the published bytes are the same bytes. Consumers verify
before unpacking:

```bash
gh attestation verify graph.tar.gz \
  --repo OpenResilienceInitiative/ORISO-Docs \
  --signer-workflow OpenResilienceInitiative/ORISO-Docs/.github/workflows/ua-graph-refresh.yml
```

A failed verification is not fatal: the review runs without a graph and says so. Refusing to review because a download could not be verified
would be worse than reviewing against a graph whose age is stated.

## Why a graph is installed only after validation

The consumer stages the archive, checks that all three generated files are
present and non-empty and that `meta.json` carries a 40-character commit hash,
and only then moves them into place one by one. A truncated archive must never
be mixed into a working tree — that reads as a successful refresh and is much
harder to notice than a missing one. The website sync applies the same rule to
the whole generation: nothing is installed until every archive has passed.

## Why release assets rather than commits

The producer emits about 50 MB of JSON for UserService alone, roughly 250 MB
raw across the platform. Committing that per run would add hundreds of megabytes
of history per month to repositories developers clone daily. The same generation
compresses to about 12 MB, and the largest single asset is 3.4 MB.

Generated graph files are therefore **not committed** in any repository any
more (ORISO-Docs#129): the old copies were a month behind and read as current.
Each repository's `.gitignore` excludes them. The hand-written prose in
`.understand-anything/` — `ARCHITECTURE.md`, `ONBOARDING.md`, `FINDINGS.md`,
`ORISO-ECOSYSTEM.md` — stays in Git.

## Why not simply give CI an SSH key to PreDev

That was the obvious shortcut and it is the wrong one. The reviewer job installs
a third-party CLI and runs it with a write-capable token; the workflow's own
comments call that "a prompt-injection / supply-chain surface" and pin the CLI
version because of it. Adding a production SSH key to that job contradicts a
judgement the team had already made. The release channel needs no secret at all.

## The privacy boundary

This repository is public, so every asset is world readable. A graph describes a
repository's structure — paths, symbols, call relationships — so publishing the
graph of a private repository would publish that structure. The supergraph and
the platform graph merge every input and therefore inherit the most restrictive
input's visibility.

`.github/scripts/ua_publish_graphs.py` re-derives this from the generation's own
manifest rather than trusting its caller, and treats an unproven visibility as
private so that a transient API error cannot become a disclosure. The decision
is covered by `.github/scripts/test_ua_publish_graphs.py`.

`ORISO-E2E` and `ORISO-Infra` are private and are **not in the inventory at
all**: their structure must never reach the public website. The filter above
stays as a second guard in case one is ever added back, and the website sync
refuses to install either name whatever the channel carries.

## What a refresh does **not** fix

A graph carries two kinds of knowledge, and only one of them is regenerated.

**Structural** — files, symbols, call relationships — is re-derived from source
every run and is current the moment the run is green.

**Semantic** — the summaries in `tools/understand-anything/enrichments/*.json` —
is not. `lib/semantic-claims.mjs` promotes a claim to `source-current` only when
it carries a reviewed source binding: a `sourceCommit`, a `reviewedAt`, a
confidence level, and evidence whose line ranges and fingerprints still match the
node. A changed source makes it `stale`. A missing binding makes it `unbound`.
Either way the summary still appears, prefixed:

```
[Dated orientation; unbound — verify current source] A Vite-built React single-page application that ...
```

As of the first CI generation, the platform had **205 semantic claims and none
of them was source-bound** — 0 `source-current`, 0 `stale`, 205 `unbound`. No
schedule can change that number. Binding a claim means a person re-reads the
source and records the evidence. The workflow prints the split on every run so
the gap stays visible instead of being implied away by a green tick.

## Operating it

- **Force a refresh:** run the workflow from the Actions tab. Clear `publish` to
  build and check a generation without touching the channel.
- **Check what consumers are getting:** the job summary lists every repository
  with its node and edge counts and its semantic split. The manifest is attached
  as an artifact for 30 days.
- **Website:** `tools/understand-anything/site/ua-site-sync.sh` runs from root's
  crontab on understand.oriso.org as `/opt/oriso-understand/_site/ua-site-sync.sh`
  (`15 4 * * *`, log `/var/log/ua-site-sync.log`); after each successful run it
  replaces itself with the copy from the ORISO-Docs `main` commit it installed. Run it by hand after a manual workflow run. The
  start page's date and counts come from `/status.json`, which the script writes;
  the start page itself is `tools/understand-anything/site/hub/` and ships with
  the ORISO-Docs `main` commit.
- **A consumer could not fetch:** the step is fail-soft, says so in the job
  summary and as a warning annotation, and the review runs without a graph.
