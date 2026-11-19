# STY-057: A Product Lead reconnects from the action that needs it, and carries on

- **Status**: Done — delivered in its PR
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-012-app-shell-and-navigation](README.md)
- **Depends on**: none. STY-052 depends on it (STY-052's Publish is its first caller,
  drawn in the EPC-012 UX prototypes), so it is delivered first
- **Binding ADRs**: ADR-003, ADR-012, ADR-008, ADR-010
- **Suggested model**: Opus — a reusable gate over every write and read that needs a
  session, with ADR-003's synchronous connect and focus return
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/136

## Summary

When a session expires, every action that needs Google is unavailable (though
focusable) until the Product Lead finds Reconnect, in the header or the alert at the top
of the page, often far from where they are working. The owner asked that such actions
stay available instead: pressing one asks the Product Lead to reconnect first, in one
reusable dialog, then carries on with what they pressed. Nothing pending is lost
either way. Controls unavailable for other reasons (a write under way, items still
being read) stay as they are. Every write, and Refresh, adopt it; editing pending
changes needs no session and stays as it is.

## Acceptance criteria

### S1: The action stays available

**Given** a session that has expired, with pending changes on a roadmap
**When** the Product Lead looks at Publish changes
**Then** it is available, not marked unavailable

### S2: Pressing it asks to reconnect first

**Given** that state
**When** the Product Lead presses Publish changes
**Then** a dialog says the session has ended, that their changes are kept, and offers
Reconnect and Cancel

### S3: Reconnecting carries on

**Given** that dialog
**When** the Product Lead chooses Reconnect and Google grants access
**Then** the dialog closes and the action carries on: here, the publish confirmation
opens, listing the changes
**And** Google's popup opened from the Reconnect click itself (ADR-003)

### S4: Cancelling or refusing loses nothing

**Given** that dialog
**When** the Product Lead chooses Cancel, or Google's access is refused or its popup
closed
**Then** nothing is written, every pending change is kept, the dialog says what
happened (for a refusal) or closes (for Cancel), and focus returns to the pressed
control

### S5: Other reasons stay unavailable

**Given** a publish under way, or a roadmap's items still being read
**When** the Product Lead looks at a control that waits on them
**Then** it is unavailable as today; only the session's state opens the dialog

### S6: Welsh and keyboard

**Given** Cymraeg chosen, keyboard only
**When** the Product Lead opens and answers the dialog
**Then** it is in Welsh, traps focus while open and returns it as S4 says

## Decisions

- **D1** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q1 with (a)): every write and Refresh
  adopt it: Publish changes (or Save), Publish roadmap and Unpublish roadmap, Add a
  roadmap, Add an item, Refresh, "Make it match" and the families page's writes.
  Changes, for those actions: STY-021 S14, STY-025 S12, STY-035 S1, STY-041 S1 and
  STY-046 S1 (archived), whose "unavailable while expired" this story replaces.
- **D2** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q2 with (a)): the action carries on by
  itself after reconnecting, as S3 says; a write still asks for confirmation wherever
  it does today.
- **D3** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q3 with (a)): Edit and Move, which
  change only pending edits, never ask to reconnect.

## Out of scope

- The session warning before expiry (STY-017): unchanged.
- Where Publish pins: STY-052.

## Delivery

### Departures

- **D1, the dialogs' own buttons adopt it too** (agent): every write is gated where it
  is pressed, so the confirming button inside Publish changes', Publish roadmap's,
  "Make it match"'s and the family change's dialogs, the family form's save and the
  "Add a roadmap" dialog's "Add roadmap" stay available and ask to reconnect, over the
  dialog, when the session ended while it was open. A write still asks for
  confirmation wherever it did (D2).
- **STY-041 S11: the "Add a roadmap" dialog loses its own expired alert and Reconnect**
  (agent): "Add roadmap" now asks in the reconnect dialog, as every write does, so the
  in-form alert ("Reconnect to Google to add the roadmap. What you've typed is kept.")
  would offer a second Reconnect for the same thing. What was typed is kept, and is
  added once reconnected. STY-052 D8 takes the same line for the pinned bar.
- **The dialog says the same for every action** (agent, with the copywriter skill):
  "Reconnect to Google to carry on. Your changes are kept in this tab." The prototype's
  "to publish your changes" was drawn for Publish alone; one sentence serves every
  control that asks, as the action itself carries on.
- **A check before a write asks after reconnecting** (agent): "Add roadmap" and the
  family form check their fields when they submit, which is after the dialog, so an
  empty title is said once reconnected.
- **Refresh on the families page shows only once something has been read** (agent):
  beside the "Connect Google" panel there is nothing to refresh, and a Refresh there
  would ask to reconnect a session that never was. A roadmap's page already offers no
  Refresh in that state.
- **A Refresh that asked joins the reads reconnecting starts** (agent): reconnecting
  reads the page again by itself, so each Refresh refetch joins a read under way
  (`JOIN_READ`) rather than cancel and repeat it. While connected, Refresh is busy, and
  unavailable, during the reads it shows; a family or category list read it doesn't
  show is joined rather than restarted, which reads the same. Reconnecting on a
  roadmap's page already reads the list twice:
  [DEF-018](../defects/DEF-018-reconnecting-on-a-roadmap-s-page-reads-the-roadmap-list-twice.md).
