# STY-032: Organisations come from the repository, shown by name

- **Status**: Done — delivered in its PR, which awaits the owner's merge
- **Type**: Feature + Refactor + Docs
- **Area**: Domain + Infrastructure + Features/UI + Docs
- **Epic**: [EPC-007-item-placement-and-organisations](../../EPC-007-item-placement-and-organisations/README.md)
- **Depends on**: none; delivered after STY-031, in the owner's order (round 3 Q22)
- **Binding ADRs**: ADR-014 §Organisations, ADR-011, ADR-002
- **Suggested model**: Sonnet — a new list read beside the families and categories
  reads, and a type change through its callers
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/46

## Summary

An item card shows who the work is for by short name ("Cardiff and Vale, Swansea Bay")
instead of codes. The organisations now come from the repository, as families and
categories do, so the database that replaces Sheets can serve them from its own table
without touching the screens. In Sheets the list stays built in: no new tab. Choosing an
item's organisations is STY-034; listing them in full is STY-033.

## Acceptance criteria

### S1: The card shows short names (round 3 Q20, Q21)

**Given** an item whose `Organisations` cell reads `SBUHB, National, CAVUHB`
**When** its card shows
**Then** it reads "All Wales, Cardiff and Vale, Swansea Bay": the national one first,
then alphabetical by short name
**And** the Welsh interface shows the same English short names (round 1 Q7)

### S2: The repository serves the list (round 2 Q13, round 3 Q19)

**Given** a connected Product Lead
**When** the repository's organisation list is read
**Then** it holds each organisation's id, code, short name and full name in English and
Welsh, and whether it is national (All Wales only), in no promised order
**And** the Sheets adapter returns its built-in twelve (round 2 Q14 names their short
names), with ids `national`, `abuhb`… as today, without a request

### S3: Items name their organisations by id

**Given** an `Organisations` cell of `c.a.v.u.h.b` and `CAVHB`
**When** the roadmap is read
**Then** the item's organisations are the id `cavuhb` only, matched as headers are
**And** `CAVHB` is recorded as an unknown code, as today, and kept on the item as
written for STY-034's warning (EPC-007 F4); the card doesn't show it, as the public
site doesn't

### S4: The screens follow the repository's list

**Given** a repository whose list holds a thirteenth organisation, and serves the list
in another order
**When** an item naming it shows
**Then** the card shows its short name in the same sorted place, with no code change in
`features/`

### S5: The list's absence is a load failure

