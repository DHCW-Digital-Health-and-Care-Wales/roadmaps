# STY-090: The API skeleton runs locally and in CI

- **Status**: Proposed — acceptance criteria from the owner's STY-090 grilling
  (2026-11-23); tracing split out to STY-100 (D24)
- **Type**: Feature
- **Area**: API + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-086 (hard), STY-087 (hard: its hooks and gate, which the API joins)
- **Binding ADRs**: ADR-017, including §STY-090 amendments; ADR-020's response rules
  (ADR-017 §ADR-020 amendments); ADR-016 §Workspace tooling, §CI
- **Suggested model**: Opus — the conventions every later API story copies

## Summary

`apps/api` starts: a FastAPI service on Python 3.15 that a developer runs with one
command beside a local PostgreSQL 18. It answers health and readiness probes, refuses
every bad request with a coded error, sets strict response headers, logs JSON and is
checked by lint, types, layering and tests in CI. Its routes live under `/api/v1`, and
the editor's dev server proxies `/api` to it. It holds no roadmap data yet. Tracing
(OpenTelemetry and a local Jaeger) is not in it: STY-100 follows.

## Scope

The service's conventions, its local running and its checks. There is no schema or
migration (STY-091), no committed OpenAPI document or generated editor types (STY-092),
no tracing (STY-100) and no container image (EPC-023). The editor changes only its dev
server's proxy. The worktree scripts gain the API's and the database's ports, and set up
and tear down the slot's database.

## Acceptance criteria

### S1: One command runs the API beside its own database

**Given** a worktree set up with `pnpm worktree:setup`, with uv and Docker installed
**When** a developer runs `pnpm api:dev`
**Then** the slot's PostgreSQL 18 container starts if it is not running, in a Compose
project named for the slot and bound to 127.0.0.1 only, and the API starts with reload
on the slot's `API_PORT`, with `/health` and `/ready` answering 200 (D13, D27)
**And** a second worktree runs its own API and database side by side, on its own
`API_PORT` and `DB_PORT`, and `pnpm api:db:up` and `pnpm api:db:down` start and stop
the database alone, and `t3.json` offers `pnpm api:dev` beside the editor's dev
server

### S2: Worktree setup and teardown own the Python side

**Given** a new worktree
**When** `pnpm worktree:setup` runs
**Then** it claims `API_PORT` and `DB_PORT` in the slot beside the existing four ports,
and runs `uv sync --locked` in `apps/api`, which fetches the pinned Python 3.15
**And** without uv it fails with a message naming the prerequisite, and `pnpm
worktree:teardown` runs `docker compose down --volumes` for the slot's project, so a
reused slot starts with an empty database (D9, D11)

### S3: The probes answer for the process and the database

**Given** the API running
**When** a caller requests `/health` and `/ready`, at the root and outside `/api/v1`
**Then** `/health` answers 200 whether the database is up or not, and `/ready` answers
200 once a `SELECT 1` succeeds, through a route, a readiness service and a repository
(D3, D8)
**And** with the database down, `/ready` answers 503 `service.not_ready` within about
two seconds and logs a warning, while a probe that succeeds writes no access-log line
(D20)

### S4: Every refusal is the envelope, with a stable code

**Given** the API running
**When** a request fails in each way below
**Then** the response is `{detail, code, params}` with the status and code shown, and
never includes the submitted input, a traceback or exception text (D14, D17, D23):

| Request                                   | Status | `code`                       | `params`                     |
| ----------------------------------------- | ------ | ---------------------------- | ---------------------------- |
| An unknown path                           | 404    | `request.not_found`          | `{}`                         |
| A known path with the wrong method        | 405    | `request.method_not_allowed` | `{}`                         |
| A body or query that fails validation     | 422    | `request.invalid`            | `{errors: [{loc, type}, …]}` |
| A body over 1 MiB, refused before parsing | 413    | `request.body_too_large`     | `{}`                         |
| A `Host` header the settings do not list  | 400    | `request.host_not_allowed`   | `{}`                         |
| A route raising an unexpected error       | 500    | `server.internal_error`      | `{}`                         |

**And** ruff's banned-API rule fails any import of `HTTPException`, and the 500's
traceback is logged with the request's ID

### S5: Every response carries ADR-020's headers

**Given** any response from the API, refusals and probes included
**When** its headers are read
**Then** it carries `Cache-Control: no-store` (no route is public yet),
`X-Content-Type-Options: nosniff`,
`Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` and
`Cross-Origin-Resource-Policy: same-origin`, and no CORS header (D1)
**And** the `Host` allow-list reads the `Host` header only, never `X-Forwarded-Host`

### S6: Settings fail closed

**Given** the API started with no `ROADMAPS_ENV`
**When** it starts
**Then** production rules apply: no `/docs` and no live OpenAPI route, and start-up
stops with a message naming each missing setting when the database URL or the allowed
hosts are unset (D12)
**And** settings come from environment variables only, with no `.env` file read;
`pnpm api:dev` sets `ROADMAPS_ENV=local`, the database URL and the allowed hosts from
the slot, and only a local environment serves the API's docs

