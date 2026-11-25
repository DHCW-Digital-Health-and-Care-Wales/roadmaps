"""S2 and S5: migrations run as their own step, as the owner role, and upgrade only.

The models match them, and the API never runs them at start-up.
"""

import json
import os
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import psycopg
import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import Column, Connection, Integer, MetaData, Table, create_engine, text
from sqlalchemy.pool import NullPool

from roadmaps_api import migrate, migrations
from roadmaps_api.migrations import UpgradeOnlyError, alembic_config, latest_revision, scripts
from roadmaps_api.models import Base
from roadmaps_api.roles import APP_ROLE, OWNER_ROLE
from roadmaps_api.settings import MIGRATION_DATABASE_URL
from tests import harness
from tests.support import Lines, make_settings, serving

API_DIR = Path(__file__).parent.parent.parent
LATEST = latest_revision().name


@pytest.fixture
def unmigrated() -> Iterator[str]:
    """A bootstrapped database no revision has run on."""
    name = harness.unique_name("migrate")
    harness.create_database(name)
    yield name
    harness.drop_database(name)


def version(database: str) -> list[tuple[Any, ...]]:
    with harness.admin(database) as connection:
        return connection.execute("SELECT version_num FROM alembic_version").fetchall()


def run_migrate(database: str) -> subprocess.CompletedProcess[str]:
    """`pnpm api:migrate`'s command, in a process of its own."""
    return subprocess.run(
        [sys.executable, "-m", "roadmaps_api.migrate"],
        cwd=API_DIR,
        env={**os.environ, MIGRATION_DATABASE_URL: harness.migration_url(database)},
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )


def test_the_command_brings_the_database_to_the_latest_revision_as_the_owner(
    unmigrated: str,
) -> None:
    first = run_migrate(unmigrated)
    second = run_migrate(unmigrated)

    assert (first.returncode, second.returncode) == (0, 0), first.stdout + first.stderr
    assert first.stderr == ""
    assert json.loads(first.stdout.splitlines()[-1])["message"] == "migrate.done"
    assert version(unmigrated) == [(LATEST,)]
    with harness.admin(unmigrated) as connection:
        owners = connection.execute(
            "SELECT DISTINCT relowner::regrole::text FROM pg_class"
            " WHERE relnamespace = 'public'::regnamespace"
        ).fetchall()
        version_table = connection.execute(
            "SELECT relrowsecurity, relacl::text[] FROM pg_class"
            " WHERE oid = 'public.alembic_version'::regclass"
        ).fetchone()
    assert owners == [(OWNER_ROLE,)]
    # The one table without row-level security, which only its owner writes and the
    # application's role reads (D28).
    assert version_table == (
        False,
        [f"{OWNER_ROLE}=arwdDxtm/{OWNER_ROLE}", f"{APP_ROLE}=r/{OWNER_ROLE}"],
    )


@pytest.mark.usefixtures("json_logging")
def test_the_command_refuses_a_missing_migration_url_naming_it(
    capsys: pytest.CaptureFixture[str],
) -> None:
    assert migrate.main({}) == 1

    [line] = [json.loads(text) for text in capsys.readouterr().out.splitlines()]
    assert (line["message"], line["invalid_settings"]) == (
        "settings.invalid",
        [MIGRATION_DATABASE_URL],
    )


def test_the_command_logs_a_failure_s_type(lines: Lines) -> None:
    down = "postgresql+psycopg://roadmaps_migrator_login:roadmaps@127.0.0.1:1/roadmaps"

    assert migrate.main({MIGRATION_DATABASE_URL: down}) == 1

    [line] = lines.read()
    assert (line["message"], line["exception_type"]) == (
        "migrate.failed",
        "sqlalchemy.exc.OperationalError",
    )


def statement_error(url: str, statement: str) -> type[BaseException] | None:
    engine = create_engine(url, poolclass=NullPool)
    try:
        with engine.connect() as connection:
            connection.execute(text(statement))
    except Exception as exc:  # noqa: BLE001 - the error's type is the subject
        return type(exc.__cause__ or exc)
    finally:
        engine.dispose()
    return None


DDL = {
    "a table": "CREATE TABLE public.attempt ()",
    "a temporary table": "CREATE TEMPORARY TABLE attempt ()",
    "a schema": "CREATE SCHEMA attempt",
}


@pytest.mark.parametrize("statement", DDL.values(), ids=DDL)
@pytest.mark.parametrize("login", ["migration", "application"])
def test_neither_login_creates_anything_without_switching_to_the_owner(
    worker_database: str, statement: str, login: str
) -> None:
    url = (harness.migration_url if login == "migration" else harness.app_url)(worker_database)

    assert statement_error(url, statement) is psycopg.errors.InsufficientPrivilege


