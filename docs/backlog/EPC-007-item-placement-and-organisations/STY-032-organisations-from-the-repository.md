# STY-032: Organisations come from the repository, shown by name

- **Status**: Proposed — grilled in EPC-007 rounds 1–3 (2026-11-13)
- **Type**: Feature + Refactor + Docs
- **Area**: Domain + Infrastructure + Features/UI + Docs
- **Epic**: EPC-007-item-placement-and-organisations
- **Depends on**: none (STY-031 preferred first)
- **Binding ADRs**: ADR-014 §Organisations, ADR-011, ADR-002
- **Suggested model**: Sonnet — a new list read beside the families and categories
  reads, and a type change through its callers

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
**Then** it reads "All Wales, Cardiff and Vale, Swansea Bay": All Wales first, then
alphabetical
**And** the Welsh interface shows the same English short names (round 1 Q7)

### S2: The repository serves the list (round 2 Q13, round 3 Q19)

**Given** a connected Product Lead
**When** the repository's organisation list is read
**Then** it holds each organisation's id, code, short name and full name in English and
Welsh, in display order: All Wales first, then alphabetical by English name
**And** the Sheets adapter returns its built-in twelve (round 2 Q14 names their short
names), with ids `national`, `abuhb`… as today, without a request

### S3: Items name their organisations by id

**Given** an `Organisations` cell of `c.a.v.u.h.b` and `CAVHB`
**When** the roadmap is read
**Then** the item's organisations are the id `cavuhb` only, matched as headers are
**And** `CAVHB` is recorded as an unknown code, as today, and kept on the item as
written for STY-034's warning (EPC-007 F4)

### S4: The screens follow the repository's list

**Given** a repository whose list holds a thirteenth organisation, or a different order
**When** an item naming it shows
**Then** the card shows its short name, in the list's order, with no code change in
`features/`

### S5: The list's absence is a load failure

**Given** the organisation list cannot be read (a future API's failure)
**When** a roadmap's page opens
**Then** it shows the page's existing load failure, with Refresh, as for its other reads

### S6: The replacement guide names the list

**Given** `docs/operations/replacing-google-sheets.md`
**When** this story is delivered
**Then** it says `listOrganisations` returns the organisations table in its order, and
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
  separated, in the list's order → S1.
- **D4** (agent, round 3 Q19 left to the agent): `Organisation { id, code, shortName,
name }` on `RoadmapRepository`, items carrying `organisationIds`, over a separate
  port or a fixed union, as it maps to a table and a join table with no rework → S2–S4.
- **D5** (agent): one order in both languages, set by the repository, over sorting by
  the Welsh name on the Welsh interface: the owner asked for All Wales first then
  alphabetical, and one order keeps card, form and page alike.
- **D6** (agent): All Wales's full name is "All Wales" ("Cymru gyfan"), over the public
  site's "All Wales (national)", since STY-033 shows it beside its code, `National`.

## Starting point

Audited at `5546d47`. `ORGANISATIONS` (domain) and `organisationCodes` (features) are
the two constants to retire from `features/` (EPC-007 F3); the parser maps codes in
`roadmap-tab-parser.ts`. The families and categories reads (STY-027) are the pattern
for the query, its keys and its auth scoping. The full names, English and Welsh, are in
`docs/analysis/roadmap-tab-format.md`, _Organisations_.

## Out of scope

- Listing the organisations: STY-033. Choosing them: STY-034.
- An `Organisations` tab, or managing the list: EPC-007 _Out of scope_.
