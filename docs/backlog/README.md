# Backlog

Stories are delivered **sequentially**, each by a fresh delivery agent, on branch
`feat/bootstrap`, one commit per story. Each story is sized to fit one agent context.

| ID                                                | Story                                                                          | Depends on | Status |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- | ------ |
| [S01](S01-tooling-foundation.md)                  | Tooling foundation (Vite, TS, Tailwind v4, shadcn/Base UI, lint, test harness) | —          | Done   |
| [S02](S02-domain-and-google-sheets-repository.md) | Domain model, error model, Google Sheets client & repository                   | S01        | Done   |
| [S03](S03-google-identity-auth.md)                | Google Identity Services auth abstraction                                      | S01, S02   | Done   |
| [S04](S04-i18n-foundation.md)                     | Internationalisation foundation (English and Welsh)                            | S03        | Done   |
| [S05](S05-app-shell-routing-theme.md)             | Composition root, routing, app shell, theme, auth UI                           | S04        | Done   |
| [S06](S06-roadmaps-feature.md)                    | Roadmaps feature: query hooks, list, states, detail page                       | S05        | Done   |
| [S07](S07-e2e-tests.md)                           | Playwright E2E with faked GIS and Sheets API                                   | S06        | Todo   |
| [S08](S08-ci-cd-and-docs.md)                      | GitHub Actions CI/CD, Pages base path, README                                  | S07        | Todo   |
| [S09](S09-final-verification.md)                  | Whole-repo verification, polish and final review                               | S08        | Todo   |

Definition of done (every story): scope implemented; acceptance criteria ticked;
`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build` green (plus
`pnpm test:e2e` from S07); Sol review comments addressed; handoff entry added to root
`AGENTS.md`; committed.
