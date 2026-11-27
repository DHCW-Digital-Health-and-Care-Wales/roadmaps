"""S1: the bootstrap makes ADR-015's roles, run by a superuser or Cloud SQL's kind of admin.

The file runs on throwaway roles and databases: its role names are swapped for a test's
own, so the shared roles every worker connects through stay unchanged. Only the local
runner's own test touches the shared ones, as `pnpm api:db:up` does, changing nothing.
"""

import json
import os
import subprocess
import sys
from collections.abc import Generator, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import psycopg
import pytest
from psycopg import sql

from roadmaps_api.roles import (
    APP_ROLE,
    AUTH_DEFINER_ROLE,
    HISTORY_DEFINER_ROLE,
    MIGRATION_ROLE,
    OWNER_ROLE,
    PLATFORM_DEFINER_ROLE,
    PLATFORM_ROLE,
    PURGE_ROLE,
    bootstrap_sql,
)
from roadmaps_api.settings import SettingsError
from tests import harness
from tests.support import DOWN_DATABASE_URL, Lines
from tools import bootstrap_database
from tools.bootstrap_database import (
    ADMIN_DATABASE_URL,
    APP_LOGIN,
    LOGINS,
    MIGRATION_LOGIN,
    PLATFORM_LOGIN,
    PURGE_LOGIN,
    admin_url,
    libpq_url,
)

API_DIR = Path(__file__).parent.parent.parent
PASSWORD = "throwaway-password"  # noqa: S105 - a throwaway login's, on the local container


@dataclass(frozen=True)
class Throwaway:
    """A test's own roles and database, and the file with its role names."""

    prefix: str
    database: str
    runner_url: str

    @property
    def owner(self) -> str:
        return f"{self.prefix}_owner"

    @property
    def migrator(self) -> str:
        return f"{self.prefix}_migrator"

    @property
    def app(self) -> str:
        return f"{self.prefix}_app"

    @property
    def platform(self) -> str:
        return f"{self.prefix}_platform"

    @property
    def purge(self) -> str:
        return f"{self.prefix}_purge"

    @property
    def auth_definer(self) -> str:
        return f"{self.prefix}_auth_definer"

    @property
    def history_definer(self) -> str:
        return f"{self.prefix}_history_definer"

    @property
    def platform_definer(self) -> str:
        return f"{self.prefix}_platform_definer"

    @property
    def definers(self) -> tuple[str, ...]:
        return (self.auth_definer, self.history_definer, self.platform_definer)

    @property
    def all_roles(self) -> tuple[str, ...]:
        return (
            self.owner,
            self.migrator,
            self.app,
            self.platform,
            self.purge,
            *self.definers,
        )

    @property
    def runner(self) -> str:
        return f"{self.prefix}_admin"

    def sql(self) -> str:
        # Replace longer names first so `roadmaps_platform_definer` is not partially
        # rewritten by `roadmaps_platform`.
        replacements = (
            (PLATFORM_DEFINER_ROLE, self.platform_definer),
            (HISTORY_DEFINER_ROLE, self.history_definer),
            (AUTH_DEFINER_ROLE, self.auth_definer),
            (MIGRATION_ROLE, self.migrator),
            (PLATFORM_ROLE, self.platform),
            (OWNER_ROLE, self.owner),
            (PURGE_ROLE, self.purge),
            (APP_ROLE, self.app),
        )
        script = bootstrap_sql()
        for source, target in replacements:
            script = script.replace(source, target)
        return script

    def run(self) -> None:
        """Runs the file as the runner, in one transaction."""
        with psycopg.connect(libpq_url(self.runner_url)) as connection:
            connection.execute(self.sql().encode())

    def admin(self, statement: str) -> None:
        """Runs a superuser's statement on the throwaway database, `{p}` its prefix."""
        with harness.admin(self.database) as connection:
            connection.execute(
                statement.replace("{p}", self.prefix)
                .replace("{database}", sql.Identifier(self.database).as_string(connection))
                .encode()
            )

    def state(self) -> dict[str, Any]:
        """What the file sets, read as the superuser."""
        with harness.admin(self.database) as connection:
            roles = connection.execute(
                "SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,"
                " rolreplication, rolbypassrls FROM pg_roles"
                " WHERE rolname LIKE %s ORDER BY rolname",
                (f"{self.prefix}\\_%",),
            ).fetchall()
            memberships = connection.execute(
                "SELECT roleid::regrole::text, member::regrole::text, grantor::regrole::text,"
                " admin_option, inherit_option, set_option FROM pg_auth_members"
                " WHERE roleid::regrole::text LIKE %s OR member::regrole::text LIKE %s"
                " ORDER BY 1, 2, 3",
                (f"{self.prefix}\\_%", f"{self.prefix}\\_%"),
            ).fetchall()
            database = connection.execute(
                "SELECT datdba::regrole::text, datacl::text[] FROM pg_database"
                " WHERE datname = current_database()"
            ).fetchone()
            defaults = connection.execute(
                "SELECT defaclrole::regrole::text, defaclobjtype, defaclacl::text[]"
                " FROM pg_default_acl ORDER BY 1, 2"
            ).fetchall()
        return {
            "roles": roles,
            "memberships": memberships,
            "database": database,
            "defaults": defaults,
        }


