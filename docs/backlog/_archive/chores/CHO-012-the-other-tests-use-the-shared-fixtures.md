# CHO-012: The other tests take their families, categories and connected state from the shared fixtures

- **Status**: Done — in its PR, awaiting merge
- **Type**: Refactor
- **Area**: Domain + Features/UI (tests only)
- **Epic**: standalone
- **Depends on**: CHO-011 (hard, must be on the default branch)
- **Binding ADRs**: none
- **Suggested model**: Sonnet — each site needs reading: some names are asserted, and
  some lists differ on purpose
- **Delivered**: _(add on delivery)_

## Summary

CHO-011 gave the tests one family list and one category list
(`src/domain/roadmap/testing/test-lists.ts`). Tests outside the three files it
measured still write the same families and categories out, with small differences
nobody chose (a Welsh name here, none there), and every page test declares the same
connected state. Done looks like: a test that needs a listed family or category
imports it, and the page tests share one connected state.

## Measurement

At commit `858be74`, with CHO-011's changes.

| Area                    | Measurement                                                                                                                                                                                                                                                                                                        | Verdict                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Families and categories | `rg -n ": Family = \{\|Family\[\] = \[\|: Category = \{\|Category\[\] = \[" src --glob '*.test.ts' --glob '**/testing/*-contract.ts'` finds `family-changes.test.ts` and `new-roadmap.test.ts` (each declares the shared families or categories again) and two contract files, whose lists sit inside single tests | Share where the list is the shared one     |
| The same IDs, inline    | `rg -n '"fc29g5b9"\|"vdkxj63m"\|"khzpchkh"' src --glob '!src/infrastructure/**' --glob '!**/test-lists.ts'` finds the IDs typed into roadmaps and expected values in eleven files                                                                                                                                  | Read from the shared constant when touched |
| The connected state     | `rg -l "const connected: AuthState" src` finds 21 test files, each with the same three lines                                                                                                                                                                                                                       | Share, beside `renderWithProviders`        |
| Infrastructure          | The parsers' tests write families and categories as spreadsheet rows, which is what they parse                                                                                                                                                                                                                     | Leave                                      |

## Acceptance criteria

### S1: A listed family or category is declared once

**Given** the domain and feature tests
**When** a test needs a family or a category the shared lists hold
**Then** it imports it from `src/domain/roadmap/testing/test-lists.ts`
**And** a test that needs another declares only that one

### S2: The page tests share one connected state

**Given** the tests that render a page as connected
**When** the connected state's shape changes
**Then** one fixture changes

## Decisions

## Out of scope

- Any change to what the tests assert, or to production code.
- The infrastructure tests' spreadsheet rows.

## Delivery

### Departures

- **The two contract files keep their lists.** `roadmap-repository-contract.ts` and
  `published-state-contract.ts` declare families and categories inside single tests,
  and they differ on purpose: the first lists them in data-source order with a
  `Medicines` family and a shortened Welsh category name; the second needs a family
  with no Welsh name. Neither is the shared list, so S1 leaves them.
- **`roadmap-detail-page-choices.test.tsx` keeps its `Workforce` family**, the one
  family it adds to `TEST_FAMILIES` (S1's "declares only that one").
- **`auth-scoped-queries.test.ts` and `auth-notice.test.tsx` keep their own states**:
  a 60 s session and a builder function, not the page tests' connected state.
- **`new-roadmap.test.ts` took the shared Welsh name** for Medicines & Diagnostics
  (none, not `Meddyginiaethau a Diagnosteg`); no assertion reads it by value, each
  reads `MEDICINES_AND_DIAGNOSTICS.name`.
- **Inline IDs** were read from the shared constants only in the two files this chore
  touches (`family-changes.test.ts`, `new-roadmap.test.ts`), as the Measurement says
  ("when touched").

### Contract for dependents

- **The connected state (Vitest)**: `connected` (`src/test/connected-state.ts`), beside
  `renderWithProviders`: `{ status: "connected", expiresAt: Date.now() + 3_600_000 }`,
  fixed when the module loads. A page test imports it; a test that needs a session of
  another length writes its own state.

### Scenario evidence

No test was added or removed, and no assertion changed: 2152 tests in 96 files, as
before.

| Scenario | Evidence                                                                                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `rg -n ": Family = \{\|: Category = \{" src --glob '*.test.ts*'` finds only `roadmap-detail-page-choices.test.tsx`'s `Workforce`; the two domain tests import the lists from `test-lists.ts`             |
| S2       | `rg -n "const connected: AuthState" src` finds `src/test/connected-state.ts` and `auth-scoped-queries.test.ts`'s 60 s state; the 22 page, hook and shell tests that declared the hour-long one import it |
