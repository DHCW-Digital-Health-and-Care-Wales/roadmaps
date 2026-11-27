"""Integration tests for STY-093 deterministic seeder against real PostgreSQL 18.

Covers S1 (truncate + ORM seeding through real access open/sign-off triggers),
S2 (determinism across runs and `--seed` variation), S3 (hash-only token storage,
zero raw tokens in DB or structured logs, CLI stdout summary), S4 (non-superuser
refusal before mutation and `PGHOSTADDR` pinning on the ORM engine), and S5
(reusable factories without auto-seeding empty-DB tests and real `roadmaps_app` RLS).
"""

import hashlib
import json
import os
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg import sql
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.authz import SHIPPED_ROLES, ShippedRoleKey
from roadmaps_api.database import session_info
from roadmaps_api.migrations import latest_revision
from roadmaps_api.models import (
    ChangeSet,
    ChangeSummary,
    Identity,
    Invitation,
    Membership,
    Person,
    Role,
    RolePermission,
    Tenant,
    TenantScope,
)
from roadmaps_api.settings import ENV, SettingsError
from tests import harness
from tests.support import Lines
from tools.bootstrap_database import ADMIN_DATABASE_URL
from tools.seed import (
    CWM_AUR_SLUG,
    DEFAULT_SEED,
    DHCW_SLUG,
    LOCAL_MOCK_ISSUER,
    NAMED_PERSONAS,
    ChangeSetRequest,
    InvitationInput,
    MembershipInput,
    PersonInput,
    SeedResult,
    TenantSpec,
    create_invitation,
    create_membership,
    create_person_with_identity,
    create_shipped_roles,
    create_tenant,
    person_access_change_set,
    run_seed,
    system_access_change_set,
)
from tools.seed.deterministic import request_hash_for

API_DIR = Path(__file__).parent.parent.parent
FIXED_NOW = datetime(2026, 11, 27, 12, 0, 0, tzinfo=UTC)

ORM_TABLES = (
    "tenants",
    "tenant_scopes",
    "people",
    "identities",
    "roles",
    "role_permissions",
    "memberships",
    "invitations",
    "platform_audit_log",
)
ALL_SEEDED_TABLES = (*ORM_TABLES, "change_sets", "change_summaries", "change_set_signoffs")


def _table_count(connection: psycopg.Connection, table: str) -> int:
    row = connection.execute(
        sql.SQL("SELECT count(*) FROM public.{}").format(sql.Identifier(table))
    ).fetchone()
    assert row is not None
    return int(row[0])


def _snapshot_database(
    connection: psycopg.Connection,
) -> tuple[dict[str, list[tuple[Any, ...]]], list[tuple[Any, ...]], list[tuple[Any, ...]]]:
    orm_rows: dict[str, list[tuple[Any, ...]]] = {}
    for table in ORM_TABLES:
        if table == "tenant_scopes":
            # open_access_change_set_internal sets updated_at = now() on the 'access' row;
            # compare deterministic columns plus the untouched 'lists' anchor timestamp.
            orm_rows[table] = connection.execute(
                "SELECT tenant_id, scope, revision,"
                " CASE WHEN scope = 'lists' THEN updated_at ELSE NULL END"
                " FROM public.tenant_scopes ORDER BY tenant_id, scope"
            ).fetchall()
            continue
        orm_rows[table] = connection.execute(
            sql.SQL("SELECT * FROM public.{} ORDER BY id").format(sql.Identifier(table))
        ).fetchall()

    change_sets = connection.execute(
        "SELECT cs.tenant_id, cs.scope, cs.scope_id, cs.kind, cs.actor_kind,"
        " cs.actor_person_id, cs.actor_ref, cs.base_revision, cs.revision,"
        " cs.idempotency_key, cs.request_hash, cs.note, cs.batch_ref,"
        " (s.change_set_id IS NOT NULL) AS is_signed_off"
        " FROM public.change_sets AS cs"
        " LEFT JOIN public.change_set_signoffs AS s"
        "   ON s.tenant_id = cs.tenant_id AND s.change_set_id = cs.id"
        " ORDER BY cs.tenant_id, cs.scope, cs.revision"
    ).fetchall()

    summaries = connection.execute(
        "SELECT cs.tenant_id, cs.revision, sm.entity_type, sm.entity_id,"
        " sm.action, sm.field, sm.old_value, sm.new_value"
        " FROM public.change_summaries AS sm"
        " JOIN public.change_sets AS cs"
        "   ON cs.tenant_id = sm.tenant_id AND cs.id = sm.change_set_id"
        " ORDER BY cs.tenant_id, cs.revision, sm.entity_type, sm.entity_id,"
        "   sm.action, coalesce(sm.field, '')"
    ).fetchall()
    return orm_rows, change_sets, summaries


