# CHO-039: The shell, list and navigation specs hold only what their page tests cannot

- **Status**: Proposed — part of CHO-014 (its D9)
- **Type**: Refactor
- **Area**: E2E + Features/UI (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-002, ADR-006, ADR-008
- **Suggested model**: Sonnet — each test is weighed against the page test or
  repository contract test that may hold it
- **Delivered**: _(add on delivery)_

## Summary

The specs for the shell, the roadmaps list, families and the navigation take 123 s of
the E2E suite's 1,215 s summed, and two thirds of it repeats Vitest: their navigation
states, list behaviour and roadmap dialogs are held by page tests and by the repository
contract, which runs against every adapter. Cutting those, the header's extra widths and
the positions CHO-014 first found saves about 82 s and 1,900 lines. Done looks like:
each of these specs asserts what jsdom cannot see, and one round trip per kind of write.

## Measurement

At `9ee767b`, thirteen specs (`shell`, `shell-navigation`, `navigation-changed`,
`navigation-families`, `navigation-search`, `navigation-width`, `unpublished-changes`,
`roadmaps`, `families`, `adding-a-roadmap`, `editing-a-roadmap`, `landing`,
`preferences`): 104 tests, 128 runs. Candidates:

| Candidates                                                                                                                                                                                                    | CI s | Held by                                                                                         | Verdict                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `navigation-changed.spec.ts:110`, `:149`, `:171`, `:198`, `:223`                                                                                                                                              | ~13  | `changed-roadmaps-only.test.tsx:84`–`:335`; each E2E test adds three items through the UI first | Cut; keep `:246`                                            |
| `unpublished-changes.spec.ts:49`, `:106`, `:131`, `:149`, `:180`                                                                                                                                              | ~7   | `unpublished-changes.test.tsx:82`–`:465`                                                        | Cut; keep `:86`, `:245` and `:270` trimmed                  |
| `navigation-families.spec.ts:94`–`:253`, seven tests                                                                                                                                                          | ~6   | `navigation-families.test.tsx:73`–`:381`, given one `user.tab()` for `:253`'s order             | Cut; keep `:271`                                            |
| `families.spec.ts`, five of seven                                                                                                                                                                             | ~5   | `families-page.test.tsx`; the family writes in the repository contract                          | Cut; fold `:103` into `:132`, the round trip                |
| `adding-a-roadmap.spec.ts`, seven of eight; `editing-a-roadmap.spec.ts`, four, and `:152`, which repeats `editing-an-item.spec.ts:148`                                                                        | ~15  | `roadmaps-page-adding.test.tsx`; the add-a-roadmap rules in the repository contract             | Keep `adding-a-roadmap.spec.ts:46`; one Welsh dialog test   |
| `shell.spec.ts:134` at six widths in two languages; `:110` repeats it; `:191`, `:219`; the Welsh copies of `:45`, `:84`, `:176`                                                                               | ~7   | The widths each side of the header's breakpoints; `app-shell.test.tsx:105`–`:168`               | 375, 640 and 1024 px, or the header's breakpoints if others |
| `shell.spec.ts:270`, `:298`: the container's left edge and its 1200 px stop (CHO-014's first measurement)                                                                                                     | ~2   | A position, not a rule                                                                          | Cut, keeping the not-found page's reflow check              |
| `roadmaps.spec.ts`: six card, Welsh and sort tests; `:487` at five widths                                                                                                                                     | ~5   | `roadmap-card.test.tsx`, `roadmaps-page.test.tsx`, `group-roadmaps.test.ts`                     | Cut; `:487` at two widths                                   |
| `landing.spec.ts`; `preferences.spec.ts:6`, `:39`                                                                                                                                                             | ~4   | Their page and component tests                                                                  | Cut; keep `preferences.spec.ts:69`                          |
| The Welsh reflow at 375 or 1024 px in `shell-navigation.spec.ts:238`, `navigation-search.spec.ts:186`, `navigation-families.spec.ts:271`, `unpublished-changes.spec.ts:270`, `navigation-changed.spec.ts:246` | ~3   | Five set-ups of one check                                                                       | One test with search, a family shut and the count shown     |

Not settled: whether `navigation-width.spec.ts:232`'s Welsh run can overflow; whether
`preferences.spec.ts:6` is the only test of the theme surviving a reload through
`index.html`; whether the repository contract builds a first roadmap into an index
with only its header (`adding-a-roadmap.spec.ts:127`); whether a click outside a
roadmap dialog is held anywhere but `adding-a-roadmap.spec.ts:185` and
`editing-a-roadmap.spec.ts:115`.

## Acceptance criteria

### S1: Each of these specs holds what jsdom cannot

**Given** the thirteen specs above at `9ee767b`
**When** the chore is delivered
**Then** each test left holds layout, reflow, focus, timing, the built bundle or a
round trip through the fakes, as `apps/editor/tests/e2e/AGENTS.md` lists them
**And** one round trip remains for adding a roadmap, editing one and writing a family

### S2: The header is checked at the widths that can fail alone

**Given** the header's check of its service name and sideways scroll
**When** the chore is delivered
**Then** it runs at a width each side of each breakpoint where the header changes, in
English and Welsh

### S3: The cuts meet CHO-014

**Given** any test this chore cuts or trims
**When** its PR is raised
**Then** CHO-014's S1, S2, S4, S5, S7 and S9 hold for it

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

## Out of scope

- The logo's size per width, the only test of the header swapping its image: it stays
  (CHO-014's first measurement).
- Vitest tests that repeat each other: CHO-041.
