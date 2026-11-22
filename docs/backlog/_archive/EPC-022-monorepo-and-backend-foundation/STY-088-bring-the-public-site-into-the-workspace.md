# STY-088: Bring the public site into the workspace, still published at its address

- **Status**: Done — S1–S3 and S8 are observed after the owner's cut-over (Scope's owner
  steps)
- **Type**: Refactor + Docs
- **Area**: CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: STY-087 (hard)
- **Binding ADRs**: ADR-016 §The public site, ADR-007
- **Suggested model**: Opus — a history merge and a cross-repository cut-over
- **Delivered**: <PR URL>

## Summary

The public site's code and history move into `apps/public-site`, on the workspace's
toolchain but keeping its own code conventions for now, and `product-roadmaps` keeps
publishing it at `/product-roadmaps/` from a nightly and manual build of this
repository's `main`. `product-roadmaps` is stripped to its deploy, its sheet check, the
public feedback template and a README for sheet editors, and protected as `main` is
here. The spreadsheet format gets
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
  off again (D1); applying STY-087's ruleset to `product-roadmaps` and setting its
  default workflow token to read-only (D8); merging the `product-roadmaps` pull
  request; and a manual deploy run.

## Acceptance criteria

### S1: The public site's history arrives intact (D1)

**Given** `product-roadmaps` frozen at its head, the import branch cut from it
**When** the import's pull request merges
**Then** `main` holds every one of its commits with its original SHA and signature, its
files under `apps/public-site/`, and `git log --follow` on a moved file reaches its
first commit
**And** the toolchain's reformat is a commit of its own, listed in
`.git-blame-ignore-revs`
**And** the `product-roadmaps` pull request strips the code only while that
repository's `main` is still at the imported head, so no commit there is lost

### S2: The public sees the same site (D2)

**Given** the site built from `apps/public-site` on the workspace's toolchain (pnpm,
Node 26, the root Prettier style) with the same example data, its npm lockfile
converted with every resolved version kept (`pnpm import`), and a comparison of its
resolved versions with the final workspace lockfile recorded in Delivery
**When** its output is compared with a build of `product-roadmaps`' frozen head
**Then** every page's HTML is the same, apart from asset hashes, under
`/product-roadmaps/`
**And** after the cut-over, a manual run of `product-roadmaps`' deploy publishes it from
this repository's `main`, observed live with the current sheet

### S3: product-roadmaps only deploys, checks the sheet and takes feedback (D3, D4)

**Given** the `product-roadmaps` pull request merged
**Then** it holds only its deploy and sheet-check workflows, an Actions-only
`.github/dependabot.yml` with STY-087's cooldown, the feedback issue template, `CODEOWNERS`, `LICENSE` and a
README for sheet editors
**And** its deploy runs nightly and by hand, with no push trigger, checks out this
repository's `main` at its head and builds `apps/public-site`; its build job holds no
Pages permission and its deploy job runs no project code (ADR-016)
**And** its sheet check checks out this repository the same way and reports as before
**And** its five open Dependabot pull requests are closed, and Dependabot there updates
only its Actions
**And** the site's _Give feedback_ link still opens an issue there, beside issue #25

### S4: The public site's checks run in CI by path

**Given** a pull request that changes anything other than documentation or another
app's directory, as STY-087 S5 sets for the editor
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

### S8: product-roadmaps is protected as main is here (D8)

**Given** the `product-roadmaps` pull request merged and the owner's steps done
**Then** that repository's ruleset is STY-087's less the required check, which it has
no CI to report (squash only, signatures, the owner's bypass through pull requests
only, one code-owner approval of the last push), kept as a second reviewed JSON file in
this repository and compared with the live ruleset after the owner applies it, as
STY-087 S8 does
**And** its `CODEOWNERS` names only the owner, and its default workflow token is
read-only
**And** both workflows declare `permissions: contents: read` at the top, check out with
`persist-credentials: false`, and name this repository and `refs/heads/main`
literally
**And** both pass actionlint and zizmor with every audit before that pull request
merges, with the run recorded in Delivery

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
  editors that links to this repository for the code and the editor, with an
  Actions-only Dependabot file for its workflows. Over leaving a frozen copy of the
  code there. Shapes S3.
- **D5** (owner, 2026-11-21, round 2): the format → one description, in the root README,
  over each app describing it. Shapes S6.
- **D6** (owner, 2026-11-21, round 1): its agent material → folded into this
  repository's, over moving it as it is. Shapes S7.
- **D7** (owner, 2026-11-21, confirmation): the shared `eslint.base.ts` and lifting the
  shared TypeScript conventions out of the editor's guide (STY-086 D6) move to STY-095,
  when the conventions are shared, over extracting them here (ADR-016 _STY-088
  amendments_).
