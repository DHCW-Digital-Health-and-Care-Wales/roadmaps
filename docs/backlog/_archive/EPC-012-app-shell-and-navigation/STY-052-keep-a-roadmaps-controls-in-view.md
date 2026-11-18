# STY-052: A Product Lead keeps a roadmap's controls and pending changes in view

- **Status**: Done — the title row sticks and pending changes pin at the foot, where a
  publish's outcome shows; the review opens in a dialog
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-012-app-shell-and-navigation](README.md)
- **Depends on**: STY-057 (hard: S8 as D4 changes it needs its reconnect dialog)
- **Binding ADRs**: ADR-012, ADR-010, ADR-008, ADR-005
- **Suggested model**: Opus — sticky layout against focus, zoom, dialogs and Welsh
  widths, and the publish flow's focus rules
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/138

## Summary

On a roadmap's page, the title, "Add an item" and the pending changes with Publish
scroll out of view within the first screen, though the page runs to six screens on a
desktop and eleven on a phone. A Product Lead editing in Later cannot see that anything
is pending, or publish, without scrolling back. This story keeps them in view: the
title row sticks at the top and pending changes pin at the foot, on a desktop and a
phone (D10). A publish's outcome shows at the foot, where it was published from, and
the conflict review opens in a dialog, so the page never jumps (D12, D16–D17). It
does not change publishing or its dialog.

## Acceptance criteria

### S1: The roadmap's title and actions stay in view

**Given** a roadmap's page, connected, scrolled so its title is out of view
**When** the Product Lead looks at the screen
**Then** the roadmap's title and "Add an item" are in view
**And** Refresh and Unpublish roadmap (or Publish roadmap) can be reached from there

### S2: Pending changes and Publish stay in view

**Given** a roadmap with pending changes, its page scrolled to any placement
**When** the Product Lead looks at the screen
**Then** the count of unpublished changes, Publish changes and Discard all are in view
**And** with nothing pending, nothing about pending changes is shown

### S3: A change made far down the page shows at once

**Given** a roadmap with nothing pending, scrolled to Later
**When** the Product Lead moves an item from its Move menu
**Then** the pinned count reads "1 unpublished change" without scrolling

### S4: The outcome of a publish shows where it was published from

**Given** a roadmap with pending changes, scrolled to Later
**When** the Product Lead publishes from the pinned controls
**Then** what the publish came to (published, refused with a review, or failed) is
announced and shown in view, and focus goes to it as it does today

### S5: Nothing pinned hides what has focus

**Given** the pinned controls in view
**When** the Product Lead tabs through the items, forwards and backwards
**Then** every focused control is fully visible, not under the pinned controls

### S6: Short viewports and zoom

**Given** a viewport too short to spare the room, such as 1280×800 at 400% zoom
**When** the page scrolls
**Then** the controls stop pinning and stay in the page's flow, with no sideways scroll

### S7: On a phone, in Welsh

**Given** a 375px-wide phone, Cymraeg chosen, with pending changes
**When** the Product Lead scrolls the page
**Then** the pinned controls fit without truncating a label or scrolling sideways

### S8: Expired session

**Given** pending changes and a session that has expired
**When** the Product Lead looks at the pinned controls
**Then** Publish is unavailable but focusable, as today, and the pending count stays

## Decisions

- **D1** (owner, 2026-11-17, UX prototypes grilling round 1, Q1): explore all three of
  Q1's options as designs A (one top bar), B (top title row, bottom pending bar) and C
  (bottom pending bar only); Q1 is decided from the prototypes.
- **D2** (owner, 2026-11-17, UX prototypes grilling round 1, Q2; answers former Q2 with
  (a)): on a 375px phone the pending count and Publish pin at the foot of the screen,
  whatever the desktop design, and the title pins as a slim top strip.
- **D3** (owner, 2026-11-17, UX prototypes grilling round 1, Q3; answers former Q4 with
  (a)): a publish's outcome (published, failed) shows just under the pinned bar, in
  view, with focus on it; a refusal says so there with "Review the changes", which
  takes the Product Lead to the conflict review at the top of the page. No toast.
- **D4** (owner, 2026-11-17, UX prototypes grilling round 1, Q4): Publish stays
  available while the session has expired or Google is disconnected; pressing it
  opens a reusable reconnect dialog whose Reconnect calls `connect()` in its click
  handler (ADR-003), then carries on to the publish dialog; cancelled or refused,
  nothing is lost and focus returns to Publish. Changes: S8.
