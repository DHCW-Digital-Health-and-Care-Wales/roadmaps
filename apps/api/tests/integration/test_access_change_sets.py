"""S3, D10, D12, D15, D16: access change sets, triggers, idempotency and immutability.

Proves against real PostgreSQL 18 as `roadmaps_app` that every access write requires a
signed-off change set, summaries omit secret/direct-PII invitation columns, history and
platform audit logs are immutable, idempotent replays return their first result without
writing, and `roadmaps_auth_definer`'s invitation purge delete is exempt.
"""

import hashlib
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from psycopg import sql
from sqlalchemy import text
from sqlalchemy.exc import DataError, IntegrityError, ProgrammingError
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.database import session_info
from roadmaps_api.models import (
    ChangeSet,
    Invitation,
    Membership,
    TenantScope,
)
from roadmaps_api.repositories.access_change_set import AccessChangeSetRepository
from roadmaps_api.roles import AUTH_DEFINER_ROLE, OWNER_ROLE
from tests.harness import one_uuid

HASH_ONE = hashlib.sha256(b"payload-1").digest()
HASH_TWO = hashlib.sha256(b"payload-2").digest()
PLANTED_EMAIL = "planted-sensitive-email@example.org"
PLANTED_TOKEN_HASH = hashlib.sha256(b"planted-raw-invitation-token").digest()


@dataclass(frozen=True)
class AccessFixture:
    tenant_a: uuid.UUID
    tenant_b: uuid.UUID
    person_a1: uuid.UUID
    person_a2: uuid.UUID
    person_b1: uuid.UUID
    seed_change_set_a: uuid.UUID
    role_a: uuid.UUID
    role_a_viewer: uuid.UUID
    perm_a: uuid.UUID


@pytest.fixture
def access_env(
    database_url: str,  # noqa: ARG001 - requests teardown emptying
    worker_admin: psycopg.Connection,
) -> AccessFixture:
    with worker_admin.transaction():
        tenant_a = one_uuid(
            worker_admin,
            "INSERT INTO tenants (slug, name_en) VALUES ('alpha', 'Alpha') RETURNING id",
        )
        tenant_b = one_uuid(
            worker_admin, "INSERT INTO tenants (slug, name_en) VALUES ('beta', 'Beta') RETURNING id"
        )
        for tenant in (tenant_a, tenant_b):
            worker_admin.execute(
                "INSERT INTO tenant_scopes (tenant_id, scope) VALUES (%s, 'access'), (%s, 'lists')",
                (tenant, tenant),
            )
        person_a1 = one_uuid(
            worker_admin, "INSERT INTO people (display_name) VALUES ('Alice') RETURNING id"
        )
        person_a2 = one_uuid(
            worker_admin, "INSERT INTO people (display_name) VALUES ('Aled') RETURNING id"
        )
        person_b1 = one_uuid(
            worker_admin, "INSERT INTO people (display_name) VALUES ('Beth') RETURNING id"
        )
        # Seed fixed v1 roles via internal change set (revision 1), matching create-tenant.
        seed_change_set_a = one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'seed', 'seed-roles-a', %s, NULL, NULL)",
            (tenant_a, HASH_ONE),
        )
        role_a = one_uuid(
            worker_admin,
            "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, 'Admin', 'admin')"
            " RETURNING id",
            (tenant_a,),
        )
        role_a_viewer = one_uuid(
            worker_admin,
            "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, 'Viewer', 'viewer')"
            " RETURNING id",
            (tenant_a,),
        )
        perm_a = one_uuid(
            worker_admin,
            "INSERT INTO role_permissions (tenant_id, role_id, permission)"
            " VALUES (%s, %s, 'members:manage') RETURNING id",
            (tenant_a, role_a),
        )
        worker_admin.execute(
            "SELECT sign_off_access_change_set_internal(%s, %s)",
            (tenant_a, seed_change_set_a),
        )
    return AccessFixture(
        tenant_a=tenant_a,
        tenant_b=tenant_b,
        person_a1=person_a1,
        person_a2=person_a2,
        person_b1=person_b1,
        seed_change_set_a=seed_change_set_a,
        role_a=role_a,
        role_a_viewer=role_a_viewer,
        perm_a=perm_a,
    )


