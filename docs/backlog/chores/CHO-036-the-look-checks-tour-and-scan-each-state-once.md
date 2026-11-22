# CHO-036: The look checks tour and scan each state once

- **Status**: Proposed — part of CHO-014 (its D9); the largest saving for the least work, so first
- **Type**: Refactor
- **Area**: E2E (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-006, ADR-010
- **Suggested model**: Sonnet — a scoped tour helper and a judgement per scan of
  whether its state is another scan's
- **Delivered**: _(add on delivery)_

## Summary

The focus tours and axe scans are 41% of the E2E suite's time, and they stay in both
themes (CHO-014 D7). Two page tours walk a whole page that another tour already walks,
for the sake of a few stops of their own, and a few scans scan a state another scan
holds. Scoping the two tours to their own stops and dropping the repeated scans saves
about 70 s of the 1,215 s summed, with every stop and every state still checked in both
themes. Done looks like: each tour and scan holds stops or a state no other one holds.

## Measurement

At `9ee767b`, from CI's per-test times (both themes summed):

| Test                                                                                  | CI s | Finding                                                                                                                                                      | Verdict                                                                   |
| ------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `focus-indicator.spec.ts:410`, a co-lead's review                                     | 36.9 | Never opens the review: after the refused publish it tours the whole ProductA page, the page `:282` tours, with a refusal notice added                       | Tour the notice's stops, or the review dialog if that was the intent (S2) |
| `focus-indicator.spec.ts:316`, a roadmap not published                                | 45.4 | After four checks of its own stops, tours the whole long ProductC page, whose card stops are `:282`'s                                                        | Tour the banner, header and product details alone                         |
| `focus-indicator.spec.ts:348`, the item dialog shut then open                         | 20.7 | The shut tour's stops are mostly the open tour's and `:375`'s                                                                                                | Optional; it also holds the wrap to the first stop                        |
| `accessibility.spec.ts:814`, `:887`, `:909`                                           | ~15  | `:814` and `:887` scan the same form of the same item (both Welsh-locked notes); the three set up the same empty fields                                      | Merge; one scan of that form                                              |
| `accessibility.spec.ts:131`, roadmap detail                                           | ~4   | The same state as the first scan of `:261`                                                                                                                   | Remove                                                                    |
| `accessibility.spec.ts:1175` (English run), `:395` (English scan), `:670` (last scan) | ~6   | Each scans a state the full-page 375 px scans already scan                                                                                                   | Trim                                                                      |
| `typography.spec.ts`, the body's font family                                          | <1   | `styles.spec.ts:43` asserts it                                                                                                                               | Remove the repeat                                                         |
| `accessibility.spec.ts` and `styles.spec.ts`                                          | —    | Each declares its own themes and its own check that the page is in the theme asked for, though `fixtures/look.ts` exports them (CHO-014's first measurement) | Share                                                                     |

Not settled: whether the drawer tails of `accessibility.spec.ts:307` and `:335`, and the
in-between states of `:768` and `:836`, find anything their neighbours do not; run
axe on each pair before cutting one. No structure snapshot repeats a Vitest test.

## Acceptance criteria

### S1: A page tour tours only stops no other tour reaches

**Given** a page tour whose page another tour walks whole
**When** the chore is delivered
**Then** it tours only the stops that page has and the other's does not, through a
helper that tours a region and still fails on a stop it misses
**And** every stop toured at `9ee767b` is still toured, in both themes

### S2: The co-lead's review is toured as its title says

**Given** the tour named for a co-lead's review
**When** the chore is delivered
**Then** it tours the review dialog's controls, or is renamed for the notice it tours,
as the owner chooses in its PR

### S3: Each axe scan scans a state no other scan holds

**Given** two scans of one state
**When** the chore is delivered
**Then** one remains, in both themes
**And** the PR names each scan removed and the scan that holds its state, for the
owner's word, since CHO-014's S4 keeps every axe scan

### S4: The cuts meet CHO-014

**Given** any test this chore cuts or trims
**When** its PR is raised
**Then** CHO-014's S4, S5 and S9 hold for it

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

## Out of scope

- Running a tour or scan in one theme: the owner keeps both (CHO-014 D7).
