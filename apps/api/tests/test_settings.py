"""Settings come from environment variables only and fail closed."""

from pathlib import Path
from uuid import UUID

import pytest

from roadmaps_api.settings import (
    CLOUD_RUN_MARKERS,
    Environment,
    Settings,
    SettingsError,
    load_settings,
    parse_loopback_http_origin,
)

URL = "postgresql+psycopg://roadmaps:SECRET-PASSWORD@db.example:5432/roadmaps"
VALID = {
    "ROADMAPS_DATABASE_URL": URL,
    "ROADMAPS_ALLOWED_HOSTS": "api.example",
    "ROADMAPS_EDITOR_ORIGIN": "https://api.example",
    "ROADMAPS_GOOGLE_CLIENT_ID": "test-google-client-id",
    "ROADMAPS_GOOGLE_CLIENT_SECRET": "SECRET-PASSWORD-GOOGLE",
    "ROADMAPS_GOOGLE_ALLOWED_HD": "wales.nhs.uk",
}


def test_an_unset_environment_gets_production_rules() -> None:
    settings = load_settings(VALID)

    assert settings.environment is Environment.PRODUCTION
    assert not settings.serves_live_openapi
    assert settings.allowed_hosts == ("api.example",)
    assert settings.editor_origin == "https://api.example"
    assert settings.database_url == URL
    assert settings.otlp_endpoint is None
    assert settings.service_name == "roadmaps-api"
    assert settings.google_client_id == "test-google-client-id"
    assert settings.google_client_secret == "SECRET-PASSWORD-GOOGLE"  # noqa: S105 - synthetic test
    assert settings.google_allowed_hd == ("wales.nhs.uk",)
    assert settings.local_mock_oidc_url is None
    assert settings.session_cookie_name == "__Host-session"
    assert settings.transaction_cookie_prefix == "__Host-tx-"


TRACING = {
    "an OTLP endpoint": (
        {"OTEL_EXPORTER_OTLP_ENDPOINT": " http://127.0.0.1:4318/ "},
        "http://127.0.0.1:4318",
        "roadmaps-api",
    ),
    "an empty OTLP endpoint, which OpenTelemetry reads as unset": (
        {"OTEL_EXPORTER_OTLP_ENDPOINT": ""},
        None,
        "roadmaps-api",
    ),
    "a worktree's service name": (
        {"ROADMAPS_SERVICE_NAME": "roadmaps-api-42"},
        None,
        "roadmaps-api-42",
    ),
}


@pytest.mark.parametrize(("changes", "endpoint", "service"), TRACING.values(), ids=TRACING)
def test_tracing_exports_to_the_otlp_endpoint_under_the_service_s_name(
    changes: dict[str, str], endpoint: str | None, service: str
) -> None:
    settings = load_settings({**VALID, **changes})

    assert settings.otlp_endpoint == endpoint
    assert settings.service_name == service


def test_a_local_environment_serves_the_live_openapi() -> None:
    settings = load_settings(
        {
            **VALID,
            "ROADMAPS_ENV": "local",
            "ROADMAPS_ALLOWED_HOSTS": "localhost, 127.0.0.1",
            "ROADMAPS_EDITOR_ORIGIN": "http://localhost:5173",
        }
    )

    assert settings.serves_live_openapi
    assert settings.allowed_hosts == ("localhost", "127.0.0.1")
    assert settings.editor_origin == "http://localhost:5173"
    assert settings.session_cookie_name == "__Host-5173-session"
    tx_id = UUID("01950000-0000-7000-8000-000000000001")
    assert settings.transaction_cookie_name(tx_id) == f"__Host-5173-tx-{tx_id.hex}"


def test_local_and_test_allow_omitting_google_and_enabling_loopback_mock() -> None:
    base = {
        "ROADMAPS_DATABASE_URL": URL,
        "ROADMAPS_ALLOWED_HOSTS": "localhost,127.0.0.1",
        "ROADMAPS_EDITOR_ORIGIN": "http://localhost:21640",
    }
    for env in ("local", "test"):
        without_providers = load_settings({**base, "ROADMAPS_ENV": env})
        assert without_providers.google_client_id is None
        assert without_providers.google_client_secret is None
        assert without_providers.google_allowed_hd == ()
        assert without_providers.local_mock_oidc_url is None

        with_mock = load_settings(
            {
                **base,
                "ROADMAPS_ENV": env,
                "ROADMAPS_LOCAL_MOCK_OIDC_URL": "http://127.0.0.1:21646",
            }
        )
        assert with_mock.local_mock_oidc_url == "http://127.0.0.1:21646"

    local_default_port = load_settings(
        {**base, "ROADMAPS_ENV": "local", "ROADMAPS_EDITOR_ORIGIN": "http://localhost"}
    )
    assert local_default_port.session_cookie_name == "__Host-80-session"
    test_mode = load_settings({**base, "ROADMAPS_ENV": "test"})
    assert test_mode.session_cookie_name == "__Host-session"

    # Cloud Run never prefixes cookies with a local port even if ROADMAPS_ENV=local.
    cloud_run_local = load_settings({**VALID, "ROADMAPS_ENV": "local", "K_SERVICE": "roadmaps-api"})
    assert cloud_run_local.session_cookie_name == "__Host-session"
    assert cloud_run_local.transaction_cookie_prefix == "__Host-tx-"


