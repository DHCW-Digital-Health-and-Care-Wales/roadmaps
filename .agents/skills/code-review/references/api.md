# Code review lenses: API

Diff-inspection lenses for `apps/api/` (applied in `../SKILL.md`'s working order).
Baseline rules live in `apps/api/AGENTS.md` and `ADR-017`–`ADR-020`; focus here on
failure modes CI cannot catch.

- **Transaction error paths.** Trace exceptions inside services for partial
  commits or leaked sessions, and check routes/repositories for renamed session
  helpers that bypass `apps/api/tools/check_transactions.py`.
- **Error-code drift and leaks.** Check every new or changed `ErrorCode` against
  its HTTP status, editor adapter mapping (`apps/api/AGENTS.md`, _Errors and
  responses_), and unhandled or `params` paths that could echo caller input or
  exception text.
- **Log-value provenance.** `ALLOWED_EXTRA_FIELDS` bounds keys, not values
  (`apps/api/AGENTS.md`, _Logs_): trace each logged value to a server-derived
  constant, ID or template, check DB functions never derive SQLSTATE or
  constraint names from data, and verify third-party loggers do not emit
  formatted caller text outside local dev.
- **Middleware ordering and startup edge cases.** Check `RequestContext` stays
  outermost in `apps/api/src/roadmaps_api/app.py` so Starlette refusals keep
  ADR-020's headers, and check new settings paths against `apps/api/AGENTS.md`
  (_Settings_) when unset or malformed.
- **Server-only coverage.** Verify behaviour only uvicorn exhibits (access
  logging, startup/shutdown, host/body middleware wiring) is exercised in
  `apps/api/tests/test_server.py`, not only `TestClient`.
