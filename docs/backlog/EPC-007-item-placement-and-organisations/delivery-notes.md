# EPC-007 delivery notes

- A pending item field is one `FieldChange` string; placement is its ID, `""` while
  unplaced (`itemValue` in `roadmap-changes.ts`). Organisations extend the same model,
  as one string that compares as a set, not a second change type.
- A change that moves an item to another placement remounts its card in another list,
  so focus is handed over by `RoadmapItems` (`onFocusRequest`), never by a ref on the
  old card, and a card with its form open is held in its list (`onHold`) until the form
  closes.
- `findEditedItem` compares every non-editable item part: a new editable field needs its
  own case there, and in `applyItemChanges` and `withFieldOf` (`pending-changes.ts`).
