# A roadmap page's shell: five mock-ups over two journeys

- **Date**: 2026-11-17
- **Question**: as a Product Lead works far down a roadmap's page, what keeps its title,
  its actions and its pending changes with Publish in view, and how do they reach any
  placement directly, with "About this roadmap" folded?
- **Scope**: a roadmap's page, for
  [STY-052](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-052-keep-a-roadmaps-controls-in-view.md)
  and
  [STY-053](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-053-jump-between-a-roadmaps-placements.md)
  of [EPC-012](../backlog/EPC-012-app-shell-and-navigation/README.md), after two rounds
  of grilling (STY-052 D1–D9, STY-053 D1–D4). Base `242f683`. Only documents and one
  prototype page were added; no application code. (Since then, four rounds and a
  review settled both stories, and a second page draws the chosen design: see
  _Outcome_.) The skill's stylesheet is not
  corrected: the page's own shared styles draw the desktop frame at 1280px, the width
  the scenarios name, and today's pending inset without the outer border `mock.css`
  gives it, as the app's captures show.
- **Prototypes**:
  [`roadmap-page-shell-ux-analysis/roadmap-page-shell-ux-prototypes.html`](roadmap-page-shell-ux-analysis/roadmap-page-shell-ux-prototypes.html),
  one self-contained page of **frames**: static mock-ups, each a desktop (1280px) and a
  phone (375px) frame per moment, labelled with where keyboard focus is. Open it in a
  browser. After the owner chose, a second page,
  [`roadmap-page-shell-ux-chosen.html`](roadmap-page-shell-ux-analysis/roadmap-page-shell-ux-chosen.html),
  draws the chosen design alone, through the same moments (see _Outcome_).
