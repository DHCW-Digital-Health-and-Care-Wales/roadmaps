# STY-034: A Product Lead chooses who an item's work is for

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Domain + Infrastructure + Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-007-item-placement-and-organisations](README.md)
- **Depends on**: STY-031 (hard), STY-032 (hard)
- **Binding ADRs**: ADR-014 §Organisations, ADR-012, ADR-008
- **Suggested model**: Opus — a set-valued field through the pending-change model,
  publish plan and conflict review, and a column the write may add
- **Delivered**: (this PR)

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
build on its extension. STY-032 keeps an item's unknown codes as written, and its shared sort (D7) orders the
checkboxes. The edit form
has a typed field and a single choice (`EditFormField.options`), no multiple choice.
ADR-012 _A missing column is added_ gives the header (`Organisations`) and the place.

## Out of scope

- Tags and details: later editing records.
- Managing the organisation list: EPC-007 _Out of scope_.

## Delivery

### What the data source receives

This changes what the editor writes to the shared spreadsheet, the contract with the
public site (README, _What the editor writes_). A publish now also writes, in the same
`batchUpdate` as the roadmap's other edits, the `Organisations` cell alone of an item
whose organisations changed: the chosen codes, `National` first and then by code,
separated by `, ` (`National, SBUHB`), or an empty cell for none. Only codes in the
built-in list are written, so a code the list doesn't hold leaves the cell then, and
only then: publishing an item's other fields leaves the cell as it is. A roadmap with no
`Organisations` column gains one, appended as ADR-012 appends any edited field's column.

### Departures

- **The field is `organisationIds`** (agent), as the roadmap's choices are `familyId`
  and `categoryId`: one `FieldChange` whose value is the set's IDs, sorted and comma
  separated (`organisationIdsValue`), so the same set is the same value whatever order
  it was read or ticked in, and S7's reorder is no change by string comparison.
- **The publish plan rejects an organisation the list doesn't hold** (agent), with
  `AppError('unknown')`, as it rejects a placement the editor never sends: the snapshot
  gains `organisationIds`, the IDs the list holds, from each repository.
- **The unknown-code notice is the group's hint** (agent): it sits under the
  "Organisations" legend and describes the group (`aria-describedby` on the fieldset),
  naming the codes comma separated ("CAVHB, Mars"), not as a list with "and", which
  browsers format unreliably in Welsh. It reads "CAVHB isn't recognised. Changing the
  organisations will remove it." It follows the item as read, so it stays while a
  changed choice is pending, which removes the code.
- **The card's read-only Organisations line hides while its form is open** (agent), as
  the text fields' lines do: the form edits them.
- **The checkbox is shadcn's Base UI Checkbox, restyled to DHCW's checkbox** (agent): a
  40px square with the text input's border and the `focus-ring`.
- **S3's "beside Powys" uses Hywel Dda in the page test** (agent), as the test list
  (`TEST_ORGANISATIONS`) has no Powys; the E2E specs use Powys.
- **Tests.** The publish plan, repository contract, pending-change and page tests were
  written first and run red. One pending-change test ("finds an item without an ID
  whose choice a lost publish already wrote") passed on writing, as the domain's
  `findEditedItem` case came first with the plan. The Sheets adapter's own tests (the
  cell's order, the empty cell, the respelt `sbuhb,CAVUHB` and the added column)
  followed the adapter code. The Playwright specs followed working code.

### Contract for dependents

- **Domain** (`@/domain/roadmap/roadmap-changes`): `EDITABLE_ITEM_FIELDS` ends with
  `"organisationIds"`; `itemValue` gives it as `organisationIdsValue(ids)`;
  `organisationIdsOf` reads one back. `RoadmapSnapshot.organisationIds` holds the IDs a
  publish may write. `findEditedItem` expects no unknown codes on an item whose
  organisations a lost publish wrote.
- **Sheets adapter**: `ITEM_COLUMNS.organisationIds` is `Organisations`; `itemCell`
  writes the codes, national first then by code.
- **Features**: `EditFormField.many` (`ofValue`, `toValue`) makes a field a checkbox
  group of its `options`; `EditFormField.hint` describes a field. `applyItemChanges`
  shows chosen organisations with no unknown codes; `ConflictReview` names organisations
  by short name, sorted as the card sorts them. `Checkbox` is in `@/components/ui`.
- **E2E hooks**: the form's "Organisations" group and its checkboxes by "Short name
  (CODE)"; aria snapshot `edit-item-form-error.aria.yml` holds the group.
- **Welsh to review** (machine-assisted): `roadmaps.edit.itemFields.organisationIds`
  ("Sefydliadau"), `roadmaps.edit.unknownOrganisations_*` ("Dydy {{codes}} ddim yn cael
  ei adnabod. Bydd newid y sefydliadau yn ei dynnu." and the plural "…eu hadnabod…eu
  tynnu.").

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-choosing-organisations.test.tsx` ("offers a checkbox per organisation, short name and code, All Wales first, the item's ticked"; "labels the group in Welsh, the short names staying English"); `structure.spec.ts` (`edit-item-form-error.aria.yml`: all twelve, All Wales first, the item's ticked); axe in `accessibility.spec.ts` ("an item's organisations, with an unknown code named, then the changed card", light and dark)                                                                     |
| S2       | page test "keeps a choice pending, shown on the card and listed in the publish dialog"; `pending-changes.test.ts` ("shows the chosen set…"); e2e `editing.spec.ts` "ticks organisations, pending, then publishes their codes in that cell alone" (no write before Publish)                                                                                                                                                                                                                                                    |
| S3       | page test "accepts All Wales beside another, and none, no tick clearing another"; `pending-changes.test.ts` ("is no change once the set is ticked back, and none chosen is a change")                                                                                                                                                                                                                                                                                                                                         |
| S4       | page tests "names an unknown code in the form, saying a change removes it", "names every unknown code" and "says nothing of unknown codes for an item with none"; contract "writes a chosen set, known codes only, so an unknown code goes" and "keeps an unknown code when the item's other fields are published"; page "publishes the chosen set, dropping an unknown code"                                                                                                                                                 |
| S5       | `publish-plan.test.ts` ("writes the chosen set as sorted ids, or none"); contract "writes none chosen as no organisations"; Sheets adapter "writes the codes, national first then by code, in that cell alone" and "writes none chosen as an empty cell"; e2e (only `Organisations = National, SBUHB` changes beside Item IDs)                                                                                                                                                                                                |
| S6       | Sheets adapter "adds an Organisations column to a tab with none, then writes the cell"; e2e "adds an Organisations column to a roadmap with none" (ProductC)                                                                                                                                                                                                                                                                                                                                                                  |
| S7       | `publish-plan.test.ts` ("is a conflict when a co-lead chose another set, and none when the same set in another order"); contract "refuses a co-lead's other set, writing nothing" and "takes a co-lead's same set, in another order, as published"; Sheets adapter "takes a co-lead's same set, respelt as `sbuhb,CAVUHB`, as no conflict and no write"; page "shows a co-lead's other set by short names beside yours, to keep or use"; e2e "a co-lead's other choice is shown beside yours, by short name, nothing written" |
| S8       | `pending-changes.test.ts` ("is dropped by a read that finds a co-lead made the same choice, in any order"); page "drops a pending choice that Refresh finds a co-lead already made"                                                                                                                                                                                                                                                                                                                                           |
