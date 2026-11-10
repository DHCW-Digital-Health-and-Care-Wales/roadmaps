# S09 — Whole-repo verification, polish and final review

## Goal

Prove the acceptance criteria of the original brief end-to-end and leave the repo in a
production-grade state.

## Scope

- Fresh-clone style verification: `rm -rf node_modules dist && pnpm install --frozen-lockfile`
  then every script including `pnpm test:e2e`.
- Run `pnpm dev` and drive the app with Playwright (headless) to capture screenshots of:
  landing (light + dark, desktop + 375px mobile), connected roadmap grid (faked), loading
  skeletons, error state, detail page, and the landing + grid in Welsh (check for
  overflow from longer Welsh strings). Inspect them and fix visual/UX issues.
- With the **real** GIS script (no faking), click "Connect Google" and confirm a popup to
  `accounts.google.com` opens with the correct `client_id` and `scope`. Do not attempt to
  complete auth. Report honestly what was and was not verified.
- Whole-codebase review for duplication, dead code, layering violations, naming, a11y,
  unnecessary dependencies (`pnpm why`, unused deps check e.g. `knip` run ad hoc — do not
  add it permanently unless justified).
- Final Sol review of the whole repository (not just the diff); address all findings.
- Update backlog statuses, README accuracy, AGENTS.md handoff.

## Acceptance criteria

- [ ] Every item in the brief's §14 is checked off in this file with evidence.
- [ ] Screenshots saved under the scratch area referenced in the handoff (not committed).

## Orchestrator notes carried forward (from S05 screenshot review)

- At 375px the header hides the product name and shrinks the connection status to a bare
  dot, while the header **and** hero both show "Connect Google". Consider keeping a short
  product name visible on mobile and avoiding the duplicated primary CTA on the welcome
  state (e.g. hide the header auth button on mobile while the hero CTA is on screen),
  without losing an accessible status label.
- Main JS chunk is ~580 kB (Vite warning). Investigate: TanStack Router
  `autoCodeSplitting`, lazy-loading the detail route, and checking for accidentally bundled
  dev-only code. Fix the cause rather than raising `chunkSizeWarningLimit`.
