"""S1 & S4: schema tables, constraints, forced RLS, exact privileges and definer bounds.

Verifies the migrated PostgreSQL 18 catalog directly against ADR-015, ADR-017, ADR-018,
ADR-019 and STY-103 D1-D16.
"""

import uuid
from dataclasses import dataclass

import psycopg
import pytest

from roadmaps_api.roles import (
    APP_ROLE,
    AUTH_DEFINER_ROLE,
    DEFINER_ROLES,
    HISTORY_DEFINER_ROLE,
    OWNER_ROLE,
    PLATFORM_DEFINER_ROLE,
    PLATFORM_ROLE,
    PURGE_ROLE,
)
from tests import harness

EXPECTED_TABLES = frozenset(
    {
        "alembic_version",
        "tenants",
        "people",
        "identities",
        "platform_audit_log",
        "tenant_scopes",
        "roles",
        "role_permissions",
        "memberships",
        "invitations",
        "change_sets",
        "change_summaries",
        "change_set_signoffs",
    }
)

TABLES_WITH_UUIDV7_PK = frozenset(
    {
        "tenants",
        "people",
        "identities",
        "platform_audit_log",
        "roles",
        "role_permissions",
        "memberships",
        "invitations",
        "change_sets",
        "change_summaries",
    }
)

EXPECTED_APP_PRIVILEGES: dict[str, frozenset[str]] = {
    "alembic_version": frozenset({"SELECT"}),
    "tenants": frozenset({"SELECT"}),
    "people": frozenset({"SELECT"}),
    "identities": frozenset({"SELECT"}),
    "platform_audit_log": frozenset(),
    "tenant_scopes": frozenset({"SELECT"}),
    "roles": frozenset({"SELECT", "INSERT", "UPDATE", "DELETE"}),
    "role_permissions": frozenset({"SELECT", "INSERT", "UPDATE", "DELETE"}),
    "memberships": frozenset({"SELECT", "INSERT", "UPDATE"}),
    "invitations": frozenset({"SELECT", "INSERT", "UPDATE"}),
    "change_sets": frozenset({"SELECT"}),
    "change_summaries": frozenset({"SELECT"}),
    "change_set_signoffs": frozenset(),
}

EXPECTED_HISTORY_DEFINER_PRIVILEGES: dict[str, frozenset[str]] = {
    "tenant_scopes": frozenset({"SELECT", "UPDATE"}),
    "change_sets": frozenset({"SELECT", "INSERT"}),
    "change_summaries": frozenset({"SELECT", "INSERT"}),
    "change_set_signoffs": frozenset({"SELECT", "INSERT"}),
}

EXPECTED_COMPOSITE_TENANT_FKS = frozenset(
    {
        ("role_permissions", ("tenant_id", "role_id"), "roles", ("tenant_id", "id")),
        ("memberships", ("tenant_id", "role_id"), "roles", ("tenant_id", "id")),
        ("invitations", ("tenant_id", "role_id"), "roles", ("tenant_id", "id")),
        ("change_summaries", ("tenant_id", "change_set_id"), "change_sets", ("tenant_id", "id")),
        (
            "change_set_signoffs",
            ("tenant_id", "change_set_id"),
            "change_sets",
            ("tenant_id", "id"),
        ),
    }
)

APP_CALLABLE_ROUTINES = frozenset(
    {
        "open_access_change_set(text,bytea,text,uuid)",
        "sign_off_access_change_set(uuid)",
    }
)

INTERNAL_DEFINER_ROUTINES = frozenset(
    {
        "open_access_change_set_internal(uuid,text,text,uuid,text,text,bytea,text,uuid)",
        "sign_off_access_change_set_internal(uuid,uuid)",
    }
)

TRIGGER_ROUTINES = frozenset(
    {
        "guard_access_working_write()",
        "record_access_change_summary()",
        "verify_change_set_signed_off()",
        "forbid_immutable_history_mutation()",
    }
)


