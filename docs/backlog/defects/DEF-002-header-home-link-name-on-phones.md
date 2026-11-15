# DEF-002: On a phone, the header's home link is named without the word it shows

- **Status**: Proposed — triaged by the owner, 2026-11-15 (D1)
- **Severity**: Low — speech-input users on a phone may not reach the home link by saying
  what they see; axe reports a WCAG 2.2 AA failure (2.5.3 Label in Name)
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-008, ADR-010
- **Suggested model**: Sonnet — one link's name and a copy choice
- **Delivered**: _(add on delivery)_

## Summary

Below 640px the header's home link shows the DHCW icon and the short name "Roadmaps",
but its accessible name is "DHCW Roadmap Editor home", which does not contain
"Roadmaps". axe's `label-content-name-mismatch` rule fails it on every page at phone
width in English; in Cymraeg the short name happens to sit inside the long one, so it
passes. The existing accessibility spec runs axe at desktop width only, so nothing
caught it. Workaround: none needed for keyboard or screen-reader users.

## Reproduce

At `7c8d4c0` (the header is unchanged on STY-021's branch, where it was seen):

1. Set the viewport to 375px wide, English, and open any page (connected or not).
2. Run axe with the WCAG 2.2 AA tags (`tests/e2e/accessibility.spec.ts`'s helper).

**Expected**: no violations.
**Actual**: `label-content-name-mismatch` on the home link (`.-ml-1`).

## Cause

Verified: `AppHeader` (`src/components/layout/app-header.tsx`) gives the link
`aria-label={t("layout.home")}` ("DHCW Roadmap Editor home") while below `sm` it shows
`common.shortAppName` ("Roadmaps").

- `rg -n 'layout.home|shortAppName' src` — the link in `app-header.tsx` is the only
  site where the two meet.

## Acceptance criteria

### S1: The home link's name contains what it shows, at every width

**Given** the header at 375px wide, in English and in Cymraeg
**When** axe runs with the WCAG 2.2 AA tags over the whole page
**Then** it reports no `label-content-name-mismatch`

## Open questions _(while Needs grilling)_

- A product choice: change the short name so it sits inside the full name (for example
  "Roadmap Editor"), or name the link by what it shows below `sm`. The header's width
  budget in Cymraeg (STY-016 D6) limits the first.

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): the link is named by what it shows, followed by "home": below `sm` its name starts "Roadmaps", above it the service name. The short name is unchanged, since the header's width in Cymraeg limits it (STY-016 D6). An axe scan of the header at 375 px holds it.

## Delivery _(add on delivery; as in `story.md`)_
