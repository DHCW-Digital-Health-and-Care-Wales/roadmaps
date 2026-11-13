# CHO-006: The session-start hook's scenarios run as a test

- **Status**: Done — in its PR, awaiting merge
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: PR #55 (merged): the test pins that hook's behaviour
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a bounded Vitest file that drives a shell script
  against throwaway git repositories

## Summary

`.claude/hooks/session-start.sh` decides what every Claude session is told about
its branch, and nothing tests it. From PR #11 until PR #55, its "remote branch is
gone" warning fired only if another command had pruned the remote refs: the
hook fetched only the default branch, so it never pruned a deleted upstream
itself. No check caught that. Delivering PR #55, the implementer and each of
four review runs built their own throwaway-repository harness to exercise the
hook. Done means those scenarios run in `pnpm test`, so a change to the hook
shows which outcome it moves and its reviewers start from the test.

## Measurement

At commit `a558b85` (PR #55's head):

| Area             | Measurement                                                                                                                                                                                          | Verdict                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Coverage         | No test runs `.claude/hooks/session-start.sh` (`rg -l session-start build src tests`)                                                                                                                | Worth doing                 |
| Defect it hid    | The hook's own fetch never reached the `[gone]` branch, from PR #11 (2026-11-10) until review of PR #55 found it by running scenarios by hand                                                        | A test would have caught it |
| Repeated legwork | PR #55's hook was exercised five times, each in its own `/tmp` repositories: the implementer (19 scenarios over three versions), Opus (6), Sol's round 1 (12), its re-check, and its final pass (16) | One shared test replaces it |
| Runtime per run  | The hook takes 0.8–1.1 s locally, nearly all one network fetch; against a local bare `origin` the fetch is milliseconds                                                                              | Fits the unit suite         |

## Acceptance criteria

### S1: Each outcome of the behind-main check is held

- A Vitest file beside the other build tests (`build/*.test.ts`) runs the hook
  with `bash` against throwaway repositories cloned from a local bare `origin`,
  piping SessionStart JSON on stdin with `CLAUDE_PROJECT_DIR` set. It runs the
  hook in a controlled environment, so the runner's own setup can't change an
  outcome: `GIT_CONFIG_GLOBAL` pointed at a temporary file,
  `GIT_CONFIG_NOSYSTEM=1` (a global `fetch.prune=true` hides a missing
  `--prune`), a git identity supplied, and `CLAUDE_CODE_REMOTE` unset outside
  S2.
- It asserts the hook's stdout and exit 0 for: behind the default branch (Note);
  upstream deleted on the remote (Warning); unrelated history (Warning); up to
  date, shallow clone and no `origin/HEAD` (silent); `cwd` in a stale worktree
  while `CLAUDE_PROJECT_DIR` is up to date (Note).
- Removing `--prune` from the hook's fetch fails the deleted-upstream case.

### S2: The remote preparation is held

- With `CLAUDE_CODE_REMOTE=true` and a stub `pnpm` first on `PATH`, a passing
  install prints "Installed dependencies.", and creating `.env.local` at the
  worktree root prints "Created .env.local from .env.example." A failing
  install prints the warning that names its log, still creates `.env.local` and
  exits 0.

## Decisions

## Out of scope

- macOS without `timeout`, and a real Claude Code web session: neither runs in CI.

## Delivery

### Departures

- **Test order** (agent): the hook predates this chore, so no test went red
  before code that passes it. Each case's discrimination was shown instead by
  planting its defect in the hook and watching only that case fail (Scenario
  evidence).
- **Fetch-free setups** (agent): every case but the deleted upstream puts the
  checkout behind with `git reset --hard HEAD~1`, or fetches for itself, so it
  holds where the hook skips its fetch. The deleted-upstream case needs the
  hook's own fetch, so it is skipped where neither `timeout` nor `gtimeout`
  exists (stock macOS, out of scope).
- **One added case** (agent): S2 also checks that an existing `.env.local` is
  kept, a branch of the same `if` that S2's creation case covers the other side
  of.

### Contract for dependents

- `build/session-start-hook.test.ts` asserts the hook's whole stdout, so a
  change to a Note or Warning's wording updates its expected string there.
- Its `isolatedEnv()` builds the hook's environment from scratch (PATH, HOME,
  TMPDIR, `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_NOSYSTEM`), so a variable the hook
  comes to read must be passed in deliberately.
- The test runs under the suite's jsdom environment: `src/test/setup.ts` needs
  `window`, so a `// @vitest-environment node` file fails to load.

### Scenario evidence

| Scenario                 | Held by                                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1 behind (Note)         | `build/session-start-hook.test.ts` (`notes how far a checkout is behind the default branch`)                                                                                                                                |
| S1 upstream deleted      | `build/session-start-hook.test.ts` (`warns when the branch's upstream was deleted on the remote`)                                                                                                                           |
| S1 unrelated history     | `build/session-start-hook.test.ts` (`warns when the branch's history is unrelated to the default branch`, `warns when the branch meets the default branch only at its root`)                                                |
| S1 silent cases          | `build/session-start-hook.test.ts` (`is silent when the checkout is up to date`, `… in a shallow clone …`, `… no default branch recorded`)                                                                                  |
| S1 stale worktree (Note) | `build/session-start-hook.test.ts` (`checks the session's worktree, not the directory it was launched in`)                                                                                                                  |
| S1 `--prune` removed     | observed run: with `--prune` removed, under a global `fetch.prune=true` and `CLAUDE_CODE_REMOTE=true`, only the deleted-upstream case fails                                                                                 |
| S1 discrimination        | observed runs: ignoring `cwd`, or dropping the shallow guard or the root-commit test, each fails only its own case; the empty-merge-base test alone moves no outcome, since the root-commit test also catches an empty base |
| S2 install passes        | `build/session-start-hook.test.ts` (`installs dependencies and creates .env.local at the worktree root`)                                                                                                                    |
| S2 install fails         | `build/session-start-hook.test.ts` (`names the install log when the install fails, and still creates .env.local`); an `exit 1` added after the warning fails it                                                             |
