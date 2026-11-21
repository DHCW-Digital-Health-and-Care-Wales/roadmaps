# STY-091: Migrations, the per-transaction tenant and the database test harness

- **Status**: Placeholder — promoted once ADR-017 is accepted
- **Type**: Feature
- **Area**: Infrastructure + CI/CD
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

ADR-017 is Proposed, and the roles depend on the identity and authorisation ADRs.

## Rough shape of the work

_Not acceptance criteria._

- Alembic with the naming convention; a migrate command; the first revision's roles.
- The `after_begin` listener, with tests that the settings do not outlive their
  transaction on a pooled connection.
- Template database, a database per worker, superuser `TRUNCATE` between tests;
  `apps/api/tests/integration/AGENTS.md`.
