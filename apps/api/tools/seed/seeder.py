"""Deterministic database seeder orchestrating `STY-103`'s tables (`STY-093` S1-S4)."""

import os
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Final, Literal
from uuid import UUID

from sqlalchemy.orm import Session

from roadmaps_api.authz import ShippedRoleKey
from roadmaps_api.models import Invitation, Membership, Person, PlatformAuditLog, Role, Tenant
from tools._local_db import truncate_public_tables
from tools.seed.deterministic import (
    ANCHOR_TIME,
    DEFAULT_SEED,
    derive_invitation_token,
    deterministic_uuidv7,
)
from tools.seed.factories import (
    ChangeSetRequest,
    InvitationInput,
    MembershipInput,
    PersonInput,
    create_invitation,
    create_membership,
    create_person_with_identity,
    create_shipped_roles,
    create_tenant,
    person_access_change_set,
    system_access_change_set,
)
from tools.seed.guards import (
    assert_superuser,
    create_pinned_admin_engine,
    validate_seed_environment,
)
from tools.seed.personas import (
    CWM_AUR_SLUG,
    DHCW_SLUG,
    LOCAL_MOCK_ISSUER,
    NAMED_PERSONAS,
    TENANT_SPECS,
)
from tools.seed.welsh import create_faker, example_email, welsh_name_parts

# Extra Faker-generated members per tenant: (tenant_slug, email_domain, role_key).
_GENERATED_MEMBER_SLOTS: Final[tuple[tuple[str, str, ShippedRoleKey], ...]] = (
    (DHCW_SLUG, "dhcw.example", ShippedRoleKey.PRODUCT_LEAD),
    (DHCW_SLUG, "dhcw.example", ShippedRoleKey.PRODUCT_LEAD),
    (DHCW_SLUG, "dhcw.example", ShippedRoleKey.VIEWER),
    (DHCW_SLUG, "dhcw.example", ShippedRoleKey.VIEWER),
    (CWM_AUR_SLUG, "cwm-aur.example", ShippedRoleKey.PRODUCT_LEAD),
    (CWM_AUR_SLUG, "cwm-aur.example", ShippedRoleKey.VIEWER),
)


@dataclass(frozen=True)
class SeededTenant:
    id: UUID
    slug: str
    name_en: str
    name_cy: str


@dataclass(frozen=True)
class SeededPerson:
    id: UUID
    key: str
    display_name: str
    email: str
    issuer: str
    subject: str
    summary_roles: tuple[str, ...]


@dataclass(frozen=True)
class SeededInvitation:
    id: UUID
    tenant_slug: str
    email: str
    role_key: ShippedRoleKey
    status: Literal["pending", "revoked", "expired"]
    raw_token: str
    expires_at: datetime


@dataclass(frozen=True)
class SeedResult:
    seed: int
    tenants: tuple[SeededTenant, ...]
    personas: tuple[SeededPerson, ...]
    generated_member_count: int
    invitations: tuple[SeededInvitation, ...]


@dataclass(frozen=True)
class _GeneratedMember:
    tenant_slug: str
    role_key: ShippedRoleKey
    person: Person


@dataclass(frozen=True)
class _InvitationSpec:
    label: str
    email: str
    role_key: ShippedRoleKey
    status: Literal["pending", "revoked", "expired"]
    created_at: datetime
    expires_at: datetime
    id_anchor: datetime


@dataclass(frozen=True)
class _AuditEntry:
    key: str
    action: str
    target_type: str
    target_id: UUID
    reason: str | None
    details: dict[str, str]
    occurred_at: datetime


@dataclass(frozen=True)
class _SeedContext:
    session: Session
    seed: int
    now: datetime
    tenants: dict[str, Tenant]
    named_people: dict[str, Person]
    disabled_at_by_key: dict[str, datetime]
    generated_members: list[_GeneratedMember]


def _seed_tenants(session: Session) -> dict[str, Tenant]:
    tenants: dict[str, Tenant] = {}
    for index, spec in enumerate(TENANT_SPECS):
        created_at = ANCHOR_TIME + timedelta(minutes=index)
        tenants[spec.slug] = create_tenant(
            session,
            spec,
            created_at=created_at,
            tenant_id=deterministic_uuidv7(f"tenant:{spec.slug}", created_at),
        )
    return tenants


