# STY-063: A Product Lead shows only the roadmaps with unpublished changes

- **Status**: Done — with two or more roadmaps changed the count is a button that shows
  only them, pressed again it shows every roadmap
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-014-a-navigation-that-scales](../../EPC-014-a-navigation-that-scales/README.md)
- **Depends on**: STY-061 (hard, must be on the default branch), STY-062 (hard)
- **Binding ADRs**: ADR-010, ADR-008, ADR-012
- **Delivered**: _(set once the PR is open)_
- **Suggested model**: Sonnet — the count's link becomes a toggle on the narrowing
  STY-061 builds

## Summary

With several roadmaps changed, "3 roadmaps have unpublished changes" leads to one of
them at a time, so seeing which wait to publish means reading dots down the list. This
story makes the count, while two or more roadmaps have changes, a button that shows
only those roadmaps; pressing it again shows every roadmap. It empties any search, and
the navigation stays open, the phone's drawer too. With one roadmap changed the count
still leads to it, as today.

## Acceptance criteria

### S1: Only the roadmaps with changes

**Given** Electronic prescribing, Shared care plans and Carers' register have unpublished
changes, Single Record is closed, and the search holds "care"
**When** the Product Lead presses "3 roadmaps have unpublished changes"
**Then** the search empties and only those three roadmaps show, each under its family's
name, Shared care plans among them
**And** the count shows pressed, to sight and to a screen reader, and focus stays on it
**And** a screen reader is told only the 3 roadmaps with unpublished changes show

### S2: Every roadmap again

**Given** the count pressed
**When** the Product Lead presses it again
**Then** every roadmap shows, Single Record closed as it was, and the search stays empty
**And** a screen reader is told every roadmap shows

### S3: Typing lets the count go

**Given** the count pressed
**When** the Product Lead types in the search
**Then** the count is no longer pressed, and the search narrows the list (STY-061)
**And** spaces alone leave the count pressed, and nothing is announced

### S4: Fewer than two left

**Given** the count pressed with two roadmaps changed
**When** the Product Lead discards or publishes one roadmap's changes
**Then** every roadmap shows, and the count leads to the one left with changes, as
today (STY-055 D5, D6)

### S5: One roadmap with changes

**Given** only Electronic prescribing has unpublished changes
**When** the Product Lead chooses the count
**Then** Electronic prescribing's page opens, as today; on its own page the count is
text

### S6: Moving between pages, and the phone

**Given** the count pressed
**When** the Product Lead chooses Carers' register
**Then** its page opens, and the navigation still shows only the roadmaps with changes
**And** on a 375px phone, pressing the count leaves the drawer open and the desktop's
fold as it was, and choosing a roadmap closes the drawer

### S7: From the rail

**Given** the navigation folded to its rail, three roadmaps changed, the count pressed
or not
**When** the Product Lead presses the count's circle
**Then** the navigation opens, remembered as open, with only those three showing and
the count pressed
**And** in the rail the circle carries no pressed state, since pressing it always opens
the navigation narrowed

### S8: Welsh, keyboard and dark

**Given** the interface in Cymraeg at the navigation's narrowest and in the drawer at
375px, or a keyboard alone, or the dark theme
**When** the Product Lead presses the count
**Then** its text and the pressed state fit with no sideways scroll, it is reached and
worked by keyboard with the navigation's focus styles, and its pressed state is visible
on navy in both themes

### S9: While the roadmaps are unread

**Given** three roadmaps with unpublished changes, and the Product Lead disconnected or
the list failed to load
**When** they look at the navigation
**Then** the count is text, as STY-055 D6 says, and nothing to press

## Decisions

- **D1** (owner, 2026-11-18, request and analysis decision 9): with two or more roadmaps
  changed, the count shows only them and shows every roadmap when pressed again, without
  bringing back a search it emptied; the navigation stays open. The owner accepted this
  change to STY-055 D5.
- **D2** (agent, 2026-11-18, analysis decision 9 (a)): with one roadmap changed, the
  count still leads to it, over a button that shows that roadmap alone.
- **D3** (agent, 2026-11-18, analysis decisions 8 (a) and 10 (a)): typing lets the count
  go, over searching within the roadmaps with changes; the narrowing ends when fewer
  than two are left.
- **D4** (agent, 2026-11-18, analysis decisions 11 (a) and 12 (a)): the narrowing lasts
  while moving between pages, not past a reload; the rail's circle opens the navigation
  narrowed.
- **D5** (agent, 2026-11-18, code review, analysis decision 19 (a)): the rail's circle
  opens the navigation narrowed whether or not the count was pressed; the drawer's count
  leaves the desktop's fold alone; a blank search neither lets the count go nor
  announces anything.

## Starting point

Audited at `f46384c`. `UnpublishedTotal` renders the count as a `NavigationLink` to
`nextChangedRoadmap(...)`, or `NavigationText` where there is none to lead to. Its
round-robin (`next-changed-roadmap.ts`) serves only the one-roadmap case after this
story, where "the next" is always that roadmap: delete what no longer earns its place.

## Out of scope