def _create_initial_access_records(
    sessions: sessionmaker[Session], access_env: AccessFixture, batch_ref: uuid.UUID
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    expires_at = datetime.now(UTC) + timedelta(days=7)
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        opened = repo.open(
            idempotency_key="cs-create-1",
            request_hash=HASH_ONE,
            note="Initial access setup",
            batch_ref=batch_ref,
        )
        assert (opened.revision, opened.is_replay) == (2, False)

        membership = Membership(
            tenant_id=access_env.tenant_a,
            person_id=access_env.person_a1,
            role_id=access_env.role_a,
        )
        invitation = Invitation(
            tenant_id=access_env.tenant_a,
            email=PLANTED_EMAIL,
            provider="google",
            role_id=access_env.role_a,
            token_hash=PLANTED_TOKEN_HASH,
            invited_by_kind="person",
            invited_by_person_id=access_env.person_a1,
            expires_at=expires_at,
        )
        session.add_all([membership, invitation])
        session.flush()
        repo.sign_off(opened.change_set_id)
        session.commit()
        return opened.change_set_id, membership.id, invitation.id


def test_open_write_sign_off_commits_change_set_and_sanitised_summaries(
    sessions: sessionmaker[Session],
    access_env: AccessFixture,
    worker_admin: psycopg.Connection,
) -> None:
    batch_ref = uuid.uuid4()
    cs_id, membership_id, invitation_id = _create_initial_access_records(
        sessions, access_env, batch_ref
    )

    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        scope = session.get(TenantScope, (access_env.tenant_a, "access"))
        assert scope is not None
        assert scope.revision == 2

        cs = session.get(ChangeSet, cs_id)
        assert cs is not None
        assert (cs.scope, cs.kind, cs.actor_kind, cs.actor_person_id, cs.actor_ref) == (
            "access",
            "access_change",
            "person",
            access_env.person_a1,
            None,
        )
        assert (cs.base_revision, cs.revision, cs.note, cs.batch_ref) == (
            1,
            2,
            "Initial access setup",
            batch_ref,
        )

        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        seed_summaries = repo.summaries_for(access_env.seed_change_set_a)
        assert {(s.entity_type, s.action) for s in seed_summaries} == {
            ("role", "added"),
            ("role_permission", "added"),
        }

        summaries = repo.summaries_for(cs_id)
        assert {(s.entity_type, s.action) for s in summaries} == {
            ("membership", "added"),
            ("invitation", "added"),
        }
        inv_summary = next(s for s in summaries if s.entity_type == "invitation")
        assert inv_summary.new_value is not None
        assert "email" not in inv_summary.new_value
        assert "token_hash" not in inv_summary.new_value
        assert inv_summary.new_value["provider"] == "google"
        assert inv_summary.new_value["invited_by_person_id"] == str(access_env.person_a1)

        # Next change set: UPDATE (soft-end membership, revoke invitation).
        opened2 = repo.open(idempotency_key="cs-update-2", request_hash=HASH_TWO)
        assert (opened2.revision, opened2.is_replay) == (3, False)

        now = datetime.now(UTC)
        loaded_membership = session.get(Membership, membership_id)
        loaded_invitation = session.get(Invitation, invitation_id)
        assert loaded_membership is not None
        assert loaded_invitation is not None

        loaded_membership.ended_at = now
        loaded_invitation.revoked_at = now
        loaded_invitation.revoked_by_kind = "person"
        loaded_invitation.revoked_by_person_id = access_env.person_a1
        session.flush()
        repo.sign_off(opened2.change_set_id)
        session.commit()

        summaries2 = repo.summaries_for(opened2.change_set_id)
        changed_fields = {(s.entity_type, s.action, s.field) for s in summaries2}
        assert {
            ("membership", "changed", "ended_at"),
            ("invitation", "changed", "revoked_at"),
            ("invitation", "changed", "revoked_by_kind"),
            ("invitation", "changed", "revoked_by_person_id"),
        } <= changed_fields

        # D10: scan EVERY change_summaries row as text — neither email nor token_hash appears.
        raw_rows = session.execute(
            text(
                "SELECT coalesce(old_value::text, '') || coalesce(new_value::text, '')"
                " FROM public.change_summaries"
            )
        ).scalars()
        combined = "\n".join(raw_rows)
        assert PLANTED_EMAIL not in combined
        assert PLANTED_TOKEN_HASH.hex() not in combined
        assert str(access_env.role_a) in combined

    # Internal path DELETE on role_permissions also records a 'removed' summary.
    with worker_admin.transaction():
        del_cs = one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'mig', 'del-perm', %s, NULL, NULL)",
            (access_env.tenant_a, HASH_TWO),
        )
        worker_admin.execute(
            "DELETE FROM public.role_permissions WHERE id = %s", (access_env.perm_a,)
        )
        worker_admin.execute(
            "SELECT sign_off_access_change_set_internal(%s, %s)", (access_env.tenant_a, del_cs)
        )
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        del_summaries = AccessChangeSetRepository(session, access_env.tenant_a).summaries_for(
            del_cs
        )
        assert {(s.entity_type, s.action, s.field) for s in del_summaries} == {
            ("role_permission", "removed", None)
        }


