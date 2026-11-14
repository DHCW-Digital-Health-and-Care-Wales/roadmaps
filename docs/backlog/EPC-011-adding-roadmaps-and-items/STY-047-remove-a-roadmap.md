# STY-047: A Product Lead removes a roadmap

- **Status**: Needs grilling — the owner asked for the record on 2026-11-14 (STY-040
  grilling, round 1 Q10); nothing is decided
- **Type**: Feature
- **Area**: to be decided
- **Epic**: [EPC-011-adding-roadmaps-and-items](README.md)
- **Depends on**: STY-040 (preferred order)
- **Binding ADRs**: ADR-009, ADR-011, ADR-012
- **Suggested model**: Opus — a destructive write to data shared with the public site

## Summary

A roadmap added by mistake, or no longer wanted, can only be removed in the
spreadsheet: its row in the roadmap list and its tab of items. This story would let a
Product Lead remove one from the editor. It is recorded so the gap left by adding
roadmaps is not lost; what removing means, and whether anything is kept, is for the
owner.

## Open questions

- **Q1**: What does removing a roadmap do to its items? _Sam removes "Community
  Nursing", added by mistake with the wrong short name._
  - (a) Removes its entry and its items for good (recommended for a roadmap that was
    never published) — two things deleted in one write; nothing to restore from.
  - (b) Removes its entry and keeps its items' tab — the roadmap leaves both apps;
    a tab nothing lists is left in the spreadsheet.
  - (c) Only hides it from the editor's list — nothing is deleted; needs a new
    stored state the public site must also ignore.
- **Q2**: May a published roadmap be removed? _Sam chooses Remove on "Outpatient
  Booking", which the public site shows._
  - (a) Not until it is unpublished (recommended) — one deliberate step before the
    destructive one.
  - (b) Yes, after a confirmation that names it as public — it leaves the public site
    at its next nightly update.
- **Q3**: What happens to pending edits to a roadmap being removed, Sam's or a
  co-lead's?
  - (a) Sam's are discarded with a warning; a co-lead finds the roadmap gone, as when
    a row is deleted today (recommended).
  - (b) Removing is refused while Sam has pending edits to it.
- **Q4**: Where is the action, and how is it confirmed?
  - (a) On the roadmap's page, confirmed by typing its title (recommended).
  - (b) On the roadmap's page, with a plain confirmation.

## Rough shape of the work

Not acceptance criteria. A repository call that removes a roadmap after a re-read,
refused when the roadmap has changed since the page read it; the action and its
confirmation; README _What the editor writes_ and an ADR-012 amendment.
