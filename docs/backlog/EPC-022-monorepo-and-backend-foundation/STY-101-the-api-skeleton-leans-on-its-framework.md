# STY-101: The API's skeleton leans on its framework, and tests only what the repository wrote

- **Status**: Proposed — acceptance criteria from the owner's STY-101 grilling
  (2026-11-24); delivered before STY-100
- **Type**: Refactor
- **Area**: API + CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-090 (hard), CHO-048 (hard)
- **Binding ADRs**: ADR-017 §Errors, §Operation, §Tooling; ADR-020 (the API's own
  responses); ADR-018's application-log allow-list
- **Suggested model**: Opus — it changes the security middleware, the log rule and two
  ADRs' wording

## Summary

STY-090's skeleton wrote by hand two guards the installed framework ships, and tested
tools the repository did not write. This story uses Starlette's body limit and `Host`
allow-list, removes wildcard hosts and the naming of mounts nothing has, retires five
tests, and has CI use the Compose database. A wrong `Host` and an oversize body still
get 400 and 413, now as Starlette's plain text, and the limit counts a body as a route
reads it. Logs gain codes that tell failures apart, and a developer's local API writes
exception messages; test, production and any hosted service never do. `/ready`'s
deadline and the 100% coverage gate stay.

## Scope

The API's middleware, settings, error catalogue, log formatter and tests, its CI job and
Dependabot entry, and the ADR, guide and README lines the answers make false. No route,
no schema and nothing in the editor or the public site changes. Spans are STY-100's and
keep its allow-list (D13).

## Acceptance criteria

### S1: The body limit and the `Host` allow-list are Starlette's

**Given** the API as its composition root builds it
**When** a request carries a `Host` the settings do not list, or a route reads a body
over 1 MiB, declared or streamed
**Then** Starlette's `TrustedHostMiddleware` refuses the first with 400 and its
`RequestBodyLimitMiddleware` the second with 413, each with Starlette's plain-text body,
ADR-020's headers, `X-Request-ID` and an access line (D2, D10)
**And** no more than the limit is ever read: a declared oversize body to a route that
reads none is answered 413 after that route has run, and a streamed one is left unread
with the route's own answer; the test's table has a row for each (D17)
**And** a listed host with a port, in capitals or as an IPv6 literal is served; a listed
name as another's suffix, and the bare name of a listed `www.` host, are refused with
400 and no redirect; `X-Forwarded-Host` is never read; and a body at the limit is read
**And** no hand-written host parsing or body counting remains, the codes
`request.host_not_allowed` and `request.body_too_large` leave the error catalogue, and
every other refusal is still the envelope

### S2: A wildcard host stops start-up in every environment

**Given** `ROADMAPS_ALLOWED_HOSTS` holding `*` or `*.example`, with `ROADMAPS_ENV` local,
test, production or unset
**When** the API starts
**Then** start-up stops, naming the setting and never its value, as for any bad setting
(D3)

### S3: No test exercises a tool the repository did not write

**Given** the API's and the editor's test suites
**When** they are read
**Then** none runs import-linter and none restates the dev proxy's configuration, while
the transaction check keeps its tests (D4)
**And** `pnpm api:lint` still fails an upward import: delivery plants one, sees the
contract fail naming the file and line, and records the run in Scenario evidence

### S4: CI's API job uses the Compose database

**Given** CI's API job
**When** it runs `pnpm api:test`
**Then** the database is the Compose file's, started by the script as it is locally,
with no service container and no second copy of the image's digest in the workflow (D5)
**And** the Compose test still fails a published port not bound to 127.0.0.1, its
digest test goes, the image staying pinned by digest in the Compose file (D18), and
Dependabot's entry no longer speaks of a digest to copy

### S5: A log line tells one failure from another, by codes

**Given** an exception logged in any environment
**When** its line is written
**Then** it carries the types of the exception and of each exception it was raised from,
and for a database error its SQLSTATE and its constraint's name where the database gave
them, beside the frames (D6, D12)
**And** `/ready`'s warning carries them, so a failed connection, a connect timeout, a
cancelled statement (`57014`) and the probe's own deadline differ in the log; a refused
connection and a wrong password, which psycopg reports alike and without a SQLSTATE,
differ only in a local log (S6, D21)
**And** under test's and production's rules the line holds no message, detail or value:
a unique violation on a planted value, in a table the test creates, logs `23505` and
the constraint's name, and the planted value appears nowhere on either stream

### S6: A developer's local API writes messages; no other does

**Given** `ROADMAPS_ENV=local` and no `K_SERVICE` in the environment
**When** an exception or a third party's line is logged
**Then** the line also carries the exception's message, or the third party's formatted
message, as JSON on stdout (D7, D19)
**And** neither is written with `ROADMAPS_ENV` test, production, unset or invalid, with
`K_SERVICE` set whatever `ROADMAPS_ENV` holds, or for a line written before the
settings are read: the test's table has a row for each
**And** STY-090 S7's assertions that no message or planted value reaches either stream
hold under those rules, with its real-server test and the tests that start the API as
`pnpm api:dev` does run under production's (D20); the access line names a request by
its route's template in every environment, local included

