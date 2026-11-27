"""SQLAlchemy models for tenancy, people, identities, roles, memberships and access history.

Every constraint and index takes its name from `NAMING_CONVENTION` (ADR-017 _Schema
conventions_, STY-091 D18), and every relationship uses `lazy="raise"`. `SoftEndMixin`
marks tables whose rows soft-end via `ended_at` and are filtered by default in
`database.create_sessions` (STY-103 D8, D11).
"""

from datetime import datetime
from typing import Any, Final
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    LargeBinary,
    MetaData,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

NAMING_CONVENTION: Final = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

UUIDV7_DEFAULT: Final = text("uuidv7()")
EMPTY_JSON_OBJECT: Final = text("'{}'::jsonb")
XID_DEFAULT: Final = text("pg_current_xact_id()::text")


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class SoftEndMixin:
    """Marks a tenant-owned model that soft-ends rows via `ended_at` (STY-103 D8, D11).

    ORM selects through `create_sessions` automatically add `ended_at IS NULL` unless the
    statement sets `.execution_options(include_ended=True)`.
    """

    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Tenant(Base):
    __tablename__ = "tenants"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_tenants_slug"),
        CheckConstraint(
            "length(slug) BETWEEN 2 AND 63 AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'",
            name="slug_format",
        ),
        CheckConstraint("btrim(name_en) <> ''", name="name_en_non_blank"),
        CheckConstraint("name_cy IS NULL OR btrim(name_cy) <> ''", name="name_cy_non_blank"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    name_en: Mapped[str] = mapped_column(Text, nullable=False)
    name_cy: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    scopes: Mapped[list[TenantScope]] = relationship(back_populates="tenant", lazy="raise")
    roles: Mapped[list[Role]] = relationship(back_populates="tenant", lazy="raise")
    memberships: Mapped[list[Membership]] = relationship(back_populates="tenant", lazy="raise")


class Person(Base):
    __tablename__ = "people"
    __table_args__ = (CheckConstraint("btrim(display_name) <> ''", name="display_name_non_blank"),)

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    identities: Mapped[list[Identity]] = relationship(back_populates="person", lazy="raise")
    memberships: Mapped[list[Membership]] = relationship(back_populates="person", lazy="raise")


class Identity(Base):
    __tablename__ = "identities"
    __table_args__ = (
        UniqueConstraint("issuer", "subject", name="uq_identities_issuer_subject"),
        UniqueConstraint("person_id", "issuer", name="uq_identities_person_id_issuer"),
        CheckConstraint(
            "btrim(issuer) <> '' AND issuer ~ '^https?://[^[:space:]]+$'",
            name="issuer_canonical_url",
        ),
        CheckConstraint("btrim(subject) <> ''", name="subject_non_blank"),
        CheckConstraint("btrim(email) <> ''", name="email_non_blank"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    person_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("people.id", ondelete="RESTRICT", name="fk_identities_person_id_people"),
        nullable=False,
    )
    issuer: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    last_sign_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    person: Mapped[Person] = relationship(back_populates="identities", lazy="raise")


class PlatformAuditLog(Base):
    __tablename__ = "platform_audit_log"
    __table_args__ = (
        CheckConstraint("action ~ '^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$'", name="action_format"),
        CheckConstraint("actor_kind IN ('person', 'platform_job', 'system')", name="actor_kind"),
        CheckConstraint(
            "(actor_kind = 'person' AND actor_person_id IS NOT NULL AND actor_ref IS NULL)"
            " OR (actor_kind IN ('platform_job', 'system')"
            " AND actor_person_id IS NULL AND actor_ref IS NOT NULL AND btrim(actor_ref) <> '')",
            name="actor_exclusive",
        ),
        CheckConstraint("target_type ~ '^[a-z][a-z0-9_]*$'", name="target_type_format"),
        CheckConstraint("reason IS NULL OR btrim(reason) <> ''", name="reason_non_blank"),
        CheckConstraint("jsonb_typeof(details) = 'object'", name="details_object"),
        Index("ix_platform_audit_log_occurred_at", "occurred_at"),
        Index("ix_platform_audit_log_target", "target_type", "target_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    action: Mapped[str] = mapped_column(Text, nullable=False)
    actor_kind: Mapped[str] = mapped_column(Text, nullable=False)
    actor_person_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey(
            "people.id",
            ondelete="RESTRICT",
            name="fk_platform_audit_log_actor_person_id_people",
        ),
        nullable=True,
    )
    actor_ref: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_type: Mapped[str] = mapped_column(Text, nullable=False)
    target_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=EMPTY_JSON_OBJECT
    )


class TenantScope(Base):
    __tablename__ = "tenant_scopes"
    __table_args__ = (
        CheckConstraint("scope IN ('access', 'lists')", name="scope"),
        CheckConstraint("revision >= 0", name="revision_non_negative"),
    )

    tenant_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("tenants.id", ondelete="RESTRICT", name="fk_tenant_scopes_tenant_id_tenants"),
        primary_key=True,
    )
    scope: Mapped[str] = mapped_column(Text, primary_key=True)
    revision: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text("0"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    tenant: Mapped[Tenant] = relationship(back_populates="scopes", lazy="raise")


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_roles_tenant_id_id"),
        UniqueConstraint("tenant_id", "name", name="uq_roles_tenant_id_name"),
        Index(
            "uq_roles_tenant_id_system_key",
            "tenant_id",
            "system_key",
            unique=True,
            postgresql_where=text("system_key IS NOT NULL"),
        ),
        CheckConstraint("btrim(name) <> ''", name="name_non_blank"),
        CheckConstraint(
            "system_key IS NULL OR system_key IN ('admin', 'product_lead', 'viewer')",
            name="system_key",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("tenants.id", ondelete="RESTRICT", name="fk_roles_tenant_id_tenants"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    system_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    tenant: Mapped[Tenant] = relationship(back_populates="roles", lazy="raise")
    permissions: Mapped[list[RolePermission]] = relationship(
        back_populates="role",
        lazy="raise",
        overlaps="role",
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_role_permissions_tenant_id_id"),
        UniqueConstraint(
            "tenant_id",
            "role_id",
            "permission",
            name="uq_role_permissions_tenant_id_role_id_permission",
        ),
        ForeignKeyConstraint(
            ["tenant_id", "role_id"],
            ["roles.tenant_id", "roles.id"],
            ondelete="CASCADE",
            name="fk_role_permissions_tenant_id_role_id_roles",
        ),
        CheckConstraint(
            "permission ~ '^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$'",
            name="permission_format",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey(
            "tenants.id",
            ondelete="RESTRICT",
            name="fk_role_permissions_tenant_id_tenants",
        ),
        nullable=False,
    )
    role_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    permission: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    role: Mapped[Role] = relationship(
        back_populates="permissions",
        lazy="raise",
        overlaps="permissions",
    )


class Membership(SoftEndMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_memberships_tenant_id_id"),
        ForeignKeyConstraint(
            ["tenant_id", "role_id"],
            ["roles.tenant_id", "roles.id"],
            ondelete="RESTRICT",
            name="fk_memberships_tenant_id_role_id_roles",
        ),
        Index(
            "uq_memberships_tenant_id_person_id_active",
            "tenant_id",
            "person_id",
            unique=True,
            postgresql_where=text("ended_at IS NULL"),
        ),
        Index(
            "ix_memberships_person_id_active",
            "person_id",
            postgresql_where=text("ended_at IS NULL"),
        ),
        Index("ix_memberships_tenant_id_person_id", "tenant_id", "person_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("tenants.id", ondelete="RESTRICT", name="fk_memberships_tenant_id_tenants"),
        nullable=False,
    )
    person_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("people.id", ondelete="RESTRICT", name="fk_memberships_person_id_people"),
        nullable=False,
    )
    role_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    tenant: Mapped[Tenant] = relationship(
        back_populates="memberships", lazy="raise", overlaps="role"
    )
    person: Mapped[Person] = relationship(back_populates="memberships", lazy="raise")
    role: Mapped[Role] = relationship(lazy="raise", overlaps="memberships,tenant")


class Invitation(Base):
    __tablename__ = "invitations"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_invitations_tenant_id_id"),
        UniqueConstraint("token_hash", name="uq_invitations_token_hash"),
        ForeignKeyConstraint(
            ["tenant_id", "role_id"],
            ["roles.tenant_id", "roles.id"],
            ondelete="RESTRICT",
            name="fk_invitations_tenant_id_role_id_roles",
        ),
        CheckConstraint("btrim(email) <> ''", name="email_non_blank"),
        CheckConstraint("provider IN ('google', 'entra', 'local_mock')", name="provider"),
        CheckConstraint("octet_length(token_hash) = 32", name="token_hash_sha256"),
        CheckConstraint("invited_by_kind IN ('person', 'platform_job')", name="invited_by_kind"),
        CheckConstraint(
            "(invited_by_kind = 'person' AND invited_by_person_id IS NOT NULL"
            " AND issued_by_platform_execution_id IS NULL)"
            " OR (invited_by_kind = 'platform_job' AND invited_by_person_id IS NULL"
            " AND issued_by_platform_execution_id IS NOT NULL"
            " AND btrim(issued_by_platform_execution_id) <> '')",
            name="inviter_exclusive",
        ),
        CheckConstraint(
            "revoked_by_kind IS NULL OR revoked_by_kind IN ('person', 'platform_job')",
            name="revoked_by_kind",
        ),
        CheckConstraint(
            "(revoked_at IS NULL AND revoked_by_kind IS NULL"
            " AND revoked_by_person_id IS NULL AND revoked_by_platform_execution_id IS NULL)"
            " OR (revoked_at IS NOT NULL AND revoked_by_kind = 'person'"
            " AND revoked_by_person_id IS NOT NULL AND revoked_by_platform_execution_id IS NULL)"
            " OR (revoked_at IS NOT NULL AND revoked_by_kind = 'platform_job'"
            " AND revoked_by_person_id IS NULL AND revoked_by_platform_execution_id IS NOT NULL"
            " AND btrim(revoked_by_platform_execution_id) <> '')",
            name="revoker_exclusive",
        ),
        CheckConstraint(
            "(redeemed_at IS NULL AND redeemed_by_person_id IS NULL)"
            " OR (redeemed_at IS NOT NULL AND redeemed_by_person_id IS NOT NULL)",
            name="redemption_pair",
        ),
        CheckConstraint(
            "NOT (revoked_at IS NOT NULL AND redeemed_at IS NOT NULL)",
            name="not_revoked_and_redeemed",
        ),
        CheckConstraint("expires_at > created_at", name="expires_after_created"),
        Index("ix_invitations_tenant_id_expires_at", "tenant_id", "expires_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("tenants.id", ondelete="RESTRICT", name="fk_invitations_tenant_id_tenants"),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    role_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    token_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    invited_by_kind: Mapped[str] = mapped_column(Text, nullable=False)
    invited_by_person_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey(
            "people.id",
            ondelete="RESTRICT",
            name="fk_invitations_invited_by_person_id_people",
        ),
        nullable=True,
    )
    issued_by_platform_execution_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by_kind: Mapped[str | None] = mapped_column(Text, nullable=True)
    revoked_by_person_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey(
            "people.id",
            ondelete="RESTRICT",
            name="fk_invitations_revoked_by_person_id_people",
        ),
        nullable=True,
    )
    revoked_by_platform_execution_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    redeemed_by_person_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey(
            "people.id",
            ondelete="RESTRICT",
            name="fk_invitations_redeemed_by_person_id_people",
        ),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    role: Mapped[Role] = relationship(lazy="raise")


class ChangeSet(Base):
    __tablename__ = "change_sets"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_change_sets_tenant_id_id"),
        UniqueConstraint(
            "tenant_id", "idempotency_key", name="uq_change_sets_tenant_id_idempotency_key"
        ),
        CheckConstraint("scope IN ('access', 'lists', 'roadmap')", name="scope"),
        CheckConstraint(
            "(scope IN ('access', 'lists') AND scope_id IS NULL)"
            " OR (scope = 'roadmap' AND scope_id IS NOT NULL)",
            name="scope_id_matches_scope",
        ),
        CheckConstraint(
            "kind IN ('access_change', 'list_change', 'save', 'discard', 'restore', 'retire',"
            " 'reinstate', 'publish', 'unpublish', 'import', 'migration', 'redaction')",
            name="kind",
        ),
        CheckConstraint("actor_kind IN ('person', 'platform_job', 'system')", name="actor_kind"),
        CheckConstraint(
            "(actor_kind = 'person' AND actor_person_id IS NOT NULL AND actor_ref IS NULL)"
            " OR (actor_kind IN ('platform_job', 'system')"
            " AND actor_person_id IS NULL AND actor_ref IS NOT NULL AND btrim(actor_ref) <> '')",
            name="actor_exclusive",
        ),
        CheckConstraint("base_revision >= 0", name="base_revision_non_negative"),
        CheckConstraint("revision = base_revision + 1", name="revision_increments_by_one"),
        CheckConstraint("btrim(idempotency_key) <> ''", name="idempotency_key_non_blank"),
        CheckConstraint("octet_length(request_hash) = 32", name="request_hash_sha256"),
        CheckConstraint("note IS NULL OR btrim(note) <> ''", name="note_non_blank"),
        Index("ix_change_sets_opened_xid", "opened_xid"),
        Index("ix_change_sets_tenant_id_scope_revision", "tenant_id", "scope", "revision"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("tenants.id", ondelete="RESTRICT", name="fk_change_sets_tenant_id_tenants"),
        nullable=False,
    )
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    scope_id: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    actor_kind: Mapped[str] = mapped_column(Text, nullable=False)
    actor_person_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey(
            "people.id",
            ondelete="RESTRICT",
            name="fk_change_sets_actor_person_id_people",
        ),
        nullable=True,
    )
    actor_ref: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_revision: Mapped[int] = mapped_column(BigInteger, nullable=False)
    revision: Mapped[int] = mapped_column(BigInteger, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(Text, nullable=False)
    request_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    batch_ref: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)
    opened_xid: Mapped[str] = mapped_column(Text, nullable=False, server_default=XID_DEFAULT)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    summaries: Mapped[list[ChangeSummary]] = relationship(
        back_populates="change_set",
        lazy="raise",
        overlaps="change_set",
    )


class ChangeSummary(Base):
    __tablename__ = "change_summaries"
    __table_args__ = (
        UniqueConstraint("tenant_id", "id", name="uq_change_summaries_tenant_id_id"),
        ForeignKeyConstraint(
            ["tenant_id", "change_set_id"],
            ["change_sets.tenant_id", "change_sets.id"],
            ondelete="RESTRICT",
            name="fk_change_summaries_tenant_id_change_set_id_change_sets",
        ),
        CheckConstraint("entity_type ~ '^[a-z][a-z0-9_]*$'", name="entity_type_format"),
        CheckConstraint("action IN ('added', 'changed', 'removed')", name="action"),
        CheckConstraint(
            "(action = 'added' AND field IS NULL AND old_value IS NULL AND new_value IS NOT NULL)"
            " OR (action = 'removed' AND field IS NULL"
            " AND old_value IS NOT NULL AND new_value IS NULL)"
            " OR (action = 'changed' AND field IS NOT NULL AND btrim(field) <> '')",
            name="action_payload",
        ),
        Index("ix_change_summaries_tenant_id_change_set_id", "tenant_id", "change_set_id"),
        Index("ix_change_summaries_tenant_id_entity", "tenant_id", "entity_type", "entity_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, server_default=UUIDV7_DEFAULT)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey(
            "tenants.id",
            ondelete="RESTRICT",
            name="fk_change_summaries_tenant_id_tenants",
        ),
        nullable=False,
    )
    change_set_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    field: Mapped[str | None] = mapped_column(Text, nullable=True)
    old_value: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    change_set: Mapped[ChangeSet] = relationship(
        back_populates="summaries",
        lazy="raise",
        overlaps="summaries",
    )


class ChangeSetSignoff(Base):
    """Append-only sign-off row written exclusively by `roadmaps_history_definer` (ADR-015)."""

    __tablename__ = "change_set_signoffs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["tenant_id", "change_set_id"],
            ["change_sets.tenant_id", "change_sets.id"],
            ondelete="RESTRICT",
            name="fk_change_set_signoffs_tenant_id_change_set_id_change_sets",
        ),
        Index("ix_change_set_signoffs_signed_off_xid", "signed_off_xid"),
    )

    tenant_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey(
            "tenants.id",
            ondelete="RESTRICT",
            name="fk_change_set_signoffs_tenant_id_tenants",
        ),
        primary_key=True,
    )
    change_set_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    signed_off_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    signed_off_xid: Mapped[str] = mapped_column(Text, nullable=False, server_default=XID_DEFAULT)
