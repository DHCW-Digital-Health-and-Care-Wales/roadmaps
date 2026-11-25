"""S7 and S8: `/ready` answers by the database's revision and the login it connects as.

S7 changes this worker's `alembic_version` and puts it back. S8 runs on throwaway logins
and roles, the application's and Cloud SQL's among them, so the shared ones stay
unchanged: the readiness service is pointed at the test's stand-ins.
"""

from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any

import psycopg
import pytest
from psycopg import sql

from roadmaps_api import app as app_module
from roadmaps_api.migrations import latest_revision
from roadmaps_api.services import readiness
from tests import harness
from tests.support import Lines, make_settings, serving
from tools.bootstrap_database import MIGRATION_LOGIN

LATEST = latest_revision()
# Revisions around the code's latest, whatever its number.
ABOVE = f"{LATEST.number + 1:04d}_next"
BELOW = f"{LATEST.number - 1:04d}_older"
ANOTHER_SLUG = f"{LATEST.number:04d}_another_slug"
MOVED = "alembic_version_moved"
NOT_READY = {"detail": "The service is not ready.", "code": "service.not_ready", "params": {}}
NOT_SERVED = [{"message": "readiness.failed", "cause": "readiness.revision_not_served"}]


def warnings_of(lines: Lines) -> list[dict[str, Any]]:
    return [line for line in lines.read() if line.get("message") != "request"]


@pytest.fixture
def versions(worker_admin: psycopg.Connection) -> Iterator[psycopg.Connection]:
    """The worker's `alembic_version`, its name and its row put back after the test."""
    yield worker_admin
    with worker_admin.transaction():
        if worker_admin.execute("SELECT to_regclass(%s)", (MOVED,)).fetchone() != (None,):
            worker_admin.execute(f"ALTER TABLE {MOVED} RENAME TO alembic_version".encode())
        worker_admin.execute("DELETE FROM alembic_version")
        worker_admin.execute("INSERT INTO alembic_version VALUES (%s)", (LATEST.name,))


def holding(*revisions: str) -> Callable[[psycopg.Connection], None]:
    def change(connection: psycopg.Connection) -> None:
        connection.execute("DELETE FROM alembic_version")
        for revision in revisions:
            connection.execute("INSERT INTO alembic_version VALUES (%s)", (revision,))

    return change


def without_the_table(connection: psycopg.Connection) -> None:
    connection.execute(f"ALTER TABLE alembic_version RENAME TO {MOVED}".encode())


@dataclass(frozen=True)
class Case:
    change: Callable[[psycopg.Connection], None]
    status: int
    # The fields of each line besides the access line.
    logged: list[dict[str, str]]


REVISIONS = {
    "the code's latest": Case(holding(LATEST.name), 200, []),
    "one numbered above it": Case(
        holding(ABOVE), 200, [{"message": "readiness.ahead", "revision": ABOVE}]
    ),
    "one numbered below it": Case(holding(BELOW), 503, NOT_SERVED),
    "another slug at a number the code knows": Case(holding(ANOTHER_SLUG), 503, NOT_SERVED),
    "a value not of the form NNNN_<slug>": Case(holding("1a2b3c4d5e6f"), 503, NOT_SERVED),
    # Arabic-Indic digits, which `\d` would read as a number above the latest.
    "a number in another script's digits": Case(holding("٩٩٩٩_next"), 503, NOT_SERVED),
    "no row": Case(holding(), 503, NOT_SERVED),
    "more than one row": Case(holding(LATEST.name, ABOVE), 503, NOT_SERVED),
    "no alembic_version table": Case(without_the_table, 503, NOT_SERVED),
}


