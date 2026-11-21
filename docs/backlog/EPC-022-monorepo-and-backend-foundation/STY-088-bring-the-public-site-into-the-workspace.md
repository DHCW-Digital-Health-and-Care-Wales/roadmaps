# STY-088: Bring the public site into the workspace, still published at its address

- **Status**: Proposed — acceptance criteria written from the owner's STY-088 grilling
  (2026-11-21, D1–D7)
- **Type**: Refactor + Docs
- **Area**: CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-087 (hard)
- **Binding ADRs**: ADR-016 §The public site, ADR-007
- **Suggested model**: Opus — a history merge and a cross-repository cut-over

## Summary

The public site's code and history move into `apps/public-site`, on the workspace's
toolchain but keeping its own code conventions for now, and `product-roadmaps` keeps
publishing it at `/product-roadmaps/` from a nightly and manual build of this
repository's `main`. `product-roadmaps` is stripped to its deploy, its sheet check, the
public feedback template and a README for sheet editors. The spreadsheet format gets
one description. The public sees no change; adopting the editor's conventions is
STY-095.

## Scope

- **This repository:** the history merge, the toolchain change, the public site's CI
  jobs, root scripts and worktree ports, its guide, a root `CONTRIBUTING.md`, the merged
  format description, and ADR-007's amendment for publishing from `product-roadmaps`.
- **`product-roadmaps`:** one pull request there, merged after this one: the code and
  its CI go, and its deploy and sheet check build from this repository.
- **Owner steps**, named in the pull request: allowing merge commits in _Settings_ for
  the import's pull request, merging it through the bypass, then turning merge commits
  off again (D1); merging the `product-roadmaps` pull request; and a manual deploy run.

## Acceptance criteria

### S1: The public site's history arrives intact (D1)

**Given** `product-roadmaps` frozen at its head
**When** the import's pull request merges
**Then** `main` holds every one of its commits with its original SHA and signature, its
files under `apps/public-site/`, and `git log --follow` on a moved file reaches its
first commit
**And** the toolchain's reformat is a commit of its own, listed in
`.git-blame-ignore-revs`

### S2: The public sees the same site (D2)

**Given** the site built from `apps/public-site` on the workspace's toolchain (pnpm,
Node 26, the root Prettier style) with the same example data
**When** its output is compared with a build of `product-roadmaps`' frozen head
**Then** every page's HTML is the same, apart from asset hashes, under
`/product-roadmaps/`
**And** after the cut-over, a manual run of `product-roadmaps`' deploy publishes it from
this repository's `main`, observed live with the current sheet

### S3: product-roadmaps only deploys, checks the sheet and takes feedback (D3, D4)

**Given** the `product-roadmaps` pull request merged
**Then** it holds only its deploy and sheet-check workflows, the feedback issue
template, `CODEOWNERS`, `LICENSE` and a README for sheet editors
**And** its deploy runs nightly and by hand, with no push trigger, checks out this
repository's `main` at its head and builds `apps/public-site`; its build job holds no
Pages permission and its deploy job runs no project code (ADR-016)
**And** its sheet check checks out this repository the same way and reports as before
**And** its five open Dependabot pull requests are closed, and Dependabot there updates
only its Actions
**And** the site's _Give feedback_ link still opens an issue there, beside issue #25

### S4: The public site's checks run in CI by path

**Given** a pull request that changes `apps/public-site/`, the lockfile, the
workspace's configuration or a workflow
**When** CI runs
**Then** the public site's checks (typecheck, lint, unit tests, build), its E2E suite in
its Playwright container and Lighthouse run, each feeding _CI result_ (STY-087)
**And** Lighthouse runs from a pinned dev dependency, not `npx --yes`

### S5: Developers run the public site from the root

**Given** a fresh worktree
**When** a developer runs `pnpm site:sync`, then `site:dev`, `site:build`,
`site:test:e2e` or `site:lighthouse`
**Then** each runs the public site's script on the worktree's own ports
**And** the workspace-wide checks include the public site

### S6: One description of the spreadsheet format (D5)

**Given** the merged pull request
**When** anyone looks up the spreadsheet format
**Then** the root README holds the only description, merging the public site's _Sheet
format_ into it, and both apps' guides and `product-roadmaps`' README link to it

### S7: The public site's guidance folds into the repository's (D6)

**Given** the merged pull request
**Then** `apps/public-site/AGENTS.md` (with its `CLAUDE.md`) holds its content,
accessibility, Welsh and privacy rules and its interim code conventions until STY-095,
and the root guide's routing table names it
**And** its skills are not imported, its pull-request routine gives way to
implement-story, the code half of its `CONTRIBUTING.md` becomes a root
`CONTRIBUTING.md`, and its content half moves to `product-roadmaps`' README

## Decisions

- **D1** (agent, 2026-11-21, from ADR-016 and STY-087 D3): the import's pull request
  merges with a merge commit through the owner's bypass, merge commits allowed in the
  repository's settings for it alone, since the ruleset allows only squash.
- **D2** (owner, 2026-11-21, STY-088 grilling round 2): conventions → the import changes
  the toolchain only; the public site keeps its file names and its `strings.ts` with
  `<T>` until STY-095 converges it on the editor's. Over converging inside this story,
  which would mix a history merge with rewrites and lose the output comparison, or
  keeping two conventions for good. Shapes S2, S7.
- **D3** (owner, 2026-11-21, round 1): public feedback → stays in `product-roadmaps`,
  its template and issues with it, over moving it here beside the development issues.
  Shapes S3.
- **D4** (owner, 2026-11-21, round 1): what stays in `product-roadmaps` → its deploy,
  sheet check, feedback template, `CODEOWNERS`, `LICENSE` and a README for sheet
  editors that links to this repository for the code and the editor. Over leaving a
  frozen copy of the code there. Shapes S3.
- **D5** (owner, 2026-11-21, round 2): the format → one description, in the root README,
  over each app describing it. Shapes S6.
- **D6** (owner, 2026-11-21, round 1): its agent material → folded into this
  repository's, over moving it as it is. Shapes S7.
- **D7** (owner, 2026-11-21, confirmation): the shared `eslint.base.ts` and lifting the
  shared TypeScript conventions out of the editor's guide (STY-086 D6) move to STY-095,
  when the conventions are shared, over extracting them here (ADR-016 _STY-088
  amendments_).

## Starting point

Audited at `product-roadmaps` `2548219` on 2026-11-21:

- It is a Vite site prerendered by `scripts/prerender.ts` from `.data/roadmaps.json`,
  which `npm run sync` fetches from the sheet's public CSV export and never commits;
  tests and Lighthouse use `ROADMAPS_DATA=e2e/fixtures/roadmaps.json`. Its dev server
  middleware hard-codes `/product-roadmaps/`.
- npm, Node 24, Prettier with semicolons, single quotes and an 80-column width; 130
  files, 41 commits, all signed.
- Workflows: `ci.yml` (check, E2E, Lighthouse via `npx --yes @lhci/cli@0.15.1`),
  `deploy.yml` (push, nightly at 02:00 UTC, manual; build and deploy split) and
  `check-sheet.yml` (manual). Dependabot runs weekly for npm and Actions.
- `src/lib/links.ts` builds the feedback link from the repository's URL and its
  `roadmap-feedback.md` template.
- `index.html` loads Simple Analytics, the one third-party script its privacy rules
  allow.
- Its repository settings allow squash and rebase merges, not merge commits.

## Out of scope

- The editor's conventions for the public site, the shared ESLint base and the
  shared-convention lift: STY-095.
- One copy of the fixture CSVs: STY-089.
- The public site reading the API: a later epic (ADR-015).
