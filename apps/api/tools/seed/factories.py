"""Reusable ORM seed factories and access-scope change-set helpers (`STY-093` S1, S5).

Every factory flushes before returning so generated primary keys and dependent rows
(such as `TenantScope`) are immediately visible even when `autoflush=False`. Every
tenant-owned write (`roles`, `role_permissions`, `memberships`, `invitations`) runs with
`session_replication_role = 'origin'` and all `STY-103` triggers active through the real
open/sign-off routines.
"""

import contextlib
import hashlib
from collections.abc import Callable, Generator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
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
    AuthSession,
    Identity,
    Invitation,
    Membership,
    Person,
    Role,
    RolePermission,
    SignInTransaction,
    Tenant,
    TenantScope,
)
from roadmaps_api.repositories.access_change_set import AccessChangeSetRepository
from tools.seed.deterministic import hash_invitation_token, request_hash_for
from tools.seed.personas import LOCAL_MOCK_ISSUER, TenantSpec

_OPEN_INTERNAL = text(
    "SELECT change_set_id FROM public.open_access_change_set_internal("
    " :tenant_id, 'access_change', 'system', NULL, 'seed',"
    " :idempotency_key, :request_hash, :note, NULL)"
)
_SIGN_OFF_INTERNAL = text(
    "SELECT public.sign_off_access_change_set_internal(:tenant_id, :change_set_id)"
)
_GET_LOCAL_CONFIG = text("SELECT current_setting(:setting, true)")
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
    invitation_id: UUID | None = None


@dataclass(frozen=True)
class SessionInput:
    person_id: UUID
    identity_id: UUID
    raw_token: str
    signed_in_at: datetime
    provider: str = "local_mock"
    last_activity_at: datetime | None = None
    idle_expires_at: datetime | None = None
    absolute_expires_at: datetime | None = None
    revoked_at: datetime | None = None
    session_id: UUID | None = None


@dataclass(frozen=True)
class SignInTransactionInput:
    raw_state: str
    raw_cookie_token: str
    nonce: str
    code_verifier: str
    created_at: datetime
    expires_at: datetime
    provider: str = "local_mock"
    issuer: str = LOCAL_MOCK_ISSUER
    purpose: str = "sign-in"
    return_path: str = "/"
    invitation_id: UUID | None = None
    initiating_session_id: UUID | None = None
    initiating_person_id: UUID | None = None
    consumed_at: datetime | None = None
    transaction_id: UUID | None = None


def _set_local_settings(session: Session, tenant_value: str, person_value: str) -> None:
    session.execute(_SET_LOCAL_CONFIG, {"setting": TENANT_SETTING, "value": tenant_value})
    session.execute(_SET_LOCAL_CONFIG, {"setting": PERSON_SETTING, "value": person_value})


@contextmanager
def system_access_change_set(
    session: Session,
    tenant_id: UUID,
    request: ChangeSetRequest,
) -> Generator[UUID]:
    """Opens and signs off an internal `'system'` (`'seed'`) access change set around writes."""
    change_set_id: UUID = session.execute(
        _OPEN_INTERNAL,
        {
            "tenant_id": tenant_id,
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
    prior_tenant = str(
        session.execute(_GET_LOCAL_CONFIG, {"setting": TENANT_SETTING}).scalar() or ""
    )
    prior_person = str(
        session.execute(_GET_LOCAL_CONFIG, {"setting": PERSON_SETTING}).scalar() or ""
    )
    _set_local_settings(session, str(tenant_id), str(person_id))
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
            _set_local_settings(session, prior_tenant, prior_person)
        raise
    _set_local_settings(session, prior_tenant, prior_person)


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
    """Creates and flushes the ADR-019 shipped roles and permissions inside an open change set."""
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
    session.flush()
    return created


def create_person_with_identity(session: Session, data: PersonInput) -> tuple[Person, Identity]:
    """Creates and flushes a `Person` and their initial `Identity`."""
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
    session.flush()
    return person, identity


def create_membership(session: Session, data: MembershipInput) -> Membership:
    """Creates and flushes an active `Membership` inside an open access change set."""
    membership = Membership(
        tenant_id=data.tenant_id,
        person_id=data.person_id,
        role_id=data.role_id,
        created_at=data.created_at,
        updated_at=data.created_at,
    )
    if data.membership_id is not None:
        membership.id = data.membership_id
    session.add(membership)
    session.flush()
    return membership


def create_invitation(session: Session, data: InvitationInput) -> Invitation:
    """Creates and flushes a `local_mock` `Invitation` storing only the SHA-256 token hash."""
    invitation = Invitation(
        tenant_id=data.tenant_id,
        email=data.email,
        provider="local_mock",
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
    session.flush()
    return invitation


def create_session(session: Session, data: SessionInput) -> AuthSession:
    """Creates and flushes an `AuthSession` storing only the SHA-256 token hash (D14)."""
    idle_expires_at = data.idle_expires_at or (data.signed_in_at + timedelta(minutes=60))
    absolute_expires_at = data.absolute_expires_at or (data.signed_in_at + timedelta(hours=10))
    auth_session = AuthSession(
        token_hash=hashlib.sha256(data.raw_token.encode("utf-8")).digest(),
        person_id=data.person_id,
        identity_id=data.identity_id,
        provider=data.provider,
        signed_in_at=data.signed_in_at,
        last_activity_at=data.last_activity_at or data.signed_in_at,
        idle_expires_at=idle_expires_at,
        absolute_expires_at=absolute_expires_at,
        revoked_at=data.revoked_at,
        created_at=data.signed_in_at,
    )
    if data.session_id is not None:
        auth_session.id = data.session_id
    session.add(auth_session)
    session.flush()
    return auth_session


def create_sign_in_transaction(session: Session, data: SignInTransactionInput) -> SignInTransaction:
    """Creates and flushes a `SignInTransaction` storing hashed state and cookie token (D14)."""
    tx = SignInTransaction(
        state_hash=hashlib.sha256(data.raw_state.encode("utf-8")).digest(),
        cookie_token_hash=hashlib.sha256(data.raw_cookie_token.encode("utf-8")).digest(),
        nonce=data.nonce,
        code_verifier=data.code_verifier,
        provider=data.provider,
        issuer=data.issuer,
        purpose=data.purpose,
        return_path=data.return_path,
        invitation_id=data.invitation_id,
        initiating_session_id=data.initiating_session_id,
        initiating_person_id=data.initiating_person_id,
        created_at=data.created_at,
        expires_at=data.expires_at,
        consumed_at=data.consumed_at,
    )
    if data.transaction_id is not None:
        tx.id = data.transaction_id
    session.add(tx)
    session.flush()
    return tx
