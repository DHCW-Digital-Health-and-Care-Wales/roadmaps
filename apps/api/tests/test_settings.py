"""Settings come from environment variables only and fail closed."""

import os
import shutil
import stat
import subprocess
from pathlib import Path

import pytest

from roadmaps_api.settings import CLOUD_RUN_MARKERS, Environment, SettingsError, load_settings

API_DIR = Path(__file__).parent.parent
URL = "postgresql+psycopg://roadmaps:SECRET-PASSWORD@db.example:5432/roadmaps"
VALID = {
    "ROADMAPS_DATABASE_URL": URL,
    "ROADMAPS_ALLOWED_HOSTS": "api.example",
    "ROADMAPS_EDITOR_ORIGIN": "https://api.example",
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
        {**VALID, "OTEL_EXPORTER_OTLP_ENDPOINT": "https://u:SECRET-PASSWORD@collector.example"}
    )

    assert "SECRET-PASSWORD" not in repr(settings)


def _prepare_api_script_sandbox(tmp_path: Path, env_worktree: str | None) -> tuple[Path, Path]:
    """Stages a copy of `api.sh` with stub `docker`/`uv` executables to observe `api.sh dev`."""
    script_dir = tmp_path / "apps" / "api" / "scripts"
    script_dir.mkdir(parents=True)
    script = script_dir / "api.sh"
    shutil.copy2(API_DIR / "scripts" / "api.sh", script)
    if env_worktree is not None:
        (tmp_path / ".env.worktree").write_text(env_worktree, encoding="utf-8")

    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    uv_stub = (
        "#!/usr/bin/env bash\n"
        'if [[ "$*" == *"roadmaps_api.server"* ]]; then\n'
        '  printf "ORIGIN=%s\\n" "${ROADMAPS_EDITOR_ORIGIN:-}"\n'
        '  printf "HOSTS=%s\\n" "${ROADMAPS_ALLOWED_HOSTS:-}"\n'
        '  printf "ENV=%s\\n" "${ROADMAPS_ENV:-}"\n'
        '  printf "DB=%s\\n" "${ROADMAPS_DATABASE_URL:-}"\n'
        "fi\n"
        "exit 0\n"
    )
    for name, body in (("docker", "#!/usr/bin/env bash\nexit 0\n"), ("uv", uv_stub)):
        exe = bin_dir / name
        exe.write_text(body, encoding="utf-8")
        exe.chmod(exe.stat().st_mode | stat.S_IXUSR)
    return script, bin_dir


BASH = shutil.which("bash") or "/bin/bash"
WORKTREE_ENV = (
    "WORKTREE_SLOT=64\nDEV_PORT=21640\nAPI_PORT=21644\nDB_PORT=21645\n"
    "API_DB_PROJECT=roadmaps-slot-64\n"
)


@pytest.mark.parametrize(
    ("env_worktree", "expected_origin"),
    [
        (WORKTREE_ENV, "http://localhost:21640"),
        (None, "http://localhost:5173"),
    ],
    ids=["worktree DEV_PORT reaches ROADMAPS_EDITOR_ORIGIN", "non-worktree falls back to 5173"],
)
def test_api_script_dev_exports_editor_origin_from_worktree_dev_port(
    tmp_path: Path, env_worktree: str | None, expected_origin: str
) -> None:
    script, bin_dir = _prepare_api_script_sandbox(tmp_path, env_worktree)
    env = {
        k: v
        for k, v in os.environ.items()
        if not k.startswith("ROADMAPS_") and k not in CLOUD_RUN_MARKERS
    }
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"

    result = subprocess.run(  # noqa: S603 - staged repo script with controlled PATH
        [BASH, str(script), "dev"],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    exported = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    assert exported["ORIGIN"] == expected_origin
    loaded = load_settings(
        {
            "ROADMAPS_ENV": exported["ENV"],
            "ROADMAPS_DATABASE_URL": exported["DB"],
            "ROADMAPS_ALLOWED_HOSTS": exported["HOSTS"],
            "ROADMAPS_EDITOR_ORIGIN": exported["ORIGIN"],
        }
    )
    assert loaded.editor_origin == expected_origin


def test_api_script_fails_when_worktree_env_lacks_dev_port(tmp_path: Path) -> None:
    script, bin_dir = _prepare_api_script_sandbox(
        tmp_path,
        "WORKTREE_SLOT=64\nAPI_PORT=21644\nDB_PORT=21645\nAPI_DB_PROJECT=roadmaps-slot-64\n",
    )
    env = {"PATH": f"{bin_dir}:{os.environ.get('PATH', '')}"}

    result = subprocess.run(  # noqa: S603 - staged repo script with controlled PATH
        [BASH, str(script), "dev"],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )

    assert result.returncode == 1
    assert "DEV_PORT" in result.stderr
