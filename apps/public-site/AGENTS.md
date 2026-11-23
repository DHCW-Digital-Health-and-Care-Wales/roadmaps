# AGENTS.md — the public site

Rules for work under `apps/public-site/`, beside the root `AGENTS.md`. Paths are from the
repository root.

## What this is

The public face of DHCW's product roadmaps, read by the public in English and Welsh: a
static Vite and React site prerendered (`apps/public-site/scripts/prerender.ts`) from a
snapshot of the spreadsheet that `pnpm site:sync` fetches. It is published at
`/product-roadmaps/` by the `product-roadmaps` repository's deploy, nightly and by hand,
from `main` here (ADR-016, _The public site_), so a change merged here goes public at the
next run. The spreadsheet format it reads is the root README's _Spreadsheet format_.

## Content and data

- Roadmap content lives in the spreadsheet. Commit no data from it:
  `apps/public-site/.data/` is made by `pnpm site:sync` and ignored.
- Tests, the E2E suite and Lighthouse use the example data in
  `apps/public-site/e2e/fixtures/roadmaps.json`, made from `apps/public-site/sheets/`;
  a build without a sync needs `ROADMAPS_DATA=e2e/fixtures/roadmaps.json`.
- Feedback goes to issues in `product-roadmaps`, through the link
  `apps/public-site/src/lib/links.ts` builds; keep it pointing there.

## Standards

- **Accessibility**: aim for WCAG 2.2 AA. Use semantic HTML, keep everything usable with
  a keyboard, and never rely on colour alone. Automated checks find only some problems,
  so check a UI change by hand at 320 px wide and 400% zoom too.
- **Welsh**: put every piece of interface text in `apps/public-site/src/lib/strings.ts`
  with English and Welsh, rendered with `<T value={…} />` (or `tr()` for attributes); a
  test fails when Welsh is missing. Without the Welsh, say in the pull request what still
  needs translating.
- **Privacy**: add no cookies, analytics or calls to third-party services. The one
  exception is the Simple Analytics script in `apps/public-site/index.html`, which the
  privacy note in `strings.ts` describes; keep the two in step.
- **Dependencies**: prefer none.

## Code conventions

The site keeps its own conventions until it adopts the editor's (ADR-016): PascalCase
component files, its own ESLint config, and `strings.ts` with `<T>` in place of i18next.
Follow the file you are in, not `apps/editor/AGENTS.md`; the workspace's toolchain
(Prettier, pnpm, Node) applies as everywhere.

## Tests

- The seams of the root guide's test rule, lowest first: a parsing or schema script in
  `apps/public-site/scripts/` or a helper in `apps/public-site/src/lib/`, a component, a
  page, `App`, then `entry-server` for the prerendered HTML; a table-driven test is an
  `it.each`.
- A Playwright spec holds only what a built site in a browser shows: pages with
  JavaScript off, navigation and the base path, focus and its ring, what is in view and
  what stays in place as the page scrolls or filters, controls that show only at some
  widths, reflow at 320 px and 400% zoom, errors in the console, the axe scans and the
  ARIA snapshots. Lighthouse holds performance.
- A Playwright test runs on desktop alone unless it is tagged: `{ tag: "@both" }` for
  what a phone changes (the menu button, the header's filter strip), `{ tag: "@mobile-only" }`
  for what only a phone has or holds best (the menu, 320 px reflow), as
  `apps/public-site/playwright.config.ts` filters by tag (`apps/public-site/e2e/tags.ts`).

## Commands and checks

- Run `pnpm site:sync` before `pnpm site:dev` or `pnpm site:build` against live data.
  The dev server renders in the browser only; to check the prerendered pages, build and
  `pnpm site:preview` with JavaScript off. A parallel worktree has its own ports
  (`pnpm worktree:info`).
- A change here adds `pnpm site:test:e2e` and `pnpm site:lighthouse` to the gate before
  a pull request. Lighthouse locally needs `CHROME_PATH` set to a Chrome or Chromium.
- A change to page structure, links, headings or text fails the ARIA snapshots in
  `apps/public-site/e2e/__snapshots__/`. Regenerate them with
  `pnpm site:test:e2e e2e/structure.spec.ts --update-snapshots=changed`, or `=all` when
  you add elements (`changed` misses those), and check the diff shows only your change.
