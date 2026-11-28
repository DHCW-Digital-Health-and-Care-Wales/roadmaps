"""The API's settings, read from environment variables only and failing closed.

No `.env` file is read, so no file in a checkout can switch an environment to local
(ADR-017 _Operation_). An unset `ROADMAPS_ENV` gets production's rules. Beside the
`ROADMAPS_*` variables, OpenTelemetry's own `OTEL_EXPORTER_OTLP_ENDPOINT` names where
traces go: unset, they go nowhere, in every environment (STY-100 D11). It is the one
OpenTelemetry variable that decides whether spans are exported (`tracing`).
"""

import ipaddress
import logging
import os
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Final, NamedTuple, NoReturn
from urllib.parse import urlsplit
from uuid import UUID

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

logger = logging.getLogger(__name__)

ENV: Final = "ROADMAPS_ENV"
DATABASE_URL: Final = "ROADMAPS_DATABASE_URL"
ALLOWED_HOSTS: Final = "ROADMAPS_ALLOWED_HOSTS"
EDITOR_ORIGIN: Final = "ROADMAPS_EDITOR_ORIGIN"
# Only the migration tooling reads it (`migration_url`): an API process that holds it
# refuses to start, in every environment, so no server holds the migration login
# (STY-091 D31).
MIGRATION_DATABASE_URL: Final = "ROADMAPS_MIGRATION_DATABASE_URL"
# Only the retention purge CLIs read it (`purge.runner`): an API process that holds it
# refuses to start, in every environment (STY-106 D15).
PURGE_DATABASE_URL: Final = "ROADMAPS_PURGE_DATABASE_URL"
# Google Workspace OIDC settings: required in production/unset/invalid/Cloud Run,
# all-or-nothing optional in local and test (STY-106 D8).
GOOGLE_CLIENT_ID: Final = "ROADMAPS_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET: Final = "ROADMAPS_GOOGLE_CLIENT_SECRET"  # noqa: S105 - env var name
GOOGLE_ALLOWED_HD: Final = "ROADMAPS_GOOGLE_ALLOWED_HD"
# Local loopback mock OIDC provider URL: strictly refused outside local/test or on Cloud Run
# (ADR-018, STY-106 S4, D5, D8).
LOCAL_MOCK_OIDC_URL: Final = "ROADMAPS_LOCAL_MOCK_OIDC_URL"
# The base URL of an OTLP/HTTP receiver, Jaeger's locally (`pnpm api:dev`).
OTLP_ENDPOINT: Final = "OTEL_EXPORTER_OTLP_ENDPOINT"
# The service its traces are filed under: `roadmaps-api-<slot>` in a worktree.
SERVICE_NAME: Final = "ROADMAPS_SERVICE_NAME"
DEFAULT_SERVICE_NAME: Final = "roadmaps-api"
_SERVICE_NAME_FORM = re.compile(r"[a-z0-9-]{1,63}")
_DOMAIN_FORM = re.compile(
    r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$"
)
_DEFAULT_PORTS: Final = {"http": 80, "https": 443}
_ASCII_SPACE: Final = 0x20

# Set by Cloud Run in a service, a job and a worker pool: a local environment there still
# writes no message to the log and refuses local mock OIDC (ADR-018, STY-106 S4).
CLOUD_RUN_MARKERS: Final = ("K_SERVICE", "CLOUD_RUN_JOB", "CLOUD_RUN_WORKER_POOL")

DATABASE_URL_SCHEME: Final = "postgresql+psycopg://"
# ADR-020's request body limit, one value for every route.
MAX_BODY_BYTES: Final = 1024 * 1024


class Environment(StrEnum):
    LOCAL = "local"
    TEST = "test"
    PRODUCTION = "production"


class ParsedOrigin(NamedTuple):
    """Canonicalised bare origin (`scheme://host[:port]`) split for policy checks."""

    scheme: str
    host: str
    canonical: str
    effective_port: int