@contextmanager
def throwaway(*, superuser: bool) -> Generator[Throwaway]:
    """A database, and a runner: Compose's superuser, or an admin like Cloud SQL's."""
    prefix = harness.unique_name("boot")
    database = f"{prefix}_db"
    runner = f"{prefix}_admin"
    with harness.admin() as connection:
        if superuser:
            connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))
            runner_url = harness.admin_url(database)
        else:
            connection.execute(
                sql.SQL("CREATE ROLE {} LOGIN CREATEROLE CREATEDB PASSWORD {}").format(
                    sql.Identifier(runner), sql.Literal(PASSWORD)
                )
            )
            connection.execute(
                sql.SQL("CREATE DATABASE {} OWNER {}").format(
                    sql.Identifier(database), sql.Identifier(runner)
                )
            )
            runner_url = harness.login_url(runner, database, PASSWORD)
    try:
        yield Throwaway(prefix=prefix, database=database, runner_url=runner_url)
    finally:
        harness.drop_database(database)
        with harness.admin() as connection:
            names = connection.execute(
                "SELECT rolname FROM pg_roles WHERE rolname LIKE %s ORDER BY rolname = %s, rolname",
                (f"{prefix}\\_%", runner),
            ).fetchall()
            for (name,) in names:
                connection.execute(sql.SQL("DROP ROLE {}").format(sql.Identifier(name)))


RUNNERS = {"a superuser": True, "a non-superuser admin that owns the database": False}


@pytest.mark.parametrize("superuser", RUNNERS.values(), ids=RUNNERS)
def test_the_file_makes_the_roles_and_a_second_run_changes_nothing(*, superuser: bool) -> None:
    with throwaway(superuser=superuser) as boot:
        boot.run()
        first = boot.state()
        boot.run()

        assert boot.state() == first
    roles = {name: attributes for name, *attributes in first["roles"]}
    for role in boot.all_roles:
        assert roles[role] == [False] * 6, f"{role} logs in or has an attribute"
    grants = [
        (member, admin, inherit, set_)
        for role, member, _grantor, admin, inherit, set_ in first["memberships"]
        if role == boot.owner
    ]
    assert (boot.migrator, False, False, True) in grants
    # A non-superuser runner holds the owner role with SET, without INHERIT, beside the
    # ADMIN PostgreSQL gives the role's creator.
    assert {grant[0] for grant in grants} == (
        {boot.migrator} if superuser else {boot.migrator, boot.runner}
    )
    assert all(not inherit for _member, _admin, inherit, _set in grants)
    for definer in boot.definers:
        definer_grants = [
            (member, admin, inherit, set_)
            for role, member, _grantor, admin, inherit, set_ in first["memberships"]
            if role == definer
        ]
        assert (boot.owner, False, False, True) in definer_grants
        assert {grant[0] for grant in definer_grants} == (
            {boot.owner} if superuser else {boot.owner, boot.runner}
        )
        assert all(not inherit for _member, _admin, inherit, _set in definer_grants)
    for inert in (boot.app, boot.platform, boot.purge, *boot.definers):
        assert not [row for row in first["memberships"] if row[1] == inert]
    owner, acl = first["database"]
    assert owner == boot.owner
    # PUBLIC keeps CONNECT and loses TEMPORARY.
    assert f"=c/{boot.owner}" in acl
    assert [(role, kind) for role, kind, _acl in first["defaults"]] == sorted(
        [(role, "f") for role in (boot.owner, *boot.definers)]
    )
    assert all(
        not any(entry.startswith("=") for entry in acl_entries)
        for _role, _kind, acl_entries in first["defaults"]
    )


