"""S6: each transaction carries its session's tenant and person, and nothing outlives it.

On an engine with a pool of one connection, so a later transaction meets whatever an
earlier one left on it, connected as the application's login.
"""

import uuid
from collections.abc import Iterator

import psycopg
import pytest
from sqlalchemy import Connection, Engine, TextClause, create_engine, event, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.database import create_sessions, session_info
from tests.harness import PROBE_TABLE

TENANT = uuid.uuid4()
OTHER_TENANT = uuid.uuid4()
PERSON = uuid.uuid4()
SETTINGS = text(
    "SELECT current_setting('app.tenant_id', true), current_setting('app.person_id', true)"
)
EMPTY = (None, "")


@pytest.fixture
def engine(database_url: str) -> Iterator[Engine]:
    engine = create_engine(database_url, pool_size=1, max_overflow=0)
    yield engine
    engine.dispose()


@pytest.fixture
def sessions(engine: Engine) -> sessionmaker[Session]:
    return create_sessions(engine)


SCOPES = {
    "a tenant and a person": (TENANT, PERSON),
    "a tenant alone": (TENANT, None),
    "a person alone": (None, PERSON),
    "neither": (None, None),
}


@pytest.mark.parametrize(("tenant", "person"), SCOPES.values(), ids=SCOPES)
def test_each_transaction_a_session_begins_carries_its_tenant_and_person(
    sessions: sessionmaker[Session], tenant: uuid.UUID | None, person: uuid.UUID | None
) -> None:
    with sessions(info=session_info(tenant_id=tenant, person_id=person)) as session:
        first = session.execute(SETTINGS).one()
        session.commit()
        second = session.execute(SETTINGS).one()

    for found in (first, second):
        for value, given in zip(found, (tenant, person), strict=True):
            assert value == str(given) if given else value in EMPTY


def test_a_transaction_with_no_tenant_after_one_with_a_tenant_reads_both_empty(
    sessions: sessionmaker[Session],
) -> None:
    with sessions(info=session_info(tenant_id=TENANT, person_id=PERSON)) as session:
        assert session.execute(SETTINGS).one() == (str(TENANT), str(PERSON))
        # Committed: a rollback would undo even a session-wide setting.
        session.commit()
    with sessions() as session:
        assert session.execute(SETTINGS).one() == ("", "")


def test_the_settings_are_bound_parameters_set_before_the_first_statement(
    engine: Engine, sessions: sessionmaker[Session]
) -> None:
    statements: list[tuple[str, dict[str, object]]] = []

    def record(
        _connection: Connection,
        _cursor: object,
        statement: str,
        parameters: dict[str, object],
        *_: object,
    ) -> None:
        statements.append((statement, parameters))

    event.listen(engine, "before_cursor_execute", record)
    with sessions(info=session_info(tenant_id=TENANT, person_id=PERSON)) as session:
        session.execute(text("SELECT 1"))

    tenant, person, first = statements[-3:]
    assert "set_config" in tenant[0]
    assert "set_config" in person[0]
    assert str(TENANT) in tenant[1].values()
    assert str(PERSON) in person[1].values()
    assert all(str(TENANT) not in statement for statement, _ in statements)
    assert first[0] == "SELECT 1"


SELECT_ALL = text(f"SELECT tenant_id FROM {PROBE_TABLE}")  # noqa: S608 - the harness's constant
INSERT = text(f"INSERT INTO {PROBE_TABLE} (tenant_id) VALUES (:tenant)")  # noqa: S608 - as above
UPDATE_ALL = text(f"UPDATE {PROBE_TABLE} SET tenant_id = :tenant")  # noqa: S608 - as above
DELETE_ALL = text(f"DELETE FROM {PROBE_TABLE}")  # noqa: S608 - as above


def insert_as(sessions: sessionmaker[Session], tenant: uuid.UUID) -> None:
    with sessions(info=session_info(tenant_id=tenant)) as session:
        session.execute(INSERT, {"tenant": tenant})
        session.commit()


def affected(
    session: Session, statement: TextClause, values: dict[str, object] | None = None
) -> int:
    """The rows a statement changed."""
    return session.connection().execute(statement, values or {}).rowcount


def tenants_seen(session: Session) -> list[uuid.UUID]:
    return list(session.execute(SELECT_ALL).scalars())


def assert_reads_and_writes_no_row(session: Session) -> None:
    assert tenants_seen(session) == []
    assert affected(session, UPDATE_ALL, {"tenant": TENANT}) == 0
    assert affected(session, DELETE_ALL) == 0
    with pytest.raises(ProgrammingError) as refused:
        session.execute(INSERT, {"tenant": TENANT})
    assert isinstance(refused.value.orig, psycopg.errors.InsufficientPrivilege)


def test_with_no_tenant_the_probe_table_reads_and_writes_no_row(
    engine: Engine, sessions: sessionmaker[Session]
) -> None:
    insert_as(sessions, TENANT)
    # A new connection.
    engine.dispose()
    with sessions() as session:
        assert_reads_and_writes_no_row(session)
    # The same connection, after a transaction with a tenant.
    with sessions(info=session_info(tenant_id=TENANT)) as session:
        assert tenants_seen(session) == [TENANT]
        session.commit()
    with sessions() as session:
        assert_reads_and_writes_no_row(session)


def test_with_a_tenant_the_probe_table_reads_and_writes_only_its_rows(
    sessions: sessionmaker[Session],
) -> None:
    insert_as(sessions, TENANT)
    insert_as(sessions, OTHER_TENANT)

    with sessions(info=session_info(tenant_id=TENANT)) as session:
        assert tenants_seen(session) == [TENANT]
        with pytest.raises(ProgrammingError), session.begin_nested():
            session.execute(INSERT, {"tenant": OTHER_TENANT})
        with pytest.raises(ProgrammingError), session.begin_nested():
            session.execute(UPDATE_ALL, {"tenant": OTHER_TENANT})
        assert affected(session, DELETE_ALL) == 1
        session.commit()
    with sessions(info=session_info(tenant_id=OTHER_TENANT)) as session:
        assert tenants_seen(session) == [OTHER_TENANT]
