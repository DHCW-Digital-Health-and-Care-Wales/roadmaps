# STY-033: The organisations are listed with families and categories

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: [EPC-007-item-placement-and-organisations](../../EPC-007-item-placement-and-organisations/README.md)
- **Depends on**: STY-032 (hard)
- **Binding ADRs**: ADR-014 §Organisations, ADR-013, ADR-008
- **Suggested model**: Sonnet — a read-only section beside the categories section
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/47

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
(National)"), then alphabetical by full name
**And** the section says they can't be changed here, and offers no control to change
them

### S3: Welsh full names (round 4 Q24)

**Given** the Welsh interface
**When** the section shows
**Then** each full name is in Welsh ("Bwrdd Iechyd Prifysgol Caerdydd a’r Fro
(CAVUHB)"), with the same codes, sorted by the Welsh names: "Cymru gyfan (National)",
then "Addysg a Gwella Iechyd Cymru (HEIW)", then the "Bwrdd Iechyd…" names

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
- **D4** (owner, round 4 Q25, and its follow-up): All Wales first, then alphabetical
  by the full name shown, Welsh on the Welsh interface → S2, S3. The screen sorts
  (STY-032 D5).

## Starting point

Audited at `5546d47`. The categories section (`families/categories-section.tsx`) and the
page's combined loading over its queries (`families-page.tsx`) are the pattern; the page
title and link keys are `roadmaps.families.title` and `familiesLink`. Order the list
with STY-032's shared sort (D7).

## Out of scope

- Adding, renaming or removing an organisation: EPC-007 _Out of scope_.

## Delivery

### What the data source receives

Nothing: this story only reads and shows, so README _What the editor writes_ is
unchanged (its one mention of the page now uses the new name).

### Departures

- **The page's description and loading, failure and connect copy name organisations too**
  (agent): S1 names only the link and the title; the other strings that said "families and
  categories" (`description`, `connectPrompt`, `loading`, `loadFailed`, `refreshFailed`)
  now say "families, categories and organisations", so the page doesn't contradict its
  title. Each entry is the `roadmaps.families.organisations.entry` string
  (`{{name}} ({{code}})`), so Welsh could order it differently.
- **The organisation list is read beside the page's other queries** (agent, S5): the page
  shows its loading panel until all four reads are in, and its failure panel or alert, with
  Refresh, when any fails, as it already did for the categories. No new loading or failure
  state.
- **Tests.** The page tests were written first and seen to fail (7 of 20) before the
  section and copy existed; the E2E assertion followed working code.

### Contract for dependents

- `OrganisationsSection` (`features/roadmaps/families/organisations-section.tsx`) takes
  `organisations` and sorts them with `sortOrganisations` by the full name in the
  interface's language; `FamiliesPage` reads the list through `useOrganisations()`.
- **Welsh to review**: `familiesLink`; `roadmaps.families` `title`, `description`,
  `connectPrompt`, `loading`, `loadFailed`, `refreshFailed`; and
  `roadmaps.families.organisations` (`heading` "Sefydliadau", `description`, `entry`,
  `none`). The Welsh full names are data from the public site, unreviewed (STY-032).

### Scenario evidence

| Scenario | Held by                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `families-page.test.tsx` ("is linked from the roadmap list", "asks to connect…"); `families.spec.ts`; the `structure.spec.ts` snapshots, English and Welsh           |
| S2       | `families-page.test.tsx` ("lists each by full name and code, All Wales first…", with no button, textbox or checkbox in the section); `families.spec.ts` (all twelve) |
| S3       | `families-page.test.tsx` ("shows the Welsh full names, sorted as Welsh")                                                                                             |
| S4       | `families-page.test.tsx` ("says none are listed when the list is empty")                                                                                             |
| S5       | `families-page.test.tsx` ("shows the page's loading state…", "shows the page's failure state, and Refresh reads again")                                              |
