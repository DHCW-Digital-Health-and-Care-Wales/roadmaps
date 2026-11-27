"""Shared local-only superuser guards and replica-mode table truncation for dev tooling.

Used by `tools.bootstrap_database`, `tools.seed` and `tests.harness` so URL validation,
superuser verification and `TRUNCATE ... CASCADE` teardown stay in one place.
"""

import ipaddress
from collections.abc import Callable, Mapping, Sequence
from typing import Final

from sqlalchemy import Connection, text
from sqlalchemy.engine import make_url

from roadmaps_api.settings import CLOUD_RUN_MARKERS, ENV, Environment, is_database_url, refuse

ADMIN_DATABASE_URL: Final = "ROADMAPS_ADMIN_DATABASE_URL"
LOCAL_ENVIRONMENTS: Final = frozenset({Environment.LOCAL.value, Environment.TEST.value})
VERSION_TABLE: Final = "alembic_version"

SUPERUSER_QUERY: Final = "SELECT rolsuper FROM pg_roles WHERE rolname = current_user"
PUBLIC_TABLES_QUERY: Final = (
    "SELECT tablename FROM pg_tables"
    " WHERE schemaname = 'public' AND tablename <> %s"
    " ORDER BY tablename"
)
_PUBLIC_TABLES_SA = text(
    "SELECT tablename FROM pg_tables"
    " WHERE schemaname = 'public' AND tablename <> :version_table"
    " ORDER BY tablename"
)


def loopback_host(url: str) -> str | None:
    """Returns the literal loopback IP host for a query-free psycopg URL, else `None`."""
    if not is_database_url(url):
        return None
    parsed = make_url(url)
    # No query parameters: libpq could otherwise override host, hostaddr or service.
    if parsed.query or parsed.host is None:
        return None
    try:
        if not ipaddress.ip_address(parsed.host).is_loopback:
            return None
    except ValueError:
        return None
    return parsed.host


def invalid_local_env(environ: Mapping[str, str], *, reject_cloud_run: bool = False) -> list[str]:
    """Returns disallowed environment or Cloud Run marker names, never their values."""
    invalid: list[str] = []
    if environ.get(ENV) not in LOCAL_ENVIRONMENTS:
        invalid.append(ENV)
    if reject_cloud_run:
        invalid.extend(marker for marker in CLOUD_RUN_MARKERS if marker in environ)
    return invalid


def validated_local_admin_url(environ: Mapping[str, str], *, reject_cloud_run: bool = False) -> str:
    """Validates local environment and loopback admin URL, or refuses naming only setting names."""
    invalid = invalid_local_env(environ, reject_cloud_run=reject_cloud_run)
    url = environ.get(ADMIN_DATABASE_URL, "").strip()
    if loopback_host(url) is None:
        invalid.append(ADMIN_DATABASE_URL)
    if invalid:
        refuse(invalid)
    return url


def truncate_public_tables_sql(tables: Sequence[str], quote: Callable[[str], str]) -> str:
    """Builds `TRUNCATE public.<table>, ... CASCADE` with dialect-quoted identifiers."""
    targets = ", ".join(f"public.{quote(table)}" for table in tables)
    return f"TRUNCATE {targets} CASCADE"


def truncate_public_tables(connection: Connection) -> None:
    """Truncates every `public` table except `alembic_version`, then restores `'origin'` mode."""
    tables = list(connection.execute(_PUBLIC_TABLES_SA, {"version_table": VERSION_TABLE}).scalars())
    if not tables:
        return
    statement = truncate_public_tables_sql(tables, connection.dialect.identifier_preparer.quote)
    # Replica mode is scoped strictly to teardown so immutable history tables can be cleared;
    # origin mode is restored immediately before any write.
    connection.execute(text("SET LOCAL session_replication_role = 'replica'"))
    connection.execute(text(statement))
    connection.execute(text("SET LOCAL session_replication_role = 'origin'"))
