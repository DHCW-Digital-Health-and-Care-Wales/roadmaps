"""Reusable ORM seed factories and access-scope change-set helpers (`STY-093` S1, S5).

Every tenant-owned write (`roles`, `role_permissions`, `memberships`, `invitations`) runs
with `session_replication_role = 'origin'` and all `STY-103` triggers active through the
real open/sign-off routines. Integration tests can import and invoke these helpers directly
against a worker database without auto-seeding empty-DB tests.
"""

import contextlib
from collections.abc import Callable, Generator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from roadmaps_api.authz import (
    SHIPPED_ROLE_NAMES,
    SHIPPED_ROLES,
    Permission,
    ShippedRoleKey,
)
from roadmaps_api.database import PERSON_SETTING, TENANT_SETTING
from roadmaps_api.models import (
    Identity,
    Invitation,
    Membership,
    Person,
    Role,
    RolePermission,
    Tenant,
    TenantScope,
)
from roadmaps_api.repositories.access_change_set import AccessChangeSetRepository
from tools.seed.deterministic import hash_invitation_token, request_hash_for
from tools.seed.personas import LOCAL_MOCK_ISSUER, TenantSpec

_OPEN_INTERNAL = text(
    "SELECT change_set_id FROM public.open_access_change_set_internal("
    " :tenant_id, :kind, 'system', NULL, :actor_ref,"
    " :idempotency_key, :request_hash, :note, NULL)"
)
_SIGN_OFF_INTERNAL = text(
    "SELECT public.sign_off_access_change_set_internal(:tenant_id, :change_set_id)"
)
_SET_LOCAL_CONFIG = text("SELECT set_config(:setting, :value, true)")


@dataclass(frozen=True)
class ChangeSetRequest:
    idempotency_key: str
    request_hash: bytes
    note: str | None = None

    @classmethod
    def seeded(cls, seed: int, key: str, *, note: str | None = None) -> ChangeSetRequest:
        """Builds a `ChangeSetRequest` whose `request_hash` is deterministically derived."""
        return cls(
            idempotency_key=key,
            request_hash=request_hash_for(seed, key),
            note=note,
        )


@dataclass(frozen=True)
class PersonInput:
    display_name: str
    email: str
    subject: str
    created_at: datetime
    issuer: str = LOCAL_MOCK_ISSUER
    disabled_at: datetime | None = None
    last_sign_in_at: datetime | None = None
    person_id: UUID | None = None
    identity_id: UUID | None = None


@dataclass(frozen=True)
class MembershipInput:
    tenant_id: UUID
    person_id: UUID
    role_id: UUID
    created_at: datetime
    ended_at: datetime | None = None
    membership_id: UUID | None = None


@dataclass(frozen=True)
class InvitationInput:
    tenant_id: UUID
    email: str
    role_id: UUID
    raw_token: str
    invited_by_person_id: UUID
    created_at: datetime
    expires_at: datetime
    provider: str = "local_mock"
    invitation_id: UUID | None = None


def _clear_local_settings(session: Session) -> None:
    session.execute(_SET_LOCAL_CONFIG, {"setting": TENANT_SETTING, "value": ""})
    session.execute(_SET_LOCAL_CONFIG, {"setting": PERSON_SETTING, "value": ""})


@contextmanager
def system_access_change_set(
    session: Session,
    tenant_id: UUID,
    request: ChangeSetRequest,
    *,
    actor_ref: str = "seed",
    kind: str = "access_change",
) -> Generator[UUID]:
    """Opens and signs off an internal `'system'` access change set around ORM writes."""
    change_set_id: UUID = session.execute(
        _OPEN_INTERNAL,
        {
            "tenant_id": tenant_id,
            "kind": kind,
            "actor_ref": actor_ref,
            "idempotency_key": request.idempotency_key,
            "request_hash": request.request_hash,
            "note": request.note,
        },
    ).scalar_one()
    yield change_set_id
    session.flush()
    session.execute(
        _SIGN_OFF_INTERNAL,
        {"tenant_id": tenant_id, "change_set_id": change_set_id},
    )


