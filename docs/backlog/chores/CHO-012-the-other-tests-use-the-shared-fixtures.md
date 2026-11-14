# CHO-012: The other tests take their families, categories and connected state from the shared fixtures

- **Status**: Proposed — found delivering CHO-011, which shared the lists of the three
  page tests it measured and left the rest
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
