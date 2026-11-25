"""The application's role reads the revision, as `/ready` does (STY-091 S2, D28).

`alembic_version` is the one table without row-level security: it holds one revision and
no tenant's data, and only the owner role, which owns it, writes it.
"""

from collections.abc import Sequence

from alembic import op

from roadmaps_api.migrations import UpgradeOnlyError

revision: str = "0001_app_reads_alembic_version"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("GRANT SELECT ON alembic_version TO roadmaps_app")


def downgrade() -> None:
    raise UpgradeOnlyError
