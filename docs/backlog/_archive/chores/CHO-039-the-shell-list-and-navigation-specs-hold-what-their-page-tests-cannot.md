# CHO-039: The shell, list and navigation specs hold only what their page tests cannot

- **Status**: Done
- **Type**: Refactor
- **Area**: E2E + Features/UI (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-002, ADR-006, ADR-008
- **Suggested model**: Sonnet — each test is weighed against the page test or
  repository contract test that may hold it
- **Delivered**: _(PR link added once the PR is open)_

## Summary

The specs for the shell, the roadmaps list, families and the navigation take 123 s of
the E2E suite's 1,215 s summed, and two thirds of it repeats Vitest: their navigation
states, list behaviour and roadmap dialogs are held by page tests and by the repository
contract, which runs against every adapter. Cutting those, the header's extra widths and
the positions CHO-014 first found saves about 80 s and 1,900 lines. Done looks like:
each of these specs asserts what jsdom cannot see, and one round trip per kind of write.

## Measurement

At `9ee767b`, thirteen specs (`shell`, `shell-navigation`, `navigation-changed`,
`navigation-families`, `navigation-search`, `navigation-width`, `unpublished-changes`,
`roadmaps`, `families`, `adding-a-roadmap`, `editing-a-roadmap`, `landing`,
`preferences`): 104 tests, 128 runs. Candidates, estimates re-read at delivery
(CHO-014 D12):

| Candidates                                                                                                                                                                                                    | CI s | Held by                                                                                                                                                                                                    | Verdict                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `navigation-changed.spec.ts:110`, `:149`, `:171`, `:198`, `:223`                                                                                                                                              | ~13  | `changed-roadmaps-only.test.tsx:84`–`:335`; each E2E test adds three items through the UI first                                                                                                            | Cut; keep `:246`, merged as the last row says                                                         |
| `unpublished-changes.spec.ts:49`, `:106`, `:131`, `:149`, `:180`                                                                                                                                              | ~7   | `unpublished-changes.test.tsx:82`–`:465`                                                                                                                                                                   | Cut; keep `:86`, `:245`, and `:270` merged as the last row says                                       |
| `navigation-families.spec.ts:94`–`:253`, seven tests                                                                                                                                                          | ~6   | `navigation-families.test.tsx:73`–`:381`, given one `user.tab()` for `:253`'s order and a check that nothing is written for `:150`'s                                                                       | Cut once those two move down; keep `:271`, merged as the last row says                                |
| `families.spec.ts`, five of seven                                                                                                                                                                             | ~5   | `families-page.test.tsx`; the family writes in the repository contract                                                                                                                                     | Cut; fold `:103` into `:132`, the round trip                                                          |
| `adding-a-roadmap.spec.ts`, eight of ten; `editing-a-roadmap.spec.ts`, and its `:152`, which repeats `editing-an-item.spec.ts:148`                                                                            | ~15  | `roadmaps-page-adding.test.tsx` and the add-a-roadmap rules in the repository contract; `roadmap-detail-page-editing.test.tsx:463`–`:576` and `roadmap-detail-page-header.test.tsx:221`–`:258` for editing | Keep `adding-a-roadmap.spec.ts:46`, `:127` (below), one roadmap edit published, one Welsh dialog test |
| `shell.spec.ts:134` at six widths in two languages; `:110` repeats it; `:191`, `:219`; the Welsh copies of `:45`, `:84`, `:176`                                                                               | ~7   | The widths each side of the header's breakpoints; `app-shell.test.tsx:105`–`:168`                                                                                                                          | 375, 640 and 1024 px, or the header's breakpoints if others                                           |
| `shell.spec.ts:270`, `:298`: the container's left edge and its 1200 px stop (CHO-014's first measurement)                                                                                                     | ~2   | A position, not a rule                                                                                                                                                                                     | Cut, keeping the not-found page's reflow check                                                        |
| `roadmaps.spec.ts:67`, `:154`, `:163`, `:193`, `:219`, `:393`; `:487` at five widths                                                                                                                          | ~5   | `roadmap-card.test.tsx`, `roadmaps-page.test.tsx`, `group-roadmaps.test.ts`; for `:154`, `roadmap-detail-page.test.tsx:77` and `roadmap-detail-page-items.test.tsx:543`                                    | Cut; `:487` at two widths                                                                             |
| `landing.spec.ts`; `preferences.spec.ts:6`, `:39`                                                                                                                                                             | ~4   | Their page and component tests                                                                                                                                                                             | Cut; keep `preferences.spec.ts:69`                                                                    |
| The Welsh reflow at 375 or 1024 px in `shell-navigation.spec.ts:238`, `navigation-search.spec.ts:186`, `navigation-families.spec.ts:271`, `unpublished-changes.spec.ts:270`, `navigation-changed.spec.ts:246` | ~3   | Five set-ups of one check, three of them kept above                                                                                                                                                        | One test per width, with search, a family shut and the count shown, in place of all five              |

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

