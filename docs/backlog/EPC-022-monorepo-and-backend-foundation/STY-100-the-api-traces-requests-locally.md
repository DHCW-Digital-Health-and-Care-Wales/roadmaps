# STY-100: The API traces its requests, and a developer reads them in a local Jaeger

- **Status**: Proposed — acceptance criteria from the owner's STY-100 grilling
  (2026-11-23); delivered after STY-090
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-090 (hard)
- **Binding ADRs**: ADR-017 §Operation, §STY-090 amendments; ADR-018's application-log
  allow-list
- **Suggested model**: Sonnet — instrumentation with known libraries on STY-090's
  conventions

## Summary

The API traces each request with OpenTelemetry, as ADR-017 sets. A developer who wants
to see them starts one Jaeger shared by every worktree and reads each request's spans,
its database queries included, there. Every request starts its own trace, so the API
alone chooses the trace ID, which is also the request ID in its log lines and
`X-Request-ID`. Spans hold no query string, exception message or SQL value. Tests and
CI export nothing. Metrics, and tracing where the API is hosted, are not in it
(EPC-023).

## Scope

The API's tracing and its local viewer: instrumentation of incoming requests and
database queries, the log lines' trace fields, and the shared Jaeger's scripts. Nothing
changes in the editor, the public site, or STY-090's error envelope and response
headers.

## Acceptance criteria

### S1: A developer reads a request's trace in a shared local Jaeger

**Given** `pnpm api:jaeger` started once on the host, then `pnpm api:dev` in a worktree
**When** the developer sends a request the API traces (any but a successful probe,
S5) and opens Jaeger's UI on port 16686
**Then** the request's trace is there under the service `roadmaps-api-<slot>`, with a
server span named for the route template (`GET /api/v1/roadmaps/{id}`, once such a
route exists) and a child span for each database query it runs (D2, D6, D13)
**And** a second worktree's API sends to the same Jaeger under its own slot's service
name, and `pnpm api:jaeger:stop` stops it; worktree teardown leaves it running, since
other worktrees share it (D10)

### S2: Without Jaeger, nothing is exported and nothing complains

**Given** `pnpm api:dev` started while Jaeger's OTLP port does not answer, or the API
started with no `OTEL_EXPORTER_OTLP_ENDPOINT`, production included
**When** requests are served
**Then** no span is exported and no exporter error reaches the log, yet each request
still has a trace ID for its log lines and `X-Request-ID` (D7, D11)
**And** a developer who starts Jaeger after the API restarts `api:dev` to see traces,
since `api:dev` checks for Jaeger once, when it starts (D7)

### S3: Every request starts its own trace

**Given** a request carrying a `traceparent` header, or a `tracestate` or `baggage` one
**When** the API serves it
**Then** its trace ID is one the API generated, not the caller's, and that ID is the
request ID in every log line written while serving it and in `X-Request-ID`, as 32
hexadecimal characters (D3, D5, D12)
**And** no inbound trace context or baggage is read

### S4: Spans hold no query string, exception message or SQL value

**Given** a request with a query string, a route that raises an exception holding a
planted value, and a query bound to a planted parameter value
**When** their spans are recorded
**Then** no span attribute or event holds the query string, the exception message or
the parameter value; an exception is recorded by its type and stack only (D4)
**And** a database span holds the statement text with its placeholders
(`… WHERE id = %(id)s`) and the operation, never a bound value (D8)

### S5: Probes and refusals are traced as STY-090 sets

**Given** the API running with tracing on
**When** `/health` or `/ready` succeeds, and when a request is refused with a 4xx
**Then** a successful probe makes no span (STY-090 D20), while a 503 from `/ready` makes
one
**And** a 4xx refusal's server span records its status but is not marked an error, and
a 500's span is (D13)

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
exporter is configured (ADR-017)
**And** the suite's tests hold S2 to S6, with 100% branch coverage as STY-090 sets

### S8: Jaeger is local, pinned and forgetful

**Given** the shared Jaeger's Compose file
**When** it is read and started
**Then** its image is Jaeger v2, pinned by digest, its published ports (16686 and 4318)
bind 127.0.0.1 only, and it keeps traces in memory with no volume, so a restart clears
them (D4, D9, D10)
**And** a test over that file checks the binding and the digest, as STY-090's does for
its database

## Tests

pytest with an in-memory span exporter holds S2 to S6: planted values for S4, an
inbound `traceparent` for S3, the probes and a 4xx for S5, captured log lines for S6.
S1 is an observed run with Jaeger. S8's file checks join STY-090's Compose test.

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

## Out of scope

- Metrics, hosted export and sampling, and trusting the load balancer's trace header:
  EPC-023.
- Instrumentation of outgoing HTTP calls: the first story that makes one (D14).
