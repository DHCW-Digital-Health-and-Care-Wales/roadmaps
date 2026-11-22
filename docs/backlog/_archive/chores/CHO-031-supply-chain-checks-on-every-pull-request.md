# CHO-031: Supply-chain checks run on every pull request, and leaked secrets are refused at push

- **Status**: Done — S1 and S3 are observed once the owner turns on push protection
  and CodeQL's default setup (D3)
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none; it changes `ci.yml` and `.github/dependabot.yml`, as STY-087 and
  STY-090 do, so whichever lands later rebases
- **Binding ADRs**: none
- **Suggested model**: Sonnet — configuration with known shapes, observed in runs
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/239

## Summary

The repository is public and is about to gain a Python API, a second app and an
identity layer, but nothing checks its dependencies for known vulnerabilities, holds
back a just-published package version, scans the code statically beyond lint, or stops
a secret at push. STY-087 adds actionlint, zizmor and Dependabot for pnpm, STY-090
Dependabot for uv (ADR-016), and ADR-017 ruff's `S` rules; this chore adds the rest, for what the repository holds
when it is delivered, so the API's first dependencies arrive under the checks (analysis
[identity and authorisation](../../../analysis/identity-and-authorisation.md), F9). Done
means each check below runs on a pull request, or is a repository setting that is on,
observed once.

## Measurement

At commit `86afe40`, 2026-11-21 (`gh api repos/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor`
`--jq .security_and_analysis`, `.github/`):

| Area                         | Measurement                                                     | Verdict |
| ---------------------------- | --------------------------------------------------------------- | ------- |
| Secret scanning              | enabled                                                         | keep    |
| Push protection              | disabled                                                        | turn on |
| Dependabot security updates  | disabled; `dependabot.yml` updates GitHub Actions only, monthly | turn on |
| CodeQL                       | default setup not configured                                    | add     |
| Dependency review on PRs     | none in `ci.yml`                                                | add     |
| Lockfile vulnerability audit | none for `pnpm-lock.yaml`; no `uv.lock` yet                     | add     |
| Release cooldown             | none in Dependabot, pnpm or uv                                  | add     |

## Acceptance criteria

### S1: A secret pushed to the repository is refused

Secret scanning's push protection is on, and a test push of a provider-pattern secret
on a scratch branch is blocked; the run of it is recorded in Delivery.

### S2: A pull request that adds a vulnerable dependency fails

The dependency review action runs on every pull request that changes a lockfile and
fails on a known vulnerable version, observed on a scratch pull request. An OSV audit of
every lockfile the repository holds runs weekly and on `main`, so a vulnerability
disclosed in an existing dependency is found too.

### S3: The code is scanned statically

CodeQL runs for every language the repository holds (JavaScript/TypeScript and GitHub
Actions; Python once the API exists), on pull requests and on `main`.

### S4: A just-published version waits before it is taken

Dependabot's `cooldown`, pnpm's `minimumReleaseAge` (set in minutes) and, once the API
exists, uv's `exclude-newer` (with the uv version pinned, since relative values are
recent) hold back a newly published version for a stated number of days. A security
update younger than the window still lands: Dependabot's cooldown exempts security
updates, and pnpm's `minimumReleaseAgeExclude`, or a manual bump, covers its side.

### S5: Dependabot raises security updates

Dependabot security updates are on in the repository's settings.

## Decisions

- **D1** (owner, 2026-11-21, identity and authorisation grilling D14): a chore now,
  delivered beside STY-087, over folding it into STY-087 or deferring it to the API's
  first release.
- **D2** (owner, 2026-11-21, review of the EPC-022 story records, STY-087 D10):
  Dependabot's `cooldown` arrives with STY-087's pnpm entry, so S4's Dependabot part is
  STY-087's if it lands first; this chore keeps pnpm's `minimumReleaseAge` and uv's
  `exclude-newer`. Once STY-087 has landed, every CI job this chore adds feeds the _CI
  result_ gate (STY-087 S3), so S2's failing dependency review blocks a merge.
- **D3** (owner, 2026-11-21, review of the EPC-022 story records, STY-087 D9): agents
  never change repository settings, so push protection (S1), CodeQL's default setup
  (S3) and Dependabot security updates (S5) are owner steps the pull request names, and
  the delivery observes each once it is on.
- **D4** (owner, 2026-11-22, delivery question): the OSV audit is a workflow of its own
  outside _CI result_, over a `ci.yml` job in the gate as D2 worded it, on `main` and
  weekly or on pull requests too. A finding fails its own run and holds back no merge
  or deploy; ADR-016 gains a CHO-031 amendment for the second workflow.
- **D5** (owner, 2026-11-22, delivery question): GHSA-g3hv-75wg-m249 is recorded as
  [CHO-034](../../chores/CHO-034-every-package-takes-minimatch-11.md) and fixed in its
  own thread now, over accepting it until 2027-01-15 or leaving the audit failing;
  `osv-scanner.toml` ignores it until CHO-034 lands.

## Out of scope

- zizmor with every audit on, and Dependabot's pnpm and uv ecosystems: STY-087 and
  STY-090 (ADR-016).
- Container image scanning, an SBOM and build provenance: with the first container
  build (EPC-023).
- Mutation testing.

## Delivery

### Departures

