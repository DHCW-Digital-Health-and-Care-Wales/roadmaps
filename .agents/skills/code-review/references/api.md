# Code review lenses: API

Lenses for a diff touching `apps/api/`. Apply them in `../SKILL.md`'s working
order, and grade and report findings as it sets. Baseline contracts live in
`apps/api/AGENTS.md` and `ADR-017`–`ADR-020`; this file focuses on failure modes
CI cannot catch.

- **Transaction and session lifecycles.** Check error paths inside services:
  exceptions must roll back cleanly with no partial commit or leaked session,
  and helpers called from routes or repositories must not hide session commits
  behind a renamed wrapper that bypasses `apps/api/tools/check_transactions.py`.
- **Error-code and adapter drift.** Every new or changed `ErrorCode` in
  `apps/api/src/roadmaps_api/errors.py` maps to an HTTP status, stable detail
  and matching editor adapter handling (ADR-017 _Errors_), with no caller input,
  exception message or traceback leaking through `params` or unhandled paths.
- **Indirect PII and diagnostic leaks.** An allow-listed `extra` key in
  `apps/api/src/roadmaps_api/logs.py` bounds names, not values: trace every
  logged value back to a server-derived constant, ID or template, never raw
  caller input or user text. Check database functions never populate SQLSTATE or
  constraint names from data values, and verify third-party loggers do not emit
  formatted caller text outside `ROADMAPS_ENV=local` without Cloud Run markers.
- **Fail-closed settings and middleware order.** Verify new `ROADMAPS_*`
  settings default to production rules when unset, name only the setting (never
  its value) on startup failure, and keep `RequestContext` outermost in
  `create_app` so Starlette's own refusals still carry ADR-020's headers and
  never emit CORS headers.
- **Server-only behaviour.** Check that behaviour only uvicorn exhibits (access
  logging, startup/shutdown, host/body middleware wiring) is covered by
  `apps/api/tests/test_server.py`, not only `TestClient`.
