"""Runs the API under uvicorn, as `pnpm api:dev` does: `python -m roadmaps_api.server`.

The settings come from the environment `apps/api/scripts/api.sh` sets from the slot.
With `--local-traces`, as `pnpm api:dev` runs it, traces go to the shared local Jaeger
if it answers when the API starts (`pnpm api:jaeger`), unless an OTLP endpoint is set.
"""

import argparse
import logging
import logging.config
import os
import socket
import sys
from typing import Final

import uvicorn

from roadmaps_api.logs import log_config
from roadmaps_api.settings import OTLP_ENDPOINT, Settings, SettingsError, load_settings

# By name: run with `python -m`, the module is `__main__`, whose lines hold no message.
logger = logging.getLogger("roadmaps_api.server")

APP: Final = "roadmaps_api.app:factory"
# The OTLP/HTTP port of the Jaeger every worktree shares (apps/api/jaeger/compose.yaml).
JAEGER_OTLP_ADDRESS: tuple[str, int] = ("127.0.0.1", 4318)
JAEGER_CHECK_SECONDS: Final = 0.5


def serve(*, port: int, reload: bool, settings: Settings, app: str = APP) -> None:
    uvicorn.run(
        app,
        factory=True,
        host="127.0.0.1",
        port=port,
        reload=reload,
        log_config=log_config(settings),
        # The API writes its own access line, without the query string or the address.
        access_log=False,
        # The Host header is the only one read (ADR-020).
        proxy_headers=False,
        server_header=False,
    )


def use_local_jaeger() -> None:
    """Points traces at the local Jaeger if it answers now, unless an endpoint is set.

    Checked once: a Jaeger started later is used once the API restarts. The variable
    reaches the reload worker, which reads its settings from the environment.
    """
    if os.environ.get(OTLP_ENDPOINT, "").strip():
        return
    try:
        socket.create_connection(JAEGER_OTLP_ADDRESS, timeout=JAEGER_CHECK_SECONDS).close()
    except OSError:
        logger.info("tracing.off")
        return
    host, port = JAEGER_OTLP_ADDRESS
    os.environ[OTLP_ENDPOINT] = f"http://{host}:{port}"
    logger.info("tracing.to_jaeger")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m roadmaps_api.server")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--reload", action="store_true")
    parser.add_argument("--local-traces", action="store_true")
    args = parser.parse_args(argv)
    # Before the settings are read, no line holds a message.
    logging.config.dictConfig(log_config())
    if args.local_traces:
        use_local_jaeger()
    # Checked before uvicorn starts too, so bad settings end the command, not only a
    # reload worker the reloader would wait on.
    try:
        settings = load_settings()
    except SettingsError:
        # load_settings has logged each bad setting's name.
        sys.exit(1)
    serve(port=args.port, reload=args.reload, settings=settings)


if __name__ == "__main__":
    main()
