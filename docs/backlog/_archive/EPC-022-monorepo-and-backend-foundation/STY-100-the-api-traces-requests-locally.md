# STY-100: The API traces its requests, and a developer reads them in a local Jaeger

- **Status**: Done
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: STY-090 (hard), STY-101 (hard)
- **Binding ADRs**: ADR-017 §Operation, §STY-090 amendments; ADR-018's application-log
  allow-list
- **Suggested model**: Opus — a span filter, a tail drop and a code-level propagator
  that later stories copy
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/306

## Summary

The API traces each request with OpenTelemetry, as ADR-017 sets. A developer who wants
to see them starts one Jaeger shared by every worktree and reads each request's spans,
its database queries included, there. Every request starts its own trace, so the API
alone chooses the trace ID, which is also the request ID in its log lines and
`X-Request-ID`. Spans keep only allow-listed fields, so no query string, exception
message, SQL value, client address or header. Tests and CI export nothing. Metrics,
and tracing where the API is hosted, are not in it (EPC-023).

## Scope

The API's tracing and its local viewer: instrumentation of incoming requests and
database queries, the log lines' trace fields, and the shared Jaeger's scripts.
`X-Request-ID` changes format (D12); nothing else changes in the editor, the public
site, or STY-090's error envelope and response headers.

## Acceptance criteria

### S1: A developer reads a request's trace in a shared local Jaeger

**Given** `pnpm api:jaeger` started once on the host, then `pnpm api:dev` in a worktree
**When** the developer sends a request the API traces (any but a successful probe,
S5) and opens Jaeger's UI on port 16686
**Then** the request's trace is there under the service `roadmaps-api-<slot>`, with a
server span named for the route template (`GET /api/v1/roadmaps/{id}`, once such a
route exists) and a child span for each database query it runs; until a route that
queries exists, pytest shows the database span (D2, D6, D13)
**And** a second worktree's API sends to the same Jaeger under its own slot's service
name (`roadmaps-api` outside a worktree), and `pnpm api:jaeger:stop` stops it; worktree
teardown leaves it running, since other worktrees share it; an API exporting when it
stops logs the exporter's failures, by allow-listed fields only, while Jaeger is down,
and exports again once it is back (D10, D18, D19)

### S2: Without Jaeger, nothing is exported and nothing complains

**Given** the API started with no `OTEL_EXPORTER_OTLP_ENDPOINT`, in any environment,
production included, or `pnpm api:dev` started with none set while Jaeger's OTLP port
does not answer
**When** requests are served
**Then** no span is exported and no exporter error reaches the log, yet each request
still has a trace ID for its log lines and `X-Request-ID` (D7, D11)
**And** a developer who starts Jaeger after the API restarts `api:dev` to see traces,
since `api:dev` checks for Jaeger once, when it starts; an endpoint the developer sets
is used whether or not Jaeger answers. A test of the launcher holds its three cases:
Jaeger answering, not answering, and an endpoint already set (D7, D11, D19)

### S3: Every request starts its own trace

**Given** a request carrying a `traceparent` header, or a `tracestate` or `baggage` one
**When** the API serves it
**Then** its trace ID is one the API generated, not the caller's, and that ID is the
request ID in every log line written while serving it and in `X-Request-ID`, as 32
hexadecimal characters (D3, D5, D12)
**And** no inbound trace context or baggage is read, whatever `OTEL_PROPAGATORS` holds,
and the API ignores `OTEL_SDK_DISABLED`, since its tracer and the drop are set in code,
so the request ID is never all zeros and always equals the trace ID (D16)

### S4: Spans keep only allow-listed fields

**Given** a request with a query string and a captured header, a route that raises an
exception holding a planted value, a query bound to a planted parameter value, a query
that fails with a database error echoing that value, and a hand-written span attribute
not on the list
**When** their spans are recorded
**Then** each span keeps only the allow-listed attribute keys, dropped where spans are
made: the method, the route template, the status, the duration and the request ID on a
server span; the operation and the statement text on a database span; an exception's
type and stack frames, never its message (D4, D15)
**And** no part of any recorded span (its name, attributes, events, links, status
description or resource) holds the query string, the header, the exception message, a
bound value, the client's address, the User-Agent or the database's host and user. The
test searches each span serialised whole, and a database span's statement text keeps
its placeholders (`… WHERE id = %(id)s`) (D8)

