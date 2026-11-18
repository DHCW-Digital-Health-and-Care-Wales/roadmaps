# EPC-012 delivery notes

What agents delivering or reviewing this epic's stories needed; see `docs/AGENTS.md`.

- A new Refresh refetch passes `JOIN_READ` (`hooks/roadmap-queries.ts`), so a Refresh
  that asked to reconnect joins the reads reconnecting starts.
- A bar pinned to the screen publishes its height through `usePinnedInset`
  (`components/layout/pinning.ts`), which `globals.css` turns into `scroll-padding`, so
  a focused control or a jumped-to heading stays clear of it. The top inset is the
  stuck row's last height, unset until the row first sticks. A scroll by script reads it
  with `usePinnedHeight(edge)`, as the placement navigation's jump does, which aligns
  again once the row first sticks. Pinning stops below a 500px viewport
  (`usePinning`): jsdom matches no media query, so nothing pins in component tests, and
  layout is held in `tests/e2e/roadmap-controls.spec.ts` and
  `placement-navigation.spec.ts`.
- A menu item whose action moves focus runs it once the menu has closed
  (`useMenuChoice`, `lib/use-menu-choice.ts`), as More's items and "Jump to"'s do, so
  focus is not handed back to the trigger after it.
- A placement's heading (and the unplaced items') has the DOM id
  `jumpTargetHeadingId(target)` and `tabIndex={-1}`; `usePlacementNavigation` in
  `placement-navigation/` holds the targets' counts and pending marks, the current
  one and the jump.
- Component tests reach More, Refresh, the conflict review and the folded About
  (`openAbout`, `aboutField`) through `testing/roadmap-page.ts`; E2E through
  `fixtures/roadmap-page.ts`, which also opens a long roadmap (`openLongRoadmap`) and
  checks focus clear of the bars (`focusClearOfBars`).
- The shell's navigation is `RoadmapNavigation` (`features/roadmaps/navigation/`),
  drawn by `AppShell` in a `form`: `full` beside the page from `DESKTOP_WIDTH` or in the
  drawer below it, `rail` folded. Below it the menu button (`NavigationMenuButton`)
  starts the top bar and the stuck strip, with a dot and a longer name while any roadmap
  has unpublished changes (`UnpublishedRoadmapsContext`, from `AppShell`'s
  `unpublishedRoadmaps`). A bar pinned to the screen starts at
  `left-(--navigation-width)`, and the room the foot leaves at the page's end is the
  shell's page column's padding, inside the row the navigation sticks in. A destination
  is a `NavigationLink`, its `mark` an icon, a roadmap's initials (and whether it has
  unpublished changes) or a count.
- Unpublished changes in the shell (STY-055): the navigation's dot is `UnpublishedDot`
  (`components/layout/`), its count a `NavigationLink` under "All roadmaps", or text
  where it leads nowhere. What a screen reader is told is `UnpublishedAnnouncement`, a
  live region `AppShell` always renders, since the navigation is not in the page while
  a phone's drawer is closed; it speaks when the number changes, not on an edit. It is
  no `role="status"`: the specs find the page's own notices by that role. The count's
  target is `nextChangedRoadmap`. A roadmap with a dot is named "Title, unpublished
  changes", so a spec finds it by that name, and by the plain title while it has none.
  Disconnect's question is `DisconnectQuestion`, rendered by the root route since its
  links need the router; `PendingChangesProvider`, above the router, holds whether it is
  open.
