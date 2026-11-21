# STY-090: The API skeleton runs locally and in CI

- **Status**: Placeholder — promoted once ADR-017 is accepted
- **Type**: Feature
- **Area**: CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-086 (hard), STY-087 (preferred order)
- **Binding ADRs**: ADR-017, ADR-016 §Workspace tooling
- **Suggested model**: Opus — the conventions every later API story copies

## Summary

`apps/api` starts: a FastAPI service on Python 3.15 that a developer runs with one
command beside a local PostgreSQL 18, answering health and readiness, refusing with
coded errors, logging JSON and tracing to a local Jaeger, with lint, types and tests in
CI. It holds no roadmap data yet.

## Why this is a placeholder

ADR-017 is Proposed.

## Rough shape of the work

_Not acceptance criteria._

- uv project, ruff, ty (pinned), import-linter and the transaction check.
- Settings, JSON logs, `/health` and `/ready`, OpenTelemetry with a Jaeger Compose
  profile; the error envelope and the domain error hierarchy.
- Compose `postgres:18`; the worktree script's API port and database container;
  `t3.json`; root `api:*` scripts; the editor's dev proxy.
- A CI job; Dependabot for uv; `apps/api/AGENTS.md`.