def test_two_change_sets_in_one_transaction_commit(
    sessions: sessionmaker[Session], access_env: AccessFixture
) -> None:
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)

        cs1 = repo.open(idempotency_key="multi-1", request_hash=HASH_ONE)
        membership_1 = Membership(
            tenant_id=access_env.tenant_a,
            person_id=access_env.person_a1,
            role_id=access_env.role_a,
        )
        session.add(membership_1)
        session.flush()
        repo.sign_off(cs1.change_set_id)

        cs2 = repo.open(idempotency_key="multi-2", request_hash=HASH_TWO)
        membership_2 = Membership(
            tenant_id=access_env.tenant_a,
            person_id=access_env.person_a2,
            role_id=access_env.role_a_viewer,
        )
        session.add(membership_2)
        session.flush()
        repo.sign_off(cs2.change_set_id)

        session.commit()
        assert (cs1.revision, cs2.revision) == (2, 3)
        assert len(repo.summaries_for(cs1.change_set_id)) == 1
        assert len(repo.summaries_for(cs2.change_set_id)) == 1


def test_triggers_refuse_unopened_unsigned_post_sign_off_and_out_of_scope_writes(
    sessions: sessionmaker[Session],
    access_env: AccessFixture,
    worker_admin: psycopg.Connection,
) -> None:
    # 1. Write without opening a change set (even after trying set_config) is refused.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        session.execute(
            text("SELECT set_config('app.change_set_id', :id, true)"), {"id": str(uuid.uuid4())}
        )
        with pytest.raises(ProgrammingError) as exc_info:
            session.execute(
                text(
                    "INSERT INTO public.memberships (tenant_id, person_id, role_id)"
                    " VALUES (:t, :p, :r)"
                ),
                {
                    "t": access_env.tenant_a,
                    "p": access_env.person_a1,
                    "r": access_env.role_a,
                },
            )
        assert isinstance(exc_info.value.orig, psycopg.errors.RaiseException)
        session.rollback()

    # 2. Write inside an opened change set that is NEVER signed off is refused AT COMMIT.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        repo.open(idempotency_key="unsigned-1", request_hash=HASH_ONE)
        session.add(
            Membership(
                tenant_id=access_env.tenant_a,
                person_id=access_env.person_a1,
                role_id=access_env.role_a,
            )
        )
        session.flush()  # succeeds during tx; deferred trigger refuses at COMMIT
        with pytest.raises(ProgrammingError) as commit_exc:
            session.commit()
        assert isinstance(commit_exc.value.orig, psycopg.errors.RaiseException)
        assert commit_exc.value.orig.diag.message_primary == (
            "change set was not signed off before commit"
        )
        session.rollback()

    # 3. Opening a second change set before signing off the first is refused at once.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        repo.open(idempotency_key="open-first", request_hash=HASH_ONE)
        with pytest.raises(ProgrammingError) as double_open_exc:
            repo.open(idempotency_key="open-second", request_hash=HASH_TWO)
        assert isinstance(double_open_exc.value.orig, psycopg.errors.RaiseException)
        session.rollback()

    # 4. Write AFTER sign-off (without opening a next change set) is refused AT ONCE.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        cs = repo.open(idempotency_key="post-sign-off", request_hash=HASH_ONE)
        session.add(
            Membership(
                tenant_id=access_env.tenant_a,
                person_id=access_env.person_a1,
                role_id=access_env.role_a,
            )
        )
        session.flush()
        repo.sign_off(cs.change_set_id)

        with pytest.raises(ProgrammingError) as after_exc, session.begin_nested():
            session.execute(
                text(
                    "INSERT INTO public.memberships (tenant_id, person_id, role_id)"
                    " VALUES (:t, :p, :r)"
                ),
                {
                    "t": access_env.tenant_a,
                    "p": access_env.person_a2,
                    "r": access_env.role_a,
                },
            )
        assert isinstance(after_exc.value.orig, psycopg.errors.RaiseException)
        assert after_exc.value.orig.diag.message_primary == (
            "write after change set sign-off is forbidden"
        )
        session.rollback()

    # 5. Write OUTSIDE the open change set's scope (wrong scope 'lists', or wrong tenant)
    # is refused AT ONCE.
    with worker_admin.transaction(force_rollback=True):
        worker_admin.execute(
            "INSERT INTO public.change_sets"
            " (tenant_id, scope, scope_id, kind, actor_kind, actor_ref,"
            "  base_revision, revision, idempotency_key, request_hash)"
            " VALUES (%s, 'lists', NULL, 'list_change', 'system', 'test', 0, 1, 'lists-1', %s)",
            (access_env.tenant_a, HASH_ONE),
        )
        with pytest.raises(psycopg.errors.RaiseException) as lists_scope_exc:
            worker_admin.execute(
                "INSERT INTO public.roles (tenant_id, name) VALUES (%s, 'WrongScope')",
                (access_env.tenant_a,),
            )
    assert lists_scope_exc.value.diag.message_primary == "write outside open change set scope"

    with worker_admin.transaction(force_rollback=True):
        worker_admin.execute(
            "SELECT change_set_id FROM public.open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'test', 'tenant-a-cs', %s, NULL, NULL)",
            (access_env.tenant_a, HASH_ONE),
        )
        with pytest.raises(psycopg.errors.RaiseException) as wrong_tenant_exc:
            worker_admin.execute(
                "INSERT INTO public.roles (tenant_id, name) VALUES (%s, 'TenantBRole')",
                (access_env.tenant_b,),
            )
    assert wrong_tenant_exc.value.diag.message_primary == "write outside open change set scope"


