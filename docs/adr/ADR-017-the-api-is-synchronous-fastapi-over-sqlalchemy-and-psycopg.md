# ADR-017: The API is synchronous FastAPI on Python 3.15, over SQLAlchemy and psycopg 3

- Status: Accepted — owner, 2026-11-21; drafted from the owner's answers in the
  EPC-022 monorepo grilling (2026-11-21). Python 3.15 and PostgreSQL 18 were fixed by
  the owner on 2026-11-20 (ADR-015). Amended by ADR-020 (_ADR-020 amendments_) and by
  the owner's STY-090 grilling (_STY-090 amendments_), STY-091 grilling (_STY-091
  amendments_), STY-101 grilling (_STY-101 amendments_), STY-092 grilling (_STY-092
  amendments_) and the owner's answer to CHO-047's delivery question (_CHO-047
  amendments_).
- Date: 2026-11-21 (amended by ADR-020: CORS, serving the editor, response rules;
  STY-090: URL paths, tracing after the skeleton; STY-091: roles, migrations, `/ready`
  and the test workers; STY-101: two plain-text refusals, log messages; STY-092:
  camelCase JSON contract, committed OpenAPI and raw TS schemas, import boundary;
  CHO-047, 2026-11-25: request models forbid extra keys)

## Context

ADR-015 binds the database: PostgreSQL 18, forced row-level security keyed on a tenant
and a person set per transaction, history written only by the commit function and the
redaction procedure, keys from `uuidv7()` or supplied by the client, and tests as the
application's own role. This ADR binds the service that writes to it, `apps/api`
(ADR-016). The scale is dozens of roadmaps and a handful of editors per tenant. The
editor reaches the API only through the roadmap repository (ADR-002), parses what it
receives with `zod/mini`, and chooses copy from `AppError.kind` (ADR-002, ADR-008).

## Decision

### Runtime and project

- **Python 3.15 and FastAPI**, one uv project in `apps/api`.
- **psycopg 3 under synchronous SQLAlchemy 2.1:** routes are plain `def`, run in
  FastAPI's thread pool. Models are typed `Mapped[]`; queries are `select()`
  statements.
- **Relationships are `lazy="raise"`:** every load is explicit, so nothing relies on
  lazy loading and a later move to async is mechanical.

### Layering

- **Route → service → repository.** Routes are thin and raise domain errors. Services
  hold the logic and end transactions. Repositories hold every query and never end a
  transaction; a tenant-owned table's repository is built with the session and the
  tenant, a shared table's with the session alone. "Ending a transaction" means a SQL
  commit or rollback, not ADR-015's commit function, which services call through
  repositories.
- **ADR-015's atomic operations stay one transaction:** "Save and publish" writes both
  change sets before the service commits once. "Save all" across roadmaps may commit one
  transaction per roadmap, which ADR-015 leaves to the editing-model epic.
- **Enforced** by import-linter's `layers` contract, plus one check that fails a route
  or repository that commits or rolls back. Both run in the API's lint.

### Tenant and person

- **A session `after_begin` listener** applies the request's tenant and person with
  `set_config(…, true)` and bound parameters at the start of every transaction the
  session begins, so a service that ends one transaction and starts another keeps both.
- **Either may be absent:** the sign-in lookup has neither, a person's memberships are
  read before a tenant is chosen, and the public read has a tenant and no person. An
  absent value is left unset, so policies that need it fail closed. ADR-015's tests
  prove neither setting outlives its transaction.

### Schema conventions

- One naming convention for every constraint and index; enums stored as text with a
  CHECK, never native enum types; `timestamptz`, with sessions in UTC; every foreign key
  states its `ondelete`; keys from `uuidv7()` server defaults or supplied by the client
  and validated (ADR-015).

### Errors

- **Every refusal is `{detail, code, params}`**, with a stable `code`
  (`roadmap.short_name_taken`). FastAPI's own 404, 405 and 422 are wrapped in the same
  envelope; `HTTPException` is banned by ruff's banned-API rule.
