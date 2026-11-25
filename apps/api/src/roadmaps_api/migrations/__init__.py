"""The Alembic migrations, in the package so the image carries them (STY-091 D9).

Revisions upgrade only and are numbered in one line, `0001_<slug>`, the revision ID
being the file's name (`tools/revisions.py` checks both). Each runs as the owner role
and grants the application's role exactly what it needs on each object it creates.
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Final, Self

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import Connection

MIGRATIONS_DIR: Final = Path(__file__).parent
# Four digits, then a slug of lower-case words joined by underscores.
# ASCII digits only: `\d` takes any script's.
REVISION: Final = re.compile(r"(?P<number>[0-9]{4})_[a-z0-9]+(?:_[a-z0-9]+)*")
# The length of `alembic_version.version_num`, Alembic's `VARCHAR(32)`.
REVISION_MAX_LENGTH: Final = 32


class UpgradeOnlyError(Exception):
    """A revision's downgrade, which never runs (STY-091 D6)."""

    def __init__(self) -> None:
        super().__init__(
            "Revisions upgrade only: fix a bad revision with a new one; where the API is "
            "hosted, recovery is a restore."
        )


@dataclass(frozen=True)
class Revision:
    """A revision of the form `NNNN_<slug>`, as `alembic_version` holds it."""

    number: int
    name: str

    @classmethod
    def parse(cls, name: str) -> Self | None:
        """The revision, or None for a value of another form or too long to store."""
        match = REVISION.fullmatch(name)
        if match is None or len(name) > REVISION_MAX_LENGTH:
            return None
        return cls(number=int(match["number"]), name=name)


def scripts() -> ScriptDirectory:
    return ScriptDirectory(str(MIGRATIONS_DIR))


def latest_revision() -> Revision:
    """The code's latest revision; raises `ValueError` unless there is one, so formed."""
    [head] = scripts().get_heads()
    latest = Revision.parse(head)
    if latest is None:
        msg = "The latest revision is not of the form NNNN_<slug>."
        raise ValueError(msg)
    return latest


def alembic_config(connection: Connection | None = None) -> Config:
    """Alembic's configuration for the package's migrations, run on the connection.

    Without one, the migration environment connects to `ROADMAPS_MIGRATION_DATABASE_URL`,
    as Alembic's own command line does, configured from `apps/api/pyproject.toml`.
    """
    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    config.attributes["connection"] = connection
    return config
