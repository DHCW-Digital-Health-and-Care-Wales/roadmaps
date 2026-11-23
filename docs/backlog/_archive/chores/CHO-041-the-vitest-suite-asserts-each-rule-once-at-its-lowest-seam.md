# CHO-041: The Vitest suite asserts each rule once, at its lowest seam

- **Status**: Done
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

At `9ee767b`, found while auditing the E2E specs against these files; estimates, re-read
at delivery (CHO-014 D12)
(`roadmap-detail-page-<name>.test.tsx` as `<name>.test`):

| Candidates                                                                                                                                                                          | Finding                                                                                                                                                                         | Verdict                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `details.test:357`, `:460`, `:482`, `:496`, `:511`; `tags.test:247`, `:260`, `:302`, `:419`, `:472`, `:650`; `tags.test:438`, `:455`, `:495`, `:507`; `ordering.test:306`, `:521`   | Re-assert `details-outline.test.ts`, `item-tags.test.ts`, `opening-field.test.tsx` and `pending-orders.test.ts` through the page; `tags.test:507` is `:438` and `:495` together | Keep a page test only where it asserts focus, an announcement, the card or the wiring (pending edits feeding the function, as `tags.test:291` does) |
| `editing.test:927`                                                                                                                                                                  | A row of `:878`'s table                                                                                                                                                         | Fold in                                                                                                                                             |
| `quick-add.test:604`                                                                                                                                                                | `adding.test:427` by another way into the dialog                                                                                                                                | Cut                                                                                                                                                 |
| `editing.test:1073`, `:1094`, `:1120`; `publishing-roadmap.test:400`; `adding.test:872`                                                                                             | One hold on a lost answer or ended session, five times; `publishing-roadmap.test:400` and `editing.test:1073` read as one case                                                  | Merge                                                                                                                                               |
| `items.test:684`–`:719`; `header.test:371`; `roadmap-detail-page.test.tsx:129`                                                                                                      | Repeat `header.test:160`, `:170`, `:202`; `header.test:356`; `items.test:494`                                                                                                   | Cut                                                                                                                                                 |
| `app.test.tsx:91`, `:158`, `:233`, `:247`, `:262`, `:271`                                                                                                                           | Repeat `language-switcher.test.tsx`, `theme-menu-item.test.tsx`, `account-menu.test.tsx`, `app-shell.test.tsx:66`, `app.test.tsx:288`, `:318`                                   | Cut                                                                                                                                                 |
| `app-shell.test.tsx`, its structural tests in both languages; `unpublished-changes.test.tsx:168`; `families-page.test.tsx:576`                                                      | Run per language with nothing language-dependent; repeat `unpublished-changes.test.tsx:120` and `roadmaps-page.test.tsx:82`                                                     | Cut                                                                                                                                                 |
| `app.test.tsx:107`–`:148`, its connection and account-menu rows; `app.test.tsx:212` and the rows of "explains why it is not connected"; two rows of `reconnect-dialog.test.tsx:190` | Re-assert `connection-status.test.tsx`, `account-menu.test.tsx:38`, `:63` and `auth-notice.test.tsx:30`, `:65` at the app; rows differing only in their start state             | Keep the component tests and one wiring row in `app.test.tsx`; merge the rows                                                                       |
| `session-warning.test.tsx:140` with `:182`; `auth-notice.test.tsx:219`                                                                                                              | `:182` adds one clock step to `:140`'s state; `auth-notice.test.tsx:219` repeats `app.test.tsx:53` and `:180`                                                                   | Merge `:182` into `:140`; cut `auth-notice.test.tsx:219` or fold the three into one connect-then-disconnect journey, naming the file that keeps it  |
| `pending-changes.test.ts:719`, `:808`, `:927`; `:940`–`:1050`; `publish-plan.test.ts:379`, `:398`, `:414`, `:1371`                                                                  | One lost-publish rule per field; one found-by-content rule in three blocks; moves `item-moves.test.ts` holds                                                                    | One table each; cut the moves `item-moves.test.ts` holds                                                                                            |

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

