"""Deterministic database seeder orchestrating `STY-103`'s tables (`STY-093` S1-S4)."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Final, Literal
from uuid import UUID

from sqlalchemy.orm import Session

from roadmaps_api.authz import ShippedRoleKey
from roadmaps_api.models import Membership, Person, PlatformAuditLog, Role, Tenant
from tools.seed.deterministic import (
    ANCHOR_TIME,
    DEFAULT_SEED,
    derive_invitation_token,
    deterministic_uuidv7,
    request_hash_for,
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
    truncate_public_tables,
)
from tools.seed.guards import assert_superuser, create_pinned_admin_engine
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
class _SeedContext:
    session: Session
    seed: int
    now: datetime
    tenants: dict[str, Tenant]
    named_people: dict[str, Person]
    generated_members: list[tuple[str, ShippedRoleKey, Person, datetime]]


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


def _seed_named_personas(session: Session) -> dict[str, Person]:
    people: dict[str, Person] = {}
    for index, spec in enumerate(NAMED_PERSONAS):
        created_at = ANCHOR_TIME + timedelta(minutes=10 + index)
        disabled_at = created_at + timedelta(days=3) if spec.disabled else None
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
    return people


def _seed_generated_members(
    session: Session, *, seed: int
) -> list[tuple[str, ShippedRoleKey, Person, datetime]]:
    faker = create_faker(seed)
    generated: list[tuple[str, ShippedRoleKey, Person, datetime]] = []
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
        generated.append((tenant_slug, role_key, person, created_at))
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
        ChangeSetRequest(
            idempotency_key=f"seed:{tenant.slug}:bootstrap",
            request_hash=request_hash_for(ctx.seed, f"seed:{tenant.slug}:bootstrap"),
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
        for index, (member_tenant, role_key, person, created_at) in enumerate(
            ctx.generated_members, start=1
        ):
            if member_tenant != tenant.slug:
                continue
            member_ts = role_ts + timedelta(minutes=1, seconds=index)
            create_membership(
                ctx.session,
                MembershipInput(
                    tenant_id=tenant.id,
                    person_id=person.id,
                    role_id=roles[role_key].id,
                    created_at=created_at,
                    membership_id=deterministic_uuidv7(
                        f"generated-membership:{ctx.seed}:{tenant.slug}:{index}", member_ts
                    ),
                ),
            )
    return roles, memberships_by_persona


def _seed_dhcw_admin_actions(
    ctx: _SeedContext,
    dhcw_roles: dict[ShippedRoleKey, Role],
    ended_membership: Membership,
) -> list[SeededInvitation]:
    dhcw = ctx.tenants[DHCW_SLUG]
    dhcw_admin = ctx.named_people["dhcw_admin_primary"]
    inv_anchor = ANCHOR_TIME + timedelta(hours=2)
    expired_created = ANCHOR_TIME - timedelta(days=14)
    pending_token, _ = derive_invitation_token(ctx.seed, "dhcw:pending")
    revoked_token, _ = derive_invitation_token(ctx.seed, "dhcw:revoked")
    expired_token, _ = derive_invitation_token(ctx.seed, "dhcw:expired")

    with person_access_change_set(
        ctx.session,
        dhcw.id,
        dhcw_admin.id,
        ChangeSetRequest(
            idempotency_key="seed:dhcw:invitations",
            request_hash=request_hash_for(ctx.seed, "seed:dhcw:invitations"),
            note="Seed DHCW sample invitations",
        ),
    ):
        pending_inv = create_invitation(
            ctx.session,
            InvitationInput(
                tenant_id=dhcw.id,
                email="invite.pending@dhcw.example",
                role_id=dhcw_roles[ShippedRoleKey.PRODUCT_LEAD].id,
                raw_token=pending_token,
                invited_by_person_id=dhcw_admin.id,
                created_at=ctx.now,
                expires_at=ctx.now + timedelta(days=7),
                invitation_id=deterministic_uuidv7("invitation:dhcw:pending", inv_anchor),
            ),
        )
        revoked_inv = create_invitation(
            ctx.session,
            InvitationInput(
                tenant_id=dhcw.id,
                email="invite.revoked@dhcw.example",
                role_id=dhcw_roles[ShippedRoleKey.VIEWER].id,
                raw_token=revoked_token,
                invited_by_person_id=dhcw_admin.id,
                created_at=inv_anchor,
                expires_at=inv_anchor + timedelta(days=7),
                invitation_id=deterministic_uuidv7("invitation:dhcw:revoked", inv_anchor),
            ),
        )
        expired_inv = create_invitation(
            ctx.session,
            InvitationInput(
                tenant_id=dhcw.id,
                email="invite.expired@dhcw.example",
                role_id=dhcw_roles[ShippedRoleKey.PRODUCT_LEAD].id,
                raw_token=expired_token,
                invited_by_person_id=dhcw_admin.id,
                created_at=expired_created,
                expires_at=expired_created + timedelta(days=7),
                invitation_id=deterministic_uuidv7("invitation:dhcw:expired", expired_created),
            ),
        )

    action_ts = inv_anchor + timedelta(hours=2)
    with person_access_change_set(
        ctx.session,
        dhcw.id,
        dhcw_admin.id,
        ChangeSetRequest(
            idempotency_key="seed:dhcw:revoke-and-end",
            request_hash=request_hash_for(ctx.seed, "seed:dhcw:revoke-and-end"),
            note="Revoke sample invitation and end sample membership",
        ),
    ):
        revoked_inv.revoked_at = action_ts
        revoked_inv.updated_at = action_ts
        revoked_inv.revoked_by_kind = "person"
        revoked_inv.revoked_by_person_id = dhcw_admin.id
        ended_membership.ended_at = action_ts
        ended_membership.updated_at = action_ts

    return [
        SeededInvitation(
            id=pending_inv.id,
            tenant_slug=dhcw.slug,
            email=pending_inv.email,
            role_key=ShippedRoleKey.PRODUCT_LEAD,
            status="pending",
            raw_token=pending_token,
            expires_at=pending_inv.expires_at,
        ),
        SeededInvitation(
            id=revoked_inv.id,
            tenant_slug=dhcw.slug,
            email=revoked_inv.email,
            role_key=ShippedRoleKey.VIEWER,
            status="revoked",
            raw_token=revoked_token,
            expires_at=revoked_inv.expires_at,
        ),
        SeededInvitation(
            id=expired_inv.id,
            tenant_slug=dhcw.slug,
            email=expired_inv.email,
            role_key=ShippedRoleKey.PRODUCT_LEAD,
            status="expired",
            raw_token=expired_token,
            expires_at=expired_inv.expires_at,
        ),
    ]


def _seed_cwm_aur_admin_actions(
    ctx: _SeedContext,
    cwm_aur_roles: dict[ShippedRoleKey, Role],
) -> SeededInvitation:
    cwm_aur = ctx.tenants[CWM_AUR_SLUG]
    cwm_aur_admin = ctx.named_people["cwm_aur_admin"]
    inv_anchor = ANCHOR_TIME + timedelta(hours=3)
    pending_token, _ = derive_invitation_token(ctx.seed, "cwm-aur:pending")
    with person_access_change_set(
        ctx.session,
        cwm_aur.id,
        cwm_aur_admin.id,
        ChangeSetRequest(
            idempotency_key="seed:cwm-aur:invitations",
            request_hash=request_hash_for(ctx.seed, "seed:cwm-aur:invitations"),
            note="Seed Cwm Aur sample invitation",
        ),
    ):
        inv = create_invitation(
            ctx.session,
            InvitationInput(
                tenant_id=cwm_aur.id,
                email="invite.pending@cwm-aur.example",
                role_id=cwm_aur_roles[ShippedRoleKey.PRODUCT_LEAD].id,
                raw_token=pending_token,
                invited_by_person_id=cwm_aur_admin.id,
                created_at=ctx.now,
                expires_at=ctx.now + timedelta(days=7),
                invitation_id=deterministic_uuidv7("invitation:cwm-aur:pending", inv_anchor),
            ),
        )
    return SeededInvitation(
        id=inv.id,
        tenant_slug=cwm_aur.slug,
        email=inv.email,
        role_key=ShippedRoleKey.PRODUCT_LEAD,
        status="pending",
        raw_token=pending_token,
        expires_at=inv.expires_at,
    )


def _seed_platform_audit_log(ctx: _SeedContext) -> None:
    entries: tuple[tuple[str, str, str, UUID, str | None, dict[str, str], datetime], ...] = (
        (
            "audit:tenant:dhcw",
            "tenant.created",
            "tenant",
            ctx.tenants[DHCW_SLUG].id,
            None,
            {"slug": DHCW_SLUG},
            ANCHOR_TIME,
        ),
        (
            "audit:tenant:cwm-aur",
            "tenant.created",
            "tenant",
            ctx.tenants[CWM_AUR_SLUG].id,
            None,
            {"slug": CWM_AUR_SLUG},
            ANCHOR_TIME + timedelta(minutes=1),
        ),
        (
            "audit:person:disabled",
            "person.disabled",
            "person",
            ctx.named_people["dhcw_disabled_person"].id,
            "Seeded disabled persona",
            {},
            ANCHOR_TIME + timedelta(days=3),
        ),
    )
    for key, action, target_type, target_id, reason, details, occurred_at in entries:
        ctx.session.add(
            PlatformAuditLog(
                id=deterministic_uuidv7(key, occurred_at),
                occurred_at=occurred_at,
                action=action,
                actor_kind="system",
                actor_person_id=None,
                actor_ref="seed",
                target_type=target_type,
                target_id=target_id,
                reason=reason,
                details=details,
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
    named_people = _seed_named_personas(session)
    generated_members = _seed_generated_members(session, seed=seed)
    session.flush()

    ctx = _SeedContext(
        session=session,
        seed=seed,
        now=effective_now,
        tenants=tenants,
        named_people=named_people,
        generated_members=generated_members,
    )

    dhcw_roles, dhcw_memberships = _seed_tenant_bootstrap(ctx, DHCW_SLUG, minute_offset=0)
    cwm_aur_roles, _cwm_aur_memberships = _seed_tenant_bootstrap(ctx, CWM_AUR_SLUG, minute_offset=5)

    dhcw_invitations = _seed_dhcw_admin_actions(
        ctx, dhcw_roles, dhcw_memberships["dhcw_ended_member"]
    )
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
) -> SeedResult:
    """Truncates and deterministically seeds the local database on one `hostaddr`-pinned engine."""
    engine = create_pinned_admin_engine(url)
    try:
        with engine.connect() as connection, connection.begin():
            assert_superuser(connection)
            truncate_public_tables(connection)
            session = Session(bind=connection, autoflush=False)
            result = seed_database(session, seed=seed, now=now)
            session.flush()
            return result
    finally:
        engine.dispose()