def _table_privileges(connection: psycopg.Connection, role: str) -> dict[str, frozenset[str]]:
    rows = connection.execute(
        "SELECT c.relname, g.privilege_type"
        " FROM pg_class AS c,"
        " LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) AS g"
        " WHERE c.relnamespace = 'public'::regnamespace"
        " AND c.relkind = 'r'"
        " AND c.relname <> %s"
        " AND g.grantee = %s::regrole",
        (harness.PROBE_TABLE, role),
    ).fetchall()
    result: dict[str, set[str]] = {}
    for table_name, privilege in rows:
        result.setdefault(table_name, set()).add(privilege)
    return {table: frozenset(privs) for table, privs in result.items()}


def test_expected_tables_keys_timestamps_composite_fks_and_no_native_enums(
    worker_admin: psycopg.Connection,
) -> None:
    tables = {
        name
        for (name,) in worker_admin.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> %s",
            (harness.PROBE_TABLE,),
        ).fetchall()
    }
    assert tables == EXPECTED_TABLES

    # No native PostgreSQL enum types (ADR-015, ADR-017).
    enums = worker_admin.execute(
        "SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e'"
    ).fetchall()
    assert enums == []

    # Every surrogate-key table uses uuid + uuidv7() default.
    pk_defaults = dict(
        worker_admin.execute(
            "SELECT table_name, column_default"
            " FROM information_schema.columns"
            " WHERE table_schema = 'public' AND column_name = 'id' AND data_type = 'uuid'"
            " AND table_name <> %s",
            (harness.PROBE_TABLE,),
        ).fetchall()
    )
    assert set(pk_defaults) == TABLES_WITH_UUIDV7_PK
    assert all(default == "uuidv7()" for default in pk_defaults.values())

    # Every timestamp column uses timestamptz (no timestamp without time zone).
    naive_timestamps = worker_admin.execute(
        "SELECT table_name, column_name FROM information_schema.columns"
        " WHERE table_schema = 'public' AND data_type = 'timestamp without time zone'"
    ).fetchall()
    assert naive_timestamps == []

    # D3: memberships.role_id and invitations.role_id are NOT NULL (no membership_roles).
    role_id_nullability = dict(
        worker_admin.execute(
            "SELECT table_name, is_nullable FROM information_schema.columns"
            " WHERE table_schema = 'public' AND column_name = 'role_id'"
            " AND table_name IN ('memberships', 'invitations')"
        ).fetchall()
    )
    assert role_id_nullability == {"memberships": "NO", "invitations": "NO"}

    # Composite (tenant_id, ...) FKs between tenant-owned tables.
    fk_rows = worker_admin.execute(
        "SELECT"
        " c.conrelid::regclass::text,"
        " array_agg(src.attname ORDER BY ord.n),"
        " c.confrelid::regclass::text,"
        " array_agg(dst.attname ORDER BY ord.n)"
        " FROM pg_constraint AS c"
        " CROSS JOIN LATERAL unnest(c.conkey, c.confkey)"
        "   WITH ORDINALITY AS ord(src_num, dst_num, n)"
        " JOIN pg_attribute AS src ON src.attrelid = c.conrelid AND src.attnum = ord.src_num"
        " JOIN pg_attribute AS dst ON dst.attrelid = c.confrelid AND dst.attnum = ord.dst_num"
        " WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace"
        " GROUP BY c.oid, c.conrelid, c.confrelid"
    ).fetchall()
    composite_fks = {
        (src_table, tuple(src_cols), dst_table, tuple(dst_cols))
        for src_table, src_cols, dst_table, dst_cols in fk_rows
        if len(src_cols) > 1
    }
    assert composite_fks == EXPECTED_COMPOSITE_TENANT_FKS

    # identities has UNIQUE (issuer, subject) and UNIQUE (person_id, issuer) (S1, D14).
    identity_uniques = {
        tuple(cols)
        for (cols,) in worker_admin.execute(
            "SELECT array_agg(a.attname ORDER BY ord.n)"
            " FROM pg_constraint AS c"
            " CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS ord(attnum, n)"
            " JOIN pg_attribute AS a ON a.attrelid = c.conrelid AND a.attnum = ord.attnum"
            " WHERE c.conrelid = 'public.identities'::regclass AND c.contype = 'u'"
            " GROUP BY c.oid"
        ).fetchall()
    }
    assert {("issuer", "subject"), ("person_id", "issuer")} <= identity_uniques


