# CHO-011: The dialog tests share one way to open a dialog, one focus tour and one set of fixtures

- **Status**: Proposed — found after STY-041 merged, by a quality review of the tests
  and copy its own quality review left unread; cheapest before STY-043 copies them
- **Type**: Refactor
- **Area**: E2E + Features/UI (tests only)
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — extractions inside test code, each with its call sites
  listed below; sharing the fixtures also means one set of names across three files
- **Delivered**: _(add on delivery)_

## Summary

STY-041's tests are sound one by one (roles and names, no sleeps, behaviour in the
names), but their setup is written out per spec. STY-043, STY-044 and STY-046 each test
a dialog in the same four Playwright specs and the same kind of Vitest file, so each
would add another copy, and a renamed button or a new wait would then be edited in
every one. The epic asks for one shared piece where there is one job (_Refactoring and
code quality come first_); this is that rule for test setup. Done looks like: each row
below has one home, and the next dialog's tests import it.

## Measurement

At commit `099ae1d`.

| Area                              | Measurement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Verdict                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Opening the dialog in Playwright  | `rg -n 'name: "Add a roadmap"' tests/e2e` finds the same steps (the lists added to the spreadsheet, connect, three cards, the button, the dialog, a wait) in `adding-a-roadmap.spec.ts` (`openDialog`), `accessibility.spec.ts`, `focus-indicator.spec.ts` and `structure.spec.ts`. `openDialog` alone adds a `.first()` that would hide a second button                                                                                                                                                                                                      | Share                   |
| The session's times               | `rg -n "3599" tests/e2e` finds `SESSION_MS` and `WARNING_MS` in `adding-a-roadmap.spec.ts` and `session-warning.spec.ts`, and the same sum inline in `accessibility.spec.ts`; their source, `TOKEN_LIFETIME_S` in `fixtures/fake-gis.ts`, is not exported                                                                                                                                                                                                                                                                                                     | Share                   |
| The dialog's focus tour           | `focus-indicator.spec.ts` lists the dialog's seven stops by hand and takes the last two to be buttons (`index < stops.length - 2`), though `expectEveryStopShowsAnIndicator` finds a page's stops itself. A field added to the dialog is toured only if the list is edited                                                                                                                                                                                                                                                                                    | Use the helper          |
| Families and categories in Vitest | `rg -n "const families" src --glob '*.test.tsx'` finds three lists that share their IDs and differ in the rest: `roadmaps-page-adding.test.tsx` names the categories "GP & Community Services" and "Hospital & Specialist Care" where `roadmap-detail-page-choices.test.tsx` and `families-page.test.tsx` name them "Patient records" and "Clinical systems"; `families-page.test.tsx` has Screening where the others have Medicines & Diagnostics; "Single Record" is `#325083` in the new file and `#12a3c9` in the others. Each file asserts its own names | Share, one set of names |
| A write held open in Vitest       | `rg -n "new Promise<void>" src --glob '*.test.tsx'` finds `holdingAdd` in `roadmaps-page-adding.test.tsx` and the same wrapper inline in `roadmap-detail-page-editing.test.tsx`                                                                                                                                                                                                                                                                                                                                                                               | Share                   |
| Smaller, in the same files        | Two tests in `roadmaps-page-adding.test.tsx` repeat the removal of a roadmap and the Refresh after it; the journey in `adding-a-roadmap.spec.ts` runs once per theme and device though only the dialog's geometry differs; its click outside the dialog uses fixed coordinates (`mouse.click(20, 20)`)                                                                                                                                                                                                                                                        | Fix when touched        |

The fifth copy of the write-failure messages, found by the same review, is CHO-004's.

## Acceptance criteria

### S1: A change to how the dialog opens is one edit

**Given** the Playwright specs that open "Add a roadmap"
**When** the button's name or the wait before the dialog is ready changes
**Then** one fixtures helper changes, and every spec that opens the dialog follows

### S2: The session's times are written once

**Given** the specs that move the clock to the session warning or its end
**When** the fake's grant changes
**Then** the times are read from `fixtures/fake-gis.ts`, with no copied sum

### S3: A field added to the dialog is toured without editing a list

**Given** the dialog's focus tour
**When** a control is added to the form
**Then** the tour reaches it, and still shows that Tab comes back to the first stop

### S4: The next dialog's Vitest file imports its fixtures

**Given** the family and category lists and the held write
**When** another test file needs them
**Then** it imports them from a `testing/` folder, and no test file declares its own
**And** the assertions that use a family's or category's name use the shared one, a
name with `&` kept (`user.selectOptions` and `&`, in the epic's delivery notes)

## Decisions

## Out of scope

- Any change to what the tests assert, or to production code.
- The write-failure copy (CHO-004).
