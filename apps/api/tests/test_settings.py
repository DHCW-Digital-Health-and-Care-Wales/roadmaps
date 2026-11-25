"""Settings come from environment variables only and fail closed."""

from pathlib import Path

import pytest

from roadmaps_api.settings import Environment, SettingsError, load_settings

URL = "postgresql+psycopg://roadmaps:SECRET-PASSWORD@db.example:5432/roadmaps"
VALID = {"ROADMAPS_DATABASE_URL": URL, "ROADMAPS_ALLOWED_HOSTS": "api.example"}


def test_an_unset_environment_gets_production_rules() -> None:
    settings = load_settings(VALID)

    assert settings.environment is Environment.PRODUCTION
    assert not settings.serves_live_openapi
    assert settings.allowed_hosts == ("api.example",)
    assert settings.database_url == URL


def test_a_local_environment_serves_the_live_openapi() -> None:
    settings = load_settings(
        {**VALID, "ROADMAPS_ENV": "local", "ROADMAPS_ALLOWED_HOSTS": "localhost, 127.0.0.1"}
    )

    assert settings.serves_live_openapi
    assert settings.allowed_hosts == ("localhost", "127.0.0.1")


BAD = {
    "an unknown environment": ({"ROADMAPS_ENV": "staging"}, ["ROADMAPS_ENV"]),
    "an empty environment": ({"ROADMAPS_ENV": ""}, ["ROADMAPS_ENV"]),
    "an unset database URL": ({"ROADMAPS_DATABASE_URL": None}, ["ROADMAPS_DATABASE_URL"]),
    "an empty database URL": ({"ROADMAPS_DATABASE_URL": " "}, ["ROADMAPS_DATABASE_URL"]),
    "a database URL for another driver": (
        {"ROADMAPS_DATABASE_URL": "postgresql://u:SECRET-PASSWORD@db/x"},
        ["ROADMAPS_DATABASE_URL"],
    ),
    "a database URL SQLAlchemy cannot parse": (
        {"ROADMAPS_DATABASE_URL": "postgresql+psycopg://u:p@s:SECRET-PASSWORD@db/x"},
        ["ROADMAPS_DATABASE_URL"],
    ),
    "a database URL whose port is not a number": (
        {"ROADMAPS_DATABASE_URL": "postgresql+psycopg://u:p@db:SECRET-PASSWORD/x"},
        ["ROADMAPS_DATABASE_URL"],
    ),
    "unset allowed hosts": ({"ROADMAPS_ALLOWED_HOSTS": None}, ["ROADMAPS_ALLOWED_HOSTS"]),
    "empty allowed hosts": ({"ROADMAPS_ALLOWED_HOSTS": ""}, ["ROADMAPS_ALLOWED_HOSTS"]),
    "an empty entry among the hosts": (
        {"ROADMAPS_ALLOWED_HOSTS": "api.example,,b.example"},
        ["ROADMAPS_ALLOWED_HOSTS"],
    ),
    **{
        f"{pattern} among the hosts with ROADMAPS_ENV {environment or 'unset'}": (
            {"ROADMAPS_ENV": environment, "ROADMAPS_ALLOWED_HOSTS": f"localhost,{pattern}"},
            ["ROADMAPS_ALLOWED_HOSTS"],
        )
        for pattern in ("*", "*.example")
        for environment in ("local", "test", "production", None)
    },
    # No API process holds the migration login, in any environment (STY-091 S3, D31).
    **{
        f"the migration login's URL with ROADMAPS_ENV {environment or 'unset'}": (
            {"ROADMAPS_ENV": environment, "ROADMAPS_MIGRATION_DATABASE_URL": URL},
            ["ROADMAPS_MIGRATION_DATABASE_URL"],
        )
        for environment in ("local", "test", "production", None)
    },
    "an empty migration login's URL": (
        {"ROADMAPS_MIGRATION_DATABASE_URL": ""},
        ["ROADMAPS_MIGRATION_DATABASE_URL"],
    ),
    "several bad settings": (
        {"ROADMAPS_ENV": "prod", "ROADMAPS_DATABASE_URL": None, "ROADMAPS_ALLOWED_HOSTS": None},
        ["ROADMAPS_ENV", "ROADMAPS_DATABASE_URL", "ROADMAPS_ALLOWED_HOSTS"],
    ),
}


@pytest.mark.parametrize(("changes", "named"), BAD.values(), ids=BAD)
def test_start_up_stops_naming_each_bad_setting_never_its_value(
    changes: dict[str, str | None], named: list[str]
) -> None:
    environ = {**VALID, **changes}
    environ = {name: value for name, value in environ.items() if value is not None}

    with pytest.raises(SettingsError) as raised:
        load_settings(environ)

    assert raised.value.invalid == named
    for name in named:
        assert name in str(raised.value)
    assert "SECRET-PASSWORD" not in str(raised.value)
    assert "staging" not in str(raised.value)
    assert "*" not in str(raised.value)


def test_settings_come_from_the_environment_never_a_dotenv_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / ".env").write_text("ROADMAPS_ENV=local\n")
    monkeypatch.chdir(tmp_path)
    for name, value in VALID.items():
        monkeypatch.setenv(name, value)
    monkeypatch.delenv("ROADMAPS_ENV", raising=False)

    assert load_settings().environment is Environment.PRODUCTION


def test_the_settings_repr_leaves_out_the_database_url() -> None:
    assert "SECRET-PASSWORD" not in repr(load_settings(VALID))