## Delivery

### Departures

- Estimates re-read at delivery (CHO-014 D12), against `2bcbe692` (the `main` run of
  CHO-038 merged): the thirteen specs took 128 runs and 120.9 s summed on CI there. After:
  60 runs (11 specs: `landing` and `navigation-families` are gone), 68 fewer. The 86 run
  names that are gone took 83.5 s summed on CI there, against the 18 that replace or trim
  them; the time after is not re-measured on CI, so the record's ~80 s stands as the
  estimate (the 60 runs took 22.6 s on this host with two workers). Line numbers below
  are those of `2bcbe692` unless a test's name or "now" says otherwise. The thirteen specs
  go from 3,709 to 2,024 lines (2,041 deleted and 356 inserted by `git diff -M --numstat`,
  which reads `navigation-changed.spec.ts` as renamed to `navigation-welsh.spec.ts`;
  `navigation-width.spec.ts` is untouched), and `fixtures/dialogs.ts` loses 10. Vitest
  gains `navigation-families.test.tsx` (+22, -3), `roadmaps-page.test.tsx` (+31, -6),
  `app.test.tsx` (+16) and a new 29-line `index-theme-script.test.ts`. Tests only.
- `shell.spec.ts`: the header's test of its service name and sideways scroll runs at 375,
  640, 768 and 1024 px in both languages (8 runs, from 12): a width each side of `sm`
  (the full name and logo against the short name and icon), `md` (the language's name
  appears, and the gutter widens) and `lg` (the menu button gives way to the navigation).
  The record named 375, 640 and 1024 "or the header's breakpoints if others": `md` is
  one, so 768 stays and 900 and 1280 go. The home link's name at 375 and at 1280 px
  (`:110`) is cut: the loop finds the link by the name it shows, so a wrong name fails
  it. The English header, narrow header and footer tests are no longer repeated in Welsh
  (the Welsh header is held by the loop, the footer's Welsh by `app-shell.test.tsx`). The
  order of the header's controls is cut with the other positions. The two positions of
  `:270` and `:298` are cut; the not-found page's reflow at 375 px is its own test.
- Welsh reflow: the five set-ups (`shell-navigation.spec.ts:238`,
  `navigation-search.spec.ts:186`, `navigation-families.spec.ts:271`,
  `unpublished-changes.spec.ts:270`, `navigation-changed.spec.ts:246`) are two tests in
  `navigation-welsh.spec.ts` (`navigation-changed.spec.ts`, renamed since all its English
  tests went), one per width where the navigation changes shape: the narrowest desktop
  (1024 px) and the phone's drawer, each with the Welsh sample world (three roadmaps
  changed), a family shut, the count shown and a search for a Welsh title. The drawer test
  also holds the menu button's Welsh name with the count, and that the count and the
  longest link fit. The English drawer test keeps its focus checks and drops its fit.
