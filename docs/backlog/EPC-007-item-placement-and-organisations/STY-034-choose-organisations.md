# STY-034: A Product Lead chooses who an item's work is for

- **Status**: Proposed — grilled in EPC-007 rounds 1–3 (2026-11-13)
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-007-item-placement-and-organisations
- **Depends on**: STY-031 (hard), STY-032 (hard)
- **Binding ADRs**: ADR-014 §Organisations, ADR-012, ADR-008
- **Suggested model**: Opus — a set-valued field through the pending-change model,
  publish plan and conflict review, and a column the write may add

## Summary

A Product Lead ticks the organisations an item's work is for, in its edit form, from the
list STY-032 serves, as "Cardiff and Vale (CAVUHB)", All Wales first. The choice is a
pending edit, published with the rest. A code in the sheet the list doesn't know is
named in the form before publishing removes it. A roadmap with no `Organisations`
column gains one when first published with a choice.

## Acceptance criteria

### S1: The form offers a checkbox per organisation (round 1 Q7, round 2 Q16)

**Given** an item for Cardiff and Vale
**When** Sam opens its edit form
**Then** an "Organisations" group of checkboxes lists every organisation as its short
name and code ("Cardiff and Vale (CAVUHB)"), All Wales first then alphabetical by short
name, Cardiff and Vale ticked
**And** on the Welsh interface the group's label is Welsh and the short names stay
English

### S2: A choice is pending

**Given** the form above
**When** Sam also ticks Swansea Bay and confirms
**Then** the card reads "Cardiff and Vale, Swansea Bay", tagged "Changed", and the
publish dialog lists the item with organisations among its changed fields
**And** nothing is written until Sam publishes

### S3: Any mix, All Wales included (round 1 Q8)

**Given** the form
**When** Sam ticks All Wales beside Powys, or ticks none
**Then** both are accepted as they are; no tick clears another

### S4: An unknown code is named before it goes (round 1 Q9)

**Given** an item whose cell reads `CAVUHB, CAVHB`
**When** Sam opens its edit form
**Then** the form says CAVHB isn't recognised and will be removed if the organisations
are changed
**And** publishing a changed choice writes known codes only; publishing other edits to
the item, organisations untouched, leaves the cell as it is

### S5: Publishing writes the codes

**Given** a pending choice of Swansea Bay and All Wales
**When** Sam publishes
**Then** the item's `Organisations` cell reads `National, SBUHB`: national first, then
by code, separated by a comma and a space; none chosen writes an empty cell

### S6: A missing column is added (round 1 Q10)

**Given** a roadmap whose tab has no `Organisations` column
**When** Sam publishes a choice of organisations for one of its items
**Then** an `Organisations` column is added as ADR-012 adds one, and the cell written

### S7: A co-lead's different choice is a conflict

**Given** Sam chose Cardiff and Vale and Swansea Bay, and a co-lead has since set Powys
**When** Sam publishes
**Then** nothing is written, and the conflict review shows Sam's short names beside the
co-lead's, to keep or use
**And** a co-lead's same set, in another order or spelling (`sbuhb,CAVUHB`), is no
conflict

### S8: Refresh drops a choice the data source already holds

**Given** Sam's pending choice, which a co-lead has since made too
**When** Sam refreshes
**Then** the item has no pending organisations change

## Decisions

- **D1** (owner, 2026-11-13, EPC-007 grilling round 1 Q7, round 2 Q16): checkboxes in
  the edit form, labelled short name and code, no Welsh names, All Wales first then
  alphabetical → S1.
- **D2** (owner, round 1 Q8): no rule ties All Wales to the others → S3.
- **D3** (owner, round 1 Q9): known codes only are written; the form warns first → S4.
- **D4** (owner, round 1 Q10): a missing column is added on publish → S6.
- **D5** (owner, round 1 Q11): the set is one field for conflicts → S7.
- **D6** (agent, 2026-11-13): an unknown code is removed only when the organisations
  are written, not on every write to the item, over clearing it at any publish: a
  publish changes only the fields the Product Lead changed (ADR-012) → S4.
- **D7** (agent, 2026-11-13): the cell is written as codes separated by `, `, national
  first then by code, over the order ticked: the format the parser and the public site already
  read, and stable, so a re-save is no change → S5.

## Starting point

Audited at `5546d47`. STY-031 makes the first field that is not free text pending;
build on its extension. STY-032 keeps an item's unknown codes as written. The edit form
has a typed field and a single choice (`EditFormField.options`), no multiple choice.
ADR-012 _A missing column is added_ gives the header (`Organisations`) and the place.

## Out of scope

- Tags and details: later editing records.
- Managing the organisation list: EPC-007 _Out of scope_.