### S7: uvicorn's content-free lines stop

**Given** an environment whose log drops third-party messages (S6)
**When** uvicorn starts, serves and stops
**Then** its loggers write from warning up, so its start and stop lines are not written,
and its warnings and errors arrive as now (D8, D11)
**And** a developer's local API keeps uvicorn's information lines, which S6 gives their
text

### S8: A request a mount handled is `unmatched`

**Given** a request that a mounted app handled, whatever its routes
**When** its access line is written
**Then** the line names it `unmatched`, and no code matches mounts to name one (D9)
**And** a route of the API's own routers, included ones too, is named by its full
template, the live OpenAPI route by its path, and no line holds a path a caller sent

### S9: The records and the gate agree with the build

**Given** the change
**When** ADR-017, ADR-018, ADR-020, the API's guide and README are read, and the API's
gate runs
**Then** ADR-020 says Starlette's middleware bounds what a route reads of a body, with
D17's two cases, and with ADR-017 _Errors_ names the two plain-text refusals as the
envelope's exceptions; ADR-018 _Records and retention_ states that only a local API off
Cloud Run writes messages, that the allow-list takes codes and names, and that a
database function the repository writes never sets a diagnostic field from a value; the
API's guide states the same rules with the true facts (D2, D6 to D8, D12, D17, D19)
**And** `pnpm api:lint`, `pnpm api:typecheck` and `pnpm api:test` pass at 100% branch
coverage of the package and the tools, and `/ready` keeps its thread and deadline (D14,
D15)

## Tests

pytest through `TestClient` holds S1, S2 and S5 to S8: S1's body cases and S6's
environments are each one table, and S7's level is read from the log configuration each
environment builds. The tests of the two middlewares hold the repository's wiring of
them (the hosts, no redirect, the limit, their order), not Starlette's own behaviour
beyond S1's rows. S5's unique violation runs against the slot's database, in a table the
test creates and drops. The real server holds S6's "never" for uvicorn's own lines,
under production's rules. S3 and S4 are observed runs: the planted import, and CI's API
job on the pull request.

## Decisions

- **D1** (owner, 2026-11-24, review of STY-090): the review's findings become a story in
  this epic, grilled before it is selectable.
- **D2** (owner, 2026-11-24, grilling round 1): Starlette's body limit and `Host`
  allow-list with their plain-text bodies, over Starlette's body limit alone or keeping
  both hand-written for the envelope. Amends ADR-020 and ADR-017 _Errors_. Gives S1, S9.
- **D3** (owner, round 1): no wildcard host in any environment, over keeping one for a
  local API. Changes STY-090 S6 and D33. Gives S2.
- **D4** (owner, round 1): the four import-linter tests and the dev proxy's test are
  retired, having proved the wiring once, over keeping the planted-violation tests.
  Changes STY-090 S8 and S12. Gives S3.
- **D5** (owner, round 1): CI's API job starts the Compose database, over a service
  container with a second digest. Changes STY-090 D5's container, not its real database.
  Gives S4.
- **D6** (owner, round 1): log lines gain an exception's chain of types and a database
  error's SQLSTATE and constraint name. Widens STY-090 D30's allow-list. Gives S5.
- **D7** (owner, round 1): a local API writes exception and third-party messages; test
  and production stay as STY-090 D30 set. Bounded by D19. Gives S6.
- **D8** (owner, round 1): uvicorn's lines that arrive with no content stop. Gives S7.
- **D9** (owner, round 1): a mounted app's request is `unmatched` until a story mounts
  one, over naming it by the mount's template. Narrows STY-090 D35, which still holds:
  no caller's path reaches the log. Gives S8.
- **D10** (agent, 2026-11-24): a 413 is Starlette's plain text however it arises, over
  mapping the one raised while a route reads the body to the envelope, so one status has
  one body; the two codes no response carries leave the catalogue.
- **D11** (agent, 2026-11-24): uvicorn is quietened only where its messages are dropped,
  over everywhere, since D7 gives a local API's lines their text.
- **D12** (agent, 2026-11-24): the chain follows an exception's cause, then its context,
  as Python prints it; SQLSTATE and constraint name come from psycopg's diagnostics
  only, never parsed from text. PostgreSQL lets a function set either, so a function
  the repository writes never sets one from a value (security review).
- **D13** (owner, round 2): STY-100's spans take none of D6 to D8 and keep their
  allow-list; STY-101 is delivered before STY-100, over tracing first or either order.
  Recorded in STY-100 D21.
- **D14** (owner, round 1): `/ready` keeps its thread and deadline, copied nowhere, over
  removing it; the timeout that would cover every route is CHO-049.
