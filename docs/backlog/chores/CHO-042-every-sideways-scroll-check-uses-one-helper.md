# CHO-042: Every sideways-scroll check uses one helper

- **Status**: Proposed — part of CHO-014 (its D9) and its S3; last, once the other sub-chores have cut what they cut
- **Type**: Refactor
- **Area**: E2E (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: CHO-036, CHO-037, CHO-038, CHO-039, CHO-040 (preferred order:
  fewer sites remain after them)
- **Binding ADRs**: ADR-006
- **Suggested model**: Haiku — one expression replaced by one call at each site
- **Delivered**: _(add on delivery)_

## Summary

Reflow on a phone is an accessibility rule axe does not check, and the suite holds it
by asking whether the page scrolls sideways (CHO-014 D2). The question is written out
by hand in fifteen specs, though `apps/editor/tests/e2e/fixtures/layout.ts` exports
`scrollsSideways`. Done looks like: every such check calls the helper, at 375 px.

## Measurement

At `9ee767b`, `rg -n 'scrollWidth' apps/editor/tests/e2e` finds 31 lines: one in the
helper, 30 in fifteen specs, most of them `documentElement.scrollWidth` set against
the viewport's width. A hit measuring one element's own scroll is a different check
and stays.

## Acceptance criteria

### S1: Reflow is checked by one helper

**Given** a spec that checks the page does not scroll sideways
**When** the chore is delivered
**Then** it calls `scrollsSideways`, and no spec writes the expression itself
**And** every screen checked at 375 px at `9ee767b`, and not cut by another
sub-chore, is still checked at 375 px

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone; it delivers CHO-014's S3.
