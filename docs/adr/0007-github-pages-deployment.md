# ADR-0007: Static deployment to GitHub Pages

- Status: Accepted
- Date: 2026-11-10 (amended in S08: artifact built by Verify, base-path guard, no CNAME,
  SHA-pinned actions, Node 26)

## Decision

- GitHub Actions: one workflow file for CI (PRs + pushes to `main`): checkout, Node LTS,
  pnpm (via `pnpm/action-setup`, version from `packageManager`), `pnpm install
--frozen-lockfile`, typecheck, lint, format check, unit tests, build, E2E. On pushes to
  `main` only, a deploy job that `needs` the checks uploads the build with
  `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`.
  Permissions: `contents: read` globally; `pages: write`, `id-token: write` on the deploy
  job. `concurrency: pages` (no cancel-in-progress for deploys).
- Vite `base` resolution, in order: explicit `VITE_BASE_PATH`; else derived from
  `GITHUB_REPOSITORY` (`owner/owner.github.io` -> `/`, otherwise `/<repo>/`); else `/`.
  A custom domain is supported by setting the `PAGES_CUSTOM_DOMAIN` repository variable,
  which forces base `/` and writes `CNAME` into the artifact.
- Public config (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_SPREADSHEET_ID`) is committed in
  `.env.production` (public values, not secrets) with the same values in `.env.example`;
  validated at startup with Zod. `.env` / `.env.local` are git-ignored. No GitHub Secrets.

### S08 amendments

- **Who builds the artifact**: `verify` builds, and on pushes to `main` it also runs
  `configure-pages` and `upload-pages-artifact`. `deploy` only runs `deploy-pages`: no
  checkout, no `pnpm install`, so no project or third-party code ever runs with
  `pages: write` + `id-token: write`. Permissions: `contents: read` at the top;
  `verify` adds `pages: read` (`configure-pages` reads the site URL); `e2e` keeps the
  default; `deploy` has only `pages: write` + `id-token: write`.
- **Base path**: the resolver is `build/resolve-base-path.ts` (unit-tested), used by both
  `vite.config.ts` and `playwright.config.ts`. `GITHUB_REPOSITORY` is always set in
  Actions, so the E2E job tests the production base path (`/roadmaps-editor/`) and local
  runs use `/`. `VITE_BASE_PATH` wins over `PAGES_CUSTOM_DOMAIN`. Blank values count as
  unset, since Actions expands an unset variable to `""`.
- **`configure-pages` `base_path`** is a guard, not an input: after the build, `verify`
  checks that `dist/index.html` loads assets from `<base_path>/assets/` and fails before
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

## Consequences

The production origin `https://<owner>.github.io` (or the custom domain) must be added to
the OAuth client's Authorised JavaScript origins in Google Cloud.
