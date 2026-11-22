# DEF-029: Two test helpers escape only some regex characters, so CodeQL keeps two high alerts open

- **Status**: Done — triaged by the owner (D1); found by CHO-031 delivery (CodeQL's
  first run on `main`)
- **Severity**: Low — test code only, with fixed inputs; the cost is two open high
  alerts that hide new ones in the code-scanning list
- **Area**: CI/CD + E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one shared helper, its test and two call sites (D5)
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

### S2: The shared escape helper escapes every metacharacter

**Given** a string holding every regex metacharacter, a backslash included
**When** the shared helper escapes it and the result is compiled
**Then** the pattern matches the string literally and nothing else

## Decisions

- **D1** (owner, 2026-11-22, grilling on PR #239): fix, over dismissing the alerts in
  GitHub as test code or excluding tests from CodeQL (which default setup cannot do
  without an advanced-setup workflow).
- **D2** (owner, 2026-11-22, grilling on PR #239): the two flagged helpers only. The
  other test regexes built from unescaped strings are
  [CHO-035](../../chores/CHO-035-test-regexes-match-interpolated-strings-literally.md).
- **D3** (owner, 2026-11-22, grilling on PR #239): one shared escape helper, which
  escapes every metacharacter, in a place both the unit and the E2E tests import; both
  flagged helpers call it. It gives way to the built-in `RegExp.escape` once the
  TypeScript target and every supported Node have it (ES2025, Node 24), over a full
  character class inlined twice or rewriting the helpers without a regex.
- **D4** (owner, 2026-11-22, grilling on PR #239): the helper's own unit test (S2) and
  CodeQL's pull-request runs guard against a partial escape coming back, with no lint
  rule.
- **D5** (owner, 2026-11-22, grilling on PR #239): delivered next, in its own thread on
  Sonnet, once this record is on `main`.

## Delivery _(add on delivery; as in `story.md`)_

**Departures.** None. The helper's escape class includes `/` and `-` beyond the regex
metacharacters, so a pattern built from the text is also safe inside a character class
or a literal.

**Contract for dependents.** `escapeRegExp` in `apps/editor/tests/fixtures/escape-regexp.ts`
is the one escape for unit and E2E tests; [CHO-035](../../chores/CHO-035-test-regexes-match-interpolated-strings-literally.md)
uses it. It gives way to `RegExp.escape` at ES2025 and Node 24.

**Scenario evidence.**

- **S1**: `sassVariable` (`tokens.test.ts`) and `shadowOf` (`moved-mark.spec.ts`) call
  `escapeRegExp`. `tokens.test.ts` passes; the E2E spec was type-checked and linted, not
  run (it needs a browser build; CI runs it). CodeQL closing alerts #1 and #2 shows on
  the PR's CodeQL run.
- **S2**: `escape-regexp.test.ts` compiles the escape of every metacharacter, a
  backslash included, and matches it literally and nothing else. Test-first order was not
  kept for this helper; red was shown by breaking the finished helper (a negated class):
  3 of 3 failed, 3 passed once restored.
