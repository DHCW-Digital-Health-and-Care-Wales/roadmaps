"""${message}

Revisions upgrade only (STY-091 D6). Grant the application's role exactly what it needs
on each object this revision creates, routines included: no default grant exists.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
${imports if imports else ""}
from roadmaps_api.migrations import UpgradeOnlyError

revision: str = ${repr(up_revision)}
down_revision: str | None = ${repr(down_revision)}
branch_labels: str | Sequence[str] | None = ${repr(branch_labels)}
depends_on: str | Sequence[str] | None = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    raise UpgradeOnlyError
