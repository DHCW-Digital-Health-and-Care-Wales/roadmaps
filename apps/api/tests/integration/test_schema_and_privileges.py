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
    CALLER_ROLES,
    DEFINER_ROLES,
    HISTORY_DEFINER_ROLE,
    OWNER_ROLE,
    PLATFORM_DEFINER_ROLE,
    PLATFORM_ROLE,
    PURGE_ROLE,
)
from tests import harness
from tools.bootstrap_database import libpq_url

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
        "sessions",
        "sign_in_transactions",
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
        "sessions",
        "sign_in_transactions",
    }
)

EXPECTED_APP_PRIVILEGES: dict[str, frozenset[str]] = {
    "alembic_version": frozenset({"SELECT"}),
    "tenants": frozenset({"SELECT"}),
    "people": frozenset({"SELECT"}),
    "identities": frozenset({"SELECT"}),
    "platform_audit_log": frozenset(),
    "tenant_scopes": frozenset({"SELECT"}),
    "roles": frozenset({"SELECT"}),
    "role_permissions": frozenset({"SELECT"}),
    "memberships": frozenset({"SELECT"}),
    "invitations": frozenset({"SELECT"}),
    "change_sets": frozenset({"SELECT"}),
    "change_summaries": frozenset({"SELECT"}),
    "change_set_signoffs": frozenset(),
    "sessions": frozenset(),
    "sign_in_transactions": frozenset(),
}

EXPECTED_APP_COLUMN_WRITE_PRIVILEGES: dict[tuple[str, str], frozenset[str]] = {
    ("memberships", "UPDATE"): frozenset({"role_id", "ended_at", "updated_at"}),
    ("invitations", "INSERT"): frozenset(
        {
            "tenant_id",
            "email",
            "provider",
            "role_id",
            "token_hash",
            "invited_by_kind",
            "invited_by_person_id",
            "issued_by_platform_execution_id",
            "expires_at",
            "revoked_at",
            "revoked_by_kind",
            "revoked_by_person_id",
            "revoked_by_platform_execution_id",
            "redeemed_at",
            "redeemed_by_person_id",
        }
    ),
    ("invitations", "UPDATE"): frozenset(
        {"revoked_at", "revoked_by_kind", "revoked_by_person_id", "updated_at"}
    ),
}

EXPECTED_HISTORY_DEFINER_PRIVILEGES: dict[str, frozenset[str]] = {
    "tenant_scopes": frozenset({"SELECT", "UPDATE"}),
    "change_sets": frozenset({"SELECT", "INSERT"}),
    "change_summaries": frozenset({"SELECT", "INSERT"}),
    "change_set_signoffs": frozenset({"SELECT", "INSERT"}),
}

EXPECTED_AUTH_DEFINER_PRIVILEGES: dict[str, frozenset[str]] = {
    "people": frozenset({"SELECT"}),
    "identities": frozenset({"SELECT"}),
    "sessions": frozenset({"SELECT", "INSERT", "UPDATE", "DELETE"}),
    "sign_in_transactions": frozenset({"SELECT", "INSERT", "UPDATE", "DELETE"}),
}

