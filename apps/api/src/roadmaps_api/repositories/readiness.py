from collections.abc import Sequence
from typing import Final

from sqlalchemy import text
from sqlalchemy.orm import Session

from roadmaps_api.database import TIMEOUT_SECONDS

# Whether the session's login holds the application's role and nothing more (STY-091 S8):
# a member, directly or through another role and under any option, of no role but the
# application's, held without ADMIN, and those also admitted; and neither the login nor
# any role it is a member of has a role attribute that passes row-level security or
# administers roles or databases, owns an object, or may create on the database or on
# any schema, or create a temporary table.
LOGIN_IS_SAFE: Final = text("""
WITH RECURSIVE held (roleid, admin_option) AS (
    SELECT roleid, admin_option FROM pg_auth_members WHERE member = session_user::regrole
    UNION
    SELECT member.roleid, member.admin_option
    FROM pg_auth_members AS member JOIN held ON member.member = held.roleid
),
roles AS (
    SELECT session_user::regrole::oid AS oid
    UNION
    SELECT roleid FROM held
)
SELECT
    EXISTS (
        SELECT FROM held WHERE roleid = to_regrole(:app_role)
    )
    AND NOT EXISTS (
        SELECT FROM held JOIN pg_roles ON pg_roles.oid = held.roleid
        WHERE rolname <> ALL (CAST(:admitted AS text[]))
            OR (rolname = :app_role AND held.admin_option)
    )
    AND NOT EXISTS (
        SELECT FROM pg_roles JOIN roles USING (oid)
        WHERE rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication
    )
    AND NOT EXISTS (
        SELECT FROM pg_shdepend JOIN roles ON pg_shdepend.refobjid = roles.oid
        WHERE refclassid = 'pg_authid'::regclass AND deptype = 'o'
    )
    AND NOT EXISTS (
        SELECT FROM roles
        WHERE has_database_privilege(oid, current_database(), 'CREATE')
            OR has_database_privilege(oid, current_database(), 'TEMPORARY')
    )
    AND NOT EXISTS (
        SELECT FROM roles CROSS JOIN pg_namespace
        WHERE has_schema_privilege(roles.oid, pg_namespace.oid, 'CREATE')
    )
""")


class ReadinessRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def limit_statement_time(self) -> None:
        """Has the database cancel each later statement after about two seconds."""
        self._session.execute(
            text("SELECT set_config('statement_timeout', :timeout, true)"),
            {"timeout": f"{TIMEOUT_SECONDS}s"},
        )

    def login_is_safe(self, app_role: str, also_admitted: Sequence[str]) -> bool:
        """Whether the login holds the application's role and nothing more."""
        safe = self._session.execute(
            LOGIN_IS_SAFE, {"app_role": app_role, "admitted": [app_role, *also_admitted]}
        ).scalar_one()
        return bool(safe)

    def revisions(self) -> list[str] | None:
        """The rows of `alembic_version`, or None when the table does not exist."""
        exists = self._session.execute(
            text("SELECT to_regclass('public.alembic_version') IS NOT NULL")
        ).scalar_one()
        if not exists:
            return None
        rows = self._session.execute(text("SELECT version_num FROM public.alembic_version"))
        return list(rows.scalars())
