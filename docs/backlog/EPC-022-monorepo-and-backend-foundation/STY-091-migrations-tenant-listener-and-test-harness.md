# STY-091: Migrations, the per-transaction tenant and the database test harness

- **Status**: Placeholder — ADR-017 accepted (owner, 2026-11-21); promoted once its
  acceptance criteria are written
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-090 (hard)
- **Binding ADRs**: ADR-017 §Tenant and person, §Migrations, §Tests, ADR-015
- **Suggested model**: Opus — the foundations ADR-015's enforcement suite stands on

## Summary

The API gains Alembic migrations run as their own step, the database roles ADR-015
names, the listener that sets the tenant and the person on every transaction, and a test
harness on a real PostgreSQL 18 that runs as the application's role. The schema itself
comes in the stories after.

## Why this is a placeholder

ADR-017 is accepted (2026-11-21), but the acceptance criteria are not yet written.

## Rough shape of the work

_Not acceptance criteria._

- Alembic with the naming convention and a migrate command; the first revision creates
  ADR-015's owner, migration and application roles, idempotently, since roles are
  shared by every database in a container. Proposed default: each revision reviewed by
  hand, autogenerate only drafting.
- The `after_begin` listener, with tests that an absent tenant or person reads nothing
  and that neither setting outlives its transaction on a pooled connection.
- The template database, a database per worker, superuser `TRUNCATE` between tests
  (rows the migrations insert are restored after it);
  `apps/api/tests/integration/AGENTS.md`.
- `/ready` answers 503 `service.not_ready` until the database is at the code's Alembic
  head (owner, 2026-11-23, STY-090 D21); STY-090's `postgres:18` CI service container
  is the one this harness grows (STY-090 D5).

## Decisions

- **D1** (owner, 2026-11-23, STY-090 grilling round 6, STY-090 D21): `/ready` also
  answers 503 `service.not_ready` until the database is at the code's Alembic head, over
  connectivity only, so a version deployed before its migration step takes no traffic.