def test_every_table_except_alembic_version_has_forced_rls_and_a_policy(
    worker_admin: psycopg.Connection,
) -> None:
    rls_rows = worker_admin.execute(
        "SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,"
        " (SELECT count(*) FROM pg_policies AS p"
        "  WHERE p.schemaname = 'public' AND p.tablename = c.relname)"
        " FROM pg_class AS c"
        " WHERE c.relnamespace = 'public'::regnamespace"
        " AND c.relkind = 'r' AND c.relname <> %s"
        " ORDER BY c.relname",
        (harness.PROBE_TABLE,),
    ).fetchall()
    by_table = {name: (rls, forced, count) for name, rls, forced, count in rls_rows}
    assert set(by_table) == EXPECTED_TABLES
    assert by_table["alembic_version"] == (False, False, 0)
    for table in EXPECTED_TABLES - {"alembic_version"}:
        rls, forced, policy_count = by_table[table]
        assert rls is True, f"{table} lacks ENABLE ROW LEVEL SECURITY"
        assert forced is True, f"{table} lacks FORCE ROW LEVEL SECURITY"
        assert policy_count >= 1, f"{table} has no RLS policy"


def test_exact_privileges_and_definer_bounds_after_migration(
    worker_admin: psycopg.Connection,
) -> None:
    app_privs = _table_privileges(worker_admin, APP_ROLE)
    for table, expected in EXPECTED_APP_PRIVILEGES.items():
        actual = app_privs.get(table, frozenset())
        assert actual == expected, f"roadmaps_app on {table}: {actual} != {expected}"
        assert "TRUNCATE" not in actual
        assert "REFERENCES" not in actual
        assert "TRIGGER" not in actual

    # roadmaps_history_definer is strictly append-only on history (D6, D16).
    hist_privs = _table_privileges(worker_admin, HISTORY_DEFINER_ROLE)
    assert hist_privs == EXPECTED_HISTORY_DEFINER_PRIVILEGES

    # Other definer roles and platform/purge caller roles hold zero table grants in STY-103.
    for role in (AUTH_DEFINER_ROLE, PLATFORM_DEFINER_ROLE, PLATFORM_ROLE, PURGE_ROLE):
        assert _table_privileges(worker_admin, role) == {}, f"{role} has unexpected table grants"

    # All routines in public: exact ownership, SECURITY DEFINER, pinned search_path, grants.
    routine_rows = worker_admin.execute(
        "SELECT oid::regprocedure::text, proowner::regrole::text, prosecdef, proconfig,"
        " coalesce(ARRAY(SELECT CASE WHEN g.grantee = 0 THEN 'PUBLIC'"
        "   ELSE g.grantee::regrole::text END"
        "   FROM aclexplode(coalesce(proacl, acldefault('f', proowner))) AS g"
        "   WHERE g.privilege_type = 'EXECUTE' AND g.grantee <> proowner), ARRAY[]::text[])"
        " FROM pg_proc WHERE pronamespace = 'public'::regnamespace"
        " ORDER BY 1"
    ).fetchall()
    expected_routines = APP_CALLABLE_ROUTINES | INTERNAL_DEFINER_ROUTINES | TRIGGER_ROUTINES
    assert {name for name, *_ in routine_rows} == expected_routines
    for name, owner, secdef, config, grantees in routine_rows:
        assert owner == HISTORY_DEFINER_ROLE, f"{name} owned by {owner}"
        assert secdef is True, f"{name} is not SECURITY DEFINER"
        assert config == ["search_path=pg_catalog, public"], f"{name} config={config}"
        grantee_set = set(grantees)
        assert "PUBLIC" not in grantee_set
        if name in APP_CALLABLE_ROUTINES:
            assert grantee_set == {APP_ROLE}
        elif name in INTERNAL_DEFINER_ROUTINES:
            assert grantee_set == {OWNER_ROLE, AUTH_DEFINER_ROLE, PLATFORM_DEFINER_ROLE}
        else:
            assert grantee_set == set(), f"trigger {name} granted EXECUTE to {grantee_set}"

    # S4: no definer or non-owner caller role owns non-routine objects or holds CREATE.
    for role in (*DEFINER_ROLES, APP_ROLE, PLATFORM_ROLE, PURGE_ROLE):
        non_routine_owned = worker_admin.execute(
            "SELECT relname FROM pg_class WHERE relowner = %s::regrole",
            (role,),
        ).fetchall()
        assert non_routine_owned == [], f"{role} owns relations {non_routine_owned}"
        has_db_create = worker_admin.execute(
            "SELECT has_database_privilege(%s, current_database(), 'CREATE')",
            (role,),
        ).fetchone()
        assert has_db_create == (False,), f"{role} holds CREATE on database"
        has_schema_create = worker_admin.execute(
            "SELECT bool_or(has_schema_privilege(%s, oid, 'CREATE')) FROM pg_namespace",
            (role,),
        ).fetchone()
        assert has_schema_create == (False,), f"{role} holds CREATE on a schema"

    # S4: platform and purge roles hold CONNECT + USAGE and zero table write grants.
    for role in (PLATFORM_ROLE, PURGE_ROLE):
        assert worker_admin.execute(
            "SELECT has_database_privilege(%s, current_database(), 'CONNECT')",
            (role,),
        ).fetchone() == (True,)
        assert worker_admin.execute(
            "SELECT has_schema_privilege(%s, 'public', 'USAGE')",
            (role,),
        ).fetchone() == (True,)


