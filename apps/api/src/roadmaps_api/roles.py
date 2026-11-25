"""ADR-015's database roles, which `bootstrap.sql` makes (STY-091).

The owner role owns the database, and so schema `public` and every object a migration
creates. A login of the migration role switches to it to migrate; a login of the
application's role is the API's. All three are no-login roles: each login is a member
of exactly one of the last two.
"""

from importlib.resources import files
from typing import Final

OWNER_ROLE: Final = "roadmaps_owner"
MIGRATION_ROLE: Final = "roadmaps_migrator"
APP_ROLE: Final = "roadmaps_app"
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
    return marker + scoped