def _seed_named_personas(session: Session) -> tuple[dict[str, Person], dict[str, datetime]]:
    people: dict[str, Person] = {}
    disabled_at_by_key: dict[str, datetime] = {}
    for index, spec in enumerate(NAMED_PERSONAS):
        created_at = ANCHOR_TIME + timedelta(minutes=10 + index)
        disabled_at = created_at + timedelta(days=3) if spec.disabled else None
        if disabled_at is not None:
            disabled_at_by_key[spec.key] = disabled_at
        last_sign_in_at = None if spec.disabled else created_at + timedelta(hours=1)
        person, _identity = create_person_with_identity(
            session,
            PersonInput(
                display_name=spec.display_name,
                email=spec.email,
                subject=spec.subject,
                issuer=spec.issuer,
                created_at=created_at,
                disabled_at=disabled_at,
                last_sign_in_at=last_sign_in_at,
                person_id=deterministic_uuidv7(f"person:{spec.key}", created_at),
                identity_id=deterministic_uuidv7(f"identity:{spec.key}", created_at),
            ),
        )
        people[spec.key] = person
    return people, disabled_at_by_key


def _seed_generated_members(session: Session, *, seed: int) -> list[_GeneratedMember]:
    faker = create_faker(seed)
    generated: list[_GeneratedMember] = []
    for index, (tenant_slug, domain, role_key) in enumerate(_GENERATED_MEMBER_SLOTS, start=1):
        created_at = ANCHOR_TIME + timedelta(minutes=30 + index)
        given, family = welsh_name_parts(faker)
        email = example_email(given, family, index=index, domain=domain)
        subject = f"local-generated-{seed}-{tenant_slug}-{index:02d}"
        person, _identity = create_person_with_identity(
            session,
            PersonInput(
                display_name=f"{given} {family}",
                email=email,
                subject=subject,
                issuer=LOCAL_MOCK_ISSUER,
                created_at=created_at,
                last_sign_in_at=created_at + timedelta(hours=2),
                person_id=deterministic_uuidv7(
                    f"generated-person:{seed}:{tenant_slug}:{index}", created_at
                ),
                identity_id=deterministic_uuidv7(
                    f"generated-identity:{seed}:{tenant_slug}:{index}", created_at
                ),
            ),
        )
        generated.append(
            _GeneratedMember(tenant_slug=tenant_slug, role_key=role_key, person=person)
        )
    return generated


def _seed_tenant_bootstrap(
    ctx: _SeedContext,
    tenant_slug: str,
    *,
    minute_offset: int,
) -> tuple[dict[ShippedRoleKey, Role], dict[str, Membership]]:
    tenant = ctx.tenants[tenant_slug]
    role_ts = ANCHOR_TIME + timedelta(minutes=50 + minute_offset)
    memberships_by_persona: dict[str, Membership] = {}
    with system_access_change_set(
        ctx.session,
        tenant.id,
        ChangeSetRequest.seeded(
            ctx.seed,
            f"seed:{tenant.slug}:bootstrap",
            note=f"Bootstrap {tenant.slug} shipped roles and initial memberships",
        ),
    ):
        roles = create_shipped_roles(
            ctx.session,
            tenant_id=tenant.id,
            created_at=role_ts,
            role_id_for=lambda key: deterministic_uuidv7(f"role:{tenant.slug}:{key}", role_ts),
            permission_id_for=lambda key, perm: deterministic_uuidv7(
                f"role-permission:{tenant.slug}:{key}:{perm}", role_ts
            ),
        )
        for index, spec in enumerate(NAMED_PERSONAS):
            for membership_tenant, role_key in spec.memberships:
                if membership_tenant != tenant.slug:
                    continue
                member_ts = role_ts + timedelta(seconds=10 + index)
                memberships_by_persona[spec.key] = create_membership(
                    ctx.session,
                    MembershipInput(
                        tenant_id=tenant.id,
                        person_id=ctx.named_people[spec.key].id,
                        role_id=roles[role_key].id,
                        created_at=member_ts,
                        membership_id=deterministic_uuidv7(
                            f"membership:{tenant.slug}:{spec.key}", member_ts
                        ),
                    ),
                )
        for index, member in enumerate(ctx.generated_members, start=1):
            if member.tenant_slug != tenant.slug:
                continue
            member_ts = role_ts + timedelta(minutes=1, seconds=index)
            create_membership(
                ctx.session,
                MembershipInput(
                    tenant_id=tenant.id,
                    person_id=member.person.id,
                    role_id=roles[member.role_key].id,
                    created_at=member_ts,
                    membership_id=deterministic_uuidv7(
                        f"generated-membership:{ctx.seed}:{tenant.slug}:{index}", member_ts
                    ),
                ),
            )
    return roles, memberships_by_persona


