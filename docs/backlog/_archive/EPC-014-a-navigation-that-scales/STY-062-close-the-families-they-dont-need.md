# STY-062: A Product Lead closes the families they don't need

- **Status**: Done — each family's name is a button that closes and opens its roadmaps,
  with "Close all" and "Open all" above them, remembered on this device
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-014-a-navigation-that-scales](../../EPC-014-a-navigation-that-scales/README.md)
- **Depends on**: STY-061 (hard, must be on the default branch)
- **Binding ADRs**: ADR-010, ADR-008, ADR-005, ADR-013
- **Suggested model**: Sonnet — a disclosure per family and one for all, remembered as
  the fold is

## Summary

The navigation lists every family open, so a Product Lead scrolls past the products
they don't lead. This story makes each family's name a button that closes and opens its
roadmaps, with a chevron at its end, and adds "Close all", which becomes "Open all" once
every family is closed. Closed families are remembered on this device, keep a dot when
a roadmap inside has unpublished changes, and open again when the Product Lead goes to
one of their roadmaps. A search still finds roadmaps in closed families.

## Acceptance criteria

### S1: Close and open a family

**Given** the navigation open on a desktop, every family open
**When** the Product Lead presses "Single Record"
**Then** its roadmaps hide, its chevron points right, and it is announced as collapsed
**And** focus stays on it
**When** they press it again
**Then** its roadmaps show, and its chevron points down

### S2: A closed family with changes

**Given** Shared care plans has unpublished changes
**When** the Product Lead closes Single Record
**Then** its name keeps a dot, and a screen reader reads it with "unpublished changes"

### S3: Close all and Open all

**Given** every family open
**When** the Product Lead presses "Close all", above the first family
**Then** every family closes, the current roadmap's too, and the button becomes "Open
all" with focus on it; a screen reader names them "Close all families" and "Open all
families"
**And** a screen reader is told every family is closed
**When** they open one family alone
**Then** the button is "Close all" again
**When** they press "Close all", then "Open all"
**Then** every family opens

### S4: Remembered on this device

**Given** Single Record and Workforce closed, on the All roadmaps page
**When** the Product Lead reloads the page
**Then** both are still closed
**And** where browser storage can't be read or kept, every family is open and no error
shows

### S5: Going to a roadmap opens its family

**Given** Single Record closed
**When** the Product Lead goes to Shared care plans by any route (its card on the list,
the count, or its address, a reload included)
**Then** Single Record opens, so its current roadmap shows

### S6: A search finds roadmaps in closed families

**Given** Single Record closed
**When** the Product Lead searches "shared"
**Then** Shared care plans shows under "Single Record", a plain heading, and "Close all"
does not show
**When** they clear the search
**Then** Single Record is closed again

### S7: The rail and a single group

**Given** the navigation folded to its rail, with families closed
**When** the Product Lead looks at it
**Then** every roadmap's mark shows, with no family heading or control, and each
family's list keeps its name for a screen reader
**And** where no roadmap has a family, so the navigation names no family
(`namesFamilies`), there is no family button and no "Close all"

### S8: On a phone, in Welsh, by keyboard

**Given** the drawer at 375px in Cymraeg, or a keyboard alone, or the dark theme
**When** the Product Lead closes and opens families
**Then** the family buttons and "Close all" work in the drawer as on a desktop, their
names are in Cymraeg and fit, and each is reached and worked by keyboard with the
navigation's focus styles

## Decisions

- **D1** (owner, 2026-11-18, request and analysis decision 2 (a)): each family's name
  carries a chevron at its end, down while open and right while closed.
- **D2** (owner, 2026-11-18, request; placement left to the agent): a control that closes
  or opens every family. **D3** below places it.
- **D3** (agent, 2026-11-18, analysis decision 16 (a)): one button at the end of its own
  row above the first family, "Close all" while any is open and "Open all" once all are
  closed, shown only while the list is whole, over a button in the top row, which
  leaves the search too narrow at 208px.
- **D4** (agent, 2026-11-18, analysis decisions 3 (a), 4 (a), 5 (a) and 7 (a)): the whole
  name is the button; closed families are remembered on this device; a closed family
  with changes keeps a dot; a search finds roadmaps in closed families.
- **D5** (agent, 2026-11-18): going to a roadmap opens its family, over leaving the
  current page hidden in a closed one.

## Starting point

Audited at `f46384c`. A group's `key` is its family's English name (`familyKey`,
ADR-013), or `NO_FAMILY_KEY`: a family renamed on the families page gets a new key, so
it shows open after the rename. That is acceptable for a convenience; remembering by
key needs no migration.

## Out of scope

- The count's narrowing, which shows roadmaps in closed families: STY-063.

