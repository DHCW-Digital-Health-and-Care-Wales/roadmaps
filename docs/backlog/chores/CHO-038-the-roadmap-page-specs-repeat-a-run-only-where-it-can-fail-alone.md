# CHO-038: The roadmap page's specs repeat a run only where it can fail alone

- **Status**: Proposed — part of CHO-014 (its D9)
- **Type**: Refactor
- **Area**: E2E (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-006, ADR-008, ADR-010
- **Suggested model**: Sonnet — each width or choice is weighed against the
  breakpoints and branches it could reach
- **Delivered**: _(add on delivery)_

## Summary

The roadmap page's specs take 341 s of the E2E suite's 1,215 s summed. Most of what they
check is layout, which only a browser sees, and stays. But several tests run once per
width, language or choice where the runs share one code path and cross no breakpoint,
and a few assert what a Vitest page test asserts already. Cutting those saves about
125 s and 900 lines. Done looks like: a run repeats only where the repeat can fail on
its own, and a position is checked only where it is an accessibility rule or decides
what a user can reach.

## Measurement

At `9ee767b`, twelve specs (`moved-travel`, `roadmap-items-compact`, `control-row`,
`roadmap-header`, `roadmap-controls`, `roadmap-items-cut`, `placement-navigation`,
`side-panel`, `roadmap-page`, `moved-mark`, `last-updated`, `roadmap-errors`): 128 tests,
244 runs. Candidates:

| Candidates                                                                                                                                                                                                                                                                                                                            | CI s | Finding                                                                                                                  | Verdict                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `moved-travel.spec.ts:165`, `:213`                                                                                                                                                                                                                                                                                                    | ~27  | 14 runs over the four Move choices and pointer or keyboard, one code path                                                | 5 runs, a late-close run among them                    |
| `roadmap-items-cut.spec.ts:68`–`:165`                                                                                                                                                                                                                                                                                                 | ~8   | The same ten-item page opened 16 times at two widths; the clamp does not change with width; `:187` holds the width       | Once at 375 px, two tests                              |
| `control-row.spec.ts:102` (12 runs), `:418` (6); `roadmap-items-compact.spec.ts:479` (10); `roadmap-header.spec.ts:360` (12)                                                                                                                                                                                                          | ~27  | Widths and languages beyond those each side of a breakpoint                                                              | 5, 3, 5 and 4 runs                                     |
| `control-row.spec.ts:154`, `:187`; `roadmap-header.spec.ts:399` with `placement-navigation.spec.ts:340`; `moved-mark.spec.ts:54`; `roadmap-header.spec.ts:295`                                                                                                                                                                        | ~7   | Repeat `roadmap-header.spec.ts:100`, each other, `moved-travel.spec.ts:270` and `:559`, and `publishing-roadmap.spec.ts` | Cut one of each                                        |
| `roadmap-page.spec.ts:163`, `:179`, `:214`, `:253`, `:283`, `:446`; `last-updated.spec.ts:32`, `:71`, `:90`; `placement-navigation.spec.ts:187`, `:203`, `:310`; `roadmap-items-compact.spec.ts:452`; `moved-travel.spec.ts:474`; `side-panel.spec.ts:332`; `roadmap-errors.spec.ts:36`, `:120`, `:139`; `roadmap-header.spec.ts:226` | ~20  | A Vitest page test drives the same action to the same outcome                                                            | Cut; keep `last-updated.spec.ts:114` as the round trip |
| `roadmap-page.spec.ts:348`, `:395`, dark runs                                                                                                                                                                                                                                                                                         | ~3   | The dark run's one theme check compares a token with itself                                                              | One run, unless it is made to compare a colour         |
| `roadmap-page.spec.ts`: Edit beside About's heading, the empty panel under 160 px (CHO-014's first measurement)                                                                                                                                                                                                                       | —    | A position beside assertions of behaviour                                                                                | Cut the position, keep the test                        |

Not settled: whether Vitest holds ArrowDown in the Welsh Jump to menu
(`placement-navigation.spec.ts:356`); whether `side-panel.spec.ts:206` repeats the item
dialog's Cancel tests; whether `moved-travel.spec.ts:256`, a test of a fixture, is
covered by `:213`'s late runs.

## Acceptance criteria

### S1: A run repeats only where it can fail alone

**Given** a test of the roadmap page run per width, language or choice
**When** the chore is delivered
**Then** it runs only at a width each side of a breakpoint where the page offers
different controls, in Welsh only where Welsh copy can change the layout, and once per
branch a choice takes

### S2: The cuts meet CHO-014

**Given** any test this chore cuts or trims
**When** its PR is raised
**Then** CHO-014's S2, S4, S5, S7 and S9 hold for it

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

## Out of scope

- The sticky strips, pinned bars, view transitions, hit-testing and clock races these
  specs hold: only a browser sees them, and they stay.
- Vitest tests that repeat each other: CHO-041.
