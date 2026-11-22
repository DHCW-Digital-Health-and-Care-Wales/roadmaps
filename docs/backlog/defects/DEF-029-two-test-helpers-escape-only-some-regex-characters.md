# DEF-029: Two test helpers escape only some regex characters, so CodeQL keeps two high alerts open

- **Status**: Needs triage — found by CHO-031 delivery (CodeQL's first run on `main`)
- **Severity**: Low — test code only, with fixed inputs; the cost is two open high
  alerts that hide new ones in the code-scanning list
- **Area**: CI/CD + E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — two small helper changes and a lint rule or test
- **Delivered**: _(add on delivery)_

## Summary

CodeQL's default setup, turned on with CHO-031, raised two high-severity
"incomplete string escaping" alerts on its first run. Each is a test helper that
builds a regular expression from a string and escapes only the characters its
current inputs hold. Nothing a user sees is affected, and both inputs are constants
in the tests, but a helper given a backslash or another special character would match
the wrong text, and the open alerts make the list harder to read for real findings.

## Reproduce

At commit `4b77c9af` on the default branch:

1. Run CodeQL's default setup (run `45060433831`), or open Security → Code scanning.

**Expected**: no open alerts.
**Actual**: alerts #1 and #2, `js/incomplete-sanitization`, "This does not escape
backslash characters in the input."

## Cause

Verified: each helper escapes a hand-picked character class instead of every regex
metacharacter.

- `rg -n '\\\$&' apps packages build` — 2 sites: `apps/editor/src/styles/tokens.test.ts:42`
  (`sassVariable`, escapes `$` and `-`), `apps/editor/tests/e2e/moved-mark.spec.ts:42`
  (`shadowOf`, escapes `(` and `)`).

## Acceptance criteria

### S1: A test helper's pattern matches its input literally

**Given** either helper is given a string holding regex metacharacters, a backslash
included
**When** it builds its pattern
**Then** the pattern matches that string literally, and CodeQL closes alerts #1 and #2

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