### S7: Logs are JSON lines tied to the response

**Given** the API serving requests, locally or in CI
**When** it logs
**Then** every line on stdout is one JSON object, in every environment, carrying the
request's ID (D6)
**And** every response carries that ID in `X-Request-ID`, so a reported 500 finds its
log line (D15, D26)

### S8: The layering is enforced in lint

**Given** `pnpm api:lint`
**When** a service or repository imports a layer above it, or a route or repository calls
`commit()` or `rollback()` on a session
**Then** import-linter's `layers` contract, or the transaction check (a small AST script
with its own tests), fails, naming the file and line (D3, D22)
**And** each check's tests plant a violation and see it fail, and `/ready`'s route,
service and repository pass both

### S9: Hooks catch Python mistakes before they leave the machine

**Given** a clone after `pnpm install` and `uv sync`
**When** a developer commits staged Python files, then pushes
**Then** the commit hook runs `ruff format` and `ruff check --fix` on them and restages
the fixes, stopping the commit on a finding it cannot fix (D16)
**And** the push hook runs ty through `pnpm typecheck`, since `apps/api`'s package
delegates its `typecheck` to uv (D4)

### S10: CI runs the API's checks and feeds the gate

**Given** a pull request that changes a file under `apps/api/`
**When** CI runs
**Then** `classify-changes` outputs `api=true`, with a test row, and `--all` includes it,
and the API's job runs ruff (format and lint), import-linter, the transaction check, ty
and pytest, against a `postgres:18` service container, failing under 100% branch
coverage (D5, D7)
**And** the job is in _CI result_'s `needs`, which `build/ci-workflow.test.ts` checks,
and a pull request touching only the editor or the site skips it

### S11: Python dependencies wait a week, like pnpm's

**Given** `apps/api`'s uv project
**When** it resolves or Dependabot proposes an update
**Then** uv's `exclude-newer` holds back any release younger than 7 days, with the uv
version pinned, and Dependabot's uv entry is grouped monthly with the 7-day cooldown
(CHO-031 S4, STY-087 D12)
**And** ruff and ty are pinned to exact versions, and ruff selects `ALL`, each excluded
rule listed beside the selection with its reason (D18)

### S12: The editor's dev server reaches the API on one origin

**Given** `pnpm editor:dev` and `pnpm api:dev` running in one worktree
**When** the browser requests `/api/v1/…` from the editor's port
**Then** Vite proxies it to the same slot's `API_PORT`, as ADR-020 sets for local running
(D10)
**And** one wiring test checks that the proxy's target comes from the worktree's ports

### S13: The API has its guide

**Given** an agent changing a file under `apps/api/`
**When** it reads the guides along that path
**Then** `apps/api/AGENTS.md` (with its `CLAUDE.md`) gives the API's layering, error
codes, settings, commands and checks, and the root guide's routing table names it
**And** the README lists uv and Docker as prerequisites beside Node

## Tests

pytest with FastAPI's `TestClient` holds S3 to S7; S3's database cases run against CI's
service container, and STY-091's harness later replaces the connection set-up. S8's
checks have their own planted-violation tests. S2's port and teardown rules extend
`scripts/worktree/worktree.test.ts`, S10's `classify-changes.test.ts`, S12 one test of
the editor's Vite config. S1 is an observed run.

## Decisions

