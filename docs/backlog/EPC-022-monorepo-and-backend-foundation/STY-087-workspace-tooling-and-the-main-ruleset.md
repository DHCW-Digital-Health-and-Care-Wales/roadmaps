# STY-087: Workspace tooling, CI per app and the ruleset on main

- **Status**: Proposed — acceptance criteria written from the owner's STY-087 grilling
  (2026-11-21, D1–D8)
- **Type**: Refactor
- **Area**: CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-086 (hard); CHO-031 and STY-090 also change `ci.yml` and
  `.github/dependabot.yml`, so whichever lands later rebases
- **Binding ADRs**: ADR-016 §Workspace tooling, §CI, §Who may change main, ADR-007
- **Suggested model**: Sonnet — configuration with known shapes, observed in runs

## Summary

`main` becomes protected before the public site's code arrives: a ruleset kept in the
repository, squash merges only, signed commits, and one required check that every CI
job feeds. CI runs per app, plus a repository job on every pull request. Git hooks
catch formatting, lint and type errors before they are pushed, and Dependabot keeps
pnpm dependencies current. The owner merges agents' pull requests through a bypass
that works only through a pull request. Nothing changes for Product Leads.

## Scope

- **The ruleset** (D1–D4): `.github/rulesets/main.json`, which the owner applies with
  the `gh api` command the pull request names, and `CODEOWNERS`. The pull request's
  delivery amends ADR-016 in place (_STY-087 amendments_) for squash only, a bypass
  through pull requests only and the gate job, and ADR-007 for CI per app.
- **CI** (D5, D6): one `ci.yml` with a `changes` job, a Repository job, the editor's
  jobs and a gate.
- **Tooling** (D7, D8): lefthook, pnpm catalogs for the versions the root and the editor
  share, and Dependabot for pnpm.

## Acceptance criteria

### S1: main refuses a direct push, even from the owner

**Given** the ruleset is applied
**When** anyone, the owner included, pushes a commit straight to `main`, force-pushes
it or deletes it
**Then** GitHub refuses it
**And** the owner's bypass applies only when merging a pull request (D2)

### S2: A pull request merges only as a signed squash, after a passing CI result

**Given** an open pull request into `main`
**When** someone tries to merge it
**Then** GitHub offers only a squash merge (D3), and blocks it until the required check
_CI result_ passes on a branch up to date with `main`, one code owner has approved the
last push, and every commit on the branch is signed
**And** the owner can merge it past those conditions through the bypass (D2), and a
pull request someone else opens needs the owner's approval, the only code owner (D4)

### S3: The gate fails when any job fails, and only then (D5)

**Given** a pull request run
**When** a job is skipped because its paths did not change
**Then** _CI result_ passes
**But when** any job it needs fails or is cancelled, `changes` included
**Then** _CI result_ fails

### S4: The repository's checks run on every pull request (D6)

**Given** any pull request, docs-only or not
**When** CI runs
**Then** the Repository job runs Prettier, the Markdown link check, the agent-guide
budget, the worktree script's tests, actionlint and zizmor with every audit on
**And** a finding from any of them fails it; each zizmor finding in today's workflows
is fixed or justified inline where it is raised

### S5: The editor's jobs run when the editor could be affected (D6)

**Given** a pull request
**When** it changes `apps/editor/`, the lockfile, the workspace's configuration or a
workflow
**Then** the editor's verify and E2E jobs run
**And** a pull request that changes only `docs/` or Markdown skips them, while pushes to
`main` and manual runs run every job and deploy from `main` as before (ADR-007)

### S6: Hooks catch mistakes before they leave the machine (D7)

**Given** a clone after `pnpm install`, which installs lefthook's hooks
**When** a developer commits staged files
**Then** Prettier formats them and re-stages the result, and the touched app's ESLint
refuses the commit on an error
**And when** they push a branch with a type error
**Then** `pnpm typecheck` refuses the push
**And** the hooks do not run in CI

### S7: Dependabot keeps pnpm dependencies current (D8)

**Given** the merged change
**When** Dependabot's monthly run finds outdated pnpm dependencies
**Then** it raises one grouped pull request for them, beside the grouped GitHub Actions
update

## Decisions

- **D1** (owner, 2026-11-21, STY-087 grilling round 2): the ruleset's form → JSON in
  the repository, applied by the owner with one `gh api` command, over settings clicked
  by hand, so main's protection is a reviewed diff.
- **D2** (owner, 2026-11-21, round 1): merging owner-authored pull requests → the owner
  merges through bypass once the agents' review lanes pass, with the bypass set to
  pull requests only. Over the other code owner approving each, or 0 approvals. The
  bypass also skips failing checks (ADR-016 _Consequences_). Shapes S1, S2.
- **D3** (owner, 2026-11-21, round 2): merge methods → squash only, over squash and
  rebase as copied from `product-roadmaps`, since GitHub signs a squash commit but its
  docs do not say it signs a rebase merge's commits. STY-086's rebase merge comes
  before the ruleset; STY-088's history merge goes through the bypass. Amends ADR-016.
- **D4** (owner, 2026-11-21, round 2): code owners → `* @collisdigital` only, over the
  two owners of `product-roadmaps`. Shapes S2.
- **D5** (owner, 2026-11-21, round 1): required checks → one always-run gate job, _CI
  result_, over requiring each job by name, since a skipped required job counts as
  passed. Shapes S3.
- **D6** (owner, 2026-11-21, round 1): CI shape → a Repository job on every pull
  request and app jobs by path, over keeping the docs-only switch. Shapes S4, S5.
- **D7** (owner, 2026-11-21, round 1): hook runner → lefthook, over husky and
  lint-staged, since it runs ruff and ty (STY-090) as easily as Prettier. Shapes S6.
- **D8** (agent, 2026-11-21): pnpm catalogs now, for the versions the root and the
  editor already share (STY-086 D4), over waiting for the public site.

## Starting point

Audited at `cc11e44` on 2026-11-21:

- `product-roadmaps`' ruleset (`main-protection`, `gh api
repos/DHCW-Digital-Health-and-Care-Wales/product-roadmaps/rulesets/24720402`)
  targets the default branch and holds: no deletion, no force-push, required status
  checks (none listed) with the branch up to date, and a pull request with one approval,
  code-owner review, last-push approval, stale approvals dismissed and an extra approval
  for unattributed changes, merging by squash or rebase. Its one bypass actor is the
  owner, mode `always`.
- This repository has only the enterprise's _Restrict Transfers_ ruleset; its settings
  allow squash and rebase merges and delete merged branches.
- GitHub checks a test merge of the pull request's commits against a signatures rule,
  so one unsigned commit on a branch blocks even a squash merge ([available rules for
  rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)).
  The owner's commits, signed with SSH, verify on GitHub.
- `ci.yml`'s jobs are _Detect changes_, _Docs_ (docs-only pull requests), _Verify_,
  _E2E (Playwright)_ and _Deploy to GitHub Pages_.

## Out of scope

- knip: STY-092. A shared `eslint.base.ts`: STY-095. ruff, ty, uv and the API's job:
  STY-090.
- Dependency review, CodeQL, OSV audits, release cooldowns and push protection:
  CHO-031.
- The public site's jobs: STY-088.
