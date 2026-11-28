# CHO-055: Database tests set up incidental rows with the seed factories

- **Status**: Proposed — found by the retrospective after `STY-105`
- **Type**: Refactor
- **Area**: Infrastructure
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — each fixture needs reading to tell setup from the SQL
  under test
- **Delivered**: _(add on delivery)_

## Summary

`apps/api/tests/integration/AGENTS.md` has a test set up the rows it does not itself
exercise with `apps/api/tools/seed/factories.py`. Four suites still insert such rows in
raw SQL — in fixtures, a shared helper and test bodies — and are the nearest examples for
a new database test. Done is each of those rows coming from a factory, or from an ORM row
where no factory fits, with a comment saying why wherever SQL stays.

## Measurement

_At commit `267df749`, lines in `apps/api/tests/integration/` matching
`INSERT INTO (?:public\.)?(tenants|tenant_scopes|people|identities|roles|role_permissions|memberships|invitations)\b`,
setup and SQL under test together (`create_tenant` writes `tenant_scopes` and
`create_person_with_identity` writes `identities`, so those rows convert with them):_

| Area                            | Measurement | Verdict                                                                                                                      |
| ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `test_rls_isolation.py`         | 29 lines    | 19 are setup in `two_tenants` and 2 in a test body; keep the 8 in test bodies that exercise RLS write refusals               |
| `test_access_change_sets.py`    | 22 lines    | 11 are setup in `access_env`; judge the 11 in test bodies, keeping the SQL under test                                        |
| `test_schema_and_privileges.py` | 27 lines    | 5 are setup in `_seed_tenant_person_role`; judge the other 22, keeping the SQL whose refusal a test checks                   |
| `test_auth.py`                  | 4 lines     | 3 are identity setup in test bodies; keep the 1 disabled-trigger rogue permission row                                        |
| `test_seed.py`                  | 3 lines     | Keep, out of S1: each is a sentinel whose wiping or survival the test checks, written independently of the seeder under test |

The factories do not make every such row as it stands (an ended membership, a `google`
invitation, a second identity for an existing person).

## Acceptance criteria

### S1: Incidental setup comes from the factories

- **Given** the four suites' fixtures, helpers and test bodies (`test_rls_isolation.py`,
  `test_access_change_sets.py`, `test_schema_and_privileges.py`, `test_auth.py`)
- **When** they insert a row that the test it serves does not exercise
- **Then** a factory makes it, or an ORM row over `harness.admin_session()` where no
  factory fits, and any SQL that stays has a comment saying why
- **And** the suites' tests pass, each assertion unchanged

## Decisions
