# US#1601 converted Live Chat guest: Dev re-run evidence (2026-11-18)

Frontend PRs: OpenResilienceInitiative/ORISO-Frontend#2335 (sign-out, gates, finished chat, availability)
and #2336 (login-password recovery, form kit).

How it was run: a local production bundle of both PR heads (#2335 `a3a921e`, #2336 `c4bda30`)
was served to the guest browser and the fresh sign-in by Playwright. API, Keycloak and Matrix were
the real `dev.oriso.org`. The counsellor was the synthetic test account `ling.bouvier`
(signed in through the test-access broker). The guest was created through the real invite UI.

`before-*` images come from the original failing run against Dev frontend `v2.0.16 - 41c4bc3`.
`journeyFix.cjs` is the journey script. It reads the invite token from a private local file
and never prints it.

Result (run 5, also seen in runs 1 to 4):
- the conversion shows only the password form and finishes in about 3 s on the first click;
- sign-out sends neither `PUT /conversations/anonymous/{id}/finish` nor the availability PUT;
- a fresh sign-in shows no recovery dialog, no recovery snackbar, no name gate and no new
  display name, and both messages are decrypted;
- after the converted person ends the chat, the history stays visible, with the closed notice
  and mail counselling shown and no composer;
- settled form-kit labels sit on the outline (`translate(12px,-7px)`), 7 px clear of the text.