def _create_spec_invitation(
    ctx: _SeedContext,
    tenant: Tenant,
    roles: dict[ShippedRoleKey, Role],
    admin: Person,
    spec: _InvitationSpec,
) -> tuple[Invitation, SeededInvitation]:
    raw_token = derive_invitation_token(ctx.seed, spec.label)
    invitation = create_invitation(
        ctx.session,
        InvitationInput(
            tenant_id=tenant.id,
            email=spec.email,
            role_id=roles[spec.role_key].id,
            raw_token=raw_token,
            invited_by_person_id=admin.id,
            created_at=spec.created_at,
            expires_at=spec.expires_at,
            invitation_id=deterministic_uuidv7(f"invitation:{spec.label}", spec.id_anchor),
        ),
    )
    seeded = SeededInvitation(
        id=invitation.id,
        tenant_slug=tenant.slug,
        email=invitation.email,
        role_key=spec.role_key,
        status=spec.status,
        raw_token=raw_token,
        expires_at=invitation.expires_at,
    )
    return invitation, seeded


def _seed_dhcw_admin_actions(
    ctx: _SeedContext,
    dhcw_roles: dict[ShippedRoleKey, Role],
    dhcw_memberships: dict[str, Membership],
) -> list[SeededInvitation]:
    dhcw = ctx.tenants[DHCW_SLUG]
    dhcw_admin = ctx.named_people["dhcw_admin_primary"]
    expired_created = ANCHOR_TIME + timedelta(hours=2)
    revoked_created = ANCHOR_TIME + timedelta(hours=2, minutes=5)
    pending_anchor = ANCHOR_TIME + timedelta(hours=2, minutes=10)

    specs = (
        _InvitationSpec(
            label="dhcw:pending",
            email="invite.pending@dhcw.example",
            role_key=ShippedRoleKey.PRODUCT_LEAD,
            status="pending",
            created_at=ctx.now,
            expires_at=ctx.now + timedelta(days=7),
            id_anchor=pending_anchor,
        ),
        _InvitationSpec(
            label="dhcw:revoked",
            email="invite.revoked@dhcw.example",
            role_key=ShippedRoleKey.VIEWER,
            status="revoked",
            created_at=revoked_created,
            expires_at=revoked_created + timedelta(days=7),
            id_anchor=revoked_created,
        ),
        _InvitationSpec(
            label="dhcw:expired",
            email="invite.expired@dhcw.example",
            role_key=ShippedRoleKey.PRODUCT_LEAD,
            status="expired",
            created_at=expired_created,
            expires_at=expired_created + timedelta(days=7),
            id_anchor=expired_created,
        ),
    )

    rows_by_status: dict[str, Invitation] = {}
    seeded: list[SeededInvitation] = []
    with person_access_change_set(
        ctx.session,
        dhcw.id,
        dhcw_admin.id,
        ChangeSetRequest.seeded(
            ctx.seed,
            "seed:dhcw:invitations",
            note="Seed DHCW sample invitations",
        ),
    ):
        for spec in specs:
            row, summary = _create_spec_invitation(ctx, dhcw, dhcw_roles, dhcw_admin, spec)
            rows_by_status[spec.status] = row
            seeded.append(summary)

    action_ts = revoked_created + timedelta(hours=2)
    with person_access_change_set(
        ctx.session,
        dhcw.id,
        dhcw_admin.id,
        ChangeSetRequest.seeded(
            ctx.seed,
            "seed:dhcw:revoke-and-end",
            note="Revoke sample invitation and end sample membership",
        ),
    ):
        revoked_inv = rows_by_status["revoked"]
        revoked_inv.revoked_at = action_ts
        revoked_inv.updated_at = action_ts
        revoked_inv.revoked_by_kind = "person"
        revoked_inv.revoked_by_person_id = dhcw_admin.id
        for persona_spec in NAMED_PERSONAS:
            if DHCW_SLUG in persona_spec.ended_in_tenants:
                ended_membership = dhcw_memberships[persona_spec.key]
                ended_membership.ended_at = action_ts
                ended_membership.updated_at = action_ts

    return seeded


def _seed_cwm_aur_admin_actions(
    ctx: _SeedContext,
    cwm_aur_roles: dict[ShippedRoleKey, Role],
) -> SeededInvitation:
    cwm_aur = ctx.tenants[CWM_AUR_SLUG]
    cwm_aur_admin = ctx.named_people["cwm_aur_admin"]
    spec = _InvitationSpec(
        label="cwm-aur:pending",
        email="invite.pending@cwm-aur.example",
        role_key=ShippedRoleKey.PRODUCT_LEAD,
        status="pending",
        created_at=ctx.now,
        expires_at=ctx.now + timedelta(days=7),
        id_anchor=ANCHOR_TIME + timedelta(hours=3),
    )
    with person_access_change_set(
        ctx.session,
        cwm_aur.id,
        cwm_aur_admin.id,
        ChangeSetRequest.seeded(
            ctx.seed,
            "seed:cwm-aur:invitations",
            note="Seed Cwm Aur sample invitation",
        ),
    ):
        _row, summary = _create_spec_invitation(ctx, cwm_aur, cwm_aur_roles, cwm_aur_admin, spec)
    return summary


