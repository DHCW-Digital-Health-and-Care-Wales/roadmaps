# S07 — GitHub Actions CI/CD, Pages base path, README

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
  verification requirements. Link ADRs and backlog.
- Update `AGENTS.md` commands/structure if anything drifted.

## Acceptance criteria

- [ ] Base-path function tested for project pages, user pages, custom domain, override.
- [ ] Workflow lints clean; build with `GITHUB_REPOSITORY=collisdigital/roadmaps-editor`
      produces asset URLs under `/roadmaps-editor/`.
- [ ] All checks green.
