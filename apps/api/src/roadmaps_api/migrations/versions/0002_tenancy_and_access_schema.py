"""Tenancy, people, identities, roles, memberships, invitations and access history (STY-103).

Creates shared tables (`tenants`, `people`, `identities`, `platform_audit_log`) and
tenant-owned tables (`tenant_scopes`, `roles`, `role_permissions`, `memberships`,
`invitations`, `change_sets`, `change_summaries`, `change_set_signoffs`), enables and
forces row-level security with policies on every table, grants minimal privileges to
`roadmaps_app` and `roadmaps_history_definer`, and installs the `roadmaps_history_definer`
`SECURITY DEFINER` open/sign-off and trigger routines.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from roadmaps_api.database import TENANT_POLICY
from roadmaps_api.migrations import UpgradeOnlyError

revision: str = "0002_tenancy_and_access_schema"
down_revision: str | None = "0001_app_reads_alembic_version"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDV7 = sa.text("uuidv7()")
NOW = sa.text("now()")
EMPTY_JSON = sa.text("'{}'::jsonb")
CURRENT_XID = sa.text("pg_current_xact_id()::text")
PERSON_SETTING_UUID = "NULLIF(current_setting('app.person_id', true), '')::uuid"
TENANT_SETTING_UUID = "NULLIF(current_setting('app.tenant_id', true), '')::uuid"
TENANT_SETTING_EMPTY = "NULLIF(current_setting('app.tenant_id', true), '') IS NULL"


def _create_shared_tables() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("name_en", sa.Text(), nullable=False),
        sa.Column("name_cy", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_tenants"),
        sa.UniqueConstraint("slug", name="uq_tenants_slug"),
        sa.CheckConstraint(
            "length(slug) BETWEEN 2 AND 63 AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'",
            name="ck_tenants_slug_format",
        ),
        sa.CheckConstraint("btrim(name_en) <> ''", name="ck_tenants_name_en_non_blank"),
        sa.CheckConstraint(
            "name_cy IS NULL OR btrim(name_cy) <> ''", name="ck_tenants_name_cy_non_blank"
        ),
    )

    op.create_table(
        "people",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_people"),
        sa.CheckConstraint("btrim(display_name) <> ''", name="ck_people_display_name_non_blank"),
    )

    op.create_table(
        "identities",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("person_id", sa.Uuid(), nullable=False),
        sa.Column("issuer", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("last_sign_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("linked_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_identities"),
        sa.ForeignKeyConstraint(
            ["person_id"], ["people.id"], ondelete="RESTRICT", name="fk_identities_person_id_people"
        ),
        sa.UniqueConstraint("issuer", "subject", name="uq_identities_issuer_subject"),
        sa.UniqueConstraint("person_id", "issuer", name="uq_identities_person_id_issuer"),
        sa.CheckConstraint(
            "btrim(issuer) <> '' AND issuer ~ '^https?://[^[:space:]]+$'",
            name="ck_identities_issuer_canonical_url",
        ),
        sa.CheckConstraint("btrim(subject) <> ''", name="ck_identities_subject_non_blank"),
        sa.CheckConstraint("btrim(email) <> ''", name="ck_identities_email_non_blank"),
    )

    op.create_table(
        "platform_audit_log",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("actor_kind", sa.Text(), nullable=False),
        sa.Column("actor_person_id", sa.Uuid(), nullable=True),
        sa.Column("actor_ref", sa.Text(), nullable=True),
        sa.Column("target_type", sa.Text(), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "details",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=EMPTY_JSON,
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_platform_audit_log"),
        sa.ForeignKeyConstraint(
            ["actor_person_id"],
            ["people.id"],
            ondelete="RESTRICT",
            name="fk_platform_audit_log_actor_person_id_people",
        ),
        sa.CheckConstraint(
            "action ~ '^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_]*$'",
            name="ck_platform_audit_log_action_format",
        ),
        sa.CheckConstraint(
            "actor_kind IN ('person', 'platform_job', 'system')",
            name="ck_platform_audit_log_actor_kind",
        ),
        sa.CheckConstraint(
            "(actor_kind = 'person' AND actor_person_id IS NOT NULL AND actor_ref IS NULL)"
            " OR (actor_kind IN ('platform_job', 'system')"
            " AND actor_person_id IS NULL AND actor_ref IS NOT NULL AND btrim(actor_ref) <> '')",
            name="ck_platform_audit_log_actor_exclusive",
        ),
        sa.CheckConstraint(
            "target_type ~ '^[a-z][a-z0-9_]*$'", name="ck_platform_audit_log_target_type_format"
        ),
        sa.CheckConstraint(
            "reason IS NULL OR btrim(reason) <> ''", name="ck_platform_audit_log_reason_non_blank"
        ),
        sa.CheckConstraint(
            "jsonb_typeof(details) = 'object'", name="ck_platform_audit_log_details_object"
        ),
    )
    op.create_index("ix_platform_audit_log_occurred_at", "platform_audit_log", ["occurred_at"])
    op.create_index(
        "ix_platform_audit_log_target", "platform_audit_log", ["target_type", "target_id"]
    )


def _create_tenant_access_tables() -> None:
    op.create_table(
        "tenant_scopes",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("revision", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("tenant_id", "scope", name="pk_tenant_scopes"),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
            name="fk_tenant_scopes_tenant_id_tenants",
        ),
        sa.CheckConstraint("scope IN ('access', 'lists')", name="ck_tenant_scopes_scope"),
        sa.CheckConstraint("revision >= 0", name="ck_tenant_scopes_revision_non_negative"),
    )

    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("system_key", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_roles"),
        sa.ForeignKeyConstraint(
            ["tenant_id"], ["tenants.id"], ondelete="RESTRICT", name="fk_roles_tenant_id_tenants"
        ),
        sa.UniqueConstraint("tenant_id", "id", name="uq_roles_tenant_id_id"),
        sa.UniqueConstraint("tenant_id", "name", name="uq_roles_tenant_id_name"),
        sa.CheckConstraint("btrim(name) <> ''", name="ck_roles_name_non_blank"),
        sa.CheckConstraint(
            "system_key IS NULL OR system_key IN ('admin', 'product_lead', 'viewer')",
            name="ck_roles_system_key",
        ),
    )
    op.create_index(
        "uq_roles_tenant_id_system_key",
        "roles",
        ["tenant_id", "system_key"],
        unique=True,
        postgresql_where=sa.text("system_key IS NOT NULL"),
    )

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("permission", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_role_permissions"),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
            name="fk_role_permissions_tenant_id_tenants",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "role_id"],
            ["roles.tenant_id", "roles.id"],
            ondelete="CASCADE",
            name="fk_role_permissions_tenant_id_role_id_roles",
        ),
        sa.UniqueConstraint("tenant_id", "id", name="uq_role_permissions_tenant_id_id"),
        sa.UniqueConstraint(
            "tenant_id",
            "role_id",
            "permission",
            name="uq_role_permissions_tenant_id_role_id_permission",
        ),
        sa.CheckConstraint(
            "permission ~ '^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$'",
            name="ck_role_permissions_permission_format",
        ),
    )

    op.create_table(
        "memberships",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("person_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_memberships"),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
            name="fk_memberships_tenant_id_tenants",
        ),
        sa.ForeignKeyConstraint(
            ["person_id"],
            ["people.id"],
            ondelete="RESTRICT",
            name="fk_memberships_person_id_people",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "role_id"],
            ["roles.tenant_id", "roles.id"],
            ondelete="RESTRICT",
            name="fk_memberships_tenant_id_role_id_roles",
        ),
        sa.UniqueConstraint("tenant_id", "id", name="uq_memberships_tenant_id_id"),
    )
    op.create_index(
        "uq_memberships_tenant_id_person_id_active",
        "memberships",
        ["tenant_id", "person_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
    )
    op.create_index(
        "ix_memberships_person_id_active",
        "memberships",
        ["person_id"],
        postgresql_where=sa.text("ended_at IS NULL"),
    )
    op.create_index("ix_memberships_tenant_id_person_id", "memberships", ["tenant_id", "person_id"])

    op.create_table(
        "invitations",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(), nullable=False),
        sa.Column("invited_by_kind", sa.Text(), nullable=False),
        sa.Column("invited_by_person_id", sa.Uuid(), nullable=True),
        sa.Column("issued_by_platform_execution_id", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by_kind", sa.Text(), nullable=True),
        sa.Column("revoked_by_person_id", sa.Uuid(), nullable=True),
        sa.Column("revoked_by_platform_execution_id", sa.Text(), nullable=True),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("redeemed_by_person_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_invitations"),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
            name="fk_invitations_tenant_id_tenants",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "role_id"],
            ["roles.tenant_id", "roles.id"],
            ondelete="RESTRICT",
            name="fk_invitations_tenant_id_role_id_roles",
        ),
        sa.ForeignKeyConstraint(
            ["invited_by_person_id"],
            ["people.id"],
            ondelete="RESTRICT",
            name="fk_invitations_invited_by_person_id_people",
        ),
        sa.ForeignKeyConstraint(
            ["revoked_by_person_id"],
            ["people.id"],
            ondelete="RESTRICT",
            name="fk_invitations_revoked_by_person_id_people",
        ),
        sa.ForeignKeyConstraint(
            ["redeemed_by_person_id"],
            ["people.id"],
            ondelete="RESTRICT",
            name="fk_invitations_redeemed_by_person_id_people",
        ),
        sa.UniqueConstraint("tenant_id", "id", name="uq_invitations_tenant_id_id"),
        sa.UniqueConstraint("token_hash", name="uq_invitations_token_hash"),
        sa.CheckConstraint("btrim(email) <> ''", name="ck_invitations_email_non_blank"),
        sa.CheckConstraint(
            "provider IN ('google', 'entra', 'local_mock')", name="ck_invitations_provider"
        ),
        sa.CheckConstraint(
            "octet_length(token_hash) = 32", name="ck_invitations_token_hash_sha256"
        ),
        sa.CheckConstraint(
            "invited_by_kind IN ('person', 'platform_job')", name="ck_invitations_invited_by_kind"
        ),
        sa.CheckConstraint(
            "(invited_by_kind = 'person' AND invited_by_person_id IS NOT NULL"
            " AND issued_by_platform_execution_id IS NULL)"
            " OR (invited_by_kind = 'platform_job' AND invited_by_person_id IS NULL"
            " AND issued_by_platform_execution_id IS NOT NULL"
            " AND btrim(issued_by_platform_execution_id) <> '')",
            name="ck_invitations_inviter_exclusive",
        ),
        sa.CheckConstraint(
            "revoked_by_kind IS NULL OR revoked_by_kind IN ('person', 'platform_job')",
            name="ck_invitations_revoked_by_kind",
        ),
        sa.CheckConstraint(
            "(revoked_at IS NULL AND revoked_by_kind IS NULL"
            " AND revoked_by_person_id IS NULL AND revoked_by_platform_execution_id IS NULL)"
            " OR (revoked_at IS NOT NULL AND revoked_by_kind = 'person'"
            " AND revoked_by_person_id IS NOT NULL AND revoked_by_platform_execution_id IS NULL)"
            " OR (revoked_at IS NOT NULL AND revoked_by_kind = 'platform_job'"
            " AND revoked_by_person_id IS NULL AND revoked_by_platform_execution_id IS NOT NULL"
            " AND btrim(revoked_by_platform_execution_id) <> '')",
            name="ck_invitations_revoker_exclusive",
        ),
        sa.CheckConstraint(
            "(redeemed_at IS NULL AND redeemed_by_person_id IS NULL)"
            " OR (redeemed_at IS NOT NULL AND redeemed_by_person_id IS NOT NULL)",
            name="ck_invitations_redemption_pair",
        ),
        sa.CheckConstraint(
            "NOT (revoked_at IS NOT NULL AND redeemed_at IS NOT NULL)",
            name="ck_invitations_not_revoked_and_redeemed",
        ),
        sa.CheckConstraint("expires_at > created_at", name="ck_invitations_expires_after_created"),
    )
    op.create_index(
        "ix_invitations_tenant_id_expires_at", "invitations", ["tenant_id", "expires_at"]
    )


def _create_history_tables() -> None:
    op.create_table(
        "change_sets",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("scope_id", sa.Uuid(), nullable=True),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("actor_kind", sa.Text(), nullable=False),
        sa.Column("actor_person_id", sa.Uuid(), nullable=True),
        sa.Column("actor_ref", sa.Text(), nullable=True),
        sa.Column("base_revision", sa.BigInteger(), nullable=False),
        sa.Column("revision", sa.BigInteger(), nullable=False),
        sa.Column("idempotency_key", sa.Text(), nullable=False),
        sa.Column("request_hash", sa.LargeBinary(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("batch_ref", sa.Uuid(), nullable=True),
        sa.Column("opened_xid", sa.Text(), server_default=CURRENT_XID, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_change_sets"),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
            name="fk_change_sets_tenant_id_tenants",
        ),
        sa.ForeignKeyConstraint(
            ["actor_person_id"],
            ["people.id"],
            ondelete="RESTRICT",
            name="fk_change_sets_actor_person_id_people",
        ),
        sa.UniqueConstraint("tenant_id", "id", name="uq_change_sets_tenant_id_id"),
        sa.UniqueConstraint(
            "tenant_id", "idempotency_key", name="uq_change_sets_tenant_id_idempotency_key"
        ),
        sa.CheckConstraint("scope IN ('access', 'lists', 'roadmap')", name="ck_change_sets_scope"),
        sa.CheckConstraint(
            "(scope IN ('access', 'lists') AND scope_id IS NULL)"
            " OR (scope = 'roadmap' AND scope_id IS NOT NULL)",
            name="ck_change_sets_scope_id_matches_scope",
        ),
        sa.CheckConstraint(
            "kind IN ('access_change', 'list_change', 'save', 'discard', 'restore', 'retire',"
            " 'reinstate', 'publish', 'unpublish', 'import', 'migration', 'redaction')",
            name="ck_change_sets_kind",
        ),
        sa.CheckConstraint(
            "actor_kind IN ('person', 'platform_job', 'system')", name="ck_change_sets_actor_kind"
        ),
        sa.CheckConstraint(
            "(actor_kind = 'person' AND actor_person_id IS NOT NULL AND actor_ref IS NULL)"
            " OR (actor_kind IN ('platform_job', 'system')"
            " AND actor_person_id IS NULL AND actor_ref IS NOT NULL AND btrim(actor_ref) <> '')",
            name="ck_change_sets_actor_exclusive",
        ),
        sa.CheckConstraint("base_revision >= 0", name="ck_change_sets_base_revision_non_negative"),
        sa.CheckConstraint(
            "revision = base_revision + 1", name="ck_change_sets_revision_increments_by_one"
        ),
        sa.CheckConstraint(
            "btrim(idempotency_key) <> ''", name="ck_change_sets_idempotency_key_non_blank"
        ),
        sa.CheckConstraint(
            "octet_length(request_hash) = 32", name="ck_change_sets_request_hash_sha256"
        ),
        sa.CheckConstraint(
            "note IS NULL OR btrim(note) <> ''", name="ck_change_sets_note_non_blank"
        ),
    )
    op.create_index("ix_change_sets_opened_xid", "change_sets", ["opened_xid"])
    op.create_index(
        "ix_change_sets_tenant_id_scope_revision", "change_sets", ["tenant_id", "scope", "revision"]
    )

    op.create_table(
        "change_summaries",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("change_set_id", sa.Uuid(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("field", sa.Text(), nullable=True),
        sa.Column("old_value", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("new_value", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_change_summaries"),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
            name="fk_change_summaries_tenant_id_tenants",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "change_set_id"],
            ["change_sets.tenant_id", "change_sets.id"],
            ondelete="RESTRICT",
            name="fk_change_summaries_tenant_id_change_set_id_change_sets",
        ),
        sa.UniqueConstraint("tenant_id", "id", name="uq_change_summaries_tenant_id_id"),
        sa.CheckConstraint(
            "entity_type ~ '^[a-z][a-z0-9_]*$'", name="ck_change_summaries_entity_type_format"
        ),
        sa.CheckConstraint(
            "action IN ('added', 'changed', 'removed')", name="ck_change_summaries_action"
        ),
        sa.CheckConstraint(
            "(action = 'added' AND field IS NULL AND old_value IS NULL AND new_value IS NOT NULL)"
            " OR (action = 'removed' AND field IS NULL"
            " AND old_value IS NOT NULL AND new_value IS NULL)"
            " OR (action = 'changed' AND field IS NOT NULL AND btrim(field) <> '')",
            name="ck_change_summaries_action_payload",
        ),
    )
    op.create_index(
        "ix_change_summaries_tenant_id_change_set_id",
        "change_summaries",
        ["tenant_id", "change_set_id"],
    )
    op.create_index(
        "ix_change_summaries_tenant_id_entity",
        "change_summaries",
        ["tenant_id", "entity_type", "entity_id"],
    )

    op.create_table(
        "change_set_signoffs",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("change_set_id", sa.Uuid(), nullable=False),
        sa.Column("signed_off_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("signed_off_xid", sa.Text(), server_default=CURRENT_XID, nullable=False),
        sa.PrimaryKeyConstraint("tenant_id", "change_set_id", name="pk_change_set_signoffs"),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
            name="fk_change_set_signoffs_tenant_id_tenants",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id", "change_set_id"],
            ["change_sets.tenant_id", "change_sets.id"],
            ondelete="RESTRICT",
            name="fk_change_set_signoffs_tenant_id_change_set_id_change_sets",
        ),
    )
    op.create_index(
        "ix_change_set_signoffs_signed_off_xid", "change_set_signoffs", ["signed_off_xid"]
    )


def _enable_rls_and_policies() -> None:
    all_tables = (
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
    )
    for table in all_tables:
        op.execute(
            f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY"
        )

    # Shared tables (D8, D9, D11)
    op.execute("""
        CREATE POLICY tenant_or_active_member_select ON public.tenants
        FOR SELECT USING (
            id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            OR (
                NULLIF(current_setting('app.tenant_id', true), '') IS NULL
                AND EXISTS (
                    SELECT 1 FROM public.memberships AS m
                    WHERE m.tenant_id = tenants.id
                      AND m.person_id = NULLIF(current_setting('app.person_id', true), '')::uuid
                      AND m.ended_at IS NULL
                )
            )
        )
    """)
    op.execute("""
        CREATE POLICY self_or_tenant_member_select ON public.people
        FOR SELECT USING (
            id = NULLIF(current_setting('app.person_id', true), '')::uuid
            OR EXISTS (
                SELECT 1 FROM public.memberships AS m
                WHERE m.person_id = people.id
                  AND m.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            )
        )
    """)
    op.execute("""
        CREATE POLICY self_or_active_tenant_member_select ON public.identities
        FOR SELECT USING (
            person_id = NULLIF(current_setting('app.person_id', true), '')::uuid
            OR EXISTS (
                SELECT 1 FROM public.memberships AS m
                WHERE m.person_id = identities.person_id
                  AND m.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
                  AND m.ended_at IS NULL
            )
        )
    """)
    op.execute("""
        CREATE POLICY deny_all ON public.platform_audit_log
        FOR ALL USING (false) WITH CHECK (false)
    """)

    # Tenant-owned working & scope tables
    op.execute(
        f"CREATE POLICY tenant_select ON public.tenant_scopes FOR SELECT USING ({TENANT_POLICY})"
    )
    op.execute(
        f"CREATE POLICY owner_all ON public.tenant_scopes FOR ALL TO roadmaps_owner"
        f" USING ({TENANT_POLICY}) WITH CHECK ({TENANT_POLICY})"
    )
    op.execute(
        "CREATE POLICY history_definer_select ON public.tenant_scopes"
        " FOR SELECT TO roadmaps_history_definer USING (true)"
    )
    op.execute(
        "CREATE POLICY history_definer_update ON public.tenant_scopes"
        " FOR UPDATE TO roadmaps_history_definer USING (true) WITH CHECK (true)"
    )

    for table in ("roles", "role_permissions"):
        op.execute(
            f"CREATE POLICY tenant ON public.{table}"
            f" FOR ALL USING ({TENANT_POLICY}) WITH CHECK ({TENANT_POLICY})"
        )

    op.execute(
        f"CREATE POLICY tenant ON public.memberships"
        f" FOR ALL USING ({TENANT_POLICY}) WITH CHECK ({TENANT_POLICY})"
    )
    op.execute(f"""
        CREATE POLICY person_select ON public.memberships
        FOR SELECT USING (
            {TENANT_SETTING_EMPTY}
            AND person_id = {PERSON_SETTING_UUID}
            AND ended_at IS NULL
        )
    """)

    op.execute(
        f"CREATE POLICY tenant_select ON public.invitations FOR SELECT USING ({TENANT_POLICY})"
    )
    op.execute(f"""
        CREATE POLICY app_insert ON public.invitations
        FOR INSERT TO roadmaps_app
        WITH CHECK (
            {TENANT_POLICY}
            AND invited_by_kind = 'person'
            AND invited_by_person_id = {PERSON_SETTING_UUID}
            AND revoked_at IS NULL
            AND revoked_by_kind IS NULL
            AND redeemed_at IS NULL
            AND redeemed_by_person_id IS NULL
        )
    """)
    op.execute(f"""
        CREATE POLICY app_update ON public.invitations
        FOR UPDATE TO roadmaps_app
        USING ({TENANT_POLICY} AND invited_by_kind = 'person')
        WITH CHECK (
            {TENANT_POLICY}
            AND invited_by_kind = 'person'
            AND redeemed_at IS NULL
            AND redeemed_by_person_id IS NULL
            AND (
                revoked_by_kind IS NULL
                OR (
                    revoked_by_kind = 'person'
                    AND revoked_by_person_id = {PERSON_SETTING_UUID}
                )
            )
        )
    """)
    op.execute(
        f"CREATE POLICY owner_all ON public.invitations FOR ALL TO roadmaps_owner"
        f" USING ({TENANT_POLICY}) WITH CHECK ({TENANT_POLICY})"
    )

    # Immutable history tables (append-only for roadmaps_history_definer)
    for table in ("change_sets", "change_summaries", "change_set_signoffs"):
        op.execute(
            f"CREATE POLICY tenant_select ON public.{table} FOR SELECT USING ({TENANT_POLICY})"
        )
        op.execute(
            f"CREATE POLICY history_definer_select ON public.{table}"
            " FOR SELECT TO roadmaps_history_definer USING (true)"
        )
        op.execute(
            f"CREATE POLICY history_definer_insert ON public.{table}"
            " FOR INSERT TO roadmaps_history_definer WITH CHECK (true)"
        )


def _grant_table_privileges() -> None:
    op.execute(
        "GRANT SELECT ON public.tenants, public.people, public.identities,"
        " public.tenant_scopes, public.change_sets, public.change_summaries TO roadmaps_app"
    )
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles, public.role_permissions"
        " TO roadmaps_app"
    )
    op.execute(
        "GRANT SELECT, INSERT, UPDATE ON public.memberships, public.invitations TO roadmaps_app"
    )
    op.execute("GRANT SELECT, UPDATE ON public.tenant_scopes TO roadmaps_history_definer")
    op.execute(
        "GRANT SELECT, INSERT ON public.change_sets, public.change_summaries,"
        " public.change_set_signoffs TO roadmaps_history_definer"
    )


def _create_history_definer_routines_and_triggers() -> None:
    op.execute("""
        CREATE FUNCTION public.open_access_change_set_internal(
            p_tenant_id uuid,
            p_kind text,
            p_actor_kind text,
            p_actor_person_id uuid,
            p_actor_ref text,
            p_idempotency_key text,
            p_request_hash bytea,
            p_note text DEFAULT NULL,
            p_batch_ref uuid DEFAULT NULL
        )
        RETURNS TABLE (change_set_id uuid, revision bigint, is_replay boolean)
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $fn$
        DECLARE
            v_xid text := pg_current_xact_id()::text;
            v_base_revision bigint;
            v_new_revision bigint;
            v_change_set_id uuid;
            v_existing record;
        BEGIN
            IF p_tenant_id IS NULL THEN
                RAISE EXCEPTION 'tenant context is required' USING ERRCODE = '22023';
            END IF;
            IF p_kind IS NULL OR p_kind NOT IN ('access_change', 'import', 'migration') THEN
                RAISE EXCEPTION 'invalid access change set kind' USING ERRCODE = '22023';
            END IF;
            IF p_actor_kind IS NULL OR p_actor_kind NOT IN ('person', 'platform_job', 'system')
            THEN
                RAISE EXCEPTION 'invalid change set actor' USING ERRCODE = '22023';
            END IF;
            IF (p_actor_kind = 'person' AND (p_actor_person_id IS NULL OR p_actor_ref IS NOT NULL))
                OR (
                    p_actor_kind IN ('platform_job', 'system')
                    AND (
                        p_actor_person_id IS NOT NULL
                        OR p_actor_ref IS NULL
                        OR btrim(p_actor_ref) = ''
                    )
                )
            THEN
                RAISE EXCEPTION 'invalid change set actor' USING ERRCODE = '22023';
            END IF;
            IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
                RAISE EXCEPTION 'idempotency key is required' USING ERRCODE = '22023';
            END IF;
            IF p_request_hash IS NULL OR octet_length(p_request_hash) <> 32 THEN
                RAISE EXCEPTION 'request hash must be 32 bytes' USING ERRCODE = '22023';
            END IF;
            IF p_note IS NOT NULL AND btrim(p_note) = '' THEN
                RAISE EXCEPTION 'note must not be blank' USING ERRCODE = '22023';
            END IF;

            IF EXISTS (
                SELECT 1
                FROM public.change_sets AS cs
                WHERE cs.opened_xid = v_xid
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.change_set_signoffs AS s
                      WHERE s.tenant_id = cs.tenant_id AND s.change_set_id = cs.id
                  )
            ) THEN
                RAISE EXCEPTION 'another change set is already open in this transaction'
                    USING ERRCODE = 'P0001';
            END IF;

            SELECT ts.revision INTO v_base_revision
            FROM public.tenant_scopes AS ts
            WHERE ts.tenant_id = p_tenant_id AND ts.scope = 'access'
            FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'access scope lock row not found' USING ERRCODE = 'P0002';
            END IF;

            SELECT
                cs.id,
                cs.revision,
                cs.scope,
                cs.kind,
                cs.actor_kind,
                cs.actor_person_id,
                cs.actor_ref,
                cs.request_hash
            INTO v_existing
            FROM public.change_sets AS cs
            WHERE cs.tenant_id = p_tenant_id AND cs.idempotency_key = p_idempotency_key;

            IF FOUND THEN
                IF v_existing.scope = 'access'
                    AND v_existing.kind = p_kind
                    AND v_existing.actor_kind = p_actor_kind
                    AND v_existing.actor_person_id IS NOT DISTINCT FROM p_actor_person_id
                    AND v_existing.actor_ref IS NOT DISTINCT FROM p_actor_ref
                    AND v_existing.request_hash = p_request_hash
                THEN
                    RETURN QUERY SELECT v_existing.id, v_existing.revision, true;
                    RETURN;
                END IF;
                RAISE EXCEPTION 'idempotency key already used with another payload or actor'
                    USING ERRCODE = '23505';
            END IF;

            v_new_revision := v_base_revision + 1;
            UPDATE public.tenant_scopes
            SET revision = v_new_revision, updated_at = now()
            WHERE tenant_id = p_tenant_id AND scope = 'access';

            INSERT INTO public.change_sets (
                tenant_id,
                scope,
                scope_id,
                kind,
                actor_kind,
                actor_person_id,
                actor_ref,
                base_revision,
                revision,
                idempotency_key,
                request_hash,
                note,
                batch_ref,
                opened_xid
            ) VALUES (
                p_tenant_id,
                'access',
                NULL,
                p_kind,
                p_actor_kind,
                p_actor_person_id,
                p_actor_ref,
                v_base_revision,
                v_new_revision,
                p_idempotency_key,
                p_request_hash,
                p_note,
                p_batch_ref,
                v_xid
            )
            RETURNING id INTO v_change_set_id;

            RETURN QUERY SELECT v_change_set_id, v_new_revision, false;
        END;
        $fn$;
    """)

    op.execute("""
        CREATE FUNCTION public.open_access_change_set(
            p_idempotency_key text,
            p_request_hash bytea,
            p_note text DEFAULT NULL,
            p_batch_ref uuid DEFAULT NULL
        )
        RETURNS TABLE (change_set_id uuid, revision bigint, is_replay boolean)
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $fn$
        DECLARE
            v_tenant_id uuid := NULLIF(current_setting('app.tenant_id', true), '')::uuid;
            v_person_id uuid := NULLIF(current_setting('app.person_id', true), '')::uuid;
        BEGIN
            IF v_tenant_id IS NULL THEN
                RAISE EXCEPTION 'tenant context is required' USING ERRCODE = '22023';
            END IF;
            IF v_person_id IS NULL THEN
                RAISE EXCEPTION 'person context is required' USING ERRCODE = '22023';
            END IF;
            RETURN QUERY
            SELECT r.change_set_id, r.revision, r.is_replay
            FROM public.open_access_change_set_internal(
                v_tenant_id,
                'access_change',
                'person',
                v_person_id,
                NULL,
                p_idempotency_key,
                p_request_hash,
                p_note,
                p_batch_ref
            ) AS r;
        END;
        $fn$;
    """)

    op.execute("""
        CREATE FUNCTION public.sign_off_access_change_set_internal(
            p_tenant_id uuid,
            p_change_set_id uuid
        )
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $fn$
        DECLARE
            v_xid text := pg_current_xact_id()::text;
        BEGIN
            IF p_tenant_id IS NULL OR p_change_set_id IS NULL THEN
                RAISE EXCEPTION 'change set identifier is required' USING ERRCODE = '22023';
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM public.change_sets AS cs
                WHERE cs.tenant_id = p_tenant_id
                  AND cs.id = p_change_set_id
                  AND cs.scope = 'access'
                  AND cs.opened_xid = v_xid
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.change_set_signoffs AS s
                      WHERE s.tenant_id = cs.tenant_id AND s.change_set_id = cs.id
                  )
            ) THEN
                RAISE EXCEPTION 'no matching open access change set in this transaction'
                    USING ERRCODE = 'P0001';
            END IF;

            INSERT INTO public.change_set_signoffs (tenant_id, change_set_id, signed_off_xid)
            VALUES (p_tenant_id, p_change_set_id, v_xid);
        END;
        $fn$;
    """)

    op.execute("""
        CREATE FUNCTION public.sign_off_access_change_set(p_change_set_id uuid)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $fn$
        DECLARE
            v_tenant_id uuid := NULLIF(current_setting('app.tenant_id', true), '')::uuid;
            v_person_id uuid := NULLIF(current_setting('app.person_id', true), '')::uuid;
            v_xid text := pg_current_xact_id()::text;
        BEGIN
            IF v_tenant_id IS NULL THEN
                RAISE EXCEPTION 'tenant context is required' USING ERRCODE = '22023';
            END IF;
            IF v_person_id IS NULL THEN
                RAISE EXCEPTION 'person context is required' USING ERRCODE = '22023';
            END IF;
            IF p_change_set_id IS NULL THEN
                RAISE EXCEPTION 'change set identifier is required' USING ERRCODE = '22023';
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM public.change_sets AS cs
                WHERE cs.tenant_id = v_tenant_id
                  AND cs.id = p_change_set_id
                  AND cs.scope = 'access'
                  AND cs.actor_kind = 'person'
                  AND cs.actor_person_id = v_person_id
                  AND cs.opened_xid = v_xid
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.change_set_signoffs AS s
                      WHERE s.tenant_id = cs.tenant_id AND s.change_set_id = cs.id
                  )
            ) THEN
                RAISE EXCEPTION 'no matching open access change set in this transaction'
                    USING ERRCODE = 'P0001';
            END IF;

            PERFORM public.sign_off_access_change_set_internal(v_tenant_id, p_change_set_id);
        END;
        $fn$;
    """)

    op.execute("""
        CREATE FUNCTION public.guard_access_working_write()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $fn$
        DECLARE
            v_xid text := pg_current_xact_id()::text;
            v_open record;
            v_row_tenant_id uuid;
        BEGIN
            SELECT cs.id, cs.tenant_id, cs.scope
            INTO v_open
            FROM public.change_sets AS cs
            WHERE cs.opened_xid = v_xid
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.change_set_signoffs AS s
                  WHERE s.tenant_id = cs.tenant_id AND s.change_set_id = cs.id
              )
            LIMIT 1;

            IF NOT FOUND THEN
                IF EXISTS (
                    SELECT 1 FROM public.change_set_signoffs AS s WHERE s.signed_off_xid = v_xid
                ) THEN
                    RAISE EXCEPTION 'write after change set sign-off is forbidden'
                        USING ERRCODE = 'P0001';
                END IF;
                RAISE EXCEPTION 'access write requires an open change set'
                    USING ERRCODE = 'P0001';
            END IF;

            IF v_open.scope <> 'access' THEN
                RAISE EXCEPTION 'write outside open change set scope' USING ERRCODE = 'P0001';
            END IF;

            IF TG_OP = 'DELETE' THEN
                v_row_tenant_id := OLD.tenant_id;
            ELSIF TG_OP = 'INSERT' THEN
                v_row_tenant_id := NEW.tenant_id;
            ELSE
                IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
                    RAISE EXCEPTION 'write outside open change set scope' USING ERRCODE = 'P0001';
                END IF;
                v_row_tenant_id := NEW.tenant_id;
            END IF;

            IF v_row_tenant_id IS DISTINCT FROM v_open.tenant_id THEN
                RAISE EXCEPTION 'write outside open change set scope' USING ERRCODE = 'P0001';
            END IF;

            RETURN NULL;
        END;
        $fn$;
    """)

    op.execute("""
        CREATE FUNCTION public.record_access_change_summary()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $fn$
        DECLARE
            v_xid text := pg_current_xact_id()::text;
            v_open record;
            v_entity_type text;
            v_allowed text[];
            v_old_json jsonb;
            v_new_json jsonb;
            v_filtered jsonb;
            v_col text;
        BEGIN
            SELECT cs.id, cs.tenant_id
            INTO v_open
            FROM public.change_sets AS cs
            WHERE cs.opened_xid = v_xid
              AND cs.scope = 'access'
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.change_set_signoffs AS s
                  WHERE s.tenant_id = cs.tenant_id AND s.change_set_id = cs.id
              )
            LIMIT 1;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'access write requires an open change set'
                    USING ERRCODE = 'P0001';
            END IF;

            CASE TG_TABLE_NAME
                WHEN 'roles' THEN
                    v_entity_type := 'role';
                    v_allowed := ARRAY['name', 'system_key'];
                WHEN 'role_permissions' THEN
                    v_entity_type := 'role_permission';
                    v_allowed := ARRAY['role_id', 'permission'];
                WHEN 'memberships' THEN
                    v_entity_type := 'membership';
                    v_allowed := ARRAY['person_id', 'role_id', 'ended_at'];
                WHEN 'invitations' THEN
                    -- Explicit allow-list: never records token_hash or email (STY-103 D10).
                    v_entity_type := 'invitation';
                    v_allowed := ARRAY[
                        'provider',
                        'role_id',
                        'invited_by_kind',
                        'invited_by_person_id',
                        'issued_by_platform_execution_id',
                        'expires_at',
                        'revoked_at',
                        'revoked_by_kind',
                        'revoked_by_person_id',
                        'revoked_by_platform_execution_id',
                        'redeemed_at',
                        'redeemed_by_person_id'
                    ];
                ELSE
                    RAISE EXCEPTION 'unsupported table for access summary' USING ERRCODE = 'P0001';
            END CASE;

            IF TG_OP = 'INSERT' THEN
                v_new_json := to_jsonb(NEW);
                SELECT jsonb_object_agg(col, v_new_json -> col)
                INTO v_filtered
                FROM unnest(v_allowed) AS col;

                INSERT INTO public.change_summaries (
                    tenant_id, change_set_id, entity_type, entity_id,
                    action, field, old_value, new_value
                ) VALUES (
                    NEW.tenant_id, v_open.id, v_entity_type, NEW.id,
                    'added', NULL, NULL, v_filtered
                );
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                v_old_json := to_jsonb(OLD);
                SELECT jsonb_object_agg(col, v_old_json -> col)
                INTO v_filtered
                FROM unnest(v_allowed) AS col;

                INSERT INTO public.change_summaries (
                    tenant_id, change_set_id, entity_type, entity_id,
                    action, field, old_value, new_value
                ) VALUES (
                    OLD.tenant_id, v_open.id, v_entity_type, OLD.id,
                    'removed', NULL, v_filtered, NULL
                );
                RETURN OLD;
            ELSE
                v_old_json := to_jsonb(OLD);
                v_new_json := to_jsonb(NEW);
                FOREACH v_col IN ARRAY v_allowed LOOP
                    IF (v_old_json -> v_col) IS DISTINCT FROM (v_new_json -> v_col) THEN
                        INSERT INTO public.change_summaries (
                            tenant_id, change_set_id, entity_type, entity_id,
                            action, field, old_value, new_value
                        ) VALUES (
                            NEW.tenant_id, v_open.id, v_entity_type, NEW.id,
                            'changed', v_col, v_old_json -> v_col, v_new_json -> v_col
                        );
                    END IF;
                END LOOP;
                RETURN NEW;
            END IF;
        END;
        $fn$;
    """)

    op.execute("""
        CREATE FUNCTION public.verify_change_set_signed_off()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $fn$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM public.change_set_signoffs AS s
                WHERE s.tenant_id = NEW.tenant_id AND s.change_set_id = NEW.id
            ) THEN
                RAISE EXCEPTION 'change set was not signed off before commit'
                    USING ERRCODE = 'P0001';
            END IF;
            RETURN NULL;
        END;
        $fn$;
    """)

    op.execute("""
        CREATE FUNCTION public.forbid_immutable_history_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public
        AS $fn$
        BEGIN
            RAISE EXCEPTION 'history and audit records are immutable' USING ERRCODE = 'P0001';
        END;
        $fn$;
    """)

    routines = (
        (
            "public.open_access_change_set_internal"
            "(uuid, text, text, uuid, text, text, bytea, text, uuid)"
        ),
        "public.open_access_change_set(text, bytea, text, uuid)",
        "public.sign_off_access_change_set_internal(uuid, uuid)",
        "public.sign_off_access_change_set(uuid)",
        "public.guard_access_working_write()",
        "public.record_access_change_summary()",
        "public.verify_change_set_signed_off()",
        "public.forbid_immutable_history_mutation()",
    )
    for routine in routines:
        op.execute(f"REVOKE ALL ON FUNCTION {routine} FROM PUBLIC")

    op.execute(
        "GRANT EXECUTE ON FUNCTION public.open_access_change_set(text, bytea, text, uuid)"
        " TO roadmaps_app"
    )
    op.execute("GRANT EXECUTE ON FUNCTION public.sign_off_access_change_set(uuid) TO roadmaps_app")
    op.execute(
        "GRANT EXECUTE ON FUNCTION public.open_access_change_set_internal"
        "(uuid, text, text, uuid, text, text, bytea, text, uuid)"
        " TO roadmaps_owner, roadmaps_auth_definer, roadmaps_platform_definer"
    )
    op.execute(
        "GRANT EXECUTE ON FUNCTION public.sign_off_access_change_set_internal(uuid, uuid)"
        " TO roadmaps_owner, roadmaps_auth_definer, roadmaps_platform_definer"
    )

    # Attach access-scope guard and summary triggers while roadmaps_owner still owns the
    # trigger functions; ownership transfers to roadmaps_history_definer immediately below.
    # Both are AFTER triggers so CHECK constraints and RLS WITH CHECK run first; numeric
    # prefixes guarantee the guard (01) runs before summary recording (02).
    for table in ("roles", "role_permissions", "memberships"):
        op.execute(
            f"CREATE TRIGGER trg_{table}_01_access_guard"
            f" AFTER INSERT OR UPDATE OR DELETE ON public.{table}"
            " FOR EACH ROW EXECUTE FUNCTION public.guard_access_working_write()"
        )
        op.execute(
            f"CREATE TRIGGER trg_{table}_02_access_summary"
            f" AFTER INSERT OR UPDATE OR DELETE ON public.{table}"
            " FOR EACH ROW EXECUTE FUNCTION public.record_access_change_summary()"
        )

    # On invitations, roadmaps_auth_definer's 90-day retention purge DELETE is exempt from
    # access commit-guard and summary triggers (STY-103 D16).
    op.execute(
        "CREATE TRIGGER trg_invitations_01_access_guard_write"
        " AFTER INSERT OR UPDATE ON public.invitations"
        " FOR EACH ROW EXECUTE FUNCTION public.guard_access_working_write()"
    )
    op.execute(
        "CREATE TRIGGER trg_invitations_01_access_guard_delete"
        " AFTER DELETE ON public.invitations"
        " FOR EACH ROW WHEN (current_user <> 'roadmaps_auth_definer')"
        " EXECUTE FUNCTION public.guard_access_working_write()"
    )
    op.execute(
        "CREATE TRIGGER trg_invitations_02_access_summary_write"
        " AFTER INSERT OR UPDATE ON public.invitations"
        " FOR EACH ROW EXECUTE FUNCTION public.record_access_change_summary()"
    )
    op.execute(
        "CREATE TRIGGER trg_invitations_02_access_summary_delete"
        " AFTER DELETE ON public.invitations"
        " FOR EACH ROW WHEN (current_user <> 'roadmaps_auth_definer')"
        " EXECUTE FUNCTION public.record_access_change_summary()"
    )

    # Deferred sign-off verification at COMMIT.
    op.execute(
        "CREATE CONSTRAINT TRIGGER trg_change_sets_require_sign_off"
        " AFTER INSERT ON public.change_sets"
        " DEFERRABLE INITIALLY DEFERRED"
        " FOR EACH ROW EXECUTE FUNCTION public.verify_change_set_signed_off()"
    )

    # Statement-level immutability triggers on history and platform audit log so any
    # UPDATE, DELETE or TRUNCATE fails immediately even when RLS filters zero rows.
    for table in ("change_sets", "change_summaries", "change_set_signoffs", "platform_audit_log"):
        op.execute(
            f"CREATE TRIGGER trg_{table}_immutable"
            f" BEFORE UPDATE OR DELETE OR TRUNCATE ON public.{table}"
            " FOR EACH STATEMENT EXECUTE FUNCTION public.forbid_immutable_history_mutation()"
        )

    # Transfer routine ownership to roadmaps_history_definer and immediately revoke temporary
    # schema CREATE so no definer role holds CREATE once migration completes (STY-103 S4, D1).
    op.execute("GRANT CREATE ON SCHEMA public TO roadmaps_history_definer")
    for routine in routines:
        op.execute(f"ALTER FUNCTION {routine} OWNER TO roadmaps_history_definer")
    op.execute("REVOKE CREATE ON SCHEMA public FROM roadmaps_history_definer")

    # Grant roadmaps_owner EXECUTE on the internal change-set routines (needed for future
    # data-fix migrations of kind 'migration') after ownership transfer.
    op.execute("SET LOCAL ROLE roadmaps_history_definer")
    op.execute(
        "GRANT EXECUTE ON FUNCTION public.open_access_change_set_internal"
        "(uuid, text, text, uuid, text, text, bytea, text, uuid) TO roadmaps_owner"
    )
    op.execute(
        "GRANT EXECUTE ON FUNCTION public.sign_off_access_change_set_internal(uuid, uuid)"
        " TO roadmaps_owner"
    )
    op.execute("SET LOCAL ROLE roadmaps_owner")


def upgrade() -> None:
    _create_shared_tables()
    _create_tenant_access_tables()
    _create_history_tables()
    _enable_rls_and_policies()
    _grant_table_privileges()
    _create_history_definer_routines_and_triggers()


def downgrade() -> None:
    raise UpgradeOnlyError
