# DHCW Roadmaps: the API

The service that will replace the Google spreadsheet behind the editor and the public
site: synchronous FastAPI on Python 3.15, over PostgreSQL 18 through SQLAlchemy and
psycopg 3 ([ADR-017](../../docs/adr/ADR-017-the-api-is-synchronous-fastapi-over-sqlalchemy-and-psycopg.md)).
It runs locally and in CI; it holds no roadmap data yet, and nothing deployed calls it.

## Run locally

You need [uv](https://docs.astral.sh/uv/getting-started/installation/) and Docker with
Compose, beside the workspace's Node and pnpm. `pnpm worktree:setup`, or
`uv sync --locked` here, installs the pinned Python and the dependencies. From the
repository's root:

```sh
pnpm api:dev        # the database, its migrations, then the API with reload
pnpm api:db:up      # the database alone, its roles and local logins bootstrapped
pnpm api:migrate    # the database, then the migrations
pnpm api:db:down    # stop it, keeping its data
pnpm api:format     # ruff format, and ruff's fixes
pnpm api:lint       # ruff, import-linter and the transaction check
pnpm api:typecheck  # ty
pnpm api:test       # pytest at 100% branch coverage, up to four workers, each on its own database
pnpm api:openapi    # write openapi.json, the contract; needs no database
pnpm api:openapi:check  # fail if openapi.json differs from the code
pnpm api:contract   # api:openapi, then the editor's types and schemas (packages/api-types)
pnpm api:jaeger     # the Jaeger every worktree shares, to read the API's traces in
pnpm api:jaeger:stop  # stop it, forgetting its traces
```

Outside a worktree the API listens on <http://127.0.0.1:8000> and its database on
`127.0.0.1:15432`; a worktree has its own ports (`pnpm worktree:info`), and
`pnpm worktree:teardown` removes its database and the data in it. The editor's dev
server (`pnpm editor:dev`) proxies `/api` to the API, so the browser sees both on one
origin.

| Path                   | Answers                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `/health`              | 200 while the process runs                                    |
| `/ready`               | 200 once the database is served, else 503 `service.not_ready` |
| `/api/v1/…`            | the contract's routes (none yet)                              |
| `/api/v1/openapi.json` | the live OpenAPI document, locally only                       |

`/ready` serves the database when it answers within about two seconds, at the code's
latest revision or one numbered above it, through a login that holds the application's
role and nothing more; its warning names which of the three failed.

## Traces

The API traces each request with OpenTelemetry. Every request starts its own trace,
whatever trace headers it carries, and the trace's ID is its request ID: in
`X-Request-ID` and in each log line written while serving it, beside the line's
`trace_id` and `span_id`. A request's span is named by its route's template
(`GET /api/v1/roadmaps/{id}`), or by its method alone when no route matched, with a
child span for each database query, which holds the statement's text with its
placeholders and never a value. Spans keep only an allow-list of fields
([`src/roadmaps_api/tracing.py`](src/roadmaps_api/tracing.py)): no query string, header,
client address, exception message or bound value. A successful `/health` or `/ready`
exports none.

To read them, run `pnpm api:jaeger` once on the machine, then `pnpm api:dev`, and open
<http://127.0.0.1:16686>: each worktree's API files its traces under
`roadmaps-api-<slot>` (`roadmaps-api` outside a worktree). `pnpm api:dev` checks once,
as it starts, whether Jaeger answers on `127.0.0.1:4318`, so restart it after starting
Jaeger. Jaeger keeps the latest 10,000 traces in memory and listens on this machine
alone; worktree teardown leaves it running for the other worktrees.

Spans are exported only to `OTEL_EXPORTER_OTLP_ENDPOINT`, the base URL of an OTLP/HTTP
receiver, which `pnpm api:dev` sets to Jaeger's, or uses as you set it; without it,
in any environment, nothing is exported. No other OpenTelemetry variable changes which
requests are traced, their IDs, what a span holds or whether spans are exported; once an
endpoint is set, the SDK's exporter and batch processor still read their own transport
and batching variables (`OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_EXPORTER_OTLP_TIMEOUT`,
`OTEL_BSP_*` and the like), and its HTTP session follows the shell's proxy variables, so
a shell with `HTTP_PROXY` set needs `NO_PROXY=127.0.0.1` to keep Jaeger's traffic on this
machine. The tests export only to an in-memory exporter.

## The contract

[`openapi.json`](openapi.json) is the API's OpenAPI document, committed. It names every
error code (`ErrorCode`) and the one shape of a refusal (`ErrorResponse`,
`{detail, code, params}`), in place of FastAPI's own for a 422; two refusals are plain
text, a 400 for a `Host` not served and a 413 for an oversize body. `pnpm api:openapi`
builds it from fixed production settings, whatever the environment holds.
[`packages/api-types`](../../packages/api-types/) is generated from it, and CI fails when
either drifts. JSON on the wire is camelCase: request models inherit `ApiRequestModel`,
which never binds a field's snake_case name and refuses any key it does not declare,
nested models included, and response models `ApiResponseModel`, which Python builds in
snake_case ([`src/roadmaps_api/wire.py`](src/roadmaps_api/wire.py)). After changing a
route, a model or an error code, run `pnpm api:contract` and commit what it writes.

## The database

[ADR-015](../../docs/adr/ADR-015-the-roadmap-database-is-postgresql-tenant-scoped-and-versioned.md)'s
three no-login roles hold every grant: `roadmaps_owner` owns the database, and so schema
`public` and every object in it; `roadmaps_migrator` may switch to the owner, without
inheriting it; `roadmaps_app` is the application's. Each login is a member of exactly
one of the last two. [`src/roadmaps_api/bootstrap.sql`](src/roadmaps_api/bootstrap.sql)
makes them and holds no credential: locally `pnpm api:db:up` runs it, after creating the
logins `roadmaps_migrator_login` and `roadmaps_app_login` (password `roadmaps`), and
where the API is hosted [EPC-023](../../docs/backlog/EPC-023-hosting-and-infrastructure-security/README.md)
does, after creating its own. A non-superuser runner, as Cloud SQL's administrator is,
is granted the owner role with `SET` and without `INHERIT`, so its credential is the
owner's.

Migrations are Alembic revisions in `src/roadmaps_api/migrations/versions/`, numbered
`0001_<slug>` in one line. They upgrade only, run as their own step as the migration
login, never at the API's start-up, and grant `roadmaps_app` exactly what each object
needs. To draft one, set `ROADMAPS_MIGRATION_DATABASE_URL` and run
`uv run --locked alembic revision --autogenerate --rev-id NNNN_<slug> -m "<slug>"` from
`apps/api`, where `NNNN` is the next free number, then finish it by hand.

Settings come from environment variables only, which `pnpm api:dev` sets for the slot:
`ROADMAPS_ENV` (`local`, `test` or `production`, the default),
`ROADMAPS_DATABASE_URL` (`postgresql+psycopg://…`), `ROADMAPS_ALLOWED_HOSTS` (the
`Host` names served, comma-separated, never a wildcard), `ROADMAPS_SERVICE_NAME` (its
traces' service, `roadmaps-api` by default) and OpenTelemetry's
`OTEL_EXPORTER_OTLP_ENDPOINT` (see _Traces_). Only `ROADMAPS_DATABASE_URL` and
`ROADMAPS_ALLOWED_HOSTS` are required: either one missing, or any one invalid, stops
start-up, naming it, as does `ROADMAPS_MIGRATION_DATABASE_URL`, which only the migration
tooling reads: `python -m roadmaps_api.migrate`, and Alembic's command line when
drafting. Every log line is JSON on stdout; only a local API's lines carry
an exception's or another library's message.
