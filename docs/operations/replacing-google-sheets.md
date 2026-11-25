# Replacing Google Sheets with an HTTP API

Google Sheets is a temporary data source. The plan is a PostgreSQL-backed HTTP API
behind an `ApiRoadmapRepository`; the UI, hooks and routes do not change (ADR-002), except
the sign-in flow that ADR-018 reshapes (step 4). The port is `RoadmapRepository` in `apps/editor/src/domain/roadmap/roadmap-repository.ts`: read its
doc comments first, since they are the contract.

The database behind the API is decided by ADR-015: scoped by tenant, keeping every
version as change sets and snapshots, with a private scratch, a shared draft and
publications. EPC-022 builds it and this adapter.

1. **Adapter.** Build on `apps/editor/src/infrastructure/roadmaps-api/`, which holds
   `toApiError`: a non-2xx answer as an `AppError`, by the envelope's code, mapped for
   every code the contract names, else by the status (ADR-017's amendments). Add:
   - a small HTTP client that uses `fetch`, passes the caller's `signal` through and
     gives each non-2xx answer to `toApiError`, then checks the signal, which
     `toApiError` does not; a fetch failure is `network`, and a success whose body
     can't be parsed `invalid-response`. A write the API refuses because part of what
     it changes is locked to this account, though the account may change the rest, is
     `protected` (STY-051): the Sheets client knows Google's by its message, as Google
     gives it no status of its own; an API gives it a status or a code of its own, or
     never answers so if it has no such lock;
   - the generated `zod/mini` schemas of `@roadmaps/api-types` for the responses, which
     only `infrastructure/` may import;
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
       (`apps/editor/src/domain/roadmap/publish-plan.ts`) are the rules both current repositories
       share; reuse them unless the API enforces them itself. A chosen `familyId` or
       `categoryId` is resolved from the API's own tables, and an ID they don't hold,
       or one chosen while its table is missing, is rejected with `invalid-data`
       (STY-028). An item's chosen `organisationIds` replace its join rows as a set;
       the snapshot's `organisationIds` are the organisations table's ids, and the plan
       rejects any other with `unknown` (STY-034). A published move also puts the item
       last in its new placement: `listRoadmapItems` then returns it after every other
       item of that placement, and several moved into one in the order they were
       moved. The plan's `moves` say which items go where among the roadmap's items
       (`planItemMoves`, `movedItems` in `apps/editor/src/domain/roadmap/item-moves.ts`); an API
       that stores each item's position writes those positions in the same
       transaction as the placement, and needs no row to move (STY-051). A placement's
       pending order (`RoadmapChanges.orders`, STY-050) is published the same way:
       the plan settles it against the snapshot, reports a co-lead's change to the
       placement's items as an `OrderConflict` among the refusal's `conflicts`, and
       gives the order to write as `moves`, a new item that is not last with the item
       it goes `before`, and `PublishWrites.orders`, each reordered placement's items
       once written, by ID. An API that stores positions may write a reordered
       placement's from `orders` in place of its moves; `orders` names no other
       placement, so an item moved into one that was not reordered still goes last
       there, by `moves`, as above. `listRoadmapItems` then returns each placement's
       items in the order written. `heldWrites` judges a lost answer by those IDs, so
       the API's ids must be the ones the plan gave: an item's own, and a new item's
       the one it was added with. An item with no ID is found by what it held
       (`findOrderedItems`), which an API whose items always have ids never needs;
     - `addRoadmap` adds a roadmap and its empty list of items together or not at
       all, not published (STY-040). `planNewRoadmap` and `settleLostNewRoadmap`
       (`apps/editor/src/domain/roadmap/new-roadmap.ts`) are the rules both current repositories
       share; the short name is the roadmap's key, unique by its address
       (`shortNameAddress`), and `names` are whatever else the API keeps under a name
       (none, if roadmaps alone have one). The Sheets adapter copies a `Template` tab
       and rejects with `invalid-data` without a usable one; an API that needs no
       template never does. A lost answer is settled by something only that write
       made, such as a key the client chose, never by the short name or the values;
   - an export from its `index.ts` barrel. The existing ESLint rules already keep this
     folder away from React, TanStack and features. Once `composeApp` imports it, remove
     its temporary entry in `knip.jsonc`.
2. **Contract test.** In `api-roadmap-repository.test.ts`, run the shared contract
   (`apps/editor/src/domain/roadmap/testing/roadmap-repository-contract.ts`) against an MSW fake of
   the API. `api-error.test.ts` holds `toApiError`'s status and code mappings, so
   add one test that a non-2xx answer goes through it, and tests of the client's own
   `network`, `invalid-response`, abort and any `protected` cases.
   `withRoadmaps(roadmaps, items?,
options?)` seeds the fake with roadmaps, their items, and how a publish's write
   behaves (`ContractWrite`: fails, or its answer is lost), whose items cannot be
   read (`unreadableItems`), the `families` and `categories` lists (by default those
   the roadmaps link to; `null` for none), names kept for something other than a
   roadmap (`otherNames`), and a data source with nothing to start a roadmap from
   (`noStartingPoint`), which an API that needs no template fakes as whatever makes it
   answer so; `failing()` fails every
   request. The Google adapter's test is the worked example.
3. **Config.** The API shares the editor's origin in every environment (ADR-020), so the
   adapter calls relative `/api` paths and needs no API address setting: add none to the
   Zod schema in `apps/editor/src/app/config.ts`, `apps/editor/.env.example` or
   `apps/editor/.env.production`.
4. **Swap it in** `composeApp` (`apps/editor/src/app/composition.ts`): construct
   `ApiRoadmapRepository` instead of `GoogleSheetsRoadmapRepository`, and write a new
   `AuthClient` adapter for the API's own sign-in. Reshape the port first, in
   `apps/editor/src/domain/auth/auth-client.ts`: drop `getAccessToken`, since no access
   token leaves it (ADR-018), and keep `reportUnauthenticated`, which moves the state to
   `expired` on a 401. Then `connect()` posts the sign-in start for the chosen provider and
   navigates to the authorisation address it returns, and the signed-in state comes from a
   "who am I" call. The API keeps the session in an `HttpOnly` cookie, so do not pass a
   token to `ApiRoadmapRepository`. The session warning (STY-017) and the reconnect flow
   (STY-057) change shape with the port. Swap the adapter in the same place.
5. **Copy.** Some strings name the spreadsheet or Google Sheets, because that is what
   users must act on today. Search `apps/editor/src/i18n/locales/en.ts` for "spreadsheet" and
   "Google Sheets", and reword them in `en.ts` and `cy.ts`; no component changes.
6. **E2E.** Add a fake for the API to `apps/editor/tests/e2e/fixtures/` (the hermetic guard fails on
   any unfaked origin) and retire the Sheets fake when it is no longer used.
7. **Deploy.** The API serves the editor's built files on the same origin as its
   endpoints (one Cloud Run service per environment, ADR-020), so the API sends no CORS
   headers and the editor sends no `Authorization` header: the session cookie carries the
   sign-in (ADR-018). Record the change in an ADR that amends ADR-002, then delete
   `apps/editor/src/infrastructure/google-sheets/` once nothing uses it.
