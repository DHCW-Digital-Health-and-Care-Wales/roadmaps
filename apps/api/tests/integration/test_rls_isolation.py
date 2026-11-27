"""S2, D8, D9, D11: tenant isolation, shared-table RLS, SoftEndMixin and pool hygiene.

Runs as `roadmaps_app` on a single-connection pool (`pool_size=1, max_overflow=0`) so
pooled transactions meet whatever an earlier committed transaction left behind.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session, aliased, selectinload, sessionmaker

from roadmaps_api.database import session_info
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
from tests.harness import one_uuid


@dataclass(frozen=True)
class TwoTenantFixture:
    tenant_a: uuid.UUID
    tenant_b: uuid.UUID
    person_a_active: uuid.UUID
    person_a_ended: uuid.UUID
    person_b_active: uuid.UUID
    person_ab: uuid.UUID
    role_a: uuid.UUID
    role_b: uuid.UUID
    membership_a_active: uuid.UUID
    membership_a_ended: uuid.UUID
    membership_b_active: uuid.UUID
    membership_ab_a: uuid.UUID
    membership_ab_b: uuid.UUID
    invitation_a: uuid.UUID
    invitation_b: uuid.UUID


@pytest.fixture
def two_tenants(
    database_url: str,  # noqa: ARG001 - ensures teardown empties tables
    worker_admin: psycopg.Connection,
) -> TwoTenantFixture:
    """Seeds two tenants, four people (active, ended, cross-tenant), roles and invitations."""
    expires_at = datetime.now(UTC) + timedelta(days=7)
    ended_at = datetime.now(UTC) - timedelta(days=1)

    with worker_admin.transaction():
        tenant_a = one_uuid(
            worker_admin,
            "INSERT INTO tenants (slug, name_en, name_cy) VALUES ('tenant-a', 'Tenant A', 'A')"
            " RETURNING id",
        )
        tenant_b = one_uuid(
            worker_admin,
            "INSERT INTO tenants (slug, name_en) VALUES ('tenant-b', 'Tenant B') RETURNING id",
        )
        for tenant in (tenant_a, tenant_b):
            worker_admin.execute(
                "INSERT INTO tenant_scopes (tenant_id, scope) VALUES (%s, 'access'), (%s, 'lists')",
                (tenant, tenant),
            )

        person_a_active = one_uuid(
            worker_admin, "INSERT INTO people (display_name) VALUES ('A Active') RETURNING id"
        )
        person_a_ended = one_uuid(
            worker_admin, "INSERT INTO people (display_name) VALUES ('A Ended') RETURNING id"
        )
        person_b_active = one_uuid(
            worker_admin, "INSERT INTO people (display_name) VALUES ('B Active') RETURNING id"
        )
        person_ab = one_uuid(
            worker_admin, "INSERT INTO people (display_name) VALUES ('AB Multi') RETURNING id"
        )

        for idx, person in enumerate((person_a_active, person_a_ended, person_b_active, person_ab)):
            worker_admin.execute(
                "INSERT INTO identities (person_id, issuer, subject, email)"
                " VALUES (%s, 'https://accounts.google.com', %s, %s)",
                (person, f"sub-{idx}", f"user-{idx}@example.org"),
            )

        worker_admin.execute(
            "INSERT INTO platform_audit_log"
            " (action, actor_kind, actor_ref, target_type, target_id)"
            " VALUES ('tenant.created', 'platform_job', 'exec-seed', 'tenant', %s)",
            (tenant_a,),
        )

        # Seed Tenant A access data via internal change set.
        cs_a = one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'seed', 'seed-a', %s, NULL, NULL)",
            (tenant_a, b"\x11" * 32),
        )
        role_a = one_uuid(
            worker_admin,
            "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, 'Admin', 'admin')"
            " RETURNING id",
            (tenant_a,),
        )
        worker_admin.execute(
            "INSERT INTO role_permissions (tenant_id, role_id, permission)"
            " VALUES (%s, %s, 'members:manage')",
            (tenant_a, role_a),
        )
        membership_a_active = one_uuid(
            worker_admin,
            "INSERT INTO memberships (tenant_id, person_id, role_id)"
            " VALUES (%s, %s, %s) RETURNING id",
            (tenant_a, person_a_active, role_a),
        )
        membership_a_ended = one_uuid(
            worker_admin,
            "INSERT INTO memberships (tenant_id, person_id, role_id, ended_at)"
            " VALUES (%s, %s, %s, %s) RETURNING id",
            (tenant_a, person_a_ended, role_a, ended_at),
        )
        membership_ab_a = one_uuid(
            worker_admin,
            "INSERT INTO memberships (tenant_id, person_id, role_id)"
            " VALUES (%s, %s, %s) RETURNING id",
            (tenant_a, person_ab, role_a),
        )
        invitation_a = one_uuid(
            worker_admin,
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at)"
            " VALUES (%s, 'invite-a@example.org', 'google', %s, %s, 'person', %s, %s)"
            " RETURNING id",
            (tenant_a, role_a, b"\xaa" * 32, person_a_active, expires_at),
        )
        worker_admin.execute("SELECT sign_off_access_change_set_internal(%s, %s)", (tenant_a, cs_a))

        # Seed Tenant B access data via internal change set.
        cs_b = one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'seed', 'seed-b', %s, NULL, NULL)",
            (tenant_b, b"\x22" * 32),
        )
        role_b = one_uuid(
            worker_admin,
            "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, 'Admin', 'admin')"
            " RETURNING id",
            (tenant_b,),
        )
        worker_admin.execute(
            "INSERT INTO role_permissions (tenant_id, role_id, permission)"
            " VALUES (%s, %s, 'members:manage')",
            (tenant_b, role_b),
        )
        membership_b_active = one_uuid(
            worker_admin,
            "INSERT INTO memberships (tenant_id, person_id, role_id)"
            " VALUES (%s, %s, %s) RETURNING id",
            (tenant_b, person_b_active, role_b),
        )
        membership_ab_b = one_uuid(
            worker_admin,
            "INSERT INTO memberships (tenant_id, person_id, role_id)"
            " VALUES (%s, %s, %s) RETURNING id",
            (tenant_b, person_ab, role_b),
        )
        invitation_b = one_uuid(
            worker_admin,
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at)"
            " VALUES (%s, 'invite-b@example.org', 'google', %s, %s, 'person', %s, %s)"
            " RETURNING id",
            (tenant_b, role_b, b"\xbb" * 32, person_b_active, expires_at),
        )
        worker_admin.execute("SELECT sign_off_access_change_set_internal(%s, %s)", (tenant_b, cs_b))

    return TwoTenantFixture(
        tenant_a=tenant_a,
        tenant_b=tenant_b,
        person_a_active=person_a_active,
        person_a_ended=person_a_ended,
        person_b_active=person_b_active,
        person_ab=person_ab,
        role_a=role_a,
        role_b=role_b,
        membership_a_active=membership_a_active,
        membership_a_ended=membership_a_ended,
        membership_b_active=membership_b_active,
        membership_ab_a=membership_ab_a,
        membership_ab_b=membership_ab_b,
        invitation_a=invitation_a,
        invitation_b=invitation_b,
    )


def test_unset_tenant_and_person_reads_and_writes_zero_rows(
    sessions: sessionmaker[Session], two_tenants: TwoTenantFixture
) -> None:
    with sessions() as session:
        for model in (
            Tenant,
            Person,
            Identity,
            TenantScope,
            Role,
            RolePermission,
            Membership,
            Invitation,
            ChangeSet,
            ChangeSummary,
        ):
            rows = list(session.scalars(select(model).execution_options(include_ended=True)))
            assert rows == [], f"expected 0 rows on {model.__tablename__} when unset"

        # platform_audit_log is completely inaccessible to roadmaps_app.
        with pytest.raises(ProgrammingError) as exc_info, session.begin_nested():
            session.execute(text("SELECT 1 FROM public.platform_audit_log"))
        assert isinstance(exc_info.value.orig, psycopg.errors.InsufficientPrivilege)

        # Unset tenant writes fail closed on app-writable tenant-owned tables (memberships,
        # invitations); roles and role_permissions are SELECT-only for roadmaps_app.
        assert (
            session.connection()
            .execute(text("UPDATE public.memberships SET ended_at = now()"))
            .rowcount
            == 0
        )
        assert (
            session.connection()
            .execute(text("UPDATE public.invitations SET revoked_at = now()"))
            .rowcount
            == 0
        )
        with pytest.raises(ProgrammingError) as insert_exc, session.begin_nested():
            session.execute(
                text(
                    "INSERT INTO public.invitations"
                    " (tenant_id, email, provider, role_id, token_hash,"
                    "  invited_by_kind, invited_by_person_id, expires_at)"
                    " VALUES (:t, 'unset@example.org', 'google', :r, :h,"
                    "  'person', :p, now() + interval '7 days')"
                ),
                {
                    "t": two_tenants.tenant_a,
                    "r": two_tenants.role_a,
                    "h": b"\x77" * 32,
                    "p": two_tenants.person_a_active,
                },
            )
        assert isinstance(insert_exc.value.orig, psycopg.errors.InsufficientPrivilege)


@pytest.mark.parametrize("with_multi_tenant_person", [False, True])
def test_tenant_a_isolates_tenant_b_rows_people_and_identities(
    sessions: sessionmaker[Session],
    two_tenants: TwoTenantFixture,
    *,
    with_multi_tenant_person: bool,
) -> None:
    person = two_tenants.person_ab if with_multi_tenant_person else None
    with sessions(info=session_info(tenant_id=two_tenants.tenant_a, person_id=person)) as session:
        assert list(session.scalars(select(Tenant.id))) == [two_tenants.tenant_a]
        assert set(session.scalars(select(TenantScope.tenant_id))) == {two_tenants.tenant_a}
        assert list(session.scalars(select(Role.id))) == [two_tenants.role_a]
        assert set(session.scalars(select(RolePermission.tenant_id))) == {two_tenants.tenant_a}
        assert list(session.scalars(select(Invitation.id))) == [two_tenants.invitation_a]
        assert set(session.scalars(select(ChangeSet.tenant_id))) == {two_tenants.tenant_a}
        assert set(session.scalars(select(ChangeSummary.tenant_id))) == {two_tenants.tenant_a}

        # Raw SQL memberships under tenant A sees all A memberships (including ended) and
        # NEVER leaks AB's membership in Tenant B.
        raw_membership_ids = set(session.scalars(text("SELECT id FROM public.memberships")))
        assert raw_membership_ids == {
            two_tenants.membership_a_active,
            two_tenants.membership_a_ended,
            two_tenants.membership_ab_a,
        }

        # D8: people RLS includes active AND ended members of Tenant A, excludes Tenant B only.
        visible_people = set(session.scalars(select(Person.id)))
        assert visible_people == {
            two_tenants.person_a_active,
            two_tenants.person_a_ended,
            two_tenants.person_ab,
        }

        # D9: identities RLS includes ONLY active members of Tenant A (not ended, not B).
        visible_identity_people = set(session.scalars(select(Identity.person_id)))
        assert visible_identity_people == {
            two_tenants.person_a_active,
            two_tenants.person_ab,
        }

        # Cross-tenant write attempts against Tenant B fail closed.
        assert (
            session.connection()
            .execute(
                text("UPDATE public.memberships SET ended_at = now() WHERE id = :id"),
                {"id": two_tenants.membership_b_active},
            )
            .rowcount
            == 0
        )
        assert (
            session.connection()
            .execute(
                text("UPDATE public.invitations SET revoked_at = now() WHERE id = :id"),
                {"id": two_tenants.invitation_b},
            )
            .rowcount
            == 0
        )
        with pytest.raises(ProgrammingError) as exc_info, session.begin_nested():
            session.execute(
                text(
                    "INSERT INTO public.invitations"
                    " (tenant_id, email, provider, role_id, token_hash,"
                    "  invited_by_kind, invited_by_person_id, expires_at)"
                    " VALUES (:t, 'cross@example.org', 'google', :r, :h,"
                    "  'person', :p, now() + interval '7 days')"
                ),
                {
                    "t": two_tenants.tenant_b,
                    "r": two_tenants.role_b,
                    "h": b"\x78" * 32,
                    "p": two_tenants.person_ab,
                },
            )
        assert isinstance(exc_info.value.orig, psycopg.errors.InsufficientPrivilege)

        # Fixed v1 roles and role_permissions are SELECT-only for roadmaps_app (ADR-019 Option 3).
        for write_sql in (
            "INSERT INTO public.roles (tenant_id, name) VALUES (:t, 'Custom')",
            "UPDATE public.roles SET name = 'Mutated' WHERE id = :r",
            "DELETE FROM public.roles WHERE id = :r",
            (
                "INSERT INTO public.role_permissions (tenant_id, role_id, permission)"
                " VALUES (:t, :r, 'roadmaps:edit')"
            ),
            "DELETE FROM public.role_permissions WHERE role_id = :r",
        ):
            with pytest.raises(ProgrammingError) as role_exc, session.begin_nested():
                session.execute(
                    text(write_sql),
                    {"t": two_tenants.tenant_a, "r": two_tenants.role_a},
                )
            assert isinstance(role_exc.value.orig, psycopg.errors.InsufficientPrivilege), write_sql


def test_person_keyed_policies_are_read_only_and_filter_ended_memberships(
    sessions: sessionmaker[Session], two_tenants: TwoTenantFixture
) -> None:
    # Ended member sees themselves and their own identity, but zero memberships/tenants (D11).
    with sessions(info=session_info(person_id=two_tenants.person_a_ended)) as session:
        assert list(session.scalars(select(Person.id))) == [two_tenants.person_a_ended]
        assert list(session.scalars(select(Identity.person_id))) == [two_tenants.person_a_ended]
        assert list(session.scalars(text("SELECT id FROM public.memberships"))) == []
        assert list(session.scalars(select(Tenant.id))) == []

    # Active multi-tenant member with no tenant set reads active memberships & tenants (read-only).
    with sessions(info=session_info(person_id=two_tenants.person_ab)) as session:
        assert set(session.scalars(text("SELECT id FROM public.memberships"))) == {
            two_tenants.membership_ab_a,
            two_tenants.membership_ab_b,
        }
        assert set(session.scalars(select(Tenant.id))) == {
            two_tenants.tenant_a,
            two_tenants.tenant_b,
        }
        # Other tenant-owned tables remain fail-closed when app.tenant_id is unset.
        for model in (TenantScope, Role, RolePermission, Invitation, ChangeSet, ChangeSummary):
            assert list(session.scalars(select(model))) == []

        # Person-keyed memberships policy is strictly read-only.
        assert (
            session.connection()
            .execute(
                text("UPDATE public.memberships SET ended_at = now() WHERE id = :id"),
                {"id": two_tenants.membership_ab_a},
            )
            .rowcount
            == 0
        )
        with pytest.raises(ProgrammingError) as insert_exc, session.begin_nested():
            session.execute(
                text(
                    "INSERT INTO public.memberships (tenant_id, person_id, role_id)"
                    " VALUES (:t, :p, :r)"
                ),
                {
                    "t": two_tenants.tenant_a,
                    "p": two_tenants.person_ab,
                    "r": two_tenants.role_a,
                },
            )
        assert isinstance(insert_exc.value.orig, psycopg.errors.InsufficientPrivilege)

        # D9: roadmaps_app holds no writes on tenants, people, identities or platform_audit_log.
        for write_sql in (
            "INSERT INTO public.tenants (slug, name_en) VALUES ('new-co', 'New')",
            "INSERT INTO public.people (display_name) VALUES ('New Person')",
            (
                "INSERT INTO public.identities (person_id, issuer, subject, email)"
                " VALUES (uuidv7(), 'https://accounts.google.com', 's', 'e@example.org')"
            ),
            (
                "INSERT INTO public.platform_audit_log"
                " (action, actor_kind, actor_ref, target_type, target_id)"
                " VALUES ('tenant.created', 'platform_job', 'e', 'tenant', uuidv7())"
            ),
        ):
            with pytest.raises(ProgrammingError) as write_exc, session.begin_nested():
                session.execute(text(write_sql))
            assert isinstance(write_exc.value.orig, psycopg.errors.InsufficientPrivilege)


def test_soft_end_mixin_filters_orm_selects_and_allows_include_ended(
    sessions: sessionmaker[Session], two_tenants: TwoTenantFixture
) -> None:
    with sessions(info=session_info(tenant_id=two_tenants.tenant_a)) as session:
        # Default ORM select hides ended memberships.
        active_ids = set(session.scalars(select(Membership.id)))
        assert active_ids == {two_tenants.membership_a_active, two_tenants.membership_ab_a}

        # Opt-out returns active and ended memberships.
        all_ids = set(session.scalars(select(Membership.id).execution_options(include_ended=True)))
        assert all_ids == {
            two_tenants.membership_a_active,
            two_tenants.membership_a_ended,
            two_tenants.membership_ab_a,
        }

        # Aliased select and relationship eager load also respect SoftEndMixin.
        membership_alias = aliased(Membership)
        aliased_ids = set(session.scalars(select(membership_alias.id)))
        assert aliased_ids == active_ids

        people_with_memberships = list(
            session.scalars(select(Person).options(selectinload(Person.memberships)))
        )
        ended_person = next(
            p for p in people_with_memberships if p.id == two_tenants.person_a_ended
        )
        assert ended_person.memberships == []

        session.expunge_all()
        people_including_ended = list(
            session.scalars(
                select(Person)
                .options(selectinload(Person.memberships))
                .execution_options(include_ended=True)
            )
        )
        ended_person_all = next(
            p for p in people_including_ended if p.id == two_tenants.person_a_ended
        )
        assert [m.id for m in ended_person_all.memberships] == [two_tenants.membership_a_ended]

        # session.get respects default filter and include_ended opt-out; refresh exercises
        # is_column_load=True path.
        session.expunge_all()
        assert session.get(Membership, two_tenants.membership_a_ended) is None
        ended_row = session.get(
            Membership,
            two_tenants.membership_a_ended,
            execution_options={"include_ended": True},
        )
        assert ended_row is not None
        session.refresh(ended_row)
        assert ended_row.ended_at is not None


def test_tenant_and_person_never_leak_across_committed_transactions_on_pooled_connection(
    sessions: sessionmaker[Session], two_tenants: TwoTenantFixture
) -> None:
    with sessions(
        info=session_info(tenant_id=two_tenants.tenant_a, person_id=two_tenants.person_a_active)
    ) as session:
        assert list(session.scalars(select(Tenant.id))) == [two_tenants.tenant_a]
        assert len(list(session.scalars(select(Role.id)))) == 1
        session.commit()

    # Reuses the single pooled connection with no tenant or person set.
    with sessions() as session:
        assert list(session.scalars(select(Tenant.id))) == []
        assert list(session.scalars(select(Person.id))) == []
        assert list(session.scalars(select(Identity.id))) == []
        assert list(session.scalars(select(Role.id))) == []
        assert list(session.scalars(text("SELECT id FROM public.memberships"))) == []
