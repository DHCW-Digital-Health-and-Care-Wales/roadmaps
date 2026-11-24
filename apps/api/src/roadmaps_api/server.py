"""Runs the API under uvicorn, as `pnpm api:dev` does: `python -m roadmaps_api.server`.

The settings come from the environment `apps/api/scripts/api.sh` sets from the slot.
"""

import argparse
import logging.config
import sys
from typing import Final

import uvicorn

from roadmaps_api.logs import LOG_CONFIG
from roadmaps_api.settings import SettingsError, load_settings

APP: Final = "roadmaps_api.app:factory"


def serve(*, port: int, reload: bool, app: str = APP) -> None:
    uvicorn.run(
        app,
        factory=True,
        host="127.0.0.1",
        port=port,
        reload=reload,
        log_config=LOG_CONFIG,
        # The API writes its own access line, without the query string or the address.
        access_log=False,
        # The Host header is the only one read (ADR-020).
        proxy_headers=False,
        server_header=False,
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m roadmaps_api.server")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args(argv)
    logging.config.dictConfig(LOG_CONFIG)
    # Checked before uvicorn starts too, so bad settings end the command, not only a
    # reload worker the reloader would wait on.
    try:
        load_settings()
    except SettingsError:
        # load_settings has logged each bad setting's name.
        sys.exit(1)
    serve(port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
