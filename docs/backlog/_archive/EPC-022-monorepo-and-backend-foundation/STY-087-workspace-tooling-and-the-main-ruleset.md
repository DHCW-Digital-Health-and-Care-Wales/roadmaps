# STY-087: Workspace tooling, CI per app and the ruleset on main

- **Status**: Done — S1, S2 and S8 are observed once the owner applies the ruleset, S7
  at Dependabot's first monthly run
- **Type**: Refactor
- **Area**: CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-086 (hard); CHO-031 also changes `ci.yml` and
  `.github/dependabot.yml`, so whichever lands later rebases
- **Binding ADRs**: ADR-016 §Workspace tooling, §CI, §Who may change main, ADR-007
- **Suggested model**: Sonnet — configuration with known shapes, observed in runs
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/231

## Summary

`main` becomes protected before the public site's code arrives: a ruleset kept in the
repository, squash merges only, signed commits, and one required check that every CI
job feeds. CI runs per app, failing closed, plus a repository job on every pull
request. Git hooks catch formatting, lint and type errors before they are pushed, and
Dependabot keeps pnpm dependencies current after a cooldown. The owner merges agents'
pull requests through a bypass that works only through a pull request, and may let an
agent merge one. Nothing changes for Product Leads.

## Scope

- **The ruleset** (D1–D4, D9): `.github/rulesets/main.json`, which the owner applies
  with the `gh api` command the pull request names, and `CODEOWNERS`. ADR-016 already
  carries this story's amendments (_STY-087 amendments_); the delivery amends ADR-007
  for CI per app.
- **CI** (D5, D6, D11): one `ci.yml` with a `changes` job, a Repository job, the
  editor's jobs and a gate.
- **Tooling** (D7, D8, D10): lefthook, pnpm catalogs for the versions the root and the
  editor share, and Dependabot for pnpm with a cooldown.
