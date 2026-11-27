from collections.abc import Iterator

import psycopg
import pytest
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.database import create_sessions
from roadmaps_api.migrations import latest_revision
from tests.harness import MOVED_VERSION_TABLE


@pytest.fixture
def engine(database_url: str) -> Iterator[Engine]:
    """Single-connection pool so pooled transactions meet any leaked session state."""
    engine = create_engine(database_url, pool_size=1, max_overflow=0)
    yield engine
    engine.dispose()


@pytest.fixture
def sessions(engine: Engine) -> sessionmaker[Session]:
    return create_sessions(engine)


@pytest.fixture
def versions(worker_admin: psycopg.Connection) -> Iterator[psycopg.Connection]:
    """The worker's `alembic_version`, its name and its row put back after the test.

    A test changes it through the connection, with `harness.holding` or
    `harness.without_the_version_table`.
    """
    yield worker_admin
    with worker_admin.transaction():
        moved = worker_admin.execute("SELECT to_regclass(%s)", (MOVED_VERSION_TABLE,)).fetchone()
        if moved != (None,):
            worker_admin.execute(
                f"ALTER TABLE {MOVED_VERSION_TABLE} RENAME TO alembic_version".encode()
            )
        worker_admin.execute("DELETE FROM alembic_version")
        worker_admin.execute("INSERT INTO alembic_version VALUES (%s)", (latest_revision().name,))
