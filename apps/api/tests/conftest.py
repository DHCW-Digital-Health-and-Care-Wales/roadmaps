import fcntl
import logging
import logging.config
import os
from collections.abc import Iterator
from typing import Any

import psycopg
import pytest
from fastapi.testclient import TestClient
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from roadmaps_api.logs import log_config
from roadmaps_api.settings import MIGRATION_DATABASE_URL, PURGE_DATABASE_URL
from tests import harness
from tests.support import ConfigureLogging, Lines, make_settings, serving

# The template database's name, from the controller to each worker.
TEMPLATE: pytest.StashKey[str] = pytest.StashKey()
TEMPLATE_INPUT = "roadmaps_template"


def pytest_configure(config: pytest.Config) -> None:
    """Builds the template database once per run, in the controller, not in a worker."""
    workerinput: dict[str, Any] | None = getattr(config, "workerinput", None)
    if workerinput is not None:
        if TEMPLATE_INPUT in workerinput:
            config.stash[TEMPLATE] = workerinput[TEMPLATE_INPUT]
        return
    # A run with no database (a single file of pure tests) builds none.
    if not os.environ.get(harness.ADMIN_DATABASE_URL):
        return
    template = harness.unique_name("roadmaps_template")
    config.stash[TEMPLATE] = template
    try:
        harness.build_template(template)
    except BaseException:
        harness.drop_database(template)
        raise


@pytest.hookimpl(optionalhook=True)
def pytest_configure_node(node: Any) -> None:  # noqa: ANN401 - xdist's WorkerController
    """Hands each pytest-xdist worker the template's name."""
    if TEMPLATE in node.config.stash:
        node.workerinput[TEMPLATE_INPUT] = node.config.stash[TEMPLATE]


def pytest_unconfigure(config: pytest.Config) -> None:
    if not hasattr(config, "workerinput") and TEMPLATE in config.stash:
        harness.drop_database(config.stash[TEMPLATE])


@pytest.fixture(scope="session")
def worker_database(pytestconfig: pytest.Config) -> Iterator[str]:
    """The worker's own database, cloned from the template and dropped at its end."""
    if TEMPLATE not in pytestconfig.stash:
        msg = f"Run the tests with pnpm api:test, which sets {harness.ADMIN_DATABASE_URL}."
        raise RuntimeError(msg)
    name = harness.unique_name("roadmaps_test")
    harness.create_database(name, template=pytestconfig.stash[TEMPLATE])
    yield name
    harness.drop_database(name)


@pytest.fixture(scope="session")
def worker_admin(worker_database: str) -> Iterator[psycopg.Connection]:
    """The superuser connection to this worker's database, which only the harness holds."""
    with harness.open_admin(worker_database) as connection:
        yield connection


@pytest.fixture
def shared_roles(tmp_path_factory: pytest.TempPathFactory) -> Iterator[None]:
    """Holds the run's lock on the shared roles, for a test that bootstraps them.

    PostgreSQL refuses a transaction's update to a role another transaction has just
    updated ("tuple concurrently updated"), so such tests take turns across the workers,
    whose temporary directories share a parent.
    """
    lock = tmp_path_factory.getbasetemp().parent / "shared-roles.lock"
    with lock.open("w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        yield


@pytest.fixture
def database_url(worker_database: str, worker_admin: psycopg.Connection) -> Iterator[str]:
    """The worker's database as the application's login, emptied after the test."""
    yield harness.app_url(worker_database)
    harness.empty_tables(worker_admin)


@pytest.fixture(autouse=True)
def no_migration_login(monkeypatch: pytest.MonkeyPatch) -> None:
    """Privileged migration and purge logins exported in a shell reach no test.

    The API refuses to start with either set, and the server tests' processes inherit the
    environment.
    """
    monkeypatch.delenv(MIGRATION_DATABASE_URL, raising=False)
    monkeypatch.delenv(PURGE_DATABASE_URL, raising=False)


# The exporter's HTTP session follows them: a test's stand-in receiver is on 127.0.0.1.
PROXY_VARIABLES = frozenset({"http_proxy", "https_proxy", "all_proxy"})


@pytest.fixture(autouse=True)
def no_trace_export(monkeypatch: pytest.MonkeyPatch) -> None:
    """No test exports a span, whatever OpenTelemetry variables the developer's shell set.

    Spans go only to the in-memory exporter a test reads (`spans`), and the server tests'
    processes inherit this environment (ADR-017 _Operation_).
    """
    for name in os.environ:
        if name.startswith(("OTEL_", "FASTAPI_OTEL_")) or name.lower() in PROXY_VARIABLES:
            monkeypatch.delenv(name)


@pytest.fixture
def spans() -> InMemorySpanExporter:
    """The spans the test's app ends, as they would be exported."""
    return InMemorySpanExporter()


@pytest.fixture
def client(spans: InMemorySpanExporter) -> Iterator[TestClient]:
    """The API with its database down; the readiness tests bring their own."""
    with serving(make_settings(), spans) as client:
        yield client


@pytest.fixture
def configure_logging() -> Iterator[ConfigureLogging]:
    """Applies the API's log configuration for the settings, as uvicorn and its factory do.

    After the test the root's handlers and level and uvicorn's levels are restored, and
    warnings are no longer captured (the factory captures them).
    """
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    uvicorn = [logging.getLogger(name) for name in ("uvicorn", "uvicorn.error")]
    levels = [logger.level for logger in uvicorn]
    yield lambda settings: logging.config.dictConfig(log_config(settings))
    logging.captureWarnings(capture=False)
    root.handlers[:] = handlers
    root.setLevel(level)
    for logger, uvicorn_level in zip(uvicorn, levels, strict=True):
        logger.setLevel(uvicorn_level)


@pytest.fixture
def json_logging(configure_logging: ConfigureLogging) -> None:
    """The configuration before the settings are read, which writes no message."""
    configure_logging(None)


@pytest.fixture
def lines(
    capsys: pytest.CaptureFixture[str],
    json_logging: None,  # noqa: ARG001 - requested for its configuration
) -> Lines:
    return Lines(capsys)
