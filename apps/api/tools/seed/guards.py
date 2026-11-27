"""Five fail-closed local-only safety guards for `tools.seed` (`STY-093` S4, D14).

Refuses before truncating or writing anything unless:
1. `ROADMAPS_ENV` is `local` or `test`;
2. no Cloud Run marker (`K_SERVICE`, `CLOUD_RUN_JOB`, `CLOUD_RUN_WORKER_POOL`) is set;
3. `ROADMAPS_ADMIN_DATABASE_URL` is a valid `postgresql+psycopg://` URL with no query params;
4. the URL host is a loopback IP (`127.0.0.1` or `::1`); and
5. the connected login is a superuser (`rolsuper`), checked on the same `hostaddr`-pinned
   SQLAlchemy connection used for `TRUNCATE ... CASCADE` and ORM seeding.
"""

import ipaddress
from collections.abc import Mapping

from sqlalchemy import Connection, Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

from roadmaps_api.settings import CLOUD_RUN_MARKERS, ENV, is_database_url, refuse
from tools.bootstrap_database import ADMIN_DATABASE_URL, LOCAL_ENVIRONMENTS


def _loopback_host(url: str) -> str | None:
    if not is_database_url(url):
        return None
    parsed = make_url(url)
    # No query parameters: libpq could otherwise override host, hostaddr or service.
    if parsed.query or parsed.host is None:
        return None
    try:
        if not ipaddress.ip_address(parsed.host).is_loopback:
            return None
    except ValueError:
        return None
    return parsed.host


def validated_admin_url(environ: Mapping[str, str]) -> str:
    """Validates guards 1-4 and returns the admin URL, or refuses naming only setting names."""
    invalid: list[str] = []
    if environ.get(ENV) not in LOCAL_ENVIRONMENTS:
        invalid.append(ENV)
    invalid.extend(marker for marker in CLOUD_RUN_MARKERS if marker in environ)
    url = environ.get(ADMIN_DATABASE_URL, "").strip()
    if _loopback_host(url) is None:
        invalid.append(ADMIN_DATABASE_URL)
    if invalid:
        refuse(invalid)
    return url


def pinned_host(url: str) -> str:
    """Returns the validated loopback IP for `url`, or refuses naming `ADMIN_DATABASE_URL`."""
    host = _loopback_host(url)
    if host is None:
        refuse([ADMIN_DATABASE_URL])
    return host


def create_pinned_admin_engine(url: str) -> Engine:
    """Creates a `NullPool` SQLAlchemy engine pinned to the URL's loopback IP via `hostaddr`."""
    host = pinned_host(url)
    return create_engine(
        url,
        poolclass=NullPool,
        hide_parameters=True,
        connect_args={"hostaddr": host},
    )


def assert_superuser(connection: Connection) -> None:
    """Guard 5: refuses on the active connection unless `current_user` is a superuser."""
    is_super = connection.execute(
        text("SELECT rolsuper FROM pg_roles WHERE rolname = current_user")
    ).scalar()
    if not is_super:
        refuse([ADMIN_DATABASE_URL])
