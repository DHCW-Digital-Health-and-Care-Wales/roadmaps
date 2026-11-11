# ADR-012: A roadmap's pending edits are published together, by item ID, and refused on a conflict

- Status: Accepted — owner, 2026-11-11: grilling rounds 1–3 and Q28–Q30 of the Editing
  epic (Options 1–15 below). Amends ADR-002 (a write call) and ADR-011 (item identity);
  extends ADR-009 (the editor writes to the roadmap index).
- Date: 2026-11-11

## Context

The editor reads the roadmap index (ADR-009) and each roadmap's tab (ADR-011) and
writes nothing. A Product Lead needs to change a roadmap's text and its items and
publish them, without a half-finished edit going public and without overwriting a
co-lead (persona A9, A10, A12). The spreadsheet is shared with the public site, which
rebuilds from it nightly at 02:00 UTC, so writing an enabled roadmap's cells is
publishing it. The public site ignores columns it does not know. Items have no
identity: ADR-011 keyed them by position and left identity to the first editing
record, since a co-lead can insert, delete or sort rows between a read and a write.

The Google Sheets API has no conditional write. `spreadsheets.batchUpdate` applies its
requests in order and is atomic: if any request is invalid, nothing is applied. Writing
a value beyond a tab's grid fails, so a new column needs an `appendDimension` request
first.

## Decision

### What is editable

- **A roadmap's own text**: title (required), status label, product lead, vision and
  service description (Option 1). Family, category, colour, `Last updated` and
  published stay read-only: family is tied to a colour the sheet sets separately, so it
  waits for EPC-006.
- **A roadmap item's text**: title (required), description, expected outcome and phase
  (Option 2), on every item, unplaced ones included. Tags, organisations, details,
  placement and Welsh stay read-only.
- **English only** (Option 3): Welsh cells are never written, even when the English
  beside them changes.
- A required field is not blank after trimming. Every other field may be cleared. No
  length limit.
- Text is written as text: a value that looks like a number, a date or a formula
  (`42`, `1/2`, `=SUM(A1)`) is stored as the string typed, never parsed.

### Pending edits and publishing

- **An edit is pending until the Product Lead publishes the roadmap** (Option 4): edits
  to the roadmap's text and to any number of its items gather in memory, in this tab,
  and survive navigating between pages, an expired session and Reconnect. They are
  never written to browser storage. Leaving or reloading the tab with pending edits
  asks first.
- **Disconnect with pending edits asks first** (Option 15): keep them, discard them, or
  cancel and stay connected. Kept edits stay in memory with their base values, while
  everything read under the session is forgotten as before; after the next Connect the
  roadmap is re-read and they show over it, so a co-lead's change in between is a
  conflict. Disconnect with none pending does not ask.
- **Publishing is per roadmap and all or nothing** (Option 8): every pending edit of one
  roadmap is written in one `spreadsheets.batchUpdate`, across the roadmap index and the
  roadmap's tab, or none is. Only the changed cells are written, plus any item IDs and
  columns publishing adds.
- **Each pending edit keeps its base value**: the field's value when it was loaded.
  Refresh re-reads the roadmap and keeps pending edits on top; the base stays the value
  first edited, so a refresh never hides a co-lead's change.
- `Last updated` is not changed by publishing (Option 9).
- The step is **Publish** on a published roadmap and **Save** on one that is not
  (Option 10): the same write, named for what it does there.

### Item identity (amends ADR-011)

- **An `Item ID` column** holds each item's identity (Option 5). `RoadmapItem` gains
  `id: string | null`: `null` until the item's row has an ID. Identity is the domain's;
  rows stay inside infrastructure.
- **Publishing assigns IDs** (Option 6): on every publish, each row the parser keeps
  (a row with a title) that has no ID, or whose ID repeats an earlier row's, gets a new
  short random ID. On a duplicate, the first row in tab order keeps the ID. The parser
  records a later duplicate as a problem and gives it `id: null`.