- `unpublished-changes.spec.ts`: the dots' colour is what a browser alone sees, so
  `:61` and `:221` keep the colour on the navigation and on the phone's menu button, and
  `:86` and `:245` stay; the text of the count, its lead, the rail, the drawer and the
  Disconnect question are held below.
- `families.spec.ts`: adding a family and changing one are one test of two writes
  (`:103` folded into `:132`, as the record says).
- `adding-a-roadmap.spec.ts` keeps `:46` and `:127` and loses the other eight, the
  Welsh one among them; the Welsh dialog stays once, as editing a roadmap in Welsh in
  `editing-a-roadmap.spec.ts`. The record's "one roadmap edit published" is
  `editing.spec.ts` "is chosen from the lists, pending in its colour, then published with
  its IDs", which exists. Every other `editing-a-roadmap.spec.ts` test is cut (`:152`
  repeats `editing-an-item.spec.ts` "the dialog stays through the session warning…").
- `landing.spec.ts` is deleted. `preferences.spec.ts` keeps the Welsh browser's start
  (`:69`); the theme's reload (`:6`) and the language's reload (`:39`) go.
- `roadmaps.spec.ts`: the top of the list runs at 375 and 640 px (from five), the
  widths each side of `sm`, where Refresh gains its label.
- Not settled, answered: `navigation-width.spec.ts:232` keeps both languages, since
  Welsh controls are wider than English in the 624 px left of a 400 px navigation, which
  is what the run checks. `preferences.spec.ts:6` was the only test that read the theme
  through a reload, but it did not hold what `index.html` adds (the stored theme before
  the first paint): that is now `index-theme-script.test.ts`, which fails when
  the key or the class changes on one side. A click outside a roadmap dialog is held by
  `closing-a-dialog.spec.ts` for both roadmap dialogs. Whether a first roadmap builds
  into an index of only its header is held by no Vitest test (the contract's
  `new-roadmap-contract.ts` adds to an index with roadmaps), so `adding-a-roadmap.spec.ts:127`
  stays for it, with the template read through the fakes.
- Vitest assertions were added before the E2E tests they stand for went (CHO-014 S7):
  `navigation-families.test.tsx` "is reached by Tab from All roadmaps, and worked by
  Space" and the data-source check (every non-read method of the repository) in "keeps
  the closed families across a reload, and writes nothing to the data source", each
  shown red (a `tabIndex={-1}` on Close all; a write called in the test), then
  restored; `roadmaps-page.test.tsx` "re-sorts the groups and titles when the language
  changes" now switches the language after rendering, over families and titles that sort
  the other way in Welsh, as the cut E2E test did (shown red by grouping in English);
  `app.test.tsx` "leads from the not-found page's link to the landing page" clicks the
  link; `index-theme-script.test.ts` was shown red by renaming the key in `index.html`.
- No axe scan is in these thirteen specs, so none is dropped (the owner's rule of
  2026-11-23).
- Archived records that cite a cut or renamed test stay as they were.

### Cuts and the test that holds each (S3; CHO-014 S5, S9)