@pytest.mark.parametrize("superuser", RUNNERS.values(), ids=RUNNERS)
def test_the_file_allows_routines_owned_by_definer_roles_in_public(*, superuser: bool) -> None:
    with throwaway(superuser=superuser) as boot:
        boot.run()
        with harness.admin(boot.database) as connection:
            for definer in boot.definers:
                fn_name = f"{definer}_fn"
                connection.execute(
                    sql.SQL("GRANT CREATE ON SCHEMA public TO {d}").format(
                        d=sql.Identifier(definer)
                    )
                )
                connection.execute(
                    sql.SQL(
                        "CREATE FUNCTION public.{fn}() RETURNS int LANGUAGE sql AS 'SELECT 1'"
                    ).format(fn=sql.Identifier(fn_name))
                )
                connection.execute(
                    sql.SQL("ALTER FUNCTION public.{fn}() OWNER TO {d}").format(
                        fn=sql.Identifier(fn_name), d=sql.Identifier(definer)
                    )
                )
                connection.execute(
                    sql.SQL("REVOKE CREATE ON SCHEMA public FROM {d}").format(
                        d=sql.Identifier(definer)
                    )
                )
        boot.run()


@pytest.mark.parametrize("superuser", RUNNERS.values(), ids=RUNNERS)
def test_the_file_clears_an_attribute_its_runner_may_set(*, superuser: bool) -> None:
    with throwaway(superuser=superuser) as boot:
        boot.run()
        boot.admin("ALTER ROLE {p}_owner CREATEDB LOGIN")
        boot.run()

        roles = {name: attributes for name, *attributes in boot.state()["roles"]}
    assert roles[boot.owner] == [False] * 6


@dataclass(frozen=True)
class Refusal:
    superuser: bool
    # A superuser's statements: before the first run, else after it.
    before: str | None
    after: str | None
    message: str