- **A refused reconnect on the roadmap list leaves it for the start page** (agent): a
  refusal is the auth state `error`, and `/` shows the start page for it, as any failed
  connection has since the first sign-in story. The reconnect dialog stays, saying why,
  but the list's Refresh or "Add a roadmap" that asked is gone with the list: S3 does
  not carry it on once reconnected, and S4 returns focus to the page, not to it. The
  "Add a roadmap" dialog and what was typed go too, as
  [DEF-006](../../_archive/defects/DEF-006-a-refused-reconnect-drops-the-add-a-roadmap-dialog.md)
  records (Won't fix). A roadmap's page and the families page keep what they read, so
  S3 and S4 hold there. A control gone by the time the session resumes carries nothing
  on.

### Contract for dependents

- **`useSessionAction(action)`** (`src/features/auth/session-action.ts`): wrap any
  action that needs a session. It returns `(from: HTMLElement | null) => void`; call it
  with the control pressed (`event.currentTarget`, or a form's
  `event.nativeEvent.submitter`). Connected, it runs `action` at once; otherwise the
  reconnect dialog asks, and once reconnected the component's latest `action` runs,
  after focus is back on `from`, so a dialog it opens returns focus there. A control
  disabled for another reason (a write under way, items not read) keeps `disabled`;
  none is disabled for want of a session any more (S5). STY-052's pinned Publish calls
  the existing `RoadmapPublishing` handler, which already uses it.
- **`ReconnectDialogProvider`** (`src/features/auth/components/reconnect-dialog.tsx`)
  is mounted once in `AppProviders`, inside `AuthProvider`. Its dialog's Reconnect is
  `ReconnectButton`, which now takes `ref`, `size` and `onReconnect` (it calls
  `connect()` first, in the click, ADR-003). `SessionExpiredAlert`, left with one
  caller, is folded into `RoadmapsErrorState`. `connectFailure(state)`
  (`features/auth/connect-failure.ts`) says why the latest attempt to connect failed,
  for the dialog and the page notice alike.
- **`useReturnFocus(target?)`** returns focus to `target` when given, else to what had
  it as the dialog opened.
- **`JOIN_READ`** (`hooks/roadmap-queries.ts`) is a Refresh's refetch options; the
  page Refreshes and `useRoadmapLists().refetch` use it.
- **Copy**: `auth.reconnectDialog.title`, `.description` and `.failed`, in both
  catalogues; `roadmaps.add.expired` is gone. The pattern is in the copywriter's
  `references/patterns.md` (_Expired session_).
- **Tests**: `findReconnectDialog(name?)` and `reconnectFromDialog(user)`
  (`src/features/auth/testing/reconnect-dialog.ts`) find and answer the dialog in a
  component test; E2E uses `reconnectDialog(page, language)` and
  `reconnectButton(page, language)` (`tests/e2e/fixtures/dialogs.ts`). Its structure is
  `reconnect-dialog.aria.yml` (and `-cy`). The epic's `delivery-notes.md` carries
  these for the stories that follow.

### Scenario evidence

`dialog` is `src/features/auth/components/reconnect-dialog.test.tsx`; `e2e` is
`tests/e2e/reconnect.spec.ts`; `pages/` is `src/features/roadmaps/pages/`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | dialog "stays available after the session has expired…"; `pages/roadmap-detail-page-editing.test.tsx` "keeps them while the session has expired; Publish asks to reconnect…"; for D1's other actions `roadmap-detail-page-publishing-roadmap`, `-adding`, `-items`, `-matching`, `roadmaps-page-adding` and `families-page` tests (each "asks to reconnect…"); e2e "Publish stays on offer…", "Refresh asks to reconnect…"; `structure` `main-expired` (Refresh and "Add a roadmap" no longer `[disabled]`)                                                |
| S2       | dialog "stays available… asks to reconnect first"; e2e "Publish stays on offer…"; `structure` `reconnect-dialog`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S3       | dialog "connects inside the Reconnect click, then closes and carries on…", "carries on with the action as its component renders it…"; `roadmap-detail-page-editing.test.tsx` (the publish dialog opens listing the change; from an open dialog, it publishes); e2e "Publish stays on offer…", where the fake GIS fails the test unless the popup comes from the click                                                                                                                                                                                      |
| S4       | dialog "Cancel closes it…", "Escape cancels…", "says why when Google's access is …" (refused, closed, closed after a refusal, blocked), "says nothing of a failure from before it opened"; `roadmap-detail-page-editing.test.tsx` "keeps them when reconnecting is cancelled…"; `roadmaps-page-adding.test.tsx` "keeps what was typed when reconnecting is cancelled…"; e2e "a refusal or a closed window says why…"; `pages/roadmaps-page.test.tsx` "leaves the list for the start page when the reconnect Refresh asked for is refused…" (the departure) |
| S5       | `roadmap-detail-page-adding.test.tsx` "stays unavailable while the items can't be read, once the session has expired too"; `roadmap-detail-page-editing.test.tsx` "keeps Publish unavailable while a publish is under way, once the session has expired too"                                                                                                                                                                                                                                                                                               |
| S6       | dialog "is in Welsh, keeps focus inside and returns it by keyboard"; e2e "in Welsh, by keyboard…"; `accessibility.spec.ts` (the dialog over "Add a roadmap", both themes); `structure` `reconnect-dialog-cy`                                                                                                                                                                                                                                                                                                                                               |

The new tests followed working code. Each that holds a rule was shown red by
breaking the finished code: carrying on with the action as pressed, not as rendered,
fails "carries on with the action as its component renders it" and "carries nothing on
for a control that has gone"; keeping the action after its control unmounts fails the
latter alone; saying a failure from before the dialog opened fails "says nothing of a
failure from before it opened"; a Refresh that restarts reads fails the items page's
"reads each once".
