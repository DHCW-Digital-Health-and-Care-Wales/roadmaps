# ADR-017: The API is synchronous FastAPI on Python 3.15, over SQLAlchemy and psycopg 3

- Status: Proposed — drafted from the owner's answers in the EPC-022 monorepo grilling
  (2026-11-21), for the owner's acceptance. Python 3.15 and PostgreSQL 18 are the owner's
  (2026-11-20, ADR-015).
- Date: 2026-11-21

## Context

ADR-015 binds the database: PostgreSQL 18, forced row-level security keyed on a tenant
and a person set per transaction, history written only by a commit function, keys from
`uuidv7()` or supplied by the client, and tests as the application's own role. This ADR
binds the service that writes to it, `apps/api` (ADR-016). The scale is dozens of
roadmaps and a handful of editors per tenant. The editor reaches the API only through
the roadmap repository (ADR-002), parses what it receives with `zod/mini`, and shows
copy for codes the API emits (ADR-008).

## Decision

### Runtime and project

- **Python 3.15 and FastAPI**, one uv project (`apps/api/pyproject.toml`, `uv.lock`,
  `.python-version`); no uv workspace.
- **psycopg 3 under synchronous SQLAlchemy 2.1:** routes are plain `def`, run in
  FastAPI's thread pool. Models are typed `Mapped[]`; queries are `select()`
  statements.
- **Relationships are `lazy="raise"`:** every load is explicit (`selectinload`,
  `joinedload`), so nothing relies on lazy loading and a later move to async is
  mechanical.

### Layering

- **Route → service → repository.** Routes are thin and raise domain errors. Services
  hold the logic and end transactions. Repositories hold every query, are built with
  the session and the tenant, and never end a transaction. "Ending a transaction" means
  a SQL commit or rollback, not ADR-015's commit function, which services call through
  repositories.
- **Enforced** by import-linter's `layers` contract, plus one check that fails a route
  or repository that commits or rolls back. Both run in the API's lint.

### Tenant and person

- **A session `after_begin` listener** runs `set_config('app.tenant_id', …, true)` and
  the person's equivalent, with bound parameters, at the start of every transaction the
  request's session begins. A service that ends a transaction and reads again ("Save and
  publish") keeps both; ADR-015's tests prove neither outlives its transaction.

### Schema conventions

- One naming convention for every constraint and index; enums stored as text with a
  CHECK, never native enum types; `timestamptz`, with sessions in UTC; every foreign key
  states its `ondelete`; keys from `uuidv7()` server defaults or supplied by the client
  and validated (ADR-015).

### Errors

- **Every refusal is `{detail, code, params}`**: `code` is stable (`roadmap.short_name_taken`),
  `params` camelCase, `detail` English for logs only. FastAPI's own 404, 405 and 422 are
  wrapped in the same envelope; `HTTPException` is banned by ruff's banned-API rule.
- **A check keeps the API's codes and the editor's error catalogue in step,** both
  ways, so every code has English and Welsh copy (ADR-008).

### The contract with the editor

- **The OpenAPI document is committed**, written without a database, and CI fails when
  it drifts from the code.
- **Hey API's openapi-ts generates the types and `zod/mini` schemas** into
  `packages/api-types`; the editor's API adapter (`infrastructure/`) parses every
  response with them.

### Migrations

- **Alembic, sequential, each revision reviewed by hand;** autogenerate only drafts, since
  policies, functions and triggers are SQL. Migrations run as their own step before a
  version serves, locally by a command, never at start-up: the runtime role has no DDL
  rights (ADR-015).

### Tests

- **A real PostgreSQL 18:** the migrations build a template database once; each pytest
  worker clones its own; tests connect as the application's role; between tests a
  separate superuser connection empties the tables with `TRUNCATE … CASCADE`, which
  bypasses row-level security and the history triggers. That connection exists only in
  the test harness.

### Tooling

- **Ruff** formats and lints, with bugbear, datetimez, simplify, the banned-API rule and
  its `S` security rules; no bandit or vulture.
- **ty, pinned to an exact version** and bumped deliberately; pyright strict is the
  fallback if a ty release blocks work. Checked on 2026-11-21: ty 0.0.107 on Python
  3.15.0 with SQLAlchemy 2.1.9, FastAPI and Pydantic reported no false positives and the
  same errors as mypy strict.

### Operation

- **Settings from pydantic-settings, failing closed:** an unset environment gets
  production rules.
- **JSON logs on stdout** with a request id; `/health` answers for the process,
  `/ready` for the database.
- **OpenTelemetry from the start:** local traces go over OTLP to an optional Jaeger
  container; tests and CI export nothing.
- **Local running:** the API runs natively through uv with reload; PostgreSQL 18 runs in
  Compose, one container per worktree slot, its volume at `/var/lib/postgresql` (the
  `postgres:18` image refuses the old `/var/lib/postgresql/data` mount). The editor's
  Vite dev server proxies to the API.
- **A deterministic seeder** fills a local database with plausible fake data: a fixed
  Faker seed, Welsh from a hand-written phrase list, refusing any environment but local
  and test. It grows with each schema story.
- **Scheduled jobs are CLI commands** an external scheduler calls, idempotent and tested
  (scratch expiry, ADR-015 Option 29); no scheduler runs inside the API.

### Rejected

- **Async SQLAlchemy, or asyncpg:** concurrency this scale does not need, at the cost of
  async fixtures and no lazy loading; `lazy="raise"` keeps the door open.
- **One transaction per request:** services could not end a transaction part-way.
- **A savepoint rolled back per test:** wrong where services commit and where ADR-015's
  proofs need two connections. **Tests as a superuser:** the row-level security and
  immutability proofs would prove nothing. **A clone per test:** slower for no gain.
- **Native enum types:** adding or renaming a value needs a careful migration.
- **Migrating at start-up:** races between instances, and needs DDL rights at runtime.
- **RFC 9457 problem details:** more to map for one client that wants a code.
- **Hand-written `zod/mini` schemas:** code to keep in step with the generated types.
- **mypy:** slower, and ty met the same bar; **bandit and vulture:** ruff's `S` rules
  cover the first, and dead code waits for evidence.
- **An in-process scheduler:** every instance would run it, and scale-to-zero hosting
  misses runs.

## Consequences

- Every route, service and repository is synchronous; moving to async touches each of
  them, mechanically.
- ty's 0.0.x releases can change rules; a bump is a deliberate change with its fixes.
- The editor's import rules (ADR-002) let `infrastructure/` import `packages/api-types`;
  features still never do.
- Follow-on work (EPC-022): STY-090 (the API skeleton), STY-091 (migrations, the tenant
  listener and the test harness), STY-092 (the OpenAPI contract and `packages/api-types`),
  STY-093 (the seeder).
