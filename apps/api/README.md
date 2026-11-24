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
pnpm api:dev        # the database, then the API with reload
pnpm api:db:up      # the database alone
pnpm api:db:down    # stop it, keeping its data
pnpm api:format     # ruff format, and ruff's fixes
pnpm api:lint       # ruff, import-linter and the transaction check
pnpm api:typecheck  # ty
pnpm api:test       # pytest at 100% branch coverage, against the database
```

Outside a worktree the API listens on <http://127.0.0.1:8000> and its database on
`127.0.0.1:15432`; a worktree has its own ports (`pnpm worktree:info`), and
`pnpm worktree:teardown` removes its database and the data in it. The editor's dev
server (`pnpm editor:dev`) proxies `/api` to the API, so the browser sees both on one
origin.

| Path                   | Answers                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `/health`              | 200 while the process runs                                  |
| `/ready`               | 200 once the database answers, else 503 `service.not_ready` |
| `/api/v1/…`            | the contract's routes (none yet)                            |
| `/api/v1/openapi.json` | the live OpenAPI document, locally only                     |

Settings come from environment variables only, which `pnpm api:dev` sets for the slot:
`ROADMAPS_ENV` (`local`, `test` or `production`, the default),
`ROADMAPS_DATABASE_URL` (`postgresql+psycopg://…`) and `ROADMAPS_ALLOWED_HOSTS` (the
`Host` names served, comma-separated, never a wildcard). A missing or bad one stops
start-up, naming it. Every log line is JSON on stdout; only a local API's lines carry
an exception's or another library's message.
