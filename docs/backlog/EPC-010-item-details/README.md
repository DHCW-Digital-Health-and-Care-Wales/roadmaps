# EPC-010: Item details — a nested list a Product Lead writes here, stored as hyphens at the start of a line

- **Status**: Active — one story, STY-039, Proposed: the owner chose editor A, the
  outline
- **Progress**: 0 of 1 terminal; next selectable: STY-039; blocked on: nothing
- **Binding ADRs**: ADR-012, ADR-014, ADR-011, ADR-010, ADR-008, ADR-002

## Summary

A Product Lead can edit an item's text, horizon, organisations and, with STY-037, its
tags, but still opens the spreadsheet to write its details: the list the public site
shows under “What this covers”. There, a detail is a line of a cell, and hyphens at the
start of the line nest it. This epic makes details editable in the item's edit form:
write, nest to three levels, reorder and remove, pending until published like every
other edit. The Product Lead never types the hyphens unless they want to. Of three
editors prototyped, the owner chose A, an outline written like a document. Editing
Welsh details, and any formatting beyond a nested list, stay out.

## Owner decisions waiting

None.

## Findings

Audited at `3d0029e` on 2026-11-14, and again at `0d494ef` once STY-037 had merged;
the public site
([product-roadmaps](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps))
at its commit `4b3354d`.

| Where                    | Details                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Item card                | a nested list under “Details”, in Welsh where the item has it                                 |
| Item edit form           | not a field (`EDITABLE_ITEM_FIELDS` holds the text fields, placement, tags and organisations) |
| Publish, conflict review | never written or compared                                                                     |
| Repository               | read only: `details: RoadmapItemDetail[]`, from `Details` and `Details (cy)`                  |
| Public site              | a list that opens under “What this covers” on the item's card, nested as it is here           |

### F1 — Details are read-only by decision

ADR-012 _What is editable_ keeps details read-only; ADR-014 opened placement and
organisations, and STY-037 opens tags. “Add other details where appropriate” is one of
the persona's jobs, done today in the spreadsheet.

### F2 — The nesting is hyphens, counted, with no limit

A cell holds one detail per line, and each hyphen a line starts with nests it a level
deeper (`rg -n "function readDetails" -B 5 -A 16 src/infrastructure/google-sheets/roadmap-tab-parser.ts`).
Neither parser limits the count. The public site's guide writes a top-level line with
no hyphen, and its sample roadmap shows three levels: plain, `-` and `--`.

### F3 — The levels shown are relative, so two cells can read as one list

The card and the public site nest each detail under the last one shallower than it
(`nestItemDetails`; the public site's `DetailList`). So a cell whose every line starts
with a hyphen (`- One`, `-- Two`) shows the same list as `One`, `- Two`, and a line that
skips a level (`One`, `-- Two`) shows one level in. The owner's request describes the
first form; the public site's guide documents the second. An editor that compared or
rewrote the hyphens as written would call these different.

### F4 — A detail cannot start with a hyphen or hold a line break

A hyphen at the start of a line is always nesting, with or without a space after it,
and a line break always ends a detail. The format has no way to write either as text.
Blank lines are dropped.

### F5 — Welsh details are paired with English by position

Line _n_ of `Details (cy)` is the Welsh of line _n_ of `Details` and takes its nesting
from it; a blank or hyphens-only line shows the English, and a different count ignores
all the Welsh in the cell (`docs/analysis/roadmap-tab-format.md`, `Details`). ADR-012
writes English only. So a write of the English cell alone can show the wrong Welsh
under a detail or drop every Welsh detail of the item: the hazard EPC-009 F3 found for
tags. No roadmap has Welsh content today (persona A4).

### F6 — The form has no control for a list with structure, and is long already

STY-037's Tags field is the form's first list a Product Lead adds to, and its value is
an ordered list of short names. Details add a level to each entry, and each entry is a
sentence. `src/components/ui/` has a text area, a dropdown menu and the collapsible
that `OpeningField` uses, and no rich-text or outline control. In a desktop card the
form is about 860px tall with Tags and Organisations shut (EPC-009 F6); open, a
details editor adds between about 460px and 650px for seven details, by design
(measured on the prototypes, at a 360px card).

## Design

1. An item's details become a pending edit, made in its edit form and published with
   the roadmap's other edits (F1). STY-039.
2. The Product Lead works with a list, not with hyphens: the editor shows each detail
   at the level it will read at and writes the hyphens itself, while hyphens typed or
   pasted at the start of a detail still nest it (F2, F4; STY-039 D5).
3. Details are read, compared and written at the levels they show at, so a cell
   written another way opens as the same list and is no change until the Product Lead
   makes one (F3; STY-039 D4, S20).
4. The editor is A, an outline written like a document: the owner's choice of three
   prototyped (F6; STY-039 D10).
5. The Details field starts shut in the form and opens on request, as Tags and
   Organisations do (F6; EPC-009 _A field that opens on request_).
6. An item that has Welsh details keeps its details read-only in the form until Welsh
   content can be edited, as decided for tags (F5; STY-039 D11).
7. **Unchanged:** the card's Details list; how details are read (ADR-011); ADR-012's
   per-roadmap, all-or-nothing publish, its Refresh rules and its conflict review, but
   for the conflict of point 6; no limit on how much an item says (persona A11).

## Shared assumptions and contracts

### What the editor writes

STY-039 adds the item's `Details` cell to README _What the editor writes_ in its own
PR and says so in the PR, since the format is a contract with the public site.

### ADR-012 amendment

STY-039 amends ADR-012 in place (`### STY-039 amendments`) in its PR, citing its owner
decisions: details are no longer read-only, and `Details (cy)` is never written (D11).

### What it builds on

STY-037 is on the default branch (`0d494ef`): its form changes, its list field held as
one value, and its conflict for Welsh written since an item was read are the pieces
STY-039 reuses (STY-037 _Contract for dependents_).

## Stories

| ID      | Story                                                                      | Area                                       | Depends on | State |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------ | ---------- | ----- |
| STY-039 | [A Product Lead edits an item's details](STY-039-edit-an-items-details.md) | Domain + Infra + UI + i18n (en + cy) + E2E | STY-037    |       |

## Sequencing

One story. It stays one change, since the field, the pending change and the write are
not useful apart. It follows STY-037, which is merged.

## Out of scope

- **Editing Welsh details**: with Welsh content editing, a later record.
- **Lists in a description or an expected outcome**: the public site turns their lines
  that start `- ` into a list, by a different rule. No record yet.
- **Formatting in a detail** (bold, links): the format holds text only; it would be a
  change to the contract with the public site.
- **A limit on the number or length of details**: the card budget, deferred (persona
  A11).

## Defects

None.

## Related

- [`docs/analysis/item-details-ux-analysis.md`](../../analysis/item-details-ux-analysis.md):
  the three editors compared, with the prototypes to try. Outcome: A, the outline.
- `docs/analysis/roadmap-tab-format.md`: the `Details` column and its Welsh pairing.
- [EPC-009](../_archive/EPC-009-item-tags/README.md): item tags, whose field, form changes and
  Welsh rule this epic follows.
- ADR-011 (the item model), ADR-012 (publishing), ADR-014 (the organisations precedent).
- Persona: `docs/backlog/personas/product-lead.md` (_Add other details where
  appropriate_, _Saying too much_, A2, A4, A11).
