# CHO-054: Align the API guide's refusal rule with ADR-020's 422 `loc` rule

- **Status**: Proposed — deferred from CHO-053's retrospective
- **Type**: Docs
- **Area**: API + Docs
- **Epic**: standalone
- **Depends on**: CHO-053 (hard)
- **Binding ADRs**: ADR-020 (_CHO-053 amendments_)
- **Suggested model**: Haiku — one-line guide correction

## Summary

A 422 response omits submitted values, error messages and forbidden keys while passing
other Pydantic `loc` segments (such as a dictionary key) through (ADR-020 _CHO-053
amendments_). `apps/api/AGENTS.md:60` still states an absolute rule ("Never put
submitted input, an exception's text or a traceback in a response"), which contradicts
that amendment. Done: sharpen that line to state the exact refusal rule (no submitted
value, exception text, traceback or forbidden key; link ADR-020 for 422 `loc`
pass-through).

## Measurement

At commit `5430f6e8` (`origin/main`), `apps/api/AGENTS.md:60` reads:

> Never put submitted input, an exception's text or a traceback in a response, and send
> no CORS header (`apps/api/src/roadmaps_api/middleware.py`, ADR-020).

All three CHO-053 review lanes (Opus, Sonnet, Fable 5.2) handed that line off as broader
than ADR-020 _CHO-053 amendments_ for follow-up outside the delivery PR.

## Acceptance criteria

### S1: `apps/api/AGENTS.md` matches ADR-020 _CHO-053 amendments_

**Given** ADR-020 _CHO-053 amendments_ on `main`
**When** an agent reads `apps/api/AGENTS.md` under _Errors and responses_
**Then** the line forbids submitted values, exception text, tracebacks and forbidden keys
without falsely claiming no caller-chosen dictionary key can appear in a 422's `loc`,
and `pnpm format:check && pnpm test:docs` pass

## Decisions

- **D1** (agent, 2026-11-25, CHO-053 retro): recorded as a standalone chore rather than
  editing `apps/api/AGENTS.md` directly in the retro PR, which branched while PR #318
  (CHO-053) was still open.
