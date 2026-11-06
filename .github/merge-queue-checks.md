# Docs merge queue checks

The read-only queue validation workflow runs for a `merge_group` candidate without path filters. It checks out the event SHA and runs the existing substantive host, legal, documentation-command, source-script, Understand tooling, public-site and publication, Health and planning contracts. It does not start release, activation, scheduled Health or model jobs.

Candidate check names:

- Queue production hosts
- Queue bilingual legal contracts
- Queue documentation commands
- Queue source CI scripts
- Queue Understand tooling contracts
- Queue public site and source contracts
- Queue documentation publication contracts
- Queue Health and planning contracts

Keep the queue disabled until this change is reviewed and merged. Then verify an actual merge-group run, its synthetic SHA, the exact emitted check names and independent concurrency before configuring required checks. Existing rules and human review remain separate.
