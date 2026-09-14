# ADR-025: The design system replaces the upstream MailService path rather than forking or mounting

- **Status:** Accepted — Frank, 2026-09-15. Recorded after implementation.
- **Date:** 2026-09-15
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
its own image. `OpenResilienceInitiative` has no mail-service repository — the service runs
unmodified.

Two options were stated when the epic was written:

- **Fork the service into the organisation.** Full control over templates and over the Thymeleaf
  model, at the price of an upstream merge burden forever.
- **Mount an overriding `templates/` directory into the existing image.** No fork, but ORISO
  inherits whatever model variables upstream exposes, and an upstream change can break our
  templates silently.

Both were treated as exhaustive. They are not.

A third property of the situation made the choice moot: UserService **already** renders catalogue
mails. `OrisoEmailRenderer` reads `src/main/resources/emails/catalogue.json` and the committed
per-tone templates, `OrisoEmailDispatcher` sends them over SMTP, and six occasions were already
being delivered that way. Sending the notification batch through a second, foreign renderer was the
only reason the upstream service was still in the path.

## Decision

**UserService renders the notification mails itself and stops calling the upstream service for
them.** Neither a fork nor a mount.

1. `NotificationEmailService` accepts the `MailsDTO` that `EmailNotificationFacade` already builds
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

3. **Delivery is a receipt, not a status code.** The batch resolves SMTP once through
   `GlobalSmtpSettingsResolver` — the same resolution the invite path uses, extracted so both share
   it — then dispatches per recipient through `OrisoEmailDispatcher.sendOrThrow`. One recipient's
   failure does not sink the batch; the failures are counted and summarised in one
   `SmtpSendException`.

4. **SMTP replies never reach the log.** A reply quotes recipient addresses. Only a chain of
   exception class names is logged.

5. **The upstream service stays reachable for what has not been moved.** `sendErrorMail` — the
   deletion-workflow error mail — still goes upstream. Retiring it is a separate decision, not a
   side effect of this one.

## Consequences

- **There is no Helm chart for the mail service to build, and nothing to mount.** `ORISO-Frontend#869`
  changes meaning: its remaining question is whether the generated `src/emails/dist/mailservice/`
  Thymeleaf output is retired along with the path, or kept as the fallback for an environment that
  still runs the upstream service.
- **`ORISO-Frontend#870` is no longer "swap three templates in a foreign service".** Two of its three
  mails (`anfrage-zugewiesen`, and the counsellor side of `neue-nachricht`) are covered by the
  mapping above; the advice-seeker `neue-nachricht` mail has no sender at all and is new work.
- Four occasions gain a sender the moment this lands: `neue-anfrage`, `direkte-anfrage`,
  `anfrage-zugewiesen`, `tagesuebersicht`, plus `mitteilung` for authored operational content.
- The upstream service's Thymeleaf model stops constraining ORISO's templates. The kit's own
  placeholder set is now the only contract.
- **One risk is accepted deliberately:** UserService now owns mail delivery for this path, including
  SMTP failure handling, that it previously delegated. The receipt-after-send contract and the
  per-recipient isolation exist to make that ownership visible rather than silent.
- The per-engine dialect work (`#859`) keeps its value: Thymeleaf output is still generated, and
  FreeMarker output still feeds the Keycloak theme, which this decision does not touch.