### S5: Probes and refusals are traced as STY-090 sets

**Given** the API running with tracing on
**When** `/health` or `/ready` succeeds, and when a request is refused with a 4xx,
including a refusal raised before routing (400 for the `Host`, 413 for the body)
**Then** a successful probe exports no span, its `SELECT 1` included, yet still has a
32-hexadecimal trace ID for its `X-Request-ID`, the span being dropped once the outcome
is known, while a 503 from `/ready` exports its spans (STY-090 D20, D17)
**And** every one of them has its trace ID as its `X-Request-ID`; a 4xx refusal's server
span records its status but is not marked an error, and a 500's span is; a request
matching no route names its span by its method alone (D13)

### S6: Logs carry the trace

**Given** the API serving a request
**When** it writes a log line
**Then** the line carries `trace_id` and `span_id` beside STY-090 S7's allow-listed
fields, and its request ID equals the trace ID (D3, D12)
**And** a line written outside a request carries neither

### S7: Tests and CI export nothing

**Given** `pnpm api:test`, locally or in CI
**When** the suite runs
**Then** spans go only to an in-memory exporter the tests read, and no network
exporter is configured, even when the developer's shell sets an
`OTEL_EXPORTER_OTLP_*` endpoint: the test environment never configures one, and a test
sets the variable and finds only the in-memory exporter. STY-090's real-server log test
starts the server without `api:dev`'s Jaeger check and with those variables cleared
(ADR-017, D19)
**And** the suite's tests hold S2 to S6, with 100% branch coverage as STY-090 sets

### S8: Jaeger is local, pinned and forgetful

**Given** the shared Jaeger's Compose file
**When** it is read and started
**Then** its image is Jaeger v2, pinned by digest, its published ports (16686 and 4318)
bind 127.0.0.1 only, and it keeps traces in memory, capped by a trace limit, with no
volume, the limit set by a command-line flag rather than a mounted config (D4, D9,
D10, D18)
**And** a test over that file checks the binding, the digest, the memory store, the
limit and that it mounts no volume, as STY-090's does for its database

## Tests

pytest with an in-memory span exporter holds S2 to S6: planted values and a failing
query for S4, whose whole-span search also covers the spans of `/ready`'s 503 with the
database down; an inbound `traceparent` with `OTEL_PROPAGATORS` unset and set to
`tracecontext,baggage`, and with `OTEL_SDK_DISABLED=true`, for S3; the probes and a 4xx for S5, captured log lines for S6. The
launcher's Jaeger check has its own test (S2). S1 is an observed run with Jaeger. S8's
file checks join STY-090's Compose test.

## Decisions

- **D1** (owner, 2026-11-23, STY-090 grilling round 7, STY-090 D24): tracing is split
  from STY-090 into this story, which follows it and blocks neither STY-091 nor STY-092.
- **D2** (owner, 2026-11-23, STY-090 grilling round 4): one shared, opt-in Jaeger on
  fixed ports, over a Compose profile per slot; no slot ports are added. Gives S1.
- **D3** (owner, 2026-11-23, STY-090 grilling round 8, STY-090 D26): the trace ID
  becomes the request ID that STY-090 generates. Gives S3, S6.
- **D4** (agent, 2026-11-23, STY-090's security review, from STY-090 D30 and D33): spans
  hold STY-090 S7's log allow-list (no query string, exception message or SQL
  parameters), and Jaeger is bound to 127.0.0.1 with its image pinned by digest. Gives
  S4, S8.
- **D5** (owner, 2026-11-23, STY-100 grilling round 1): inbound trace context is
  dropped, so every request starts its own trace, over honouring any caller's
  `traceparent` or continuing it with a separate request ID. Whether to trust the
  hosted load balancer's trace header is EPC-023's. Gives S3.
- **D6** (owner, round 1): traces only, over traces and metrics; logs stay JSON on
  stdout, and metrics wait for hosting (EPC-023). Gives S1.
- **D7** (owner, round 1): `api:dev` checks once at start whether Jaeger answers, over
  always exporting locally with failures silenced. Gives S2.
- **D8** (owner, round 2, changing a round-1 answer when asked to confirm it): database
  spans carry the statement text with placeholders and no values, over the operation
  and table alone. Gives S4.
- **D9** (owner, round 3): Jaeger keeps traces in memory, over a named volume that no
  teardown removes. Gives S8.
