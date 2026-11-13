# STY-033: The organisations are listed with families and categories

- **Status**: Proposed — added by the owner in EPC-007 grilling, round 4 (2026-11-13)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: EPC-007-item-placement-and-organisations
- **Depends on**: STY-032 (hard)
- **Binding ADRs**: ADR-014 §Organisations, ADR-013, ADR-008
- **Suggested model**: Sonnet — a read-only section beside the categories section

## Summary

A Product Lead can see which organisations an item may name, with each one's full name
and code, on the page that already lists families and categories, renamed "Families,
categories and organisations". The list is read-only, as categories are: it can't be
changed here.

## Acceptance criteria

### S1: The page and its link are renamed (round 4 Q23)

**Given** the roadmap list
**When** Sam follows its link to the families and categories page
**Then** the link and the page's title name families, categories and organisations, in
English and Welsh

### S2: Organisations are listed by full name and code (round 4 Q25)

**Given** the page, with the organisations read
**When** it shows
**Then** an "Organisations" section after Categories lists each as its full name and
code, "Cardiff and Vale University Health Board (CAVUHB)", All Wales first ("All Wales
(National)"), then the rest in the list's order
**And** the section says they can't be changed here, and offers no control to change
them

### S3: Welsh full names (round 4 Q24)

**Given** the Welsh interface
**When** the section shows
**Then** each full name is in Welsh ("Bwrdd Iechyd Prifysgol Caerdydd a’r Fro
(CAVUHB)"), with the same codes, in the same order

### S4: No organisations

**Given** the repository's list is empty
**When** the section shows
**Then** it says no organisations are listed

### S5: Loading and failure follow the page

**Given** the page while the organisation list is read, or when it can't be
**When** it shows
**Then** it shows the page's existing loading and failure states, with Refresh

## Decisions

- **D1** (owner, 2026-11-13, EPC-007 grilling, after round 3): add a read-only list of
  the organisations, with full name and code, as categories are listed → this record.
- **D2** (owner, round 4 Q23): on the families and categories page, renamed, not a page
  of its own → S1, S2.
- **D3** (owner, round 4 Q24): Welsh full names on the Welsh interface → S3.
- **D4** (owner, round 4 Q25): All Wales first, then alphabetical → S2. The Welsh page
  keeps the English order by the agent's STY-032 D5, not this answer → S3.

## Starting point

Audited at `5546d47`. The categories section (`families/categories-section.tsx`) and the
page's combined loading over its queries (`families-page.tsx`) are the pattern; the page
title and link keys are `roadmaps.families.title` and `familiesLink`.

## Out of scope

- Adding, renaming or removing an organisation: EPC-007 _Out of scope_.