## Delivery

### Departures

- **The closed families live in `NavigationSearchProvider`** (agent): the provider's name
  now undersells it, but it already holds the groups, the shell's second live region and
  the state shared by the sidebar and the drawer, and the epic says to extend it, so
  `closed`, `toggleFamily` and `toggleAllFamilies` join `useNavigationSearch()` rather
  than a second provider.
- **A `navigation` variant of `Button`** (agent): white on navy with DHCW's active blue on
  hover, no border. `ghost` with class overrides hid the focus fill, since an
  `aria-expanded` background beat `focus-visible:focus-fill`; the focus tour caught it.
- **Names of the new buttons** (agent, copywriter): visible "Close all" / "Open all"
  and, as the accessible name, "Close all families" / "Open all families" (`aria-label`),
  so the words shown are inside the name (WCAG 2.5.3). In Cymraeg "Cau pob un" and "Cau pob
  un o'r teuluoedd", since a visible "Cau pob" with a spoken "teulu" after it does not parse.
- **The dot's words are the roadmaps' own** (agent): a closed family with changes is named
  `roadmaps.navigation.changed` ("Single Record, unpublished changes") by `aria-label`, no
  new key.
- **Open all empties the set** (agent): it forgets keys of families no longer listed, as
  well as opening the listed ones.
- **A closed family's list is not rendered** (agent), where the prototype also omits it;
  `aria-controls` is dropped while it is closed.
- **Arriving opens the family once per arrival** (agent, D5): the provider compares the
  current roadmap and its family with the last it handled while rendering, so closing the
  current roadmap's family afterwards (its button, or "Close all", S3) is not undone, and
  a refetch or a language change, which keep the family's key, do not reopen it.
- **A reload ends the session** (agent): the E2E scenarios that reload connect again, as
  the Product Lead does; the closed families are read from storage before they do.

### Contract for dependents

- `useNavigationSearch()` also gives `closed` (a set of `RoadmapGroup.key`),
  `toggleFamily(key)` and `toggleAllFamilies()` (says "All families closed" or "All
  families open" in the search's live region). `RoadmapNavigation` shows a family as a
  button only while the list is whole, in full and names families (`foldable`); STY-063's
  narrowing must leave `foldable` false and show closed families' roadmaps as the search
  does (`narrowGroups` already ignores `closed`).
- `closed-families.ts` (`features/roadmaps/navigation/`): `readClosedFamilies`,
  `storeClosedFamilies` and `CLOSED_FAMILIES_STORAGE_KEY` (`roadmaps.navigation.closed`, a
  JSON array of family keys; an unreadable value reads as none closed, with no error shown).
- Catalogue keys `roadmaps.navigation.families.*` (closeAll, closeAllName, openAll,
  openAllName, allClosed, allOpened).
- `Button` has a `navigation` variant.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `navigation-families.test.tsx` (`closing and opening a family`); `navigation-families.spec.ts` (`closes and opens a family …`)                                                                                                           |
| S2       | `navigation-families.test.tsx` (`a closed family with changes`)                                                                                                                                                                          |
| S3       | `navigation-families.test.tsx` (`Close all and Open all`); `navigation-families.spec.ts` (`closes every family and opens them again …`)                                                                                                  |
| S4       | `closed-families.test.ts`; `navigation-families.test.tsx` (`remembered on this device`); `navigation-families.spec.ts` (`remembers the closed families …`)                                                                               |
| S5       | `navigation-families.test.tsx` (`going to a roadmap opens its family`); `navigation-families.spec.ts` (`opens a family as its roadmap is opened …`)                                                                                      |
| S6       | `navigation-families.test.tsx` (`a search finds roadmaps in closed families`); `navigation-families.spec.ts` (`finds a roadmap in a closed family …`)                                                                                    |
| S7       | `navigation-families.test.tsx` (`the rail and a single group`, `with no roadmaps to list`); `navigation-families.spec.ts` (`shows every roadmap in the rail …`); `navigation-signed-out.aria.yml`                                        |
| S8       | `navigation-families.test.tsx` (`in the drawer on a phone`); `navigation-families.spec.ts` (`is reached and worked by keyboard`, phone in Cymraeg); axe in `accessibility.spec.ts`; focus tour in `focus-indicator.spec.ts`; screenshots |

Tests followed the code (layout and behaviour, not a pending-edit rule); each was shown red
by breaking the finished code, then restored: no opening on arrival (S5), the search
leaving families closable (S6), no dot (S2), nothing stored (S4), and a family button with
no roadmaps to list (S7), in `navigation-families.test.tsx`. The stray "Open all families"
button on the signed-out navigation was found by the structure snapshot and fixed.
