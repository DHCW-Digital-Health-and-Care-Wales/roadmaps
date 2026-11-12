# Deploying to GitHub Pages

How the app is built and published, and what to do by hand for a first deployment, a
fork or a custom domain. The decision behind it is
[ADR-007](../adr/ADR-007-github-pages-deployment.md).

## The workflow

`.github/workflows/ci.yml` (**CI/CD**) runs on pull requests, pushes to `main` and manual
dispatch:

```
verify ──┐   typecheck · lint · format:check · test · build
         ├──► deploy   (push to main only: deploy-pages → github-pages environment)
e2e ─────┘   Playwright (Chromium cached per Playwright version)
```

- `verify` and `e2e` run in parallel. On a push to `main`, `verify` also reads the Pages
  configuration, checks the build's base path against it and uploads `dist/` as the Pages
  artifact.
- `deploy` runs only after both pass, and only for pushes to `main`. It does not check
  out or install anything; it publishes the artifact `verify` uploaded. It alone has
  `pages: write` and `id-token: write`; everything else is read-only.
- A new push to a pull request cancels its running checks. On `main` a running workflow
  is never cancelled; a newer push replaces one that is still waiting, so the latest
  commit is what deploys. To redeploy without a new commit, re-run the latest `main`
  run (each attempt uploads its own artifact).
- The Playwright report (and traces of failed tests) is uploaded as an artifact of every
  run that was not cancelled.

No GitHub secrets are needed: the public config is committed in `.env.production`.

## First deployment

Done once for `collisdigital/roadmaps-editor`; repeat for a fork or a new repository.

1. **Create the repository** on GitHub. Make it public, or use a plan that supports
   Pages for private repositories.
2. **Enable Pages:** _Settings → Pages → Build and deployment → Source:_ **GitHub
   Actions**. Do this before the first push to `main`, or the first `verify` fails at
   "Read the Pages site configuration" (re-run it afterwards).
3. **Push** to `main`.
4. **Watch the run:** _Actions → CI/CD_. When `deploy` finishes, the run summary shows the
   site URL. The `github-pages` environment only accepts deployments from `main` by
   default; keep that rule.
5. **Add the origin in Google Cloud:** make sure `https://collisdigital.github.io` is in
   the OAuth client's Authorised JavaScript origins (step 5 of
   [Google Cloud setup](google-cloud-setup.md#setup)).
6. **Open** <https://collisdigital.github.io/roadmaps-editor/>, choose **Connect Google**,
   pick an account (a test user, if the app is External and in Testing) and allow access
   to Google Sheets.
7. **See your roadmaps:** one card per roadmap the spreadsheet's first tab lists
   ([Spreadsheet format](../../README.md#spreadsheet-format)).

## Base path

A project site is served from `https://<owner>.github.io/<repo>/`, so the build needs
Vite's `base` set to `/<repo>/`. `build/resolve-base-path.ts` decides it, in this order:

1. `VITE_BASE_PATH`, if set (normalised to `/…/`);
2. `/` if the `PAGES_CUSTOM_DOMAIN` repository variable is set;
3. from `GITHUB_REPOSITORY`: `/` for a user or organisation site (`owner/owner.github.io`),
   otherwise `/<repo>/`;
4. `/` (local development).

Playwright uses the same function for its `baseURL`, so CI's E2E run tests the app under
`/roadmaps-editor/` exactly as deployed. Before uploading, `verify` checks the built
`index.html` against the `base_path` that `actions/configure-pages` reports and fails on a
mismatch, rather than deploying a site whose assets 404. A fork deploys to
`/<fork-name>/` automatically, but needs its own OAuth client and spreadsheet in
`.env.production`.

## Custom domain

1. Configure the domain in _Settings → Pages → Custom domain_ (and its DNS records).
2. Add a repository variable `PAGES_CUSTOM_DOMAIN` with the domain (_Settings → Secrets
   and variables → Actions → Variables_). This makes the build use base `/`. No `CNAME`
   file is needed: GitHub ignores it for Actions deployments.
3. Add `https://<your-domain>` to the OAuth client's Authorised JavaScript origins.
4. Push to `main` (or re-run the latest `main` run).

## Troubleshooting

| Symptom                                               | Cause and fix                                                                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployed site is blank, assets 404                    | Base path mismatch, e.g. a custom domain without the `PAGES_CUSTOM_DOMAIN` variable. The `verify` job normally catches this ("Base path mismatch"). See [Base path](#base-path). |
| `verify` fails at "Read the Pages site configuration" | Pages is not enabled with source **GitHub Actions**. Enable it, then re-run.                                                                                                     |