def test_platform_and_purge_logins_have_no_direct_table_or_app_routine_access(
    worker_database: str,
) -> None:
    for url in (harness.platform_url(worker_database), harness.purge_url(worker_database)):
        with psycopg.connect(url.replace("+psycopg", "")) as conn:
            for stmt in (
                "SELECT 1 FROM public.tenants",
                "SELECT 1 FROM public.roles",
                "SELECT 1 FROM public.platform_audit_log",
                (
                    "SELECT * FROM public.open_access_change_set("
                    "'k', decode(repeat('00', 32), 'hex'), NULL, NULL)"
                ),
            ):
                with (
                    conn.transaction(force_rollback=True),
                    pytest.raises(psycopg.errors.InsufficientPrivilege),
                ):
                    conn.execute(stmt.encode())


@dataclass(frozen=True)
class InvalidInsert:
    statement: str
    params: dict[str, object]


def _seed_tenant_person_role(
    connection: psycopg.Connection,
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    tenant_id = connection.execute(
        "INSERT INTO tenants (slug, name_en, name_cy) VALUES ('dhcw', 'DHCW', 'IGCD') RETURNING id"
    ).fetchone()
    assert tenant_id is not None
    person_id = connection.execute(
        "INSERT INTO people (display_name) VALUES ('Aled Jones') RETURNING id"
    ).fetchone()
    assert person_id is not None
    connection.execute(
        "INSERT INTO tenant_scopes (tenant_id, scope) VALUES (%s, 'access'), (%s, 'lists')",
        (tenant_id[0], tenant_id[0]),
    )
    cs_id = connection.execute(
        "SELECT change_set_id FROM open_access_change_set_internal("
        " %s, 'migration', 'system', NULL, 'test-seed', 'seed-role', %s, NULL, NULL)",
        (tenant_id[0], b"\x01" * 32),
    ).fetchone()
    assert cs_id is not None
    role_id = connection.execute(
        "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, 'Admin', 'admin')"
        " RETURNING id",
        (tenant_id[0],),
    ).fetchone()
    assert role_id is not None
    connection.execute(
        "SELECT sign_off_access_change_set_internal(%s, %s)", (tenant_id[0], cs_id[0])
    )
    return tenant_id[0], person_id[0], role_id[0]


def test_check_constraints_reject_invalid_values(
    database_url: str,  # noqa: ARG001 - requests table teardown after test
    worker_admin: psycopg.Connection,
) -> None:
    with worker_admin.transaction():
        tenant_id, person_id, role_id = _seed_tenant_person_role(worker_admin)

    invalid_cases: dict[str, InvalidInsert] = {
        "uppercase tenant slug": InvalidInsert(
            "INSERT INTO tenants (slug, name_en) VALUES (%(slug)s, 'Name')",
            {"slug": "DHCW"},
        ),
        "single-char tenant slug": InvalidInsert(
            "INSERT INTO tenants (slug, name_en) VALUES (%(slug)s, 'Name')",
            {"slug": "a"},
        ),
        "leading-hyphen tenant slug": InvalidInsert(
            "INSERT INTO tenants (slug, name_en) VALUES (%(slug)s, 'Name')",
            {"slug": "-dhcw"},
        ),
        "double-hyphen tenant slug": InvalidInsert(
            "INSERT INTO tenants (slug, name_en) VALUES (%(slug)s, 'Name')",
            {"slug": "a--b"},
        ),
        "64-char tenant slug": InvalidInsert(
            "INSERT INTO tenants (slug, name_en) VALUES (%(slug)s, 'Name')",
            {"slug": "a" * 64},
        ),
        "blank tenant name_en": InvalidInsert(
            "INSERT INTO tenants (slug, name_en) VALUES ('ab', '   ')",
            {},
        ),
        "blank tenant name_cy": InvalidInsert(
            "INSERT INTO tenants (slug, name_en, name_cy) VALUES ('ab', 'Valid', '   ')",
            {},
        ),
        "raw non-URL Google issuer (D14)": InvalidInsert(
            "INSERT INTO identities (person_id, issuer, subject, email)"
            " VALUES (%(p)s, 'accounts.google.com', 'sub-1', 'a@dhcw.nhs.uk')",
            {"p": person_id},
        ),
        "invalid role system_key": InvalidInsert(
            "INSERT INTO roles (tenant_id, name, system_key) VALUES (%(t)s, 'Owner', 'owner')",
            {"t": tenant_id},
        ),
        "invalid permission format": InvalidInsert(
            "INSERT INTO role_permissions (tenant_id, role_id, permission)"
            " VALUES (%(t)s, %(r)s, 'NOT_VALID')",
            {"t": tenant_id, "r": role_id},
        ),
        "unknown invitation provider": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at)"
            " VALUES (%(t)s, 'a@b.uk', 'github', %(r)s, %(h)s, 'person', %(p)s,"
            " now() + interval '7 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x02" * 32, "p": person_id},
        ),
        "short invitation token_hash": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at)"
            " VALUES (%(t)s, 'a@b.uk', 'google', %(r)s, %(h)s, 'person', %(p)s,"
            " now() + interval '7 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x02" * 16, "p": person_id},
        ),
        "person invitation with platform execution id": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, issued_by_platform_execution_id, expires_at)"
            " VALUES (%(t)s, 'a@b.uk', 'google', %(r)s, %(h)s, 'person', %(p)s, 'exec-1',"
            " now() + interval '7 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x03" * 32, "p": person_id},
        ),
        "platform invitation without execution id": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, expires_at)"
            " VALUES (%(t)s, 'a@b.uk', 'google', %(r)s, %(h)s, 'platform_job',"
            " now() + interval '7 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x04" * 32},
        ),
        "invitation both revoked and redeemed": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at,"
            " revoked_at, revoked_by_kind, revoked_by_person_id,"
            " redeemed_at, redeemed_by_person_id)"
            " VALUES (%(t)s, 'a@b.uk', 'google', %(r)s, %(h)s, 'person', %(p)s,"
            " now() + interval '7 days', now(), 'person', %(p)s, now(), %(p)s)",
            {"t": tenant_id, "r": role_id, "h": b"\x05" * 32, "p": person_id},
        ),
        "platform_audit_log person actor with actor_ref": InvalidInsert(
            "INSERT INTO platform_audit_log (action, actor_kind, actor_person_id, actor_ref,"
            " target_type, target_id)"
            " VALUES ('person.created', 'person', %(p)s, 'exec-1', 'person', %(p)s)",
            {"p": person_id},
        ),
        "platform_audit_log non-object details": InvalidInsert(
            "INSERT INTO platform_audit_log (action, actor_kind, actor_ref,"
            " target_type, target_id, details)"
            " VALUES ('tenant.created', 'platform_job', 'exec-1', 'tenant', %(t)s, '[]'::jsonb)",
            {"t": tenant_id},
        ),
        "change_sets invalid revision increment": InvalidInsert(
            "INSERT INTO change_sets (tenant_id, scope, kind, actor_kind, actor_ref,"
            " base_revision, revision, idempotency_key, request_hash)"
            " VALUES (%(t)s, 'access', 'access_change', 'system', 'test', 0, 2, 'bad-rev', %(h)s)",
            {"t": tenant_id, "h": b"\x06" * 32},
        ),
        "change_sets roadmap scope without scope_id": InvalidInsert(
            "INSERT INTO change_sets (tenant_id, scope, scope_id, kind, actor_kind, actor_ref,"
            " base_revision, revision, idempotency_key, request_hash)"
            " VALUES (%(t)s, 'roadmap', NULL, 'save', 'system', 'test', 0, 1, 'bad-scope', %(h)s)",
            {"t": tenant_id, "h": b"\x07" * 32},
        ),
    }

    for case in invalid_cases.values():
        with (
            worker_admin.transaction(force_rollback=True),
            pytest.raises(psycopg.errors.CheckViolation),
        ):
            worker_admin.execute(case.statement.encode(), case.params)


