# STY-058: A Product Lead sees a tidy top to the roadmap list

- **Status**: Done — the roadmap list opens on a title, a count and one row of
  actions; the families page has no back link (D1–D4)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-013-tidy-page-tops](../../EPC-013-tidy-page-tops/README.md)
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

## Delivery

### Departures

- **Refresh is an icon button on the families page too** (agent, D3): the list and the
  families page share `RefreshButton`, so below 640px both show the icon; the families
  page's layout is otherwise as before, minus its back link. One component, one
  behaviour, rather than a prop for the list alone.
- **`BackLink` stays** (agent, D2): a roadmap's page still uses it until STY-059.

### Contract for dependents

- **`RefreshButton`** (`features/roadmaps/components/`) is a 40px square below 640px
  (`max-sm:`), its label `sr-only` there, so its accessible name is "Refresh"
  (Adnewyddu) at every width.
- **Catalogue**: `roadmaps.description` ("Every roadmap, published or not.") is gone, in
  both languages. `roadmaps.familiesLink` stays: the navigation uses it.
- **E2E hooks**: the families page is reached from the navigation
  (`getByRole("navigation")`), not from `main`; the list's Tab order is Add a roadmap,
  Refresh, then the first roadmap.
- **Data source**: nothing written changes.

### Scenario evidence

`rp` is `src/features/roadmaps/pages/roadmaps-page.test.tsx`; `fp` is
`families-page.test.tsx`; `e2e` names a spec in `tests/e2e/`.

| Scenario | Held by                                                                                                                                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | e2e `roadmaps.spec.ts` "stacks the title, the count and one row of actions on one left edge at …px" (375, 640, 820, 1024, 1280); `structure.spec.ts` `main-roadmaps` snapshots (order: Add, Refresh)                                                  |
| S2       | `rp` "lists the roadmaps as cards…" (no filler, no families link in `main`); `fp` "is linked from the navigation, not from the roadmap list"; e2e `families.spec.ts` reaches the page from the navigation                                             |
| S3       | e2e `roadmaps.spec.ts` "Refresh is a 40px icon button named Refresh on a phone, labelled from 640px"                                                                                                                                                  |
| S4       | `fp` "starts with its title, with no back link"                                                                                                                                                                                                       |
| S5       | `rp` "puts Add a roadmap, then Refresh, then the first roadmap in the Tab order"; e2e `roadmaps.spec.ts` "in Cymraeg at 375px …"; the loading, empty, error and expired states: `structure.spec.ts` snapshots, unchanged apart from the removed lines |

The Tab-order component test was shown red by putting Refresh before Add; the S3 spec by
removing the label's `max-sm:sr-only` (the label then drew, a 40px-wide button
overflowing). Both followed working code.
