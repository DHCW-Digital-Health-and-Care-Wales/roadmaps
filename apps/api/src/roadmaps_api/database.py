"""The engine and the session each request gets."""

from collections.abc import Iterator
from typing import Annotated, Final

from fastapi import Depends, Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

# About two seconds for each wait a readiness check can meet: a pooled connection, a
# new connection (libpq's floor), and the query itself (`ReadinessRepository`).
TIMEOUT_SECONDS: Final = 2
# SQLAlchemy's defaults, named so a test can exhaust the pool.
POOL_SIZE: Final = 5
MAX_OVERFLOW: Final = 10


def create_database_engine(url: str) -> Engine:
    return create_engine(
        url,
        # SQL parameters never reach an exception's text, and so never a log line.
        hide_parameters=True,
        pool_pre_ping=True,
        pool_size=POOL_SIZE,
        max_overflow=MAX_OVERFLOW,
        pool_timeout=TIMEOUT_SECONDS,
        connect_args={"connect_timeout": TIMEOUT_SECONDS},
    )


def get_session(request: Request) -> Iterator[Session]:
    """A session for one request; closing it rolls back whatever was left open."""
    factory: sessionmaker[Session] = request.app.state.sessions
    with factory() as session:
        yield session


DbSession = Annotated[Session, Depends(get_session)]
