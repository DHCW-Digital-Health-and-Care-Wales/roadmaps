# EPC-009: Item tags — free text a Product Lead edits here, nudged towards the tags the roadmap already uses

- **Status**: Active — one story, waiting for the owner to choose an editor and answer
  two questions
- **Progress**: 0 of 1 terminal; next selectable: none; blocked on: STY-037 Q1–Q3
- **Binding ADRs**: ADR-012, ADR-011, ADR-010, ADR-008, ADR-002

## Summary

A Product Lead can edit an item's text, horizon and organisations, but still opens the
spreadsheet to tag it. This epic makes tags editable in the item's edit form: add,
rename and remove, pending until published like every other edit. While adding, the
form offers the tags the roadmap's other items carry, so "Patients" is chosen rather
than retyped as "patient". Tags stay free text. A shared list across roadmaps, and
renaming a tag everywhere at once, stay out. Four editors are prototyped for the owner
to try, and the choice among them is the main decision waiting.

## Owner decisions waiting

- [STY-037 Q1](STY-037-edit-an-items-tags.md#open-questions) — which of the four
  prototyped editors is built
- [STY-037 Q2](STY-037-edit-an-items-tags.md#open-questions) — what happens to an
  item's Welsh tags when its tags are edited
- [STY-037 Q3](STY-037-edit-an-items-tags.md#open-questions) — whether a typed tag
  takes the spelling the roadmap already uses

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

## Design

1. An item's tags become a pending edit, made in its edit form and published with the
   roadmap's other edits (F1). STY-037.
2. While adding, the form offers the tags the roadmap's other items carry (F2; owner,
   STY-037 D1). No list is stored: the offer is read off the items on the page.
3. The editor's design is the owner's choice among four prototypes (F5; STY-037 Q1).
4. An item's Welsh tags are never left mispaired: how is STY-037 Q2 (F3).
5. **Unchanged:** tags are free text; the card's Tags line; ADR-012's per-roadmap,
   all-or-nothing publish, its conflict review and Refresh rules; the reading rules of
   F3 and F4.

## Shared assumptions and contracts

### What the editor writes

STY-037 adds the item's `Labels` cell to README _What the editor writes_ in its own PR
and says so in the PR, since the format is a contract with the public site.

### ADR-012 amendment

STY-037 amends ADR-012 in place (`### STY-037 amendments`) in its PR, citing its owner
decisions: tags are no longer read-only, and Q2's answer if it writes a Welsh cell.

### Words

"Tag", never "label" (the column's name) or "keyword" (`docs/GLOSSARY.md`). STY-037
settles the field's copy with the `copywriter` skill, in English and Welsh.

## Stories

| ID      | Story                                                                | Area                                       | Depends on | State |
| ------- | -------------------------------------------------------------------- | ------------------------------------------ | ---------- | ----- |
| STY-037 | [A Product Lead edits an item's tags](STY-037-edit-an-items-tags.md) | Domain + Infra + UI + i18n (en + cy) + E2E | —          |       |

## Sequencing

One story, selectable once Q1–Q3 are answered and it is set Proposed. It stays one
change: the field, the pending change and the write are not useful apart.

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

- [`docs/analysis/item-tags-ux-analysis.md`](../../analysis/item-tags-ux-analysis.md):
  the four editors compared, with the prototypes to try. No Outcome yet: it waits for
  STY-037 Q1.
- `docs/analysis/roadmap-tab-format.md`: the `Labels` column and its Welsh pairing.
- ADR-011 (the item model), ADR-012 (publishing), ADR-014 (the organisations precedent).
- Persona: `docs/backlog/personas/product-lead.md` (_Tag items_, _Inconsistent tags_,
  A4, A8).
