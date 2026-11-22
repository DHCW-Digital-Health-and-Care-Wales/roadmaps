# CHO-036: The look checks tour and scan each state once

- **Status**: Done
- **Type**: Refactor
- **Area**: E2E (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-006, ADR-010
- **Suggested model**: Sonnet — a scoped tour helper and a judgement per scan of
  whether its state is another scan's
- **Delivered**: [PR #248](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/248)

## Summary

The focus tours and axe scans are 41% of the E2E suite's time, and they stay in both
themes (CHO-014 D7). Two page tours walk a whole page that another tour already walks,
for the sake of a few stops of their own, and a few scans scan a state another scan
holds. Scoping the two tours to their own stops, and dropping a repeated scan where the
owner agrees, saves about 65 s of the 1,215 s summed, with every kind of control and
every distinct state still checked in both themes. Done looks like: each tour and scan
holds stops or a state no other one holds.

## Measurement

At `9ee767b`, from CI's per-test times (both themes summed); the candidates are estimates, re-read at delivery (CHO-014 D12):

| Test                                                                                  | CI s | Finding                                                                                                                                                                | Verdict                                                                     |
| ------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `focus-indicator.spec.ts:410`, a co-lead's review                                     | 36.9 | Never opens the review: after the refused publish it tours the whole ProductA page, the page `:282` tours, with a refusal notice added                                 | Tour the notice's stops, or the review dialog if that was the intent (S2)   |
| `focus-indicator.spec.ts:316`, a roadmap not published                                | 45.4 | After four checks of its own stops, tours the whole long ProductC page, whose cards are ProductC's own but of the kinds `:282` tours                                   | Tour the banner, header and product details, and one card of each kind (S1) |
| `focus-indicator.spec.ts:348`, the item dialog shut then open                         | 20.7 | The shut tour's stops are mostly the open tour's and `:375`'s                                                                                                          | Optional; it also holds the wrap to the first stop                          |
| `accessibility.spec.ts:814`, `:887`                                                   | ~5   | Each ends with a scan of the same unchanged form (both Welsh-locked notes); their empty Tags and empty Details scans differ, as does `:909`'s empty Organisations scan | Drop one Welsh-locked scan; keep the three empty-field scans                |
| `accessibility.spec.ts:131`, roadmap detail                                           | ~4   | The same state as the first scan of `:261`                                                                                                                             | Remove                                                                      |
| `accessibility.spec.ts:1175` (English run), `:395` (English scan), `:670` (last scan) | ~6   | Each scans a state the full-page 375 px scans already scan                                                                                                             | Trim                                                                        |
| `typography.spec.ts`, the body's font family                                          | <1   | `styles.spec.ts:43` asserts it                                                                                                                                         | Remove the repeat                                                           |
| `accessibility.spec.ts` and `styles.spec.ts`                                          | —    | Each declares its own themes and its own check that the page is in the theme asked for, though `fixtures/look.ts` exports them (CHO-014's first measurement)           | Share                                                                       |

Not settled: whether the drawer tails of `accessibility.spec.ts:307` and `:335`, and the
in-between states of `:768` and `:836`, find anything their neighbours do not; run
axe on each pair before cutting one. No structure snapshot repeats a Vitest test.

## Acceptance criteria

### S1: A page tour tours only stops no other tour reaches

**Given** a page tour whose page another tour walks whole
**When** the chore is delivered
**Then** it tours only the stops that page has and the other's does not, through a
helper that tours a region and still fails on a stop it misses
**And** every kind of control toured at `9ee767b` on that page is still toured there,
in both themes

### S2: The co-lead's review is toured as its title says

**Given** the tour named for a co-lead's review
**When** the chore is delivered
**Then** it tours the review dialog's controls, or is renamed for the notice it tours,
as the owner chooses in its PR

### S3: Each axe scan scans a state no other scan holds

**Given** two scans of one state
**When** the chore is delivered
**Then** the PR names each scan it would remove and the scan that holds its state,
and removes it only on the owner's word, since CHO-014's S4 keeps every axe scan
**And** a scan kept runs in both themes

### S4: The cuts meet CHO-014

**Given** any test this chore cuts or trims
**When** its PR is raised
**Then** CHO-014's S4, S5 and S9 hold for it

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

- **D2** (owner, 2026-11-22, the delivery session, S2): the co-lead's review tour →
  renamed for the refusal notice it tours; the review dialog's controls are not
  toured.
- **D3** (owner, 2026-11-22, the delivery session, S3): "YES, remove the repeated axe
  scans you list", each named in the PR with the scan that holds its state → the
  four scans in Delivery are removed; every scan kept still runs in both themes
  (CHO-014 S4).

## Out of scope

- Running a tour or scan in one theme: the owner keeps both (CHO-014 D7).

## Delivery

### Departures

- S1: the page tour's helper tours a range of stops (`expectStopsShowAnIndicator`, from
  a first stop to a last), not a region by locator, since a stop of one page is no
  child of one container (the header, the banner and the title block are siblings). A
  stop it misses fails it: Tab lands on another stop, which is not the name expected.
  As in the whole-page tour, a text field out of the Tab order is a miss, but a button
  or link with `tabindex="-1"` is left out of the stops found (`NOT_A_STOP`).
- S1: the not-published page tour keeps its four checks of one stop each and tours
  two ranges: the header to the last placement link (header, banner, title, Product
  details, Edit product details, Publish roadmap), then its empty section's button and
  its first card's three buttons. Its other cards, its navigation and its footer are of
  the kinds the tour of a change pending and the main page's tour walk.
- S2: the test is named for the notice it tours (D2), and tours, through the same
  helper, the notice's one stop, "Review the changes", then the open product details'
  "Undo changes" and "Edit" buttons, which the tour of a change pending, with its
  product details shut, does not reach. The rest of its page is that tour's page.
- S3: of the candidates in Measurement, four scans go (D3). Not removed, since the
  state each scans is no other scan's: the English scan of a roadmap's page on a phone
  (no other scan at 375 px has the page with nothing pending), the drawer tails of the
  navigation's search, families and count (each drawer holds a different list), and
  the in-between states of the tags and details tests. The tags test's locked-form scan
  stays as the one Welsh-locked scan.
- Four archived records cite a test this chore removes or renames, and stay as they
  were: DEF-002 S1's evidence names "the header at 375px wide in en" (its Welsh run,
  and every English full-page scan at 375 px, still scan the header); STY-039 names
  "an item with no details, and one whose Welsh details can't be changed" (now "an item
  with no details"); STY-031 names "an item's Move menu, then the moved item and an
  unplaced item's form" (now "…on a page with an unplaced item", the form's
  placeholder asserted by `roadmap-detail-page-moving.test.tsx`); STY-021's S11 cites
  the "roadmap detail" scan (held by the first scan of "the shell's navigation beside a
  roadmap's page").
- The item dialog's shut tour stays: it holds the wrap to the first stop (Measurement:
  optional).

### Scans removed (S3, S5, S9)

| Removed                                                                     | Held by                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accessibility.spec.ts` "roadmap detail", both themes                       | the first scan of "the shell's navigation beside a roadmap's page", the same page and wait                                                                                                                                                                                                                                                                                                                                       |
| the Welsh-locked scan of "an item with no details…", both themes            | the Welsh-locked scan of "an item with no tags…": the same item's dialog, holding both notes. The note's text is asserted in `roadmap-detail-page-details.test.tsx` and `editing.spec.ts`                                                                                                                                                                                                                                        |
| the scan of the unplaced item's form in "an item's Move menu…", both themes | the first scan of "the item form as a side panel" (the same form, placed in Now, so its Horizon select has no placeholder) and the first scan of "adding an item" (the disabled placeholder option); the page behind it is the previous scan of the Move test. The test's title and its `toHaveValue("")` tail went with the scan: `roadmap-detail-page-moving.test.tsx` asserts an unplaced item's select shows its placeholder |
| the English run of "the header at 375px wide…", light                       | every full-page scan at 375 px in English, in both themes, such as "a roadmap's placement navigation on a phone": the header is the same one                                                                                                                                                                                                                                                                                     |
| `typography.spec.ts`, the body's font family                                | `styles.spec.ts` "the start page uses the header, button, page and font tokens", both themes                                                                                                                                                                                                                                                                                                                                     |

Each holder runs through the fakes, so it outlives the switch from Google Sheets.
`accessibility.spec.ts` and `styles.spec.ts` now take `THEMES`, `Theme` and
`expectTheme` from `fixtures/look.ts`.

### Contract for dependents

- `expectStopsShowAnIndicator(page, first, last?)` in `focus-indicator.spec.ts` tours
  the stops from `first` to `last` of a page that another tour walks whole.
- `expectTheme(page, theme)` in `fixtures/look.ts` is the check that the page is in the
  theme asked for.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | observed run: with `More` given a positive `tabindex`, the scoped tour fails ("the stop reached, expected main: button More", reached "main: button Product details"), in both themes |
| S2       | the renamed test passes in both themes                                                                                                                                                |
| S3       | the PR lists each scan and its holder; the specs touched pass, both themes                                                                                                            |
| S4       | the table above (S5, S9)                                                                                                                                                              |
