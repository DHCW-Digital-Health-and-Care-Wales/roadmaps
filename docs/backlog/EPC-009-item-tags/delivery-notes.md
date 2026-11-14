# EPC-009 delivery notes

What agents delivering or reviewing this epic's stories need; see `docs/AGENTS.md`.

- **A field that opens on request is `OpeningField`**
  (`features/roadmaps/editing/opening-field.tsx`); its props are in STY-038's _Contract
  for dependents_. It holds only whether it is open: keep what its controls change in
  the form's own values, and pass `onShut` for anything shutting must keep that the
  controls have not yet handed over. Give `focusOnOpen` to a control that stays while
  the field is open: it takes focus whenever it is first drawn. The button's words are
  shared (`roadmaps.edit.openingField`); a field adds its own `subject` and `none`.
- **The open controls leave the page a frame after the field is shut** (Base UI's
  Collapsible waits for its animations): a component test awaits their removal
  (`vi.waitFor`), where the line of what the field holds shows at once.
- **The focus tour of the editing page opens the Organisations field**
  (`focus-indicator.spec.ts`), so its checkboxes stay toured; a new field that opens on
  request is opened there too.