REFUSALS = {
    "the owner role with a member it did not grant": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_extra; GRANT {p}_owner TO {p}_extra",
        message="{p}_owner has a member it did not grant: {p}_extra (granted by roadmaps)",
    ),
    "the migration role holding the owner role with INHERIT, from another grantor": Refusal(
        superuser=False,
        before=None,
        after="GRANT {p}_owner TO {p}_migrator WITH INHERIT TRUE",
        message="{p}_owner has a member it did not grant: {p}_migrator (granted by roadmaps)",
    ),
    "schema public owned by another role": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_extra; ALTER SCHEMA public OWNER TO {p}_extra",
        message="schema public is owned by {p}_extra",
    ),
    "PUBLIC able to create in schema public": Refusal(
        superuser=True,
        before=None,
        after="GRANT CREATE ON SCHEMA public TO PUBLIC",
        message="PUBLIC can create in schema public",
    ),
    "an object in schema public of another role": Refusal(
        superuser=True,
        before=None,
        after="CREATE TABLE public.planted ()",
        message="schema public holds objects of another role: relation planted (owned by roadmaps)",
    ),
    "an attribute its runner cannot clear": Refusal(
        superuser=False,
        before=None,
        after="ALTER ROLE {p}_app BYPASSRLS",
        message="{p}_app has BYPASSRLS and {p}_admin cannot clear it",
    ),
    "a role its runner cannot administer": Refusal(
        superuser=False,
        before="CREATE ROLE {p}_app NOLOGIN",
        after=None,
        message="{p}_app exists and {p}_admin cannot administer it",
    ),
    "the owner role a member of another": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_extra; GRANT {p}_extra TO {p}_owner",
        message="a role holds one the file did not grant: {p}_owner holds {p}_extra",
    ),
    "the migration role a member of a role but the owner": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_extra; GRANT {p}_extra TO {p}_migrator",
        message="a role holds one the file did not grant: {p}_migrator holds {p}_extra",
    ),
    "the application's role a member of another": Refusal(
        superuser=True,
        before=None,
        after="GRANT {p}_migrator TO {p}_app",
        message="{p}_app is a member of {p}_migrator",
    ),
    "a role in both the migration and the application's roles": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_login LOGIN; GRANT {p}_migrator, {p}_app TO {p}_login",
        message="{p}_login is a member of both {p}_app and {p}_migrator",
    ),
    "a role in both the application and platform caller roles": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_login LOGIN; GRANT {p}_app, {p}_platform TO {p}_login",
        message="{p}_login is a member of both {p}_app and {p}_platform",
    ),
    "a role in both the platform and purge caller roles": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_login LOGIN; GRANT {p}_platform, {p}_purge TO {p}_login",
        message="{p}_login is a member of both {p}_platform and {p}_purge",
    ),
    "a definer role with a member it did not grant": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_extra; GRANT {p}_auth_definer TO {p}_extra",
        message="{p}_auth_definer has a member it did not grant: {p}_extra (granted by roadmaps)",
    ),
    "a definer role held by the owner with INHERIT": Refusal(
        superuser=False,
        before=None,
        after="GRANT {p}_history_definer TO {p}_owner WITH INHERIT TRUE",
        message=(
            "{p}_history_definer has a member it did not grant: {p}_owner (granted by roadmaps)"
        ),
    ),
    "a definer role a member of another role": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_extra; GRANT {p}_extra TO {p}_platform_definer",
        message="{p}_platform_definer is a member of {p}_extra",
    ),
    "the platform caller role a member of another role": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_extra; GRANT {p}_extra TO {p}_platform",
        message="{p}_platform is a member of {p}_extra",
    ),
    "the purge caller role a member of another role": Refusal(
        superuser=True,
        before=None,
        after="CREATE ROLE {p}_extra; GRANT {p}_extra TO {p}_purge",
        message="{p}_purge is a member of {p}_extra",
    ),
    "a non-routine object in public owned by a definer role": Refusal(
        superuser=True,
        before=None,
        after=(
            "CREATE TABLE public.planted (); ALTER TABLE public.planted OWNER TO {p}_auth_definer"
        ),
        message=(
            "schema public holds objects of another role: "
            "relation planted (owned by {p}_auth_definer)"
        ),
    ),
    "a definer role holding CREATE on schema public": Refusal(
        superuser=True,
        before=None,
        after="GRANT CREATE ON SCHEMA public TO {p}_history_definer",
        message="{p}_history_definer holds CREATE on schema public",
    ),
    "a definer role holding CREATE on the database": Refusal(
        superuser=True,
        before=None,
        after="GRANT CREATE ON DATABASE {database} TO {p}_platform_definer",
        message="{p}_platform_definer holds CREATE on database",
    ),
}


@pytest.mark.parametrize("refusal", REFUSALS.values(), ids=REFUSALS)
def test_the_file_stops_naming_what_it_found_and_changes_nothing(refusal: Refusal) -> None:
    with throwaway(superuser=refusal.superuser) as boot:
        if refusal.before is not None:
            boot.admin(refusal.before)
        else:
            boot.run()
        if refusal.after is not None:
            boot.admin(refusal.after)
        before = boot.state()

        with pytest.raises(psycopg.errors.RaiseException) as raised:
            boot.run()

        assert raised.value.diag.message_primary == "bootstrap: " + refusal.message.replace(
            "{p}", boot.prefix
        )
        assert boot.state() == before


