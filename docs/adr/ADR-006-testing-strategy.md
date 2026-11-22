# ADR-006: Testing strategy

- Status: Accepted
- Date: 2026-11-10

## Decision

- **Unit (Vitest)**: Zod parsing, mapping, hidden-sheet filtering, ordering, error
  categorisation, script loader, auth client state machine (with a fake `google` global).
- **Integration (Vitest + MSW)**: `GoogleSheetsRoadmapRepository` + `sheets-client`
  against MSW handlers for the real endpoint URL — covers headers, query string, and every
  HTTP failure category.
- **Component (Vitest + React Testing Library, jsdom)**: pages rendered with an in-memory
  `RoadmapRepository` and a fake `AuthClient` through a shared `renderWithProviders`
  test utility. Never touches Google.
- **E2E (Playwright, Chromium)**: runs against the production build (`vite preview`).
  `page.route` serves a fake `https://accounts.google.com/gsi/client` script that
  implements the subset of `google.accounts.oauth2` we use, and fulfils Sheets API
  requests. No real credentials, no OAuth popup.
- No in-app "mock mode": fakes live in tests only, keeping production code free of test
  switches.

## Consequences

CI is hermetic. Live Google integration must be verified manually (documented in `apps/editor/README.md`).
