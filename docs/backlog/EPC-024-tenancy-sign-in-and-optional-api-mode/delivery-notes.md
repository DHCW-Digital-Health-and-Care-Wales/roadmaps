# EPC-024 delivery notes

What agents delivering or reviewing this epic's (and EPC-025's) API stories need; carried
from EPC-022 when the backend work moved here. See `docs/AGENTS.md`.

- **A thread keeps the request's trace only if it is given it**: a service that starts a
  thread runs it in `contextvars.copy_context()`, as `ReadinessService.check` does, or
  its queries leave the request's trace and its log lines lose the request ID. FastAPI's
  own telemetry stays off in `create_app` (its spans carry the query string), so a
  FastAPI bump re-reads `fastapi/telemetry/` for a new way it could turn on.
- **Row-level security does not cover `TRUNCATE` or `REFERENCES`**: PostgreSQL applies
  neither to policies, so `STY-103`'s enforcement suite also proves `roadmaps_app` holds
  neither on any table.
- **Before a route takes a request model, read `ApiRequestModel`'s docstring**
  (`apps/api/src/roadmaps_api/wire.py`): which keys FastAPI gives a query, header,
  cookie or body model decides what its `extra="forbid"` refuses.
- **A local API's log lines hold messages**: `ROADMAPS_ENV=local` writes an exception's
  and a third party's message (ADR-018 _STY-101 amendments_), so an API test that
  asserts no planted value reaches the log runs under test's or production's rules
  (`apps/api/tests/conftest.py`'s `lines` fixture, or production's settings).
- **The first migration that inserts seed/lookup rows must teach the test harness to put
  them back** after each `TRUNCATE … CASCADE`, with a test (carried from EPC-022 _The
  API's conventions_ / STY-091 D15).
- **Public-repo security hygiene (`STY-102` D7, D9, D12)**: never publish unfixed
  security gaps, severity/exploitability ratings, internal WAF/rate-limit thresholds,
  reviewer PII or internal ticket references in tracked files, commit messages, PR
  bodies, Review records, review threads or Delivery sections. If delivery or review
  discovers an unmitigated security gap, report it to the owner in chat first before
  writing it to any public surface.