- **D5** (owner, 2026-11-17, UX prototypes grilling round 1, Q5): the page's own title
  row sticks and slims as the page scrolls, one set of controls; no second bar that
  copies them.
- **D6** (owner, 2026-11-17, UX prototypes grilling round 2, Q10; answers former Q3
  with (a)): Refresh and Unpublish roadmap (or Publish roadmap) live in a "More" menu
  in the sticky title row, at the top of the page and while stuck.
- **D7** (owner, 2026-11-17, UX prototypes grilling round 2, Q11): explore both of Q5's
  options on the phone frames: Discard all in the two-row bottom bar, and in the top
  strip's "More"; Q5 is decided from the prototypes.
- **D8** (owner, 2026-11-17, UX prototypes grilling round 2, Q12; answers former Q6
  with (a)): the pinned bar adds no line while the session has expired; the reconnect
  dialog (D4) explains, and the alert above the title still says so.
- **D9** (owner, 2026-11-17, UX prototypes grilling round 2, Q13; answers former Q7
  with (a)): where pending changes pin at the foot (every phone, designs B and C), a
  publish's outcome takes the bar's place there until dismissed or the next change; a
  refusal's "Review the changes" sits there too.
- **D10** (owner, 2026-11-17, UX prototypes review, owner's choice; answers former Q1
  with (b)): the title row sticks at the top (D5, D6); pending changes pin in a bar at
  the foot, on a desktop and a phone, from the page's top while anything is pending.
  Lost: one top bar (A), and the foot bar alone (C, which failed S1).