def test_idempotency_replay_conflict_and_retry_after_refusal(
    sessions: sessionmaker[Session], access_env: AccessFixture
) -> None:
    # First app write commits with revision 2 (revision 1 seeded roles).
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        first = repo.open(idempotency_key="idem-1", request_hash=HASH_ONE)
        session.add(
            Membership(
                tenant_id=access_env.tenant_a,
                person_id=access_env.person_a1,
                role_id=access_env.role_a_viewer,
            )
        )
        session.flush()
        repo.sign_off(first.change_set_id)
        session.commit()

    # Exact replay (same tenant, person, key, hash) returns first result without writing.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        replay = repo.open(idempotency_key="idem-1", request_hash=HASH_ONE)
        assert replay == first.__class__(
            change_set_id=first.change_set_id, revision=2, is_replay=True
        )
        scope = session.get(TenantScope, (access_env.tenant_a, "access"))
        assert scope is not None
        assert scope.revision == 2
        session.commit()

    # Same key with another request hash is refused.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        with pytest.raises(IntegrityError) as hash_conflict:
            repo.open(idempotency_key="idem-1", request_hash=HASH_TWO)
        assert isinstance(hash_conflict.value.orig, psycopg.errors.UniqueViolation)
        session.rollback()

    # Same key and hash with another person is refused.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a2)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        with pytest.raises(IntegrityError) as person_conflict:
            repo.open(idempotency_key="idem-1", request_hash=HASH_ONE)
        assert isinstance(person_conflict.value.orig, psycopg.errors.UniqueViolation)
        session.rollback()

    # Same key in Tenant B succeeds independently.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_b, person_id=access_env.person_b1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_b)
        other_tenant = repo.open(idempotency_key="idem-1", request_hash=HASH_ONE)
        assert (other_tenant.revision, other_tenant.is_replay) == (1, False)
        repo.sign_off(other_tenant.change_set_id)
        session.commit()

    # A refused write (rolled back) leaves no change set, so retrying the same key succeeds.
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        repo.open(idempotency_key="retry-after-fail", request_hash=HASH_ONE)
        session.rollback()

    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        retried = repo.open(idempotency_key="retry-after-fail", request_hash=HASH_TWO)
        assert (retried.revision, retried.is_replay) == (3, False)
        repo.sign_off(retried.change_set_id)
        session.commit()


