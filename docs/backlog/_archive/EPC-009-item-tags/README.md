# EPC-009: Item tags — free text a Product Lead edits here, nudged towards the tags the roadmap already uses

- **Status**: Done — every story delivered: STY-038 in
  [#65](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/65),
  STY-037 in its own PR
- **Progress**: 2 of 2 terminal
- **Binding ADRs**: ADR-012, ADR-014, ADR-011, ADR-010, ADR-008, ADR-002

## Summary

A Product Lead can edit an item's text, horizon and organisations, but still opens the
spreadsheet to tag it. This epic makes tags editable in the item's edit form: add,
rename and remove, pending until published like every other edit. While adding, the
form offers the tags the roadmap's other items carry, so "Patients" is chosen rather
than retyped as "patient". Tags stay free text. A shared list across roadmaps, and
renaming a tag everywhere at once, stay out. The editor is a row per tag, with the
roadmap's other tags as buttons. The form's two long fields, Tags and Organisations,
open on request, so the form is shorter than it is today.

## Owner decisions waiting

None.

## Findings

Audited at `52850bf` on 2026-11-13.

| Where                    | Tags                                                                          |
| ------------------------ | ----------------------------------------------------------------------------- |
| Item card                | one "Tags" line of text, comma separated, in Welsh where the item has it      |
| Item edit form           | not a field (`EDITABLE_ITEM_FIELDS` ends at `organisationIds`)                |
| Publish, conflict review | never written or compared                                                     |
| Repository               | read only: `tags: LocalisedText[]`, from `Labels` and `Labels (cy)` (ADR-011) |

### F1 — Tags are read-only by decision

ADR-012 _What is editable_ keeps tags read-only, and ADR-014 opened only placement and
organisations. "Tag items" is one of the persona's jobs, done today in the spreadsheet.

### F2 — Nothing shows the tags a roadmap already uses

Tags are free text per Product Lead (persona A8), and the persona names the cost:
"Patients", "patient" and "Citizen" for one idea. The editor shows each item's own tags
and nothing across items. A shared list is wanted later, not now (A8). Counter-argument:
offering the roadmap's tags nudges and does not enforce, so drift slows without
stopping.

### F3 — Welsh tags are paired with English by position

Entry _n_ of `Labels (cy)` is the Welsh of entry _n_ of `Labels`; a blank or `-` entry
shows the English, and a different count ignores all the Welsh in the cell
(`docs/analysis/roadmap-tab-format.md`, `Labels`). ADR-012 writes English only. So a
write of the English cell alone can show the wrong Welsh under a tag (same count,
entries moved) or drop every Welsh tag of the item (count changed). No roadmap has
Welsh content today (persona A4), so the cost is a future one.

### F4 — A tag cannot hold a comma or a line break

Both separate entries in the cell. Reading drops blank entries and an English tag
repeated exactly (`rg -n "function readTags" -A 14 src/infrastructure/google-sheets/roadmap-tab-parser.ts`).

### F5 — The edit form has no field a Product Lead can add values to

Every field is one string: typed, chosen from fixed options, ticked from fixed options
(STY-034) or a date (`rg -n "many\?|options\?|date\?" src/features/roadmaps/editing/edit-form.tsx`).
`src/components/ui/` has no combobox; `@base-ui/react` ships one with chips.

### F6 — The edit form is long before tags join it

In a desktop card the item's edit form is about 1,400px tall, and the twelve
organisation checkboxes are about 620px of it, whatever the Product Lead came to change
(measured on the whole-form prototype, at a 360px card). Open, the tags editor adds
about 340px. With both shut the form is about 860px.

## Design

1. An item's tags become a pending edit, made in its edit form and published with the
   roadmap's other edits (F1). STY-037.
2. While adding, the form offers the tags the roadmap's other items carry (F2; owner,
   STY-037 D1). No list is stored: the offer is read off the items on the page.
3. The editor is design B of the four prototyped: a row per tag, and the roadmap's
   other tags as buttons (F5; owner, STY-037 D11).
4. An item that has Welsh tags keeps its tags read-only in the form until Welsh content
   can be edited, so no Welsh is ever mispaired or lost (F3; owner, STY-037 D14).
5. A field with many controls starts shut in the form and opens on request: Tags
   (STY-037 S19) and Organisations (STY-038) (F6; owner, STY-037 D13, STY-038 D1).
6. **Unchanged:** tags are free text; the card's Tags line; ADR-012's per-roadmap,
   all-or-nothing publish and its Refresh rules; its conflict review, but for one new
   conflict: Welsh tags written since the item was read (STY-037 S22, D17); the reading
   rules of F3 and F4.

## Shared assumptions and contracts

### What the editor writes

STY-037 adds the item's `Labels` cell to README _What the editor writes_ in its own PR
and says so in the PR, since the format is a contract with the public site.

### ADR-012 amendment

STY-037 amends ADR-012 in place (`### STY-037 amendments`) in its PR, citing its owner
decisions: tags are no longer read-only; no Welsh cell is written (D14); and Welsh
tags written since the item was read are a conflict that only dropping the tag change
resolves (D17).

### A field that opens on request

One piece serves both stories: STY-038 built it in the edit form, as `OpeningField`
(its record's _Contract for dependents_), and STY-037 uses it.
Shut, the field shows its label, one line saying what it holds
(or that it holds nothing) and a button: "Change", or "Add" when empty, named with the
field for assistive technology ("Change tags"). Open, the button reads "Close", says
the field is open, and the field's controls show in place, with focus on the control
the field names: the first checkbox for Organisations, "Add a tag" for Tags.
Shutting keeps what was changed; confirming the form keeps it open or shut. A form
always opens with the field shut.

## Stories

| ID      | Story                                                                                       | Area                                       | Depends on | State |
| ------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------- | ----- |
| STY-037 | [A Product Lead edits an item's tags](STY-037-edit-an-items-tags.md)                        | Domain + Infra + UI + i18n (en + cy) + E2E | STY-038    | ✅    |
| STY-038 | [The Organisations field opens on request](STY-038-organisations-field-opens-on-request.md) | UI + i18n (en + cy) + E2E                  | —          | ✅    |

## Sequencing

STY-038 goes first: it is the smaller, and builds _A field that opens on request_ on a
field that exists. STY-037 needs it on the default branch, and stays one change, since
the field, the pending change and the write are not useful apart.

## Out of scope

- **A shared tag list, or tags offered from other roadmaps**: persona A8 expects one
  "as the product develops"; it needs a home for the list and an owner for it.
- **Renaming or merging a tag across a roadmap's items**: STY-037's rename changes one
  item. A later record, if offered tags leave drift such as "patient" and "Patients".
- **Reordering an item's tags**, and **filtering a roadmap by tag**: no record yet.
- **Editing Welsh tags**: with Welsh content editing, a later record.

## Defects

None.

## Related

- [`docs/analysis/item-tags-ux-analysis.md`](../../../analysis/item-tags-ux-analysis.md):
  the four editors compared, with the prototypes to try. Outcome: B (STY-037 D11).
- `docs/analysis/roadmap-tab-format.md`: the `Labels` column and its Welsh pairing.
- ADR-011 (the item model), ADR-012 (publishing), ADR-014 (the organisations precedent).
- Persona: `docs/backlog/personas/product-lead.md` (_Tag items_, _Inconsistent tags_,
  A4, A8).
