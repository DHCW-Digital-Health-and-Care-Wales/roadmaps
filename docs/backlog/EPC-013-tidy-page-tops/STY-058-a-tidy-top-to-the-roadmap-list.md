# STY-058: A Product Lead sees a tidy top to the roadmap list

- **Status**: Proposed — the owner accepted the page headers UX analysis's decisions
  4, 5 and 9 on 2026-11-18
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-013-tidy-page-tops](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-010, ADR-008
- **Suggested model**: Sonnet — a layout change on two pages with copy removed, no
  new behaviour

## Summary

The top of the roadmap list stacks a title, a line of filler, a link the navigation
already holds, the count, then Refresh before Add a roadmap, each on its own edge. This
story leaves the title, the count, then Add a roadmap and Refresh on one row, and drops
the filler and the families link. The families page loses its "Back to roadmaps" link,
since the header and the navigation lead to the list. The roadmap's page loses its own
in STY-059.

## Acceptance criteria

### S1: The list's top is a title, a count and one row of actions

**Given** the roadmap list with 29 roadmaps, 7 not published
**When** the Product Lead opens it, on a phone, an iPad or a desktop
**Then** they see "Your roadmaps", then "29 roadmaps, 7 not published", then Add a
roadmap and Refresh on one row, on one left edge, then the first family's heading
**And** Add a roadmap is as wide as its label, not the page's width

### S2: The filler and the families link go

**Given** the roadmap list
**When** it opens
**Then** neither "Every roadmap, published or not." nor the "Families, categories and
organisations" link shows under the title
**And** the navigation still leads to the families page, on a phone from its drawer

### S3: Refresh on a phone is an icon

**Given** a 375px phone
**When** the list opens
**Then** Refresh is an icon button named "Refresh" (its Cymraeg name in Cymraeg),
beside Add a roadmap, the same 40px height
**And** from 640px it shows its label

### S4: The families page has no back link

**Given** the families page
**When** it opens
**Then** it starts with its title, with no "Back to roadmaps" link
**And** the header's service name and the navigation's "All roadmaps" lead to the list

### S5: Welsh, keyboard and states

**Given** the list in Cymraeg at 375px, or a keyboard alone
**When** the Product Lead uses its top
**Then** Add a roadmap and Refresh fit on one row with no sideways scroll, and Tab
reaches Add a roadmap, then Refresh, then the first roadmap
**And** the list's loading, empty and error states keep their present behaviour under
the title

## Decisions

- **D1** (owner, 2026-11-18, page headers UX analysis decision 4 (a)): the list's top
  drops "Every roadmap, published or not." and its families link, which the navigation
  holds (STY-054). Changes STY-054's departure "'Back to roadmaps' and the list's link
  to the families page stay".
- **D2** (owner, 2026-11-18, analysis decision 5 (a)): no back link on any width, here
  on the families page and on a roadmap's page (STY-059).
- **D3** (owner, 2026-11-18, analysis decision 9 (a)): Refresh is an icon button named
  "Refresh" on a phone, labelled from 640px.
- **D4** (owner, 2026-11-18, analysis decision 1 (a)): design G of the analysis's
  prototype, its "Your roadmaps" frames.

## Out of scope

- A roadmap's page: STY-059 and STY-060.
- The cards and their grouping by family: unchanged.
