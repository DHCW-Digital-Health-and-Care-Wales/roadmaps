# EPC-001: Bootstrap

- **Status**: Done — every story delivered on `feat/bootstrap` and merged to `main` in #1.

The first build of Product Roadmaps: a static React SPA on GitHub Pages that connects a
Google account and lists the roadmaps in one spreadsheet. Its stories were delivered
sequentially, one commit each, before the current one-record-per-PR process; they keep
their original format, except that their IDs were renamed from `S01`–`S09` to
`STY-001`–`STY-009` when the backlog adopted prefixed IDs. The root `AGENTS.md` Handoff log records each story's contract for
later work.

## Stories

| ID                                                        | Story                                                                          | Depends on       | Status |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------- | ------ |
| [STY-001](STY-001-tooling-foundation.md)                  | Tooling foundation (Vite, TS, Tailwind v4, shadcn/Base UI, lint, test harness) | —                | Done   |
| [STY-002](STY-002-domain-and-google-sheets-repository.md) | Domain model, error model, Google Sheets client & repository                   | STY-001          | Done   |
| [STY-003](STY-003-google-identity-auth.md)                | Google Identity Services auth abstraction                                      | STY-001, STY-002 | Done   |
| [STY-004](STY-004-i18n-foundation.md)                     | Internationalisation foundation (English and Welsh)                            | STY-003          | Done   |
| [STY-005](STY-005-app-shell-routing-theme.md)             | Composition root, routing, app shell, theme, auth UI                           | STY-004          | Done   |
| [STY-006](STY-006-roadmaps-feature.md)                    | Roadmaps feature: query hooks, list, states, detail page                       | STY-005          | Done   |
| [STY-007](STY-007-e2e-tests.md)                           | Playwright E2E with faked GIS and Sheets API                                   | STY-006          | Done   |
| [STY-008](STY-008-ci-cd-and-docs.md)                      | GitHub Actions CI/CD, Pages base path, README                                  | STY-007          | Done   |
| [STY-009](STY-009-final-verification.md)                  | Whole-repo verification, polish and final review                               | STY-008          | Done   |

## Defects

None recorded.