def shared_logins() -> list[tuple[Any, ...]]:
    """The local logins' attributes and the roles each is a member of."""
    with harness.admin() as connection:
        return connection.execute(
            "SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,"
            " rolreplication, rolbypassrls,"
            " ARRAY(SELECT roleid::regrole::text FROM pg_auth_members WHERE member = pg_roles.oid)"
            " FROM pg_roles WHERE rolname = ANY(%s) ORDER BY rolname",
            (list(LOGINS),),
        ).fetchall()


@pytest.fixture
def bootstrapped_database() -> Iterator[str]:
    """A throwaway database that only the runner bootstraps."""
    name = harness.unique_name("boot")
    with harness.admin() as connection:
        connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    yield name
    harness.drop_database(name)


def run_runner(environment: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "tools.bootstrap_database"],
        cwd=API_DIR,
        env={**os.environ, **environment},
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )


@pytest.mark.usefixtures("shared_roles")
def test_the_runner_makes_four_logins_each_in_one_role_and_a_second_run_changes_nothing(
    bootstrapped_database: str,
) -> None:
    environment = {
        "ROADMAPS_ENV": "test",
        ADMIN_DATABASE_URL: harness.admin_url(bootstrapped_database),
    }

    first = run_runner(environment)
    after_first = shared_logins()
    second = run_runner(environment)

    assert (first.returncode, second.returncode) == (0, 0), first.stderr + second.stderr
    assert shared_logins() == after_first
    assert after_first == [
        (APP_LOGIN, True, False, False, False, False, False, [APP_ROLE]),
        (MIGRATION_LOGIN, True, False, False, False, False, False, [MIGRATION_ROLE]),
        (PLATFORM_LOGIN, True, False, False, False, False, False, [PLATFORM_ROLE]),
        (PURGE_LOGIN, True, False, False, False, False, False, [PURGE_ROLE]),
    ]
    with harness.admin(bootstrapped_database) as connection:
        owner = connection.execute(
            "SELECT datdba::regrole::text FROM pg_database WHERE datname = current_database()"
        ).fetchone()
    assert owner == (OWNER_ROLE,)
    assert json.loads(second.stdout.splitlines()[-1])["message"] == "bootstrap.done"