@pytest.mark.parametrize("case", REVISIONS.values(), ids=REVISIONS)
def test_ready_answers_by_the_database_s_revision(
    versions: psycopg.Connection, database_url: str, lines: Lines, case: Case
) -> None:
    case.change(versions)

    with serving(make_settings(database_url)) as client:
        response = client.get("/ready")

    assert response.status_code == case.status
    if case.status == 503:
        assert response.json() == NOT_READY
    logged = warnings_of(lines)
    assert len(logged) == len(case.logged)
    for line, expected in zip(logged, case.logged, strict=True):
        assert expected.items() <= line.items()


def test_the_code_s_latest_revision_is_read_once_at_start_up(
    database_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    reads: list[None] = []

    def counted() -> Any:  # noqa: ANN401 - whatever the real one returns
        reads.append(None)
        return latest_revision()

    monkeypatch.setattr(app_module, "latest_revision", counted)

    with serving(make_settings(database_url)) as client:
        assert client.get("/ready").status_code == 200
        assert client.get("/ready").status_code == 200

    assert len(reads) == 1


@dataclass(frozen=True)
class Roles:
    """A test's stand-ins: the application's role, Cloud SQL's and an extra one."""

    prefix: str
    database: str

    @property
    def app(self) -> str:
        return f"{self.prefix}_app"

    @property
    def iam(self) -> str:
        return f"{self.prefix}_iam"

    @property
    def login_url(self) -> str:
        return self.url_for(f"{self.prefix}_login")

    def url_for(self, login: str) -> str:
        return harness.login_url(login, self.database, "throwaway")

    def run(self, connection: psycopg.Connection, statement: str) -> None:
        connection.execute(
            statement.replace("{p}", self.prefix)
            .replace("{database}", sql.Identifier(self.database).as_string(connection))
            .encode()
        )


@pytest.fixture
def roles(
    worker_database: str, worker_admin: psycopg.Connection, monkeypatch: pytest.MonkeyPatch
) -> Iterator[Roles]:
    """A login in the stand-in application's role, which reads `alembic_version`."""
    roles = Roles(prefix=harness.unique_name("ready"), database=worker_database)
    roles.run(
        worker_admin,
        "CREATE ROLE {p}_app NOLOGIN; CREATE ROLE {p}_iam NOLOGIN;"
        " CREATE ROLE {p}_extra NOLOGIN;"
        " CREATE ROLE {p}_login LOGIN PASSWORD 'throwaway' IN ROLE {p}_app;"
        " GRANT SELECT ON alembic_version TO {p}_app",
    )
    monkeypatch.setattr(readiness, "APP_ROLE", roles.app)
    monkeypatch.setattr(readiness, "CLOUD_SQL_IAM_ROLES", (roles.iam,))
    yield roles
    # What each case granted or made, in this database and on the cluster, goes first.
    roles.run(
        worker_admin,
        "DROP OWNED BY {p}_login, {p}_app, {p}_iam, {p}_extra;"
        " DROP ROLE {p}_login, {p}_app, {p}_iam, {p}_extra",
    )


SERVED = {
    "a login of the application's role": "",
    "one also in an inert role standing for Cloud SQL's": "GRANT {p}_iam TO {p}_login",
}


@pytest.mark.parametrize("change", SERVED.values(), ids=SERVED)
def test_ready_serves_a_login_that_holds_the_application_s_role_and_nothing_more(
    roles: Roles, worker_admin: psycopg.Connection, lines: Lines, change: str
) -> None:
    if change:
        roles.run(worker_admin, change)

    with serving(make_settings(roles.login_url)) as client:
        assert client.get("/ready").status_code == 200
    assert warnings_of(lines) == []


REFUSED = {
    **{
        f"a login with {attribute}": f"ALTER ROLE {{p}}_login {attribute}"
        for attribute in ("SUPERUSER", "BYPASSRLS", "CREATEROLE", "CREATEDB", "REPLICATION")
    },
    "a login in an extra role, as Cloud SQL's cloudsqlsuperuser": "GRANT {p}_extra TO {p}_login",
    "a login in an extra role without INHERIT or SET": (
        "GRANT {p}_extra TO {p}_login WITH INHERIT FALSE, SET FALSE"
    ),
    "a login in an extra role through another role": (
        "GRANT {p}_iam TO {p}_login; GRANT {p}_extra TO {p}_iam"
    ),
    "a login holding the application's role with ADMIN": (
        "GRANT {p}_app TO {p}_login WITH ADMIN TRUE"
    ),
    "a login in no role": "REVOKE {p}_app FROM {p}_login",
    "the inert role given an attribute": "GRANT {p}_iam TO {p}_login; ALTER ROLE {p}_iam CREATEDB",
    "the inert role owning an object": (
        "GRANT {p}_iam TO {p}_login;"
        " CREATE TABLE {p}_owned (); ALTER TABLE {p}_owned OWNER TO {p}_iam"
    ),
    "the application's role owning an object": (
        "CREATE TABLE {p}_owned (); ALTER TABLE {p}_owned OWNER TO {p}_app"
    ),
    "the login owning an object": (
        "CREATE TABLE {p}_owned (); ALTER TABLE {p}_owned OWNER TO {p}_login"
    ),
    "CREATE on the database": "GRANT CREATE ON DATABASE {database} TO {p}_app",
    "TEMPORARY on the database": "GRANT TEMPORARY ON DATABASE {database} TO {p}_app",
    "CREATE on a schema": "GRANT CREATE ON SCHEMA public TO {p}_app",
}


@pytest.mark.parametrize("change", REFUSED.values(), ids=REFUSED)
def test_ready_refuses_a_login_that_holds_more_than_the_application_s_role(
    roles: Roles, worker_admin: psycopg.Connection, lines: Lines, change: str
) -> None:
    roles.run(worker_admin, change)

    with serving(make_settings(roles.login_url)) as client:
        response = client.get("/ready")

    assert (response.status_code, response.json()) == (503, NOT_READY)
    [warning] = warnings_of(lines)
    assert warning["cause"] == "readiness.login_unsafe"


def test_ready_refuses_the_migration_login(worker_database: str, lines: Lines) -> None:
    with serving(make_settings(harness.login_url(MIGRATION_LOGIN, worker_database))) as client:
        assert client.get("/ready").status_code == 503

    [warning] = warnings_of(lines)
    assert warning["cause"] == "readiness.login_unsafe"


@dataclass(frozen=True)
class Named:
    """A login whose name is not a plain lower-case identifier.

    It is made beside a safe login whose name differs only by case, where it differs.
    """

    name: str
    bypasses_rls: bool
    status: int


NAMED = {
    "an IAM service account's, as Cloud SQL names it": Named(
        "{p}-api@my-project.iam", bypasses_rls=False, status=200
    ),
    "a mixed-case login with BYPASSRLS": Named("{p}_Twin", bypasses_rls=True, status=503),
}


@pytest.mark.parametrize("case", NAMED.values(), ids=NAMED)
def test_ready_judges_the_login_it_connects_as_by_its_exact_name(
    roles: Roles, worker_admin: psycopg.Connection, lines: Lines, case: Named
) -> None:
    login = case.name.replace("{p}", roles.prefix)
    made = {login.lower(): False, login: case.bypasses_rls}
    try:
        for role, bypass in made.items():
            worker_admin.execute(
                sql.SQL("CREATE ROLE {} LOGIN PASSWORD 'throwaway' {} IN ROLE {}").format(
                    sql.Identifier(role),
                    sql.SQL("BYPASSRLS" if bypass else "NOBYPASSRLS"),
                    sql.Identifier(roles.app),
                )
            )
        with serving(make_settings(roles.url_for(login))) as client:
            assert client.get("/ready").status_code == case.status
    finally:
        for role in made:
            worker_admin.execute(sql.SQL("DROP ROLE IF EXISTS {}").format(sql.Identifier(role)))

    causes = [line["cause"] for line in warnings_of(lines)]
    assert causes == ([] if case.status == 200 else ["readiness.login_unsafe"])
