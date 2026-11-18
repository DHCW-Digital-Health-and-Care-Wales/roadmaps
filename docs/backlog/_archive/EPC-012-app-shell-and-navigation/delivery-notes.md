# EPC-012 delivery notes

What agents delivering or reviewing this epic's stories needed; see `docs/AGENTS.md`.
The epic is closed (STY-056): its notes on the reconnect dialog's and the account menu's
test helpers, on jsdom's media queries and the navigation's shared link names, and on
layout checks under reduced motion moved to `src/features/roadmaps/AGENTS.md` and
`tests/e2e/AGENTS.md`.

- An action that needs a session (a write, a read, Refresh) wraps its handler in
  `useSessionAction(action)` (`features/auth/session-action.ts`) and calls the result
  with the pressed control (`event.currentTarget`, or a form's
  `event.nativeEvent.submitter`), never `disabled={!connected}`. A control
  that moves into a pinned bar, a menu or the navigation keeps that wrapper: Publish's
  is in `RoadmapPublishing`, Refresh's in `RoadmapMoreMenu` on a roadmap's page and
  `RefreshButton` elsewhere.
- A control that connects Google itself is `ReconnectButton` or `AuthButton`, which call
  `connect()` first inside the click (ADR-003); give the menu or bar that holds it no
  `await` before it.
- A new Refresh refetch passes `JOIN_READ` (`hooks/roadmap-queries.ts`), so a Refresh
  that asked to reconnect joins the reads reconnecting starts.
- A roadmap's title row is `RoadmapTitleRow` (`components/roadmap-title-row.tsx`) inside
  `StickyHeader` (`components/layout/sticky-header.tsx`), which renders its children
  with `stuck`. Slim a control by its props or classes, in place: moving it to another
  parent remounts it, and focus on it is lost as the row sticks. Stuck, the row starts
  with the shell's menu button (`NavigationMenuButton`) wherever there is a drawer;
  "Jump to" comes in by its `jumpTo` slot, among the controls on a desktop
  (`DESKTOP_WIDTH`, 1024px) and in a row of its own below that.
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
- The top bar holds the language (`LanguageSwitcher`) and `AccountMenu`
  (`features/auth/components/`): the theme (`ThemeMenuItem`) and the session's one action,
  Disconnect while connected, otherwise Connect or Reconnect. Connect's `connect()` runs
  in the item's click (ADR-003), Disconnect's request once the menu has closed
  (`useMenuChoice`, as it may open a dialog). The connection shows only as
  `ConnectionStatus`, a live region visible to no one; a connect shows no notice, a
  disconnect still does. The service name holds one line at every width in both
  languages (`tests/e2e/shell.spec.ts`): a wider header control breaks that.
  `chooseFromAccountMenu(user, name)` and `disconnectFromHeader(user)`
  (`features/auth/testing/account-menu.ts`) drive the menu in component tests, and
  `fixtures/account-menu.ts` in E2E.
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