- **D10** (agent, 2026-11-23, confirmed by the owner in round 4): Jaeger v2 with
  `pnpm api:jaeger` and `pnpm api:jaeger:stop`; worktree teardown leaves it. Gives S1,
  S8.
- **D11** (agent, confirmed in round 4): no `OTEL_EXPORTER_OTLP_ENDPOINT` means no
  export in any environment, production included, while trace IDs are still made.
  Every request is traced locally; hosted sampling is EPC-023's. Gives S2.
- **D12** (agent, confirmed in round 4): log lines gain `trace_id` and `span_id`, and
  `X-Request-ID` becomes the 32-hexadecimal trace ID in place of STY-090's own format.
  Gives S3, S6.
- **D13** (agent, confirmed in round 4): server spans are named by the route template;
  a 4xx is not a span error, a 500 is, as OpenTelemetry's HTTP conventions set. Gives
  S1, S5.
- **D14** (agent, confirmed in round 4): instrumentation of outgoing HTTP calls waits
  for the first story that makes one (sign-in with Google, ADR-018).
- **D15** (owner, 2026-11-24, review question): spans keep a real allow-list of
  attribute keys, enforced where spans are made, over three bans with the rest left to
  EPC-023. Changes S4. The agent adds: a story that needs a new span attribute records
  it as a Decisions entry of its own, within ADR-018's rule that only IDs are logged.
  The resource keeps `service.name` and the environment.
- **D16** (agent, 2026-11-24, security review): the drop of inbound context does not
  depend on `OTEL_PROPAGATORS`, and the API ignores `OTEL_SDK_DISABLED`, over honouring
  it with a separate fallback ID, so S3 and S6 hold unchanged. Changes S3.
- **D17** (agent, 2026-11-24, review): a successful probe still gets a trace ID for its
  request ID; its span and `SELECT 1` child are dropped once the outcome is known, not
  excluded up front, so a 503 keeps its spans. Changes S5.
- **D18** (agent, 2026-11-24, review): Jaeger's memory store is capped by a trace limit;
  the service is `roadmaps-api` outside a worktree; an exporter that loses Jaeger after
  start logs its failures while Jaeger is down and resumes once it is back. Changes S1,
  S8.
- **D19** (agent, 2026-11-24, review): an `OTEL_EXPORTER_OTLP_ENDPOINT` the developer
  sets is used by `api:dev` whether or not Jaeger answers, as the shape agreed in
  STY-090's round 4 said; tests never export, whatever the environment holds; and the
  OpenTelemetry SDK's own failure lines follow STY-090 S7's allow-list (logger and
  exception type, no URL or message), tested against a closed port. Changes S1, S2,
  S7.
- **D20** (agent, 2026-11-23, from STY-090 D35, the owner's answer narrowing S7): spans
  name a request by its route's template (`http.route`), never by the
  path a caller sent (`url.path`); a request matching no route is named by its method
  alone (D13). Gives S4.
- **D21** (owner, 2026-11-24, STY-101 grilling round 2, STY-101 D13): this story is
  delivered after STY-101, which simplifies the middleware and route naming it builds
  on, over tracing first; spans take none of STY-101's log changes (diagnostic codes,
  messages when local) and keep D15's allow-list. Under STY-101 a request a mount
  handled is `unmatched`, so its span is named by its method alone (D13). S5's 413
  is Starlette's and never raised before routing (STY-101 D17): it arises while a route
  reads the body, or after a route that reads none has run; only the 400 for the `Host`
  is. It is still a 4xx and not a span error, which S5's test shows for the exception
  that carries it. The exporter's failure lines (S1, D19) follow STY-101 S6: no URL or
  message under test's and production's rules, where D19's closed-port test runs, and
  the SDK's message on a developer's local API. Changes S1, S5, D19.