def _seed_platform_audit_log(ctx: _SeedContext) -> None:
    entries = [
        _AuditEntry(
            key=f"audit:tenant:{spec.slug}",
            action="tenant.created",
            target_type="tenant",
            target_id=ctx.tenants[spec.slug].id,
            reason=None,
            details={"slug": spec.slug},
            occurred_at=ctx.tenants[spec.slug].created_at,
        )
        for spec in TENANT_SPECS
    ]
    entries.extend(
        _AuditEntry(
            key=f"audit:person:disabled:{persona_spec.key}",
            action="person.disabled",
            target_type="person",
            target_id=ctx.named_people[persona_spec.key].id,
            reason="Seeded disabled persona",
            details={},
            occurred_at=ctx.disabled_at_by_key[persona_spec.key],
        )
        for persona_spec in NAMED_PERSONAS
        if persona_spec.disabled
    )
    for entry in entries:
        ctx.session.add(
            PlatformAuditLog(
                id=deterministic_uuidv7(entry.key, entry.occurred_at),
                occurred_at=entry.occurred_at,
                action=entry.action,
                actor_kind="system",
                actor_person_id=None,
                actor_ref="seed",
                target_type=entry.target_type,
                target_id=entry.target_id,
                reason=entry.reason,
                details=entry.details,
            )
        )


def _format_persona_summary_roles(
    memberships: tuple[tuple[str, ShippedRoleKey], ...],
    ended_in_tenants: frozenset[str],
    *,
    disabled: bool,
) -> tuple[str, ...]:
    labels: list[str] = []
    for tenant_slug, role_key in memberships:
        suffix = " (ended)" if tenant_slug in ended_in_tenants else ""
        labels.append(f"{tenant_slug}:{role_key.value}{suffix}")
    if disabled:
        labels.append("disabled")
    return tuple(labels)


def seed_database(
    session: Session,
    *,
    seed: int = DEFAULT_SEED,
    now: datetime | None = None,
) -> SeedResult:
    """Seeds every `STY-103` table through ORM models and real access triggers."""
    effective_now = datetime.now(UTC) if now is None else now.astimezone(UTC)

    tenants = _seed_tenants(session)
    named_people, disabled_at_by_key = _seed_named_personas(session)
    generated_members = _seed_generated_members(session, seed=seed)
    session.flush()

    ctx = _SeedContext(
        session=session,
        seed=seed,
        now=effective_now,
        tenants=tenants,
        named_people=named_people,
        disabled_at_by_key=disabled_at_by_key,
        generated_members=generated_members,
    )

    dhcw_roles, dhcw_memberships = _seed_tenant_bootstrap(ctx, DHCW_SLUG, minute_offset=0)
    cwm_aur_roles, _cwm_aur_memberships = _seed_tenant_bootstrap(ctx, CWM_AUR_SLUG, minute_offset=5)

    dhcw_invitations = _seed_dhcw_admin_actions(ctx, dhcw_roles, dhcw_memberships)
    cwm_aur_invitation = _seed_cwm_aur_admin_actions(ctx, cwm_aur_roles)
    _seed_platform_audit_log(ctx)
    session.flush()

    return SeedResult(
        seed=seed,
        tenants=tuple(
            SeededTenant(
                id=tenants[spec.slug].id,
                slug=spec.slug,
                name_en=spec.name_en,
                name_cy=spec.name_cy,
            )
            for spec in TENANT_SPECS
        ),
        personas=tuple(
            SeededPerson(
                id=named_people[spec.key].id,
                key=spec.key,
                display_name=spec.display_name,
                email=spec.email,
                issuer=spec.issuer,
                subject=spec.subject,
                summary_roles=_format_persona_summary_roles(
                    spec.memberships, spec.ended_in_tenants, disabled=spec.disabled
                ),
            )
            for spec in NAMED_PERSONAS
        ),
        generated_member_count=len(generated_members),
        invitations=(*dhcw_invitations, cwm_aur_invitation),
    )


def run_seed(
    url: str,
    *,
    seed: int = DEFAULT_SEED,
    now: datetime | None = None,
    environ: Mapping[str, str] | None = None,
) -> SeedResult:
    """Truncates and deterministically seeds the local database under all five safety guards."""
    validate_seed_environment(os.environ if environ is None else environ)
    engine = create_pinned_admin_engine(url)
    try:
        with (
            engine.connect() as connection,
            connection.begin(),
            Session(bind=connection, autoflush=False) as session,
        ):
            assert_superuser(connection)
            truncate_public_tables(connection)
            result = seed_database(session, seed=seed, now=now)
            session.flush()
            return result
    finally:
        engine.dispose()
