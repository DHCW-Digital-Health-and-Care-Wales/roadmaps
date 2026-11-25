# AGENTS.md — the API's database tests

Rules for tests that reach the database, beside `apps/api/AGENTS.md`. A repository,
migration, role or row-level security test lives here; any API test may take the
harness's fixtures.

## The harness (`apps/api/tests/harness.py`, `apps/api/tests/conftest.py`)

- `pnpm api:test` runs pytest-xdist's workers, as many as the machine has cores and at
  most four. The controller builds a template database once per run, through the code
  `pnpm api:migrate` runs, plus the probe table; each worker clones its own, owned by
  `roadmaps_owner` and given the bootstrap file's database-scoped part, and drops it at
  its end. `-n0` runs one process.
- Connect as the application's login: take the `database_url` fixture. After each test
  that takes it, the worker's superuser connection empties every table but
  `alembic_version`, so the revision `/ready` reads stays.
- Only the harness holds the superuser connection (`worker_admin`, `harness.admin()`).
  Use it to set up what a test needs and to read catalogs, never as the login under test.
- Roles are shared by every worker on the cluster: a test that changes a role, a
  membership or a role's grants does it on throwaway roles of its own
  (`harness.unique_name`) and drops them, as `test_bootstrap.py` and `test_readiness.py`
  do. A test that needs a database the template's state does not fit makes its own with
  `harness.create_database` and drops it.
- A test that changes a table `alembic_version` aside, or the database's own state,
  puts it back before the next test on its worker.

## Row-level security and settings

- The probe table (`harness.PROBE_TABLE`) stands for a tenant-owned table: owned by the
  owner role, under forced row-level security with `TENANT_POLICY`
  (`apps/api/src/roadmaps_api/database.py`). It is the harness's, not a migration's, so
  the drift check leaves it out.
- Commit the transaction whose setting a test expects not to outlive it: a session that
  closes rolls back, and a rollback undoes even a session-wide `set_config`, so the test
  passes either way.
- Prove a refusal on the engine with a pool of one connection, so the next transaction
  meets the connection the last one used.
