# STY-047: Publishing names the new items, and counts them

- **Status**: Proposed — grilled with the owner on 2026-11-14 (items round 3 Q3; round 3
  Q1)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-046 (hard, must be on the default branch)
- **Binding ADRs**: ADR-012, ADR-008, ADR-010
- **Suggested model**: Sonnet — three places that already list or count pending
  changes learn of a new kind

## Summary

Before publishing, a Product Lead sees which items are new: the publish dialog lists
each new item by its title, marked as new, with the edits. A roadmap whose only items
are new ones no longer counts as empty when it is published, and a new item's tags
are offered to the roadmap's other items, as theirs are to it. Nothing about what is
written changes. This is cut from the story that adds an item, so that each fits one
agent's context.

## Scope

The publish dialog's list of changes, the empty-roadmap line of "Publish roadmap"
and the tags offered in the item dialog (`features/`); copy in both catalogues.

## Acceptance criteria

### S1: The publish dialog lists a new item (items round 3 Q3)

**Given** a roadmap with a new item and an edit to another
**When** Sam chooses "Publish changes" or "Save changes"
**Then** the dialog lists the new item under "What changes", by its title, marked as
new, with the edited item as it is listed today
**And** a conflict in the edit publishes nothing and keeps the new item pending
(STY-045 S3), and the conflict review never lists a new item

### S2: A new item counts when publishing an empty roadmap (round 3 Q1)

**Given** a roadmap, not published, whose only items are new and in a horizon
**When** Sam chooses "Publish roadmap"
**Then** the confirmation offers "Save and publish" for them and does not say the
public site will show the roadmap with no items (STY-042 S3)

### S3: Tags are offered both ways

**Given** a roadmap whose items carry tags, and a new item with a tag of its own
**When** Sam opens Tags in the item dialog, adding or editing
**Then** the new item is offered the roadmap's tags, and the other items are offered
the new item's (STY-037 S3)

### S4: Welsh and assistive technology

**Given** the interface is in Welsh, or Sam uses a screen reader
**When** the publish dialog lists a new item
**Then** its marker is in Welsh and is read with the item's title; axe finds nothing
in the dialog

## Decisions

- **D1** (owner, 2026-11-14, items round 3 Q3, confirming the agent's choices): a new
  item is listed under "What changes" and can never conflict with a co-lead.
- **D2** (owner, round 3 Q1): a roadmap is empty to the public when no item is in a
  horizon or section; a pending new item in one counts, since "Save and publish"
  writes it. S2.
- **D3** (agent, 2026-11-14, owner asked for stories that fit one agent's context):
  cut from STY-046, over one story of eleven scenarios across the page, the list and
  the publish dialog.

## Out of scope

- Adding, editing and removing a new item: STY-046. Its write: STY-045.