def test_history_audit_immutability_and_app_refusals(
    sessions: sessionmaker[Session],
    access_env: AccessFixture,
    worker_admin: psycopg.Connection,
) -> None:
    # Create one platform-issued invitation via internal path for mutation tests.
    expires_at = datetime.now(UTC) + timedelta(days=7)
    with worker_admin.transaction():
        cs_id = one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'seed', 'seed-immut', %s, NULL, NULL)",
            (access_env.tenant_a, HASH_ONE),
        )
        platform_inv_id = one_uuid(
            worker_admin,
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, issued_by_platform_execution_id, expires_at)"
            " VALUES (%s, 'first-admin@example.org', 'google', %s, %s, 'platform_job',"
            " 'exec-1', %s) RETURNING id",
            (access_env.tenant_a, access_env.role_a, b"\xcc" * 32, expires_at),
        )
        worker_admin.execute(
            "SELECT sign_off_access_change_set_internal(%s, %s)", (access_env.tenant_a, cs_id)
        )
        worker_admin.execute(
            "INSERT INTO platform_audit_log"
            " (action, actor_kind, actor_ref, target_type, target_id)"
            " VALUES ('tenant.created', 'platform_job', 'exec-1', 'tenant', %s)",
            (access_env.tenant_a,),
        )

    # roadmaps_app cannot INSERT/UPDATE/DELETE/TRUNCATE history or platform_audit_log,
    # cannot call internal non-person routines, cannot DELETE invitations/memberships,
    # and cannot insert or modify platform-issued invitations (D16).
    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        for statement in (
            (
                "INSERT INTO public.change_sets"
                " (tenant_id, scope, kind, actor_kind, actor_ref,"
                "  base_revision, revision, idempotency_key, request_hash)"
                " VALUES (:t, 'access', 'access_change', 'system', 'forged', 1, 2, 'k', :h)"
            ),
            "UPDATE public.change_sets SET note = 'tampered'",
            "DELETE FROM public.change_sets",
            "TRUNCATE public.change_sets",
            (
                "INSERT INTO public.change_summaries"
                " (tenant_id, change_set_id, entity_type, entity_id, action, new_value)"
                " VALUES (:t, :cs, 'role', :r, 'added', '{}'::jsonb)"
            ),
            "UPDATE public.change_summaries SET entity_type = 'tampered'",
            "DELETE FROM public.change_summaries",
            "TRUNCATE public.change_summaries",
            "UPDATE public.platform_audit_log SET reason = 'tampered'",
            "DELETE FROM public.platform_audit_log",
            "TRUNCATE public.platform_audit_log",
            "DELETE FROM public.invitations",
            "DELETE FROM public.memberships",
            (
                "SELECT * FROM public.open_access_change_set_internal("
                " :t, 'access_change', 'platform_job', NULL, 'exec-forged', 'k2', :h, NULL, NULL)"
            ),
            "SELECT public.sign_off_access_change_set_internal(:t, :cs)",
        ):
            with pytest.raises(ProgrammingError) as exc_info, session.begin_nested():
                session.execute(
                    text(statement),
                    {
                        "t": access_env.tenant_a,
                        "cs": cs_id,
                        "r": access_env.role_a,
                        "h": HASH_TWO,
                    },
                )
            assert isinstance(exc_info.value.orig, psycopg.errors.InsufficientPrivilege), statement

        # Platform-issued invitation insert by roadmaps_app is refused by RLS WITH CHECK (D16).
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        opened = repo.open(idempotency_key="try-plat-inv", request_hash=HASH_TWO)
        with pytest.raises(ProgrammingError) as plat_exc, session.begin_nested():
            session.execute(
                text(
                    "INSERT INTO public.invitations"
                    " (tenant_id, email, provider, role_id, token_hash,"
                    "  invited_by_kind, issued_by_platform_execution_id, expires_at)"
                    " VALUES (:t, 'x@example.org', 'google', :r, :h,"
                    "  'platform_job', 'exec-forged', :exp)"
                ),
                {
                    "t": access_env.tenant_a,
                    "r": access_env.role_a,
                    "h": b"\xdd" * 32,
                    "exp": expires_at,
                },
            )
        assert isinstance(plat_exc.value.orig, psycopg.errors.InsufficientPrivilege)

        # Updating a platform-issued invitation as roadmaps_app affects 0 rows.
        updated = (
            session.connection()
            .execute(
                text(
                    "UPDATE public.invitations SET revoked_at = now(),"
                    " revoked_by_kind = 'person', revoked_by_person_id = :p WHERE id = :id"
                ),
                {"p": access_env.person_a1, "id": platform_inv_id},
            )
            .rowcount
        )
        assert updated == 0
        repo.sign_off(opened.change_set_id)
        session.rollback()

    # Even roadmaps_owner cannot UPDATE, DELETE or TRUNCATE history or platform_audit_log.
    for table, update_sql in (
        ("change_sets", sql.SQL("UPDATE public.change_sets SET note = 'tampered'")),
        (
            "change_summaries",
            sql.SQL("UPDATE public.change_summaries SET entity_type = 'tampered'"),
        ),
        (
            "change_set_signoffs",
            sql.SQL("UPDATE public.change_set_signoffs SET signed_off_xid = '0'"),
        ),
        ("platform_audit_log", sql.SQL("UPDATE public.platform_audit_log SET reason = 'tampered'")),
    ):
        for dml in (
            update_sql,
            sql.SQL("DELETE FROM public.{}").format(sql.Identifier(table)),
            sql.SQL("TRUNCATE public.{} CASCADE").format(sql.Identifier(table)),
        ):
            with worker_admin.transaction(force_rollback=True):
                worker_admin.execute(
                    sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(OWNER_ROLE))
                )
                worker_admin.execute(
                    "SELECT set_config('app.tenant_id', %s, true)", (str(access_env.tenant_a),)
                )
                with pytest.raises(psycopg.errors.RaiseException) as exc_info:
                    worker_admin.execute(dml)
            assert exc_info.value.diag.message_primary == "history and audit records are immutable"


