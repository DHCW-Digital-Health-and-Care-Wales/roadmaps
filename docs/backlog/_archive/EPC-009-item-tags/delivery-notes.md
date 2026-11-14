# EPC-009 delivery notes

What agents delivering or reviewing this epic's stories needed; see `docs/AGENTS.md`.
The epic is closed (STY-037): its notes on the frame the open controls take to leave the
page and on the focus tour moved to `OpeningField`'s docblock and `tests/e2e/AGENTS.md`.

- **A field that opens on request is `OpeningField`**
  (`features/roadmaps/editing/opening-field.tsx`); its props are in STY-038's _Contract
  for dependents_. It holds only whether it is open: keep what its controls change in
  the form's own values, and pass `onShut` for anything shutting must keep that the
  controls have not yet handed over. Give `focusOnOpen` to a control that stays while
  the field is open: it takes focus whenever it is first drawn. The button's words are
  shared (`roadmaps.edit.openingField`); a field adds its own `subject` and `none`.