## Delivery

### Departures

- Estimates re-read at delivery (CHO-014 D12), against `4b121b84` (CHO-040 merged),
  where CHO-036 to CHO-040 had moved the line numbers: each candidate was found by its
  content (`git show 9ee767b:<file>` for the old line) and compared with its holder
  case by case. Vitest, `apps/editor`: 141 files and 3,085 tests before, 141 and 3,054
  after (31 fewer); 45,450 test lines before, 45,116 after (334 fewer). Tests only.
- Kept, because the case differs from its candidate's holder (the record's verdict was
  an estimate):
  - `roadmap-detail-page-details` "makes a detail of each pasted line" (the announcement
    "Added 3 details.", focus on the last, the card), "says a list has three levels when
    pasted lines ask for more" (the announcement joined to "Added 4 details.") and "nests a
    detail for each hyphen typed or pasted" (focus, the refusal's announcement): each
    asserts what `details-outline.test.ts` cannot see.
  - `roadmap-detail-page-tags` "narrows the offered tags" (the none-match note, focus on
    the next offered), "leaves a tag once when another is renamed to it" and "adds a typed
    tag in the spelling the roadmap's other items use" (each announces a note that only
    the page renders).
  - `roadmap-detail-page-ordering` "is no change once reordered back…": the one page test
    that the pending order feeds the tag and the count; the second, through Undo changes,
    went.
  - `roadmap-detail-page-editing` "holds the app once the organisations can't be read
    after a publish" is not a row of the table above it: the items read back, so nothing
    is pending behind the hold, which the table asserts. It stays alone.
  - The five holds on a lost answer or an ended session stay: `editing` (partly applied;
    Reconnect after the session ends; the session ending during Refresh),
    `publishing-roadmap` (the roadmap's own title, "This roadmap may have been published",
    and a re-read that fails) and `adding` (the session ending while the read after the
    publish is under way) each reach the hold another way or say something the others do
    not; they are not one case.
  - `app.test` "with hash history" (an unknown path; the skip link keeping the route): a
    hash history is another router than the path history of `app.test`'s later tests.
  - `publish-plan.test` "moves the row to just after the placement's last item", "moves
    several in the order they were moved" (the order of the changes into `moved`),
    "moves no row for a placement the roadmap already holds" and "moves the fewest rows to
    reach the order" (the `orders` entry with `was`): each is a test of the wiring into
    `planItemMoves`, whose own cases `item-moves.test.ts` holds.
- `app-shell.test` runs its copy tests in both languages and its structural tests once, in
  English: the order of the header's controls, the banner's place, its dismissal (three
  tests), and no repository link without an address. The Welsh dismiss button's name
  moves into the banner's copy test.
- The Welsh status of `app.test` "renders in Welsh" (`Heb gysylltu`) was asserted nowhere
  else: `connection-status.test.tsx` gains "announces in Welsh" before the test goes.
  The Welsh start page is held by `start-page.test.tsx`, which runs in both languages.
- `pending-changes.test.ts` is table-driven, with every case it held: the three
  lost-publish tests are one three-row table in `matchItemChanges`, and the three blocks
  on an item found by its details are one table of ten rows (five found, five not), the
  tests' cases listed singly. The file is 6 lines longer, and its cases are each named in a row.