def test_auth_definer_invitation_purge_delete_is_exempt_from_access_triggers(
    access_env: AccessFixture, worker_admin: psycopg.Connection
) -> None:
    expires_at = datetime.now(UTC) + timedelta(days=7)
    with worker_admin.transaction():
        cs_id = one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'seed', 'seed-purge', %s, NULL, NULL)",
            (access_env.tenant_a, HASH_ONE),
        )
        inv_id = one_uuid(
            worker_admin,
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at)"
            " VALUES (%s, 'old@example.org', 'google', %s, %s, 'person', %s, %s) RETURNING id",
            (
                access_env.tenant_a,
                access_env.role_a_viewer,
                b"\xee" * 32,
                access_env.person_a1,
                expires_at,
            ),
        )
        worker_admin.execute(
            "SELECT sign_off_access_change_set_internal(%s, %s)", (access_env.tenant_a, cs_id)
        )

    # Non-auth-definer DELETE on invitations outside a change set is still refused by the guard.
    with worker_admin.transaction(force_rollback=True):
        worker_admin.execute(sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(OWNER_ROLE)))
        worker_admin.execute(
            "SELECT set_config('app.tenant_id', %s, true)", (str(access_env.tenant_a),)
        )
        with pytest.raises(psycopg.errors.RaiseException) as owner_del_exc:
            worker_admin.execute("DELETE FROM public.invitations WHERE id = %s", (inv_id,))
    assert owner_del_exc.value.diag.message_primary == "access write requires an open change set"

    # Simulated STY-110 90-day retention purge running as roadmaps_auth_definer succeeds
    # without a change set and writes zero change_summaries (D16).
    with worker_admin.transaction(force_rollback=True):
        before_summaries = worker_admin.execute(
            "SELECT count(*) FROM public.change_summaries"
        ).fetchone()
        worker_admin.execute(f"GRANT SELECT, DELETE ON public.invitations TO {AUTH_DEFINER_ROLE}")
        worker_admin.execute(
            f"CREATE POLICY test_auth_purge ON public.invitations"
            f" FOR DELETE TO {AUTH_DEFINER_ROLE} USING (true)"
        )
        worker_admin.execute(
            f"CREATE POLICY test_auth_select ON public.invitations"
            f" FOR SELECT TO {AUTH_DEFINER_ROLE} USING (true)"
        )
        worker_admin.execute(f"SET LOCAL ROLE {AUTH_DEFINER_ROLE}".encode())
        deleted = worker_admin.execute(
            "DELETE FROM public.invitations WHERE id = %s", (inv_id,)
        ).rowcount
        worker_admin.execute("RESET ROLE")
        after_summaries = worker_admin.execute(
            "SELECT count(*) FROM public.change_summaries"
        ).fetchone()
        assert deleted == 1
        assert after_summaries == before_summaries


