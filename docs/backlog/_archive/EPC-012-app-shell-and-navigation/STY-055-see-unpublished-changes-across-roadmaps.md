# STY-055: A Product Lead sees which roadmaps have unpublished changes, from any page

- **Status**: Done — a dot on each roadmap with unpublished changes and their count in
  the shell's navigation (D1, D3), a dot on the phone's menu button (D4), and the
  roadmaps named in Disconnect's question (D2)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-012-app-shell-and-navigation](../../EPC-012-app-shell-and-navigation/README.md)
- **Depends on**: STY-054 (hard: the count lives in its navigation and on its menu
  button)
- **Binding ADRs**: ADR-012, ADR-010, ADR-008
- **Suggested model**: Sonnet — reads the existing pending-changes store; one
  indicator and its list
- **Delivered**: _(PR URL, added once the PR exists)_

## Summary

Pending changes live in memory per roadmap, and only that roadmap's page and card say
so. On the families page or another roadmap, nothing tells a Product Lead that work is
waiting to be published, and losing it or forgetting it are the persona's top risks.
This story shows, from every page, how many roadmaps have unpublished changes, and
leads to each. It changes nothing about how changes are kept or published.

## Acceptance criteria

### S1: The count from any page

**Given** pending changes on Product A and Product B
**When** the Product Lead is on the families page
**Then** the shell says 2 roadmaps have unpublished changes

### S2: To each one

**Given** that count
**When** the Product Lead chooses it, or a roadmap in the navigation
**Then** they reach each roadmap with changes; each is marked in the navigation

### S3: Nothing pending

**Given** no pending changes anywhere
**When** the Product Lead looks at the shell
**Then** it shows no count

### S4: Announced, not noisy

**Given** a screen reader
**When** a change is made or published
**Then** the count's change is available, without announcing it on every edit

## Decisions

- **D1** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q1 with (a)): a dot beside each
  roadmap with changes in STY-054's navigation, and "2 roadmaps have unpublished
  changes" at its top, leading to each. No chip in the top bar.
- **D2** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q2 with (a)): Disconnect's prompt
  names the roadmaps with unpublished changes, each linking to it.
- **D3** (agent, 2026-11-17): with the navigation folded to its rail (STY-054 D5), the
  rail keeps each roadmap's dot and the total, so S1 holds folded; over a top-bar
  chip, which the owner declined in D1.
- **D4** (owner, 2026-11-17, EPC-012 review round 1): on a phone, where the navigation is a closed drawer,
  the menu button (in the top bar and in a roadmap's sticky strip, STY-054 D8, D9)
  carries a dot while any roadmap has unpublished changes, its accessible name saying
  how many; inside the drawer, the dots and total show as on a desktop. This is how S1
  holds on a phone.

- **D5** (agent, 2026-11-18): the count leads to one roadmap, the next with changes
  after the one open in the navigation's order and round to the first, over leading to
  the first always (which reaches one) or opening a list of them (a second surface in a
  rail). Choosing it again reaches each in turn, and the dots say which (S2).
- **D6** (agent, 2026-11-18): while the roadmaps are unread (not connected, loading,
  or a list that failed) the count shows as text that leads nowhere, over hiding it: the
  changes outlive Disconnect (STY-025 S14), and S1 says from any page.

## Out of scope

- Keeping changes across a reload: drafts, after the MVP (persona A9, A10).

## Delivery

### Departures

- **The count leads to one roadmap, in turn** (agent, D5): S2's "reach each roadmap with
  changes" by choosing the count is met by choosing it again; the dots and the
  navigation reach any directly.
- **The count shows as text while the roadmaps are unread** (agent, D6): not connected,
  loading or a failed list leaves nothing to lead to, so it is a plain entry (`NavigationText`).
- **The count's region is `aria-live="polite"`, not `role="status"`** (agent, found
  here): a second `status` on every page made 21 specs that find the page's notice by
  that role ambiguous; the region is the same to a screen reader.
