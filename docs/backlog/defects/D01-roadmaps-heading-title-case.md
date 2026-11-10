# D01: The roadmaps heading is in Title Case, against the sentence-case rule

- **Status**: Needs triage — found while adapting the copywriter skill
- **Severity**: Low — a style inconsistency on the main screen, in both languages
- **Area**: i18n (en + cy) + E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-0008
- **Suggested model**: Haiku — a two-string change plus the tests that assert it
- **Delivered**: _(add on delivery)_

## Summary

Connected users see the heading "Your Roadmaps" ("Eich Mapiau Trywydd" in Welsh) above
their roadmap list. Every other title in the product is sentence case, as the root
`AGENTS.md` requires. Since the first build.

## Reproduce

At commit `305e269` on the default branch:

1. Connect, with at least one roadmap in the spreadsheet.
2. Read the heading of the list.

**Expected**: "Your roadmaps" / "Eich mapiau trywydd"
**Actual**: "Your Roadmaps" / "Eich Mapiau Trywydd"

## Cause

Verified: `roadmaps.title` in `src/i18n/locales/en.ts` and `cy.ts`.

- `rg -l 'Your Roadmaps|Eich Mapiau Trywydd' src tests` — 5 files: both catalogues,
  `src/app/app.test.tsx`, `src/features/roadmaps/pages/roadmaps-page.test.tsx`,
  `tests/e2e/roadmaps.spec.ts`, `tests/e2e/preferences.spec.ts`.

## Acceptance criteria

### S1: The list heading is sentence case in both languages

**Given** a connected user with roadmaps
**When** the roadmap list shows, in English and then in Welsh
**Then** its heading reads "Your roadmaps", then "Eich mapiau trywydd"

## Decisions

## Delivery
