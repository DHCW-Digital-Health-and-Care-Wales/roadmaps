# CHO-040: The connecting and publishing specs hold only what their component tests cannot

- **Status**: Done
- **Type**: Refactor
- **Area**: E2E + Features/UI (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-003, ADR-006, ADR-018
- **Suggested model**: Sonnet — each test is weighed against the component test that
  may hold it, and the gesture and token checks kept
- **Delivered**: [PR #260](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/260)

## Summary

The specs for connecting, the session and publishing take 33 s of the E2E suite's
1,215 s summed. Only a browser sees Google's popup open inside a real click and the next
request carry a renewed token, and those tests stay; most of the rest assert notices
and dialogs that component and page tests already assert. Cutting them saves about 26 s
and 430 lines. Sign-in moves to the API at the switch (ADR-018), so these cuts matter
less the sooner it comes. Done looks like: these specs hold the gesture, the tokens and
one publish through the fakes.

## Measurement

At `9ee767b`, five specs (`auth`, `reconnect`, `session-warning`, `publishing-roadmap`,
`sheets-writes`): 32 tests, one run each. Candidates, estimates re-read at delivery
(CHO-014 D12):

| Candidates                                                        | CI s | Held by                                                                                                                | Verdict                                                                    |
| ----------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `auth.spec.ts:71`, eight of its ten rows of ways connecting fails | ~7   | `auth-notice.test.tsx:30`, `:65`, `:135`; `google-auth-client.test.ts:247`, `:260`, `:299`, `:403`; `app.test.tsx:348` | Keep the blocked popup from the start page and access denied from the menu |
| `auth.spec.ts:102`, `:128`, `:159`                                | ~3   | `auth-notice.test.tsx:76`, `:219`, `:321`, `:396`                                                                      | Cut                                                                        |
| `reconnect.spec.ts:94`, `:131`, `:154`, `:174`                    | ~7   | `reconnect-dialog.test.tsx:155`, `:169`, `:190`, `:265`; `roadmap-detail-page-editing.test.tsx:645`                    | Cut; keep `:59`, the real Reconnect click and write                        |
| `session-warning.spec.ts:38`, `:84`, `:115`                       | ~2   | `session-warning.test.tsx:60`, `:83`, `:193`, `:211`; `google-auth-client.test.ts:607`                                 | Cut; keep `:53`, the renewal in a real click                               |
| `publishing-roadmap.spec.ts:86`, `:110`, `:136`, `:153`, `:186`   | ~7   | `roadmap-detail-page-publishing-roadmap.test.tsx:231`, `:260`, `:288`, `:460`, `:477`, `:524`                          | Cut; keep `:53`, the publish and the list after a reload                   |
| `sheets-writes.spec.ts:57`, `:82`                                 | ~1   | Nothing: they test the Sheets fake                                                                                     | Keep; may merge                                                            |

Not settled: whether `auth.spec.ts:177`, a real script that fails to load, is worth
its second; whether the Sheets adapter's parser tests hold a tab with only its header
and a `Soon` horizon (`publishing-roadmap.spec.ts:153`, `:186`). The Welsh title of the
publish confirmation (`cy.ts`) is asserted only in E2E.

## Acceptance criteria

### S1: These specs hold the gesture, the tokens and one publish

**Given** the five specs above at `9ee767b`
**When** the chore is delivered
**Then** what remains holds Google's popup opened inside a real click, a renewed or
reconnected token on the next request, a token kept out of storage, and one publish
through the fakes shown after a reload

### S2: The cuts meet CHO-014

**Given** any test this chore cuts or trims
**When** its PR is raised
**Then** CHO-014's S4, S5, S7 and S9 hold for it; an assertion held only by
`google-auth-client.test.ts` counts as about Google sign-in alone

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

## Out of scope

- The duplicates among the auth component tests and `google-auth-client.test.ts`:
  CHO-041 takes the component tests; the GIS client's go with it at the switch.

## Delivery

### Departures

- Estimates re-read at delivery (CHO-014 D12), against `2bcbe692` (the `main` run of
  CHO-038 merged): the five specs took 32 runs and 33.3 s summed on CI. After: 9 runs,
  23 fewer. The 23 run names that are gone took 24.9 s summed on CI there, against the
  record's ~26 s; the time after is not re-measured on CI (the 9 runs took 7.8 s on this
  host with four workers). The five specs go from 918 to 503 lines (the record said
  430), and Vitest gains one 26-line test. Line numbers below are those of `2bcbe692`.
  Tests only.
- `auth.spec.ts:71` is two runs, as the record says: access denied from the account
  menu and the blocked popup from the start page (from ten). Each keeps what only a
  browser shows, a failure after a real click and trying again working, with the
  header's status, the notice, its dismissal and the focus on the page. The check that no
  `Notifications` region shows is dropped with the rows: the editor has no toast, so it
  cannot fail.
- `reconnect.spec.ts:59` stays, with two additions that hold what a cut test did in a
  browser at no extra run: Cancel is pressed first and focus is back on Publish (the one
  Base UI timing of `:94`, which Vitest sees without the closing animation), and the
  requests that follow, the write among them, all carry the new session's token
  (`sheets.tokens` since the Reconnect click is `e2e-token-2` alone; the fake still
  accepts the old token, so only this shows it), which S1 names.
- `session-warning.spec.ts:53` stays, and gains the focus on Stay connected as the
  warning opens (from `:38`), which jsdom reaches without a real frame.
- `publishing-roadmap.spec.ts:53` stays and now reloads before it reads the result: a
  fresh session reads the published roadmap and the list from the fake, as S1 says
  ("shown after a reload"), over the roadmap and list the same page already held.
- Not settled, answered: `auth.spec.ts:177` stays. Google's script failing to load is
  the one place a real script element's `error` event meets the built bundle, and
  `google-auth-client.test.ts` only fakes the loader; it costs about 0.5 s. The Sheets
  parser tests hold a tab with only its header (`roadmap-tab-parser.test.ts` "gives no
  items and no failure for a header alone") and a `Soon` horizon ("keeps an item with a
  blank or unknown horizon, unplaced"), so `publishing-roadmap.spec.ts:153` and `:186`
  go. The Welsh title of the publish confirmation was asserted only in
  `reconnect.spec.ts:174`: `roadmap-detail-page-editing.test.tsx` "asks in Welsh,
  naming the dialog and what it does, and Cancel writes nothing" now holds it (shown
  red by dropping "hyn" from `cy.ts`), before the E2E test went (CHO-014 S7).
- `sheets-writes.spec.ts` is untouched: its two tests are not merged, since the saving
  would be one connect (about 0.5 s) and the second reads the violations of its own
  clean spreadsheet. The `chooseFromMore` helper stays (the guide names
  it, and `refreshRoadmap` uses it). The fake GIS's `popup-closed` outcome and `scope`
  option are left as the fake's model of Google, with no spec using them now, for the
  switch to retire. The reconnect helpers lose their Welsh variant
  with the one test that used it.
- No axe scan is in these specs, so none is dropped (the owner's rule of 2026-11-23).
- Archived records that cite a cut test stay as they were.

### Cuts and the test that holds each (S2; CHO-014 S5, S9)

| Cut                                                                                                                                                                                                                                                                   | Held by                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts:71`, eight of ten runs: access denied, the Sheets scope not granted, a short-lived token and a closed popup from either place, the scope and the short token each from both, the blocked popup from the menu (the closed popup is a note, not an alert) | `auth-notice.test.tsx` (every failure's notice above the heading, a closed popup as a note, stays until dismissed then focus on the page, a failure from the header); `connection-status.test.tsx` and `app.test.tsx` "header" (each state's status and menu action); the mapping of each Google outcome by `google-auth-client.test.ts` (Google sign-in alone) |
| `auth.spec.ts:102` a failed reconnect from the account menu                                                                                                                                                                                                           | `auth-notice.test.tsx` "shows a failure from the header on the page in view, over the roadmaps"; `app.test.tsx` "header" (Reconnect in the menu)                                                                                                                                                                                                                |
| `auth.spec.ts:128` a confirmation clears itself, a failure stays                                                                                                                                                                                                      | `auth-notice.test.tsx` "confirms disconnecting where the user is looking, but not connecting", "clears a confirmation after its dwell", "never clears a failure"; `connection-status.test.tsx`                                                                                                                                                                  |
| `auth.spec.ts:159` consent asked after a partial grant                                                                                                                                                                                                                | `google-auth-client.test.ts` "fails with scope-not-granted, then asks for consent on the next attempt" (Google sign-in alone, which goes with the switch)                                                                                                                                                                                                       |
| `reconnect.spec.ts:94` a refusal or a closed window, Cancel                                                                                                                                                                                                           | `reconnect-dialog.test.tsx` "says why when Google's access is %s", "Cancel closes it…"; `roadmap-detail-page-editing.test.tsx` "keeps them when reconnecting is cancelled, focus back on Publish"; Cancel's focus also by the test left                                                                                                                         |
| `reconnect.spec.ts:131` Refresh asks to reconnect, then reads once                                                                                                                                                                                                    | `roadmap-detail-page-items.test.tsx` (Refresh reads the page once after reconnecting, focus back on More); `roadmap-detail-page-header.test.tsx` "asks to reconnect for Refresh"                                                                                                                                                                                |
| `reconnect.spec.ts:154` More's Edit product details never asks to reconnect                                                                                                                                                                                           | `roadmap-detail-page-header.test.tsx` "opens it without asking to reconnect once the session has expired"; `roadmap-detail-page-editing.test.tsx` "keeps the dialog and what was typed when the session expires, and Done still keeps the edits"                                                                                                                |
| `reconnect.spec.ts:174` the dialog in Welsh, by keyboard                                                                                                                                                                                                              | `reconnect-dialog.test.tsx` "is in Welsh, keeps focus inside and returns it by keyboard"; the Welsh title of the confirmation by the new test in `roadmap-detail-page-editing.test.tsx`                                                                                                                                                                         |
| `session-warning.spec.ts:38` the countdown                                                                                                                                                                                                                            | `session-warning.test.tsx` "opens two minutes before the session ends…", "counts down in minutes and seconds"; the focus on Stay connected by the test left                                                                                                                                                                                                     |
| `session-warning.spec.ts:84` a blocked renewal                                                                                                                                                                                                                        | `session-warning.test.tsx` "closes the warning and shows why at the top of the page"; `auth-notice.test.tsx` "says the session continues and when to reconnect, until it expires"; `google-auth-client.test.ts` "still expires on time after a failed renewal"                                                                                                  |
| `session-warning.spec.ts:115` dismissing leaves the session to run out                                                                                                                                                                                                | `session-warning.test.tsx` "leaves the session to run out after %s" (Escape and Close); `google-auth-client.test.ts` "expires when the token's lifetime…"                                                                                                                                                                                                       |
| `publishing-roadmap.spec.ts:86` a colour the public site rejects                                                                                                                                                                                                      | `roadmap-detail-page-publishing-roadmap.test.tsx` "refuses to publish a roadmap the public site's update would fail on" (and in Welsh); the repository contract's sync faults; the Sheets adapter's reading of the colour by its parser and repository tests                                                                                                    |
| `publishing-roadmap.spec.ts:110` Save and publish                                                                                                                                                                                                                     | `roadmap-detail-page-publishing-roadmap.test.tsx` "offers Save and publish for a roadmap with unsaved edits, writing both"                                                                                                                                                                                                                                      |
| `publishing-roadmap.spec.ts:136` unpublish after asking                                                                                                                                                                                                               | `roadmap-detail-page-publishing-roadmap.test.tsx` "unpublishes the only published roadmap after asking" and the Cancel test above it                                                                                                                                                                                                                            |
| `publishing-roadmap.spec.ts:153`, `:186` the note for a roadmap with no items, or no recognised horizon, and a pending move that gives one                                                                                                                            | `roadmap-detail-page-publishing-roadmap.test.tsx` "publishing a roadmap the public would see with no items" (each case, Welsh included); the header-only tab and the unrecognised `Soon` by `roadmap-tab-parser.test.ts` (the adapter's own, which goes with it)                                                                                                |

Each holder runs against the in-memory repository or the fake auth client, so it
outlives the switch from Google Sheets; only what a Google outcome or a Sheets cell
becomes (the mapping of a refusal, the consent prompt, a tab read as no items) rests on
the GIS and Sheets adapters' tests, which go with it.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | the five specs pass, 9 runs (7.8 s locally): the popup opened inside a real click (`auth.spec.ts` both rows, `reconnect.spec.ts:59`, `session-warning.spec.ts:53`), the reconnected and the renewed token on the next request (`reconnect.spec.ts`, `session-warning.spec.ts`), a token kept out of storage (the fixture's teardown guard on every run), and one publish through the fakes shown after a reload (`publishing-roadmap.spec.ts:53`) |
| S2       | the PR lists each cut and its holder; the one moved assertion, the Welsh publish confirmation's title, shown red                                                                                                                                                                                                                                                                                                                                  |
