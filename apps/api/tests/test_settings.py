"""S6: settings come from environment variables only and fail closed."""

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


def test_a_local_environment_serves_the_live_openapi_and_may_list_wildcards() -> None:
    settings = load_settings(
        {**VALID, "ROADMAPS_ENV": "local", "ROADMAPS_ALLOWED_HOSTS": "localhost, *"}
    )

    assert settings.serves_live_openapi
    assert settings.allowed_hosts == ("localhost", "*")


BAD = {
    "an unknown environment": ({"ROADMAPS_ENV": "staging"}, ["ROADMAPS_ENV"]),
    "an empty environment": ({"ROADMAPS_ENV": ""}, ["ROADMAPS_ENV"]),
    "an unset database URL": ({"ROADMAPS_DATABASE_URL": None}, ["ROADMAPS_DATABASE_URL"]),
    "an empty database URL": ({"ROADMAPS_DATABASE_URL": " "}, ["ROADMAPS_DATABASE_URL"]),
    "a database URL for another driver": (
        {"ROADMAPS_DATABASE_URL": "postgresql://u:SECRET-PASSWORD@db/x"},
        ["ROADMAPS_DATABASE_URL"],
    ),
    "unset allowed hosts": ({"ROADMAPS_ALLOWED_HOSTS": None}, ["ROADMAPS_ALLOWED_HOSTS"]),
    "empty allowed hosts": ({"ROADMAPS_ALLOWED_HOSTS": ""}, ["ROADMAPS_ALLOWED_HOSTS"]),
    "an empty entry among the hosts": (
        {"ROADMAPS_ALLOWED_HOSTS": "api.example,,b.example"},
        ["ROADMAPS_ALLOWED_HOSTS"],
    ),
    "a wildcard host in production": (
        {"ROADMAPS_ALLOWED_HOSTS": "*.example"},
        ["ROADMAPS_ALLOWED_HOSTS"],
    ),
    "a wildcard host in test": (
        {"ROADMAPS_ENV": "test", "ROADMAPS_ALLOWED_HOSTS": "*"},
        ["ROADMAPS_ALLOWED_HOSTS"],
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


def test_settings_come_from_the_environment_never_a_dotenv_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / ".env").write_text("ROADMAPS_ENV=local\n")
    monkeypatch.chdir(tmp_path)
    for name, value in VALID.items():
        monkeypatch.setenv(name, value)
    monkeypatch.delenv("ROADMAPS_ENV", raising=False)

    assert load_settings().environment is Environment.PRODUCTION
