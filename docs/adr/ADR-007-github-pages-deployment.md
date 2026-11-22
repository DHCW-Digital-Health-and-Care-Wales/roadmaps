# ADR-007: Static deployment to GitHub Pages

- Status: Accepted
- Date: 2026-11-10 (amended in STY-008: artifact built by Verify, base-path guard, no CNAME,
  SHA-pinned actions, Node 26; STY-009: vendor chunks; later: docs-only PRs run a Docs job;
  STY-085: the base path `/roadmaps/`)

## Decision

- GitHub Actions: one workflow file for CI (PRs + pushes to `main`): checkout, Node LTS,
  pnpm (via `pnpm/action-setup`, version from `packageManager`), `pnpm install
--frozen-lockfile`, typecheck, lint, format check, unit tests, build, E2E. On pushes to
  `main` only, `verify` also runs `actions/configure-pages` and
  `actions/upload-pages-artifact`, and a `deploy` job that `needs` both check jobs runs
  `actions/deploy-pages`. Permissions: `contents: read` globally; `pages: write`,
  `id-token: write` on the deploy job only. `concurrency: pages` (no cancel-in-progress
  for deploys). Details in the STY-008 amendments below.
- A pull request whose changed files are all Markdown or under `docs/` runs a `docs` job
  (format check and the Markdown tests) instead of `verify` and `e2e`; a `changes` job
  decides. Pushes to `main` and manual runs always run the full suite, so every deploy
  is fully checked.
- Vite `base` resolution, in order: explicit `VITE_BASE_PATH`; else `/` if the
  `PAGES_CUSTOM_DOMAIN` repository variable is set (a custom domain); else derived from
  `GITHUB_REPOSITORY` (`owner/owner.github.io` -> `/`, otherwise `/<repo>/`); else `/`.
  No `CNAME` file is written (see below).
- Public config (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_SPREADSHEET_ID`) is committed in
  `apps/editor/.env.production` (public values, not secrets) with the same values in `apps/editor/.env.example`;
  validated at startup with Zod. `.env` / `.env.local` are git-ignored. No GitHub Secrets.

### STY-008 amendments

- **Who builds the artifact**: `verify` builds, and on pushes to `main` it also runs
  `configure-pages` and `upload-pages-artifact`. `deploy` only runs `deploy-pages`: no
  checkout, no `pnpm install`, so no project or third-party code ever runs with
  `pages: write` + `id-token: write`. Permissions: `contents: read` at the top;
  `verify` adds `pages: read` (`configure-pages` reads the site URL); `e2e` keeps the
  default; `deploy` has only `pages: write` + `id-token: write`.
- **Base path**: the resolver is `apps/editor/build/resolve-base-path.ts` (unit-tested), used by both
  `apps/editor/vite.config.ts` and `apps/editor/playwright.config.ts`. `GITHUB_REPOSITORY` is always set in
  Actions, so the E2E job tests the production base path (`/roadmaps/`) and local
  runs use `/`. `VITE_BASE_PATH` wins over `PAGES_CUSTOM_DOMAIN`. Blank values count as
  unset, since Actions expands an unset variable to `""`.
- **`configure-pages` `base_path`** is a guard, not an input: after the build, `verify`
  checks that `apps/editor/dist/index.html` loads assets from `<base_path>/assets/` and fails before
  deploying if not (for example, a custom domain configured in Settings but no
  `PAGES_CUSTOM_DOMAIN` variable). Feeding it into the build instead would make the
  deployed base differ from the one E2E and local builds use.
- **No `CNAME` file**: GitHub ignores `CNAME` for Actions-based Pages deployments; the
  custom domain is set in Settings → Pages. `PAGES_CUSTOM_DOMAIN` only drives the base
  path.
- **Triggers**: `pull_request`, `push` to `main`, `workflow_dispatch`. Only a push to
  `main` deploys; a manual run checks without deploying (re-run a `main` run to
  redeploy; each attempt uploads a Pages artifact named for the attempt and `deploy` takes
  the name from `verify`'s output, because `deploy-pages` rejects duplicate names).
  Workflow concurrency is per PR/ref. It cancels running PR checks only; on `main` a
  newer push replaces a still-pending run (GitHub keeps one pending run per group), so
  the latest commit deploys and deployments stay in commit order. The deploy job also
  holds `concurrency: pages` without cancelling. (`concurrency.queue: max` could keep
  every `main` run, but actionlint 1.7.12 does not accept it yet, and latest-wins suits
  a deploy.)
- **Supply chain**: actions are pinned to full commit SHAs (version in a comment), and
  Dependabot (`.github/dependabot.yml`) proposes updates monthly. `pnpm/action-setup` +
  `actions/setup-node` are kept over the newer all-in-one `pnpm/setup` for now; both are
  maintained.
- **Node**: CI uses `.nvmrc`, which tracks the Active LTS line (26 since 2026-10-28).
  `engines` still accepts 22.22+/24.15+ for local development.

### STY-009 amendment

- **Long-lived chunks**: `apps/editor/vite.config.ts` splits the build into `react` (React, ReactDOM,
  scheduler), `vendor` (every other dependency) and the app's own chunks
  (`build.rolldownOptions.output.codeSplitting.groups`; TanStack Router's
  `autoCodeSplitting` already makes each route lazy). Pages serves assets with
  content-hashed names, so a deploy that changes only app code costs returning visitors
  about 48 kB of JavaScript instead of all ~650 kB, and no chunk reaches Vite's 500 kB warning.
  The warning limit is not raised. Zod is imported as `zod/mini` (ADR-002), which saved
  about 63 kB.

### STY-085 amendment

- **Base path `/roadmaps/`**: the repository is renamed `roadmaps` (ADR-016), so the
  editor deploys under `/roadmaps/` instead of `/roadmaps-editor/`. The resolver is
  unchanged: the new path still comes from `GITHUB_REPOSITORY`, and no path is written
  into code or a workflow. The old address gets no redirect (ADR-016 _Rejected_); the
  origin, and so the OAuth client's Authorised JavaScript origins, are unchanged.

## Consequences

The production origin `https://<owner>.github.io` (or the custom domain) must be added to
the OAuth client's Authorised JavaScript origins in Google Cloud.