- **Guides** (D6, D9): the guides and skills that name the Docs job or the merge
  command follow (implement-story's `pr-watch.md` and `validation.md` among them), and
  the rule on merging and protections reads as D9 sets.

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
_CI result_, reported by GitHub Actions (the ruleset names its integration), passes on
a branch up to date with `main`, one code owner has approved the last push, and every
commit on the branch is signed
**And** the bypass merges it past those conditions, checks, review and signatures
alike (D2), and a pull request someone else opens needs the owner's approval, the only
code owner (D4)

### S3: The gate fails when any job fails, and only then (D5)

**Given** a pull request run
**When** a job is skipped because its paths did not change
**Then** _CI result_ passes
**But when** any job it needs fails or is cancelled, `changes` included
**Then** _CI result_ fails
**And** the Repository job fails if any job in `ci.yml` other than deploy and the gate
itself is missing from the gate's `needs`, observed with a job left out (D11)

### S4: The repository's checks run on every pull request (D6)

**Given** any pull request, docs-only or not
**When** CI runs
**Then** the Repository job runs Prettier, the Markdown link check, the agent-guide
budget, the worktree script's tests, actionlint and zizmor with every audit on, both
linters pinned by action SHA or by version and checksum (D11)
**And** a finding from any of them fails it; each zizmor finding in today's workflows
is fixed or justified inline where it is raised

### S5: The editor's jobs skip only when the editor cannot be affected (D6, D11)

**Given** a pull request
**When** every file it changes is under `docs/`, is Markdown, or sits in another app's
directory
**Then** the editor's verify and E2E jobs are skipped
**And** any other change, the root's configuration, the lockfile and the workflows
included, runs them
**And** pushes to `main` and manual runs run every job, and only a push to `main`
deploys (ADR-007)

### S6: Hooks catch mistakes before they leave the machine (D7)

**Given** a clone after `pnpm install`, which installs lefthook's hooks
**When** a developer commits staged files
**Then** Prettier formats them and re-stages the result, and the touched app's ESLint
refuses the commit on an error
**And when** they push a branch with a type error
**Then** `pnpm typecheck` refuses the push
**And** the hooks do not run in CI

### S7: Dependabot keeps pnpm dependencies current, after a cooldown (D8, D10)

**Given** the merged change
**When** Dependabot's monthly run finds outdated pnpm dependencies
**Then** it raises one grouped pull request for versions older than the cooldown,
beside the grouped GitHub Actions update, which waits out the same cooldown
**And** every entry in `dependabot.yml` carries the cooldown, and security updates are
not held back by it

### S8: The applied ruleset is the reviewed one (D1)

**Given** the owner has applied `.github/rulesets/main.json`
**When** the delivery reads the live ruleset with `gh api`
**Then** its rules, bypass actors and conditions equal the file's, and Delivery records
the comparison

### S9: Every delivery agent reads the rule on merging and protections (D9)

**Given** the merged change
**When** any delivery agent starts work
**Then** a guide it always reads (the root `AGENTS.md`) says agents never change
rulesets, branch protections or repository settings, which are owner steps, and merge
only a pull request the owner authorised, through the bypass, once _CI result_ has
passed on the head they inspected

## Decisions

- **D1** (owner, 2026-11-21, STY-087 grilling round 2): the ruleset's form → JSON in
  the repository, applied by the owner with one `gh api` command, over settings clicked
  by hand, so main's protection is a reviewed diff. Shapes S8.
- **D2** (owner, 2026-11-21, round 1): merging owner-authored pull requests → the owner
  merges through bypass once the agents' review lanes pass, with the bypass set to
  pull requests only. Over the other code owner approving each, or 0 approvals. The
  bypass skips failing checks, review and signatures (ADR-016 _Consequences_). Shapes
  S1, S2.
- **D3** (owner, 2026-11-21, round 2): merge methods → squash only, over squash and
  rebase as copied from `product-roadmaps`: GitHub signs a squash commit, and adds a
  rebase merge's commits without signature verification. STY-086's rebase merge comes
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
- **D8** (owner, 2026-11-21, confirmation): pnpm catalogs now, for the versions the
  root and the editor already share (STY-086 D4), over waiting for the public site.
- **D9** (owner, 2026-11-21, review of this record): agent sessions run with the
  owner's credential, an admin and the bypass actor, and sign as the owner → the risk
  is recorded (ADR-016 _Consequences_), over a separate agent identity. The owner may
  authorise an agent to babysit and merge a pull request; that merge may use the bypass
  for that pull request alone. Agents never change rulesets, branch protections or
  repository settings. Shapes Scope's guides and S9.
- **D10** (owner, 2026-11-21, review of this record): Dependabot's cooldown arrives
  with its pnpm entry, here, so no update runs without it; CHO-031 keeps pnpm's and
  uv's own release-age settings (CHO-031 D2). Shapes S7.
- **D12** (agent, 2026-11-21, from the security re-check): the cooldown covers every
  Dependabot entry, GitHub Actions included, over pnpm alone, since a compromised
  action release reaches the deploy jobs. STY-088 and STY-090 carry it to their
  entries. Shapes S7.
- **D11** (agent, 2026-11-21, from the security review): the gate's check is pinned to
  GitHub Actions' integration, the path filter fails closed as today's does, a check
  keeps every job in the gate's `needs`, and the linters are pinned. Over an allow-list
  filter and an unpinned check, which a skipped or a posted status could pass. Shapes
  S2–S5.
- **D13** (agent, 2026-11-22, delivery): the cooldown is 7 days on every entry, the
  least zizmor's `dependabot-cooldown` audit accepts, so the Repository job fails a
  shorter one. Shapes S7.
- **D14** (agent, 2026-11-22, delivery): the root package's own checks get root scripts
  prefixed `repo:` (`repo:typecheck`, `repo:lint`, `repo:test`), and the editor's
  `editor:typecheck`, `editor:lint` and `editor:test`, so each CI job runs one
  package's checks through root scripts; `typecheck`, `lint` and `test` still run
  every package. Shapes S4, S5.

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
  allow squash and rebase merges and delete merged branches. The organisation's owners
  hold the admin role on it and on `product-roadmaps`; any of them can change a
  ruleset.
- Agent sessions run with the owner's credential and sign as the owner (D9).
- GitHub checks a test merge of the pull request's commits against a signatures rule,
  so one unsigned commit on a branch blocks even a squash merge, and asks someone who
  can bypass to merge it ([available rules for
  rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)).
  A rebase merge adds commits without signature verification ([commit signature
  verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)).
- A job skipped by a condition reports success to a required check ([troubleshooting
  required status
  checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)),
  and a required check can name the integration it must come from (`integration_id`
  in the [rules API](https://docs.github.com/en/rest/repos/rules)); confirm GitHub
  Actions' ID at delivery.
- GitHub's Dependabot options reference lists `cooldown` for GitHub Actions and for
  npm and Yarn, not pnpm by name; confirm it holds pnpm updates back at delivery.
- `ci.yml`'s jobs are _Detect changes_, _Docs_ (docs-only pull requests), _Verify_,
  _E2E (Playwright)_ and _Deploy to GitHub Pages_. _Detect changes_ fails closed: it
  runs everything unless every changed file is documentation.

## Out of scope

- knip: STY-092. A shared `eslint.base.ts`: STY-095. ruff, ty, uv and the API's job:
  STY-090.
- Dependency review, CodeQL, OSV audits, pnpm's and uv's release-age settings and push
  protection: CHO-031.
- The public site's jobs and `product-roadmaps`' protection: STY-088.
- A separate identity for agents: declined (D9).

## Delivery

### Departures

- **S4**: the Repository job also runs the root package's typecheck and lint, which
  Verify ran before, so each check of the root package runs once, there; the Markdown
  link check, the agent-guide budget and the worktree script's tests run in its
  `pnpm repo:test` with the change classifier's and the gate's tests (agent).
- **S4**: actionlint is pinned by version and checksum, downloaded in the job; zizmor
  runs through `zizmorcore/zizmor-action`, pinned by SHA, with its version pinned and
  its SARIF upload off, so a finding fails the job rather than going to code scanning.
  Today's workflow had one finding (`undocumented-permissions` on deploy) and the
  Dependabot file one (`dependabot-cooldown`); both are fixed, none justified (agent).
- **S5**: the editor's jobs are `editor-verify` and `editor-e2e`, renamed from `verify`
  and `e2e`, and run the editor's own scripts (`pnpm editor:typecheck`, …); `deploy`
  needs _CI result_ as well as `editor-verify`, so a deploy waits on the Repository job
  too (agent).
- **S5**: the path rule is a script, `scripts/ci/classify-changes.sh`, with tests, in
  place of the inline `grep`, so each app's rule is tested as STY-088 and STY-090 add
  theirs; with `--all` it runs every app's jobs, for a push to `main` or a manual run.
  Its step runs with `pipefail`, and an app's jobs skip only on an explicit `false`, so
  a failing classifier runs them or fails the gate (agent, from review).
- **S6**: lefthook's own install script installs the hooks (pnpm's `allowBuilds`), and
  skips itself when `CI` is set, so CI never installs them. The commit hook runs
  Prettier with `--ignore-unknown` on every staged file, then, in order, each package's
  ESLint with `--no-warn-ignored` from its own directory, the root package's included
  (agent).
- **S7**: `@playwright/test` comes in a pull request of its own, beside the grouped
  one, since its bump also needs the E2E job's image tag and digest and would hold the
  rest of the group red until then (agent, from review).
- **S7**: GitHub's options reference names `cooldown` for npm and Yarn, not pnpm, and
  pnpm 12 writes `pnpm-lock.yaml` as two YAML documents; whether the pnpm entry's first
  monthly run reads it and raises its pull request, held back by the cooldown, is
  observed at that run (agent).
- **S1, S2, S8**: the owner applies the ruleset (`docs/operations/protecting-main.md`);
  this pull request holds the file and the commands, and the scenarios are observed
  once it is applied, recorded below. The file copies the parameters of
  `product-roadmaps`' live ruleset, so its first `POST` is also the test that the API
  accepts them (agent).

### Contract for dependents

- **A new CI job** joins `ci-result`'s `needs` in `ci.yml`, or `build/ci-workflow.test.ts`
  fails. An app's jobs run on `needs.changes.outputs.<app> != 'false'`, so they
  skip only on an explicit `false` (`build/ci-workflow.test.ts` holds the form); STY-088 and
  STY-090 add a case, an output and a line under `--all` for their app to
  `scripts/ci/classify-changes.sh`, with tests, and stop `apps/*/*` skipping their own
  directory. A file another app's tests read from outside its directory (STY-089's
  shared fixtures) needs its own case, or `apps/*/*` skips that app for it.
- **Root scripts**: `repo:typecheck`, `repo:lint` and `repo:test` run the root package's
  own checks (the Repository job's); `<app>:typecheck`, `<app>:lint`, `<app>:test` and
  `<app>:build` run one app's, as its CI job calls them. `typecheck`, `lint` and `test`
  run the root's, then `pnpm -r`.
- **Hooks**: `lefthook.yml` takes a commit job per package (ESLint from the package's
  directory with `root:`, ruff for the API) and a push job per type checker (ty).
- **Catalog**: a version two packages share is a `catalog:` entry in
  `pnpm-workspace.yaml`.
- **Dependabot**: every entry carries `cooldown: default-days: 7`; zizmor's
  `dependabot-cooldown` audit fails the Repository job under 7 days.
- **The ruleset** requires one check, _CI result_ from GitHub Actions (integration
  15368); `build/ci-workflow.test.ts` holds the gate job's name to it.
- **Worktrees on one host share `.git/hooks`**: lefthook writes it from whichever
  checkout last ran `pnpm install`, naming that checkout's lefthook binary, which every
  checkout's hooks then run until it is deleted. A checkout without `lefthook.yml` (an
  older branch) prints lefthook's "No config files" notice and commits as before.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1, S2   | the applied ruleset, observed after the owner applies it (`docs/operations/protecting-main.md`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S3       | `build/ci-workflow.test.ts` (`needs every job that runs before it`, `passes before deploy publishes anything`), red with `editor-e2e` left out of the gate's `needs`, with the gate left out of deploy's, and with `always()` in deploy's `if`; the gate's step run locally on sample `needs` (passes with jobs skipped; fails naming `repository: failure, editor-e2e: cancelled`, and `changes: failure`); manual run `45011093662`: attempt 1's _CI result_ failed with `editor-verify: failure` (DEF-027's flake), attempt 2's passed with every job passing |
| S4       | manual run `45011093662`: the Repository job ran Prettier, the root package's typecheck, lint and tests (the Markdown links, the agent-guide budget, the worktree, classifier and gate tests), actionlint 1.7.12 (checksum checked) and zizmor 1.32.0 (auditor persona), all passing; zizmor locally on the base found the two findings _Departures_ names, and none on the head                                                                                                                                                                                 |
| S5       | `scripts/ci/classify-changes.test.ts` (12 cases), red with the other-app case, the Markdown case, the `--all` line or the unterminated last line broken; `build/ci-workflow.test.ts` (`skip only on an explicit false …`), red with a job on `== 'true'`; manual run `45011093662` ran every job and skipped deploy; the classifier on a pull request's files is observed in this pull request's run                                                                                                                                                             |
| S6       | observed locally: a staged file with bad formatting was rewritten and re-staged; `git commit` with an `any` in `build/` was refused by the root's ESLint, and one in `apps/editor/src/` by the editor's; a push of a commit with a type error to a scratch remote was refused by `pnpm typecheck`                                                                                                                                                                                                                                                                |
| S7       | zizmor's `dependabot-cooldown` audit in the Repository job (every entry ≥ 7 days); the first monthly run of the pnpm entry, observed when it comes                                                                                                                                                                                                                                                                                                                                                                                                               |
| S8       | the comparison in `docs/operations/protecting-main.md`, run after the owner applies the ruleset                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S9       | the root `AGENTS.md` (_Delivery_)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

Observed after the cut-over on 2026-11-22. The owner merged the pull request (`1e91882`)
at 12:05:05Z, and at the owner's request the delivering agent applied the ruleset with
the runbook's `POST` at 12:05:48Z (ruleset `27839907`); the owner unticked rebase merging
and turned on Dependabot security updates.

- **S1**: GitHub accepted every parameter, and lists deletion, non-fast-forward,
  required signatures, pull request and required status checks as active on `main`
  (`gh api repos/…/rules/branches/main`); the branch reads protected, and the owner's
  `current_user_can_bypass` reads `pull_requests_only`. No push to `main` was tried,
  since a failure would have landed on it.
- **S2**: the next pull request (#232, rebased onto `1e91882`) reads `BLOCKED` with
  `REVIEW_REQUIRED` after its _CI result_ passed, and the repository allows only squash
  merges.
- **S5**: the merge's run on `main` (Actions run `45020462213`) ran every job, and deploy
  published the site (200 at `/roadmaps/`); #232's run skipped both editor jobs for its
  Markdown-only change, and _CI result_ passed.
- **S6**: a fresh clone got no hooks from `pnpm install` once the machine's pnpm store
  held lefthook: DEF-028, fixed in its own pull request.
- **S7**: Dependabot ran on the merge and raised the grouped pnpm pull request (#233, 14
  updates) and `@playwright/test`'s own (#234), so the pnpm entry reads pnpm 12's
  lockfile. These pull requests do not show whether a younger version was held back. Its
  security run for an existing alert on `minimatch`, a transitive dependency of ESLint,
  reported the update not possible: the packages that need it allow only up to 10.2.6,
  and the fix is 11.0.1.
- **S8**: the runbook's comparison of the live ruleset with the file printed an empty
  diff.