- **D11** (owner, 2026-11-17, UX prototypes review, owner's choice; answers former Q5):
  the foot bar's buttons read "Publish" (with its upload icon) and "Discard". Measured
  at 375px in Cymraeg, "Cyhoeddi" and "Gwaredu" fit side by side (245px of 343) under
  the count, which keeps its own row, so no "More actions" button. Changes: S2's labels
  ("Publish changes", "Discard all" on the bar); the publish dialog keeps its own.
- **D12** (owner, 2026-11-17, UX prototypes review, conflict review in a dialog):
  "Review the changes" opens the conflict review in a dialog, never in the page, so the
  page does not jump; the Product Lead stays where they were. Inside, the review is as
  today, focus moving as each field is decided; how it ends is in the analysis's
  _Decisions needed_. Changes: S4's "refused with a review" outcome, and D3's "takes
  the Product Lead to the conflict review at the top of the page".
- **D13** (owner, 2026-11-17, UX prototypes grilling round 3; answers former Q9 with
  (a)): "Changes published" clears itself after 8 seconds, as today, waiting while
  hovered or focused. Changes D9's "until dismissed" for a confirmation.
- **D14** (owner, 2026-11-17, UX prototypes grilling round 3; answers former Q8 with
  (a)): a refused or failed publish's notice stacks above the foot bar while changes are
  pending, so the count, Publish and Discard stay in view (S2); only "Changes
  published" takes the bar's place. Changes D9 for refusals and failures.
- **D15** (owner, 2026-11-17, UX prototypes grilling round 3): for a roadmap not yet
  published, the foot bar reads "Save" (STY-025 S11; its name "Save changes"), and
  "Publish roadmap" is a visible button in the sticky title row; once published,
  "Unpublish roadmap" lives in More. Changes D6 for the not-published state.
- **D16** (owner, 2026-11-17, UX prototypes grilling round 3): once every field in the
  review dialog (D12) is decided, it says so; its footer's "Publish changes", focused,
  goes to the publish confirmation, and Close returns focus to the foot bar's Publish.
- **D17** (owner, 2026-11-17, UX prototypes grilling round 3): removed items the review
  names are listed in the dialog once every field is decided, under "Some changes
  couldn't be kept", with "Your other changes are kept in this tab"; after Close, the
  notice above the foot bar keeps the list until dismissed, Publish available.
- **D18** (owner, 2026-11-17, UX prototypes grilling round 3; accepts the analysis's
  rules): the foot bar's short labels on a desktop too, named "Publish changes", "Save
  changes" and "Discard all changes"; the phone strip's "Add an item" is a + icon
  button; pinning stops below 500px of viewport height; a stuck title is cut with an
  ellipsis, its full text kept as its name; `scroll-padding` at each pinned height; and
  the review dialog's focus as drawn (first Keep mine, then the next, back to "Review
  the changes" on closing undecided).
- **D19** (owner, 2026-11-17, UX prototypes grilling round 4): on a phone, "Publish
  roadmap" is a visible button at the page's top and moves into More once the strip
  sticks, so the strip stays two rows; it did not fit beside "Jump to" at 375px (371px
  of 343 in English). Changes D15 on a phone.
- **D20** (owner, 2026-11-17, EPC-012 review round 1): STY-057 is delivered first; this
  story depends on it, hard, since S8 as D4 changes it needs its reconnect dialog.
- **D21** (owner, 2026-11-17, EPC-012 review round 1): the outcome of "Publish roadmap"
  or "Unpublish roadmap" (STY-035's notice) shows at the foot as a publish's does
  (D13, D14): in the foot bar's place when nothing is pending, stacked above it when
  changes are; the page does not jump. Changes: STY-035's notice under the title.
- **D22** (owner, 2026-11-17, EPC-012 review round 1; refines D16): once every field in
  the review dialog is decided and nothing is left pending (each "Use theirs"), it says
  "Every change is decided. Nothing is left to publish." with Close only, any removed
  items listed first; the foot bar has gone, so Close returns focus to the roadmap's
  title.
- **D23** (owner, 2026-11-17, EPC-012 review round 1): when D22's review lists removed
  items, after Close their notice ("Some changes couldn't be kept") sits at the foot in
  the bar's place until dismissed, as D21 places an outcome with nothing pending.
  Refines D17 for that case.
- **D24** (owner, 2026-11-18, page headers UX analysis decisions 6, 7 and 8; delivered
  by [STY-059](../EPC-013-tidy-page-tops/STY-059-a-roadmaps-page-opens-on-one-header-block.md) and
  [STY-060](../../EPC-013-tidy-page-tops/STY-060-one-row-of-controls-at-the-top-and-once-scrolled.md)): "Publish
  roadmap" moves beside the Not published tag, and into More once stuck at every width
  (changes D15 and D19); once stuck on a phone More is an icon too (extends D18); the
  phone's foot bar is one row.

## Out of scope

- Jumping between placements and folding "About this roadmap": STY-053.
- Unpublished changes on other roadmaps: STY-055.

## Delivery

### Departures

- **The title row sticks once it has scrolled wholly out of view** (agent): D5's row
  "sticks and slims as the page scrolls" is built as a row that scrolls with the page
  until it has gone, then reappears slim across the top. Its place keeps the height the
  row had as it stuck, so nothing below it moves as it sticks or lets go, which a row
  slimming while stuck would do, and could repeat on the scroll that the move itself
  causes. Should the row change while stuck ("Publish roadmap" leaving it once
  published), the page moves once, by that change, as the row lets go.
- **The stuck row drops the badges** (agent): stuck, the row holds the title and its
  buttons, as the prototypes draw it; Not published, the list-mismatch badges and
  Changed stay at the page's top.
- **On a phone, the stuck row keeps the desktop's order, More then "+"** (agent): the
  prototype draws "+" before More. Moving the button would remount it, losing focus on
  it as the row sticks, and would put the order seen out of step with the order tabbed.
- **The foot is first in the page's order after the title row** (agent): on a short
  screen (S6) it stays under the title, near where today's pending bar was, rather
  than after the last item; with a tall one it pins at the foot, as the prototypes
  draw it, and tabbing reaches it after the title row. Its notices keep the app's
  callout look inside the band, rather than the prototype's full-width bands. The band
  never covers more than half the screen: past that the notices scroll inside it, the
  pending bar always in view (D14).
- **More spins while a read is under way** (agent): Refresh lives in a menu (D6), so
  More is busy (`aria-busy`) and shows Refresh's spinning icon while the page reads,
  where today's Refresh button did; the menu's Refresh is unavailable meanwhile.
- **"Nothing was published." stays in the notice of removed items** (agent): the
  prototype's notice after Close (D17) leaves it out, but a refusal that only removed
  items shows that notice first, with no review, where it is the news.
- **Focus after "Publish roadmap" or "Unpublish roadmap" goes to its outcome**
  (agent, as the prototypes draw D21): STY-035 returned it to the button, which now
  moves between the row and More as the roadmap's state flips.

### Contract for dependents

The epic's `delivery-notes.md` carries the seams the next stories build on, as they
stand: the title row and `StickyHeader`, the pinned insets, More's deferred actions and
the test helpers. Besides those:

- **`PinnedFoot`** (`src/components/layout/pinned-foot.tsx`) takes `notices`, which
  scroll inside it, and a `bar` always in view. `RoadmapPublishing` renders it, with the
  page's published-state notice passed in as `pageNotices`.
- **Focus after a dialog's write**: `useFocusNoticeOnClose(notice)`
  (`editing/use-focus-notice-on-close.ts`) sends focus to the outcome once the dialog
  has closed; the publish dialog and `PublishedStateDialog` use it.
- **Replaced**: `PublishedStateAction` by `PublishRoadmapButton`, `PublishedStateDialog`
  and `publishedStateAction(state)`; `ConflictReview` by `RefusalNotice` and
  `ConflictReviewDialog`. `DismissibleNotice` takes an `action` beside its text.
- **Copy**: `roadmaps.more`, `roadmaps.publish.bar.{publish,save,discard}`,
  `roadmaps.publish.notice.refused.{review,decided.*,nothingLeft.*}`;
  `roadmaps.publish.discardAll` now reads "Discard all changes", the name of the bar's
  Discard. A catalogue test holds each short label as the start of its name.

### Scenario evidence

`e2e` is `tests/e2e/roadmap-controls.spec.ts`; `pages/` is
`src/features/roadmaps/pages/`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | e2e "keeps the title, Add an item, the pending count, Publish and Discard in view on a desktop" and "… on a phone" (More holds Refresh and Unpublish roadmap), "keeps Publish roadmap in a desktop's stuck row, and moves it into More on a phone's…" (D15, D18, D19); `pages/roadmap-detail-page-items.test.tsx` "Refresh (S14)"; `pages/roadmap-detail-page-publishing-roadmap.test.tsx` (Unpublish roadmap from More, focus back on More when cancelled); `structure` `detail`                                                                                                                                                                                                                                                                                                                          |
| S2       | the same two e2e tests (nothing pending shows nothing; the count, Publish and Discard in view, named "Publish changes" and "Discard all changes"), and "keeps the count, Publish and Discard in view under a notice too long for the room at the foot of a phone" (D14); `src/i18n/catalogue.test.ts` "starts each name with its label" (D11); `structure` `edit-publish-bar`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S3       | e2e "counts a change made far down the page at once, focus following the card clear of the bars"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S4       | e2e "shows a publish's outcome at the foot…" (focused, in view, the page unmoved) and "stacks a failed publish's notice above the bar…" (D14); the review in a dialog (D12, D16–D18, D22, D23): `pages/roadmap-detail-page-editing.test.tsx` "A co-lead's changes" (S1, S2: the notice, the dialog, focus through each decision, "Publish changes" then Close; "closed with a field undecided…"; "goes from the review's Publish changes…"; "lists the items a co-lead removed…"; "says nothing is left…"), `tests/e2e/editing.spec.ts` co-lead tests, `structure` `edit-conflict-notice`, `edit-conflict-review`, `edit-order-conflict-review`; D21: `pages/roadmap-detail-page-publishing-roadmap.test.tsx` S2, S3 (focus on the outcome) and S6 (on the refusal of the changes "Save and publish" sent) |
| S5       | e2e "scrolls a control reached by Shift+Tab out from behind the bar at the top" and "… by Tab … at the bottom", "keeps every control focused by Tab, forwards and backwards, clear of the bars"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| S6       | e2e "pins nothing on a screen too short to spare it, as at 400% zoom…" (320×200)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| S7       | e2e "fits the pinned controls in Cymraeg on a 375px phone, cutting no label" (and the stuck title's ellipsis)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S8       | e2e "keeps the count and Publish in view once the session has expired…"; `tests/e2e/reconnect.spec.ts` "Publish stays on offer…"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

The tests followed working code. Each that holds a new rule was shown red by
breaking the finished code: no focus on the published-state notice fails the
publishing-roadmap S2 and S3 tests (D21); Close sending focus nowhere when nothing is
left fails "says nothing is left…" and "shows their text after Use theirs…" (D22);
no publish dialog after the review's "Publish changes" fails "goes from the review's
Publish changes…" (D16); a notice without its removed items, or a review naming them
before every field is decided, fails "lists the items a co-lead removed…" (D17);
"Publish roadmap" focusing only its own notice fails the publishing-roadmap S6 test;
a Welsh short label that does not start its name fails the catalogue test (D11); and
a build without the `scroll-padding` fails both "scrolls a control … out from behind
the bar" tests. The Tab tour passed without it, since
Chrome centres a control it scrolls to, so the two behind-the-bar tests hold the rule.