- Review of the first head found three assertions only a cut test reached; each now sits
  in a kept test: the title, focus, horizon and status of the empty form that opens on
  Next after "Add and start another" from quick add (the one path that begins from quick
  add's `start`), a comma typed in Add a tag ending the tag with no Enter, and the
  roadmap's title and Product details region after the session expires.
- No axe scan is in these files, so none is dropped (the owner's rule of 2026-11-23).
- Archived records that cite a cut test stay as they were.

### Cuts and the test that holds each (S3; CHO-014 S5, S9)

| Cut                                                                                                                                                             | Held by                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `details` "offers no fourth level: a detail whose nested details are at the third can't go deeper"                                                              | `details-outline.test.ts` "can't nest the first detail, one already under the detail above, or one whose nested details are at the third level" (the same four lines); `details` "nests a detail under the one above it" (the announcement, twice)                                                                                                               |
| `details` "puts pasted lines after a detail that holds text and those nested under it"                                                                          | `details-outline.test.ts` "follow a detail that holds text and the details nested under it"; `details` "makes a detail of each pasted line" (the paste reaches the field)                                                                                                                                                                                        |
| `tags` "offers the roadmap's other tags, most used first then alphabetical, without the item's own"                                                             | `item-tags.test.ts` "counts the items carrying each tag, most used first, then alphabetical", "leaves out the tags the item has"; `tags` "narrows the offered tags", "offers another item's pending tags as the page shows them" (the labels with counts)                                                                                                        |
| `tags` "ends a tag at a comma as it is typed, and at a pasted line break, each trimmed"                                                                         | `item-tags.test.ts` "ends a tag at each comma or line break, trimming each and dropping blanks"; `tags` "pastes a list over the text selected in Add a tag" (the paste), "adds, chooses, renames and removes by keyboard alone" (Enter, and now a comma typed with no Enter, which no test caught before: the cut test's own Enter settled the text)             |
| `tags` "adds no tag the item has, typed as %s": the row `Patients` (the `patients` row stays, the test now one)                                                 | `item-tags.test.ts` "adds no tag the item has, whatever its capitals, and says which it has"; the row left                                                                                                                                                                                                                                                       |
| `tags` "keeps a name still being changed when the form is confirmed" and "counts text typed but not yet added when the form is confirmed", now one test         | `item-tags.test.ts` "keeps a name still being changed, then adds text typed but not yet added"; the merged page test (both at once, through Done); "shuts keeping a name still being changed and text typed but not added" (Close tags)                                                                                                                          |
| `ordering` "is no change once undoing a move leaves the page's own order"                                                                                       | `pending-orders.test.ts` "is no change once a move out leaves the page's own order", "is no change once it is the order the page shows with the item moved in last"; `ordering` "is no change once reordered back to the order the page shows" (the page's wiring; the function's case is the unit test's, and Undo changes reaches the same `settleOrders`)     |
| `quick-add` "keeps the dialog open, empty, on Next, after “Add and start another”"                                                                              | `adding` "adds the item and keeps the dialog open and empty, the horizon still chosen, focus in the title, saying what was added"; `quick-add` "opens an empty form on Next after “Add and start another”, and ends the run on %s" (gains the empty title, its focus, the horizon kept and the status's text, the one path that begins from quick add's `start`) |
| `items` "the Not published notice": shows under the facts; absent for a published roadmap; in Welsh                                                             | `header` "puts one notice under the facts for a roadmap not published" (gains the check that the notice is not beside the title), "shows no Not published notice for a published roadmap", "is in Welsh"                                                                                                                                                         |
| `roadmap-detail-page.test` "keeps a cached roadmap visible, with Reconnect, once the session expires"                                                           | `items` "keeps the items, with Reconnect, once the session expires" (gains the title and the Product details region the cut test asserted)                                                                                                                                                                                                                       |
| `header` "is the same beside the navigation on a desktop": the header reads only the phone and tablet queries; the desktop one is the shell's (`app-shell.tsx`) | `header` "is the row of placement links from a tablet's width"                                                                                                                                                                                                                                                                                                   |
| `app.test` "renders in Welsh"                                                                                                                                   | `start-page.test.tsx` (both languages: heading, button); `connection-status.test.tsx` "announces in Welsh" (new); `app-shell.test.tsx` (the shell in Welsh)                                                                                                                                                                                                      |
| `app.test` "holds the theme, where the forms open and the session's action in one menu, with the language beside it"                                            | `account-menu.test.tsx` "offers the theme, where the forms open and Disconnect while connected"; `app-shell.test.tsx` "lists the header's controls in order" (three buttons, the language beside the account)                                                                                                                                                    |
| `app.test` "switches the language from the header"                                                                                                              | `language-switcher.test.tsx` "switches language without a reload, updates <html lang> and remembers it", "can be operated with the keyboard"; `app-shell.test.tsx` "lists the header's controls in order" (the switcher is in the header)                                                                                                                        |
| `app.test` "links the product name to the home page"                                                                                                            | `app-shell.test.tsx` "has one home link named by the names it shows, then home" (`href` `/`, both languages)                                                                                                                                                                                                                                                     |
| `app.test` "announces a failed connection on the page, but not a closed popup"; "explains why it is not connected" (two rows)                                   | `auth-notice.test.tsx` "announces a failed connection above the page's heading" (each failure, `script-load-failed` among them), "shows a closed popup without interrupting", "shows a failure from the header on the page in view"                                                                                                                              |
| `app.test` "announces the %j auth state" (four rows) and "waits, in the menu" (two rows), now one test of one state, beside "follows auth state changes"        | `connection-status.test.tsx` (each of the six states' announcement); `account-menu.test.tsx` (each state's menu action and the waiting item)                                                                                                                                                                                                                     |
| `app-shell.test` the structural tests in Welsh (six runs)                                                                                                       | the same tests in English; the Welsh names by the copy tests                                                                                                                                                                                                                                                                                                     |
| `unpublished-changes.test` "does not mark the count as the current page while the one roadmap with changes is open"                                             | `unpublished-changes.test` "leads to the roadmap with changes while it is the only one, and to nothing on its own page" (now also holds the one current link)                                                                                                                                                                                                    |
| `families-page.test` "is linked from the navigation, not from the roadmap list"                                                                                 | `roadmap-navigation.test` "leads to each roadmap and to the families page"; `roadmaps-page.test` "lists the roadmaps as cards" (no Families link); `app-shell-navigation.test` "closes the drawer when a link is chosen" (reaches `/families`)                                                                                                                   |
| `reconnect-dialog.test` the row "its window closed after a refusal"                                                                                             | the row "its window closed": `connectFailure` reads `ready` and `expired` by one case                                                                                                                                                                                                                                                                            |
| `session-warning.test` "warns again before the renewed session ends"                                                                                            | `session-warning.test` "renews inside the click…, and warns again before the renewed session ends" (the same 58 minutes, after the renewal)                                                                                                                                                                                                                      |
| `auth-notice.test` "confirms disconnecting where the user is looking, but not connecting"                                                                       | `app.test` "connects from the start page and shows the roadmaps" (no note after connecting), "disconnects, clearing only auth-scoped queries, and confirms it" (the note)                                                                                                                                                                                        |
| `publish-plan.test` "writes the placement alone for a row already last there"                                                                                   | `item-moves.test.ts` "leaves a row that is already after every item of its new placement"; `publish-plan.test` "moves the row to just after the placement's last item" (the placement cell written beside it)                                                                                                                                                    |

Each holder runs without the Sheets adapter: a domain, component or page test against
the in-memory repository or the fake auth client, so it outlives the switch to the API
(CHO-014 S9). None rests on the spreadsheet fake, a parser or `google-auth-client.test.ts`,
and the repository contract's run is untouched.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | each rule's cases at its unit test (`details-outline`, `item-tags`, `pending-orders`, `item-moves`), the page tests kept for focus, an announcement, the card or the wiring: the Kept list above                                                                          |
| S2       | the cuts above; the table-driven rows (`matchItemChanges`, `it.each` of the lost publish and of the details found by content); `pnpm test` 141 files, 3,054 tests passing, from 3,085                                                                                     |
| S3       | the PR lists each cut and its holder; the one moved assertion (the Welsh status), the one folded check (aria-current) and the one gained check (the notice not beside the title) are named above; no axe scan, no E2E test and no Sheets-only assertion is among the cuts |
