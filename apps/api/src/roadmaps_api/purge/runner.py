"""Shared fail-closed runner for single-purpose retention purge CLIs (STY-106 D15).

Each purge console script takes no arguments, validates `ROADMAPS_PURGE_DATABASE_URL`,
refuses any unexpected `ROADMAPS_*` environment variable (including `ROADMAPS_DATABASE_URL`
and `ROADMAPS_MIGRATION_DATABASE_URL`), executes one `roadmaps_auth_definer` retention
function under `roadmaps_purge`, and logs only allow-listed JSON fields.
"""

import logging
import logging.config
import os
import sys
from collections.abc import Mapping, Sequence

from sqlalchemy import TextClause

from roadmaps_api.database import create_database_engine
from roadmaps_api.logs import log_config
from roadmaps_api.settings import PURGE_DATABASE_URL, SettingsError, is_database_url, refuse

logger = logging.getLogger("roadmaps_api.purge")


def _validated_purge_url(environ: Mapping[str, str]) -> str:
    invalid: list[str] = []
    unexpected = sorted(
        key for key in environ if key.startswith("ROADMAPS_") and key != PURGE_DATABASE_URL
    )
    invalid.extend(unexpected)
    url = environ.get(PURGE_DATABASE_URL, "").strip()
    if not is_database_url(url):
        invalid.append(PURGE_DATABASE_URL)
    if invalid:
        refuse(invalid)
    return url


def run_purge(
    *,
    table: str,
    statement: TextClause,
    argv: Sequence[str] | None = None,
    environ: Mapping[str, str] | None = None,
) -> int:
    """Runs a zero-argument retention purge definer and returns a process exit code."""
    logging.config.dictConfig(log_config(None))
    args = sys.argv[1:] if argv is None else list(argv)
    if args:
        logger.error("purge.invalid_args", extra={"table": table})
        return 2
    env = os.environ if environ is None else environ
    try:
        url = _validated_purge_url(env)
    except SettingsError:
        return 1

    engine = create_database_engine(url)
    try:
        with engine.begin() as connection:
            deleted_count = int(connection.execute(statement).scalar_one())
    except Exception:
        logger.exception("purge.failed", extra={"table": table})
        return 1
    finally:
        engine.dispose()

    logger.info("purge.done", extra={"table": table, "deleted_count": deleted_count})
    return 0
