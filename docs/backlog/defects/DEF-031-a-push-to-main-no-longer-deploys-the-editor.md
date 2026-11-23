# DEF-031: A push to main no longer deploys the editor

- **Status**: Proposed — owner triaged it a priority on 2026-11-23 (D1)
- **Severity**: High — no change merged to `main` reaches Product Leads: the editor on
  GitHub Pages stays at the last commit deployed before CHO-031
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-007, ADR-016 §CI
- **Suggested model**: Opus — GitHub Actions' job-skipping rules, a guard test to
  change, and a deploy to observe on `main`
- **Delivered**: _(add on delivery)_

## Summary

Since CHO-031 merged on 2026-11-22, every push to `main` passes its checks but skips
"Deploy to GitHub Pages", so the editor Product Leads use stays at `1f351cf3`, the last
commit deployed. Nothing user-visible has been missed yet: every merge since has been
CI, tests or docs. The next change to the editor would not go live. The public site is
unaffected: `product-roadmaps` publishes it. Workaround: none within CI; a re-run skips
the same way.

## Reproduce

At commit `c23ed2fe` on the default branch (any push to `main` since `9ee767b8`):

1. Push to `main` (or look at the CI/CD run of any push since `9ee767b8`: `45080411354`,
   `45085192396`, …).
2. Read the run's jobs.

**Expected**: every check passes, then "Deploy to GitHub Pages" runs and publishes
`apps/editor/dist`.
**Actual**: every check passes, _CI result_ passes, and "Deploy to GitHub Pages" is
skipped. The runs of `9ee767b8`, `7535e336`, `99fe7e6b`, `83c1942b`, `f9ce1e34` and
`c23ed2fe` all skip it; the run of `1f351cf3`, just before CHO-031, deployed. (`4b77c9af`'s
skip was right: its _Editor: verify_ failed.)

## Cause

Suspected, from the runs and the workflow, not yet proven by a run: CHO-031 added
_Dependency review_ to `ci.yml`, with `if: github.event_name != 'push'`, and to
_CI result_'s `needs`. On a push to `main` it is skipped. _CI result_ runs anyway
(`if: always()`) and passes, but `deploy`'s `if:` holds no status function, so GitHub
applies the implicit `success()`, which a skipped job in its chain of `needs` fails, so
`deploy` is skipped too. The workflow's comment above `deploy` expected the skip to be
harmless.

- `.github/workflows/ci.yml`: `dependency-review` (`if: github.event_name != 'push'`),
  `ci-result` (`needs` includes it, `if: always()`), `deploy` (`needs: [editor-verify,
ci-result]`, `if:` with no status function).
- `build/ci-workflow.test.ts` (`passes before deploy publishes anything`) forbids
  `always(`, `failure(` and `cancelled(` in `deploy`'s `if:`, so a fix that names the
  results it needs, as a status function would, changes that test with it; the test's
  purpose (no deploy past a failed or cancelled gate) holds.

## Acceptance criteria

### S1: A push to main whose checks pass deploys the editor

**Given** a push to `main` on which every job _CI result_ needs passes or is skipped by
its event or paths
**When** _CI result_ passes
**Then** "Deploy to GitHub Pages" runs and publishes the build `editor-verify` uploaded,
observed on `main` after the fix merges

### S2: A failed or cancelled check still blocks the deploy

**Given** a push to `main` on which a job _CI result_ needs fails or is cancelled
**When** the run ends
**Then** "Deploy to GitHub Pages" does not run, and `build/ci-workflow.test.ts` fails
on a `deploy` condition that could run it past a failed gate

## Decisions

- **D1** (owner, 2026-11-23, raised during STY-088's cut-over): "That roadmap site
  deploy is a priority issue": fix it first, in its own thread.
