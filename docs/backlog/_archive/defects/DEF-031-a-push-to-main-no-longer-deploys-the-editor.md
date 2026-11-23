# DEF-031: A push to main no longer deploys the editor

- **Status**: Done
- **Severity**: High — no change merged to `main` reaches Product Leads: the editor on
  GitHub Pages stays at the last commit deployed before CHO-031
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-007, ADR-016 §CI
- **Suggested model**: Opus — GitHub Actions' job-skipping rules, a guard test to
  change, and a deploy to observe on `main`
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/254

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

## Delivery

### Departures

None. The Cause section's suspicion held: a scratch run reproduced it (S1's evidence).

### Contract for dependents

- `deploy`'s `if:` is a conjunction of `!cancelled()`, `needs.<job>.result == 'success'`
  for each job it needs, and the event and ref. A job added to its `needs` adds its own
  term; `build/ci-workflow.test.ts` (_ci.yml's deploy_) fails without it, on an `||`,
  `always()` or `failure()`, and without `!cancelled()` or the event and ref terms.
- A job before the gate may skip by its event or paths without holding back a deploy;
  the gate alone judges the jobs it needs.

### Scenario evidence

| Scenario | Held by                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `build/ci-workflow.test.ts` (`runs even when a job before it skips by its event or paths`), red before the fix; observed run 45087443622 |
| S2       | `build/ci-workflow.test.ts` (`runs only once every job it needs has passed`), red before the fix; observed run 45087443622               |

Run [45087443622](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/actions/runs/45087443622)
ran a throwaway workflow of `ci.yml`'s job graph on a scratch branch, since deleted. With
the gate needing a job skipped by its event, main's condition skipped its deploy job; the
same condition ran when the gate needed no skipped job, so the skip is the cause. The
fixed condition ran behind the first gate, and skipped behind a gate needing a failed job
and one needing a job cancelled by its timeout.

S2's test also went red with the fixed condition broken each way: `always()` for
`!cancelled()`, the gate's term dropped, an `||` clause, `|| failure()`.

S1 on `main` itself shows in the first CI/CD run of a push to `main` carrying this change:
"Deploy to GitHub Pages" runs and the editor's live build moves past `1f351cf3`. The owner
checks that run; the observation goes into this Delivery in a later commit, and a skip
there is a new defect.

Observed on `main`: the CI/CD run of `7f52ef7e`, run
[45091803604](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/actions/runs/45091803604),
skipped _Dependency review_, passed _CI result_ and ran "Deploy to GitHub Pages", which
deployed `7f52ef7e` to `github-pages`, the first deploy since `1f351cf3` (S1). The run
before it, of `d194496c`,
[45091291744](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/actions/runs/45091291744),
failed _Editor: verify_ on a flaky test (DEF-032), so _CI result_ failed and the deploy
was skipped (S2).
