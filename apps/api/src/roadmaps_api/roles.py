"""ADR-015's database roles, which `bootstrap.sql` makes (STY-091, STY-103).

The owner role owns the database, schema `public` and every table, view and sequence a
migration creates. Four mutually exclusive caller roles hold runtime grants: a login of
the migration role switches to the owner to migrate; logins of the application, platform
and purge roles run the API, platform operator jobs and retention purge jobs. Three
dedicated definer owner roles own only their reviewed `SECURITY DEFINER` routines in
`public` (never `roadmaps_owner`). All eight are no-login roles: each login is a member
of exactly one caller role.
"""

from importlib.resources import files
from typing import Final

OWNER_ROLE: Final = "roadmaps_owner"
MIGRATION_ROLE: Final = "roadmaps_migrator"
APP_ROLE: Final = "roadmaps_app"
PLATFORM_ROLE: Final = "roadmaps_platform"
PURGE_ROLE: Final = "roadmaps_purge"
AUTH_DEFINER_ROLE: Final = "roadmaps_auth_definer"
HISTORY_DEFINER_ROLE: Final = "roadmaps_history_definer"
PLATFORM_DEFINER_ROLE: Final = "roadmaps_platform_definer"

CALLER_ROLES: Final = (MIGRATION_ROLE, APP_ROLE, PLATFORM_ROLE, PURGE_ROLE)
DEFINER_ROLES: Final = (AUTH_DEFINER_ROLE, HISTORY_DEFINER_ROLE, PLATFORM_DEFINER_ROLE)
ALL_ROLES: Final = (OWNER_ROLE, *CALLER_ROLES, *DEFINER_ROLES)
# Roles Cloud SQL gives an IAM login, which `/ready` admits beside the application's
# while they hold no attribute and own nothing (STY-091 D34).
CLOUD_SQL_IAM_ROLES: Final = ("cloudsqliamuser", "cloudsqliamserviceaccount")

# The line where the bootstrap's database-scoped part starts, which a database cloned
# from a template needs again, since a clone takes no database-level privilege.
DATABASE_SCOPED_MARKER: Final = "-- roadmaps:database-scoped\n"


def bootstrap_sql() -> str:
    """The bootstrap file, which EPC-023 also runs where the API is hosted."""
    return (files(__package__) / "bootstrap.sql").read_text(encoding="utf-8")


def database_scoped_sql() -> str:
    """The bootstrap's part for one database, from the file itself."""
    _, marker, scoped = bootstrap_sql().partition(DATABASE_SCOPED_MARKER)
    if not marker:
        msg = f"bootstrap.sql has no line {DATABASE_SCOPED_MARKER.strip()!r}."
        raise ValueError(msg)
    return marker + scoped