- An ID is unique within its roadmap's tab, never shown in the interface, and is text
  that cannot read as a number, a date or a formula. STY-023 sets its format.
- **The `Template` tab is never written** (Option 7). Adding `Item ID` to it, and to the
  public site's documentation, is the owner's step outside this repository.

### Finding what to write, at publish time

Publishing re-reads before it writes: the tab list (with each tab's numeric id and grid
size), the roadmap index and the roadmap's tab, as `listRoadmapItems` does. Every
column is located in that re-read, by header as ADR-011 reads, never from the read the
edits were made on.

- The roadmap's index row is found by its id (the slug of its `Sheet` cell), with
  ADR-009's rule for a repeated slug.
- An item with an ID is found by its ID. An item that had none when loaded is found at
  its position among the kept items, and only if that item still holds exactly the
  content that was loaded (Option 11).
- **A field is in conflict when its current value differs from both its base value and
  the pending value** (Option 12). A field a co-lead changed that the Product Lead did not
  edit is not a conflict, and is not overwritten. A co-lead's change to the same value is
  not a conflict either.
- **Any conflict publishes nothing.** The Product Lead sees each conflicting field with
  their value beside the current one, chooses "Keep mine" or "Use theirs", and
  publishes again (Option 12).
- **An item or roadmap that can no longer be found publishes nothing** (Option 13, Q30):
  an item whose ID is gone, an item without an ID whose position no longer holds the
  loaded content, or a roadmap whose index row is gone. The Product Lead is told which,
  their pending edits to it are discarded, and the rest stay for the next publish.
- **A missing column is added** (Q28): when a field being written, or `Item ID`, has no
  column in the re-read header, publishing appends one after the last column any row
  uses, headed with the public site's English header (`Item ID`, `Product Lead`,
  `Phase`…), growing the grid first when needed. Nothing else in the header moves.
- A roadmap whose tab or index row cannot be read at publish (ADR-011's
  `invalid-data`) publishes nothing and keeps its pending edits.

### The repository call (amends ADR-002)

`RoadmapRepository` gains one write call, named and shaped by STY-023 to this outline:

```ts
publishRoadmapChanges(
  roadmapId: string,
  changes: RoadmapChanges, // the roadmap's text and each item's, each field with its base value
  options?: RepositoryReadOptions,
): Promise<PublishOutcome> // published, or the conflicts and the items or roadmap not found
```

A conflict or a missing item is an outcome the page acts on, not an `AppError`; every
other failure rejects with an `AppError` as reads do (a 403 is `forbidden`, a 401
`unauthenticated`). The contract test covers it against the in-memory double and the
Google adapter. Interface code never sees a row, a column or a cell.

### Who may edit (Option 14)

Edit shows to everyone connected. A publish the data source refuses (`forbidden`)
keeps the pending edits and says the connected account may not change this roadmap.
Nothing checks permission in advance.

## Options (owner's choice marked ✅, 2026-11-11)

1. **What is editable** (round 1 Q1, round 2 Q11)
   - (a) Items only. Lost: a roadmap's vision and status are as public as its items.
   - ✅ (b) Items and the roadmap's own text, without family (Q11: family is tied to
     colour; EPC-006).
2. **Which item fields** (Q2)
   - ✅ (a) Title (required), description, expected outcome, phase. _Sam fixes a typo
     in an outcome and publishes it._
   - Lost (later records): tags, organisations, details, placement.
3. **Welsh** (Q3)
   - ✅ (a) English only; Welsh stays as written.
   - (b) Edit Welsh where a column exists. (c) Always offer Welsh, adding columns. Lost:
     scope; (c) changes the format.
4. **How edits are saved** (Q4)
   - (a) One item at a time, written at once. Lost: the persona's single deliberate
     publish (A9).
   - ✅ (b) Pending until one roadmap-wide publish.
5. **How the right row is found** (Q5)
   - (a) Position plus a content check, no format change. Lost: every co-lead's insert
     or sort above an edited item blocks a publish.
   - ✅ (b) An ID column. The public site ignores it; still a format change.
   - (c) Row number alone. Lost: overwrites the wrong item after an insert.
