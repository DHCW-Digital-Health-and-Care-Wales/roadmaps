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
     `invalid-response`). A write the API refuses because part of what it changes is
     locked to this account, though the account may change the rest, is `protected`
     (STY-051): the Sheets client knows Google's by its message, as Google gives it no
     status of its own; an API gives it a status or a code of its own, or never
     answers so if it has no such lock;
   - Zod schemas for the responses;
   - `ApiRoadmapRepository implements RoadmapRepository`:
     - `listRoadmaps` maps each roadmap to the domain's `Roadmap` (ADR-009), in the
       API's order, with ids that are URL-safe slugs;
     - `listRoadmapItems` returns one roadmap's items as `RoadmapItem`s (ADR-011), each
       naming its organisations by `organisationIds` (below), and saying by
       `hasWelshTags` whether it holds any Welsh for its tags, paired with the English or
       not: the editor changes no tags that have Welsh (STY-037); `hasWelshDetails`
       says the same of its details (STY-039), which are written as `detailsValue`
       holds them, a line each at the level it shows at;
     - `listOrganisations` returns the organisations table as `Organisation`s (`id`,
       `code`, `shortName`, `name` in English and Welsh, and a `national` column, true
       for All Wales only), in any order: the screens sort them. Items link to it by
       `organisationIds` through a join table (ADR-014). Every id an item holds is in
       the list, so a code the list doesn't hold never reaches `organisationIds`; the
       Sheets adapter keeps such codes as `unknownOrganisationCodes`, which the API can
       leave empty. A list that can't be read rejects with an `AppError`, which a
       roadmap's page shows as its load failure;
     - `listFamilies` and `listCategories` return the family and category tables, in
       their order, as `Family` and `Category` (ADR-013); `listRoadmaps` links each
       roadmap to them by `familyId` and `categoryId`, taking the family's name and
       colour and the category's name. With keys, nothing is out of step:
       `outOfStep` and `familyNotListed` stay `false`, and a missing table is `null`
       only if the API can lack one;
     - `publishRoadmapChanges` writes one roadmap's changes all or nothing and refuses
       on a co-lead's change (ADR-012). `planRoadmapPublish` and `heldWrites`
       (`src/domain/roadmap/publish-plan.ts`) are the rules both current repositories
       share; reuse them unless the API enforces them itself. A chosen `familyId` or
       `categoryId` is resolved from the API's own tables, and an ID they don't hold,
       or one chosen while its table is missing, is rejected with `invalid-data`
       (STY-028). An item's chosen `organisationIds` replace its join rows as a set;
       the snapshot's `organisationIds` are the organisations table's ids, and the plan
       rejects any other with `unknown` (STY-034). A published move also puts the item
       last in its new placement: `listRoadmapItems` then returns it after every other
       item of that placement, and several moved into one in the order they were
       moved. The plan's `moves` say which items go where among the roadmap's items
       (`planItemMoves`, `movedItems` in `src/domain/roadmap/item-moves.ts`); an API
       that stores each item's position writes those positions in the same
       transaction as the placement, and needs no row to move (STY-051). A placement's
       pending order (`RoadmapChanges.orders`, STY-050) is published the same way:
       the plan settles it against the snapshot, reports a co-lead's change to the
       placement's items as an `OrderConflict` among the refusal's `conflicts`, and
       gives the order to write as `moves`, a new item that is not last with the item
       it goes `before`, and `PublishWrites.orders`, each placement's items once
       written, by ID. An API that stores positions writes each placement's from
       `orders` and ignores the moves; `listRoadmapItems` then returns the placement's
       items in that order. `heldWrites` judges a lost answer by those IDs, so the
       API's ids must be the ones the plan gave: an item's own, and a new item's the
       one it was added with. An item with no ID is found by what it held
       (`findOrderedItems`), which an API whose items always have ids never needs;
     - `addRoadmap` adds a roadmap and its empty list of items together or not at
       all, not published (STY-040). `planNewRoadmap` and `settleLostNewRoadmap`
       (`src/domain/roadmap/new-roadmap.ts`) are the rules both current repositories
       share; the short name is the roadmap's key, unique by its address
       (`shortNameAddress`), and `names` are whatever else the API keeps under a name
       (none, if roadmaps alone have one). The Sheets adapter copies a `Template` tab
       and rejects with `invalid-data` without a usable one; an API that needs no
       template never does. A lost answer is settled by something only that write
       made, such as a key the client chose, never by the short name or the values;
   - an `index.ts` barrel. The existing ESLint rules already keep this folder away from
     React, TanStack and features.
2. **Contract test.** In `api-roadmap-repository.test.ts`, run the shared contract
   (`src/domain/roadmap/testing/roadmap-repository-contract.ts`) against an MSW fake of
   the API, then add tests for each status mapping. `withRoadmaps(roadmaps, items?,
options?)` seeds the fake with roadmaps, their items, and how a publish's write
   behaves (`ContractWrite`: fails, or its answer is lost), whose items cannot be
   read (`unreadableItems`), the `families` and `categories` lists (by default those
   the roadmaps link to; `null` for none), names kept for something other than a
   roadmap (`otherNames`), and a data source with nothing to start a roadmap from
   (`noStartingPoint`), which an API that needs no template fakes as whatever makes it
   answer so; `failing()` fails every
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