- **D15** (owner, round 1): pytest still fails under 100% branch coverage of the package
  and the tools, over the package alone or a lower floor. STY-090 D7 stands.
- **D16** (owner, round 2): three guide and template edits (a configured tool is proved
  once; a rebuilt dependency is a quality finding; a control's operating cost counts)
  are CHO-048, delivered first and so a hard dependency, over a scenario here or this
  story's retrospective.
- **D17** (owner, 2026-11-24, review question): Starlette's limit as it behaves, over a
  length check ahead of it or keeping the hand-written limit. It counts a body as a
  route reads it, so nothing past the limit is read, but a route that reads no body
  runs before a declared oversize is answered 413, and a streamed one is left unread.
  Narrows STY-090 S4's "refused before it is read whole". Changes S1.
- **D18** (agent, 2026-11-24, review): the Compose test's digest test goes whole, its
  pin-format assertion with its comparison, as D5's answer said, over keeping the
  format check; the image stays pinned by digest in the Compose file (STY-090 D33),
  which Dependabot refreshes. STY-091's harness note follows (STY-091 D2).
- **D19** (owner, 2026-11-24, review question): messages are written only with
  `ROADMAPS_ENV=local` and no `K_SERVICE`, as ADR-018 bounds the mock provider, over
  leaving the bound to EPC-023 or dropping local messages. Changes S6.
- **D20** (agent, 2026-11-24): the real-server test and the tests that start the API as
  `pnpm api:dev` does run under production's rules where they assert no planted value,
  since D7 makes that false locally; one local case shows the message. Changes the
  environment of STY-090 S7's and D34's tests.
- **D21** (agent, 2026-11-24, review): psycopg raises every failed connection attempt
  as one error with no SQLSTATE, so S5 claims no difference between a refused connection
  and a wrong password outside a local log, over reading libpq's text, which names the
  host and user.

## Starting point

Audited at `17bcb6e8`, with Starlette 1.10.0, FastAPI 0.163.1, uvicorn 0.54.0 and
psycopg 3.3.9 installed:

- Starlette ships `RequestBodyLimitMiddleware` and `TrustedHostMiddleware`. Run in place
  of the hand-written two, under `RequestContext`, they answer 413 for a declared and a
  streamed body over the limit that a route reads, 200 for a body at it, 400 for an
  unlisted host, a listed name as another's suffix, `[::1]evil` and a port that is no
  number, and 200 for a listed host with a port and an IPv6 literal with one. Their
  bodies are `text/plain`.
- Starlette's limit checks only as the app receives the body and as the response
  starts. With an oversize body and a route that reads none: streamed, the route's own
  answer (200, 404 or 405) where STY-090 answers 413; declared, 413 after the handler
  has run, where STY-090 refuses before routing.
- `TrustedHostMiddleware` redirects the bare name of a listed `www.` host with a 307
  unless `www_redirect=False`, allows every host when given none, and asserts on a
  wildcard that is not `*` or `*.name`. It refuses a name with an empty port, which the
  hand-written check serves.
- FastAPI takes no `max_body_size` argument; the middleware is added as any other.
- FastAPI re-raises an `HTTPException` raised while it reads a body. The 413 then meets
  the handler for FastAPI's own refusals, which re-raises a status it does not list, and
  Starlette's middleware answers it: a 413 mapped there would be the envelope (D10).
- `BodyLimit` tests `Content-Length` with `str.isdigit()` before `int()`: `²` passes the
  first and raises in the second, a 500. uvicorn's parser (h11) refuses that header
  first, so no request reaches it today.
- psycopg raises a failed connection attempt as `psycopg.OperationalError` with no
  SQLSTATE, refused or unauthenticated alike; a connect timeout is its own type.
- The suite is 111 tests in 11.7 seconds; three `/ready` deadline tests take 6.3 of
  them.
- `scripts/api.sh test` starts the Compose database whenever
  `ROADMAPS_TEST_DATABASE_URL` is unset, which is all CI's job needs.
- uvicorn logs a failed start-up or shutdown as `Application startup failed. Exiting.`
  with no `exc_info`, so under STY-090 D30 that line holds a time, a level and a logger.
- The real-server test and the factory's tests start the API with `ROADMAPS_ENV=local`
  and assert no planted value on either stream, which D7 makes false for that
  environment (D20). One test asserts `/ready`'s warning as an exact set of fields and
  one expects an information line from uvicorn, which S5 and S7 change.
- The log configuration is built before the settings are read.

## Out of scope

- The hosted server, its image and the edge's own body and host limits (EPC-023).
- Tracing (STY-100), delivered after this story on its smaller middleware.
- A deadline for every route's database wait (CHO-049).
- The guide and template edits (CHO-048).
- The editor's API adapter, which maps the two plain-text refusals by their status
  (the epic's _The API's conventions_).
