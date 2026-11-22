# CHO-041: The Vitest suite asserts each rule once, at its lowest seam

- **Status**: Proposed — part of CHO-014 (its D9); after CHO-037 to CHO-040, which move assertions into the same files
- **Type**: Refactor
- **Area**: Features/UI + Domain (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: CHO-037, CHO-038, CHO-039, CHO-040 (preferred order: they add
  assertions to these files)
- **Binding ADRs**: ADR-002, ADR-006
- **Suggested model**: Sonnet — each pair of tests is compared case by case before one
  goes
- **Delivered**: _(add on delivery)_

## Summary

The Vitest suite (133 files, 44,654 lines) asserts some rules twice: a page test
re-asserting what a unit test of the same function holds with nothing added, two page
tests driving the same case from different files, and cases that differ only in data
that takes no new branch. None of it is slow; it is lines every agent reads before
changing the code. Merging or cutting them saves a few hundred lines. Done looks like:
each rule's cases sit at the lowest seam that holds them, with one test of the wiring
above.

## Measurement

At `9ee767b`, found while auditing the E2E specs against these files
(`roadmap-detail-page-<name>.test.tsx` as `<name>.test`):

| Candidates                                                                                                                                                                                | Finding                                                                                                                                                                         | Verdict                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `details.test:357`, `:460`, `:482`, `:496`, `:511`; `tags.test:247`, `:260`, `:291`, `:302`, `:419`, `:472`, `:650`; `tags.test:438`, `:455`, `:495`, `:507`; `ordering.test:306`, `:521` | Re-assert `details-outline.test.ts`, `item-tags.test.ts`, `opening-field.test.tsx` and `pending-orders.test.ts` through the page; `tags.test:507` is `:438` and `:495` together | Keep a page test only where it asserts focus, an announcement or the card |
| `editing.test:927`                                                                                                                                                                        | A row of `:878`'s table                                                                                                                                                         | Fold in                                                                   |
| `quick-add.test:604`, `:751`                                                                                                                                                              | `adding.test:427`, `:1197` by another way into the dialog                                                                                                                       | Cut                                                                       |
| `editing.test:1073`, `:1094`, `:1120`; `publishing-roadmap.test:400`; `adding.test:872`                                                                                                   | One hold on a lost answer or ended session, five times; `publishing-roadmap.test:400` and `editing.test:1073` read as one case                                                  | Merge                                                                     |
| `items.test:684`–`:719`; `header.test:371`; `roadmap-detail-page.test.tsx:129`                                                                                                            | Repeat `header.test:160`, `:170`, `:202`; `header.test:356`; `items.test:494`                                                                                                   | Cut                                                                       |
| `app.test.tsx:91`, `:158`, `:233`, `:247`, `:262`, `:271`                                                                                                                                 | Repeat `language-switcher.test.tsx`, `theme-menu-item.test.tsx`, `account-menu.test.tsx`, `app-shell.test.tsx:66`, `app.test.tsx:288`, `:318`                                   | Cut                                                                       |
| `app-shell.test.tsx`, its structural tests in both languages; `unpublished-changes.test.tsx:168`; `families-page.test.tsx:576`; `roadmaps-page-adding.test.tsx:160`                       | Run per language with nothing language-dependent; repeat `:120`, `roadmaps-page.test.tsx:82`, `:177`                                                                            | Cut                                                                       |
| `connection-status.test.tsx`; `account-menu.test.tsx:38`, `:63`; `app.test.tsx:212` and the rows of "explains why it is not connected"; two rows of `reconnect-dialog.test.tsx:190`       | Repeat `app.test.tsx:107`–`:158` and `auth-notice.test.tsx:30`, `:65`; rows differing only in their start state                                                                 | Cut                                                                       |
| `session-warning.test.tsx:112` with `:259`, `:140` with `:182`; `auth-notice.test.tsx:219` with `app.test.tsx:53`, `:180`                                                                 | Pairs that set up one state for two small checks                                                                                                                                | Merge                                                                     |
| `pending-changes.test.ts:719`, `:808`, `:927`; `:940`–`:1050`; `publish-plan.test.ts:379`, `:398`, `:414`, `:1371`                                                                        | One lost-publish rule per field; one found-by-content rule in three blocks; moves `item-moves.test.ts` holds                                                                    | One table each; cut the moves `item-moves.test.ts` holds                  |

## Acceptance criteria

### S1: A rule's cases sit at its lowest seam

**Given** a rule asserted alike in a unit test and a page or component test
**When** the chore is delivered
**Then** the unit test holds its cases, and the page test stays only for what the unit
cannot see: focus, an announcement, the card, the wiring

### S2: No two tests assert one case

**Given** two Vitest tests that drive the same case to the same outcome
**When** the chore is delivered
**Then** one remains, and cases differing only in data that takes no new branch are
one table-driven test

### S3: The cuts meet CHO-014

**Given** any test this chore cuts or merges
**When** its PR is raised
**Then** CHO-014's S4, S5, S8 and S9 hold for it

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

## Out of scope

- The Sheets adapter's own tests, its parsers, the spreadsheet fake's tests and
  `google-auth-client.test.ts`: the switch deletes them (CHO-014 D13).
- The repository contract's run against the in-memory repository, which stays whole
  (CHO-014 D13).
