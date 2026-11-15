# CHO-001: A pending family or category choice carries the name its row was linked by

- **Status**: Won't do — owner, 2026-11-15 (D1); archived
- **Type**: Refactor
- **Area**: Domain + Features/UI
- **Epic**: standalone
- **Depends on**: STY-028
- **Binding ADRs**: ADR-012, ADR-013
- **Suggested model**: Opus — it changes the pending-edit shape and the conflict base in `publish-plan.ts`
- **Delivered**: _(add on delivery)_

## Summary

STY-028 links a roadmap to its family and category by ID, and a pending choice keeps
only the ID. A row linked only by name (no `Family ID` or `Category ID` yet: every row
until its first publish under STY-028) is refused as a conflict if that family or
category is renamed in its list between the choice and the publish. The review shows
"Family isn't listed" (or "No category") as current, and "Keep mine" publishes the
choice. The window closes for good once a publish links the row's IDs (STY-028 S4).

Done means a rename in that window is no conflict: each pending choice carries the name
its row was linked by, so the plan can tell a rename from a co-lead's move. A co-lead's
move to another family stays a conflict. Raised by Opus and Sol in review, and by the
Codex bot on `src/domain/roadmap/publish-plan.ts`.

## Measurement

_At commit `070d893`._ Affects only a name-linked row, only when a family or category
is renamed between the choice and the first publish of that row. Found by review, not
measured in use; before starting, check how many rows in the live spreadsheet still lack
a `Family ID` or `Category ID`: if none, close it as Won't do.

## Acceptance criteria

### S1: A rename before the first publish is not a conflict

**Given** a roadmap linked to a family only by name, with a pending choice of another family
**When** someone renames the family the row was linked by before the publish
**Then** the publish writes the choice with no conflict

### S2: A co-lead's move is still a conflict

**Given** the same pending choice
**When** a co-lead moves the roadmap to a third family before the publish
**Then** it is a conflict, shown and resolved as ADR-012's conflicts are

### S3: Categories behave the same

**Given** a roadmap linked to a category only by name
**When** the category is renamed before a publish of a pending category choice
**Then** the publish writes the choice with no conflict

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): Won't do. The window closes for good as each row's first publish links its IDs, and "Keep mine" resolves a refusal in it. Reopen if rows without a `Family ID` or `Category ID` are seen refused after a rename.

## Out of scope

- Changing what the editor writes to the data source.
