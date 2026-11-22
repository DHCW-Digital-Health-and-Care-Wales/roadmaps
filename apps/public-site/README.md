# DHCW product roadmaps: the public site

A bilingual (English / Cymraeg) GitHub Pages site that publishes DHCW product roadmaps,
at **<https://dhcw-digital-health-and-care-wales.github.io/product-roadmaps/>** (Alpha).
Look, feel and content model come from
[dhcw-vaccine-roadmap](https://github.com/DHCW-Digital-Health-and-Care-Wales/dhcw-vaccine-roadmap).

It is the `@roadmaps/public-site` package of the [roadmaps workspace](../../README.md),
beside the Roadmap Editor; run its commands from the repository root. The
[`product-roadmaps`](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps)
repository publishes it, and takes the public's feedback as issues.

Content is edited in a
[Google Sheet](https://docs.google.com/spreadsheets/d/1wuk_pK1LpfLKmdbg6WsY_qKeBC5lcN4rlsjqkAxtflw/edit)
shared as **Anyone with the link can view**, in the format the root README describes
([Spreadsheet format](../../README.md#spreadsheet-format)). The deploy downloads the
tabs at build time and bundles them into the site; the data is never committed
(`.data/roadmaps.json` is ignored). Visitors' browsers never contact Google.

- The first tab lists the roadmaps, one per row. The landing page shows them all. Other
  tabs are only read if a row on the first tab names them.
- A product's URL is `/product-roadmaps/<lang>/<sheet-name-as-slug>/`, where `<lang>` is
  `en` or `cy`, for example `/product-roadmaps/cy/choose-pharmacy/`. Renaming the tab
  (and its **Sheet** value) changes its URL. The site root sends visitors to the
  language they last chose, or Welsh if their browser prefers it, otherwise English
  (always English without JavaScript).
- The build prerenders every page in both languages to static HTML with its own title,
  description, Open Graph and `hreflang` tags, so the site works without JavaScript in
  English and Welsh, and link previews show the right roadmap.
- The data behind each roadmap is published at `/product-roadmaps/<slug>/roadmap.json`,
  for example `/product-roadmaps/choose-pharmacy/roadmap.json`, and each page links to
  it with `<link rel="alternate" type="application/json">`. Its shape is defined by
  [scripts/roadmap-schema.ts](scripts/roadmap-schema.ts) and is not yet versioned. Text
  fields are `{ "en": "…", "cy": "…" }`, with `cy` blank when there is no Welsh.

## Run locally

Set up the workspace first ([Getting started](../../README.md#getting-started)). Then,
from the repository root:

```sh
pnpm site:sync   # fetch the sheet into apps/public-site/.data/roadmaps.json (ignored)
pnpm site:dev
```

To preview roadmaps whose `Enabled` is not `Yes`, run
`pnpm site:sync --include-disabled`. Use it for local development only.

Open <http://localhost:5174/product-roadmaps/en/>; a parallel worktree has its own ports
(`pnpm worktree:info`). The spreadsheet ID is set in
[scripts/sync-roadmaps.ts](scripts/sync-roadmaps.ts); override it with the `SHEET_ID`
environment variable to test another sheet. To work offline, skip the sync and run
`ROADMAPS_DATA=e2e/fixtures/roadmaps.json pnpm site:dev`.

The dev server renders everything in the browser, so it shows a blank page without
JavaScript. To check the prerendered pages, run `pnpm site:build && pnpm site:preview`
(with the same `ROADMAPS_DATA` to work offline), open
<http://localhost:4174/product-roadmaps/> and turn off JavaScript in the browser (in
Chrome's DevTools, run the "Disable JavaScript" command).

The workspace's checks (`pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
`pnpm test`) include the site, and `pnpm site:typecheck`, `site:lint` and `site:test` run
its own; [CONTRIBUTING.md](../../CONTRIBUTING.md) says how to propose a change. CI runs
them, with two slower checks against a build of the example data in
[e2e/fixtures/roadmaps.json](e2e/fixtures/roadmaps.json), so sheet edits can't break
them:

- `pnpm site:test:e2e`: Playwright end-to-end, accessibility (axe, including colour
  contrast) and ARIA snapshot tests on desktop and mobile. Install the browser once
  with `pnpm --filter @roadmaps/public-site exec playwright install chromium`. CI uses
  the Playwright container the editor's E2E job uses
  ([the workflow](../../docs/operations/github-pages-deployment.md#the-workflow)).
- `pnpm site:lighthouse`: Lighthouse CI with score thresholds and size budgets in
  [lighthouserc.json](lighthouserc.json). Locally, point `CHROME_PATH` at a Chrome or
  Chromium binary.

`pnpm site:build` runs `vite build`, then [scripts/prerender.ts](scripts/prerender.ts)
writes `index.html` for the site root and for each language's landing page and
products, `404.html` and `sitemap.xml`. Set `SITE_URL` to change the address used in
canonical, `hreflang` and Open Graph URLs.

## Text shared by every roadmap

Text shared by every roadmap (intro, Now/Next/Later definitions, section headings), and
the categories' and organisations' Welsh names, descriptions, icons and colours, is in
[src/lib/content.ts](src/lib/content.ts); the sheet only picks a category or an
organisation. Interface text (headings, links and accessible names) is in
[src/lib/strings.ts](src/lib/strings.ts). [sheets/](sheets/README.md) has example CSVs
for bootstrapping a spreadsheet.

## Analytics

The site uses [Simple Analytics](https://www.simpleanalytics.com/), a privacy-first
service that sets no cookies and collects no personal data, to count visits. The script
is loaded from `scripts.simpleanalyticscdn.com` by the async `<script>` at the end of the
`<body>` in [index.html](index.html), so it is on every prerendered page. It also needs a
Simple Analytics website entry for the deployed domain; visits from `localhost` are
ignored. The privacy note in [src/lib/strings.ts](src/lib/strings.ts) describes this, so
keep the two in step. Nothing else is loaded from a third party.

## Sync and deploy

- `product-roadmaps`' deploy workflow builds and deploys the site nightly at 02:00 UTC
  (to pick up sheet edits and merged changes) and on demand (**Actions → Deploy to
  GitHub Pages → Run workflow** there). It checks out this repository's `main` at its
  head, runs `pnpm site:sync`, which fetches the sheet and checks it against
  [scripts/roadmap-schema.ts](scripts/roadmap-schema.ts), then `pnpm site:build`. If the
  fetch fails, finds no roadmaps or fails the check, nothing is deployed and the
  previous site stays live. Its build job holds no Pages permission, and its deploy job
  runs no code ([ADR-016](../../docs/adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md),
  [deploying](../../docs/operations/github-pages-deployment.md#the-public-site)).
- A pull request here never deploys: a change merged to `main` goes public at the next
  run. CI builds with the example data, so pull requests don't depend on the sheet.

GitHub pauses scheduled workflows after 60 days without repository activity, and
`product-roadmaps` sees little; re-enable the deploy from its Actions tab if that
happens.

The sheet must be shared as "Anyone with the link can view"; "Publish to web" is no
longer used.