- **The OpenAPI document enumerates every code.** The editor's API adapter maps each
  code to an `AppError` kind, with the params its copy needs, in one table typed
  `Record<ApiErrorCode, …>`: a code the API adds breaks the editor's build until it is
  mapped. Copy stays keyed by `AppError.kind`, and several codes may share one; ADR-002
  and ADR-008 stand unchanged.

### The contract with the editor

- **The OpenAPI document is committed**, and CI fails when it drifts from the code.
- **Hey API's openapi-ts generates the types and `zod/mini` schemas** into
  `packages/api-types`. Only the editor's `infrastructure/` imports it; `domain/`,
  `features/` and `components/` never do (ADR-002).

### The public read

- **Public, read-only endpoints with no key** serve each tenant's current publications
  and its list of roadmaps, never drafts, scratch, people or history. The tenant comes
  from its public address (ADR-015 Option 5) and no person is set.
- **Cross-origin reads are open (`*`) on those endpoints only;** they take no
  credentials. The editor's endpoints keep a strict allow-list.
- **Published roadmap data is licensed under the Open Government Licence v3.0**, stated
  on the public site and in the API's documentation.
- Abuse is met by caching and rate limiting where the API is hosted.

### Migrations

- **Alembic, sequential.** Migrations run as their own step before a version serves,
  locally by a command, never at start-up: the runtime role has no DDL rights
  (ADR-015).

### Tests

- **A real PostgreSQL 18:** the migrations build a template database once; each pytest
  worker clones its own; tests connect as the application's role; between tests a
  separate superuser connection empties the tables with `TRUNCATE … CASCADE`. That
  connection exists only in the test harness.

### Tooling

- **Ruff formats and lints with as many rules as are sensible from the start,** its
  security (`S`) and banned-API rules among them; every rule left out is listed with
  its reason beside the selection. No bandit.
- **ty, pinned to an exact version** and bumped deliberately; pyright strict is the
  fallback if a ty release blocks work (evaluation: EPC-022 _Findings_).

### Operation

- **Settings fail closed:** an unset environment gets production rules.
- **JSON logs on stdout;** `/health` answers for the process, `/ready` for the database.
- **OpenTelemetry from the start,** sending local traces to an optional Jaeger
  container; tests and CI export nothing.
- **Local running:** the API runs natively through uv; PostgreSQL 18 runs in Compose,
  one container per worktree slot.
- **A deterministic seeder** fills a local database with plausible fake data, in English
  and Welsh, the same on every run; it starts right after the migrations and grows with
  each schema story.
- **Scheduled jobs are CLI commands** an external scheduler calls (scratch expiry,
  ADR-015 Option 29); no scheduler runs inside the API.

### Rejected

- **Async SQLAlchemy, or asyncpg:** concurrency this scale does not need, at the cost of
  async fixtures and no lazy loading; `lazy="raise"` keeps the door open.
- **One transaction per request:** it would rule out the per-roadmap transactions
  ADR-015 leaves open for "Save all".
- **A savepoint rolled back per test:** wrong where services commit and where ADR-015's
  proofs need two connections. **Tests as a superuser:** the row-level security and
  immutability proofs would prove nothing. **A clone per test:** slower for no gain.
- **Native enum types:** adding or renaming a value needs a careful migration.
- **Migrating at start-up:** races between instances, and needs DDL rights at runtime.
- **RFC 9457 problem details:** more to map for one client that wants a code.
- **`AppError` carrying the API's code:** API vocabulary would reach the UI, and the
  catalogue would follow the API instead of what leads need to read.
- **Hand-written `zod/mini` schemas:** code to keep in step with the generated types.
- **mypy:** slower, and ty met the same bar.
- **An API key for the public read:** a secret to rotate for data that is public.
- **An in-process scheduler:** every instance would run it, and scale-to-zero hosting
  misses runs.