| Cut                                                                                                                                                                                                                                               | Held by                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `navigation-changed.spec.ts` five tests of the count (pressed, search emptied, the rail, text when unread, the drawer)                                                                                                                            | `changed-roadmaps-only.test.tsx` (each state, in the drawer and in Welsh); the Welsh fit by the two new tests                                                                                                                                                       |
| `unpublished-changes.spec.ts` five tests (no count, count and dots, lead, rail, count dropping, Disconnect's question)                                                                                                                            | `unpublished-changes.test.tsx` "on a desktop", "on a phone" and "Disconnect's question"; the dots' colours by the four tests left                                                                                                                                   |
| `navigation-families.spec.ts` the file: seven desktop tests and the Welsh drawer test                                                                                                                                                             | `navigation-families.test.tsx` (each state), with the new Tab-and-Space and no-write checks; the Welsh drawer by the two new tests                                                                                                                                  |
| `navigation-search.spec.ts` the Welsh test at 1024 px and in the drawer                                                                                                                                                                           | `navigation-search.test.tsx` "speaks Welsh, finding a roadmap by its Welsh title"; the fit by the two new tests                                                                                                                                                     |
| `shell-navigation.spec.ts` the Welsh drawer run, and the English drawer's fit                                                                                                                                                                     | `navigation-welsh.spec.ts` the phone test (the count and the longest Welsh link inside the drawer, no sideways scroll)                                                                                                                                              |
| `families.spec.ts` the list, the co-lead's refusal, the input errors, no Families tab, the family joined since the confirmation                                                                                                                   | `families-page.test.tsx`; the co-lead and the cells in the repository contract (`changeFamily`, `addFamily`)                                                                                                                                                        |
| `adding-a-roadmap.spec.ts` eight tests (expired session, Cancel and Escape, a name in use, no template, a write ended by the session, the dialog's label, Welsh)                                                                                  | `roadmaps-page-adding.test.tsx` (each, Welsh and the expired session included); a click outside by `closing-a-dialog.spec.ts`; the session warning over a form dialog by `editing-an-item.spec.ts`                                                                  |
| `editing-a-roadmap.spec.ts` five tests and the English names; the Welsh test stays                                                                                                                                                                | `roadmap-detail-page-editing.test.tsx` "in the roadmap dialog"; `roadmap-detail-page-header.test.tsx` "More holds Edit product details"; `editing.spec.ts` for the published edit                                                                                   |
| `shell.spec.ts` the 900 and 1280 px runs, the home link's names, the Welsh copies of the header, narrow header and footer, the phase banner and its dismissal, the order of the header's controls, the container's left edge and its 1200 px stop | `app-shell.test.tsx` (the banner, its dismissal, the home link, the order of controls, the footer in Welsh); the loop of four widths in both languages; the not-found page's test for the reflow                                                                    |
| `roadmaps.spec.ts` the empty state, a worksheet id, the cards under their families, the Welsh cards, the re-sort, the Welsh lists, three of five widths                                                                                           | `roadmaps-page.test.tsx` (the re-sort now through a language switch), `roadmap-card.test.tsx`, `group-roadmaps.test.ts`, `roadmap-detail-page.test.tsx` "explains an unknown id", `roadmap-detail-page-items.test.tsx` "still says an unknown roadmap is not found" |
| `landing.spec.ts`                                                                                                                                                                                                                                 | `app.test.tsx` "landing page" (the page, Connect), its unknown-page test and "leads from the not-found page's link to the landing page"; the title and `lang` by `create-i18n.test.ts`                                                                              |
| `preferences.spec.ts` the theme's and the language's reload                                                                                                                                                                                       | `theme-menu-item.test.tsx` "starts light, then switches to dark and remembers it", "restores the stored theme"; `language-preference.test.ts`; `index.html`'s script by `index-theme-script.test.ts`                                                                |

Each holder runs against the in-memory repository or through the fakes, so it outlives
the switch from Google Sheets; only the cells a family or roadmap write puts in a row
rest on the Sheets adapter's tests, which go with it, and `families.spec.ts` and
`adding-a-roadmap.spec.ts` still run the round trip.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | the specs pass, 60 runs (22.6 s locally); one round trip each for adding a roadmap (`adding-a-roadmap.spec.ts:46`, `:127`), editing one (`editing.spec.ts`) and writing a family (`families.spec.ts`) |
| S2       | `shell.spec.ts` runs the header at 375, 640, 768 and 1024 px in English and Welsh                                                                                                                     |
| S3       | the PR lists each cut and its holder; red shown for the two checks that moved down and for `index.html`'s script                                                                                      |