def test_empty_db_tests_are_never_auto_seeded(
    database_url: str,  # noqa: ARG001 - requests clean worker DB
    worker_admin: psycopg.Connection,
) -> None:
    for table in ALL_SEEDED_TABLES:
        assert _table_count(worker_admin, table) == 0, f"expected empty table {table}"


def test_seed_truncates_manual_edits_populates_all_tables_via_real_triggers_and_preserves_alembic(
    database_url: str,  # noqa: ARG001 - ensures teardown empties tables
    worker_database: str,
    worker_admin: psycopg.Connection,
) -> None:
    with worker_admin.transaction():
        worker_admin.execute(
            "INSERT INTO public.tenants (slug, name_en) VALUES ('manual-edit', 'Manual Edit')"
        )

    result = run_seed(harness.admin_url(worker_database), now=FIXED_NOW)

    version_row = worker_admin.execute("SELECT version_num FROM public.alembic_version").fetchone()
    assert version_row == (latest_revision().name,)

    tenant_slugs = {
        slug for (slug,) in worker_admin.execute("SELECT slug FROM public.tenants").fetchall()
    }
    assert tenant_slugs == {DHCW_SLUG, CWM_AUR_SLUG}
    for table in ALL_SEEDED_TABLES:
        assert _table_count(worker_admin, table) > 0, f"expected rows in {table}"

    for seeded_tenant in result.tenants:
        scopes = {
            scope
            for (scope,) in worker_admin.execute(
                "SELECT scope FROM public.tenant_scopes WHERE tenant_id = %s",
                (seeded_tenant.id,),
            ).fetchall()
        }
        assert scopes == {"access", "lists"}

        role_rows = worker_admin.execute(
            "SELECT id, system_key FROM public.roles WHERE tenant_id = %s",
            (seeded_tenant.id,),
        ).fetchall()
        assert {key for _rid, key in role_rows} == {key.value for key in ShippedRoleKey}
        for role_id, system_key in role_rows:
            perms = {
                perm
                for (perm,) in worker_admin.execute(
                    "SELECT permission FROM public.role_permissions"
                    " WHERE tenant_id = %s AND role_id = %s",
                    (seeded_tenant.id, role_id),
                ).fetchall()
            }
            assert perms == {perm.value for perm in SHIPPED_ROLES[ShippedRoleKey(system_key)]}

    identities = worker_admin.execute("SELECT issuer, email FROM public.identities").fetchall()
    assert len(identities) == len(NAMED_PERSONAS) + result.generated_member_count
    assert all(issuer == LOCAL_MOCK_ISSUER for issuer, _email in identities)
    assert all(email.endswith(".example") for _issuer, email in identities)

    ended_count = worker_admin.execute(
        "SELECT count(*) FROM public.memberships WHERE ended_at IS NOT NULL"
    ).fetchone()
    disabled_count = worker_admin.execute(
        "SELECT count(*) FROM public.people WHERE disabled_at IS NOT NULL"
    ).fetchone()
    assert ended_count == (1,)
    assert disabled_count == (1,)

    inv_rows = worker_admin.execute(
        "SELECT email, provider, created_at, expires_at, revoked_at, revoked_by_kind"
        " FROM public.invitations"
    ).fetchall()
    assert all(
        email.endswith(".example") and provider == "local_mock" for email, provider, *_ in inv_rows
    )
    pending = [r for r in inv_rows if r[4] is None and r[3] > FIXED_NOW]
    revoked = [r for r in inv_rows if r[4] is not None]
    expired = [r for r in inv_rows if r[4] is None and r[3] < FIXED_NOW]
    assert len(pending) >= 1
    assert all(r[2] == FIXED_NOW and r[3] == FIXED_NOW + timedelta(days=7) for r in pending)
    assert len(revoked) >= 1
    assert all(r[5] == "person" for r in revoked)
    assert len(expired) >= 1

    cs_rows = worker_admin.execute(
        "SELECT actor_kind, actor_person_id, actor_ref FROM public.change_sets"
    ).fetchall()
    assert ("system", None, "seed") in cs_rows
    primary_admin = next(p for p in result.personas if p.key == "dhcw_admin_primary")
    assert ("person", primary_admin.id, None) in cs_rows

    summary_triples = set(
        worker_admin.execute(
            "SELECT entity_type, action, field FROM public.change_summaries"
        ).fetchall()
    )
    assert {
        ("role", "added", None),
        ("role_permission", "added", None),
        ("membership", "added", None),
        ("invitation", "added", None),
        ("invitation", "changed", "revoked_at"),
        ("membership", "changed", "ended_at"),
    } <= summary_triples

    audit_actions = {
        (action, actor_kind, actor_ref)
        for action, actor_kind, actor_ref in worker_admin.execute(
            "SELECT action, actor_kind, actor_ref FROM public.platform_audit_log"
        ).fetchall()
    }
    assert {
        ("tenant.created", "system", "seed"),
        ("person.disabled", "system", "seed"),
    } <= audit_actions


