# CHO-042: Every sideways-scroll check uses one helper

- **Status**: Done
- **Type**: Refactor
- **Area**: E2E (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: CHO-036, CHO-037, CHO-038, CHO-039, CHO-040 (preferred order:
  fewer sites remain after them)
- **Binding ADRs**: ADR-006
- **Suggested model**: Haiku — one expression replaced by one call at each site
- **Delivered**: [PR #262](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/262)

## Summary

Reflow on a phone is an accessibility rule axe does not check, and the suite holds it
by asking whether the page scrolls sideways (CHO-014 D2). The question is written out
by hand in fifteen specs, though `apps/editor/tests/e2e/fixtures/layout.ts` exports
`scrollsSideways`. Done looks like: every such check calls the helper, at 375 px.

## Measurement

At `9ee767b`, `rg -n 'scrollWidth' apps/editor/tests/e2e` finds 32 lines: one in the
helper, 31 in fifteen specs, most of them `documentElement.scrollWidth` set against
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

## Delivery

### Departures

- Re-counted at delivery on `65a6b09b` (CHO-041 merged), not `9ee767b`:
  `rg -n scrollWidth apps/editor/tests/e2e` finds 28 lines, of which 16 were page-level
  expressions (the whole document's width against its viewport's) in eight specs, and 12 remain, all
  element-own checks or the helper itself. At `9ee767b` there were 32 lines, 21 of them
  `documentElement.scrollWidth`; the earlier sub-chores cut 4 of those page-level checks
  (21 to 17, counting the helper's), so 16 remained for this chore.
- Several specs wrapped the expression in a local helper or closure (`horizontalOverflow`
  in `shell`, `navigation-welsh` and `navigation-width`; `overflow` and `sideways` in
  `editing`); each is removed, and its callers call `scrollsSideways` and assert
  `toBe(false)`. The
  numeric `toBe(0)` and `toBeLessThanOrEqual(0)` assertions become the boolean they
  always meant: no overflow.
- Three sites compared against `window.innerWidth`: two in `roadmap-controls` (`scrollWidth
<= innerWidth`) and one in `roadmaps` (`scrollWidth - innerWidth`); the helper compares
  with `clientWidth`. The two
  differ only by a vertical scrollbar, which the suite's headless browser does not draw,
  so the comparison is unchanged in practice.
- Element-own checks stay: `shell` (the service name's own box), `control-row` (a label),
  `roadmap-controls` (each control), `roadmap-items-compact` (a description, a long title
  and a flag, five sites), and the `placement-navigation` comment that names the check
  below it.
- Assertions of the existing tests are unchanged in what they check: only the expression
  and its comparison are replaced. No viewport changed; every check at 375 px is still
  at 375 px.

### Scenario evidence

- S1 (one helper): `rg -n 'document.documentElement.scrollWidth' apps/editor/tests/e2e`
  finds only `fixtures/layout.ts`. Every check of the page's sideways scroll in the
  touched specs calls `scrollsSideways` at the width its test already set (375 px where
  the test set it; no width changed).
- Local: `pnpm lint`, `pnpm typecheck`, `pnpm format:check` pass. The E2E specs of the
  eight touched files ran locally: 167 passed, exit 0, on `9c7a3d31`'s tree.
