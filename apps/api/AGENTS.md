# AGENTS.md — the API

Rules for work under `apps/api/`, beside the root `AGENTS.md`. Paths are from the
repository root.

## What this is

A synchronous FastAPI service over PostgreSQL, through SQLAlchemy and psycopg (ADR-017).
The editor reaches it on its own origin: its dev server proxies `/api` here (ADR-020).
Contract routes live under `/api/v1`; the platform's probes, `/health` and `/ready`, at
the root, unversioned (ADR-017's amendments).

## Layering (ADR-017)

- A route calls a service; a service calls repositories; nothing imports a layer above
  it (`roadmaps_api.routes`, `.services`, `.repositories`; `roadmaps_api.app` composes
  them). Routes stay thin and synchronous (`def`).
- Only a service ends a transaction; a route or repository never calls `commit()`,
  `rollback()` or `begin()` on a session. `/ready` is the worked example
  (`apps/api/src/roadmaps_api/routes/probes.py`, with its service and repository under
  `services/` and `repositories/` beside it), its service given to the route as a
  dependency.

## Errors and responses

- Refuse with `ApiError(ErrorCode.…)` (`apps/api/src/roadmaps_api/errors.py`); every
  refusal is `{detail, code, params}`. A new code joins `ErrorCode` with its status and
  detail, and the editor's API adapter maps it (ADR-017 _Errors_).
- Never put submitted input, an exception's text or a traceback in a response.
- The middleware (`apps/api/src/roadmaps_api/middleware.py`) sets ADR-020's headers on
  every response, the `Host` allow-list and the 1 MiB body limit; send no CORS header.

## Logs (ADR-018 _Records and retention_)

- Log a constant event name with allow-listed `extra` fields
  (`ALLOWED_EXTRA_FIELDS` in `apps/api/src/roadmaps_api/logs.py`); the formatter drops
  any other field, and a third party's message. A field joins the allow-list only when
  it is an ID, a code, a type, a name or a number, never a value a caller or a person
  supplied.
- Name a request in a log line by its route's template, or `unmatched`, and a method
  HTTP defines, never as the caller sent them (`apps/api/src/roadmaps_api/access_log.py`).
- Log an exception with `logger.exception` or `exc_info`: the line keeps its type and
  frames, never its message.

## Settings

- Settings come from environment variables only, `ROADMAPS_*`
  (`apps/api/src/roadmaps_api/settings.py`), never a `.env` file. A new setting fails
  closed: a missing or bad value stops start-up, naming the setting, never its value; an
  unset `ROADMAPS_ENV` gets production's rules.

## Commands and checks

- The `api:` scripts need the environment `uv sync --locked` makes in `apps/api`
  (`pnpm worktree:setup` runs it); `pnpm api:dev` and `pnpm api:test` start the slot's
  database themselves, in Docker.
- Run Python through uv from `apps/api` (`uv run --locked …`); add a dependency with
  `uv add`, which resolves only releases a week old.
- A `# noqa` names its rule and why.
- Test through FastAPI's `TestClient` (`serving` in `apps/api/tests/support.py`); a
  behaviour only uvicorn shows, such as its own logging, through the real server
  (`apps/api/tests/test_server.py`).