def test_repeated_runs_are_deterministic_and_alternate_seed_varies_generated_data(
    database_url: str,  # noqa: ARG001 - ensures teardown empties tables
    worker_database: str,
    worker_admin: psycopg.Connection,
) -> None:
    admin_url = harness.admin_url(worker_database)

    first_result = run_seed(admin_url, seed=DEFAULT_SEED, now=FIXED_NOW)
    first_snapshot = _snapshot_database(worker_admin)

    second_result = run_seed(admin_url, seed=DEFAULT_SEED, now=FIXED_NOW)
    second_snapshot = _snapshot_database(worker_admin)

    assert first_result == second_result
    for table in ORM_TABLES:
        assert first_snapshot[0][table] == second_snapshot[0][table], f"diff in {table}"
    assert first_snapshot[1] == second_snapshot[1]
    assert first_snapshot[2] == second_snapshot[2]
    assert all(row[-1] is True for row in first_snapshot[1])

    # Different --seed varies Faker members and invitation tokens while keeping fixed contracts.
    other_result = run_seed(admin_url, seed=DEFAULT_SEED + 7, now=FIXED_NOW)
    other_snapshot = _snapshot_database(worker_admin)

    assert other_result.tenants == first_result.tenants
    assert other_result.personas == first_result.personas
    assert [inv.raw_token for inv in other_result.invitations] != [
        inv.raw_token for inv in first_result.invitations
    ]
    named_ids = {p.id for p in first_result.personas}
    first_generated_people = [row for row in first_snapshot[0]["people"] if row[0] not in named_ids]
    other_generated_people = [row for row in other_snapshot[0]["people"] if row[0] not in named_ids]
    assert first_generated_people != other_generated_people

    # Default clock (now=None) creates unexpired pending invitations with a 7-day lifetime.
    live_result = run_seed(admin_url, seed=DEFAULT_SEED)
    live_now = datetime.now(UTC)
    pending_invs = [inv for inv in live_result.invitations if inv.status == "pending"]
    assert pending_invs
    assert all(inv.expires_at > live_now for inv in pending_invs)


