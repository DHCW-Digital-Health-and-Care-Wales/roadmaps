# Removing a published item — UX analysis

- **Date**: 2026-11-16
- **Question**: how should a Product Lead remove an item that the public site already
  shows, and what should they see when it is published? The designs give the owner
  something to look at before answering
  [STY-049](../backlog/_archive/EPC-011-adding-roadmaps-and-items/STY-049-remove-a-published-item.md#decisions)'s
  Q1–Q3.
- **Scope**: the roadmap's page in this editor: the item's card, what the card opens,
  the pending bar, the publish dialog and the conflict review. The public site is out
  of scope.
- **Base**: `5207d4b`.
- **Shape**: frames. Each design is a static desktop frame and phone frame for each
  moment, on [one page](remove-a-published-item-ux-analysis/remove-a-published-item-ux-prototypes.html). This
  change adds documents and that one prototype page, and nothing else.
- **Sample world**: Sam Evans removes "Fax referrals" from the published Electronic
  Referrals roadmap on 16 November 2026. One change is already pending ("Referral
  status for patients": Phase). Alex Jones, a co-lead, has changed the item's
  Description since Sam opened the roadmap. "Fax referrals" duplicates "Online
  referral form for GPs", which now covers the practices that still use fax. That is
  why removing it, rather than moving it to Not doing, is the right choice here.

## Readers and where they are

- **Product Lead (Sam)**, on a desktop for most visits and on a phone for small jobs
  (persona A2). Removing a stale or duplicate item is a small job, so the phone frames
  matter. The designs rely on these persona assumptions: short, purposeful visits
  (A1); one deliberate publish, so nothing becomes public by accident (A9, A10); and a
  co-lead who must be told about, not overwritten by, a change (A12).
- **Co-lead (Alex)** does not appear in any frame. Their change is what B1–B3 react to.
- **Public reader** is never in this editor. The question Q3 raises is what they lose:
  a removed item leaves without trace, while a Not doing item shows them that the work
  was dropped.

## Journeys covered

| Group                   | Journeys                                                                                                     | Story   | Open questions |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------- | -------------- |
| A. Removing an item     | choose to remove a published item; see the removal pending and undo it; the session expires part-way through | STY-049 | Q1, Q3         |
| B. Publishing a removal | the publish dialog lists the removal; a co-lead changed the item in the meantime                             | STY-049 | Q2 (with Q1)   |

Excluded:

- **Removing a new item**: STY-046 delivered it ("New" and Remove on the card).
- **Removing a roadmap**: STY-048.
- **Reordering items**: STY-050.
- **Connecting to Google**: not this journey. Only Reconnect appears, in A2.
- **What the public site shows**: a separate app.
- **Welsh copy**: added with the build (ADR-008).

## What every design shares

- The roadmap's page as the app draws it today (captured at `5207d4b`): the header,
  the title and its actions, the pending bar ("N unpublished changes", "Publish
  changes", "Discard all"), About, then the six horizons and sections with cards three
  across on a desktop and one across on a phone.
- The card's footer: a tag on the left ("Changed", "New"), then buttons that name
  their subject for assistive technology ("Move Fax referrals").
- The existing words for pending work: "Changed" with "Undo changes", "New" with
  "Remove". A pending removal is tagged "Removed".
- The publish dialog's single list, "What changes", which gains a "Removed" line where
  an edit lists its fields and a new item says "New item" (STY-047's `WhatChanges`).
- ADR-012's rules otherwise: one roadmap's publish is all or nothing, conflicts block
  it, and Refresh keeps pending edits. English only.

## A. Removing an item

Sam has spotted that "Fax referrals" duplicates another item. Today they can only move
it to Not doing, which tells readers the work was dropped (it wasn't), or delete the
row in the spreadsheet. The designs differ in where removal sits and when it is
written.

| Design                                                                           | Idea                                                                                                                                                                                                                                                                                                              | Strengths                                                                                                                                                                                                                   | Risks                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1 Inline**: Remove on the card, struck through until published (Q1a, Q3b)     | Every published card gains Remove. Choosing it leaves the card where it was, struck through and tagged "Removed", with Undo. The removal counts as one pending change and is published with the others.                                                                                                           | The same pattern as every other change: pending, tagged on its card, undone where it was made. Nothing leaves the public site by accident. Focus stays on the same card (Remove, then Undo). Works the same on a phone.     | Removal sits one click from Edit, and it doesn't ask first; Undo and Discard all are the safety net. A card with a pending edit now carries four buttons (Undo changes, Remove, Move, Edit), which wrap onto two rows at desktop card width. Its Remove has the same name as a new item's, which drops the item at once without leaving a struck card. No mention of Not doing.               |
| **A2 Guided**: a question that offers Not doing, then removes at once (Q1b, Q3a) | Remove on the card opens "Remove “Fax referrals”?". It offers "Move it to Not doing" first (pending, like any move) and "Remove it from the roadmap" second, which is written at once. The page confirms "“Fax referrals” was removed". If the session expires, the dialog keeps the choice and offers Reconnect. | The only design that puts Not doing in front of Sam at the moment of choosing, safe option first, as the copywriter's _Destructive question_ pattern asks. The result is final and plain: no struck card waits on the page. | It breaks ADR-012's single, all-or-nothing publish: a second kind of write, outside "Publish changes", that the publish dialog never lists. It can't be undone in the editor, and Discard all can't bring it back. It needs a new repository call, the DEF-015 hold for a lost answer, and its own conflict check (B3). On a roadmap that isn't published, "leaves the public site" is wrong. |
| **A3 Mode**: removing is a place in the Move menu (Q1a, Q3a without a question)  | "Remove from the roadmap" is the last entry in the Move menu, under Not doing, each with a one-line hint ("Readers see it was dropped" / "Readers no longer see it"). The card leaves its horizon for a "Removed when you publish" group at the foot of the page, with Put back.                                  | Puts the two choices side by side on every removal, without a dialog. Adds no button to the card. The horizon shows what the public will see after publishing.                                                              | Removal isn't a move: the menu is headed "Move to", and the write must not touch the `Horizon` cell (ADR-014). The card jumps to the foot of the page, out of sight on a phone, so Sam has to scroll to undo it. Menu hints are a new pattern. A new item's Move menu would need the same entry, giving it two ways to be removed.                                                            |

**Recommendation**: **A1** as the primary design: removal is a pending change like all
the others (Q1a, as the record recommends). One add-on from A3's idea: one line on
A1's struck card or in the publish dialog that points to Not doing for work that was
dropped, which answers Q3(a) without adding a question (not yet drawn). Use A2 only if
the owner answers Q1(b).

## B. Publishing a removal

Sam chooses "Publish changes". Since Sam opened the roadmap, Alex has changed the
item's Description to "Move the last 14 practices that refer by fax onto the online
form by March." The designs differ in whether that change stops the removal.

| Design                                                                     | Idea                                                                                                                                                                                                                                    | Strengths                                                                                                                                                                               | Risks                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1 Conflict in the existing review** (Q2a)                               | The publish dialog lists "Fax referrals — Removed". The publish is refused because of Alex's change, and the existing review shows "Your change: Removed" beside "Current text: Description", with "Remove anyway" and "Keep the item". | Keeps the persona's rule that a co-lead is told, not overwritten (A12). Reuses the review's layout, focus and "Nothing was published" wording. Sam sees exactly what they would delete. | A new kind of conflict: ADR-012 compares field by field, and this is a whole item against any field. The review's title needs a removal form ("…an item you removed"). If Alex changed several fields, the review must show them all, which isn't drawn. "Keep the item" drops the removal, and Sam's other change stays pending. |
| **B2 The removal wins, and the notice says so** (Q2b)                      | The publish goes through. The notice adds: "Someone else had changed “Fax referrals” since you opened it. Their change was removed with it."                                                                                            | Simplest rule and fewest screens. Sam still learns what happened.                                                                                                                       | Alex's work is overwritten, which goes against A12, and is only reported afterwards with no recourse. The notice clears itself after a few seconds, as confirmations do (copywriter _Page notice_). Detecting the change still needs the comparison B1 makes, so this saves screens, not logic.                                   |
| **B3 Removed at once: refused inside the question** (with A2; Q1b and Q2a) | With A2, the removal's own write re-reads first. Alex's change stops it inside the dialog ("Nothing was removed"), with "Remove anyway" and "Keep the item".                                                                            | Sam decides in the same place they chose to remove, with the change in view.                                                                                                            | Only applies if Q1 is (b). It's a second conflict screen to build and test, beside the review.                                                                                                                                                                                                                                    |

**Recommendation**: **B1** (Q2a, as the record recommends). B3 replaces it only if Q1
is answered (b). No add-ons.

## Decisions needed

| #   | Decision                                                                                                                                        | Options                                                                                                                                                                                                                                                | Recommendation                                                 | Answers                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------- |
| 1   | Is a removal pending, or written at once?                                                                                                       | (a) pending, struck through with Undo: A1, or pending in a group of its own: A3; (b) at once after a question: A2. (b) reopens ADR-012 Options 4 and 8.                                                                                                | (a), with A1                                                   | STY-049 Q1                         |
| 2   | Where is Not doing mentioned?                                                                                                                   | (a) in a question: A2; (a′) beside the choice in the Move menu: A3, a departure since there is no question; (a″) one line on A1's struck card or in the publish dialog (not drawn); (b) nowhere: A1 as drawn.                                          | (a″) if Q1 is (a); (a) if Q1 is (b)                            | STY-049 Q3                         |
| 3   | A co-lead changed the item since it was loaded                                                                                                  | (a) a conflict: B1, or B3 with an at-once removal; (b) the removal wins, and the notice says so: B2. (a) adds an item-level conflict to ADR-012 Option 12.                                                                                             | (a), with B1                                                   | STY-049 Q2                         |
| 4   | Where the control sits                                                                                                                          | Remove on the card: A1, A2; an entry in the Move menu: A3.                                                                                                                                                                                             | On the card                                                    | new                                |
| 5   | A removed item that has pending edits                                                                                                           | Removing drops its edits, and Undo restores the item as read; or Undo restores the edits too. In A1 a removed card shows no Edit or Move.                                                                                                              | Undo restores the edits too, so Undo reverses exactly one step | new                                |
| 6   | The item is already gone when Sam publishes (a co-lead deleted the row)                                                                         | Treat the removal as done and publish the rest; or ADR-012 Option 13: "not found" publishes nothing.                                                                                                                                                   | Done, as "a pending field the re-read already holds" is        | new; reopens Option 13             |
| 7   | Deleting a row moves the rows below it, and an item without an ID is found by its position (ADR-012 Option 11; STY-045's "no row in use moves") | Delete last in the write, after every other row is found and given an ID; or refuse to remove an item that has no ID until a publish has given it one.                                                                                                 | Delete last in the same write                                  | new; reopens the STY-045 amendment |
| 8   | Which story supplies the write                                                                                                                  | A repository story of its own ahead of STY-049, as STY-040 and STY-045 were (the epic's _Sequencing_: "a repository write is its own story"), owning README _What the editor writes_ (rows deleted) and the ADR-012 amendment; or both inside STY-049. | A separate repository story                                    | new                                |
| 9   | Removing a roadmap's last item, or the last item in a horizon                                                                                   | Show the empty-roadmap panel and the publish dialog's "no items" line as they work today (STY-042, STY-046); or add a warning.                                                                                                                         | As today                                                       | new                                |

## Not yet drawn

- A1's add-on: one line that points to Not doing (Decision 2).
- A2's other choice, "Move it to Not doing" chosen: a pending move tagged "Changed" in
  Not doing, giving 2 unpublished changes.
- A2's failed write (a notice in the dialog, as when adding a roadmap fails) and its
  lost answer (the DEF-015 hold).
- Where focus goes after an at-once removal (A2), and after "Remove from the roadmap"
  (A3: drawn on Put back, not decided).
- Removing from a roadmap that isn't published ("Save changes" wording; A2's "leaves
  the public site" line).
- Removing an unplaced item (no Not doing hint needed), and a new item's Remove beside
  a published item's Remove on the same page.
- A roadmap whose last item is removed (Decision 9).
- B1 when the co-lead changed several fields, or deleted the row (Decision 6).
- "Discard all" with a removal pending (restores the item).
- The dark theme and Welsh.

## What does not change

- A roadmap's publish is still one all-or-nothing write. Under A1, A3, B1 and B2 the
  removal goes in that write.
- Conflicts on fields, "Keep mine" and "Use theirs", Refresh and pending edits kept in
  memory (ADR-012).
- A new item's "New" tag and Remove (STY-046). Move and its menu (STY-031), except
  under A3.
- What every other field writes (README, _What the editor writes_). Deleting rows is
  the one addition, and that change to the data source's format is stated by
  whichever story supplies the write (Decision 8).
- English only. Who may edit (ADR-012 Option 14).

## Outcome

Owner, 2026-11-19, grilling recorded in
[STY-049](../backlog/_archive/EPC-011-adding-roadmaps-and-items/STY-049-remove-a-published-item.md#decisions):
a removal is pending, shown in place struck through with Undo (A1), but Remove first
asks, offering "Move to Not doing" as its first action (A2's question, without its
write at once); Move and Edit stay visible and disabled on a removed card. A co-lead's
change is a conflict in the existing review (B1). Decisions 5–9 went as recommended,
Decision 6 included; Decision 8 made the write its own story,
[STY-070](../backlog/_archive/EPC-011-adding-roadmaps-and-items/STY-070-the-repository-publishes-a-removed-item.md).
A new item's Remove asks the same question. No frames were redrawn: the build's
screenshots are reviewed instead.

## Related

- [STY-049](../backlog/_archive/EPC-011-adding-roadmaps-and-items/STY-049-remove-a-published-item.md):
  the record these designs serve.
- [EPC-011](../backlog/EPC-011-adding-roadmaps-and-items/README.md) and its
  `delivery-notes.md` (`PageItem`, `WhatChanges`, the hold).
- [ADR-012](../adr/ADR-012-publishing-a-roadmaps-changes.md): publishing, item identity
  and conflicts. [ADR-011](../adr/ADR-011-roadmap-items-from-each-roadmaps-tab.md): the
  six placements. [ADR-014](../adr/ADR-014-item-placement-and-organisations-are-edited.md): Move.
- [`add-a-roadmap-ux-analysis.md`](add-a-roadmap-ux-analysis.md): the earlier designs
  for adding roadmaps and items.
- Persona: [`product-lead.md`](../backlog/personas/product-lead.md) (A2, A9, A10, A12).
