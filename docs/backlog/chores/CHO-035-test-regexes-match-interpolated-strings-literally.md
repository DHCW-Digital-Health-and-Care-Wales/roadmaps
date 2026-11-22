# CHO-035: Test regexes match the strings they interpolate literally

- **Status**: Proposed — split from DEF-029 by the owner (DEF-029 D2)
- **Type**: Refactor
- **Area**: E2E + Infrastructure
- **Epic**: standalone
- **Depends on**: [DEF-029](../defects/DEF-029-two-test-helpers-escape-only-some-regex-characters.md)
  (its shared escape helper)
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a mechanical sweep with one helper
- **Delivered**: _(add on delivery)_

## Summary

Tests across the workspace build regular expressions from copy strings and other
values without escaping them, such as a link named `^${copy.next},`. They pass because
today's English and Welsh copy holds no regex metacharacter. A copy change that adds a
`?`, `.`, `(` or `+` would silently change what a test matches: it could pass against
the wrong element or fail with no clue why. Done is every such regex escaping what it
interpolates, through DEF-029's shared helper, with the literal parts left as written.

## Measurement

At commit `1f351cf3`, in test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`) under
`apps/` and `build/`:

| Search                                                 | Sites                                   | Verdict                                                                                          |
| ------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ``rg -n -U 'new RegExp\(\s*(String\.raw)?`[^`]*\$\{'`` | 26 in 13 files, 18 of them in E2E specs | escape each interpolated value; the 2 in `tokens.test.ts` and `moved-mark.spec.ts` are DEF-029's |
| `rg -n 'new RegExp\([a-zA-Z_.\[\]]+\)'`                | 2, in `app-shell.test.tsx`              | escape the value                                                                                 |

A hit whose interpolation is itself a pattern (a `RegExp`'s `.source`, or a fragment
written as regex) stays unescaped. No lint rule: DEF-029 D4 leaves the guard to
CodeQL and review.

## Acceptance criteria

### S1: An interpolated string is matched literally

**Given** a test that builds a regex from a copy string or other value
**When** that value holds a regex metacharacter
**Then** the regex matches the value literally, through DEF-029's helper

## Decisions

- **D1** (owner, 2026-11-22, DEF-029 grilling): every test in the workspace, unit and
  E2E in the editor and `build/`'s, over the editor's E2E specs only.
- **D2** (owner, 2026-11-22, DEF-029 grilling): Proposed after DEF-029, with no thread
  started for it now.

## Delivery _(add on delivery; as in `story.md`)_