EDITOR_ORIGINS = {
    "uppercase scheme and host canonicalised": (
        {"ROADMAPS_EDITOR_ORIGIN": "HTTPS://API.EXAMPLE"},
        "https://api.example",
    ),
    "default https port 443 stripped": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:443"},
        "https://api.example",
    ),
    "non-default https port preserved": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:8443"},
        "https://api.example:8443",
    ),
    "default http port 80 stripped in local": (
        {"ROADMAPS_ENV": "local", "ROADMAPS_EDITOR_ORIGIN": "http://localhost:80"},
        "http://localhost",
    ),
    "non-default http port preserved in local": (
        {"ROADMAPS_ENV": "local", "ROADMAPS_EDITOR_ORIGIN": "http://localhost:21640"},
        "http://localhost:21640",
    ),
    "port 443 preserved on http in test": (
        {"ROADMAPS_ENV": "test", "ROADMAPS_EDITOR_ORIGIN": "http://localhost:443"},
        "http://localhost:443",
    ),
    "port 80 preserved on https": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:80"},
        "https://api.example:80",
    ),
    "IPv6 literal with port in local": (
        {"ROADMAPS_ENV": "local", "ROADMAPS_EDITOR_ORIGIN": "http://[::1]:5173"},
        "http://[::1]:5173",
    ),
    "IPv6 literal with default https port stripped when listed": (
        {
            "ROADMAPS_ALLOWED_HOSTS": "[::1]",
            "ROADMAPS_EDITOR_ORIGIN": "https://[::1]:443",
        },
        "https://[::1]",
    ),
}