- **D22** (agent, 2026-11-25, from STY-091's delivery): `/ready` no longer runs one
  `SELECT 1`; it sets its statement timeout, reads the login's roles, then reads
  `alembic_version` (STY-091 S7, S8). "Its `SELECT 1`" in S5 and D17 now means each of
  the probe's database spans: a successful probe still exports none of them.

## Out of scope

- Metrics, hosted export and sampling, and trusting the load balancer's trace header:
  EPC-023.
- Instrumentation of outgoing HTTP calls: the first story that makes one (D14).

## Delivery

### Departures

- **S4, D15: the allow-list holds at the export pipeline, and the API makes its own
  spans** (agent): FastAPI's own telemetry is off in `create_app`, whatever the
  environment holds (its server span carries `url.path`, `url.query`, the `Host` and the
  method as sent, and its `auto_configure` would export by OpenTelemetry's variables),
  and no contrib instrumentation is added: `RequestContext` makes the server span and
  `trace_queries` a span per statement (`apps/api/src/roadmaps_api/tracing.py`). Every
  span then passes `AllowList`, a span processor in the API's process that rebuilds it
  with only the listed keys before any exporter sees it, so a hand-written attribute,
  event, link or status description never leaves the process. An exception keeps its
  frames only as `record_exception` writes them: one the SDK recorded itself (a span
  from `start_as_current_span` that raises, or the SDK's `record_exception`) keeps its
  type alone, since the SDK's stack trace ends with the message. The span limits are set
  in code too, so the SDK's limit variables can neither drop the probe's mark nor cut a
  request ID short. Nothing is exported without an exporter, so nothing then needs
  filtering.
- **S4: the server span's request ID is `roadmaps.request_id`, and its duration is the
  span's own** (agent): no OpenTelemetry convention names a request ID; the duration
  is the span's start and end, not an attribute. A request matching no route has no
  `http.route`, as the HTTP conventions set.
- **S5, D13: every 5xx marks its span an error** (agent): OpenTelemetry's HTTP
  conventions mark a server span from 500 up, so `/ready`'s 503 is an error too, beside
  a 500; a 4xx never is.
- **S1: the service name is a new setting, `ROADMAPS_SERVICE_NAME`** (agent):
  `scripts/api.sh` sets it to `roadmaps-api-<slot>` from `.env.worktree`'s
  `WORKTREE_SLOT`, and `roadmaps-api` outside a worktree, which is also its default.
  It is a `ROADMAPS_*` variable, as `apps/api/AGENTS.md` sets for settings.
  `OTEL_EXPORTER_OTLP_ENDPOINT`, which S2 names, is the one other variable the settings
  read, so that guide's "`ROADMAPS_*` environment variables only" is now false; this PR
  leaves the guide unchanged and hands the line to its retrospective
  (`docs/operations/authoring-agent-instructions.md`, _Where it goes_). An invalid value
  of either stops start-up, naming it, a bare `/` included.
- **S2: the launcher's check is Python** (agent): `pnpm api:dev` runs
  `python -m roadmaps_api.server --local-traces`, which checks Jaeger's OTLP port once
  and, if it answers and no endpoint is set, sets `OTEL_EXPORTER_OTLP_ENDPOINT` for the
  reload worker, logging `tracing.to_jaeger` or `tracing.off`. Its three cases are a
  pytest test, under the API's coverage, in place of a test of the shell script.
- **S8: the Compose file is `apps/api/jaeger/compose.yaml`, with `/tmp` in memory**
  (agent): its own folder gives it its own Dependabot entry, beside the database's; the
  image declares `/tmp` a volume, so `tmpfs` keeps even that in memory. The trace limit
  is 10,000. The exporter's HTTP session follows the shell's proxy variables, so a
  developer with `HTTP_PROXY` set and no `NO_PROXY` for `127.0.0.1` would send the
  allow-listed spans through that proxy; `apps/api/README.md` says so, and the tests clear
  those variables.
- **S1, D19, D21: the exporter's failure lines hold no exception type** (agent): the
  SDK logs them as formatted messages, without `exc_info`, so under test's and
  production's rules a line holds its time, level and logger; a local API writes the
  SDK's message, its URL included.
- **S3: trace IDs come from the SDK's random generator** (agent), which never makes an
  all-zero ID; STY-090's request ID came from `secrets`. Nothing takes a request ID as
  proof of anything.

### Contract for dependents

- Code that adds to a trace writes to the current span or starts one from
  `app.state.tracer`; a new attribute key needs its own Decisions entry and a place in
  `SPAN_ATTRIBUTES`, on the terms of the log allow-list (`tracing.py`'s docstring). An
  exception goes on a span through `record_exception`, which keeps its type and frames,
  never its message; one the SDK records itself is exported with its type alone.
- A thread a service starts runs in `contextvars.copy_context()`, as
  `ReadinessService.check` does, or its queries leave the request's trace and its log
  lines its request ID.
- A test reads spans through the `spans` fixture (`apps/api/tests/conftest.py`), passed
  to `serving` or `create_app(settings, span_exporter=…)`; the conftest clears every
  `OTEL_*` variable before each test.
- `request_id_var` is gone: a log line takes its request, trace and span IDs from the
  current span.
- The story that instruments outgoing HTTP calls (D14) decides what trace context, if
  any, those calls send.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | observed run: with `pnpm api:jaeger` up, `pnpm api:dev` logged `tracing.to_jaeger`; Jaeger listed `roadmaps-api-42` with the resource `service.name` and `deployment.environment.name` alone; `GET /api/v1/openapi.json` named by its route, a 404 by `GET` alone; `/ready`'s 503 (an older `alembic_version`) gave its server span and four `SELECT`/`WITH` child spans with placeholders; the probes' successes gave none; a planted query string, `User-Agent` and inbound `traceparent` were in no trace. A second API run as outside a worktree filed under `roadmaps-api`. With Jaeger stopped, the API logged the SDK's retries and failure (local, so with messages) and, once `pnpm api:jaeger` was back, exported the next request. `apps/api/tests/test_tracing.py` (`test_the_exporter_s_failures_are_logged_without_their_url_or_message`: a closed port, test's rules)  |
| S2       | `apps/api/tests/test_server.py` (the launcher's three cases); `apps/api/tests/test_tracing.py` (no endpoint exports nothing, FastAPI's auto-configuration and the SDK's traces endpoint set; an endpoint exports there); observed: `pnpm api:dev` with Jaeger stopped logged `tracing.off`, no exporter line, and its request line carried its trace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S3       | `apps/api/tests/test_tracing.py` (inbound `traceparent`, `tracestate` and `baggage` with `OTEL_PROPAGATORS` unset and set, and with `OTEL_SDK_DISABLED=true`); red with the caller's context extracted and with `OTEL_SDK_DISABLED` honoured                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| S4       | `apps/api/tests/test_tracing.py` (query string, captured headers, `User-Agent`, cookie, path, a raising route, a hand-written attribute, event and status description, exceptions the SDK recorded on a span from `app.state.tracer` and on the request's, and `/ready`'s 503 with the database down at a planted login; each span's keys, events, links and resource, and the span serialised whole; the SDK's limit variables change no attribute or event), `apps/api/tests/integration/test_tracing.py` (a bound planted value and a failing cast echoing it: placeholders kept, the error recorded by type, no value, database host or user); red with attributes unfiltered, with the status description kept, with the SDK's exception events passed whole and with the span limits left to the environment                                                                    |
| S5       | `apps/api/tests/test_tracing.py` (a row per route, unmatched path, undefined method, `Host` refusal, 413, 422, 500 and `/ready`'s 503: name, route, status, error; a successful `/health`; spans ending after their trace was kept or dropped; the bounded memory of dropped traces; the SDK's limit variables leave the drop in place), `apps/api/tests/test_middleware.py` (a probe that fails, or is cancelled, after its response started exports its span), `apps/api/tests/integration/test_tracing.py` (a successful `/ready` exports nothing; a failing one its server span and four query spans, children of it); red with the drop never set, with a late span of a dropped trace passed on, with the memory unbounded, with a 4xx marked an error, with the readiness thread outside the request's context and with a probe that failed after its response started dropped |
| S6       | `apps/api/tests/test_tracing.py` (a 500's two lines carry the server span's trace and span; a line outside a request carries neither), `apps/api/tests/test_logs.py`; red with the trace fields written outside a request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S7       | `apps/api/tests/conftest.py` (`no_trace_export`), `apps/api/tests/test_tracing.py` (with `OTEL_EXPORTER_OTLP_ENDPOINT` set and FastAPI's auto-configuration on, a test's exporter is the only one: a stand-in receiver got nothing); red with the endpoint's exporter added beside it and with FastAPI's telemetry left to the environment; 100% branch coverage in `pnpm api:test`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| S8       | `build/api-compose.test.ts` (binding, digest, Jaeger v2, the memory store's limit flag, no volume); red with a port unbound, the digest removed, a zero limit, a volume and Jaeger v1; observed: six traces sent to the image with `max_traces=4` left the first two unfound and the last four found, all six without the flag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
