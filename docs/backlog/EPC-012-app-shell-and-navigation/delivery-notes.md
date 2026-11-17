# EPC-012 delivery notes

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
- Component tests answer the reconnect dialog with `findReconnectDialog()` and
  `reconnectFromDialog(user)` (`features/auth/testing/reconnect-dialog.ts`); E2E with
  `reconnectDialog(page, language)` and `reconnectButton(page, language)`
  (`tests/e2e/fixtures/dialogs.ts`).
- A roadmap's title row is `RoadmapTitleRow` (`components/roadmap-title-row.tsx`) inside
  `StickyHeader` (`components/layout/sticky-header.tsx`), which renders its children
  with `stuck`. Slim a control by its props or classes, in place: moving it to another
  parent remounts it, and focus on it is lost as the row sticks. STY-054's phone menu
  button joins this row; "Jump to" comes in by its `jumpTo` slot, among the controls on
  a desktop (`DESKTOP_WIDTH`, 1024px) and in a row of its own below that.
- A bar pinned to the screen publishes its height through `usePinnedInset`
  (`components/layout/pinning.ts`), which `globals.css` turns into `scroll-padding`, so
  a focused control or a jumped-to heading stays clear of it. The top inset is the
  stuck row's last height, unset until the row first sticks. A scroll by script reads it
  with `usePinnedHeight(edge)`, as the placement navigation's jump does, which aligns
  again once the row first sticks. Pinning stops below a 500px viewport
  (`usePinning`): jsdom matches no media query, so nothing pins in component tests, and
  layout is held in `tests/e2e/roadmap-controls.spec.ts` and
  `placement-navigation.spec.ts`.
- Under reduced motion, `globals.css` gives every element a 0.01ms transition, so a
  padding or border a class adds arrives a frame late: measure a pinned bar's border
  box (`useMeasuredHeight` observes it), and run a layout check in E2E with
  `reducedMotion: "reduce"` too, since the E2E config runs without it.
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
  checks focus clear of the bars (`focusClearOfBars`). Playwright matches a role's
  name by substring: "More" finds "Show more" too, so name it `exact`.