- **D1** (owner, 2026-11-23, STY-090 grilling round 1): ADR-020's response rules in the
  skeleton → the headers, the body limit, no production docs and the `Host` allow-list,
  over headers alone or adding same-origin proof through a test-only route. Same-origin
  proof arrives with the first state-changing route (ADR-018's sign-in). Gives S4, S5.
- **D2** (owner, round 1, settled in round 3): contract routes live under `/api/v1`,
  over an unversioned `/api` or no prefix; recorded in ADR-017 _STY-090 amendments_
  (D19).
- **D3** (owner, round 1): `/ready` is the worked example of route → service →
  repository, over empty layer packages, so the layering checks have code to check.
  Gives S3, S8.
- **D4** (owner, round 1): `apps/api/package.json` (`@roadmaps/api`) delegates its
  scripts to uv, and root `api:*` scripts use `pnpm --filter`, over root scripts calling
  uv directly; the root `lint`, `typecheck` and `test` then cover the API. Gives S9.
- **D5** (owner, round 2): CI tests `/ready` against a `postgres:18` service container,
  over faking the repository until STY-091, whose harness grows that job. Gives S10.
- **D6** (owner, round 2): JSON logs in every environment, local included, over readable
  logs locally. Gives S7.
- **D7** (owner, round 2): pytest fails under 100% branch coverage, over a lower floor
  or none. Gives S10.
- **D8** (owner, round 3, after the industry's forms were shown): the probes are
  `/health` and `/ready` at the root, unversioned, as ADR-017 names them, over
  `/health/live` and `/health/ready` or `/api/health`. Cloud Run's default probe is TCP
  and it reserves some paths ending in `z`, so `/healthz` is avoided. Gives S3.
- **D9** (owner, round 3): uv and Docker are prerequisites, and `worktree:setup` runs
  `uv sync --locked`, over a manual sync or a pnpm `postinstall`. Gives S2.
- **D10** (owner, round 3): the editor's dev server proxies `/api` now, over waiting for
  the editor's API adapter. Gives S12.
- **D11** (owner, round 3): teardown removes the slot's database container and its
  volume, over keeping the volume or leaving Docker alone. Gives S2.
- **D12** (owner, round 4): local settings come from environment variables that
  `api:dev` sets from the slot, over a gitignored `.env` file, so no file can switch an
  environment to local. Gives S6.
- **D13** (owner, round 4): `api:dev` starts the slot's database, then the API, over
  separate steps; `api:db:up` and `api:db:down` exist too. Gives S1.
- **D14** (owner, round 4): an unexpected error answers a generic 500
  (`server.internal_error`) and logs its traceback. Gives S4.
- **D15** (owner, round 4): every response carries `X-Request-ID`, matching the log
  line, over no header. Gives S7.
- **D16** (owner, round 5): the commit hook formats and fixes with ruff and restages, as
  Prettier's does, over checking only. Gives S9.
- **D17** (owner, round 5): a 422's `params` hold each error's location and type only,
  over empty `params`. Gives S4.
- **D18** (owner, round 5): ruff selects `ALL`, each exclusion with its reason, over an
  explicit list of families. Gives S11.
- **D19** (owner, round 5): the URL convention (D2, D8) is recorded as ADR-017 _STY-090
  amendments_ as well as here.
- **D20** (owner, round 6): a probe that succeeds writes no access-log line (and, from
  STY-100, no span); a 503 from `/ready` is logged as a warning. Gives S3.
- **D21** (owner, round 6): `/ready` also answers 503 until the database is at the
  code's Alembic head, added by STY-091 (its rough shape), over connectivity only.
- **D22** (owner, round 6): the transaction check is a small AST script with its own
  tests, over a semgrep rule. Gives S8.
- **D23** (owner, round 6): requests are capped at 1 MiB, one setting, over 256 KiB or
  leaving it to the edge; a route that needs more raises it. Gives S4.
- **D24** (owner, round 7): OpenTelemetry, the shared Jaeger and probes left untraced
  move to [STY-100](STY-100-the-api-traces-requests-locally.md), over one large pull
  request or splitting out the local running instead.
- **D25** (owner, round 7): no container image, production server or hosted host values
  here; they belong to EPC-023, which builds the editor's files into the API's image
  (ADR-020).
- **D26** (owner, round 8): this story generates the request ID, in every log line and
  `X-Request-ID`; STY-100 makes it equal to the trace ID, over the header waiting for
  STY-100. Gives S7.
- **D27** (agent, 2026-11-23, confirmed by the owner in round 8): the package is
  `roadmaps_api` in a `src/` layout; the Compose file is `apps/api/compose.yaml`;
  outside a worktree the ports are 8000 and 55432; PostgreSQL binds to 127.0.0.1;
  `/ready`'s query times out after about two seconds. Gives S1, S3.

## Starting point

Audited at `e4117b10`:

- `scripts/worktree/worktree.sh` gives each slot ten ports (`PORT_BASE + SLOT*10`) and
  uses four, so offsets 4–9 are free. Its `PORT_VARS` is the one place the layout is
  written, `worktree.test.ts` hard-codes the four, and `teardown` stops processes by
  port and knows nothing about Docker.
- `scripts/worktree/dev-ports.ts`' `AppPorts` fits dev and preview pairs only; the API's
  and the database's ports need another shape.
- `scripts/ci/classify-changes.sh` sends `apps/*/*` outside the two apps to no job, and
  `classify-changes.test.ts` expects `apps/api/app.py` to run neither app; S10 changes
  that row.
- `pnpm-workspace.yaml`'s `packages: apps/*` already matches `apps/api` once it has a
  `package.json`.
- PyPI had cp315 wheels for psycopg-binary 3.3.9 and pydantic-core 2.50.5 on 2026-11-23.
- `dependency-audit.yml` runs OSV-Scanner recursively, so it finds `uv.lock` unchanged.
  CodeQL runs as GitHub's default setup (actions, JavaScript and TypeScript), and is
  observed once to take Python on.

## Out of scope

- OpenTelemetry and local Jaeger: STY-100.
- Alembic, roles, the tenant listener and the database test harness: STY-091.
- The committed OpenAPI document, `packages/api-types` and the editor's code table:
  STY-092, which starts that table with S4's codes.
- Same-origin proof for state-changing requests: the first state-changing route,
  ADR-018's sign-in.
- A container image, the production server, serving the editor's files and hosted
  hosts: EPC-023.