def test_partial_unique_indexes_allow_ended_rejoin_and_custom_roles_while_enforcing_uniqueness(
    database_url: str,  # noqa: ARG001 - requests table teardown after test
    worker_admin: psycopg.Connection,
) -> None:
    with worker_admin.transaction():
        tenant_id, person_id, role_id = _seed_tenant_person_role(worker_admin)

    # D13: duplicate system_key per tenant fails; multiple NULL system_key custom roles succeed.
    with worker_admin.transaction(force_rollback=True):
        cs_id = worker_admin.execute(
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'test', 'uniq-roles', %s, NULL, NULL)",
            (tenant_id, b"\x08" * 32),
        ).fetchone()
        assert cs_id is not None
        worker_admin.execute(
            "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, 'Custom 1', NULL),"
            " (%s, 'Custom 2', NULL)",
            (tenant_id, tenant_id),
        )
        with pytest.raises(psycopg.errors.UniqueViolation):
            worker_admin.execute(
                "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, 'Admin 2', 'admin')",
                (tenant_id,),
            )

    # D8: two active memberships for one (tenant, person) fail; ended + active succeeds.
    with worker_admin.transaction(force_rollback=True):
        cs_id = worker_admin.execute(
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'test', 'uniq-members', %s, NULL, NULL)",
            (tenant_id, b"\x09" * 32),
        ).fetchone()
        assert cs_id is not None
        worker_admin.execute(
            "INSERT INTO memberships (tenant_id, person_id, role_id, ended_at)"
            " VALUES (%s, %s, %s, now() - interval '1 day')",
            (tenant_id, person_id, role_id),
        )
        worker_admin.execute(
            "INSERT INTO memberships (tenant_id, person_id, role_id) VALUES (%s, %s, %s)",
            (tenant_id, person_id, role_id),
        )
        with pytest.raises(psycopg.errors.UniqueViolation):
            worker_admin.execute(
                "INSERT INTO memberships (tenant_id, person_id, role_id) VALUES (%s, %s, %s)",
                (tenant_id, person_id, role_id),
            )