- A list of the changed roadmaps elsewhere, such as Disconnect's (STY-055 D2):
  unchanged.

## Delivery

### Departures

- **The narrowing is `NavigationSearchProvider`'s** (agent): `onlyChanged`, `showChanged()`
  and `showEveryRoadmap()` join `useNavigationSearch()`, and `found` is what the navigation
  lists whether the search or the count narrows it, as the epic's notes say. The provider
  now reads the pending changes (`usePendingChanges`), which are above the router.
- **Focus asks for a target** (agent): `requestFocus` and `takeFocusRequest` take
  `"search"` or `"count"`, so the rail's circle, which opens the navigation as the
  spyglass does, leaves focus on the count it opened rather than on nothing. S7 does not
  say where focus goes.
- **`AppShell`'s `navigation` takes `openNavigation` too** (agent), as `navigationSearch`
  does, since the rail's circle opens the rail; `RoadmapNavigation` takes
  `onOpenNavigation`.
- **Fewer than two ends the narrowing while rendering** (agent, S4): the provider drops the
  pressed state when the changed roadmaps fall below two, so a second change later does
  not bring the narrowing back. While the roadmaps are unread the pressed state waits, as
  the search does (STY-061 S11), and the count is text (S9).
- **`next-changed-roadmap.ts` and its test are deleted** (agent, the record's Starting
  point): with one roadmap changed the count leads to it, unless it is the page open.
  STY-055's "leads to each in turn" scenario, S2's round robin, is gone with it (D1); its
  unit and E2E tests now hold the one-roadmap case.
- **The count's button ends with Lucide's `list-filter`** (agent), the prototype's filter
  icon, in full only; pressed takes the current page's fill (`sidebar-accent`) on its entry.
- **`change` for the tests** (agent): the helper that gives a roadmap a pending change moved
  to `src/features/roadmaps/testing/change-roadmap.ts`, shared by two test files.

### Contract for dependents

- `useNavigationSearch()` also gives `onlyChanged`, `showChanged()` and
  `showEveryRoadmap()`; `requestFocus(target)` and `takeFocusRequest(target)` take
  `"search" | "count"` (`NavigationFocusTarget`). `narrowToRoadmaps(groups, ids)` is in
  `narrow-roadmaps.ts`.
- `NavigationButton` (`navigation-link.tsx`) is an entry that presses, beside
  `NavigationLink` and `NavigationText`; a `count` mark takes `narrows`. An entry holding a
  pressed button takes the current page's fill.
- Catalogue key `roadmaps.navigation.showingChanged` (plural, said as the count narrows the
  list); "Showing all roadmaps" is reused for S2.
- Nothing is stored: the narrowing does not outlast a reload (D4).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `changed-roadmaps-only.test.tsx` (`shows only the roadmaps with changes …`); `navigation-changed.spec.ts` (`shows only the roadmaps with changes … (S1, S2)`); `narrow-roadmaps.test.ts` (`narrowToRoadmaps`)                                                                         |
| S2       | `changed-roadmaps-only.test.tsx` (`shows every roadmap again …`, `keeps the closed families …`); `navigation-changed.spec.ts` (as S1)                                                                                                                                                 |
| S3       | `changed-roadmaps-only.test.tsx` (`lets go as the Product Lead types …`, `keeps the count pressed for spaces alone …`); `navigation-changed.spec.ts` (`lets the count go …`)                                                                                                          |
| S4       | `changed-roadmaps-only.test.tsx` (`shows every roadmap, and leads to the one left …`)                                                                                                                                                                                                 |
| S5       | `unpublished-changes.test.tsx` (`leads to the roadmap with changes while it is the only one …`); `unpublished-changes.spec.ts` (`leads from the count to the one roadmap …`)                                                                                                          |
| S6       | `changed-roadmaps-only.test.tsx` (`lasts while moving between pages`, `the count in the drawer on a phone`); `navigation-changed.spec.ts` (`lets the count go … lasts while moving`, `leaves the drawer open …`)                                                                      |
| S7       | `changed-roadmaps-only.test.tsx` (`the count folded to a rail`); `navigation-changed.spec.ts` (`opens the folded navigation narrowed …`)                                                                                                                                              |
| S8       | `changed-roadmaps-only.test.tsx` (`in Welsh`); `navigation-changed.spec.ts` (Cymraeg at the narrowest, the drawer in the dark at 375px); axe in `accessibility.spec.ts`; `focus-indicator.spec.ts` (`the navigation's count takes the fill …`, by keyboard, both themes); screenshots |
| S9       | `unpublished-changes.test.tsx` (`says it as text alone while the roadmaps are not read …`); `changed-roadmaps-only.test.tsx` (`is text, with nothing to press …`); `navigation-changed.spec.ts` (`is text, with nothing to press …`)                                                  |

Tests followed the code (layout and behaviour, not a pending-edit rule); each was shown red
by breaking the finished code, then restored: typing not letting the count go (S3), the
spaces-only saying (S3), no reset below two (S4) and no focus request from the rail (S7),
in `changed-roadmaps-only.test.tsx`.