- **Sample world**: invented. On Tuesday 17 November 2026 Sam Evans opens the published
  Community Nursing roadmap: 24 items (1 unplaced, Recently delivered 2, Now 7, Next 5,
  Later 6, Delivered this year 3, Not doing 0), with 2 unpublished changes (a Now item's
  description, the roadmap's vision). At 09:35, scrolled to Later, she moves "Wound
  photos shared with GPs" to Next: 3 changes, Next 6, Later 5. From there she publishes
  (09:36). In one branch Rhian Morgan, her co-lead, has changed the same description at
  09:40, so the publish at 09:41 is refused. In another the session has expired by
  09:50.

## Readers and where they are

A Product Lead with about 30 minutes a week for roadmaps (persona A1), mostly at a desk
on a 1280×800 screen, with a phone for small jobs (A2). A roadmap's page runs to about
six desktop screens and eleven phone screens (EPC-012 _Findings_). The job here is
editing far from the top: moving a card in Later, then publishing, which the persona
calls the moment that matters (A9, A10). A co-lead may have changed the same roadmap
(A12). The interface is in English and Welsh (ADR-008), and the Welsh labels are the
longer.

## Journeys covered

| Group                                            | Journeys                                                                                                                                                                                                         | Stories                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1. Keep the controls and pending changes in view | see the roadmap's title and actions while scrolled; see the count and publish from anywhere; a change far down counts at once; a publish's outcome where it was published; focus clear of a bar; expired session | STY-052 S1–S8; Q1 (A, B, C), Q5 (phones) |
| 2. Reach a placement directly, with About folded | jump to any placement; counts and pending marks; the current placement; unplaced and empty placements; About on one line; phone and Welsh                                                                        | STY-053 S1–S7; Q2 (D, E)                 |

Each journey relies on A1, A2, A9 and A10; the refused branch relies on A12.

Excluded: moving between roadmaps and the dashboard shell (STY-054), which also holds
the side rail of placements left out here (STY-053 D4, STY-054 D1); unpublished changes
across roadmaps (STY-055); a quieter header (STY-056); a compact item card and a board
(EPC-012 _Out of scope_); the roadmap list and families pages.

## What every design shares

The owner's answers bind every design:

- **The title row sticks** (STY-052 D5): the page's own title row pins and slims as the
  page scrolls, one set of controls, never a copy. Refresh and Unpublish roadmap (or
  Publish roadmap) live in its "More" menu, at the top and while stuck (D6).
- **On a phone, pending changes pin at the foot** (D2) in every design, under a slim top
  strip: the title, cut with an ellipsis where it overflows, an "Add an item" icon
  button and "More".
- **The outcome shows where Publish was pressed** (D3, D9): under a top bar, or in a foot
  bar's place, with focus on it. A refusal offers "Review the changes", which takes the
  Product Lead to the conflict review, under the title as today.
- **Publish stays available while the session has expired** (D4, D8): pressing it opens
  a reconnect dialog ("Your session has expired"; Reconnect, Cancel). Reconnect calls
  `connect()` in its own click (ADR-003); once connected, the publish dialog opens.
  Cancel keeps everything and returns focus to Publish. The bar adds no line meanwhile.
- **Jump links, never tabs** (STY-053 D1): the whole roadmap stays on one page. The links
  list the unplaced items first (as the page does), then all six placements, an empty
  one with 0 (D3). Each has its count and a mark when it holds a pending change (an
  item's, or its order's). The current placement is marked to sight and by
  `aria-current`.
- **About folds to one line** (D2): status, product lead and last updated, its Changed
  tag, Show more and Edit.
- **Rules no record settled** when the five were drawn, which _Decisions needed_ asks
  about (since decided: STY-052 D18, STY-053 D8):
  - pinning stops below a viewport height of 500px;
  - `scroll-padding` at the pinned heights keeps a focused control or a jumped-to heading
    clear of every bar;
  - jump links move focus and scroll without changing the address, as the skip link does,
    since hash routing owns the fragment (ADR-004).
- The app's look: its header band, phase banner, item cards, buttons, notices and focus
  fill, drawn from the app's tokens.

## 1. Keep the controls and pending changes in view

At 09:30 Sam opens the roadmap with 2 unpublished changes. She scrolls to Later and, at
09:35, moves "Wound photos shared with GPs" to Next. Focus follows the card to the foot
of Next, as it does today. She publishes from there. Each design has these moments:
before, just moved, just published, refused, and expired with Publish pressed. A also
shows More open, the review after "Review the changes", the publish dialog after
reconnecting, and STY-052 Q5's two phone bars in Cymraeg.

| Design                                          | Idea                                                                                                                                                                                                                                       | Strengths                                                                                                                                                                                                                                                                            | Risks                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. One top bar (STY-052 Q1 a)                   | At the top, the title row and today's pending row are one block; stuck, they slim into one 60px row: the title, "3 unpublished changes" with Publish changes and Discard all, then "Add an item" and More. The outcome pins just under it. | One place to look on a desktop: the roadmap's name, what is pending and Publish sit together, as today, only pinned. The least pinned height (about 60px of 800), and the most room left for a row of jump links (journey 2). The outcome appears where the Product Lead is looking. | The stuck row is full at 1280px: the title has about 390px, and "Jump to" (E) cuts it to "Community Nursin…". Publish is at the top on a desktop and at the foot on a phone (D2), so the two devices differ. A long roadmap title is always cut when stuck.                                         |
| B. Title row on top, pending at the foot (Q1 b) | The title row sticks with "Add an item" and More; while anything is pending, a foot bar holds the count, Publish changes and Discard all, from the page's top. The outcome takes the foot bar's place.                                     | Publish is in the same place on every device, at the foot. The top row has room to spare. Pending changes are seen from the first screen, at the foot, even before scrolling.                                                                                                        | Two pinned bars on a desktop: about 60px and 70px, so 130px, a sixth of an 800px screen, and about 165px with jump links. A refusal or a failure at the foot hides the count and Publish until dismissed (_Decisions needed_). At the page's top the pending changes are no longer under the title. |
| C. Pending at the foot only (Q1 c)              | Nothing pins at the top on a desktop: today's title row scrolls away with Unpublish roadmap, Refresh and "Add an item". A foot bar holds the pending changes and then the outcome. The phone is B's (D2).                                  | The least chrome on a desktop, and the smallest build: one foot bar. Answers F1, the sharpest finding.                                                                                                                                                                               | Fails S1 on a desktop: halfway down, nothing names the roadmap, and "Add an item" is a trip to the top (F2 unanswered). Jump links pinned on a desktop would need a top row, which makes C into B. Desktop and phone differ at the top.                                                             |

**Recommendation**: **A, one top bar**. It keeps the roadmap, its pending changes and
Publish in one place, as the page has them today, at the least height. That leaves room
for journey 2's links without cutting the title. A phone pins Publish at the foot anyway
(D2), where a thumb reaches it, so the devices differing is the owner's own split. On
the phone, recommend **Q5 (b), Discard all in More**: in Welsh, (a)'s two buttons do not
fit side by side at 375px, so its bar runs to three rows, about 150px, a fifth of the
screen (A9). Discard all is rare and asks first. Choosing (b) departs from S2's "Discard
all … in view" on a phone, which _Decisions needed_ records. No add-on.

## 2. Reach a placement directly, with About folded

The same morning, drawn on A's sticky row, which B's top row shares. The page opens with
About on one line and the unplaced item first. At 09:35, just after the move, the page
is in Next; at 09:37 Sam chooses Later. D also shows About opened in place; E shows its
menu open.

| Design                                       | Idea                                                                                                                                                                                                                                                                                                                          | Strengths                                                                                                                                                                                                                                                                         | Risks                                                                                                                                                                                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D. A row of links in the sticky row (Q2 a)   | Under the title row, a navigation named "Horizons and sections": "Not on the public roadmap 1", then each placement and its count, with a dot where a change is pending. The current one is bold and underlined. On a phone the row scrolls inside itself, keeping the current link in view; the page never scrolls sideways. | Every placement, its count and its pending mark are in sight all the time: "Now, Next and Later at a glance", the persona's first need, with no press. The current placement shows as the page scrolls (S3). Native links, so the keyboard and a screen reader meet a plain list. | One more pinned row, about 35px, on a desktop and a phone. On a phone, three of the seven links are out of sight at any time, and in Welsh ("Wedi'u cyflawni'n ddiweddar", "Ddim yn bwrw ymlaen") four: reachable by scrolling the row, but unseen.     |
| E. A "Jump to" menu in the sticky row (Q2 b) | A button in the title row names the current placement ("Jump to: Next"). It opens a menu of the unplaced items and the six placements, each with its count and pending mark, the current one ticked. On a phone the button runs across the page under the strip.                                                              | One button wide: no extra row on a desktop and one short row on a phone, and it fits in Welsh ("Neidio i: Nesaf"). Every count and mark fits in the menu, whatever the language.                                                                                                  | The counts and marks are a press away, so "at a glance" needs a press. On a desktop the stuck row is full: the title is cut at 1280px. A menu that navigates is a less familiar pattern than links, and its items must still move focus to the heading. |

**Recommendation**: **D, a row of links**, on a desktop: it puts the whole roadmap's
shape in sight at no press, at the cost of one 35px row. Add-on: on a phone, **E's
"Jump to" button** in place of D's scrolling row. There, D shows only part of the row,
and E fits in Welsh in one short row. Both are the same navigation in two forms, as the
record's former "side rail on a desktop, a strip on a phone" was.

## Decisions needed

| Decision                                                     | Options                                                                                                                                                                                                                                                                                                 | Where it is asked                                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where the controls pin on a desktop                          | A, one top bar (recommended); B, title row on top and pending at the foot; C, pending at the foot only (departs from S1)                                                                                                                                                                                | STY-052 Q1; **Decided**: B (STY-052 D10)                                                                                                                |
| Discard all on a phone                                       | (b) in More, Publish alone in the bar (recommended; departs from S2's "Discard all … in view" on a phone); (a) in the bar, three rows in Welsh                                                                                                                                                          | STY-052 Q5; **Decided**: short labels side by side (STY-052 D11)                                                                                        |
| How the jump links are shown                                 | D, a row of links, with E's menu on a phone (recommended); D everywhere; E everywhere                                                                                                                                                                                                                   | STY-053 Q2; **Decided**: E on both, D's links in the page (STY-053 D5)                                                                                  |
| A refusal or failure at the foot hides the count and Publish | the outcome stacks above the foot bar while changes are still pending, replacing it only once published (recommended); it replaces the bar, as D9 says (departs from S2 while shown)                                                                                                                    | STY-052 Q8; **Decided**: stacks (STY-052 D14)                                                                                                           |
| How long "Changes published" stays                           | today's 8-second dwell, paused while hovered or focused (recommended); until dismissed or the next change, as D9 reads                                                                                                                                                                                  | STY-052 Q9; **Decided**: the 8-second dwell (STY-052 D13)                                                                                               |
| The first placement on the first screen, with unplaced items | accept that the unplaced group, first as today, pushes Recently delivered below the first screen (recommended; it is what needs action); fold the unplaced group to one line too                                                                                                                        | STY-053 Q3; **Decided**: accept (STY-053 D7)                                                                                                            |
| When pinning stops                                           | below a viewport height of 500px (recommended: 400% zoom at 1280×800, and a phone held sideways); another height                                                                                                                                                                                        | STY-052 S6 (a rule the sheet chose); **Decided**: 500px (STY-052 D18)                                                                                   |
| Focus clear of the bars                                      | `scroll-padding` at each pinned height, top and foot (recommended); scroll focused controls into view by script                                                                                                                                                                                         | STY-052 S5, STY-053 S1 (a rule the sheet chose); **Decided**: `scroll-padding` (STY-052 D18)                                                            |
| A stuck title too long for its row                           | cut with an ellipsis, the heading's full text kept as its name (recommended); wrap to two lines                                                                                                                                                                                                         | STY-052 S7 (a rule the sheet chose); **Decided**: ellipsis (STY-052 D18)                                                                                |
| "Add an item" in the phone's strip                           | an icon button named "Add an item" (recommended); in More                                                                                                                                                                                                                                               | STY-052 D2 (a rule the sheet chose); **Decided**: + icon button (STY-052 D18)                                                                           |
| C's desktop title row                                        | today's buttons, since it never sticks and D6 binds the sticky row (as drawn); More, as on A and B                                                                                                                                                                                                      | STY-052 D6 (a rule the sheet chose); **Moot**: C not chosen (STY-052 D10)                                                                               |
| Jump links in C                                              | pinning them adds a top row, so C becomes B (as drawn: journey 2 sits on A's row, which B's shares)                                                                                                                                                                                                     | STY-053 Q2 with STY-052 Q1; **Moot**: C not chosen (STY-052 D10)                                                                                        |
| Jump links and the address                                   | move focus and scroll without changing the address, as the skip link does (recommended; ADR-004's hash history owns the fragment); a search parameter per placement, which changes the routes the epic keeps                                                                                            | ADR-004; **Decided**: no address change (STY-053 D8)                                                                                                    |
| The reconnect dialog beyond Publish                          | which actions adopt the reconnect interstitial (Add an item, Add a roadmap, Edit, Refresh, family writes…), and whether each carries on by itself: a cross-cutting story, recorded as STY-057                                                                                                           | STY-052 D4; [STY-057](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-057-reconnect-from-the-action-that-needs-it.md); **Recorded** as STY-057 |
| Scenarios the reconnect dialog would change                  | each stays as written until that story adopts its action: STY-021 S14 (Refresh), STY-025 S12 (publishing waits for Reconnect), STY-035 S1 (Publish or Unpublish roadmap), STY-041 S1 (Add a roadmap), STY-046 S1 (Add an item); STY-052 S8 is changed by D4                                             | STY-057; **Recorded** in STY-057                                                                                                                        |
| The desktop foot bar's labels (chosen page)                  | one component with one set of labels, "Publish" and "Discard", on a desktop as on a phone (as drawn); the longer "Publish changes" and "Discard all" on a desktop                                                                                                                                       | STY-052 D11 (a rule this review chose); **Decided**: short labels (STY-052 D18)                                                                         |
| The short labels' names for assistive technology             | "Publish changes" and "Discard all changes", the visible word first, so WCAG 2.5.3 holds and a screen reader hears the object (as drawn); the visible word alone                                                                                                                                        | STY-052 D11 (a rule this review chose); **Decided** (STY-052 D18)                                                                                       |
| Family and Category in the one-line About                    | inside the expanded part, as fields (as drawn): measured at 1280px, the line with them wraps to two (58px to 92px); on the line, accepting two lines                                                                                                                                                    | STY-053 D6 (a rule this review chose); **Decided** (STY-053 D8)                                                                                         |
| "Jump to" before any placement is in view                    | reads "Jump to" alone at the page's top, gaining the placement once one is in view (as drawn); names the first placement from the start                                                                                                                                                                 | STY-053 D5 (a rule this review chose); **Decided** (STY-053 D8)                                                                                         |
| The review dialog's first focus (chosen page)                | the first field's Keep mine, the dialog named by its title and described by its first lines (as drawn); the dialog's title                                                                                                                                                                              | STY-052 D12 (a rule this review chose); **Decided** (STY-052 D18)                                                                                       |
| Focus after each decision in the dialog                      | the next undecided field's Keep mine, in the decided one's place, as `use-decision-focus.ts` moves it today (as drawn)                                                                                                                                                                                  | STY-052 D12 (a rule this review chose); **Decided** (STY-052 D18)                                                                                       |
| Once every field in the dialog is decided                    | the dialog says so; its footer offers Publish changes, focused, which goes straight to the publish confirmation, and Close, which returns focus to the foot bar's Publish, now available, the refusal notice gone (recommended, as drawn); the dialog closes by itself and focus goes to Publish        | STY-052 D12 (a rule this review chose); **Decided** (STY-052 D16)                                                                                       |
| Removed items the review names                               | listed in the dialog once every field is decided, under "Some changes couldn't be kept", with "Your other changes are kept in this tab"; after Close, the notice above the bar keeps them until dismissed, Publish available (recommended; not drawn); dropped with the dialog                          | STY-052 D12 (a rule this review chose); **Decided** (STY-052 D17)                                                                                       |
| Closing the dialog with a field undecided                    | Close or Escape keeps the refusal notice above the bar and Publish unavailable but focusable, as today, and returns focus to Review the changes (as drawn)                                                                                                                                              | STY-052 D12 (as the owner's change asks); **Decided** (STY-052 D18)                                                                                     |
| Publish roadmap on a phone while not published               | as D15 reads, beside Jump to in the strip's second row, which wraps, so three rows pin at the top (as drawn: 371px of 343 in English, 450px in Welsh); at the page's top, then in More once the strip is stuck (recommended); an icon button in the strip's first row, cutting the title to about 100px | STY-052 D15; **Decided**: at the page's top, then in More (STY-052 D19)                                                                                 |
| The removed list once nothing is left (chosen page)          | at the foot, in the bar's place, until dismissed (decided, as drawn); dropped with the dialog                                                                                                                                                                                                           | STY-052 D23                                                                                                                                             |

Reads and writes: no design reads or writes anything the page does not today.
Publishing, Discard all, Refresh and Unpublish roadmap are today's calls (ADR-012,
STY-035). The counts and pending marks come from the page's items with their pending
edits applied. The reconnect dialog uses the auth client's `connect()` (ADR-003). No
design reopens an ADR decision: ADR-012 does not tie Publish to being connected; the
stories do.

## Not yet drawn

On the five-design page. The chosen page since draws a failed publish, and the
not-published state as STY-052 D15 and D19 set it ("Save" at the foot, "Publish
roadmap" in the title row), not as the last line below has it.

- A failed publish's outcome, in every design.
- Short viewports and 400% zoom, where nothing pins (STY-052 S6).
- Tabbing backwards under A's top bar or B's top row (STY-052 S5), given as the
  `scroll-padding` rule only.
- Choosing an empty placement, which shows "No items" as today (STY-053 S5).
- The page while publishing, with Publish busy; nothing pending at all, where A's row
  holds only the title, "Add an item" and More.
- Google disconnected by choice rather than expired: the same dialog, worded "Connect".
- Reconnect refused or closed in the dialog; the Welsh of every new string; dark mode.
- A roadmap that is not published, whose bar says "Save changes" and More holds
  "Publish roadmap".

## What does not change

- Publishing, its dialog with "What changes" and "Mark as updated today", conflict
  review and its decisions, Discard all and its dialog (ADR-012).
- Pending changes are kept in this tab, through an expired session and Reconnect.
- The item card, its Move and Edit, and focus following a moved card.
- The header and phase banner, which still scroll away; the routes and their addresses
  (ADR-004); DHCW's tokens, type and focus styles (ADR-010).

## Related

- [EPC-012](../backlog/EPC-012-app-shell-and-navigation/README.md),
  [STY-052](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-052-keep-a-roadmaps-controls-in-view.md),
  [STY-053](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-053-jump-between-a-roadmaps-placements.md)
  and [STY-054](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-054-move-between-roadmaps-from-the-shell.md)
  (the side rail, D1), and
  [STY-057](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-057-reconnect-from-the-action-that-needs-it.md)
  (the reconnect dialog, for every action that needs a session).
- [ADR-012](../adr/ADR-012-publishing-a-roadmaps-changes.md),
  [ADR-010](../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md),
  [ADR-003](../adr/ADR-003-browser-oauth-with-google-identity-services.md),
  [ADR-004](../adr/ADR-004-tanstack-router-hash-history.md) and
  [ADR-008](../adr/ADR-008-internationalisation-english-and-welsh.md).
- [`reorder-items-ux-analysis.md`](reorder-items-ux-analysis.md): a placement's "Order
  changed", which the jump links mark as a pending change.
- Persona: [`product-lead.md`](../backlog/personas/product-lead.md).

## Outcome

The owner chose on 2026-11-17, after reviewing the five mock-ups. The chosen design is
drawn alone, in the same world and styles, on
[`roadmap-page-shell-ux-chosen.html`](roadmap-page-shell-ux-analysis/roadmap-page-shell-ux-chosen.html).
It shows every moment of the five, plus scrolled into Later before the move and a
failed publish.

- **Where the controls pin**: **B**, not the recommended A. The title row sticks at the
  top, and pending changes pin in a bar at the foot, on a desktop and a phone:
  [STY-052](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-052-keep-a-roadmaps-controls-in-view.md)
  D10.
- **Discard on a phone**: neither (a) nor (b). The foot bar's buttons are shortened to
  "Publish", with its icon, and "Discard" (STY-052 D11). Measured at 375px in Cymraeg,
  "Cyhoeddi" (131px) and "Gwaredu" (102px) fit side by side, 245px of the 343px between
  the margins, so they are drawn that way and no "More actions" button is needed. The
  count fits beside them in neither language, so it keeps its own row: two rows, about
  100px. The desktop's bar is the same component with the same labels, a rule in
  _Decisions needed_. The publish dialog's buttons are unchanged.
- **How the jump links are shown**: **E** on a desktop and a phone: a "Jump to" menu in
  the sticky title row, naming the current placement. **D**'s row of links stays as
  well, in the page below "About this roadmap", not sticky, so it scrolls away. Both
  show counts and pending marks:
  [STY-053](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-053-jump-between-a-roadmaps-placements.md)
  D5.
- **About and the family line**: About stays one line, and the Family and Category line
  moves into it, out from under the title (STY-053 D6, changing S6). On the line they
  would wrap it at 1280px, so they sit among the fields shown by "Show more". The
  roadmap dialog already edits family and category (STY-043), so About's Edit covers
  them.
- **Settled in the third of four rounds** (UX prototypes grilling round 3), each as recommended:
  a refusal or failure stacks above the foot bar (STY-052 D14); "Changes published"
  clears itself after 8 seconds (D13); the unplaced group stays first, even when it
  pushes the first placement below the first screen (STY-053 D7). The owner accepted
  every rule this review chose (STY-052 D18, STY-053 D8).
- **The conflict review in a dialog**: after seeing the chosen page, the owner moved the
  review out of the page, since "Review the changes" in the foot made the page jump
  (STY-052 D12, changing S4). The chosen page now draws, in place of the review under
  the title: the review open over Later with two fields, one decided, all decided, and
  the publish confirmation it leads to, plus Close with a field undecided and the
  review in Cymraeg. To show focus moving between fields, Rhian also changes the vision
  at 09:40 on that page; the five-design page drew her change to the description alone.
  The rules for its focus and its end are in _Decisions needed_.
- **The review dialog's end** (STY-052 D16, D17): as drawn. Once every field is
  decided it says so, "Publish changes" goes to the publish confirmation, and Close
  returns focus to the foot bar's Publish. Removed items are listed there, then kept in
  the notice above the bar until dismissed. The chosen page draws both.
- **A roadmap not yet published** (STY-052 D15): the foot bar reads "Save", and
  "Publish roadmap" is a visible button in the sticky title row; More then holds only
  Refresh. On a phone, "Publish roadmap" and "Jump to" do not fit side by side, even in
  English (371px of 343). In a fourth round the owner took the recommendation: on a
  phone it is a visible button at the page's top and moves into More once the strip
  sticks, so the strip stays two rows (STY-052 D19).
- **The shell around it** follows STY-054 and STY-056, as recorded there: the header and
  phase banner scroll away; the header keeps the language button and an account menu
  (theme, Disconnect), without "Google connected" or "Connected to Google"; and a phone's
  sticky strip starts with the navigation's menu button, which at the page's top sits at
  the left of the navy top bar (STY-054 D9, round 4). The chosen page draws these.
  STY-054's dashboard shell adds the left-hand navigation: the five-design page does not
  draw it, and the chosen page draws it only as context frames (below).
- **After review round 1** (EPC-012 review round 1), the owner settled three more:
  STY-057 is built first, and STY-052 depends on it, hard (D20); "Publish roadmap" and
  "Unpublish roadmap" show their outcome at the foot like a publish's, in the bar's
  place or stacked above it (D21); and a review that leaves nothing pending says
  "Every change is decided. Nothing is left to publish.", with Close only, which
  returns focus to the roadmap's title (D22). The chosen page draws D21 and D22. Once
  nothing is left, the removed list sits at the foot in the bar's place until
  dismissed (D23, the owner's answer to the one row this round left open).
- **The navigation around the page** (STY-054, STY-055), drawn as context on the chosen
  page: a desktop with the left-hand navigation open, its roadmaps by family with their
  colour, a dot on each with changes and "2 roadmaps have unpublished changes" at its
  top (the cards drop to two columns at 1280px); the same folded to its rail, dots and
  total kept, three columns; and a phone's drawer. A phone's menu button, in the top
  bar and the sticky strip, carries a dot while any roadmap has unpublished changes,
  its name saying how many (STY-055 D4). To give it a second roadmap, Theatre
  Scheduling has one change pending from earlier in the session.
- **Times**: on the chosen page Sam opens "Jump to" at 09:36, chooses Later at 09:37 and
  publishes at 09:38; the five-design page keeps its own times (Later at 09:37,
  published at 09:36 in journey 1).
- **The reconnect dialog** beyond Publish is recorded as
  [STY-057](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-057-reconnect-from-the-action-that-needs-it.md).