def test_each_revision_s_downgrade_raises_naming_the_rule() -> None:
    revisions = list(scripts().walk_revisions())

    assert revisions
    for revision in revisions:
        with pytest.raises(UpgradeOnlyError, match="Revisions upgrade only"):
            revision.module.downgrade()


def test_a_downgrade_writes_nothing(unmigrated: str) -> None:
    migrate.upgrade(harness.migration_url(unmigrated))
    engine = create_engine(harness.migration_url(unmigrated), poolclass=NullPool)
    try:
        with engine.connect() as connection, pytest.raises(UpgradeOnlyError):
            command.downgrade(alembic_config(connection), "base")
    finally:
        engine.dispose()

    assert version(unmigrated) == [(LATEST,)]


def test_the_api_never_migrates_at_start_up(unmigrated: str) -> None:
    with serving(make_settings(harness.app_url(unmigrated))) as client:
        assert client.get("/ready").status_code == 503

    with harness.admin(unmigrated) as connection:
        found = connection.execute("SELECT to_regclass('public.alembic_version')").fetchone()
    assert found == (None,)


def routines_public_may_execute(connection: psycopg.Connection) -> list[str]:
    """The routines in schema `public` that PUBLIC may execute; the check of S2."""
    rows = connection.execute(
        "SELECT oid::regprocedure::text FROM pg_proc,"
        " aclexplode(coalesce(proacl, acldefault('f', proowner))) AS granted"
        " WHERE pronamespace = 'public'::regnamespace"
        " AND granted.grantee = 0 AND granted.privilege_type = 'EXECUTE'"
    ).fetchall()
    return [name for (name,) in rows]


def test_no_routine_in_public_is_executable_by_public(
    worker_admin: psycopg.Connection,
) -> None:
    assert routines_public_may_execute(worker_admin) == []
    create = "CREATE FUNCTION public.{name}() RETURNS int LANGUAGE sql AS 'SELECT 1'"
    with worker_admin.transaction(force_rollback=True):
        worker_admin.execute(f"SET LOCAL ROLE {OWNER_ROLE}".encode())
        # A routine the owner creates grants PUBLIC nothing (D25)...
        worker_admin.execute(create.format(name="owned").encode())
        assert routines_public_may_execute(worker_admin) == []
        # ...and one that does fails the check.
        worker_admin.execute(create.format(name="granted").encode())
        worker_admin.execute("GRANT EXECUTE ON FUNCTION public.granted() TO PUBLIC")
        assert routines_public_may_execute(worker_admin) == ["granted()"]


def drift(connection: Connection, metadata: MetaData) -> list[Any]:
    """How the database differs from the models, leaving out the harness's probe table."""

    def include_name(name: str | None, kind: str, _parent: object) -> bool:
        return not (kind == "table" and name == harness.PROBE_TABLE)

    context = MigrationContext.configure(connection, opts={"include_name": include_name})
    return compare_metadata(context, metadata)


def test_the_models_match_the_migrations(database_url: str) -> None:
    engine = create_engine(database_url, poolclass=NullPool)
    try:
        with engine.connect() as connection:
            assert drift(connection, Base.metadata) == []
            # A standing failing case: a table the migrations lack is named (D32).
            extra = MetaData(naming_convention=Base.metadata.naming_convention)
            for table in Base.metadata.tables.values():
                table.to_metadata(extra)
            Table("unmigrated", extra, Column("id", Integer, primary_key=True))
            [(operation, table)] = drift(connection, extra)
    finally:
        engine.dispose()

    assert (operation, table.name) == ("add_table", "unmigrated")


def test_alembic_s_command_line_drafts_from_the_pyproject_configuration(
    unmigrated: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Alembic's own `check`, as `alembic revision --autogenerate` drafts, sees no drift."""
    migrate.upgrade(harness.migration_url(unmigrated))
    monkeypatch.setenv(MIGRATION_DATABASE_URL, harness.migration_url(unmigrated))

    command.check(Config(toml_file=str(API_DIR / "pyproject.toml")))


def test_the_latest_revision_must_read_as_numbered(monkeypatch: pytest.MonkeyPatch) -> None:
    class Unnumbered:
        def get_heads(self) -> list[str]:
            return ["1a2b3c4d5e6f"]

    monkeypatch.setattr(migrations, "scripts", Unnumbered)

    with pytest.raises(ValueError, match="NNNN_<slug>"):
        latest_revision()
