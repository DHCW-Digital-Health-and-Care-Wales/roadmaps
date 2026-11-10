# Bootstrap

- **Status**: Done — every story delivered on `feat/bootstrap` and merged to `main` in #1.

The first build of Product Roadmaps: a static React SPA on GitHub Pages that connects a
Google account and lists the roadmaps in one spreadsheet. Its stories were delivered
sequentially, one commit each, before the current one-record-per-PR process; they keep
their original format. The root `AGENTS.md` Handoff log records each story's contract for
later work.

## Stories

| ID                                                | Story                                                                          | Depends on | Status |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- | ------ |
| [S01](S01-tooling-foundation.md)                  | Tooling foundation (Vite, TS, Tailwind v4, shadcn/Base UI, lint, test harness) | —          | Done   |
| [S02](S02-domain-and-google-sheets-repository.md) | Domain model, error model, Google Sheets client & repository                   | S01        | Done   |
| [S03](S03-google-identity-auth.md)                | Google Identity Services auth abstraction                                      | S01, S02   | Done   |
| [S04](S04-i18n-foundation.md)                     | Internationalisation foundation (English and Welsh)                            | S03        | Done   |
| [S05](S05-app-shell-routing-theme.md)             | Composition root, routing, app shell, theme, auth UI                           | S04        | Done   |
| [S06](S06-roadmaps-feature.md)                    | Roadmaps feature: query hooks, list, states, detail page                       | S05        | Done   |
| [S07](S07-e2e-tests.md)                           | Playwright E2E with faked GIS and Sheets API                                   | S06        | Done   |
| [S08](S08-ci-cd-and-docs.md)                      | GitHub Actions CI/CD, Pages base path, README                                  | S07        | Done   |
| [S09](S09-final-verification.md)                  | Whole-repo verification, polish and final review                               | S08        | Done   |

## Defects

None recorded.
