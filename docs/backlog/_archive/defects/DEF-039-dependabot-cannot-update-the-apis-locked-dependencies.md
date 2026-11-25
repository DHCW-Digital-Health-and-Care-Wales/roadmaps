# DEF-039: Dependabot cannot raise updates of the API's locked dependencies

- **Status**: Done
- **Severity**: Medium — updates that rewrite the API's lockfile get no pull request,
  so newer releases wait until a person notices
- **Area**: CI/CD
- **Epic**: EPC-022-monorepo-and-backend-foundation
- **Depends on**: none
- **Binding ADRs**: ADR-016 §Workspace tooling
- **Suggested model**: Sonnet — a pin that CI and Dependabot both read
- **Delivered**: 2026-11-25

## Summary

The owner gets no Dependabot pull request that rewrites the lockfile of the API's
Python dependencies; FastAPI and ty, its type checker, are the two seen failing. The
project requires one exact version of uv, its Python package tool, and Dependabot runs
a different one. Security updates are suspected to fail the same way. The failure shows
only in Dependabot's own run on the default branch, seen since 2026-11-24. A person can
still update by hand.

## Reproduce

At commit `56f318d6` on the default branch:

1. Copy `apps/api/pyproject.toml` and `apps/api/uv.lock` into an empty folder.
2. There, run `uvx --from 'uv==0.13.7' uv lock --upgrade-package fastapi==0.163.2`.

**Expected**: the lockfile updates
**Actual**: ``Required uv version `==0.13.4` does not match the running version
`0.13.7` ``

On GitHub, the Dependabot run `uv in /apps/api for uv-build` on that commit (run
45554284600, uv 0.13.7) reports `tool_version_not_supported` while updating `fastapi`
(0.163.1 to 0.163.2) and `ty` (0.0.104 to 0.0.105), with detected version `==0.13.4`
and supported version `0.13.7`. The same error for `ty` is in the run on `837b0b94`
(45425912226), and for both on `d38185bd` and `b42a16c8`.

## Cause

Verified: `required-version = "==0.13.4"` under `[tool.uv]` in
`apps/api/pyproject.toml`, which CI's setup-uv also reads, refuses any other uv, and
Dependabot's updater runs its own: with that line removed from the copy, the command
above updates FastAPI from 0.163.1 to 0.163.2. Suspected, not observed: a security
update of a locked dependency would fail the same way, as it runs the same lock step.

- `git grep -n 'required-version' -- '*.toml' '*.yml'` — two lines: the pin,
  `apps/api/pyproject.toml:35`, and a comment on the setup-uv step that reads it,
  `.github/workflows/ci.yml:377`.

## Acceptance criteria

### S1: Dependabot can lock the API's dependencies

**Given** a newer release of a locked API dependency, past the cooldown
**When** Dependabot's uv update runs on the default branch
**Then** it raises the update's pull request, with no `tool_version_not_supported`

## Decisions

- **D1** (owner, 2026-11-25): widen `[tool.uv] required-version` in `apps/api/pyproject.toml` from `==0.13.4` to `>=0.13.4,<0.14`, matching `[build-system] requires`, so CI (`setup-uv`), local `uv 0.13.4`, and Dependabot's `uv 0.13.7` all satisfy it.

## Delivery

### Departures

None. Review lanes skipped as a one-liner at the owner's request.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | Local reproduction in `/tmp` with `uvx --from 'uv==0.13.7' uv lock --upgrade-package fastapi==0.163.2`: failed on `==0.13.4` (`Required uv version ==0.13.4 does not match the running version 0.13.7`), succeeded on `>=0.13.4,<0.14` (`Updated fastapi v0.163.1 -> v0.163.2`); live Dependabot run on `main` to be observed after merge |