@dataclass(frozen=True, kw_only=True)
class Settings:
    environment: Environment
    # Out of the repr, so it never reaches an error's text.
    database_url: str = field(repr=False)
    # Host names without a port, never a wildcard.
    allowed_hosts: tuple[str, ...]
    # Canonical `scheme://host[:port]` origin of the editor, for same-origin checks (ADR-020).
    editor_origin: str
    max_body_bytes: int = MAX_BODY_BYTES
    # Whether log lines carry an exception's and a third party's message: only a
    # developer's own machine, never test, production or Cloud Run (ADR-018).
    writes_messages: bool = False
    # Where traces are exported, if anywhere; out of the repr, since a URL can hold a
    # credential.
    otlp_endpoint: str | None = field(default=None, repr=False)
    service_name: str = DEFAULT_SERVICE_NAME
    # Google Workspace OIDC configuration (D8).
    google_client_id: str | None = None
    google_client_secret: str | None = field(default=None, repr=False)
    google_allowed_hd: tuple[str, ...] = ()
    # Local loopback mock OIDC provider base URL (D5); None outside local/test.
    local_mock_oidc_url: str | None = None
    on_cloud_run: bool = False

    @property
    def serves_live_openapi(self) -> bool:
        """Only a local API serves its live OpenAPI JSON; none serves a docs page."""
        return self.environment is Environment.LOCAL

    @property
    def _cookie_port_segment(self) -> str:
        if self.environment is not Environment.LOCAL:
            return ""
        parsed = parse_origin(self.editor_origin)
        assert parsed is not None  # noqa: S101 - validated in load_settings
        return f"{parsed.effective_port}-"

    @property
    def session_cookie_name(self) -> str:
        """The `__Host-` session cookie name, carrying the local port in local mode (S1, D6)."""
        return f"__Host-{self._cookie_port_segment}session"

    @property
    def transaction_cookie_prefix(self) -> str:
        """Prefix for per-transaction `__Host-` cookies, carrying the local port in local mode."""
        return f"__Host-{self._cookie_port_segment}tx-"

    def transaction_cookie_name(self, transaction_id: UUID) -> str:
        """Per-transaction `__Host-` cookie name so parallel tabs never collide (ADR-018)."""
        return f"{self.transaction_cookie_prefix}{transaction_id.hex}"


class SettingsError(Exception):
    """Names each bad setting, never its value."""

    def __init__(self, invalid: list[str]) -> None:
        self.invalid = invalid
        super().__init__("Invalid settings: " + ", ".join(invalid))


def _load_google_oidc_settings(
    environ: Mapping[str, str], *, strict_mode: bool, invalid: list[str]
) -> tuple[str | None, str | None, tuple[str, ...]]:
    raw_id = environ.get(GOOGLE_CLIENT_ID, "").strip()
    raw_secret = environ.get(GOOGLE_CLIENT_SECRET, "").strip()
    raw_hd = environ.get(GOOGLE_ALLOWED_HD, "").strip()
    any_google_set = any(
        key in environ for key in (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ALLOWED_HD)
    )
    if not strict_mode and not any_google_set:
        return None, None, ()

    if not raw_id:
        invalid.append(GOOGLE_CLIENT_ID)
    if not raw_secret:
        invalid.append(GOOGLE_CLIENT_SECRET)
    parsed_hd = parse_allowed_hd(raw_hd)
    if parsed_hd is None:
        invalid.append(GOOGLE_ALLOWED_HD)
    return raw_id or None, raw_secret or None, parsed_hd or ()


def _load_local_mock_url(
    environ: Mapping[str, str], *, strict_mode: bool, invalid: list[str]
) -> str | None:
    if LOCAL_MOCK_OIDC_URL not in environ:
        return None
    if strict_mode:
        invalid.append(LOCAL_MOCK_OIDC_URL)
        return None
    raw_mock = environ[LOCAL_MOCK_OIDC_URL].strip()
    if not raw_mock:
        return None
    parsed_mock = parse_loopback_http_origin(raw_mock)
    if parsed_mock is None:
        invalid.append(LOCAL_MOCK_OIDC_URL)
        return None
    return parsed_mock


def _load_environment(environ: Mapping[str, str], invalid: list[str]) -> Environment:
    raw_environment = environ.get(ENV)
    if raw_environment is None:
        return Environment.PRODUCTION
    try:
        return Environment(raw_environment)
    except ValueError:
        invalid.append(ENV)
        return Environment.PRODUCTION