@pytest.mark.parametrize(("changes", "expected"), EDITOR_ORIGINS.values(), ids=EDITOR_ORIGINS)
def test_editor_origin_is_canonicalised(changes: dict[str, str], expected: str) -> None:
    settings = load_settings({**VALID, **changes})

    assert settings.editor_origin == expected


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
    # No API process holds the purge login, in any environment (STY-106 D15).
    **{
        f"the purge login's URL with ROADMAPS_ENV {environment or 'unset'}": (
            {"ROADMAPS_ENV": environment, "ROADMAPS_PURGE_DATABASE_URL": URL},
            ["ROADMAPS_PURGE_DATABASE_URL"],
        )
        for environment in ("local", "test", "production", None)
    },
    "an empty purge login's URL": (
        {"ROADMAPS_PURGE_DATABASE_URL": ""},
        ["ROADMAPS_PURGE_DATABASE_URL"],
    ),
    # Google OIDC settings required in production / unset / invalid / Cloud Run (D8).
    "missing Google client id in production": (
        {"ROADMAPS_GOOGLE_CLIENT_ID": None},
        ["ROADMAPS_GOOGLE_CLIENT_ID"],
    ),
    "missing Google client secret in production": (
        {"ROADMAPS_GOOGLE_CLIENT_SECRET": None},
        ["ROADMAPS_GOOGLE_CLIENT_SECRET"],
    ),
    "missing Google allowed hd in production": (
        {"ROADMAPS_GOOGLE_ALLOWED_HD": None},
        ["ROADMAPS_GOOGLE_ALLOWED_HD"],
    ),
    "wildcard Google allowed hd": (
        {"ROADMAPS_GOOGLE_ALLOWED_HD": "*.wales.nhs.uk"},
        ["ROADMAPS_GOOGLE_ALLOWED_HD"],
    ),
    "blank entry in Google allowed hd": (
        {"ROADMAPS_GOOGLE_ALLOWED_HD": "wales.nhs.uk,,dhcw.example"},
        ["ROADMAPS_GOOGLE_ALLOWED_HD"],
    ),
    "partial Google settings in local": (
        {
            "ROADMAPS_ENV": "local",
            "ROADMAPS_GOOGLE_CLIENT_SECRET": None,
            "ROADMAPS_GOOGLE_ALLOWED_HD": None,
        },
        ["ROADMAPS_GOOGLE_CLIENT_SECRET", "ROADMAPS_GOOGLE_ALLOWED_HD"],
    ),
    **{
        f"missing Google settings in {env} with {marker} set": (
            {
                "ROADMAPS_ENV": env,
                marker: "1",
                "ROADMAPS_GOOGLE_CLIENT_ID": None,
                "ROADMAPS_GOOGLE_CLIENT_SECRET": None,
                "ROADMAPS_GOOGLE_ALLOWED_HD": None,
            },
            [
                "ROADMAPS_GOOGLE_CLIENT_ID",
                "ROADMAPS_GOOGLE_CLIENT_SECRET",
                "ROADMAPS_GOOGLE_ALLOWED_HD",
            ],
        )
        for env in ("local", "test")
        for marker in CLOUD_RUN_MARKERS
    },
    # Local mock provider strictly refused outside local/test or on Cloud Run (S4, D5, D8).
    **{
        f"local mock OIDC URL with ROADMAPS_ENV {environment or 'unset'}": (
            {
                "ROADMAPS_ENV": environment,
                "ROADMAPS_LOCAL_MOCK_OIDC_URL": "http://127.0.0.1:8001",
            },
            ["ROADMAPS_LOCAL_MOCK_OIDC_URL"]
            if environment != "staging"
            else ["ROADMAPS_ENV", "ROADMAPS_LOCAL_MOCK_OIDC_URL"],
        )
        for environment in ("production", None, "staging")
    },
    **{
        f"local mock OIDC URL in {env} with {marker} set": (
            {
                "ROADMAPS_ENV": env,
                marker: "1",
                "ROADMAPS_LOCAL_MOCK_OIDC_URL": "http://127.0.0.1:8001",
            },
            ["ROADMAPS_LOCAL_MOCK_OIDC_URL"],
        )
        for env in ("local", "test")
        for marker in CLOUD_RUN_MARKERS
    },
    "non-loopback local mock OIDC URL in local": (
        {
            "ROADMAPS_ENV": "local",
            "ROADMAPS_LOCAL_MOCK_OIDC_URL": "http://evil.example:8001",
        },
        ["ROADMAPS_LOCAL_MOCK_OIDC_URL"],
    ),
    "https local mock OIDC URL with path in local": (
        {
            "ROADMAPS_ENV": "local",
            "ROADMAPS_LOCAL_MOCK_OIDC_URL": "http://127.0.0.1:8001/extra",
        },
        ["ROADMAPS_LOCAL_MOCK_OIDC_URL"],
    ),
    "an OTLP endpoint that is not an HTTP URL": (
        {"OTEL_EXPORTER_OTLP_ENDPOINT": "SECRET-PASSWORD"},
        ["OTEL_EXPORTER_OTLP_ENDPOINT"],
    ),
    "an OTLP endpoint of a slash alone": (
        {"OTEL_EXPORTER_OTLP_ENDPOINT": "/"},
        ["OTEL_EXPORTER_OTLP_ENDPOINT"],
    ),
    "an OTLP endpoint with no host": (
        {"OTEL_EXPORTER_OTLP_ENDPOINT": "http:///SECRET-PASSWORD"},
        ["OTEL_EXPORTER_OTLP_ENDPOINT"],
    ),
    "an OTLP endpoint whose port is not a number": (
        {"OTEL_EXPORTER_OTLP_ENDPOINT": "http://collector:SECRET-PASSWORD"},
        ["OTEL_EXPORTER_OTLP_ENDPOINT"],
    ),
    "a service name with a character outside a-z, 0-9 and -": (
        {"ROADMAPS_SERVICE_NAME": "roadmaps api*"},
        ["ROADMAPS_SERVICE_NAME"],
    ),
    "an empty service name": ({"ROADMAPS_SERVICE_NAME": ""}, ["ROADMAPS_SERVICE_NAME"]),
    "several bad settings": (
        {"ROADMAPS_ENV": "prod", "ROADMAPS_DATABASE_URL": None, "ROADMAPS_ALLOWED_HOSTS": None},
        ["ROADMAPS_ENV", "ROADMAPS_DATABASE_URL", "ROADMAPS_ALLOWED_HOSTS"],
    ),
    "an unset editor origin": ({"ROADMAPS_EDITOR_ORIGIN": None}, ["ROADMAPS_EDITOR_ORIGIN"]),
    "an empty editor origin": ({"ROADMAPS_EDITOR_ORIGIN": " "}, ["ROADMAPS_EDITOR_ORIGIN"]),
    "an editor origin with a trailing slash": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example/"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with a path": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example/app"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with a query": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example?a=1"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with an empty query mark": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example?"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with a fragment": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example#top"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with an empty fragment mark": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example#"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with userinfo": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://user:SECRET-PASSWORD@api.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with empty userinfo": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://@api.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with a wildcard": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://*.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with a non-http scheme": (
        {"ROADMAPS_EDITOR_ORIGIN": "ftp://api.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin without scheme separator": (
        {"ROADMAPS_EDITOR_ORIGIN": "https:api.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with no host": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://:443"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with empty port": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with port zero": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:0"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with port out of range": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:65536"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with non-numeric port": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:SECRET-PASSWORD"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with signed port": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:+443"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with leading-zero port": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api.example:0443"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin with internal whitespace": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://api .example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an http editor origin in production": (
        {"ROADMAPS_ENV": "production", "ROADMAPS_EDITOR_ORIGIN": "http://api.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an http editor origin with ROADMAPS_ENV unset": (
        {"ROADMAPS_EDITOR_ORIGIN": "http://api.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an http editor origin with invalid ROADMAPS_ENV": (
        {"ROADMAPS_ENV": "staging", "ROADMAPS_EDITOR_ORIGIN": "http://api.example"},
        ["ROADMAPS_ENV", "ROADMAPS_EDITOR_ORIGIN"],
    ),
    **{
        f"an http editor origin in {env} with {marker} set": (
            {"ROADMAPS_ENV": env, marker: "1", "ROADMAPS_EDITOR_ORIGIN": "http://api.example"},
            ["ROADMAPS_EDITOR_ORIGIN"],
        )
        for env in ("local", "test")
        for marker in CLOUD_RUN_MARKERS
    },
    "an editor origin whose host is not in allowed hosts in production": (
        {"ROADMAPS_ENV": "production", "ROADMAPS_EDITOR_ORIGIN": "https://other.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    "an editor origin whose host is not in allowed hosts when ROADMAPS_ENV unset": (
        {"ROADMAPS_EDITOR_ORIGIN": "https://other.example"},
        ["ROADMAPS_EDITOR_ORIGIN"],
    ),
    **{
        f"an editor origin host outside allowed hosts in {env} with {marker} set": (
            {"ROADMAPS_ENV": env, marker: "1", "ROADMAPS_EDITOR_ORIGIN": "https://other.example"},
            ["ROADMAPS_EDITOR_ORIGIN"],
        )
        for env in ("local", "test")
        for marker in CLOUD_RUN_MARKERS
    },
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


def test_the_settings_repr_leaves_out_the_database_url_and_the_otlp_endpoint() -> None:
    settings = load_settings(
        {
            **VALID,
            "OTEL_EXPORTER_OTLP_ENDPOINT": "https://u:SECRET-PASSWORD@collector.example",
            "ROADMAPS_GOOGLE_CLIENT_SECRET": "TOP-SECRET-OIDC-VALUE",
        }
    )

    rendered = repr(settings)
    assert "SECRET-PASSWORD" not in rendered
    assert "TOP-SECRET-OIDC-VALUE" not in rendered


@pytest.mark.parametrize(
    ("raw_origin", "expected"),
    [
        ("http://127.0.0.1:8001", "http://127.0.0.1:8001"),
        ("http://localhost:8001", "http://localhost:8001"),
        ("http://[::1]:8001", "http://[::1]:8001"),
        ("http://0.0.0.0:8001", None),
        ("http://[::]:8001", None),
        ("http://[0:0:0:0:0:0:0:0]:8001", None),
        ("http://[::ffff:0.0.0.0]:8001", None),
        ("https://127.0.0.1:8001", None),
    ],
)
def test_parse_loopback_http_origin_allows_loopback_and_rejects_unspecified_hosts(
    raw_origin: str, expected: str | None
) -> None:
    assert parse_loopback_http_origin(raw_origin) == expected


def test_blank_local_mock_oidc_url_is_treated_as_unset() -> None:
    local_empty_mock = load_settings(
        {
            "ROADMAPS_ENV": "local",
            "ROADMAPS_DATABASE_URL": VALID["ROADMAPS_DATABASE_URL"],
            "ROADMAPS_ALLOWED_HOSTS": "localhost",
            "ROADMAPS_EDITOR_ORIGIN": "http://localhost:5173",
            "ROADMAPS_LOCAL_MOCK_OIDC_URL": "   ",
        }
    )
    assert local_empty_mock.local_mock_oidc_url is None


def test_direct_settings_construction_refuses_invalid_editor_origin() -> None:
    with pytest.raises(SettingsError) as raised:
        Settings(
            environment=Environment.TEST,
            database_url=URL,
            allowed_hosts=("api.example",),
            editor_origin="not-an-origin",
        )
    assert raised.value.invalid == ["ROADMAPS_EDITOR_ORIGIN"]
