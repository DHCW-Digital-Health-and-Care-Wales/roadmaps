# Replacing Google Sheets with an HTTP API

Google Sheets is a temporary data source. The plan is a PostgreSQL-backed HTTP API
behind an `ApiRoadmapRepository`; the UI, hooks and routes do not change (ADR-002). The
port is `RoadmapRepository` in `src/domain/roadmap/roadmap-repository.ts`: read its
doc comments first, since they are the contract.

1. **Adapter.** Create `src/infrastructure/roadmaps-api/` with:
   - a small HTTP client that uses `fetch`, passes the caller's `signal` through, and maps
     failures to `AppError` kinds the same way the Sheets client does (401 →
     `unauthenticated`, 403 → `forbidden`, 404 → `not-found`, 429 → `rate-limited`, 5xx →
     retryable `unknown`, fetch failure → `network`, unparsable body →
     `invalid-response`);
   - Zod schemas for the responses;
   - `ApiRoadmapRepository implements RoadmapRepository`:
     - `listRoadmaps` maps each roadmap to the domain's `Roadmap` (ADR-009), in the
       API's order, with ids that are URL-safe slugs;
     - `listRoadmapItems` returns one roadmap's items as `RoadmapItem`s (ADR-011);
     - `listFamilies` and `listCategories` return the family and category tables, in
       their order, as `Family` and `Category` (ADR-013); `listRoadmaps` links each
       roadmap to them by `familyId` and `categoryId`, taking the family's name and
       colour and the category's name. With keys, nothing is out of step:
       `outOfStep` and `familyNotListed` stay `false`, and a missing table is `null`
       only if the API can lack one;
     - `publishRoadmapChanges` writes one roadmap's changes all or nothing and refuses
       on a co-lead's change (ADR-012). `planRoadmapPublish` and `heldWrites`
       (`src/domain/roadmap/publish-plan.ts`) are the rules both current repositories
       share; reuse them unless the API enforces them itself;
   - an `index.ts` barrel. The existing ESLint rules already keep this folder away from
     React, TanStack and features.
2. **Contract test.** In `api-roadmap-repository.test.ts`, run the shared contract
   (`src/domain/roadmap/testing/roadmap-repository-contract.ts`) against an MSW fake of
   the API, then add tests for each status mapping. `withRoadmaps(roadmaps, items?,
options?)` seeds the fake with roadmaps, their items, and how a publish's write
   behaves (`ContractWrite`: fails, or its answer is lost), whose items cannot be
   read (`unreadableItems`), and the `families` and `categories` lists (by default those
   the roadmaps link to; `null` for none); `failing()` fails every
   request. The Google adapter's test is the worked example.
3. **Config.** Add e.g. `VITE_ROADMAPS_API_URL` to the Zod schema in
   `src/app/config.ts`, `.env.example` and `.env.production`.
4. **Swap it in** `composeApp` (`src/app/composition.ts`): construct
   `ApiRoadmapRepository` instead of `GoogleSheetsRoadmapRepository`. If the API accepts
   Google access tokens, pass `getAccessToken: authClient.getAccessToken`. If it has its
   own sign-in, write a new `AuthClient` adapter (the port is in `src/domain/auth/`) and
   swap it in the same place.
5. **Copy.** Some strings name the spreadsheet or Google Sheets, because that is what
   users must act on today. Search `src/i18n/locales/en.ts` for "spreadsheet" and
   "Google Sheets", and reword them in `en.ts` and `cy.ts`; no component changes.
6. **E2E.** Add a fake for the API to `tests/e2e/fixtures/` (the hermetic guard fails on
   any unfaked origin) and retire the Sheets fake when it is no longer used.
7. **Deploy.** The API must allow CORS from the Pages origin with the `Authorization`
   header. Record the change in an ADR that amends ADR-002, then delete
   `src/infrastructure/google-sheets/` once nothing uses it.
