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
  `apps/public-site/e2e/fixtures/roadmaps.json`, made from the workspace root's `fixtures/sheets/`;
  a build without a sync needs `ROADMAPS_DATA=e2e/fixtures/roadmaps.json`.
- Feedback goes to issues in `product-roadmaps`, through the link
  `apps/public-site/src/lib/links.ts` builds; keep it pointing there.

## Standards

- **Accessibility**: aim for WCAG 2.2 AA. Use semantic HTML, keep everything usable with
  a keyboard, and never rely on colour alone. Automated checks find only some problems,
  so check a UI change by hand at 320 px wide and 400% zoom too.
- **Welsh**: put interface text in the catalogues `apps/public-site/src/i18n/locales/en.ts`
  and `cy.ts`, read by property through `useStrings()`, and write it with the
  `copywriter` skill. The site carries no i18n library, to keep within its 100 KB script
  budget (ADR-008's amendments). Roadmap content stays sheet data, rendered with
  `<ContentText>`, which marks English shown in place of Welsh.
- **Privacy**: add no cookies, analytics or calls to third-party services. The one
  exception is the Simple Analytics script in `apps/public-site/index.html`, which the
  privacy note (`infoPages.privacy` in the catalogues) describes; keep the two in step.
- **Dependencies**: prefer none.

## Code conventions

Follow `apps/typescript-react-conventions.md`, the TypeScript and React conventions both
apps share.

## Tests

- The seams of the root guide's test rule, lowest first: a parsing or schema script in
  `apps/public-site/scripts/` or a helper in `apps/public-site/src/lib/`, a component, a
  page, `App`, then `entry-server` for the prerendered HTML.
- A Playwright spec holds only what a built site in a browser shows: pages with
  JavaScript off, navigation and the base path, the fonts rendered, focus and its ring,
  what is in view and what stays in place as the page scrolls or filters, controls that
  show only at some widths, reflow at 320 px and 400% zoom, errors in the console, the
  axe scans and the ARIA snapshots. Lighthouse holds performance.
- A Playwright test runs on desktop alone unless it is tagged: `{ tag: "@both" }` for
  what a phone changes (the menu button, the header's filter strip), `{ tag: "@mobile-only" }`
  for what only a phone has or holds best (the menu, 320 px reflow), as
  `apps/public-site/playwright.config.ts` filters by tag (`apps/public-site/e2e/tags.ts`).

## Commands and checks

- Run `pnpm site:sync` before `pnpm site:dev` or `pnpm site:build` against live data.
  The dev server renders in the browser only; to check the prerendered pages, build and
  `pnpm site:preview` with JavaScript off. A parallel worktree has its own ports
  (`pnpm worktree:info`).
- A change to page structure, links, headings or text fails the ARIA snapshots in
  `apps/public-site/e2e/__snapshots__/`. Regenerate them with
  `pnpm site:test:e2e e2e/structure.spec.ts --update-snapshots=changed`, or `=all` when
  you add elements (`changed` misses those), and check the diff shows only your change.
