# EPC-020: Icons before Tags and Organisations — two lists of labels read as plain text

- **Status**: Active — one story, raised and grilled by the owner on 2026-11-19
- **Progress**: 0 of 1 terminal; next selectable: STY-079; blocked on: none
- **Binding ADRs**: ADR-008, ADR-010

## Summary

An item's tags and organisations are the two fields that are lists of short labels, and
they read as plain bold words among prose fields. This epic puts lucide's tag icon before
"Tags" and its building-complex icon before "Organisations" wherever the editor names them:
on a card and an opened compact row, in the Add and Edit item forms, in the conflict
review and "What changes", and on the Families page. The icons decorate only: screen
readers say what they said. It leaves the other fields without icons and writes no new copy.

## Owner decisions waiting

None.

## Findings

Audited at `b968cd2` on 2026-11-19.

| Where the words are drawn                | Built on                      | Drawn as            |
| ---------------------------------------- | ----------------------------- | ------------------- |
| Card, opened compact row                 | `ItemFields` (`dt`)           | Bold label          |
| Add and Edit item form                   | `EditForm` (`OpeningField`)   | Field label         |
| Locked Welsh tags in the form            | `FixedField`                  | Bold label          |
| A removal's "Current text" in the review | `RemovalConflictItem` (`dt`)  | Bold label          |
| An edit's target line in the review      | `ConflictItem` (`target`)     | One translated line |
| "What changes"                           | `WhatChanges` (`change`)      | Joined string       |
| Families, categories and organisations   | `OrganisationsSection` (`h2`) | Heading             |

`rg -n "items\.fields\.(tags|organisations)|itemFields\.|families\.organisations\.heading" src -g '!*.test.*'`
reproduces the table.

### F1 — Two lists of labels look like prose fields

Tags and organisations are chips of short names, not paragraphs, but their labels are
as plain as "Description". An icon lets a Product Lead find them on a card at a glance.

### F2 — Two sites name the field inside running text

The refusal's `target` ("First item: Tags") is one translated string, and "What changes"
joins its field names with commas. Neither can hold an icon until its names are nodes.

## Design

1. A label shows an icon for these two fields only, chosen by field: the tag icon for
   Tags, the building-complex icon for Organisations (F1; STY-079 D1, D3).
2. The icon is decorative and hidden from assistive technology; every accessible name
   is unchanged (STY-079 D2).
3. The icon takes the label's colour and the label's text height, with a small gap
   (ADR-010; STY-079 D4).
4. In the refusal's target line and "What changes" the field name is rebuilt so the
   icon sits before it, in English and Welsh (F2; STY-079 D5).
5. **Unchanged:** the hidden words on "Keep mine" and "Use theirs", every other field's
   label and every closed compact row.

## Shared assumptions and contracts

### Copy

No string is added. The refusal's `target` wording changes shape (STY-079 D5) and is
written with the `copywriter` skill in English and Welsh (ADR-008).

## Stories

| ID      | Story                                                                                                                 | Area               | Depends on | State |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------- | ----- |
| STY-079 | [A tag icon before "Tags" and a building icon before "Organisations"](STY-079-icons-before-tags-and-organisations.md) | Features/UI + i18n | —          |       |

## Sequencing

One story, no prerequisite. It can run beside EPC-018 and EPC-019 deliveries: they change
the moved mark and the dialog layout, not these labels.

## Out of scope

- **Icons for the other fields.** Phase, Description, Expected outcome and Details stay
  plain; the owner chose only these two.
- **Icons on a tag's or an organisation's own chip.**

## Defects

None.

## Related

- [EPC-009](../_archive/EPC-009-item-tags/README.md): the tags field and its card text
- [EPC-007](../_archive/EPC-007-item-placement-and-organisations/README.md): the
  organisations the item names
- ADR-010 (DHCW look): why the icon takes the label's colour
