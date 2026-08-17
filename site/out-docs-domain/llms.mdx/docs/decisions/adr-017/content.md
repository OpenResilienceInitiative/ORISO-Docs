# ADR-017: Rebuild chat threads on native Matrix `m.thread` relations — hard cut, no dual-read (/decisions/adr-017)



* **Status:** Accepted — Frank, 2026-07-18 (grill-with-docs session)
* **Date:** 2026-07-18
* **Deciders:** Frank (product) + AI (engineering)
* **Related:** [ADR-004](/decisions/adr-004) (keep own UI, adopt Matrix SDK), [ADR-016](/decisions/adr-016) (Team-Besprechung is flat — does not depend on this), memory `feedback-no-prod-users-skip-migration`, memory `oriso-team-besprechung-design`

***

## Context [#context]

Audit of `origin/pre-dev` (2026-07-18): the existing threads feature is **fully custom** — thread membership is carried as a plaintext token `[THREAD:<rootEventId>]` prepended to the message body (`messageConstants.ts`), parsed back out client-side per message. There is zero use of MSC3440 / matrix-js-sdk native threads, although the shipped SDK (v38) supports them completely. Consequences: no interop (other Matrix clients see the raw token), summaries/counts only over currently-loaded messages, no thread pagination, no per-thread read receipts, association breaks on root edit/redaction. Frank wants threads extended, so the base must become sound first.

## Decision [#decision]

Migrate the send **and** read path to native Matrix threads (`m.relates_to: { rel_type: "m.thread", event_id, is_falling_back: true, "m.in_reply_to": … }`; UI driven by `room.getThreads()` / `Thread` timelines / threaded receipts). &#x2A;*Hard cut:** the `[THREAD:]` prefix convention and its parser are deleted entirely — no dual-read compatibility path. Pre-existing prefix messages render as ordinary flat messages; a minimal render filter strips any leftover visible `[THREAD:…]` token from message bodies (cosmetic only, no thread semantics attached).

## Considered options [#considered-options]

* **Extend the custom prefix system.** Rejected: reimplements what the SDK provides, keeps all listed defects, and adds more `[THREAD:]` legacy data the longer it lives.
* **Dual-read transition (native first, prefix fallback).** Rejected under the house rule "no prod users → don't carry migration burdens": pre-dev data is disposable, and the parser is precisely the legacy we want gone. Two permanent read paths for disposable data is a bad trade.

## Consequences [#consequences]

**Positive:** Element-grade thread capabilities (thread list, pagination, per-thread unread/receipts, cross-client interop) become available from the SDK instead of hand-built; the custom notification endpoints (`thread.reply.new` etc.) remain as an overlay and keep working. &#x2A;*Cost:** existing pre-dev thread conversations flatten (accepted — no production users); the send path (`matrixClientService.sendMessage`) and read path (prefix parsing → `event.getThread()`) are a real rebuild, not an incremental patch.