@contextmanager
def person_access_change_set(
    session: Session,
    tenant_id: UUID,
    person_id: UUID,
    request: ChangeSetRequest,
) -> Generator[UUID]:
    """Opens and signs off a `'person'` access change set via `AccessChangeSetRepository`."""
    session.execute(_SET_LOCAL_CONFIG, {"setting": TENANT_SETTING, "value": str(tenant_id)})
    session.execute(_SET_LOCAL_CONFIG, {"setting": PERSON_SETTING, "value": str(person_id)})
    try:
        repo = AccessChangeSetRepository(session, tenant_id)
        opened = repo.open(
            idempotency_key=request.idempotency_key,
            request_hash=request.request_hash,
            note=request.note,
        )
        yield opened.change_set_id
        session.flush()
        repo.sign_off(opened.change_set_id)
    except BaseException:
        # On a database error the transaction is already aborted or pending rollback;
        # suppressing SQLAlchemyError preserves the original error (and its sqlstate).
        with contextlib.suppress(SQLAlchemyError):
            _clear_local_settings(session)
        raise
    _clear_local_settings(session)


def create_tenant(
    session: Session,
    spec: TenantSpec,
    *,
    created_at: datetime,
    tenant_id: UUID | None = None,
) -> Tenant:
    """Creates and flushes a `Tenant` with its `'access'` and `'lists'` `TenantScope` rows."""
    tenant = Tenant(
        slug=spec.slug,
        name_en=spec.name_en,
        name_cy=spec.name_cy,
        created_at=created_at,
        updated_at=created_at,
    )
    if tenant_id is not None:
        tenant.id = tenant_id
    session.add(tenant)
    session.flush()
    for scope in ("access", "lists"):
        session.add(
            TenantScope(
                tenant_id=tenant.id,
                scope=scope,
                revision=0,
                updated_at=created_at,
            )
        )
    session.flush()
    return tenant


def create_shipped_roles(
    session: Session,
    *,
    tenant_id: UUID,
    created_at: datetime,
    role_id_for: Callable[[ShippedRoleKey], UUID] | None = None,
    permission_id_for: Callable[[ShippedRoleKey, Permission], UUID] | None = None,
) -> dict[ShippedRoleKey, Role]:
    """Creates the three ADR-019 shipped roles and their permissions inside an open change set."""
    created: dict[ShippedRoleKey, Role] = {}
    for role_key, permissions in SHIPPED_ROLES.items():
        role = Role(
            tenant_id=tenant_id,
            name=SHIPPED_ROLE_NAMES[role_key],
            system_key=role_key.value,
            created_at=created_at,
            updated_at=created_at,
        )
        if role_id_for is not None:
            role.id = role_id_for(role_key)
        session.add(role)
        session.flush()
        for permission in sorted(permissions):
            role_permission = RolePermission(
                tenant_id=tenant_id,
                role_id=role.id,
                permission=permission.value,
                created_at=created_at,
            )
            if permission_id_for is not None:
                role_permission.id = permission_id_for(role_key, permission)
            session.add(role_permission)
        created[role_key] = role
    return created


def create_person_with_identity(session: Session, data: PersonInput) -> tuple[Person, Identity]:
    """Creates a `Person` and their initial `Identity`."""
    person = Person(
        display_name=data.display_name,
        disabled_at=data.disabled_at,
        created_at=data.created_at,
        updated_at=data.disabled_at or data.created_at,
    )
    if data.person_id is not None:
        person.id = data.person_id
    session.add(person)
    session.flush()

    identity = Identity(
        person_id=person.id,
        issuer=data.issuer,
        subject=data.subject,
        email=data.email,
        last_sign_in_at=data.last_sign_in_at,
        linked_at=data.created_at,
        created_at=data.created_at,
        updated_at=data.created_at,
    )
    if data.identity_id is not None:
        identity.id = data.identity_id
    session.add(identity)
    return person, identity


def create_membership(session: Session, data: MembershipInput) -> Membership:
    """Creates a `Membership` inside an open access change set."""
    membership = Membership(
        tenant_id=data.tenant_id,
        person_id=data.person_id,
        role_id=data.role_id,
        created_at=data.created_at,
        updated_at=data.ended_at or data.created_at,
        ended_at=data.ended_at,
    )
    if data.membership_id is not None:
        membership.id = data.membership_id
    session.add(membership)
    return membership


def create_invitation(session: Session, data: InvitationInput) -> Invitation:
    """Creates a person-issued `Invitation` storing only the SHA-256 hash of `raw_token`."""
    invitation = Invitation(
        tenant_id=data.tenant_id,
        email=data.email,
        provider=data.provider,
        role_id=data.role_id,
        token_hash=hash_invitation_token(data.raw_token),
        invited_by_kind="person",
        invited_by_person_id=data.invited_by_person_id,
        created_at=data.created_at,
        updated_at=data.created_at,
        expires_at=data.expires_at,
    )
    if data.invitation_id is not None:
        invitation.id = data.invitation_id
    session.add(invitation)
    return invitation