**Given** the organisation list cannot be read (a future API's failure)
**When** a roadmap's page opens
**Then** it shows the page's existing load failure, with Refresh, as for its other reads

### S6: The replacement guide names the list

**Given** `docs/operations/replacing-google-sheets.md`
**When** this story is delivered
**Then** it says `listOrganisations` returns the organisations table, with its `national`
column, in any order, and
items link to it by `organisationIds` through a join table (ADR-014)

## Decisions

- **D1** (owner, 2026-11-13, EPC-007 grilling round 2 Q13): keep the list in code, but
  behind the repository, so the database's list reaches the screens without a change;
  no `Organisations` tab → S2, S4.
- **D2** (owner, round 2 Q14): short names are All Wales, Aneurin Bevan, Betsi
  Cadwaladr, Cardiff and Vale, Cwm Taf Morgannwg, Hywel Dda, Powys, Swansea Bay,
  Velindre, Welsh Ambulance, Public Health Wales, Health Education and Improvement
  Wales → S2.
- **D3** (owner, round 2 Q15, round 3 Q20, Q21): the card shows short names, comma
  separated, All Wales first then alphabetical → S1.
- **D4** (agent, round 3 Q19 left to the agent): `Organisation { id, code, shortName,
name, national }` on `RoadmapRepository`, items carrying `organisationIds`, over a separate
  port or a fixed union, as it maps to a table and a join table with no rework → S2–S4.
- **D5** (owner, 2026-11-13, round 4, after Q25, on the agent's advice): the screen
  sorts, national first then alphabetical by the label shown in the interface's
  language; the repository flags national organisations and promises no order → S1, S2,
  S4. Replaces this record's first draft, where the repository served one order.
- **D6** (agent): All Wales's full name is "All Wales" ("Cymru gyfan"), over the public
  site's "All Wales (national)", since STY-033 shows it beside its code, `National`.
- **D7** (agent): one shared sort in `features/` serves the card, STY-033's list and
  STY-034's checkboxes: national first, then an `Intl.Collator` in the interface's
  language over the label that screen shows, as `group-roadmaps.ts` sorts roadmaps → S1,
  S4.

## Starting point

Audited at `5546d47`. `ORGANISATIONS` (domain) and `organisationCodes` (features) are
the two constants to retire from `features/` (EPC-007 F3); the parser maps codes in
`roadmap-tab-parser.ts`. The families and categories reads (STY-027) are the pattern
for the query, its keys and its auth scoping. The full names, English and Welsh, are in
`docs/analysis/roadmap-tab-format.md`, _Organisations_.

## Out of scope

- Listing the organisations: STY-033. Choosing them: STY-034.
- An `Organisations` tab, or managing the list: EPC-007 _Out of scope_.

## Delivery

### What the data source receives

Nothing new: this story changes what the editor reads and shows, not what it writes, so
README _What the editor writes_ is unchanged. The Sheets adapter requests nothing for
the list (no `Organisations` tab).

### Departures

- **An item keeps its unknown codes in `unknownOrganisationCodes`** (agent): S3 says "kept
  on the item as written" without naming the field. `RoadmapItem.unknownOrganisationCodes`
  holds them as written, in the order written, no exact repeats, and STY-034 reads it for
  its warning. The parser still records `unknown-organisation` for each, as before.
- **The Sheets adapter orders `organisationIds` as the built-in list does** (agent), the
  public site's order the old `ORGANISATIONS` gave, however the cell orders them, so a
  co-lead's reordering of the cell is no content change to `findEditedItem`. The domain
  promises no order.
- **The items area reads the list with the items** (agent, S5): a roadmap's items show
  once both reads are in; a failed list read shows the page's items failure (its panel
  with Retry, or the alert above kept items), and Retry reads again only the read that
  failed. The page's Refresh reads the list too.
- **`RoadmapItemCard` and `EditableItemCard` take `organisations` as a prop** (agent),
  from `RoadmapItems`, so the card stays a plain component and the page alone reads the
  query.
- **The in-memory double and tests serve `TEST_ORGANISATIONS`** (agent): seven
  organisations with the real ids, codes and names (the ones tests name), not the twelve,
  which only the Sheets adapter holds. An `organisations` option replaces it, or fails
  the read with an `AppError`.
- **Tests.** The parser and Sheets adapter tests were updated with the code; the contract
  tests, `sort-organisations` and the page tests were written after the code, not before.
  Their discrimination was shown by breaking the finished card (leaving out the sort
  failed S1, S4 and the Retry test), which proves the tests discriminate, not that they
  came first.

### Contract for dependents

- **Domain**: `Organisation { id, code, shortName, name: LocalisedText, national }`
  (`organisation.ts`; `ORGANISATIONS` is gone). `RoadmapRepository.listOrganisations()`
  returns them in no promised order. `RoadmapItem.organisationIds` (ids the list holds)
  and `unknownOrganisationCodes` replace `organisations`; `findEditedItem` compares both
  as non-editable parts, so STY-034 gives organisations a case there, in
  `applyItemChanges` and `withFieldOf`, and moves them out of `CONTENT` as STY-031 did
  for placement.
- **Sheets adapter**: `BUILT_IN_ORGANISATIONS` (`built-in-organisations.ts`), the twelve,
  full names English and Welsh from `docs/analysis/roadmap-tab-format.md`, All Wales's
  being "All Wales" / "Cymru gyfan" (D6); `listOrganisations` answers without a request.
  The parser maps a cell's codes to ids (`ORGANISATION_IDS_BY_KEY`), matching as headers
  match.
- **Features**: `organisationListQueryOptions` and `roadmapKeys.organisations()`
  (`roadmap-queries.ts`); `useOrganisations()` (`hooks/use-organisations.ts`), fetched
  while connected; `sortOrganisations(organisations, label, language)`
  (`sort-organisations.ts`), national first then an `Intl.Collator` over the label a
  screen shows, which STY-033 (full names) and STY-034 (short names with codes) reuse.
  `organisationCodes` is gone.
- **Tests**: `TEST_ORGANISATIONS` (`domain/roadmap/testing/test-organisations.ts`); the
  in-memory double's `organisations` option.
- **Welsh to review**: no catalogue string changed. The organisations' Welsh full names
  are data from the public site, first shown by STY-033.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `roadmap-detail-page-organisations.test.tsx` ("shows short names, the national one first then alphabetical"; "shows the same English short names on the Welsh interface"); `sort-organisations.test.ts`; `roadmap-page.spec.ts` and `detail.aria.yml` (`Cardiff and Vale, Swansea Bay`); screenshots        |
| S2       | the shared contract ("lists the organisations as plain data…") on the Sheets adapter and the in-memory double; the Sheets adapter's "serves the built-in twelve organisations, by short name, without a request"                                                                                            |
| S3       | `roadmap-tab-parser.test.ts` ("holds `c.a.v.u.h.b` as cavuhb and `CAVHB` as an unknown code, kept as written", "names known organisations by id…"); contract "names, for every item, only organisations the list holds"; page "does not show an organisation id the list doesn't hold, nor an unknown code" |
| S4       | page "shows a thirteenth organisation by its short name in its sorted place, whatever order the list is served in" (a list served reversed with a thirteenth entry, no `features/` code naming any organisation)                                                                                            |
| S5       | page "when the list can't be read": "shows the page's load failure with Retry, and no items, until the list is read", "fails with the list's error kind…"; "reads the list again on Refresh"                                                                                                                |
| S6       | `docs/operations/replacing-google-sheets.md`, step 1                                                                                                                                                                                                                                                        |
