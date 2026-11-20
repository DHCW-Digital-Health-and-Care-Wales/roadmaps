# STY-082: The publish dialog flags a new item that has only a title

- **Status**: Proposed — grilled with the owner on 2026-11-20; follows STY-080 and STY-081
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: STY-080 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-008, ADR-010
- **Suggested model**: Sonnet — one marker on a list the publish dialog already draws

## Summary

Quick add makes it easy to put down items by title alone and fill them in later. Before
publishing, a Product Lead sees which new items still have only a title: the publish
dialog marks each one in its list of new items. Nothing is blocked; a title and a
placement are still all an item needs. The cards on the page show nothing extra.

## Scope

The publish dialog's list of changes (`features/`), and the rule that says a new item
has only a title; copy in both catalogues.

## Acceptance criteria

### S1: A title-only new item is marked (quick add round 1 Q1)

**Given** a roadmap with two new items, "Book a hearing test online" with only a title
and "Change your appointment by text" with a description
**When** Sam chooses "Publish changes" or "Save changes", or "Publish roadmap" on a
roadmap not published
**Then** the dialog lists both under "What changes", marked as new as today, and marks
the first as having only a title
**And** however the item was added, by quick add or the item dialog, the rule is the
same

### S2: Nothing is blocked

**Given** that dialog
**When** Sam confirms
**Then** both items are written, as STY-045 writes them

### S3: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a screen reader
**When** the dialog lists a title-only item
**Then** its mark is in Welsh and is read with the item's title; axe finds nothing in
the dialog

## Decisions

- **D1** (owner, 2026-11-20, quick add round 1 Q1): publish a title-only item, but flag it in the
  publish dialog, over publishing it unmarked or refusing until it has a description.
- **D2** (owner, 2026-11-20, quick add round 5 Q1): the item's card on the page shows nothing extra.
- **D3** (agent, 2026-11-20): "only a title" means every field but the title and the
  placement is empty: description, expected outcome, phase, tags, organisations and
  details. Over "no description", which would mark an item whose only text is in its
  outcome. The mark's words go through the copywriter skill at delivery; "Title only"
  is the draft.

## Out of scope

- A published item with only a title: not a new item, so not marked.
