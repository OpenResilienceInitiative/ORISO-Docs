# ADR-025: UserService renders notification mails itself; the upstream MailService is neither forked nor mounted

- **Status:** Accepted — Frank, 2026-09-15
- **Implementation:** not on `dev`; exists only on branch `email-v2.1` (see Implementation status)
- **Date:** 2026-09-15 (implementation status re-measured on `dev` 2026-09-22)
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** `ADR-024` (notification matrix); `ADR-026` (tenant branding contract);
  EPIC `ORISO-Frontend#828`; `ORISO-Frontend#861` (this decision), `#869`, `#870`,
  `#859` (per-engine template dialects)
- **Scope:** how a rendered ORISO mail reaches a recipient on the notification path. Content,
  branding and switchability are elsewhere.

---

## Context

UserService historically posted notification mails to the upstream Online-Beratung mail service at
`http://mailservice.<namespace>:8080/mails/send`, which rendered Thymeleaf templates shipped inside
its own image. `OpenResilienceInitiative` has no mail-service repository — the service would run
unmodified, if it runs at all.

Two options were stated when the epic was written:

- **Fork the service into the organisation.** Full control over templates and over the Thymeleaf
  model, at the price of an upstream merge burden forever.
- **Mount an overriding `templates/` directory into the existing image.** No fork, but ORISO
  inherits whatever model variables upstream exposes, and an upstream change can break our
  templates silently.

Both were treated as exhaustive. They are not, and the question "fork or mount" is now obsolete.

UserService **already** renders catalogue mails. `OrisoEmailRenderer` reads
`src/main/resources/emails/catalogue.json` and the committed per-tone templates, and
`OrisoEmailDispatcher` sends them over SMTP; password reset, magic-link sign-in and the welcome mail
go out that way on `dev` today. Sending the notification batch through a second, foreign renderer
was the only reason the upstream service was still in the path.

## Decision

**UserService renders the notification mails itself and stops calling the upstream service for
them.** Neither a fork nor a mount.

1. A `NotificationEmailService` accepts the `MailsDTO` that `EmailNotificationFacade` already builds
   and maps the upstream template names onto catalogue occasions:

   | Upstream template name | Catalogue occasion |
   |---|---|
   | `enquiry-notification-consultant` | `neue-anfrage` |
   | `direct-enquiry-notification-consultant` | `direkte-anfrage` |
   | `assign-enquiry-notification` | `anfrage-zugewiesen` |
   | `daily-enquiry-notification` | `tagesuebersicht` |
   | `free-text`, `reassign-request-notification`, `reassign-confirmation-notification` | `mitteilung`, rendered from authored content |

2. `MailService.sendEmailNotification` calls it instead of `MailsControllerApi.sendMails`.
   `EmailNotificationFacade` above it is unchanged — the swap happens underneath, so every existing
   caller and every existing trigger keeps working.

3. **Delivery is a receipt, not a status code.** The batch resolves SMTP once through a shared
   `GlobalSmtpSettingsResolver` — the same resolution the invite path uses — then dispatches per
   recipient through `OrisoEmailDispatcher.sendOrThrow`. One recipient's failure does not sink the
   batch; the failures are counted and summarised in one `SmtpSendException`.

4. **SMTP replies never reach the log.** A reply quotes recipient addresses. Only a chain of
   exception class names is logged.

5. **The upstream service stays reachable for what has not been moved.** `sendErrorMail` — the
   deletion-workflow error mail — still goes upstream. Retiring it is a separate decision, not a
   side effect of this one.

## Implementation status (measured on `dev`, 2026-09-22)

The decision stands. It is **not implemented on `dev`**.

| Part | State |
|---|---|
| `NotificationEmailService`, `GlobalSmtpSettingsResolver` (decisions 1 and 3) | Exist only on ORISO-UserService branch `origin/email-v2.1` (last commit 2026-09-15). No pull request from that branch is open. Not on `dev`. |
| `MailService.sendEmailNotification` (decision 2) | On `dev` it still calls `MailsControllerApi.sendMails`, i.e. the upstream service. |
| Where that call goes | ORISO-Helm `templates/userservice/userservice-configmap-env.yaml` sets `MAIL_SERVICE_API_URL` to `http://mailservice.<namespace>:8080`. No chart in ORISO-Helm deploys a mail service, and no OpenResilienceInitiative repository builds one. On an environment installed only from ORISO-Helm, the notification mails (`neue-anfrage`, `direkte-anfrage`, `anfrage-zugewiesen`, `tagesuebersicht`, `mitteilung`) therefore have no renderer. This was read from the repositories; no cluster was inspected. |
| Catalogue mails outside the notification path | Rendered locally on `dev` (`OrisoEmailRenderer`, `OrisoEmailDispatcher`), as described in Context. |
| ORISO-Frontend `src/emails/dist/mailservice/` | Still generated on `dev` by `src/emails/scripts/buildMailServiceTemplates.mts`. Its README calls itself "an override rather than a fork" and cites **ADR-020** for it — the mount option this ADR rejects, under a number that belongs to scheduled calls. |

Until the branch lands, the old path is the only path. Landing it is the open work of
`ORISO-Frontend#869` / `#870` and their UserService counterpart.

## Consequences

- **There is no Helm chart for the mail service to build, and nothing to mount.** `ORISO-Frontend#869`
  changes meaning: its remaining question is whether the generated `src/emails/dist/mailservice/`
  Thymeleaf output is retired along with the path, or kept as the fallback for an environment that
  still runs the upstream service.
- **`ORISO-Frontend#870` is no longer "swap three templates in a foreign service".** Two of its three
  mails (`anfrage-zugewiesen`, and the counsellor side of `neue-nachricht`) are covered by the
  mapping above; the advice-seeker `neue-nachricht` mail has no sender at all and is new work.
- Four occasions gain a sender once this lands: `neue-anfrage`, `direkte-anfrage`,
  `anfrage-zugewiesen`, `tagesuebersicht`, plus `mitteilung` for authored operational content.
- The upstream service's Thymeleaf model stops constraining ORISO's templates. The kit's own
  placeholder set is then the only contract.
- **One risk is accepted deliberately:** UserService owns mail delivery for this path, including
  SMTP failure handling, that it previously delegated. The receipt-after-send contract and the
  per-recipient isolation exist to make that ownership visible rather than silent.
- The per-engine dialect work (`#859`) keeps its value: FreeMarker output still feeds the Keycloak
  theme, which this decision does not touch. Whether Thymeleaf output is still needed is the
  `#869` question above.
- Code that cites this decision cites it as **"ADR-020"** (UserService `OrisoEmailRenderer`,
  `InviteFrameMailRenderer`; Frontend `src/emails/dist/mailservice/README.md`,
  `buildMailServiceTemplates.mts`). The correct reference is ADR-025.
