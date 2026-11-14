# CHO-011: The dialog tests share one way to open a dialog, one focus tour and one set of fixtures

- **Status**: Done — in its PR, awaiting merge
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

- **D1** (agent, 2026-11-14): the family and category lists go in
  `domain/roadmap/testing/`, beside `TEST_ORGANISATIONS`, over
  `features/roadmaps/testing/`, because they are domain data and the domain's own
  tests can then take them too (CHO-012).
- **D2** (agent, 2026-11-14): the shared lists are named as the example spreadsheet
  names them, except that Medicines & Diagnostics has no Welsh name, over a second
  family declared by the one test that asserts "No Welsh name". One set then serves
  every test, and no file declares a family.
- **D3** (agent, 2026-11-14): an assertion writes a shared name as the text the user
  reads ("Family: Medicines & Diagnostics"), as every test here does with a fixture's
  name, over reading it from the constant; an ID or a colour is read from the constant.
- **D4** (agent, 2026-11-14): the dialog's tour is its own function, `expectDialogTour`,
  over `expectEveryStopShowsAnIndicator` given a scope. That helper accepts any of the
  three indicators and ends once each name has been seen; the tour it replaces held
  the ring on each field, the fill on each button and Tab's way back to the first
  stop. The dialog's tour takes every control of the dialog as a stop, so one taken
  out of the Tab order by mistake fails it, as the list did.
- **D5** (owner, 2026-11-14, answering this delivery's question): the journey in
  `adding-a-roadmap.spec.ts` ran in both themes, on a desktop and a phone, as STY-041
  asked → run it once, keeping every assertion of behaviour and dropping the dialog's
  geometry: the end-to-end suite is getting long, and geometry held by Playwright
  adds little. Changes: the Measurement's _Smaller_ row is done in full, and no test
  holds where the dialog sits on a phone. Slimming the rest of the suite is a chore
  the owner will have recorded.

## Out of scope

- Any change to what the tests assert, or to production code.
- The write-failure copy (CHO-004).

## Delivery

### Departures

- **The journey runs once, and its geometry checks have gone** (D5). The dialog is
  still opened in both themes by the accessibility spec and the focus tour.
- **S2 covers four more clock moves**: the two specs that end a 300 s session, the
  structure spec's 600 s one and the hour `auth.spec.ts` moved to end a session wrote
  their own sums or lengths. They now ask `sessionMs(expiresIn)`.
- **Three held reads share `holdCall` too**, in `families-page.test.tsx` (two) and
  `roadmap-detail-page-choices.test.tsx`, which this chore already changes: each was
  the same wrapper as the two held writes.
- **`EXAMPLE_SPREADSHEET_WITH_LISTS`** (`tests/e2e/fixtures/fake-sheets.ts`) replaces
  the spread each spec wrote, one of them in `editing.spec.ts`.
- **Outside the three files S4 measures**, other tests still declare a family or a
  category: CHO-012.

### Contract for dependents

- **Opening a dialog (Playwright)**: `openDialog(page, opener, names)`
  (`tests/e2e/fixtures/dialogs.ts`) clicks `opener` and returns the dialog once focus
  is in its first field. `names` is a `DialogNames`: the heading and the first field,
  in the page's language. A story that adds a dialog exports its names beside
  `ADD_ROADMAP`, and its own way in beside `openAddRoadmapDialog` when more than one
  spec opens it.
- **"Add a roadmap"**: `openAddRoadmapDialog(page)` connects, waits for the list and
  opens it. A spec that sets `sheets.spreadsheet = EXAMPLE_SPREADSHEET_WITH_LISTS`
  passes `{ offersLists: true }`, and gets the dialog once it offers both lists.
  `addRoadmapButtons(page)` and `addRoadmapDialog(page)` find the buttons and the
  dialog without opening it.
- **A click outside**: `clickOutside(page, dialog)` clicks above and beside the
  dialog, from its box.
- **Session times**: `sessionMs(expiresIn?)` and `SESSION_WARNING_MS`
  (`tests/e2e/fixtures/fake-gis.ts`). A session ends at `sessionMs()`; its warning
  opens at `sessionMs() - SESSION_WARNING_MS`.
- **A dialog's focus tour**: `expectDialogTour(page, dialog)`
  (`tests/e2e/focus-indicator.spec.ts`), called with the dialog open and focus in its
  first field. A button shows the fill and anything else the ring, and every control
  is a stop: a dialog with a text link in it, or with a control kept out of the Tab
  order on purpose as the details outline keeps its fields, needs the rule widened.
- **Families and categories (Vitest)**: `TEST_FAMILIES`, `TEST_CATEGORIES` and their
  members (`src/domain/roadmap/testing/test-lists.ts`). Three names have an `&`, so
  `user.selectOptions` takes the option's element or its value, never its text.
- **A held write or read (Vitest)**: `holdCall(call)`
  (`src/features/roadmaps/testing/held-call.ts`) returns `held`, a spy to put in the
  repository's place of `call`, `release`, and `released` to await inside `act`.

### Scenario evidence

No Vitest test was added or removed: 1950 tests in 91 files, as at `858be74`.
Playwright runs 241 where it ran 244: the journey once, not four times (D5).

| Scenario | Evidence                                                                                                                                                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `rg -n '"Add a roadmap"' tests/e2e --glob '*.ts'` finds only `fixtures/dialogs.ts`; `adding-a-roadmap`, `accessibility`, `focus-indicator` and `structure` open the dialog through it, and the `.first()` has gone                                                                                                                  |
| S2       | `rg -n "3599" tests/e2e` finds only `TOKEN_LIFETIME_S` in `fixtures/fake-gis.ts`; no spec subtracts the 60 s margin, writes the two minutes or moves the clock to a session's end by a length of its own                                                                                                                            |
| S3       | `expectDialogTour` finds seven stops, the seven the list named (seen by asking it for 99); asked for the ring on every stop it fails at the first button; with "Product lead" given `tabindex="-1"` it fails there                                                                                                                  |
| S4       | `rg -n "const families\|const categories" src --glob '*.test.tsx'` and `rg -n "new Promise<void>" src --glob '*.test.tsx'` find nothing; `roadmaps-page-adding.test.tsx` still chooses "GP & Community Services" and "Medicines & Diagnostics" by the option's element, and `families-page.test.tsx` now names a family with an `&` |
