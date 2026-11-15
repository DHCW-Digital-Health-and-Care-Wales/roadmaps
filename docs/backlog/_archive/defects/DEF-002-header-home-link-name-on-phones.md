# DEF-002: On a phone, the header's home link is named without the word it shows

- **Status**: Done
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

## Open questions _(answered: see Decisions)_

- A product choice: change the short name so it sits inside the full name (for example
  "Roadmap Editor"), or name the link by what it shows below `sm`. The header's width
  budget in Cymraeg (STY-016 D6) limits the first.

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): the link is named by what it shows, followed by "home": below `sm` its name starts "Roadmaps", above it the service name. The short name is unchanged, since the header's width in Cymraeg limits it (STY-016 D6). An axe scan of the header at 375 px holds it.

## Delivery

The cause was as stated. The home link no longer has an `aria-label`: it is named by the
visible name span (`aria-labelledby`), which holds the name shown at that width and a
screen-reader-only "home" (`layout.homeSuffix`). Below `sm` the name is "Roadmaps home";
from `sm`, "Roadmap Editor home"; in Cymraeg "Mapiau Trywydd hafan" and "Golygydd Mapiau
Trywydd hafan". The `aria-labelledby` names the link from that span alone, so the hidden
name and the logo's alternative text are not in it. `layout.home` is gone, and the logo
keeps its own alternative text.

### Departures

- **Welsh word order** (agent): the Welsh says "hafan" after the name, as D1 says "home"
  does in English, though a Welsh speaker would put "Hafan" first. A leading "Hafan"
  would need a second, per-language slot for one word; the strings are for the fluent
  read of `cy.ts` that the launch already needs (README, _Languages_).
- **No short name change** (D1): `common.shortAppName` is unchanged.

### Contract for dependents

The home link's accessible name is "<name shown> home" and no longer "DHCW Roadmap Editor
home": a test locates it by that, and an aria snapshot of the header holds it.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1       | `accessibility.spec.ts` (`the header at 375px wide in en`: axe over the whole page, red before the fix; Cymraeg passed before it), `shell.spec.ts` (`the home link is named by the name it shows, then "home", at each width`, red before the fix), `app-shell.test.tsx` |
