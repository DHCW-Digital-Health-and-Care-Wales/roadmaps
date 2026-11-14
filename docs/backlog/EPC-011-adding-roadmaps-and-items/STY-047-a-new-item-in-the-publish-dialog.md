# STY-047: The publish dialog names the new items

- **Status**: Proposed — grilled with the owner on 2026-11-14 (items round 3 Q3)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-046 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-008, ADR-010
- **Suggested model**: Sonnet — one list that already names pending changes learns of
  a new kind

## Summary

Before publishing, a Product Lead sees which items are new: the publish dialog lists
each new item by its title, marked as new, beside the edits. A Product Lead should
know what publishing will make public, and a new item is the largest change there
is. Nothing about what is written changes, and the review of a co-lead's conflicting
change never lists a new item, which can't conflict.

## Scope

The publish dialog's list of changes (`features/`); copy in both catalogues.

## Acceptance criteria

### S1: The publish dialog lists a new item (items round 3 Q3)

**Given** a roadmap with a new item and an edit to another
**When** Sam chooses "Publish changes", "Save changes" or "Save and publish"
**Then** the dialog lists the new item under "What changes", by its title, marked as
new, with the edited item as it is listed today
**And** a conflict in the edit publishes nothing and keeps the new item pending
(STY-045 S3), and the conflict review never lists a new item

### S2: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a screen reader
**When** the publish dialog lists a new item
**Then** its marker is in Welsh and is read with the item's title; axe finds nothing
in the dialog

## Decisions

- **D1** (owner, 2026-11-14, items round 3 Q3, confirming the agent's choices): a new
  item is listed under "What changes" and can never conflict with a co-lead.
- **D2** (agent, 2026-11-14, owner asked for stories that fit one agent's context):
  cut from STY-046, over one story of eleven scenarios across the page, the list and
  the publish dialog.

## Out of scope

- Adding, editing and removing a new item, the tags offered and the empty-roadmap
  line: STY-046. Its write: STY-045.
