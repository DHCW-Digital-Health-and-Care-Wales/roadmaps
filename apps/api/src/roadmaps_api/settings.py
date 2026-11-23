"""The API's settings, read from environment variables only and failing closed.

No `.env` file is read, so no file in a checkout can switch an environment to local
(ADR-017 _Operation_). An unset `ROADMAPS_ENV` gets production's rules.
"""

import logging
import os
from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from typing import Final

logger = logging.getLogger(__name__)

ENV: Final = "ROADMAPS_ENV"
DATABASE_URL: Final = "ROADMAPS_DATABASE_URL"
ALLOWED_HOSTS: Final = "ROADMAPS_ALLOWED_HOSTS"

DATABASE_URL_SCHEME: Final = "postgresql+psycopg://"
# ADR-020's request body limit, one value for every route.
MAX_BODY_BYTES: Final = 1024 * 1024


class Environment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    PRODUCTION = "production"


@dataclass(frozen=True, kw_only=True)
class Settings:
    environment: Environment
    database_url: str
    # Host names without a port; `*` and `*.example` forms only in a local environment.
    allowed_hosts: tuple[str, ...]
    max_body_bytes: int = MAX_BODY_BYTES

    @property
    def serves_live_openapi(self) -> bool:
        """Only a local API serves its live OpenAPI JSON; none serves a docs page."""
        return self.environment is Environment.LOCAL


class SettingsError(Exception):
    """Names each bad setting, never its value."""

    def __init__(self, invalid: list[str]) -> None:
        self.invalid = invalid
        super().__init__("Invalid settings: " + ", ".join(invalid))


def load_settings(environ: Mapping[str, str] | None = None) -> Settings:
    """Reads the settings, or logs and raises `SettingsError` naming each bad one."""
    environ = os.environ if environ is None else environ
    invalid: list[str] = []

    raw_environment = environ.get(ENV)
    environment = Environment.PRODUCTION
    if raw_environment is not None:
        try:
            environment = Environment(raw_environment)
        except ValueError:
            invalid.append(ENV)

    database_url = environ.get(DATABASE_URL, "").strip()
    if not database_url.startswith(DATABASE_URL_SCHEME):
        invalid.append(DATABASE_URL)

    hosts = tuple(host.strip().lower() for host in environ.get(ALLOWED_HOSTS, "").split(","))
    wildcard_refused = environment is not Environment.LOCAL and any("*" in host for host in hosts)
    if not all(hosts) or wildcard_refused:
        invalid.append(ALLOWED_HOSTS)

    if invalid:
        logger.error("settings.invalid", extra={"invalid_settings": invalid})
        raise SettingsError(invalid)
    return Settings(environment=environment, database_url=database_url, allowed_hosts=hosts)