### ADR-020 amendments

- **The editor's endpoints send no CORS headers**, replacing _The public read_'s strict
  allow-list: the editor and the API share one origin (ADR-020).
- **The API serves the editor's built files and sets their document headers** in hosted
  environments, before and after the load balancer fronts the same service (ADR-020).
- **Every response that is not public** carries `Cache-Control: no-store`; every
  response carries `nosniff`, `Content-Security-Policy: default-src 'none';
frame-ancestors 'none'` and a same-origin resource policy; requests
  have a body limit; validation errors leave out the submitted input; production has no
  `/docs` or live OpenAPI route (ADR-020).
- Everything else here stands.

### STY-090 amendments

From the owner's STY-090 grilling (2026-11-23, STY-090 D2, D8, D19 and D24); the rest of
_Operation_ stands.

- **Contract routes live under `/api/v1`.** The version names the contract the editor
  and, later, the public read rely on. How long an old version is served beside a new
  one is not decided here.
- **The probes are `/health` and `/ready` at the root,** unversioned and outside
  `/api`. The platform calls them, not a client, so they never move with the contract.
  No probe path ends in `z`, since Cloud Run reserves some such paths.
- **OpenTelemetry follows the skeleton** in STY-100, not in STY-090 itself. Until then
  each log line and response carries a generated request ID, which STY-100 makes the
  trace ID.

### STY-091 amendments

From the owner's STY-091 grilling and its review questions (2026-11-24, STY-091 D3 to
D14, D17, D24 to D27 and D29); the rest of _Migrations_, _Tests_ and _Operation_ stands.
STY-091 records the agent's decisions that build on them.

- **A bootstrap outside Alembic creates ADR-015's roles.** One idempotent SQL file, with
  no credential, makes three no-login roles: the owner, which owns the database and so
  `public`; the migration role, which switches to the owner; and the application's
  role. Each login is a member of exactly one of the last two. The file revokes
  `TEMPORARY` on the database and the owner's default `EXECUTE` on routines from
  `PUBLIC`. Locally and in CI a runner creates two password logins first; where the API
  is hosted, EPC-023 creates the logins and runs the same file.
- **Migrations upgrade only,** numbered `0001_<slug>` in one line, in the package, each
  run as the owner role and reviewed by hand, with autogenerate only drafting. A check
  fails two heads, a gap or a repeat in the numbers, and another fails models that
  differ from the migrations. Each revision grants the application's role what it needs;
  there is no default grant.
- **Every revision stays compatible with the version before it,** since that version
  serves while a deploy migrates: `/ready` is ready at the code's latest revision or at
  one numbered above it, and not ready behind it, at another slug, at a value of another
  form, or with no revision or several.
