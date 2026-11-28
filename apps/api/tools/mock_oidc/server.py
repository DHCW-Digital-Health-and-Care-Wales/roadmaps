"""Loopback-only runner for the local mock OIDC provider (ADR-018, STY-106 S4, D5)."""

import argparse
import os
from collections.abc import Mapping, Sequence
from typing import Final

import uvicorn

from roadmaps_api.settings import CLOUD_RUN_MARKERS, ENV, Environment, SettingsError, refuse
from tools.mock_oidc.app import create_mock_oidc_app

LOOPBACK_HOST: Final = "127.0.0.1"
DEFAULT_OIDC_PORT: Final = 8001
ALLOWED_MOCK_ENVIRONMENTS: Final = frozenset({Environment.LOCAL.value, Environment.TEST.value})


def validate_mock_environment(environ: Mapping[str, str]) -> None:
    """Refuses to run outside `local`/`test` or when any Cloud Run marker is present."""
    invalid: list[str] = []
    if environ.get(ENV) not in ALLOWED_MOCK_ENVIRONMENTS:
        invalid.append(ENV)
    invalid.extend(marker for marker in CLOUD_RUN_MARKERS if marker in environ)
    if invalid:
        refuse(invalid)


def main(
    argv: Sequence[str] | None = None,
    environ: Mapping[str, str] | None = None,
) -> int:
    env = os.environ if environ is None else environ
    try:
        validate_mock_environment(env)
    except SettingsError:
        return 1
    parser = argparse.ArgumentParser(prog="mock_oidc")
    parser.add_argument("--port", type=int, default=DEFAULT_OIDC_PORT)
    args = parser.parse_args(argv)
    app = create_mock_oidc_app(base_url=f"http://{LOOPBACK_HOST}:{args.port}")
    uvicorn.run(app, host=LOOPBACK_HOST, port=args.port, log_level="warning")
    return 0
