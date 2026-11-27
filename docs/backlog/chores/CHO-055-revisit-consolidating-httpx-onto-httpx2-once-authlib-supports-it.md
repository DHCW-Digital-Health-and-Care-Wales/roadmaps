# CHO-055: Revisit consolidating `httpx` onto `httpx2` once `authlib` supports `httpx2`

- **Status**: Proposed — revisit around January 2027 once `authlib` supports `httpx2`
- **Type**: Chore
- **Area**: API
- **Epic**: standalone
- **Depends on**: STY-106 (hard — introduces `authlib` and `httpx` in `apps/api/pyproject.toml`)
- **Binding ADRs**: ADR-017, ADR-018
- **Suggested model**: Sonnet — check upstream `authlib` release for `httpx2` support, drop `httpx` if supported, verify API checks
- **Delivered**: _(add on delivery)_

## Summary

`STY-106` adopts `authlib` + `httpx` in `apps/api`'s runtime dependencies for production OIDC
(`OAuth2Client`, PKCE `S256` and `CodeIDToken` validation), while dev dependencies keep `httpx2`
because Starlette's `TestClient` migrated to `httpx2` and deprecates `httpx`. Carrying two HTTP
client stacks (`httpx` + `httpcore` + `certifi` at runtime, `httpx2` + `httpcore2` + `truststore`
in dev) is a temporary duplication until upstream `authlib` supports `httpx2`. Revisit around
January 2027 to drop `httpx` and consolidate onto `httpx2` if a supported `authlib` release is past
the 7-day `exclude-newer` cooldown.

## Measurement

At commit `94196e09` (`apps/api/pyproject.toml`, `apps/api/uv.lock`, `starlette.testclient`):

| Area                         | Measurement                                                                                                                    | Verdict                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `starlette.testclient` (dev) | `if TYPE_CHECKING: import httpx2 as httpx`; falling back to `httpx` raises `StarletteDeprecationWarning` (error under pytest)  | `httpx2` required in dev dependencies         |
| `authlib==1.9.10` (runtime)  | `authlib.integrations.httpx_client.OAuth2Client` binds to `httpx` (`0.28.1` + `httpcore` + `certifi`), not `httpx2` (`2.16.2`) | Temporary runtime `httpx` beside dev `httpx2` |

## Acceptance criteria

### S1: Consolidate onto `httpx2` if upstream `authlib` supports it

**Given** the revisit date (January 2027 or later) and an `authlib` release past `apps/api/pyproject.toml`'s 7-day `exclude-newer` cooldown
**When** `authlib`'s synchronous OIDC client integration is checked for native `httpx2` support
**Then** if supported, `apps/api/src/roadmaps_api/identity/` migrates to `httpx2`, `httpx` (and its unused transitive deps) are removed from `apps/api/pyproject.toml` and `apps/api/uv.lock`, and `pnpm api:lint`, `pnpm api:typecheck`, `pnpm api:openapi:check` and `pnpm api:test` pass
**And** if `authlib` still does not support `httpx2`, the check date and upstream status are recorded in Decisions and the chore is deferred or closed by the owner

## Decisions

- **D1** (owner, 2026-11-27, `STY-106` grilling R2 #1a): Filed with a target revisit around
  January 2027 to check whether `authlib` supports `httpx2` so `apps/api` can remove the
  duplicate runtime `httpx` stack.