def load_settings(environ: Mapping[str, str] | None = None) -> Settings:
    """Reads the settings, or logs and raises `SettingsError` naming each bad one."""
    environ = os.environ if environ is None else environ
    invalid: list[str] = []

    environment = _load_environment(environ, invalid)

    database_url = environ.get(DATABASE_URL, "").strip()
    if not is_database_url(database_url):
        invalid.append(DATABASE_URL)

    invalid.extend(key for key in (MIGRATION_DATABASE_URL, PURGE_DATABASE_URL) if key in environ)

    hosts = tuple(host.strip().lower() for host in environ.get(ALLOWED_HOSTS, "").split(","))
    hosts_valid = bool(all(hosts) and not any("*" in host for host in hosts))
    if not hosts_valid:
        invalid.append(ALLOWED_HOSTS)

    on_cloud_run = any(marker in environ for marker in CLOUD_RUN_MARKERS)
    strict_mode = environment is Environment.PRODUCTION or on_cloud_run
    parsed_origin = parse_origin(environ.get(EDITOR_ORIGIN, "").strip())
    if parsed_origin is None or (
        strict_mode
        and (parsed_origin.scheme != "https" or (hosts_valid and parsed_origin.host not in hosts))
    ):
        invalid.append(EDITOR_ORIGIN)

    google_client_id, google_client_secret, google_allowed_hd = _load_google_oidc_settings(
        environ, strict_mode=strict_mode, invalid=invalid
    )
    local_mock_oidc_url = _load_local_mock_url(environ, strict_mode=strict_mode, invalid=invalid)

    # Empty is unset, as OpenTelemetry reads it; checked before its trailing slash goes.
    otlp_endpoint = environ.get(OTLP_ENDPOINT, "").strip() or None
    if otlp_endpoint is not None and not is_http_url(otlp_endpoint):
        invalid.append(OTLP_ENDPOINT)

    service_name = environ.get(SERVICE_NAME, DEFAULT_SERVICE_NAME)
    if not _SERVICE_NAME_FORM.fullmatch(service_name):
        invalid.append(SERVICE_NAME)

    if invalid:
        refuse(invalid)
    assert parsed_origin is not None  # noqa: S101 - guaranteed when invalid is empty
    return Settings(
        environment=environment,
        database_url=database_url,
        allowed_hosts=hosts,
        editor_origin=parsed_origin.canonical,
        writes_messages=environment is Environment.LOCAL and not on_cloud_run,
        otlp_endpoint=otlp_endpoint.removesuffix("/") if otlp_endpoint else None,
        service_name=service_name,
        google_client_id=google_client_id,
        google_client_secret=google_client_secret,
        google_allowed_hd=google_allowed_hd,
        local_mock_oidc_url=local_mock_oidc_url,
        on_cloud_run=on_cloud_run,
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


def is_loopback_host(hostname: str) -> bool:
    """Whether `hostname` is `localhost`, `*.localhost` or a loopback/unspecified IP."""
    lowered = hostname.rstrip(".").lower()
    if lowered == "localhost" or lowered.endswith(".localhost"):
        return True
    try:
        ip = ipaddress.ip_address(lowered)
    except ValueError:
        return False
    return ip.is_loopback or ip.is_unspecified


def is_safe_deployed_issuer(issuer: str) -> bool:
    """Whether an OIDC issuer is HTTPS on a non-loopback host (ADR-018, STY-106 S4)."""
    if not issuer or any(ch.isspace() or ord(ch) < _ASCII_SPACE for ch in issuer):
        return False
    try:
        parts = urlsplit(issuer)
        _ = parts.port
    except ValueError:
        return False
    if parts.scheme != "https" or not parts.hostname:
        return False
    return not is_loopback_host(parts.hostname)


def parse_loopback_http_origin(raw: str) -> str | None:
    """Parses a bare `http://<loopback-host>[:port]` origin for the local mock OIDC server."""
    parsed = parse_origin(raw)
    if parsed is None or parsed.scheme != "http":
        return None
    hostname = parsed.host.strip("[]")
    if hostname == "0.0.0.0":  # noqa: S104 - explicitly rejecting wildcard bind host
        return None
    if not is_loopback_host(hostname):
        return None
    return parsed.canonical


def parse_allowed_hd(raw: str) -> tuple[str, ...] | None:
    """Parses a comma-separated list of Workspace hosted domains (no wildcards or blanks)."""
    if not raw:
        return None
    domains = tuple(part.strip().lower() for part in raw.split(","))
    if not all(domains) or not all(_DOMAIN_FORM.fullmatch(domain) for domain in domains):
        return None
    return domains


def parse_origin(raw: str) -> ParsedOrigin | None:
    """Parses a bare `scheme://host[:port]` origin into `ParsedOrigin`.

    Refuses any path (including a trailing slash), query, fragment, userinfo, wildcard,
    whitespace, control character or malformed/zero port. Lowercases scheme and host and
    strips default `:80`/`:443` ports for exact string matching (STY-105 D7).
    """
    if (
        not raw
        or "://" not in raw
        or "?" in raw
        or "#" in raw
        or any(ch.isspace() or ord(ch) < _ASCII_SPACE for ch in raw)
    ):
        return None
    raw_scheme, rest = raw.split("://", 1)
    scheme = raw_scheme.lower()
    if scheme not in _DEFAULT_PORTS or not rest or "/" in rest or "@" in rest or "*" in rest:
        return None
    try:
        parts = urlsplit(f"{scheme}://{rest}")
        port = parts.port
    except ValueError:
        return None
    hostname = parts.hostname
    if not hostname:
        return None
    host_token = f"[{hostname}]" if ":" in hostname else hostname
    expected_netloc = host_token if port is None else f"{host_token}:{port}"
    if rest.lower() != expected_netloc or port == 0:
        return None
    effective_port = _DEFAULT_PORTS[scheme] if port is None else port
    if port == _DEFAULT_PORTS[scheme]:
        port = None
    canonical = f"{scheme}://{host_token}" if port is None else f"{scheme}://{host_token}:{port}"
    return ParsedOrigin(
        scheme=scheme, host=host_token, canonical=canonical, effective_port=effective_port
    )
