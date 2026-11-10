# STY-008 — GitHub Actions CI/CD, Pages base path, README

## Goal

Push-to-deploy on GitHub Pages and comprehensive documentation. See ADR-0007.

## Scope

- `vite.config.ts` base-path resolution per ADR-0007 in a small, unit-tested pure
  function (e.g. `build/resolve-base-path.ts`).
- `.github/workflows/ci.yml` (name e.g. "CI/CD"): triggers `pull_request`, `push` to
  `main`, `workflow_dispatch`; jobs `verify` (typecheck, lint, format:check, test, build),
  `e2e` (Playwright chromium with browser cache), `deploy` (only `push` to `main`, `needs`
  both; configure-pages -> build with base path -> upload-pages-artifact -> deploy-pages;
  `environment: github-pages` with URL output). Current major versions of
  `actions/checkout`, `actions/setup-node` (LTS, pnpm cache), `pnpm/action-setup`,
  `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages` —
  verify current majors. Least-privilege permissions; `concurrency` for pages; CNAME from
  `vars.PAGES_CUSTOM_DOMAIN` when set. Validate YAML (e.g. `actionlint` if available).
  _(As delivered, `verify` builds and uploads, `deploy` only deploys, and no `CNAME` is
  written: see the delivery notes below and ADR-0007's STY-008 amendments.)_
- `README.md` covering every item in the brief: overview, architecture (Mermaid diagram of
  layers + future adapter), tech choices, prerequisites, install, env config, Google Cloud
  setup (project, enable Sheets API, OAuth consent screen, OAuth client of type Web,
  authorised JavaScript origins — origins not paths: `http://localhost:5173`,
  `http://localhost:4173` optional, `https://collisdigital.github.io`), run locally,
  test/lint commands, GitHub Pages step-by-step (create repo, push, Settings -> Pages ->
  Source: GitHub Actions, add origin, open site, authorise, see roadmaps), troubleshooting
  (origin_mismatch / redirect_uri_mismatch, popup blocked, access_denied, 403 permission,
  404 spreadsheet, 429, unverified app warning, third-party cookies), repository
  abstraction explanation, how to add `ApiRoadmapRepository`, frontend-only nature and
  "Google Sheets permissions determine effective data access", note on full Sheets scope
  verification requirements, internationalisation (English/Welsh, how to add a string or a
  language, Welsh translations need review by a fluent speaker before public launch). Link ADRs and backlog.
- Update `AGENTS.md` commands/structure if anything drifted.

## Acceptance criteria

- [x] Base-path function tested for project pages, user pages, custom domain, override.
- [x] Workflow lints clean; build with `GITHUB_REPOSITORY=collisdigital/roadmaps-editor`
      produces asset URLs under `/roadmaps-editor/`.
- [x] All checks green.

## Delivery notes

- Evidence: `build/resolve-base-path.test.ts` (15 cases: project, user/org site
  case-insensitive, custom domain, override and normalisation, blank values, malformed
  input). actionlint 1.7.12 (+ shellcheck 0.11.0) clean. `GITHUB_REPOSITORY=collisdigital/roadmaps-editor pnpm build`
  emits `/roadmaps-editor/assets/…` for JS, CSS, fonts and the favicon; headless Chromium
  against `vite preview` at `http://localhost:4173/roadmaps-editor/` loaded all 7 assets
  from the base with no 4xx, and the full E2E suite (31) passed under that base on Node 26
  with `CI=true`.
- Deviation from the scope's deploy-job order (configure-pages → build → upload → deploy):
  `verify` builds and uploads, `deploy` only runs `deploy-pages`, so no project or
  third-party code runs with `pages: write`/`id-token: write`. `configure-pages`'
  `base_path` is used as a guard rather than a build input. No `CNAME` is written (GitHub
  ignores it for Actions deployments). All recorded in ADR-0007's STY-008 amendments.

## Review notes (Sol, gpt-6.1-sol)

1. Pages artifacts collide across re-runs (`deploy-pages` rejects duplicate names) —
   **fixed**: the artifact is named `github-pages-attempt-<n>` and `deploy` reads the name
   from a `verify` job output, so re-running only failed jobs works too.
2. Pending `main` runs can be replaced despite "never cancelled" wording — **docs fixed,
   behaviour kept**: `concurrency.queue: max` is rejected by actionlint 1.7.12 (a
   required check), and latest-wins is the right behaviour for deploys (the newest commit
   deploys, in order). Workflow comment, README and ADR-0007 now say so.
3. README misdescribed browser-language detection — **fixed**: the first supported
   language in the browser's list wins.