def test_invitations_store_only_sha256_hashes_and_cli_prints_summary_without_logging_tokens(
    database_url: str,  # noqa: ARG001 - ensures teardown empties tables
    worker_database: str,
    worker_admin: psycopg.Connection,
) -> None:
    completed = subprocess.run(
        [sys.executable, "-m", "tools.seed"],
        cwd=API_DIR,
        env={
            **os.environ,
            ENV: "test",
            ADMIN_DATABASE_URL: harness.admin_url(worker_database),
        },
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )
    assert completed.returncode == 0, completed.stderr
    assert completed.stderr == ""

    stdout_lines = completed.stdout.splitlines()
    log_line = json.loads(stdout_lines[0])
    assert log_line["logger"] == "roadmaps_api.seed"
    assert log_line["message"] == "seed.done"
    summary_text = "\n".join(stdout_lines[1:])

    result: SeedResult = run_seed(
        harness.admin_url(worker_database), seed=DEFAULT_SEED, now=FIXED_NOW
    )
    stored_hashes = dict(
        worker_admin.execute("SELECT id, token_hash FROM public.invitations").fetchall()
    )
    for inv in result.invitations:
        expected_hash = hashlib.sha256(inv.raw_token.encode("ascii")).digest()
        assert stored_hashes[inv.id] == expected_hash
        assert inv.raw_token not in json.dumps(log_line)
        if inv.status == "pending":
            assert inv.raw_token in summary_text
        else:
            assert inv.raw_token not in summary_text

    for table in ALL_SEEDED_TABLES:
        rows_text = "\n".join(
            row_text
            for (row_text,) in worker_admin.execute(
                sql.SQL("SELECT row_to_json(t)::text FROM public.{} AS t").format(
                    sql.Identifier(table)
                )
            ).fetchall()
        )
        for inv in result.invitations:
            assert inv.raw_token not in rows_text, f"raw token found in {table}"

    for persona in result.personas:
        assert persona.email in summary_text
        assert persona.subject in summary_text