def test_invitation_update_guards_against_null_revoker_retargeting_and_terminal_edits(
    sessions: sessionmaker[Session],
    access_env: AccessFixture,
    worker_admin: psycopg.Connection,
) -> None:
    expires_at = datetime.now(UTC) + timedelta(days=7)
    with worker_admin.transaction():
        cs_id = one_uuid(
            worker_admin,
            "SELECT change_set_id FROM open_access_change_set_internal("
            " %s, 'migration', 'system', NULL, 'seed', 'seed-inv-guards', %s, NULL, NULL)",
            (access_env.tenant_a, HASH_ONE),
        )
        pending_id = one_uuid(
            worker_admin,
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at)"
            " VALUES (%s, 'pending@example.org', 'google', %s, %s, 'person', %s, %s) RETURNING id",
            (
                access_env.tenant_a,
                access_env.role_a,
                b"\x51" * 32,
                access_env.person_a1,
                expires_at,
            ),
        )
        revoked_id = one_uuid(
            worker_admin,
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at,"
            " revoked_at, revoked_by_kind, revoked_by_person_id)"
            " VALUES (%s, 'revoked@example.org', 'google', %s, %s, 'person', %s, %s,"
            " now(), 'person', %s) RETURNING id",
            (
                access_env.tenant_a,
                access_env.role_a,
                b"\x52" * 32,
                access_env.person_a1,
                expires_at,
                access_env.person_a1,
            ),
        )
        redeemed_id = one_uuid(
            worker_admin,
            "INSERT INTO invitations (tenant_id, email, provider, role_id, token_hash,"
            " invited_by_kind, invited_by_person_id, expires_at,"
            " redeemed_at, redeemed_by_person_id)"
            " VALUES (%s, 'redeemed@example.org', 'google', %s, %s, 'person', %s, %s,"
            " now(), %s) RETURNING id",
            (
                access_env.tenant_a,
                access_env.role_a,
                b"\x53" * 32,
                access_env.person_a1,
                expires_at,
                access_env.person_a2,
            ),
        )
        worker_admin.execute(
            "SELECT sign_off_access_change_set_internal(%s, %s)", (access_env.tenant_a, cs_id)
        )

    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        opened = repo.open(idempotency_key="inv-guards", request_hash=HASH_TWO)

        # revoked_at set with revoked_by_kind = NULL must be refused (CHECK + RLS WITH CHECK).
        with pytest.raises((IntegrityError, ProgrammingError)), session.begin_nested():
            session.execute(
                text(
                    "UPDATE public.invitations SET revoked_at = now(),"
                    " revoked_by_person_id = :p, revoked_by_kind = NULL WHERE id = :id"
                ),
                {"p": access_env.person_a1, "id": pending_id},
            )

        # roadmaps_app cannot UPDATE non-revocation columns on invitations.
        for bad_update in (
            "UPDATE public.invitations SET email = 'other@example.org' WHERE id = :id",
            "UPDATE public.invitations SET token_hash = :h WHERE id = :id",
            "UPDATE public.invitations SET expires_at = now() + interval '30 days' WHERE id = :id",
            "UPDATE public.invitations SET invited_by_person_id = :p WHERE id = :id",
        ):
            with pytest.raises(ProgrammingError) as col_exc, session.begin_nested():
                session.execute(
                    text(bad_update),
                    {"id": pending_id, "h": b"\x99" * 32, "p": access_env.person_a2},
                )
            assert isinstance(col_exc.value.orig, psycopg.errors.InsufficientPrivilege), bad_update

        # roadmaps_app cannot un-revoke or overwrite terminal (revoked or redeemed) invitations.
        assert (
            session.connection()
            .execute(
                text(
                    "UPDATE public.invitations SET revoked_at = NULL,"
                    " revoked_by_kind = NULL, revoked_by_person_id = NULL WHERE id = :id"
                ),
                {"id": revoked_id},
            )
            .rowcount
            == 0
        )
        assert (
            session.connection()
            .execute(
                text(
                    "UPDATE public.invitations SET revoked_at = now(),"
                    " revoked_by_kind = 'person', revoked_by_person_id = :p WHERE id = :id"
                ),
                {"p": access_env.person_a1, "id": redeemed_id},
            )
            .rowcount
            == 0
        )
        repo.sign_off(opened.change_set_id)
        session.rollback()


