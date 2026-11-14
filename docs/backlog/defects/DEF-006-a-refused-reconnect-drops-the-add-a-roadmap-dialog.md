# DEF-006: A reconnect Google refuses drops the "Add a roadmap" dialog and what was typed

- **Status**: Needs triage — found by STY-041's review (Sol, round 1)
- **Severity**: Low — a Product Lead loses a title, a short name and up to three other
  values typed into the dialog, after declining Google's own request for access
- **Area**: Features/UI
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: ADR-003, ADR-012
- **Suggested model**: Sonnet — one page's rule for a failed connection, with its tests
  and snapshots
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead is filling in "Add a roadmap" when the session expires. The dialog
offers Reconnect and keeps what was typed (STY-041 S11). If Google then refuses the
reconnect outright (access is declined, the access asked for isn't granted, or sign-in
can't load), the roadmap list is replaced by the start page, as it is for any failed
connection, and the dialog and its text go with the list. A Reconnect whose window is
blocked or closed keeps both, and says why in the dialog. Workaround: type it again
after connecting. Since STY-041; the same rule will meet every dialog that writes at
once.

## Reproduce

At STY-041's head, `aee3296`, since the dialog is not on the default branch until its
PR merges; the rule itself is on the default branch at `48b35d8` (`HomePage`). As a
Vitest page case built on `roadmaps-page-adding.test.tsx`:

1. Connected, open "Add a roadmap" and type a title.
2. Set the session to `expired`: the dialog says so and offers Reconnect.
3. Set the session to `error` with `access-denied`, as a refused reconnect does.

**Expected**: to be decided (_Open questions_).
**Actual**: the start page shows, with the reason; the dialog is gone, and after
connecting again "Add a roadmap" opens blank.

## Cause

Verified: `HomePage` (`src/features/home/pages/home-page.tsx`) shows `RoadmapsPage`
only while the session is `connected` or `expired` (or `connecting` from either), so
`error` unmounts it, and `RoadmapDialog` and its form's state with it.

- `rg -n 'hasSession' src` — 1 site: `src/features/home/pages/home-page.tsx`.

## Open questions

The right outcome is a product choice, not a fault against a written scenario: a
failed connection has shown the start page since the first sign-in story, and S11
speaks only of reconnecting.

1. **What should a refused reconnect do to an open dialog?**
   - (a) Keep today's rule (recommended while this is rare): the start page shows the
     reason, and the text is lost. Nothing to build; this record closes as Won't fix.
   - (b) Stay on the roadmap list after a refused reconnect, as after a blocked one:
     the list and the dialog stay, the page notice says why, and Reconnect is offered
     again. Changes what every failed reconnect shows, with its tests and snapshots.
   - (c) Keep the text only: the start page shows, and the dialog opens again with
     what was typed once connected. Adds a place to keep an unsent roadmap.

## Decisions

## Delivery _(add on delivery)_