def test_non_superuser_refusal_leaves_data_untouched_and_pghostaddr_is_pinned(
    database_url: str,
    worker_database: str,
    worker_admin: psycopg.Connection,
    lines: Lines,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with worker_admin.transaction():
        worker_admin.execute(
            "INSERT INTO public.tenants (slug, name_en) VALUES ('keep-me', 'Keep Me')"
        )

    with pytest.raises(SettingsError) as raised:
        run_seed(database_url, now=FIXED_NOW)
    assert raised.value.invalid == [ADMIN_DATABASE_URL]
    [log_line] = lines.read()
    assert log_line["invalid_settings"] == [ADMIN_DATABASE_URL]
    preserved = worker_admin.execute(
        "SELECT slug FROM public.tenants WHERE slug = 'keep-me'"
    ).fetchall()
    assert preserved == [("keep-me",)]

    # S4 #5 proof: even with PGHOSTADDR set to unroutable TEST-NET-1, full seed targets loopback.
    monkeypatch.setenv("PGHOSTADDR", "192.0.2.1")
    monkeypatch.setenv("PGCONNECT_TIMEOUT", "2")
    result = run_seed(harness.admin_url(worker_database), now=FIXED_NOW)
    assert {t.slug for t in result.tenants} == {DHCW_SLUG, CWM_AUR_SLUG}


def test_seed_factories_are_reusable_directly(
    database_url: str,  # noqa: ARG001 - ensures teardown empties tables
    worker_database: str,
    sessions: sessionmaker[Session],
) -> None:
    engine = create_engine(harness.admin_url(worker_database), hide_parameters=True)
    try:
        with Session(engine) as admin_session:
            tenant = create_tenant(
                admin_session,
                TenantSpec(
                    slug="factory-tenant", name_en="Factory Tenant", name_cy="Tenant Ffatri"
                ),
                created_at=FIXED_NOW,
            )
            person, _identity = create_person_with_identity(
                admin_session,
                PersonInput(
                    display_name="Carys Morgan",
                    email="carys.morgan@factory.example",
                    subject="local-factory-carys",
                    created_at=FIXED_NOW,
                ),
            )
            admin_session.flush()
            with system_access_change_set(
                admin_session,
                tenant.id,
                ChangeSetRequest(
                    idempotency_key="factory:bootstrap",
                    request_hash=request_hash_for(DEFAULT_SEED, "factory:bootstrap"),
                ),
            ):
                roles = create_shipped_roles(
                    admin_session, tenant_id=tenant.id, created_at=FIXED_NOW
                )
                create_membership(
                    admin_session,
                    MembershipInput(
                        tenant_id=tenant.id,
                        person_id=person.id,
                        role_id=roles[ShippedRoleKey.ADMIN].id,
                        created_at=FIXED_NOW,
                    ),
                )
            with person_access_change_set(
                admin_session,
                tenant.id,
                person.id,
                ChangeSetRequest(
                    idempotency_key="factory:invite",
                    request_hash=request_hash_for(DEFAULT_SEED, "factory:invite"),
                ),
            ):
                create_invitation(
                    admin_session,
                    InvitationInput(
                        tenant_id=tenant.id,
                        email="guest@factory.example",
                        role_id=roles[ShippedRoleKey.VIEWER].id,
                        raw_token="factory-raw-token",  # noqa: S106 - test fixture token
                        invited_by_person_id=person.id,
                        created_at=FIXED_NOW,
                        expires_at=FIXED_NOW + timedelta(days=7),
                    ),
                )
            tenant_id = tenant.id
            person_id = person.id
            admin_session.commit()
    finally:
        engine.dispose()

    with sessions(info=session_info(tenant_id=tenant_id, person_id=person_id)) as session:
        assert list(session.scalars(select(Tenant.slug))) == ["factory-tenant"]
        assert len(list(session.scalars(select(Role.id)))) == 3
        assert len(list(session.scalars(select(Invitation.id)))) == 1


def test_seeded_rows_satisfy_app_rls_isolation(
    database_url: str,  # noqa: ARG001 - ensures teardown empties tables
    worker_database: str,
    sessions: sessionmaker[Session],
) -> None:
    result = run_seed(harness.admin_url(worker_database), now=FIXED_NOW)
    dhcw = next(t for t in result.tenants if t.slug == DHCW_SLUG)
    cwm_aur = next(t for t in result.tenants if t.slug == CWM_AUR_SLUG)
    cwm_aur_admin = next(p for p in result.personas if p.key == "cwm_aur_admin")
    multi_tenant = next(p for p in result.personas if p.key == "multi_tenant_member")
    dhcw_ended = next(p for p in result.personas if p.key == "dhcw_ended_member")
    dhcw_admin = next(p for p in result.personas if p.key == "dhcw_admin_primary")

    with sessions(info=session_info(tenant_id=dhcw.id)) as session:
        assert list(session.scalars(select(Tenant.id))) == [dhcw.id]
        assert set(session.scalars(select(TenantScope.tenant_id))) == {dhcw.id}
        assert set(session.scalars(select(Role.tenant_id))) == {dhcw.id}
        assert set(session.scalars(select(RolePermission.tenant_id))) == {dhcw.id}
        assert set(session.scalars(select(Invitation.tenant_id))) == {dhcw.id}
        assert set(session.scalars(select(ChangeSet.tenant_id))) == {dhcw.id}
        assert set(session.scalars(select(ChangeSummary.tenant_id))) == {dhcw.id}

        dhcw_people = set(session.scalars(select(Person.id)))
        assert {dhcw_admin.id, multi_tenant.id, dhcw_ended.id} <= dhcw_people
        assert cwm_aur_admin.id not in dhcw_people

        dhcw_identity_people = set(session.scalars(select(Identity.person_id)))
        assert {dhcw_admin.id, multi_tenant.id} <= dhcw_identity_people
        assert dhcw_ended.id not in dhcw_identity_people
        assert cwm_aur_admin.id not in dhcw_identity_people

        active_member_people = set(session.scalars(select(Membership.person_id)))
        assert dhcw_ended.id not in active_member_people
        all_member_people = set(
            session.scalars(select(Membership.person_id).execution_options(include_ended=True))
        )
        assert dhcw_ended.id in all_member_people

    with sessions(info=session_info(tenant_id=cwm_aur.id)) as session:
        assert list(session.scalars(select(Tenant.id))) == [cwm_aur.id]
        cwm_people = set(session.scalars(select(Person.id)))
        assert {cwm_aur_admin.id, multi_tenant.id} <= cwm_people
        assert dhcw_admin.id not in cwm_people
        assert set(session.scalars(select(Invitation.tenant_id))) == {cwm_aur.id}

    with sessions(info=session_info(person_id=multi_tenant.id)) as session:
        assert set(session.scalars(select(Tenant.id))) == {dhcw.id, cwm_aur.id}
    with sessions(info=session_info(person_id=dhcw_ended.id)) as session:
        assert list(session.scalars(select(Tenant.id))) == []
        assert list(session.scalars(select(Person.id))) == [dhcw_ended.id]
