# Contributing

Thanks for helping improve DHCW's roadmaps: the Roadmap Editor (`apps/editor/`) and the
public site (`apps/public-site/`).

## Content or code?

- **Roadmap content** (cards, titles, dates, colours) lives in the Google Sheet, not in
  this repository. Product Leads edit it in the Roadmap Editor; sheet editors follow
  [product-roadmaps' README](https://github.com/DHCW-Digital-Health-and-Care-Wales/product-roadmaps#readme).
- **Feedback on a roadmap**: use the "Give feedback" link on the public site, which
  opens an issue in `product-roadmaps`.
- **Code, design, accessibility or interface text**: open a pull request here, as below.

## Making a change

1. Set up the workspace ([Getting started](README.md#getting-started)) and create a
   branch from `main` with a short descriptive name, for example `fix-focus-order`.
2. Make your change, and try it with the app's dev server
   ([the editor](apps/editor/README.md#getting-started),
   [the public site](apps/public-site/README.md#run-locally)).
3. Run the checks: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`, and
   the E2E suite of each app you changed (`pnpm editor:test:e2e`, `pnpm site:test:e2e`).
   CI runs the same checks, and the public site's Lighthouse budgets.
4. Open a pull request into `main` and fill in the template. Keep it small and focused
   on one change.
5. The code owner ([`.github/CODEOWNERS`](.github/CODEOWNERS)) reviews it, and the _CI
   result_ check must pass. It merges as a signed squash
   ([protecting main](docs/operations/protecting-main.md)).

A merged change to the editor deploys straight away. One to the public site goes public
at the next run of `product-roadmaps`' deploy, nightly at 02:00 UTC or by hand.

## Standards

- **Accessibility**: both apps aim for WCAG 2.2 AA. Use semantic HTML, keep everything
  usable with a keyboard, and don't rely on colour alone. Lint includes `jsx-a11y` rules
  and the tests run axe, but automated checks find only some problems, so check UI
  changes by hand too.
- **Welsh**: every piece of interface text has English and Welsh: the editor's in its
  catalogues (`apps/editor/src/i18n/locales/`), the public site's in
  [`strings.ts`](apps/public-site/src/lib/strings.ts). If you can't provide the Welsh,
  say so in the pull request so it can be translated before merging.
- **Tests**: add or update tests for changed behaviour. Each app's README says where
  they live.
- **Privacy**: the public site adds no cookies, analytics or third-party calls beyond the
  Simple Analytics script in [its `index.html`](apps/public-site/index.html).
- **Dependencies**: prefer none. Dependabot keeps existing ones up to date.
