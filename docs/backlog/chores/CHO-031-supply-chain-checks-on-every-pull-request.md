# CHO-031: Supply-chain checks run on every pull request, and leaked secrets are refused at push

- **Status**: Proposed — agreed in the identity and authorisation grilling (owner,
  2026-11-21, D14), to deliver beside STY-087
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: STY-087 (soft: both change `ci.yml` and `.github/dependabot.yml`;
  whichever lands second rebases); the `uv.lock` audit and cooldown wait for STY-090
- **Binding ADRs**: ADR-016 §Workspace tooling, §CI; ADR-017 §Tooling
- **Suggested model**: Sonnet — configuration with known shapes, observed in runs
- **Delivered**: _(add on delivery)_

## Summary

The repository is public and is about to gain a Python API, a second app and an
identity layer, but nothing checks its dependencies for known vulnerabilities, holds
back a just-published package version, scans the code statically beyond lint, or stops
a secret at push. ADR-016 adds actionlint, zizmor and Dependabot for pnpm and uv, and
ADR-017 ruff's `S` rules; this chore adds the rest, so the API's first dependencies
arrive under the checks (analysis
[identity and authorisation](../../analysis/identity-and-authorisation.md), F9 and
recommendation 34). Done means each check below runs on a pull request, or is a
repository setting that is on, observed once.

## Measurement

At commit `86afe40`, 2026-11-21 (`gh api repos/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor`
`--jq .security_and_analysis`, `.github/`):

| Area                         | Measurement                                                     | Verdict               |
| ---------------------------- | --------------------------------------------------------------- | --------------------- |
| Secret scanning              | enabled                                                         | keep                  |
| Push protection              | disabled                                                        | turn on               |
| Dependabot security updates  | disabled; `dependabot.yml` updates GitHub Actions only, monthly | turn on               |
| CodeQL                       | default setup not configured                                    | add                   |
| Dependency review on PRs     | none in `ci.yml`                                                | add                   |
| Lockfile vulnerability audit | none for `pnpm-lock.yaml`; no `uv.lock` yet                     | add                   |
| Release cooldown             | none in Dependabot, pnpm or uv                                  | add                   |
| Workflow lint                | none yet; ADR-016 adds actionlint and zizmor (STY-087)          | every zizmor audit on |

## Acceptance criteria

### S1: A secret pushed to the repository is refused

Secret scanning's push protection is on, and a test push of a provider-pattern secret
on a scratch branch is blocked; the run of it is recorded in Delivery.

### S2: A pull request that adds a vulnerable dependency fails

The dependency review action and an OSV audit of `pnpm-lock.yaml` (and `uv.lock`, once
STY-090 creates it) run on every pull request that changes a lockfile, and a known
vulnerable version fails the job; observed on a scratch pull request.

### S3: The code is scanned statically

CodeQL runs for JavaScript/TypeScript, GitHub Actions and, once the API exists, Python,
on pull requests and on `main`.

### S4: A just-published version waits before it is taken

Dependabot's `cooldown`, pnpm's `minimumReleaseAge` and uv's `exclude-newer` hold back a
newly published version for a set number of days, with the exceptions (security
updates) Dependabot allows; the settings are in the repository and the number of days
is stated beside them.

### S5: Dependabot raises security updates

Dependabot security updates are on, and `dependabot.yml` covers pnpm (and uv with
STY-090) as ADR-016 sets.

### S6: zizmor runs with every audit

zizmor, added by STY-087, runs with no audit disabled; any finding is fixed or carries
an inline justification.

## Decisions

- **D1** (owner, 2026-11-21, identity and authorisation grilling D14): a chore now,
  delivered beside STY-087, over folding it into STY-087 or deferring it to the API's
  first release.

## Out of scope

- Container image scanning, an SBOM and build provenance: with the first container
  build (EPC-023).
- Mutation testing.
