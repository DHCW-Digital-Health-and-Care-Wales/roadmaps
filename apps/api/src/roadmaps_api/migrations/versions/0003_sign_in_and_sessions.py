"""Sign-in transactions, server-side sessions, auth/purge definers and role RLS (STY-106).

Creates the shared `sessions` and `sign_in_transactions` tables with forced row-level
security, adds read-only `person_select` RLS policies on `roles` and `role_permissions`
(D7), grants minimal privileges to `roadmaps_auth_definer`, and installs the
`roadmaps_auth_definer` `SECURITY DEFINER` routines for sign-in, session management and
retention purges (D1, D12, D14, D15).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from roadmaps_api.migrations import UpgradeOnlyError

revision: str = "0003_sign_in_and_sessions"
down_revision: str | None = "0002_tenancy_and_access_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDV7 = sa.text("uuidv7()")
NOW = sa.text("now()")


def _create_auth_tables() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("token_hash", sa.LargeBinary(), nullable=False),
        sa.Column("person_id", sa.Uuid(), nullable=False),
        sa.Column("identity_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("signed_in_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column(
            "last_activity_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False
        ),
        sa.Column("idle_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("absolute_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_sessions"),
        sa.ForeignKeyConstraint(
            ["person_id"], ["people.id"], ondelete="RESTRICT", name="fk_sessions_person_id_people"
        ),
        sa.ForeignKeyConstraint(
            ["identity_id"],
            ["identities.id"],
            ondelete="RESTRICT",
            name="fk_sessions_identity_id_identities",
        ),
        sa.UniqueConstraint("token_hash", name="uq_sessions_token_hash"),
        sa.CheckConstraint("octet_length(token_hash) = 32", name="token_hash_sha256"),
        sa.CheckConstraint("provider IN ('google', 'entra', 'local_mock')", name="provider"),
        sa.CheckConstraint("idle_expires_at > signed_in_at", name="idle_after_signed_in"),
        sa.CheckConstraint("idle_expires_at <= absolute_expires_at", name="idle_within_absolute"),
        sa.CheckConstraint(
            "absolute_expires_at <= signed_in_at + interval '10 hours 5 minutes'",
            name="absolute_max_lifetime",
        ),
        sa.CheckConstraint(
            "last_activity_at >= signed_in_at", name="last_activity_after_signed_in"
        ),
        sa.CheckConstraint(
            "revoked_at IS NULL OR revoked_at >= signed_in_at",
            name="revoked_after_signed_in",
        ),
    )
    op.create_index(
        "ix_sessions_person_id_active",
        "sessions",
        ["person_id"],
        postgresql_where=sa.text("revoked_at IS NULL"),
    )
    op.create_index("ix_sessions_absolute_expires_at", "sessions", ["absolute_expires_at"])

    op.create_table(
        "sign_in_transactions",
        sa.Column("id", sa.Uuid(), server_default=UUIDV7, nullable=False),
        sa.Column("state_hash", sa.LargeBinary(), nullable=False),
        sa.Column("cookie_token_hash", sa.LargeBinary(), nullable=False),
        sa.Column("nonce", sa.Text(), nullable=False),
        sa.Column("code_verifier", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("issuer", sa.Text(), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("return_path", sa.Text(), nullable=False),
        sa.Column("invitation_id", sa.Uuid(), nullable=True),
        sa.Column("initiating_session_id", sa.Uuid(), nullable=True),
        sa.Column("initiating_person_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_sign_in_transactions"),
        sa.ForeignKeyConstraint(
            ["invitation_id"],
            ["invitations.id"],
            ondelete="RESTRICT",
            name="fk_sign_in_transactions_invitation_id_invitations",
        ),
        sa.ForeignKeyConstraint(
            ["initiating_session_id"],
            ["sessions.id"],
            ondelete="RESTRICT",
            name="fk_sign_in_transactions_initiating_session_id_sessions",
        ),
        sa.ForeignKeyConstraint(
            ["initiating_person_id"],
            ["people.id"],
            ondelete="RESTRICT",
            name="fk_sign_in_transactions_initiating_person_id_people",
        ),
        sa.UniqueConstraint("state_hash", name="uq_sign_in_transactions_state_hash"),
        sa.UniqueConstraint("cookie_token_hash", name="uq_sign_in_transactions_cookie_token_hash"),
        sa.CheckConstraint("octet_length(state_hash) = 32", name="state_hash_sha256"),
        sa.CheckConstraint("octet_length(cookie_token_hash) = 32", name="cookie_token_hash_sha256"),
        sa.CheckConstraint("btrim(nonce) <> ''", name="nonce_non_blank"),
        sa.CheckConstraint("btrim(code_verifier) <> ''", name="code_verifier_non_blank"),
        sa.CheckConstraint("provider IN ('google', 'entra', 'local_mock')", name="provider"),
        sa.CheckConstraint(
            "btrim(issuer) <> '' AND issuer ~ '^https?://[^[:space:]]+$'",
            name="issuer_canonical_url",
        ),
        sa.CheckConstraint("purpose IN ('sign-in', 'redeem', 'link')", name="purpose"),
        sa.CheckConstraint(
            "return_path ~ '^/' AND length(return_path) <= 512",
            name="return_path_relative",
        ),
        sa.CheckConstraint(
            "((purpose = 'sign-in' AND invitation_id IS NULL"
            " AND initiating_session_id IS NULL AND initiating_person_id IS NULL)"
            " OR (purpose = 'redeem' AND invitation_id IS NOT NULL"
            " AND initiating_session_id IS NULL AND initiating_person_id IS NULL)"
            " OR (purpose = 'link' AND invitation_id IS NULL"
            " AND initiating_session_id IS NOT NULL AND initiating_person_id IS NOT NULL))"
            " IS TRUE",
            name="purpose_fields",
        ),
        sa.CheckConstraint("expires_at > created_at", name="expires_after_created"),
        sa.CheckConstraint(
            "expires_at <= created_at + interval '15 minutes'",
            name="max_lifetime",
        ),
        sa.CheckConstraint(
            "consumed_at IS NULL OR consumed_at >= created_at",
            name="consumed_after_created",
        ),
    )
    op.create_index("ix_sign_in_transactions_expires_at", "sign_in_transactions", ["expires_at"])


def _enable_rls_and_policies() -> None:
    for table in ("sessions", "sign_in_transactions"):
        op.execute(
            f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY"
        )
        op.execute(
            f"CREATE POLICY auth_definer_select ON public.{table}"
            " FOR SELECT TO roadmaps_auth_definer USING (true)"
        )
        op.execute(
            f"CREATE POLICY auth_definer_insert ON public.{table}"
            " FOR INSERT TO roadmaps_auth_definer WITH CHECK (true)"
        )
        op.execute(
            f"CREATE POLICY auth_definer_update ON public.{table}"
            " FOR UPDATE TO roadmaps_auth_definer USING (true) WITH CHECK (true)"
        )
        op.execute(
            f"CREATE POLICY auth_definer_delete ON public.{table}"
            " FOR DELETE TO roadmaps_auth_definer USING (true)"
        )

    for table in ("people", "identities"):
        op.execute(
            f"CREATE POLICY auth_definer_select ON public.{table}"
            " FOR SELECT TO roadmaps_auth_definer USING (true)"
        )
        op.execute(
            f"CREATE POLICY auth_definer_update ON public.{table}"
            " FOR UPDATE TO roadmaps_auth_definer USING (true) WITH CHECK (true)"
        )

    # Read-only person_select RLS on roles and role_permissions when app.tenant_id is unset (D7).
    op.execute("""
        CREATE POLICY person_select ON public.roles
        FOR SELECT USING (
            NULLIF(current_setting('app.tenant_id', true), '') IS NULL
            AND EXISTS (
                SELECT 1 FROM public.memberships AS m
                WHERE m.tenant_id = roles.tenant_id
                  AND m.role_id = roles.id
                  AND m.person_id = NULLIF(current_setting('app.person_id', true), '')::uuid
                  AND m.ended_at IS NULL
            )
        )
    """)
    op.execute("""
        CREATE POLICY person_select ON public.role_permissions
        FOR SELECT USING (
            NULLIF(current_setting('app.tenant_id', true), '') IS NULL
            AND EXISTS (
                SELECT 1 FROM public.memberships AS m
                WHERE m.tenant_id = role_permissions.tenant_id
                  AND m.role_id = role_permissions.role_id
                  AND m.person_id = NULLIF(current_setting('app.person_id', true), '')::uuid
                  AND m.ended_at IS NULL
            )
        )
    """)


def _grant_table_privileges() -> None:
    # roadmaps_app holds ZERO direct privileges on sessions or sign_in_transactions.
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions, public.sign_in_transactions"
        " TO roadmaps_auth_definer"
    )
    op.execute("GRANT SELECT ON public.people, public.identities TO roadmaps_auth_definer")
    op.execute("GRANT UPDATE (display_name, updated_at) ON public.people TO roadmaps_auth_definer")
    op.execute(
        "GRANT UPDATE (email, last_sign_in_at, updated_at)"
        " ON public.identities TO roadmaps_auth_definer"
    )


def _create_auth_definer_routines() -> None:
    op.execute("""
        CREATE FUNCTION public.create_sign_in_transaction(
            p_state_hash bytea,
            p_cookie_token_hash bytea,
            p_nonce text,
            p_code_verifier text,
            p_provider text,
            p_issuer text,
            p_purpose text,
            p_return_path text,
            p_invitation_id uuid DEFAULT NULL,
            p_initiating_session_id uuid DEFAULT NULL,
            p_initiating_person_id uuid DEFAULT NULL,
            p_ttl_seconds integer DEFAULT 600
        )
        RETURNS TABLE (transaction_id uuid, expires_at timestamptz)
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_now timestamptz := now();
            v_expires_at timestamptz;
            v_id uuid;
        BEGIN
            IF p_ttl_seconds IS NULL OR p_ttl_seconds < 1 OR p_ttl_seconds > 600 THEN
                RAISE EXCEPTION 'invalid transaction ttl' USING ERRCODE = '22023';
            END IF;
            v_expires_at := v_now + make_interval(secs => p_ttl_seconds);
            INSERT INTO public.sign_in_transactions (
                state_hash,
                cookie_token_hash,
                nonce,
                code_verifier,
                provider,
                issuer,
                purpose,
                return_path,
                invitation_id,
                initiating_session_id,
                initiating_person_id,
                created_at,
                expires_at
            )
            VALUES (
                p_state_hash,
                p_cookie_token_hash,
                p_nonce,
                p_code_verifier,
                p_provider,
                p_issuer,
                p_purpose,
                p_return_path,
                p_invitation_id,
                p_initiating_session_id,
                p_initiating_person_id,
                v_now,
                v_expires_at
            )
            RETURNING id INTO v_id;

            RETURN QUERY SELECT v_id, v_expires_at;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.consume_sign_in_transaction(
            p_state_hash bytea,
            p_cookie_token_hashes bytea[],
            p_provider text,
            p_issuer text
        )
        RETURNS TABLE (
            transaction_id uuid,
            nonce text,
            code_verifier text,
            provider text,
            issuer text,
            purpose text,
            return_path text,
            invitation_id uuid,
            initiating_session_id uuid,
            initiating_person_id uuid
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        BEGIN
            IF p_state_hash IS NULL OR octet_length(p_state_hash) <> 32 THEN
                RETURN;
            END IF;
            IF p_cookie_token_hashes IS NULL OR cardinality(p_cookie_token_hashes) = 0 THEN
                RETURN;
            END IF;

            RETURN QUERY
            UPDATE public.sign_in_transactions AS tx
            SET consumed_at = now()
            WHERE tx.state_hash = p_state_hash
              AND tx.cookie_token_hash = ANY(p_cookie_token_hashes)
              AND tx.provider = p_provider
              AND tx.issuer = p_issuer
              AND tx.consumed_at IS NULL
              AND tx.expires_at > now()
            RETURNING
                tx.id,
                tx.nonce,
                tx.code_verifier,
                tx.provider,
                tx.issuer,
                tx.purpose,
                tx.return_path,
                tx.invitation_id,
                tx.initiating_session_id,
                tx.initiating_person_id;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.lookup_sign_in_identity(
            p_issuer text,
            p_subject text
        )
        RETURNS TABLE (
            identity_id uuid,
            person_id uuid,
            person_disabled boolean,
            has_entra_identity boolean
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        BEGIN
            RETURN QUERY
            SELECT
                i.id,
                p.id,
                (p.disabled_at IS NOT NULL),
                EXISTS (
                    SELECT 1
                    FROM public.identities AS other
                    WHERE other.person_id = p.id
                      AND other.issuer ~ '^https://login\\.microsoftonline\\.com/[^/]+/v2\\.0$'
                )
            FROM public.identities AS i
            JOIN public.people AS p ON p.id = i.person_id
            WHERE i.issuer = p_issuer
              AND i.subject = p_subject;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.create_session(
            p_token_hash bytea,
            p_person_id uuid,
            p_identity_id uuid,
            p_provider text,
            p_email text,
            p_display_name text DEFAULT NULL
        )
        RETURNS TABLE (
            session_id uuid,
            signed_in_at timestamptz,
            idle_expires_at timestamptz,
            absolute_expires_at timestamptz
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_now timestamptz := now();
            v_idle timestamptz := v_now + interval '60 minutes';
            v_abs timestamptz := v_now + interval '10 hours';
            v_disabled_at timestamptz;
            v_session_id uuid;
        BEGIN
            SELECT p.disabled_at INTO v_disabled_at
            FROM public.people AS p
            WHERE p.id = p_person_id
            FOR NO KEY UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'person not found' USING ERRCODE = 'P0002';
            END IF;
            IF v_disabled_at IS NOT NULL THEN
                RAISE EXCEPTION 'person is disabled' USING ERRCODE = 'P0001';
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM public.identities AS i
                WHERE i.id = p_identity_id AND i.person_id = p_person_id
            ) THEN
                RAISE EXCEPTION 'identity does not belong to person' USING ERRCODE = '22023';
            END IF;

            IF p_provider = 'google' AND EXISTS (
                SELECT 1
                FROM public.identities AS other
                WHERE other.person_id = p_person_id
                  AND other.issuer ~ '^https://login\\.microsoftonline\\.com/[^/]+/v2\\.0$'
            ) THEN
                RAISE EXCEPTION 'entra sign-in required' USING ERRCODE = 'P0001';
            END IF;

            UPDATE public.identities AS i
            SET email = p_email,
                last_sign_in_at = v_now,
                updated_at = v_now
            WHERE i.id = p_identity_id AND i.person_id = p_person_id;

            IF p_display_name IS NOT NULL AND btrim(p_display_name) <> '' THEN
                UPDATE public.people AS p
                SET display_name = btrim(p_display_name),
                    updated_at = v_now
                WHERE p.id = p_person_id;
            END IF;

            INSERT INTO public.sessions (
                token_hash,
                person_id,
                identity_id,
                provider,
                signed_in_at,
                last_activity_at,
                idle_expires_at,
                absolute_expires_at,
                created_at
            )
            VALUES (
                p_token_hash,
                p_person_id,
                p_identity_id,
                p_provider,
                v_now,
                v_now,
                v_idle,
                v_abs,
                v_now
            )
            RETURNING id INTO v_session_id;

            RETURN QUERY SELECT v_session_id, v_now, v_idle, v_abs;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.lookup_session(p_token_hash bytea)
        RETURNS TABLE (
            session_id uuid,
            person_id uuid,
            provider text,
            signed_in_at timestamptz,
            last_activity_at timestamptz,
            idle_expires_at timestamptz,
            absolute_expires_at timestamptz,
            needs_activity_touch boolean
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_now timestamptz := now();
        BEGIN
            IF p_token_hash IS NULL OR octet_length(p_token_hash) <> 32 THEN
                RETURN;
            END IF;

            RETURN QUERY
            SELECT
                s.id,
                s.person_id,
                s.provider,
                s.signed_in_at,
                s.last_activity_at,
                s.idle_expires_at,
                s.absolute_expires_at,
                (v_now - s.last_activity_at >= interval '1 minute')
            FROM public.sessions AS s
            JOIN public.people AS p ON p.id = s.person_id
            WHERE s.token_hash = p_token_hash
              AND s.revoked_at IS NULL
              AND s.idle_expires_at > v_now
              AND s.absolute_expires_at > v_now
              AND p.disabled_at IS NULL;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.touch_session_activity(p_token_hash bytea)
        RETURNS TABLE (
            last_activity_at timestamptz,
            idle_expires_at timestamptz
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_now timestamptz := now();
        BEGIN
            IF p_token_hash IS NULL OR octet_length(p_token_hash) <> 32 THEN
                RETURN;
            END IF;

            RETURN QUERY
            UPDATE public.sessions AS s
            SET last_activity_at = v_now,
                idle_expires_at = LEAST(v_now + interval '60 minutes', s.absolute_expires_at)
            WHERE s.token_hash = p_token_hash
              AND s.revoked_at IS NULL
              AND s.idle_expires_at > v_now
              AND s.absolute_expires_at > v_now
              AND v_now - s.last_activity_at >= interval '1 minute'
              AND EXISTS (
                  SELECT 1 FROM public.people AS p
                  WHERE p.id = s.person_id AND p.disabled_at IS NULL
              )
            RETURNING s.last_activity_at, s.idle_expires_at;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.extend_session(p_session_id uuid)
        RETURNS TABLE (
            idle_expires_at timestamptz,
            absolute_expires_at timestamptz
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_now timestamptz := now();
            v_person_id uuid := NULLIF(current_setting('app.person_id', true), '')::uuid;
        BEGIN
            IF v_person_id IS NULL OR p_session_id IS NULL THEN
                RETURN;
            END IF;

            RETURN QUERY
            UPDATE public.sessions AS s
            SET last_activity_at = v_now,
                idle_expires_at = LEAST(v_now + interval '60 minutes', s.absolute_expires_at)
            WHERE s.id = p_session_id
              AND s.person_id = v_person_id
              AND s.revoked_at IS NULL
              AND s.idle_expires_at > v_now
              AND s.absolute_expires_at > v_now
              AND EXISTS (
                  SELECT 1 FROM public.people AS p
                  WHERE p.id = s.person_id AND p.disabled_at IS NULL
              )
            RETURNING s.idle_expires_at, s.absolute_expires_at;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.revoke_session(p_session_id uuid)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_person_id uuid := NULLIF(current_setting('app.person_id', true), '')::uuid;
            v_revoked integer := 0;
        BEGIN
            IF v_person_id IS NULL OR p_session_id IS NULL THEN
                RETURN false;
            END IF;

            UPDATE public.sessions AS s
            SET revoked_at = now()
            WHERE s.id = p_session_id
              AND s.person_id = v_person_id
              AND s.revoked_at IS NULL;
            GET DIAGNOSTICS v_revoked = ROW_COUNT;
            RETURN v_revoked > 0;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.revoke_all_person_sessions()
        RETURNS integer
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_person_id uuid := NULLIF(current_setting('app.person_id', true), '')::uuid;
            v_revoked integer := 0;
        BEGIN
            IF v_person_id IS NULL THEN
                RETURN 0;
            END IF;

            UPDATE public.sessions AS s
            SET revoked_at = now()
            WHERE s.person_id = v_person_id
              AND s.revoked_at IS NULL;
            GET DIAGNOSTICS v_revoked = ROW_COUNT;
            RETURN v_revoked;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.purge_expired_sign_in_transactions()
        RETURNS bigint
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_deleted bigint := 0;
        BEGIN
            DELETE FROM public.sign_in_transactions AS tx
            WHERE tx.expires_at < now() - interval '1 day';
            GET DIAGNOSTICS v_deleted = ROW_COUNT;
            RETURN v_deleted;
        END;
        $fn$
    """)

    op.execute("""
        CREATE FUNCTION public.purge_ended_sessions()
        RETURNS bigint
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, pg_temp
        AS $fn$
        DECLARE
            v_deleted bigint := 0;
        BEGIN
            DELETE FROM public.sessions AS s
            WHERE LEAST(
                COALESCE(s.revoked_at, s.absolute_expires_at),
                s.idle_expires_at,
                s.absolute_expires_at
            ) < now() - interval '30 days'
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.sign_in_transactions AS tx
                  WHERE tx.initiating_session_id = s.id
              );
            GET DIAGNOSTICS v_deleted = ROW_COUNT;
            RETURN v_deleted;
        END;
        $fn$
    """)

    app_routines = (
        (
            "public.create_sign_in_transaction("
            "bytea, bytea, text, text, text, text, text, text, uuid, uuid, uuid, integer)"
        ),
        "public.consume_sign_in_transaction(bytea, bytea[], text, text)",
        "public.lookup_sign_in_identity(text, text)",
        "public.create_session(bytea, uuid, uuid, text, text, text)",
        "public.lookup_session(bytea)",
        "public.touch_session_activity(bytea)",
        "public.extend_session(uuid)",
        "public.revoke_session(uuid)",
        "public.revoke_all_person_sessions()",
    )
    purge_routines = (
        "public.purge_expired_sign_in_transactions()",
        "public.purge_ended_sessions()",
    )

    for routine in (*app_routines, *purge_routines):
        op.execute(f"REVOKE ALL ON FUNCTION {routine} FROM PUBLIC")
    for routine in app_routines:
        op.execute(f"GRANT EXECUTE ON FUNCTION {routine} TO roadmaps_app")
    for routine in purge_routines:
        op.execute(f"GRANT EXECUTE ON FUNCTION {routine} TO roadmaps_purge")

    # Transfer ownership to roadmaps_auth_definer and immediately revoke temporary schema CREATE.
    op.execute("GRANT CREATE ON SCHEMA public TO roadmaps_auth_definer")
    for routine in (*app_routines, *purge_routines):
        op.execute(f"ALTER FUNCTION {routine} OWNER TO roadmaps_auth_definer")
    op.execute("REVOKE CREATE ON SCHEMA public FROM roadmaps_auth_definer")


def upgrade() -> None:
    _create_auth_tables()
    _enable_rls_and_policies()
    _grant_table_privileges()
    _create_auth_definer_routines()


def downgrade() -> None:
    raise UpgradeOnlyError