def test_static_exception_messages_contain_no_caller_data(
    sessions: sessionmaker[Session], access_env: AccessFixture
) -> None:
    secret = "SECRET-CALLER-VALUE-999"  # noqa: S105 - planted to assert static SQL exceptions
    with sessions(info=session_info(tenant_id=access_env.tenant_a)) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        with pytest.raises(DataError) as exc_info:
            repo.open(idempotency_key=secret, request_hash=HASH_ONE, note=secret)
        orig = exc_info.value.orig
        assert isinstance(orig, psycopg.errors.InvalidParameterValue)
        diagnostics = " ".join(
            part
            for part in (
                orig.diag.message_primary,
                orig.diag.message_detail,
                orig.diag.constraint_name,
                orig.diag.sqlstate,
            )
            if part
        )
        assert secret not in diagnostics
        assert orig.diag.message_primary == "person context is required"
        session.rollback()

    with sessions(
        info=session_info(tenant_id=access_env.tenant_a, person_id=access_env.person_a1)
    ) as session:
        repo = AccessChangeSetRepository(session, access_env.tenant_a)
        with pytest.raises(DataError) as bad_hash_exc:
            repo.open(idempotency_key=secret, request_hash=b"short")
        orig_hash = bad_hash_exc.value.orig
        assert isinstance(orig_hash, psycopg.errors.InvalidParameterValue)
        assert secret not in (orig_hash.diag.message_primary or "")
        session.rollback()

        with pytest.raises(ProgrammingError) as bad_signoff_exc:
            repo.sign_off(uuid.uuid4())
        orig_signoff = bad_signoff_exc.value.orig
        assert isinstance(orig_signoff, psycopg.errors.RaiseException)
        assert orig_signoff.diag.message_primary == (
            "no matching open access change set in this transaction"
        )
        session.rollback()