- **S1, S3**: owner steps (D3). The pull request names them: push protection, and
  CodeQL's default setup, which GitHub offers for `actions` and
  `javascript-typescript` here and extends to Python once the API's first file lands.
  Each is observed once it is on, as the epic's delivery notes set: S1 by a test push
  of a provider-pattern secret to a scratch branch, S3 by CodeQL's first run on a pull
  request and on `main` (agent).
- **S2**: dependency review runs on every pull request, not only one that changes a
  lockfile: it compares GitHub's dependency graph of the base and the head, without a
  checkout, and passes in seconds when nothing changed. A manual run compares its
  commit with `main`, so the passing _CI result_ it posts on a pull request's commit is
  no weaker than the pull request's own (security review's final pass). It fails on development
  dependencies too (`fail-on-scopes`), since CI and every developer run them, and the
  action's own default fails on runtime ones only. It is pinned to v5.0.0, as v5.0.1 is
  younger than the actions' seven-day cooldown (agent).
- **S2**: dependency review reads GitHub's dependency graph, which here parses
  `pnpm-lock.yaml`, two YAML documents as pnpm 12 writes it, though GitHub's
  documentation says the graph detects no dependencies in that form. The SBOM lists
  607 packages, lockfile-only ones included, and the compare for #236 named lodash
  under `pnpm-lock.yaml`. Should the graph stop reading it, dependency review passes
  without seeing a change and Dependabot's alerts and security updates (S5) go quiet
  for every pnpm dependency, and the post-merge audit is the check left; the pull
  request asks the owner to accept this residual (agent).
- **S2**: the OSV audit is its own workflow, outside the gate (D4), and runs
  OSV-Scanner 2.7.1, pinned by version and checksum as actionlint is, with
  `--recursive`, so it finds `uv.lock` once the API adds it, and `--config`, since
  OSV-Scanner reads an `osv-scanner.toml` only beside each lockfile (a copy of the
  lockfile in a subfolder failed without it and passed with it). Its first run found
  GHSA-g3hv-75wg-m249 (minimatch 10.2.6, medium) under ESLint, typescript-eslint,
  eslint-plugin-jsx-a11y-x and shadcn's ts-morph; it is ignored until CHO-034 removes
  the entry, by 2027-01-15 at the latest (D5) (agent).
- **S4**: Dependabot's `cooldown` landed with STY-087 (D2). pnpm's
  `minimumReleaseAge` is 10,080 minutes, a week, matching it. To take a younger
  security fix, `minimumReleaseAgeExclude` names it and each young package it brings,
  each as `<name>@<version>`: pnpm refused an exclusion that named only the top-level
  package, and takes no name pattern with a version. pnpm 12 checks the lockfile
  against the setting on every install, `--frozen-lockfile` included, so CI refuses a
  lockfile entry younger than a week too (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`),
  Dependabot's security updates among them until they are excluded or age. uv's
  `exclude-newer` comes with the API, so STY-090's rough shape carries it (agent).

### Contract for dependents

- **A new lockfile** (STY-090's `uv.lock`) is audited weekly and on `main` without a
  change here; the public site's packages join `pnpm-lock.yaml` (STY-088). Dependency
  review covers each ecosystem GitHub's dependency graph reads.
- **A new dependency younger than a week** is refused by `pnpm add`
  (`ERR_PNPM_NO_MATURE_MATCHING_VERSION`), or resolves to an older version when the
  range allows one; a lockfile holding one fails every install, CI's included.
- **An accepted audit finding** goes in the root `osv-scanner.toml`, whichever
  lockfile it is in, with a `reason` and an `effectiveUntil`, never without an expiry.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | the owner turns on push protection; observed after, then added here                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S2       | scratch pull request #236 (lodash 4.17.20 in the editor's dev dependencies, closed and its branch deleted): _Dependency review_ failed on four advisories, and _CI result_ failed with `dependency-review: failure`; the OSV audit, triggered on that pull request for the test, failed on the same four and logged GHSA-g3hv-75wg-m249 as ignored. Manual CI runs after the job ran on them too: `45036783310` on this branch, Dependency review and _CI result_ passed; `45036786285` on a scratch branch adding the same lodash, both failed |
| S2       | the OSV audit's first run on `main` and its first weekly run, observed after the merge; locally, OSV-Scanner 2.7.1 found GHSA-g3hv-75wg-m249 in `pnpm-lock.yaml` (570 packages) and nothing else, then nothing once it was ignored; a copy of the lockfile in a subfolder was filtered only with `--config`; with `effectiveUntil` set in the past, the ignored finding failed the scan again                                                                                                                                                   |
| S3       | the owner turns on CodeQL's default setup; observed after, then added here                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S4       | locally, with `minimumReleaseAge: 10080`: `pnpm add typescript@7.1.0-dev.20261121.1` (published the day before) was refused, `pnpm add typescript@next` resolved `7.1.0-dev.20261115.1`, the newest at least a week old; `pnpm install --frozen-lockfile` and `pnpm install` left the lockfile unchanged; in a scratch project, `pnpm install --frozen-lockfile` of a lockfile holding the day-old version failed with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`                                                                                 |
| S5       | `gh api repos/DHCW-Digital-Health-and-Care-Wales/roadmaps --jq .security_and_analysis` on 2026-11-22: `dependabot_security_updates` enabled (turned on by the owner at STY-087's cut-over); Dependabot holds alert GHSA-g3hv-75wg-m249 open, with no update pull request, since no compatible fix exists                                                                                                                                                                                                                                        |
