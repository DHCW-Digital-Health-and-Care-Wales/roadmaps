# CHO-004: One write-failure message map serves every write

- **Status**: Done — in its PR, awaiting merge
- **Type**: Refactor
- **Area**: i18n (en + cy) + Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-008
- **Suggested model**: Sonnet — a mechanical merge of catalogue keys
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/101

## Summary

Four `satisfies Record<AppErrorKind, string>` maps in `en.ts` and `cy.ts` carry the same
eight write-failure messages: publishing, families, "Make it match" and the roadmap
list's own. Seven of the eight strings are word for word the same; only `forbidden`
and `invalid-data` name what is being changed. Every wording change is four edits in two
languages. Done looks like: one map, with the noun passed in where it differs.

## Measurement

At commit `e0d18b4`: `rg -n "satisfies Record<AppErrorKind" src/i18n/locales/en.ts`
lists the maps; a diff of their values shows which keys differ.

## Acceptance criteria

### S1: A wording change to a write failure is one edit per language

**Given** the four write-failure surfaces
**When** a message such as `network` is reworded
**Then** it is edited once in `en.ts` and once in `cy.ts`, and every surface shows it

## Decisions

- **D1** (agent, 2026-11-14, delivering STY-041): adding a roadmap brought a fifth
  map, `roadmaps.add.failed.errors`, whose `unauthenticated`, `forbidden` and
  `invalid-data` differ. The measurement's command lists it.

## Out of scope

- Changing any message's wording.

## Delivery

### Departures

- **Four write maps, one more than the record's list had** (D1): publishing,
  families, "Make it match" and adding a roadmap. The roadmap list's read
  failures (`errors.*`) are a fifth set of messages, about reading: four of its
  eight differ in wording, so they stay as they are.
- **`roadmaps.writeFailure` holds the eight messages once.** `forbidden` takes
  `{{action}}` (`writeFailure.action.*`: "change roadmaps", "change this roadmap",
  "change families", "add roadmaps"). Publishing's `not-found` and `invalid-data`
  and adding's `unauthenticated` and `invalid-data` are worded differently, not
  only by a noun, so each stays beside the map as `writeFailure.publish.*` and
  `writeFailure.add.*`. Welsh `invalid-data` differs by gender ("ei gwirio" for the
  list, "ei wirio" for a roadmap), so it is not a noun slot either.
- **No wording change**: all 64 messages (four surfaces × eight kinds × two
  languages) were compared with the previous catalogues in a throwaway test, removed
  after it passed.

### Contract for dependents

- A write's failure message is `writeFailureMessage(t, subject, error.kind)`
  (`src/features/roadmaps/write-failure-message.ts`), with `subject` one of
  `"lists" | "publish" | "families" | "add"`. A new write adds a subject to
  `writeFailure.action` in both catalogues, and a message of its own beside
  `writeFailure.publish` only when the shared wording doesn't fit.

### Scenario evidence

| Scenario | Evidence                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `rg -n "satisfies Record<AppErrorKind" src/i18n/locales/en.ts` lists the read map only; rewording `network` in `writeFailure` changes all four surfaces; the 64-message comparison above |
