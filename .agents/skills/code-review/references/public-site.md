# Code review lenses: Public site

Lenses for a diff touching `apps/public-site/`. Apply them in `../SKILL.md`'s
working order, and grade and report findings as it sets. Baseline contracts live
in `apps/public-site/AGENTS.md`; this file focuses on failure modes CI cannot
catch.

- **Prerender vs hydration drift.** Trace changed pages through both
  `apps/public-site/src/entry-server.tsx` and browser hydration: check that
  every route renders cleanly with JavaScript off, that formatted counts or
  dates produce identical markup in Node and the browser, and that links respect
  the `/product-roadmaps/` base path (`apps/public-site/src/lib/router.ts`).
- **Sheet-sync resilience.** A sync failure blocks the nightly deploy. Check
  that parsers in `apps/public-site/scripts/` tolerate missing optional columns,
  extra columns and malformed cells without crashing, report sheet mistakes with
  row numbers, and never write or commit live data outside ignored
  `apps/public-site/.data/`.
- **Welsh accuracy and `<ContentText>`.** TypeScript checks catalogue key
  parity, not translation quality: check all six Welsh plural forms and numeral
  mutations, verify roadmap content renders through `<ContentText>` so English
  fallback carries `lang="en"`, and keep public-reader vocabulary free of
  editor terms.
- **Privacy and bundle regressions.** Check that no new cookie, tracker or
  third-party call enters the bundle (keeping `apps/public-site/index.html`'s
  Simple Analytics script in step with `infoPages.privacy`), and flag avoidable
  dependencies or client JS growth against the 100 KB budget.
- **Snapshot and mobile coverage.** Inspect `apps/public-site/e2e/__snapshots__/`
  diffs line by line so an update never masks an unintended heading, link or
  landmark loss, and check that controls changing on phone widths carry `@both`
  or `@mobile-only` Playwright tags.
