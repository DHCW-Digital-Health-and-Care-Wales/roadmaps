# apps/editor/src/features/roadmaps — tests

- Read the focus a dialog, a menu or an opened field moves into through
  `expectOpeningFocus` (`testing/opening-focus.ts`), and await it before pressing a key
  there: focus lags the element it lands on, a frame later in a Base UI popup, and a key
  pressed first reaches what had focus.
- jsdom matches no media query, so a page test renders a phone, its navigation in the
  closed drawer: `matchMediaQueries(DESKTOP_WIDTH)` (`apps/editor/src/test/media-query.ts`) renders it
  beside the page.
- Answer the reconnect dialog with `findReconnectDialog()` and `reconnectFromDialog(user)`
  (`features/auth/testing/reconnect-dialog.ts`), and choose from the header's account menu
  with `chooseFromAccountMenu` and `disconnectFromHeader`
  (`features/auth/testing/account-menu.ts`): the header has no Disconnect button.
