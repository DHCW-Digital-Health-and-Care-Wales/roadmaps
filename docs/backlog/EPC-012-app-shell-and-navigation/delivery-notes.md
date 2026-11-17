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
  parent remounts it, and focus on it is lost as the row sticks. STY-053's "Jump to" and
  STY-054's phone menu button join this row.
- A bar pinned to the screen publishes its height through `usePinnedInset`
  (`components/layout/pinning.ts`), which `globals.css` turns into `scroll-padding`, so
  a focused control or a jumped-to heading stays clear of it. The top inset is the
  stuck row's last height, unset until the row first sticks. Pinning stops below a
  500px viewport (`usePinning`): jsdom matches no media query, so nothing pins in
  component tests, and layout is held in `tests/e2e/roadmap-controls.spec.ts`.
- A More item runs its action once the menu has closed (`RoadmapMoreMenu`), so focus is
  back on More, where the reconnect dialog and the dialog it opens return it.
- Component tests reach More, Refresh and the conflict review through
  `testing/roadmap-page.ts`; E2E through `fixtures/roadmap-page.ts`.
