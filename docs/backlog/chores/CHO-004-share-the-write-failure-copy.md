# CHO-004: One write-failure message map serves every write

- **Status**: Proposed — found delivering STY-030; the owner may want to pay the cost
- **Type**: Refactor
- **Area**: i18n (en + cy) + Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-008
- **Suggested model**: Sonnet — a mechanical merge of catalogue keys
- **Delivered**: _(add on delivery)_

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

## Out of scope

- Changing any message's wording.
