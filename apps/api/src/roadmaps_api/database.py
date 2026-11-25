"""The engine, and the session factory a service takes.

Each transaction a session begins carries its tenant and person (ADR-017 _Tenant and
person_).
"""

from typing import Annotated, Final
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import Connection, Engine, create_engine, event, text
from sqlalchemy.orm import Session, SessionTransaction, sessionmaker

# About two seconds for each wait a query can meet: a pooled connection, a new
# connection (libpq's floor) and, for the readiness check, the query itself.
TIMEOUT_SECONDS: Final = 2
# SQLAlchemy's defaults, named so a test can exhaust the pool.
POOL_SIZE: Final = 5
MAX_OVERFLOW: Final = 10

# The settings ADR-015's row-level security policies read, and the keys of
# `Session.info` they are taken from.
TENANT_SETTING: Final = "app.tenant_id"
PERSON_SETTING: Final = "app.person_id"
TENANT_KEY: Final = "tenant_id"
PERSON_KEY: Final = "person_id"
# A tenant-owned table's policy, for `USING` and `WITH CHECK`: no row matches while the
# tenant is unset or empty (ADR-015 _Tenancy_).
TENANT_POLICY: Final = f"tenant_id = NULLIF(current_setting('{TENANT_SETTING}', true), '')::uuid"


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


def create_sessions(engine: Engine) -> sessionmaker[Session]:
    """Sessions whose every transaction carries the tenant and person each is given."""
    sessions = sessionmaker(engine)
    event.listen(sessions, "after_begin", _apply_tenant_and_person)
    return sessions


def session_info(
    *, tenant_id: UUID | None = None, person_id: UUID | None = None
) -> dict[str, UUID | None]:
    """The `info` a session takes for its transactions' tenant and person."""
    return {TENANT_KEY: tenant_id, PERSON_KEY: person_id}


def _apply_tenant_and_person(
    session: Session, _transaction: SessionTransaction, connection: Connection
) -> None:
    """Sets each of the session's tenant and person for this transaction alone.

    `set_config(…, true)` lasts until the transaction ends, so neither outlives it on a
    pooled connection; an absent one is left unset, and policies that need it match no
    row. The values are bound parameters, never SQL text.
    """
    for setting, key in ((TENANT_SETTING, TENANT_KEY), (PERSON_SETTING, PERSON_KEY)):
        value: UUID | None = session.info.get(key)
        if value is not None:
            connection.execute(
                text("SELECT set_config(:setting, :value, true)"),
                {"setting": setting, "value": str(value)},
            )


def get_sessions(request: Request) -> sessionmaker[Session]:
    sessions: sessionmaker[Session] = request.app.state.sessions
    return sessions


Sessions = Annotated[sessionmaker[Session], Depends(get_sessions)]
