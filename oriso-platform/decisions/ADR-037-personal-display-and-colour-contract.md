# ADR-037: Personal display and colour contract

- **Status:** Proposed for product and engineering review, 20 November 2026.
- **Decision owner:** Frank Gerhardt (product owner).
- **Related:** [Colour-system Wayfinder](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/144), [high-contrast decision](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/150), [delivery and acceptance](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1134#reviewer-test-plan).

## Context

People need to read ORISO comfortably on different screens and in different lighting. A personal display choice belongs to the person using the interface. A provider's branding belongs to the provider. Keeping those scopes distinct lets someone increase text size or contrast without changing how the page looks for anyone else. The existing provider permissions and mail palette remain the reference for those surfaces. [Provider appearance](ADR-010-platform-controlled-per-tenant-appearance-allowlist.md) · [Mail branding](ADR-026-tenant-branding-contract-for-email.md)

## Product contract

| Area | Rule |
| --- | --- |
| Access to settings | Advice seekers get one visible **Display** entry (**Anzeige**), with the first size change reachable in two clicks. Counsellors and Admin users use their own profile. The anonymous login follows the system's light or dark scheme. |
| Appearance | **System**, **Light** and **Dark** are independent of **Standard**, **Medium** and **High** contrast and of text size. Standard keeps the familiar grey defaults. |
| Accessibility | All modes target WCAG 2.2 AA, including keyboard access, screen-reader operation, focus, reflow and applicable non-text contrast. High additionally targets enhanced text contrast at 7:1 for regular text and 4.5:1 for large text under SC 1.4.6. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Enhanced text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html) |
| Waiting area | At 150% on the reference desktop, all three cards remain in one horizontal row. On a narrow phone, each card's text fits the visible width and wraps without reducing the selected size. Arrows, swipe and step controls reach the full sequence as applicable. Verify the last card, reading order and the main action at 200% and 320 CSS px. Test browser zoom and app text size separately. [Resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) · [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) |
| Embedded 1:1 video | A light host opens a light call. A dark host opens a dark call. The widget follows the person's contrast and text size at entry and during the call. Changes keep the connection and media running. Audio-only calls and group calls retain their existing defaults. |

## Technical choices

- Use the existing colour generators and semantic roles in the applications and Storybook. Check each foreground against its actual surface, including focus, selected states, portals and native controls. The platform owns functional colour roles. Providers supply allowed seeds. A warmer or cooler neutral palette and safe accent derivatives keep the hierarchy readable. Keep the existing mail fixture and intentional illustration and avatar colours.
- Apply the effective appearance from local information before displaying the signed-in interface. Resolve the authenticated scope before reading a personal value. Reuse the supported display controls and relative text roles so the browser's base font size and zoom can still work. Test denied storage, account changes and forced system colours.
- Send scheme, contrast and text size in the 1:1 video's initial widget configuration and over the existing theme action once it is ready. Verify the host and widget values against the generated stylesheet. The active room and the media tracks must stay stable across appearance changes.

## Candidate behaviour and open decisions

The Frontend candidate uses browser storage scoped to the authenticated account and tenant. It restores settings when the signed-in app is reopened. The current Admin candidate restores settings on reload in the same tab using scoped session storage. Both currently clear the active preference on explicit sign-out. Retention after sign-out and longer-lived Admin preferences need product review. Device-to-device synchronisation is a separate decision in the same Wayfinder.

The candidates start at System, Standard and 100%. Frontend offers 90, 100, 125, 150, 175 and 200%. Admin offers 100, 125, 150 and 200%. The final size steps, automatic mapping from the OS contrast preference and the range of the provider's warm-to-cool control remain open. Existing work uses 5.5:1 for Medium regular text as a pilot target. [Provider neutral palette](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/152)

## Acceptance

Check the deployed revisions in Safari, Firefox and Chrome with advice seeker, counsellor and both Admin roles. Verify the visible controls with native assistive technology and the 1:1 video with an actual Matrix invitation and two participants. Keep the Storybook inventory, measured contrast pairs and visible before-and-after states alongside the role checks. [Developer acceptance checklist](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1134#reviewer-test-plan)