6. **The ID column** (round 2 Q13)
   - ✅ (a) `Item ID`, appended last and visible, on a roadmap's first publish; every
     kept row without an ID gets one; a duplicated ID stays with the first row.
   - (b) The same, hidden. Lost: a second kind of write, and confusing for anyone
     sorting in the sheet. (c) IDs only on changed items. Lost: identity stays
     positional for the rest.
7. **The Template tab** (Q14)
   - ✅ (a) Never touched; the owner updates it and the public site's README.
   - (b) The editor adds `Item ID` to it. Lost: writes to a tab nothing reads.
8. **Publish scope** (Q17)
   - ✅ (a) One roadmap, all or nothing, in one write.
   - (b) Every roadmap with pending edits at once. Lost: one roadmap's conflict blocks
     all.
9. **`Last updated`** (Q8)
   - ✅ (a) Not changed; staleness (A7) is a later record.
   - (b) Set on publish. Lost: a second index write and a date format to agree.
10. **The step's name** (Q21)
    - (a) "Publish" everywhere. Lost: misleading on a roadmap the public site does not
      show.
    - ✅ (b) "Save changes" on an unpublished roadmap, "Publish changes" on a published
      one.
11. **An item with no ID yet** (round 3 Q23)
    - ✅ (a) Its position plus an exact content check; any difference is treated as not
      found.
12. **Conflicts** (Q15, Q16)
    - ✅ Field by field: only a field both people changed. _Alex edits an item's title
      and Sam its description; both publish._ Rejected: any change to the item or
      row since it was loaded (more false conflicts).
    - ✅ On a conflict nothing is published; the fields are shown side by side with
      "Keep mine" and "Use theirs". Rejected: discarding the Product Lead's edits and
      reloading.
13. **An item that can't be matched** (Q30)
    - ✅ (a) As a removed item: reported, its pending edits discarded, nothing
      published. _Sam's edit to an item whose row a co-lead moved before IDs existed
      is reported as "changed since you opened it"; Sam redoes it on the current item._
    - (b) A side-by-side conflict. Lost: with no ID there is no "theirs" to compare to.
14. **Permission** (Q9)
    - ✅ (a) Edit for everyone; a refused publish keeps the edits and explains.
    - (b) Check access first. Lost: another Google API and scope.
15. **Disconnect with pending edits** (Q29)
    - (a) Ask, then discard. Lost: a Product Lead who disconnects at the end of a
      meeting loses work they meant to finish later.
    - ✅ (b) Ask: keep, discard or cancel. _Sam disconnects with two unpublished item
      changes, chooses Keep, connects after lunch and publishes them._
    - (c) Discard without asking. Lost: work, silently.

## Consequences

- **The data source's format changes**, a contract with the public site: an `Item ID`
  column appears at the end of each roadmap's tab on its first publish, and a missing
  field column at the end of the index or a tab when a publish needs it. The public site
  ignores unknown columns and reads columns by header. Every PR that writes says so.
- **A small race remains**: a co-lead's change landing between the re-read and the
  write is overwritten, as Google has no conditional write. The window is one request.
- A publish costs three reads and one write, sequential.
- A Product Lead's English edit can leave the Welsh beside it out of date until Welsh
  editing exists.
- Pending edits are lost when the tab closes after its warning, or when the Product
  Lead chooses to discard them on Disconnect (EPC-005 STY-025). Storage and drafts are
  later records (A10).
- Kept edits outlive the session that read them. The app does not know who connects
  next, so a different Google account connecting in the same tab sees them and could
  publish them, as far as its own access allows; whoever holds the tab chose to keep
  them.
- The tab-list read gains each tab's grid size; the Sheets client gains a write method;
  the E2E fake accepts writes and records them.
- ADR-002 and ADR-011 carry an ADR-012 amendment; ADR-009's reading rules are
  unchanged and now also locate the index row to write.
- Delivered by [EPC-005](../backlog/EPC-005-editing/README.md).