- **D8** (owner, 2026-11-21, review of this record): `product-roadmaps`, which decides
  what the public site publishes, gets the protection STY-087 gives `main` here, the
  owner its only code owner, a read-only default token, and workflows that name what
  they check out literally and pass the linters.
  Over keeping both code owners there, or accepting the weaker protection. Shapes S8.

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
  `check-sheet.yml` (manual). Dependabot runs weekly for npm and Actions. The
  workflows set `contents: read` themselves and check out without
  `persist-credentials: false`.
- Its ruleset has no signatures rule and no required checks, its bypass is the owner
  in mode `always`, its `CODEOWNERS` is `* @collisdigital @fireballxlV`, and its
  default workflow token is read-write. Its `github-pages` environment deploys only
  from `main`.
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

## Delivery

### Departures

- **S1**: the import branch is `product-roadmaps` at `2548219` plus one signed commit,
  `f6afeff`, that moves every file with `git mv` into `apps/public-site/`; the history
  merge is `1bdb320`. What the workspace provides (the workflows, `.nvmrc`, the Prettier
  settings, the licence) and what is not imported (the skills, the pull request
  template, `CODEOWNERS`, the feedback template, which stays in `product-roadmaps`) go
  in the next commit, and `CONTRIBUTING.md` moves to the root with `git mv` before it
  is rewritten, so `git log --follow` reaches each file's first commit (agent).
- **S2**: `pnpm import` of the npm lockfile gave a lockfile with every resolved version,
  which was grafted into the workspace's under `apps/public-site`, so pnpm kept those
  versions; a plain install would have taken the workspace's newer ones (react 19.3.1,
  lucide-react 1.70.0, tailwindcss 4.3.5). Of the 299 packages npm resolved, 227 keep
  their versions. The other 72 are development tools, each set by the workspace: the
  catalog's ESLint 10.15.0, typescript-eslint 8.72.1, Vitest 5.1.0, globals 17.14.0
  and `@playwright/test` 1.64.1, with their own dependencies; the minimatch overrides;
  and transitive packages pnpm shares with the editor's tree (`@babel/*` 7.29.13,
  browserslist 4.29.5, caniuse-lite 1.0.30001823 and their like). Every runtime
  dependency and the build's Vite, Tailwind and React plugin keep npm's versions. The
  root package's Vitest now resolves its Vite peer to 8.3.8 (was 8.3.6); the editor's
  tree is unchanged (agent).
- **S2**: the built CSS loses three utilities no page uses, `.contents`, `.inline` and
  `.table`: Tailwind's scan of the app's files had picked the words up from the
  workflows and skills that no longer sit in it. Every page's HTML is the same (agent).
- **S2**: both apps take `@playwright/test` from a new catalog entry (1.64.1), so their
  E2E jobs share one Playwright image, which `build/ci-workflow.test.ts` holds to one tag
  and digest; the site had 1.64.0 (agent).
- **S2**: the reformat also formats the site's Markdown, which its own Prettier
  configuration had ignored, and the root's `.prettierignore` takes its ARIA snapshots
  and build output (agent).
- **S4**: Dependency review failed `basic-ftp` 5.3.1, which `@lhci/cli` brings in
  through `proxy-agent` and `get-uri` 6; an override in `pnpm-workspace.yaml` raises it
  to the fixed 6.2.4 and up, as the workspace's other overrides do (agent).
- **S4**: the site's jobs are `site-verify`, `site-e2e` and `site-lighthouse`, its
  classifier output `site`; `site-verify` builds the example data (agent).
- **S5**: a worktree's slot gains `SITE_DEV_PORT` and `SITE_PREVIEW_PORT`
  (`apps/public-site/scripts/dev-ports.ts` reads them); without `.env.worktree` the site
  keeps 5174 and 4174, beside the editor's 5173 and 4173. The ports are read only when
  a dev or preview server starts, so a build or test run in a worktree set up before
  them still works, and `pnpm worktree:info` asks for setup again. Lighthouse's
  addresses carry the port, so `pnpm site:lighthouse` runs `lhci autorun` from a small
  script that passes them; `lighthouserc.json` keeps the rest (agent).
- **S5**: `site:` scripts also cover `site:preview`, `site:typecheck`, `site:lint` and
  `site:test`, which CI's jobs call. `pnpm build` builds the site from its last
  `pnpm site:sync`, or from `ROADMAPS_DATA=e2e/fixtures/roadmaps.json`, as its error
  says (agent).
- **S6**: the organisation codes' table moves from the site's `sheets/README.md` into
  the root README with the rest of the format, which the column tables, the categories,
  the Welsh columns and the sheet mistakes join, above the editor's reading and writing
  (agent).
- **S7**: `apps/editor/AGENTS.md` gains the pointer to the format S6 asks for; the root
  guide's "used only by DHCW staff" now applies to the editor alone, since the public
  site is in the workspace; the glossary's _Public site_ names its directory
  (agent).
