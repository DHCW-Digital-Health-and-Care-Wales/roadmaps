# Deploying to GitHub Pages

How the editor is built and published, and what to do by hand for a first deployment, a
fork or a custom domain, then how the public site is published from `product-roadmaps`
([The public site](#the-public-site)). The decision behind it is
[ADR-007](../adr/ADR-007-github-pages-deployment.md).

## The workflow

`.github/workflows/ci.yml` (**CI/CD**) runs on pull requests, pushes to `main` and manual
dispatch:

```
repository ────────────────────┐   every run: format:check · the root's typecheck, lint, tests · skill script tests · knip · API types · actionlint · zizmor
dependency-review ─────────────┤   not on a push to main: a dependency added at a known vulnerable version
          ┌──► editor-verify ──┤   typecheck · lint · test · build
          ├──► editor-e2e ─────┤   Playwright, in Playwright's pinned image
changes ──┤                    │
          ├──► site-verify ────┤   the public site: typecheck · lint · test · build (example data)
          ├──► site-e2e ───────┤   the public site's Playwright, in the same image
          └──► site-lighthouse ┤   the public site's Lighthouse budgets
                               ▼
                           ci-result ──► deploy   (push to main only: deploy-pages → github-pages environment)
```

- `changes` classifies a pull request's files (`scripts/ci/classify-changes.sh`). An
  app's jobs skip only when every changed file is Markdown, under `docs/` or in another
  app's directory; any other file, a push to `main` or a manual run runs them.
- `repository` runs on every run, whatever changed.
- `dependency-review` runs on every pull request, and on a manual run against `main`,
  and fails when it adds or changes a dependency, development ones included, to a
  version with a known vulnerability. A
  vulnerability disclosed later in a merged dependency is found by the weekly
  **Dependency audit** (`.github/workflows/dependency-audit.yml`), an OSV-Scanner run
  over every lockfile, also on each push to `main`; it is outside the gate, so a
  finding there fails its own run but blocks no merge or deploy. A finding accepted for
  a while goes in `osv-scanner.toml`, with its reason and an expiry.
- `pnpm install --frozen-lockfile` fails when the lockfile holds a version published
  less than a week ago (`minimumReleaseAge` in `pnpm-workspace.yaml`), so a security
  update younger than that needs its versions in `minimumReleaseAgeExclude` first.
- `ci-result` (_CI result_) runs after every other job, whatever they did, and fails if
  any failed or was cancelled; a job skipped by its paths or its event passes. It is the
  one check `main`'s ruleset requires ([protecting main](protecting-main.md)), so a new
  job joins its `needs`, or the Repository job's tests fail.
- `editor-verify` and `editor-e2e` run in parallel. On a push to `main`,
  `editor-verify` also reads the Pages configuration, checks the build's base path
  against it and uploads `apps/editor/dist/` as the Pages artifact.
- `editor-e2e` and `site-e2e` run in `mcr.microsoft.com/playwright:v<version>-noble`, pinned by digest, which holds
  that version's Chromium and its system packages, so the jobs install neither. Both
  apps take `@playwright/test` from the catalog in `pnpm-workspace.yaml`, and a test
  holds the two jobs to one image. A
  `@playwright/test` bump changes the image tag and digest in `ci.yml` with it
  (`docker pull mcr.microsoft.com/playwright:v<version>-noble` prints the digest); the job's
  check step fails with that instruction when the image lacks the Chromium the installed
  Playwright needs.
- `deploy` runs only after `ci-result` and `editor-verify` pass, and only for pushes to
  `main`. Its condition names their results, with `!cancelled()`: with no status
  function GitHub's implicit `success()` skips a job whenever one before it skipped, as
  `dependency-review` does on a push (DEF-031). It does not check out or install
  anything; it publishes the artifact `editor-verify` uploaded. It alone has
  `pages: write` and `id-token: write`; everything else is read-only.
- A new push to a pull request cancels its running checks. On `main` a running workflow
  is never cancelled; a newer push replaces one that is still waiting, so the latest
  commit is what deploys. To redeploy without a new commit, re-run the latest `main`
  run (each attempt uploads its own artifact).
- The Playwright reports (and traces of failed tests) and the Lighthouse reports are
  uploaded as artifacts of every run that was not cancelled.

No GitHub secrets are needed: the public config is committed in `apps/editor/.env.production`.

## First deployment

Done once for `DHCW-Digital-Health-and-Care-Wales/roadmaps`; repeat for a fork or a
new repository.

1. **Create the repository** on GitHub. Make it public, or use a plan that supports
   Pages for private repositories.
2. **Enable Pages:** _Settings → Pages → Build and deployment → Source:_ **GitHub
   Actions**. Do this before the first push to `main`, or the first `editor-verify` fails at
   "Read the Pages site configuration" (re-run it afterwards).
3. **Push** to `main`.
4. **Watch the run:** _Actions → CI/CD_. When `deploy` finishes, the run summary shows the
   site URL. The `github-pages` environment only accepts deployments from `main` by
   default; keep that rule.
5. **Add the origin in Google Cloud:** make sure
   `https://dhcw-digital-health-and-care-wales.github.io` is in the OAuth client's
   Authorised JavaScript origins (step 5 of
   [Google Cloud setup](google-cloud-setup.md#setup)).
6. **Open** <https://dhcw-digital-health-and-care-wales.github.io/roadmaps/>,
   choose **Connect Google**, pick an account (a test user, if the app is External and in
   Testing) and allow access to Google Sheets.
7. **See your roadmaps:** one card per roadmap the spreadsheet's first tab lists
   ([Spreadsheet format](../../README.md#spreadsheet-format)).

## Base path

A project site is served from `https://<owner>.github.io/<repo>/`, so the build needs
Vite's `base` set to `/<repo>/`. `apps/editor/build/resolve-base-path.ts` decides it, in this order:

1. `VITE_BASE_PATH`, if set (normalised to `/…/`);
2. `/` if the `PAGES_CUSTOM_DOMAIN` repository variable is set;
3. from `GITHUB_REPOSITORY`: `/` for a user or organisation site (`owner/owner.github.io`),
   otherwise `/<repo>/`;
4. `/` (local development).

Playwright uses the same function for its `baseURL`, so CI's E2E run tests the app under
`/roadmaps/` exactly as deployed. Before uploading, `editor-verify` checks the built
`index.html` against the `base_path` that `actions/configure-pages` reports and fails on a
mismatch, rather than deploying a site whose assets 404. A fork deploys to
`/<fork-name>/` automatically, but needs its own OAuth client and spreadsheet in
`apps/editor/.env.production`.

## Custom domain

1. Configure the domain in _Settings → Pages → Custom domain_ (and its DNS records).
2. Add a repository variable `PAGES_CUSTOM_DOMAIN` with the domain (_Settings → Secrets
   and variables → Actions → Variables_). This makes the build use base `/`. No `CNAME`
   file is needed: GitHub ignores it for Actions deployments.
3. Add `https://<your-domain>` to the OAuth client's Authorised JavaScript origins.
4. Push to `main` (or re-run the latest `main` run).

## The public site

The public site (`apps/public-site/`) is published at
<https://dhcw-digital-health-and-care-wales.github.io/product-roadmaps/> by the
[`product-roadmaps`](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps)
repository, since GitHub Pages serves one site per repository and `deploy-pages`
publishes only to its own. Its `deploy.yml` runs nightly at 02:00 UTC and by hand
(_Actions → Deploy to GitHub Pages → Run workflow_ there), never on a push:

```
build (no Pages permission)                                          deploy
checkout roadmaps refs/heads/main ─► pnpm install ─► site:sync ─► site:build ─► upload ──► deploy-pages
```

- The build job checks out this repository's `main` at its head when the run starts,
  names that commit in the run's summary, fetches the sheet (`pnpm site:sync`, which
  lists sheet mistakes in the summary and fails on a fatal one) and builds. A merged
  change, like a sheet edit, goes public at the next run.
- The deploy job checks out and runs nothing but `deploy-pages`; it alone has
  `pages: write` and `id-token: write`. The `github-pages` environment there accepts
  deployments only from its `main`.
- Its `check-sheet.yml` runs the sync alone, for sheet editors, by hand.
- No secret or cross-repository trigger is involved (ADR-016 _Rejected_). GitHub pauses
  a public repository's scheduled workflows after 60 days without activity; re-enable
  the deploy from its Actions tab if that happens.
- Its workflows are linted by hand before a change there merges (actionlint, and zizmor
  with `--persona auditor`), as this repository's Repository job lints its own; its
  ruleset is `.github/rulesets/product-roadmaps.json`
  ([protecting main](protecting-main.md#product-roadmaps)).

## Troubleshooting

| Symptom                                                      | Cause and fix                                                                                                                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployed site is blank, assets 404                           | Base path mismatch, e.g. a custom domain without the `PAGES_CUSTOM_DOMAIN` variable. The `editor-verify` job normally catches this ("Base path mismatch"). See [Base path](#base-path). |
| `editor-verify` fails at "Read the Pages site configuration" | Pages is not enabled with source **GitHub Actions**. Enable it, then re-run.                                                                                                            |