- **Disconnect's question moved into the router** (agent, D2): its roadmaps are links, and
  `PendingChangesProvider` sits above the router. The provider keeps the question's state
  (`DisconnectQuestionContext`); `DisconnectQuestion` is rendered by the root route. The
  roadmaps it names are those the list held when Disconnect was pressed, so its text
  stays as it fades. Choosing a link closes the question without disconnecting and moves
  focus to the page it opens, once the dialog has closed, as the drawer does.
- **Shared with earlier code** (agent): `UnpublishedDot` replaces the placement menu's own
  dot (`JumpTargetLabel`); `isPlainClick` (`lib/`) is the drawer's plain-click test, now
  also the question's; `MAIN_ID` moved to `main-landmark.ts` so the question can name the
  page it focuses.
- **Rail: a count in a circle** (agent): the rail shows the number in a bordered circle
  and each roadmap's dot at the corner of its initials, as the chosen frames draw it.

### Contract for dependents

- **`AppShell`** takes `unpublishedRoadmaps: number` (the root route passes
  `useChangedRoadmapCount()`), which `NavigationMenuButton` reads from
  `UnpublishedRoadmapsContext`: a dot while above 0 and the name "Menu, 2 roadmaps have
  unpublished changes". STY-056's reshaped top bar keeps the button and its context.
- **`NavigationLink` and `NavigationText`** take `unpublished`; a roadmap with a dot is
  named "Title, unpublished changes" (`roadmaps.navigation.changed`).
- **Copy**: `layout.navigation.unpublished` (the count, six Welsh forms),
  `layout.navigation.menuUnpublished`, `roadmaps.navigation.changed`.
- **Data source**: nothing written changes; the store and its rules are as ADR-012 has
  them.

### Scenario evidence

`unp` is `src/features/roadmaps/navigation/unpublished-changes.test.tsx`; `e2e` is
`tests/e2e/unpublished-changes.spec.ts`.

| Scenario | Held by                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | unp "says how many roadmaps have unpublished changes from the families page, and marks each"; e2e the same, with the dot's colour; e2e "carries a dot on the menu button…" (D4)                                                                         |
| S2       | unp "leads to each roadmap with changes in turn, round to the first"; `next-changed-roadmap.test.ts`; e2e "leads from the count to each roadmap with changes in turn" (focus on the page)                                                               |
| S3       | unp "shows no count and no dot while nothing is pending" and "drops the count and the dot as a roadmap's last change goes"; e2e both                                                                                                                    |
| S4       | unp "speaks only when the number changes, not on a second edit of a roadmap" (no mutation of the live region on the second edit; the region is the same element throughout)                                                                             |
| D2       | unp "Disconnect's question" (names each as a link; closes on choosing one, connection and changes kept, focus on the page; stays open for a modified click; no list before the roadmaps are read); e2e the same; `structure` `edit-disconnect-question` |
| D3       | unp "keeps the dots and the count folded to a rail"; e2e the same                                                                                                                                                                                       |
| D4       | unp "on a phone" (name and dot, plain while nothing is pending, the drawer's dots and count); e2e the menu button, the sticky strip's button, and Cymraeg at 375px with no sideways scroll; unp "in Welsh" for each plural form and name                |

These followed working code, each shown red by breaking it: the count's wrap-around
fails `next-changed-roadmap.test.ts` and the e2e "in turn"; the menu button's name
unchanged fails both D4 phone tests; its dot hidden fails "has a plain menu button…"; the
live region gone fails seven of unp; a roadmap's dot gone fails the S1 test; a link's
plain-click test gone fails "stays open for a link opened elsewhere". Focus on the page
after a link is chosen is held by the e2e only: jsdom's focus does not move on to the
first control as Chromium's does, so without moving it the e2e left focus on "Back to
roadmaps" while the unit test passed.