EXPECTED_AUTH_DEFINER_COLUMN_WRITE_PRIVILEGES: dict[tuple[str, str], frozenset[str]] = {
    ("people", "UPDATE"): frozenset({"display_name", "updated_at"}),
    ("identities", "UPDATE"): frozenset({"email", "last_sign_in_at", "updated_at"}),
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

APP_CALLABLE_HISTORY_ROUTINES = frozenset(
    {
        "open_access_change_set(text,bytea,text,uuid)",
        "sign_off_access_change_set(uuid)",
    }
)

INTERNAL_HISTORY_DEFINER_ROUTINES = frozenset(
    {
        "open_access_change_set_internal(uuid,text,text,uuid,text,text,bytea,text,uuid)",
        "sign_off_access_change_set_internal(uuid,uuid)",
    }
)

DEFINER_TRIGGER_ROUTINES = frozenset(
    {
        "guard_access_working_write()",
        "record_access_change_summary()",
        "verify_change_set_signed_off()",
    }
)

APP_CALLABLE_AUTH_ROUTINES = frozenset(
    {
        (
            "create_sign_in_transaction("
            "bytea,bytea,text,text,text,text,text,text,uuid,uuid,uuid,integer)"
        ),
        "consume_sign_in_transaction(bytea,bytea[],text,text)",
        "lookup_sign_in_identity(text,text)",
        "create_session(bytea,uuid,uuid,text,text,text)",
        "lookup_session(bytea)",
        "touch_session_activity(bytea)",
        "extend_session(uuid)",
        "revoke_session(uuid)",
        "revoke_all_person_sessions()",
    }
)

PURGE_CALLABLE_AUTH_ROUTINES = frozenset(
    {
        "purge_expired_sign_in_transactions()",
        "purge_ended_sessions()",
    }
)

INVOKER_TRIGGER_ROUTINES = frozenset({"forbid_immutable_history_mutation()"})


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


def _assert_public_routines(worker_admin: psycopg.Connection) -> tuple[set[int], set[int]]:
    """Asserts routine ownership, DEFINER/INVOKER mode, search_path and EXECUTE grants."""
    routine_rows = worker_admin.execute(
        "SELECT oid, oid::regprocedure::text, proowner::regrole::text, prosecdef, proconfig,"
        " coalesce(ARRAY(SELECT CASE WHEN g.grantee = 0 THEN 'PUBLIC'"
        "   ELSE g.grantee::regrole::text END"
        "   FROM aclexplode(coalesce(proacl, acldefault('f', proowner))) AS g"
        "   WHERE g.privilege_type = 'EXECUTE' AND g.grantee <> proowner), ARRAY[]::text[])"
        " FROM pg_proc WHERE pronamespace = 'public'::regnamespace"
        " ORDER BY 2"
    ).fetchall()
    expected_history_routines = (
        APP_CALLABLE_HISTORY_ROUTINES | INTERNAL_HISTORY_DEFINER_ROUTINES | DEFINER_TRIGGER_ROUTINES
    )
    expected_auth_routines = APP_CALLABLE_AUTH_ROUTINES | PURGE_CALLABLE_AUTH_ROUTINES
    assert {name for _oid, name, *_ in routine_rows} == (
        expected_history_routines | expected_auth_routines | INVOKER_TRIGGER_ROUTINES
    )
    for _oid, name, owner, secdef, config, grantees in routine_rows:
        assert config == ["search_path=pg_catalog, public, pg_temp"], f"{name} config={config}"
        grantee_set = set(grantees)
        assert "PUBLIC" not in grantee_set
        if name in INVOKER_TRIGGER_ROUTINES:
            assert (owner, secdef, grantee_set) == (OWNER_ROLE, False, set())
            continue
        assert secdef is True, f"{name} is not SECURITY DEFINER"
        if name in expected_history_routines:
            assert owner == HISTORY_DEFINER_ROLE, f"{name} owned by {owner}"
            if name in APP_CALLABLE_HISTORY_ROUTINES:
                assert grantee_set == {APP_ROLE}
            elif name in INTERNAL_HISTORY_DEFINER_ROUTINES:
                assert grantee_set == {OWNER_ROLE, AUTH_DEFINER_ROLE, PLATFORM_DEFINER_ROLE}
            else:
                assert grantee_set == set(), f"trigger {name} granted EXECUTE to {grantee_set}"
        else:
            assert owner == AUTH_DEFINER_ROLE, f"{name} owned by {owner}"
            if name in APP_CALLABLE_AUTH_ROUTINES:
                assert grantee_set == {APP_ROLE}, f"{name} grantees={grantee_set}"
            else:
                assert grantee_set == {PURGE_ROLE}, f"{name} grantees={grantee_set}"
    return (
        {oid for oid, name, *_ in routine_rows if name in expected_history_routines},
        {oid for oid, name, *_ in routine_rows if name in expected_auth_routines},
    )


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

    # Every non-SELECT column privilege for roadmaps_app across all public tables.
    col_write_rows = worker_admin.execute(
        "SELECT table_name, privilege_type, column_name"
        " FROM information_schema.column_privileges"
        " WHERE table_schema = 'public' AND table_name <> %s"
        " AND grantee = %s AND privilege_type <> 'SELECT'",
        (harness.PROBE_TABLE, APP_ROLE),
    ).fetchall()
    actual_col_writes: dict[tuple[str, str], set[str]] = {}
    for table_name, priv_type, col_name in col_write_rows:
        actual_col_writes.setdefault((table_name, priv_type), set()).add(col_name)
    assert {
        key: frozenset(cols) for key, cols in actual_col_writes.items()
    } == EXPECTED_APP_COLUMN_WRITE_PRIVILEGES

    # roadmaps_history_definer is strictly append-only on history (D6, D16).
    hist_privs = _table_privileges(worker_admin, HISTORY_DEFINER_ROLE)
    assert hist_privs == EXPECTED_HISTORY_DEFINER_PRIVILEGES

    # roadmaps_auth_definer holds only minimal table/column grants for auth & purge (STY-106).
    auth_privs = _table_privileges(worker_admin, AUTH_DEFINER_ROLE)
    assert auth_privs == EXPECTED_AUTH_DEFINER_PRIVILEGES
    auth_col_writes_rows = worker_admin.execute(
        "SELECT table_name, privilege_type, column_name"
        " FROM information_schema.column_privileges"
        " WHERE table_schema = 'public' AND table_name <> %s"
        " AND grantee = %s AND privilege_type <> 'SELECT'"
        " AND table_name NOT IN ('sessions', 'sign_in_transactions')",
        (harness.PROBE_TABLE, AUTH_DEFINER_ROLE),
    ).fetchall()
    actual_auth_col_writes: dict[tuple[str, str], set[str]] = {}
    for table_name, priv_type, col_name in auth_col_writes_rows:
        actual_auth_col_writes.setdefault((table_name, priv_type), set()).add(col_name)
    assert {
        key: frozenset(cols) for key, cols in actual_auth_col_writes.items()
    } == EXPECTED_AUTH_DEFINER_COLUMN_WRITE_PRIVILEGES

    # Platform definer and platform/purge caller roles hold zero table grants.
    for role in (PLATFORM_DEFINER_ROLE, PLATFORM_ROLE, PURGE_ROLE):
        assert _table_privileges(worker_admin, role) == {}, f"{role} has unexpected table grants"

    expected_history_definer_oids, expected_auth_definer_oids = _assert_public_routines(
        worker_admin
    )

    # S4: verify exact object ownership via pg_shdepend across all object types in this
    # database plus cluster-wide shared objects (excluding pg_default_acl rules created by
    # bootstrap.sql), no CREATE on any database or schema, and exact role-scoped RLS policies.
    owned_query = (
        "SELECT classid::regclass::text, objid FROM pg_shdepend"
        " WHERE refclassid = 'pg_authid'::regclass AND deptype = 'o'"
        " AND classid <> 'pg_default_acl'::regclass"
        " AND dbid IN (0, (SELECT oid FROM pg_database WHERE datname = current_database()))"
        " AND refobjid = %s::regrole"
    )
    for role in (*CALLER_ROLES, PLATFORM_DEFINER_ROLE):
        owned_objects = worker_admin.execute(owned_query, (role,)).fetchall()
        assert owned_objects == [], f"{role} owns objects {owned_objects}"

    hist_owned = worker_admin.execute(owned_query, (HISTORY_DEFINER_ROLE,)).fetchall()
    assert {cls for cls, _oid in hist_owned} == {"pg_proc"}
    assert {oid for _cls, oid in hist_owned} == expected_history_definer_oids

    auth_owned = worker_admin.execute(owned_query, (AUTH_DEFINER_ROLE,)).fetchall()
    assert {cls for cls, _oid in auth_owned} == {"pg_proc"}
    assert {oid for _cls, oid in auth_owned} == expected_auth_definer_oids

    for role in (*DEFINER_ROLES, *CALLER_ROLES):
        has_db_create = worker_admin.execute(
            "SELECT bool_or(has_database_privilege(%s, oid, 'CREATE')) FROM pg_database",
            (role,),
        ).fetchone()
        assert has_db_create == (False,), f"{role} holds CREATE on a database"
        has_schema_create = worker_admin.execute(
            "SELECT bool_or(has_schema_privilege(%s, oid, 'CREATE')) FROM pg_namespace",
            (role,),
        ).fetchone()
        assert has_schema_create == (False,), f"{role} holds CREATE on a schema"

    # Exact role-scoped RLS policies for the three definer roles.
    definer_policies = worker_admin.execute(
        "SELECT role_name, tablename, cmd"
        " FROM pg_policies, LATERAL unnest(roles) AS role_name"
        " WHERE schemaname = 'public' AND role_name = ANY(%s)"
        " ORDER BY 1, 2, 3",
        (list(DEFINER_ROLES),),
    ).fetchall()
    assert definer_policies == [
        (AUTH_DEFINER_ROLE, "identities", "SELECT"),
        (AUTH_DEFINER_ROLE, "identities", "UPDATE"),
        (AUTH_DEFINER_ROLE, "people", "SELECT"),
        (AUTH_DEFINER_ROLE, "people", "UPDATE"),
        (AUTH_DEFINER_ROLE, "sessions", "DELETE"),
        (AUTH_DEFINER_ROLE, "sessions", "INSERT"),
        (AUTH_DEFINER_ROLE, "sessions", "SELECT"),
        (AUTH_DEFINER_ROLE, "sessions", "UPDATE"),
        (AUTH_DEFINER_ROLE, "sign_in_transactions", "DELETE"),
        (AUTH_DEFINER_ROLE, "sign_in_transactions", "INSERT"),
        (AUTH_DEFINER_ROLE, "sign_in_transactions", "SELECT"),
        (AUTH_DEFINER_ROLE, "sign_in_transactions", "UPDATE"),
        (HISTORY_DEFINER_ROLE, "change_set_signoffs", "INSERT"),
        (HISTORY_DEFINER_ROLE, "change_set_signoffs", "SELECT"),
        (HISTORY_DEFINER_ROLE, "change_sets", "INSERT"),
        (HISTORY_DEFINER_ROLE, "change_sets", "SELECT"),
        (HISTORY_DEFINER_ROLE, "change_summaries", "INSERT"),
        (HISTORY_DEFINER_ROLE, "change_summaries", "SELECT"),
        (HISTORY_DEFINER_ROLE, "tenant_scopes", "SELECT"),
        (HISTORY_DEFINER_ROLE, "tenant_scopes", "UPDATE"),
    ]

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
        with psycopg.connect(libpq_url(url)) as conn:
            for stmt in (
                "SELECT 1 FROM public.tenants",
                "SELECT 1 FROM public.roles",
                "SELECT 1 FROM public.platform_audit_log",
                "SELECT 1 FROM public.sessions",
                "SELECT 1 FROM public.sign_in_transactions",
                (
                    "SELECT * FROM public.open_access_change_set("
                    "'k', decode(repeat('00', 32), 'hex'), NULL, NULL)"
                ),
                "SELECT * FROM public.lookup_session(decode(repeat('00', 32), 'hex'))",
                "SELECT * FROM public.revoke_all_person_sessions()",
            ):
                with (
                    conn.transaction(force_rollback=True),
                    pytest.raises(psycopg.errors.InsufficientPrivilege),
                ):
                    conn.execute(stmt.encode())

    # Neither roadmaps_app nor roadmaps_platform may call retention purge routines,
    # and roadmaps_app cannot read sessions or sign_in_transactions directly.
    for url in (harness.app_url(worker_database), harness.platform_url(worker_database)):
        with psycopg.connect(libpq_url(url)) as conn:
            for stmt in (
                "SELECT public.purge_expired_sign_in_transactions()",
                "SELECT public.purge_ended_sessions()",
                "SELECT 1 FROM public.sessions",
                "SELECT 1 FROM public.sign_in_transactions",
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
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID]:
    tenant_id = harness.one_uuid(
        connection,
        "INSERT INTO tenants (slug, name_en, name_cy) VALUES ('dhcw', 'DHCW', 'IGCD') RETURNING id",
    )
    person_id = harness.one_uuid(
        connection,
        "INSERT INTO people (display_name) VALUES ('Aled Jones') RETURNING id",
    )
    identity_id = harness.one_uuid(
        connection,
        "INSERT INTO identities (person_id, issuer, subject, email)"
        " VALUES (%s, 'https://accounts.google.com', 'aled-sub', 'aled@dhcw.example') RETURNING id",
        (person_id,),
    )
    connection.execute(
        "INSERT INTO tenant_scopes (tenant_id, scope) VALUES (%s, 'access'), (%s, 'lists')",
        (tenant_id, tenant_id),
    )
    cs_id = harness.one_uuid(
        connection,
        "SELECT change_set_id FROM open_access_change_set_internal("
        " %s, 'migration', 'system', NULL, 'test-seed', 'seed-role', %s, NULL, NULL)",
        (tenant_id, b"\x01" * 32),
    )
    role_id = harness.one_uuid(
        connection,
        "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, 'Admin', 'admin')"
        " RETURNING id",
        (tenant_id,),
    )
    connection.execute("SELECT sign_off_access_change_set_internal(%s, %s)", (tenant_id, cs_id))
    return tenant_id, person_id, identity_id, role_id


def test_check_constraints_reject_invalid_values(
    database_url: str,  # noqa: ARG001 - requests table teardown after test
    worker_admin: psycopg.Connection,
) -> None:
    with worker_admin.transaction():
        tenant_id, person_id, identity_id, role_id = _seed_tenant_person_role(worker_admin)

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
            " VALUES (%(p)s, 'accounts.google.com', 'sub-1', 'a@example.org')",
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
            " VALUES (%(t)s, 'a@example.org', 'github', %(r)s, %(h)s, 'person', %(p)s,"
            " now() + interval '7 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x02" * 32, "p": person_id},
        ),
        "short invitation token_hash": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at)"
            " VALUES (%(t)s, 'a@example.org', 'google', %(r)s, %(h)s, 'person', %(p)s,"
            " now() + interval '7 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x02" * 16, "p": person_id},
        ),
        "person invitation with platform execution id": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, issued_by_platform_execution_id, expires_at)"
            " VALUES (%(t)s, 'a@example.org', 'google', %(r)s, %(h)s, 'person', %(p)s, 'exec-1',"
            " now() + interval '7 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x03" * 32, "p": person_id},
        ),
        "platform invitation without execution id": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, expires_at)"
            " VALUES (%(t)s, 'a@example.org', 'google', %(r)s, %(h)s, 'platform_job',"
            " now() + interval '7 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x04" * 32},
        ),
        "revoked invitation with NULL revoked_by_kind (3VL guard)": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at,"
            " revoked_at, revoked_by_kind, revoked_by_person_id)"
            " VALUES (%(t)s, 'a@example.org', 'google', %(r)s, %(h)s, 'person', %(p)s,"
            " now() + interval '7 days', now(), NULL, %(p)s)",
            {"t": tenant_id, "r": role_id, "h": b"\x0a" * 32, "p": person_id},
        ),
        "invitation both revoked and redeemed": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at,"
            " revoked_at, revoked_by_kind, revoked_by_person_id,"
            " redeemed_at, redeemed_by_person_id)"
            " VALUES (%(t)s, 'a@example.org', 'google', %(r)s, %(h)s, 'person', %(p)s,"
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
        "invitation exceeds 7-day max lifetime": InvalidInsert(
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at)"
            " VALUES (%(t)s, 'a@example.org', 'google', %(r)s, %(h)s, 'person', %(p)s,"
            " now() + interval '8 days')",
            {"t": tenant_id, "r": role_id, "h": b"\x0b" * 32, "p": person_id},
        ),
        "change_sets roadmap scope without scope_id": InvalidInsert(
            "INSERT INTO change_sets (tenant_id, scope, scope_id, kind, actor_kind, actor_ref,"
            " base_revision, revision, idempotency_key, request_hash)"
            " VALUES (%(t)s, 'roadmap', NULL, 'save', 'system', 'test', 0, 1, 'bad-scope', %(h)s)",
            {"t": tenant_id, "h": b"\x07" * 32},
        ),
        "sessions short token_hash": InvalidInsert(
            "INSERT INTO sessions (token_hash, person_id, identity_id, provider,"
            " idle_expires_at, absolute_expires_at)"
            " VALUES (%(h)s, %(p)s, %(i)s, 'google',"
            " now() + interval '1 hour', now() + interval '10 hours')",
            {"h": b"\x01" * 16, "p": person_id, "i": identity_id},
        ),
        "sessions idle past absolute": InvalidInsert(
            "INSERT INTO sessions (token_hash, person_id, identity_id, provider,"
            " idle_expires_at, absolute_expires_at)"
            " VALUES (%(h)s, %(p)s, %(i)s, 'google',"
            " now() + interval '5 hours', now() + interval '4 hours')",
            {"h": b"\x0c" * 32, "p": person_id, "i": identity_id},
        ),
        "sessions absolute over 10 hours": InvalidInsert(
            "INSERT INTO sessions (token_hash, person_id, identity_id, provider,"
            " idle_expires_at, absolute_expires_at)"
            " VALUES (%(h)s, %(p)s, %(i)s, 'google',"
            " now() + interval '1 hour', now() + interval '12 hours')",
            {"h": b"\x0d" * 32, "p": person_id, "i": identity_id},
        ),
        "sign_in_transactions invalid purpose": InvalidInsert(
            "INSERT INTO sign_in_transactions"
            " (state_hash, cookie_token_hash, nonce, code_verifier, provider, issuer,"
            "  purpose, return_path, expires_at)"
            " VALUES (%(s)s, %(c)s, 'n', 'v', 'google', 'https://accounts.google.com',"
            "  'other', '/', now() + interval '10 minutes')",
            {"s": b"\x0e" * 32, "c": b"\x0f" * 32},
        ),
        "sign_in_transactions redeem without invitation_id": InvalidInsert(
            "INSERT INTO sign_in_transactions"
            " (state_hash, cookie_token_hash, nonce, code_verifier, provider, issuer,"
            "  purpose, return_path, expires_at)"
            " VALUES (%(s)s, %(c)s, 'n', 'v', 'google', 'https://accounts.google.com',"
            "  'redeem', '/', now() + interval '10 minutes')",
            {"s": b"\x10" * 32, "c": b"\x11" * 32},
        ),
        "sign_in_transactions link without initiating session/person": InvalidInsert(
            "INSERT INTO sign_in_transactions"
            " (state_hash, cookie_token_hash, nonce, code_verifier, provider, issuer,"
            "  purpose, return_path, expires_at)"
            " VALUES (%(s)s, %(c)s, 'n', 'v', 'google', 'https://accounts.google.com',"
            "  'link', '/', now() + interval '10 minutes')",
            {"s": b"\x12" * 32, "c": b"\x13" * 32},
        ),
        "sign_in_transactions non-relative return_path": InvalidInsert(
            "INSERT INTO sign_in_transactions"
            " (state_hash, cookie_token_hash, nonce, code_verifier, provider, issuer,"
            "  purpose, return_path, expires_at)"
            " VALUES (%(s)s, %(c)s, 'n', 'v', 'google', 'https://accounts.google.com',"
            "  'sign-in', 'https://evil.example', now() + interval '10 minutes')",
            {"s": b"\x14" * 32, "c": b"\x15" * 32},
        ),
        "sign_in_transactions exceeds max lifetime": InvalidInsert(
            "INSERT INTO sign_in_transactions"
            " (state_hash, cookie_token_hash, nonce, code_verifier, provider, issuer,"
            "  purpose, return_path, expires_at)"
            " VALUES (%(s)s, %(c)s, 'n', 'v', 'google', 'https://accounts.google.com',"
            "  'sign-in', '/', now() + interval '1 hour')",
            {"s": b"\x16" * 32, "c": b"\x17" * 32},
        ),
    }

    for case_name, case in invalid_cases.items():
        with (
            worker_admin.transaction(force_rollback=True),
            pytest.raises(psycopg.errors.CheckViolation) as exc_info,
        ):
            worker_admin.execute(case.statement.encode(), case.params)
        assert exc_info.value.diag.constraint_name is not None, case_name


def test_partial_unique_indexes_allow_ended_rejoin_and_custom_roles_while_enforcing_uniqueness(
    database_url: str,  # noqa: ARG001 - requests table teardown after test
    worker_admin: psycopg.Connection,
) -> None:
    with worker_admin.transaction():
        tenant_id, person_id, _identity_id, role_id = _seed_tenant_person_role(worker_admin)

    # D13: duplicate system_key per tenant fails; multiple NULL system_key custom roles succeed.
    with worker_admin.transaction(force_rollback=True):
        harness.one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'test', 'uniq-roles', %s, NULL, NULL)",
            (tenant_id, b"\x08" * 32),
        )
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
        harness.one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'test', 'uniq-members', %s, NULL, NULL)",
            (tenant_id, b"\x09" * 32),
        )
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
