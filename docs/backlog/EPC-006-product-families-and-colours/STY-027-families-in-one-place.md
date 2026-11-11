# STY-027: Families and their colours are managed in one place

- **Status**: Needs grilling — the owner asked for this record (EPC-005 grilling Q11);
  where families live and who changes them are open
- **Type**: Feature
- **Area**: TBD after grilling (likely Domain + Infrastructure + Features/UI + i18n)
- **Epic**: EPC-006-product-families-and-colours
- **Depends on**: EPC-005 (preferred order: it builds the write path this reuses)
- **Binding ADRs**: ADR-009, ADR-012
- **Suggested model**: Opus — it changes the data source's contract with the public site

## Summary

Today each roadmap names its own family and colour, so one family can appear under two
spellings or two colours. A Product Lead, or whoever owns families, should define each
family and its colour once, and a roadmap should only choose its family. This may change
what the public site reads, so the owner decides the shape first. It may also be the
place for other fields that belong centrally rather than to one roadmap.

## Open questions

- **Q1**: Where is a family and its colour defined?
  Example: Single Record is navy; a Product Lead puts a new roadmap in Single Record and
  it is navy without anyone typing a colour.
  - (a) A new families tab in the same spreadsheet, one row per family with its English
    and Welsh names and colour (recommended) — the editor writes it; the public site
    must learn to read it, or the editor keeps every roadmap's `Family` and `Colour`
    cells in step with it.
  - (b) Keep per-row cells, and the editor makes them agree: choosing a family sets the
    colour from the family's other roadmaps — no format change; the sheet can still
    disagree when edited by hand.
  - (c) A fixed list in the app's code — no data change; a new family needs a release.
- **Q2**: Who may add, rename or recolour a family?
  Example: a Product Lead renames "Medicines & Diagnostics", and every roadmap in it
  moves with it.
  - (a) Anyone connected, with a confirmation naming every roadmap affected
    (recommended) — matches ADR-012's "Edit for everyone"; risk of one lead changing
    another's grouping.
  - (b) Only a named group (a central admin) — needs a notion of roles the app lacks.
- **Q3**: What happens to the per-roadmap `Family` and `Colour` cells the public site
  reads?
  - (a) The editor keeps writing them, copied from the family, until the public site
    reads the families tab (recommended) — no break for the public site; two sources
    for a while.
  - (b) They are dropped once the public site reads the families tab — one source; the
    two apps must ship together.
- **Q4**: What is done about roadmaps that disagree today?
  - (a) The editor lists the disagreements and lets someone pick one name and colour per
    family (recommended) — a one-off clean-up screen.
  - (b) The first roadmap in the list wins silently — fast; hides a choice someone made.
- **Q5**: Which other fields are central rather than per roadmap?
  Example: category names are the public site's fixed list; a Product Lead cannot invent
  one.
  - (a) Family and colour only, for now (recommended) — category stays read-only as in
    EPC-005.
  - (b) Category too — the list moves into the data source.

## Decisions

- **D1** (owner, 2026-11-11, EPC-005 grilling Q11): family is not editable in EPC-005,
  because family and colour belong together and the sheet sets each per roadmap → this
  record.
