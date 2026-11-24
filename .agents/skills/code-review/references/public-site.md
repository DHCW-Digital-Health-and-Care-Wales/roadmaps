# Code review lenses: Public site

Diff-inspection lenses for `apps/public-site/` (applied in `../SKILL.md`'s
working order). Baseline rules live in `apps/public-site/AGENTS.md`; focus here
on failure modes CI cannot catch.

- **Prerender vs hydration drift.** Trace changed pages through
  `apps/public-site/src/entry-server.tsx` and browser hydration: verify JS-off
  rendering, identical Node-vs-browser formatted counts/dates, and
  `/product-roadmaps/` base-path handling in `apps/public-site/src/lib/router.ts`.
- **Sheet-sync resilience.** Check parsers in `apps/public-site/scripts/` tolerate
  missing optional columns, extra columns and malformed cells without failing the
  nightly deploy, report sheet mistakes with row numbers, and keep live data in
  ignored `apps/public-site/.data/`.
- **Welsh quality and fallback.** Review new or edited Welsh strings (all six
  plural forms and numeral mutations), verify roadmap content uses the fallback
  wrapper (`apps/public-site/AGENTS.md`, _Standards_), and flag editor-only terms
  leaking into public-reader copy.
- **Privacy and bundle checks.** Trace imports, scripts and dependencies against
  `apps/public-site/AGENTS.md` (_Standards_: privacy, Simple Analytics /
  `infoPages.privacy` parity, and script budget).
- **Snapshot and mobile diffs.** Read `apps/public-site/e2e/__snapshots__/` diffs
  line by line so updates never mask unintended heading, link or landmark loss,
  and verify phone-diverging controls carry `@both` or `@mobile-only` tags.
