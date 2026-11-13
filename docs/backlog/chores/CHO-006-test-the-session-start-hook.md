# CHO-006: The session-start hook's scenarios run as a test

- **Status**: Proposed — once PR #55's hook is on `main`
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: PR #55 merged (hard): the test pins that hook's behaviour
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a bounded Vitest file that drives a shell script
  against throwaway git repositories

## Summary

`.claude/hooks/session-start.sh` decides what every Claude session is told about
its branch, and nothing tests it. From PR #11 until PR #55, its "remote branch is
gone" warning fired only if another command had pruned the remote refs: the
hook fetched only the default branch, so it never pruned a deleted upstream itself. No check caught
that. Delivering PR #55, the implementer and each of four review runs built
their own throwaway-repository harness to exercise the hook. Done means
those scenarios run in `pnpm test`, so a change to the hook shows which outcome
it moves and its reviewers start from the test.

## Measurement

At commit `a558b85` (PR #55's head):

| Area             | Measurement                                                                                                                                                                                     | Verdict                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Coverage         | No test runs `.claude/hooks/session-start.sh` (`rg -l session-start build src tests`)                                                                                                           | Worth doing                 |
| Defect it hid    | The hook's own fetch never reached the `[gone]` branch, from PR #11 (2026-11-10) until review of PR #55 found it by running scenarios by hand                                                   | A test would have caught it |
| Repeated legwork | PR #55's hook was exercised five times, each in its own `/tmp` repositories: the implementer (19 scenarios over three versions), Opus (6), and Sol's round 1 (12), re-check and final pass (16) | One shared test replaces it |
| Runtime per run  | The hook takes 0.8–1.1 s locally, nearly all one network fetch; against a local bare `origin` the fetch is milliseconds                                                                         | Fits the unit suite         |

## Acceptance criteria

### S1: Each outcome of the behind-main check is held

- A Vitest file beside the other build tests (`build/*.test.ts`) runs the hook
  with `bash` against throwaway repositories cloned from a local bare `origin`,
  piping SessionStart JSON on stdin with `CLAUDE_PROJECT_DIR` set.
- It asserts the hook's stdout and exit 0 for: behind the default branch (Note);
  upstream deleted on the remote (Warning); unrelated history (Warning); up to
  date, shallow clone and no `origin/HEAD` (silent); `cwd` in a stale worktree
  while `CLAUDE_PROJECT_DIR` is up to date (Note).
- Removing `--prune` from the hook's fetch fails the deleted-upstream case.

### S2: The remote preparation is held

- With `CLAUDE_CODE_REMOTE=true` and a stub `pnpm` first on `PATH`, a passing
  install prints one line and creates `.env.local` at the worktree root. A failing
  install prints the warning that names its log, still creates `.env.local` and
  exits 0.

## Decisions

## Out of scope

- macOS without `timeout`, and a real Claude Code web session: neither runs in CI.