- **S3**: `product-roadmaps` loses its pull request template and `.gitignore`, which
  S3's list leaves out. Its deploy keeps its concurrency, and neither workflow caches
  the pnpm store, since the deploy publishes what it builds (agent).
- **S1**: `.git-blame-ignore-revs` names the reformat by its SHA, which holds because
  the pull request merges with a merge commit (D1); a rebase of the branch rewrites it,
  and the entry with it (agent).

### Contract for dependents

- **The public site's commands** are the root's `site:` scripts; CI's `site-verify`
  calls `site:typecheck`, `site:lint`, `site:test` and `site:build` with
  `ROADMAPS_DATA=e2e/fixtures/roadmaps.json`, and `site-e2e` and `site-lighthouse` build
  that data themselves.
- **`scripts/ci/classify-changes.sh`** prints `site=` beside `editor=`; STY-089's shared
  fixtures need their own case, or a change to them under one app skips the other's
  jobs.
- **`@playwright/test`** is a catalog entry both apps take; its bump changes both E2E
  jobs' image, which `build/ci-workflow.test.ts` holds to one.
- **`.github/rulesets/product-roadmaps.json`** is `main.json` less the required check;
  `build/ci-workflow.test.ts` fails when the two drift.
- **Interim conventions**: the site keeps its PascalCase files, its ESLint config
  (`eslint.config.js`) and `strings.ts` with `<T>` until STY-095; the root
  `eslint.base.ts` comes with it (D7).
- **`product-roadmaps`' workflows** build whatever `apps/public-site` and the root
  `site:sync` and `site:build` scripts hold on `main`, with
  `pnpm install --frozen-lockfile --filter @roadmaps/public-site`; renaming either
  script or the package breaks the nightly deploy, outside this repository's CI.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | the branch: `git rev-list --count 2548219` reads 41 and each SHA is the original; `git log --follow` on `apps/public-site/index.html` reaches `485ca43`; `git blame --ignore-revs-file .git-blame-ignore-revs` on a reformatted file shows the original commits; observed on `main` after the owner merges it with a merge commit (Scope's owner steps)                                                                                                                                                                       |
| S2       | observed builds: `product-roadmaps` at `2548219` with npm, and `apps/public-site` with pnpm, from the example data: the same 15 HTML, JSON and XML files, none differing once asset hashes are masked, and the same JavaScript; with the sheet's snapshot of 2026-11-22 (23 roadmaps), the same 78 files, none differing; the lockfile comparison under _Departures_; the live site after the owner's manual deploy, observed after the cut-over                                                                              |
| S3       | the `product-roadmaps` pull request's tree (the seven files S3 lists); its deploy's commands run in a clean clone of this branch (install filtered to the site, `pnpm site:sync` of the live sheet, `pnpm site:build`), all passing; its Dependabot pull requests and a manual run, observed after the cut-over                                                                                                                                                                                                               |
| S4       | `scripts/ci/classify-changes.test.ts` (17 cases), red with the site's case removed, with the fail-closed line running only the editor, and with `--all` missing `site=true`; `build/ci-workflow.test.ts` (`needs every job that runs before it`), red with `site-lighthouse` left out of the gate's `needs`, and (`run in one Playwright image …`), red with one image changed; manual run `45065519837` ran `site-verify`, `site-e2e` and `site-lighthouse`, all passing, with Lighthouse from the pinned `@lhci/cli` 0.15.1 |
| S5       | `scripts/worktree/worktree.test.ts` (`writes each app's ports …`, `names each app's ports`, `asks for setup again …`), red against the old script; `apps/public-site/scripts/dev-ports.test.ts` (3 cases); `pnpm site:dev` served on this worktree's port 21062; the commit hook ran the site's ESLint on its staged files                                                                                                                                                                                                    |
| S6       | the root README's _Spreadsheet format_; `apps/public-site/README.md`, `apps/public-site/sheets/README.md`, `apps/public-site/AGENTS.md`, `apps/editor/AGENTS.md` and `product-roadmaps`' README link to it                                                                                                                                                                                                                                                                                                                    |
| S7       | `apps/public-site/AGENTS.md` and `CLAUDE.md`, the root guide's routing table, the root `CONTRIBUTING.md`, and `product-roadmaps`' README                                                                                                                                                                                                                                                                                                                                                                                      |
| S8       | `.github/rulesets/product-roadmaps.json` and `build/ci-workflow.test.ts` (`is main's, less the required status check`), red with a rule removed; `product-roadmaps`' workflows: actionlint 1.7.12 and zizmor 1.32.0 (`--persona auditor`, online), no findings, after naming every job and limiting the sheet check's concurrency; the comparison in `docs/operations/protecting-main.md`, run after the owner applies the ruleset                                                                                            |