@pytest.mark.usefixtures("shared_roles")
def test_the_runner_creates_a_missing_login_with_its_fixed_password(
    bootstrapped_database: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    login = harness.unique_name("boot_login")
    monkeypatch.setattr(bootstrap_database, "LOGINS", {login: APP_ROLE})
    try:
        bootstrap_database.bootstrap(harness.admin_url(bootstrapped_database))

        with psycopg.connect(
            libpq_url(harness.login_url(login, bootstrapped_database))
        ) as connection:
            roles = connection.execute(
                "SELECT roleid::regrole::text FROM pg_auth_members"
                " WHERE member = session_user::regrole"
            ).fetchall()
        assert roles == [(APP_ROLE,)]
    finally:
        with harness.admin() as connection:
            connection.execute(sql.SQL("DROP ROLE {}").format(sql.Identifier(login)))


@pytest.mark.usefixtures("shared_roles", "json_logging")
def test_the_runner_reports_the_file_s_refusal(
    bootstrapped_database: str, capsys: pytest.CaptureFixture[str]
) -> None:
    with harness.admin(bootstrapped_database) as connection:
        connection.execute("CREATE TABLE public.planted ()")

    code = bootstrap_database.main(
        {"ROADMAPS_ENV": "local", ADMIN_DATABASE_URL: harness.admin_url(bootstrapped_database)}
    )

    assert code == 1
    assert "schema public holds objects of another role" in capsys.readouterr().err


def test_the_runner_logs_a_failure_s_type(lines: Lines) -> None:
    code = bootstrap_database.main({"ROADMAPS_ENV": "local", ADMIN_DATABASE_URL: DOWN_DATABASE_URL})

    [line] = lines.read()
    assert code == 1
    assert (line["message"], line["exception_type"]) == (
        "bootstrap.failed",
        "psycopg.OperationalError",
    )


def test_the_runner_refuses_an_admin_login_that_is_not_a_superuser(
    lines: Lines, database_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    # libpq's environment cannot send the runner elsewhere: it connects to the URL's
    # address, not to an unroutable one.
    monkeypatch.setenv("PGHOSTADDR", "192.0.2.1")
    monkeypatch.setenv("PGCONNECT_TIMEOUT", "2")

    with pytest.raises(SettingsError) as raised:
        bootstrap_database.bootstrap(database_url)

    assert raised.value.invalid == [ADMIN_DATABASE_URL]
    [line] = lines.read()
    assert line["invalid_settings"] == [ADMIN_DATABASE_URL]


SECRET = "SECRET-PASSWORD"  # noqa: S105 - planted, to show it is never written
LOCAL_URL = f"postgresql+psycopg://roadmaps:{SECRET}@127.0.0.1:5432/roadmaps"
BAD_RUNS: dict[str, tuple[dict[str, str], list[str]]] = {
    "an unset environment": ({ADMIN_DATABASE_URL: LOCAL_URL}, ["ROADMAPS_ENV"]),
    "production": (
        {"ROADMAPS_ENV": "production", ADMIN_DATABASE_URL: LOCAL_URL},
        ["ROADMAPS_ENV"],
    ),
    "an unknown environment": (
        {"ROADMAPS_ENV": SECRET, ADMIN_DATABASE_URL: LOCAL_URL},
        ["ROADMAPS_ENV"],
    ),
    "no admin URL": ({"ROADMAPS_ENV": "local"}, [ADMIN_DATABASE_URL]),
    "another driver's URL": (
        {"ROADMAPS_ENV": "local", ADMIN_DATABASE_URL: LOCAL_URL.replace("+psycopg", "")},
        [ADMIN_DATABASE_URL],
    ),
    **{
        f"a host {host} that is not a loopback address": (
            {"ROADMAPS_ENV": "test", ADMIN_DATABASE_URL: LOCAL_URL.replace("127.0.0.1", host)},
            [ADMIN_DATABASE_URL],
        )
        for host in ("db.example", "10.0.0.5", "localhost")
    },
    **{
        f"a {parameter} parameter libpq would connect by": (
            {"ROADMAPS_ENV": "local", ADMIN_DATABASE_URL: f"{LOCAL_URL}?{parameter}={value}"},
            [ADMIN_DATABASE_URL],
        )
        for parameter, value in (
            ("host", "db.example"),
            ("hostaddr", "10.0.0.5"),
            ("service", "prod"),
        )
    },
    "a socket and no host": (
        {
            "ROADMAPS_ENV": "local",
            ADMIN_DATABASE_URL: f"postgresql+psycopg://roadmaps:{SECRET}@/roadmaps",
        },
        [ADMIN_DATABASE_URL],
    ),
}


@pytest.mark.usefixtures("json_logging")
@pytest.mark.parametrize(("environ", "named"), BAD_RUNS.values(), ids=BAD_RUNS)
def test_the_runner_refuses_outside_a_local_database_naming_the_setting_never_its_value(
    capsys: pytest.CaptureFixture[str],
    environ: dict[str, str],
    named: list[str],
) -> None:
    with pytest.raises(SettingsError) as raised:
        admin_url(environ)
    code = bootstrap_database.main(environ)

    captured = capsys.readouterr()
    assert (raised.value.invalid, code) == (named, 1)
    assert SECRET not in str(raised.value) + captured.out + captured.err


LOOPBACKS = ["127.0.0.1", "127.0.0.2", "[::1]"]


@pytest.mark.parametrize("host", LOOPBACKS)
def test_the_runner_takes_an_admin_url_on_a_loopback_address(host: str) -> None:
    url = LOCAL_URL.replace("127.0.0.1", host)

    assert admin_url({"ROADMAPS_ENV": "local", ADMIN_DATABASE_URL: url}) == url
