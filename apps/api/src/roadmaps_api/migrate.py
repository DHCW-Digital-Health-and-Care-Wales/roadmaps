"""Brings the database to the code's latest revision: `python -m roadmaps_api.migrate`.

`pnpm api:migrate` and `pnpm api:dev` run it locally, and each deploy where the API is
hosted runs it before the new version takes traffic (EPC-023), never the API at
start-up. It connects as a login of the migration role, from
`ROADMAPS_MIGRATION_DATABASE_URL`, which only the migration tooling reads (STY-091 D22,
D31).
"""

import logging
import logging.config
import os
import sys
from collections.abc import Mapping
from typing import Final

from alembic import command
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from roadmaps_api.logs import log_config
from roadmaps_api.migrations import alembic_config
from roadmaps_api.settings import SettingsError, migration_url

# Named, since `python -m` runs this module as __main__.
logger = logging.getLogger("roadmaps_api.migrate")

LATEST: Final = "head"


def upgrade(url: str) -> None:
    """Runs every revision the database lacks, in one transaction."""
    engine = create_engine(url, poolclass=NullPool, hide_parameters=True)
    try:
        with engine.connect() as connection:
            command.upgrade(alembic_config(connection), LATEST)
            connection.commit()
    finally:
        engine.dispose()


def main(environ: Mapping[str, str] | None = None) -> int:
    # No line holds a message: there are no settings to allow it.
    logging.config.dictConfig(log_config())
    # Alembic's information lines would hold only a time and a logger.
    logging.getLogger("alembic").setLevel(logging.WARNING)
    try:
        upgrade(migration_url(os.environ if environ is None else environ))
    except SettingsError:
        # migration_url has logged the setting's name.
        return 1
    except Exception:
        logger.exception("migrate.failed")
        return 1
    logger.info("migrate.done")
    return 0


if __name__ == "__main__":
    sys.exit(main())
