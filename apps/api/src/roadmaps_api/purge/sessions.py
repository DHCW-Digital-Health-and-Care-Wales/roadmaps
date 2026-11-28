"""CLI entrypoint `roadmaps-purge-sessions` (> 30 days past ended time, STY-106 D15)."""

import sys
from collections.abc import Mapping, Sequence
from typing import Final

from sqlalchemy import text

from roadmaps_api.purge.runner import run_purge

_PURGE_SQL: Final = text("SELECT public.purge_ended_sessions()")


def main(
    argv: Sequence[str] | None = None,
    environ: Mapping[str, str] | None = None,
) -> int:
    return run_purge(
        table="sessions",
        statement=_PURGE_SQL,
        argv=argv,
        environ=environ,
    )


if __name__ == "__main__":  # pragma: no cover - console script entrypoint
    sys.exit(main())
