# ADR-0007: Static deployment to GitHub Pages

- Status: Accepted
- Date: 2026-11-10

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

## Consequences

The production origin `https://<owner>.github.io` (or the custom domain) must be added to
the OAuth client's Authorised JavaScript origins in Google Cloud.