- **`/ready` serves only a login that holds the application's role and nothing more:**
  no `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, `CREATEDB` or `REPLICATION`, membership of
  no role outside a closed list STY-091 names, no object owned, and no `CREATE` or
  `TEMPORARY` on the database or `CREATE` on any schema.
- **The test workers** are pytest-xdist's, as many as the machine has cores and at most
  four, each on its own clone of the template.
- **The seeder follows the first schema story,** which creates `tenants`, rather than
  the migrations alone; the rest of _Operation_'s seeder stands.

### STY-101 amendments

From the owner's STY-101 grilling (2026-11-24, STY-101 D2, D7 and D10); the rest of
_Errors_ and _Operation_ stands.

- **Two refusals are not the envelope**: Starlette's middleware answers a `Host` the
  allow-list does not name with a 400 and a body over the limit with a 413, each in its
  own plain text (ADR-020's _STY-101 amendments_). Neither has a code, so the editor's
  API adapter maps the two by their status.
- **JSON logs write an exception's or a third party's message only on a developer's
  own machine**, as ADR-018's _STY-101 amendments_ bound it; elsewhere uvicorn's
  loggers write from warning up, since their information lines would hold no text.

### STY-092 amendments

From the owner's STY-092 grilling and review questions (2026-11-24, STY-092 D1 to D6, D9,
D11, D13, D17 and D18); the rest of _Errors_ and _The contract with the editor_ stands.
STY-092 records the agent's decisions that build on them.

- **JSON on the wire is camelCase everywhere** (request bodies, response bodies, query
  params and error `params`), through two Pydantic bases: `ApiRequestModel`
  (`alias_generator=to_camel`, `serialize_by_alias=True`, `validate_by_alias=True`,
  `validate_by_name=False`, which never binds `snake_case` keys on inbound JSON bodies or
  `Annotated[Model, Query()]` query models: required fields answer 422 `missing` at their
  camelCase alias; what becomes of an unknown key, a `snake_case` one among them, is in
  _CHO-047 amendments_) and `ApiResponseModel` (`validate_by_name=True`, so Python builds
  responses in `snake_case` while serialising `camelCase`). Every model reachable from a
  request, nested models included, inherits `ApiRequestModel`; plain function query
  parameters use `Annotated[Model, Query()]` or an explicit `alias`.
- **OpenAPI exposes `ErrorCode` and `ErrorResponse`** (`{detail, code, params}`) in
  `components.schemas` and strips FastAPI's built-in `HTTPValidationError` and
  `ValidationError` (pointing generated 422 response refs to `ErrorResponse`), served
  identically at local `/api/v1/openapi.json` and committed at `apps/api/openapi.json`
  (exported offline without a database).
- **`packages/api-types` (`@roadmaps/api-types`) commits raw TypeScript** under
  `packages/api-types/src/generated/` with no build step: erasable union types
  (`enums: false`) and `zod/mini` schemas (`compatibilityVersion: "mini"`) only, with no
  generated fetch SDK. Generated TypeScript is ignored by Prettier and ESLint and
  typechecked under `tsconfig.base.json`.
- **The import boundary covers all of `apps/editor/src/` except `src/infrastructure/**`**,
  forbidding `@roadmaps/api-types` in `app/`, `routes/`, `i18n/` and `lib/` as well as
  `domain/`, `features/` and `components/`.
- **Error responses fall back by HTTP status** when not a valid envelope or carrying an
  unrecognised `ErrorCode` (`401` → `unauthenticated`, `403` → `forbidden`, `404` →
  `not-found`, `429` → `rate-limited`, `5xx` → retryable `unknown`, plain-text `400`/`413`
  → non-retryable `unknown`, other malformed or unknown `4xx` → `invalid-response`),
  keeping edge refusals and rolling deploys usable without adding speculative
  `AppErrorKind`s. STY-092 records the edge-case refinements built on this (D20).

### CHO-047 amendments

From the owner's answer to CHO-047's delivery question (2026-11-25, CHO-047 D4); the
rest of _STY-092 amendments_ stands.

- **`ApiRequestModel` forbids extra keys** from CHO-047, ahead of the first request-body
  or query-model story it was to wait for. A key a request model does not declare, a
  field's `snake_case` name among them, is refused with a 422 (`extra_forbidden`),
  whose `loc` never holds that key.

## Consequences

- Every route, service and repository is synchronous; moving to async touches each of
  them, mechanically.
- ty's 0.0.x releases can change rules; a bump is a deliberate change with its fixes.
- `docs/operations/replacing-google-sheets.md` changes with the adapter: its responses
  are parsed by the generated schemas, not hand-written ones.
- Follow-on work (EPC-022): STY-090 (the API skeleton), STY-100 (tracing), STY-091
  (migrations, the tenant listener and the test harness), STY-092 (the OpenAPI contract
  and `packages/api-types`), STY-093 (the seeder). The public endpoints and the licence
  statement arrive with the public read, in EPC-022's later stories.
