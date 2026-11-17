# EPC-012 delivery notes

- An action that needs a session (a write, a read, Refresh) wraps its handler in
  `useSessionAction(action)` (`features/auth/session-action.ts`) and calls the result
  with the pressed control (`event.currentTarget`, or a form's
  `event.nativeEvent.submitter`), never `disabled={!connected}` (STY-057). A control
  that moves into a pinned bar, a menu or the navigation keeps that wrapper: Publish's
  is in `RoadmapPublishing`, Refresh's in `RefreshButton`.
- A control that connects Google itself is `ReconnectButton` or `AuthButton`, which call
  `connect()` first inside the click (ADR-003); give the menu or bar that holds it no
  `await` before it.
- A new Refresh refetch passes `JOIN_READ` (`hooks/roadmap-queries.ts`), so a Refresh
  that asked to reconnect joins the reads reconnecting starts.
- Component tests answer the reconnect dialog with `findReconnectDialog()` and
  `reconnectFromDialog(user)` (`features/auth/testing/reconnect-dialog.ts`); E2E with
  `reconnectDialog(page, language)` and `reconnectButton(page, language)`
  (`tests/e2e/fixtures/dialogs.ts`).
