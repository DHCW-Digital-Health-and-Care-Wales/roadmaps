"""The API's settings, read from environment variables only and failing closed.

No `.env` file is read, so no file in a checkout can switch an environment to local
(ADR-017 _Operation_). An unset `ROADMAPS_ENV` gets production's rules. Beside the
`ROADMAPS_*` variables, OpenTelemetry's own `OTEL_EXPORTER_OTLP_ENDPOINT` names where
traces go: unset, they go nowhere, in every environment (STY-100 D11). It is the one
OpenTelemetry variable that decides whether spans are exported (`tracing`).
"""

import logging
import os
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Final, NoReturn
from urllib.parse import urlsplit

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

logger = logging.getLogger(__name__)

ENV: Final = "ROADMAPS_ENV"
DATABASE_URL: Final = "ROADMAPS_DATABASE_URL"
ALLOWED_HOSTS: Final = "ROADMAPS_ALLOWED_HOSTS"
# Only the migration tooling reads it (`migration_url`): an API process that holds it
# refuses to start, in every environment, so no server holds the migration login
# (STY-091 D31).
MIGRATION_DATABASE_URL: Final = "ROADMAPS_MIGRATION_DATABASE_URL"
# The base URL of an OTLP/HTTP receiver, Jaeger's locally (`pnpm api:dev`).
OTLP_ENDPOINT: Final = "OTEL_EXPORTER_OTLP_ENDPOINT"
# The service its traces are filed under: `roadmaps-api-<slot>` in a worktree.
SERVICE_NAME: Final = "ROADMAPS_SERVICE_NAME"
DEFAULT_SERVICE_NAME: Final = "roadmaps-api"
_SERVICE_NAME_FORM = re.compile(r"[a-z0-9-]{1,63}")

# Set by Cloud Run in a service, a job and a worker pool: a local environment there still
# writes no message to the log (ADR-018 _Records and retention_).
CLOUD_RUN_MARKERS: Final = ("K_SERVICE", "CLOUD_RUN_JOB", "CLOUD_RUN_WORKER_POOL")

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
    # Out of the repr, so it never reaches an error's text.
    database_url: str = field(repr=False)
    # Host names without a port, never a wildcard.
    allowed_hosts: tuple[str, ...]
    max_body_bytes: int = MAX_BODY_BYTES
    # Whether log lines carry an exception's and a third party's message: only a
    # developer's own machine, never test, production or Cloud Run (ADR-018).
    writes_messages: bool = False
    # Where traces are exported, if anywhere; out of the repr, since a URL can hold a
    # credential.
    otlp_endpoint: str | None = field(default=None, repr=False)
    service_name: str = DEFAULT_SERVICE_NAME

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
    if not is_database_url(database_url):
        invalid.append(DATABASE_URL)

    if MIGRATION_DATABASE_URL in environ:
        invalid.append(MIGRATION_DATABASE_URL)

    hosts = tuple(host.strip().lower() for host in environ.get(ALLOWED_HOSTS, "").split(","))
    if not all(hosts) or any("*" in host for host in hosts):
        invalid.append(ALLOWED_HOSTS)

    # Empty is unset, as OpenTelemetry reads it; checked before its trailing slash goes.
    otlp_endpoint = environ.get(OTLP_ENDPOINT, "").strip() or None
    if otlp_endpoint is not None and not is_http_url(otlp_endpoint):
        invalid.append(OTLP_ENDPOINT)

    service_name = environ.get(SERVICE_NAME, DEFAULT_SERVICE_NAME)
    if not _SERVICE_NAME_FORM.fullmatch(service_name):
        invalid.append(SERVICE_NAME)

    if invalid:
        refuse(invalid)
    on_cloud_run = any(marker in environ for marker in CLOUD_RUN_MARKERS)
    return Settings(
        environment=environment,
        database_url=database_url,
        allowed_hosts=hosts,
        writes_messages=environment is Environment.LOCAL and not on_cloud_run,
        otlp_endpoint=otlp_endpoint.removesuffix("/") if otlp_endpoint else None,
        service_name=service_name,
    )


def migration_url(environ: Mapping[str, str]) -> str:
    """The migration login's URL, for `roadmaps_api.migrate` and Alembic's command line."""
    url = environ.get(MIGRATION_DATABASE_URL, "").strip()
    if not is_database_url(url):
        refuse([MIGRATION_DATABASE_URL])
    return url


def refuse(invalid: list[str]) -> NoReturn:
    """Logs each bad setting's name, never its value, and raises `SettingsError`."""
    logger.error("settings.invalid", extra={"invalid_settings": invalid})
    raise SettingsError(invalid)


def is_database_url(url: str) -> bool:
    """A psycopg URL SQLAlchemy can parse, so the engine never fails on it with its text."""
    if not url.startswith(DATABASE_URL_SCHEME):
        return False
    try:
        make_url(url)
    except ArgumentError, ValueError:
        return False
    return True


def is_http_url(url: str) -> bool:
    """An absolute HTTP or HTTPS URL with a host and, if any, a numeric port."""
    try:
        parts = urlsplit(url)
        _ = parts.port
    except ValueError:
        return False
    return parts.scheme in {"http", "https"} and bool(parts.hostname)
