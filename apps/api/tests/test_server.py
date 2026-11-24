"""The real server, run as `pnpm api:dev` runs it, logs only allow-listed fields.

`TestClient` never runs uvicorn, whose own loggers write the query string and the
message of an exception that reaches them, so these tests start uvicorn itself, with
reload and the log configuration `scripts/api.sh dev` uses, under production's rules,
which write no message; one local case shows the messages a developer's API writes.
"""

import json
import os
import signal
import socket
import subprocess
import sys
import time
import warnings
from collections.abc import Generator, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

import httpx2
import pytest

from roadmaps_api import app, server
from roadmaps_api.settings import load_settings
from tests.support import DOWN_DATABASE_URL, PLANTED

API_DIR = Path(__file__).parent.parent
SERVER_ENVIRONMENT = {
    "ROADMAPS_ENV": "production",
    "ROADMAPS_DATABASE_URL": DOWN_DATABASE_URL,
    "ROADMAPS_ALLOWED_HOSTS": "127.0.0.1,localhost",
}


def free_port() -> int:
    with socket.create_server(("127.0.0.1", 0)) as probe:
        return probe.getsockname()[1]


@dataclass
class Run:
    stdout: str
    stderr: str

    def lines(self) -> list[dict[str, object]]:
        return [json.loads(line) for line in self.stdout.splitlines() if line]


def run_server(
    args: list[str], environment: dict[str, str], tmp_path: Path
) -> subprocess.Popen[bytes]:
    with (tmp_path / "stdout").open("wb") as stdout, (tmp_path / "stderr").open("wb") as stderr:
        return subprocess.Popen(  # noqa: S603 - the test's own interpreter and arguments
            [sys.executable, *args],
            cwd=API_DIR,
            env={**os.environ, **environment},
            stdout=stdout,
            stderr=stderr,
            # Its own process group, so the reloader and its worker both get the signal.
            start_new_session=True,
        )


def finish(process: subprocess.Popen[bytes], tmp_path: Path) -> Run:
    if process.poll() is None:
        os.killpg(process.pid, signal.SIGINT)
    process.wait(timeout=20)
    return Run(
        stdout=(tmp_path / "stdout").read_text(),
        stderr=(tmp_path / "stderr").read_text(),
    )


def wait_until_up(base: str) -> None:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            if httpx2.get(f"{base}/health").status_code == 200:
                return
        except httpx2.TransportError:
            time.sleep(0.1)
    pytest.fail("the server did not start")


@contextmanager
def serving_with_reload(
    tmp_path: Path, environment: dict[str, str]
) -> Generator[tuple[str, subprocess.Popen[bytes]]]:
    port = free_port()
    serve = (
        "from roadmaps_api.server import serve; "
        "from roadmaps_api.settings import load_settings; "
        f"serve(port={port}, reload=True, app='tests.support:create_test_app', "
        "settings=load_settings())"
    )
    process = run_server(["-c", serve], environment, tmp_path)
    try:
        base = f"http://127.0.0.1:{port}"
        wait_until_up(base)
        yield base, process
    finally:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGKILL)


@pytest.fixture
def served(tmp_path: Path) -> Iterator[tuple[str, subprocess.Popen[bytes]]]:
    with serving_with_reload(tmp_path, SERVER_ENVIRONMENT) as server:
        yield server


def test_the_server_logs_no_query_string_or_exception_text_on_either_stream(
    served: tuple[str, subprocess.Popen[bytes]], tmp_path: Path
) -> None:
    base, process = served
    port = int(base.rsplit(":", 1)[1])

    not_found = httpx2.get(f"{base}/api/v1/nothing?token={PLANTED}")
    failed = httpx2.get(f"{base}/test/boom?token={PLANTED}")
    with socket.create_connection(("127.0.0.1", port)) as raw:
        raw.sendall(f"GET /?{PLANTED} HTTP/1.1\r\nHost: 127.0.0.1\r\n{PLANTED}\r\n\r\n".encode())
        raw.recv(1024)
    with socket.create_connection(("127.0.0.1", port)) as raw:
        raw.sendall(f"{PLANTED} /health HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n".encode())
        raw.recv(1024)
    run = finish(process, tmp_path)

    assert PLANTED not in run.stdout
    assert PLANTED not in run.stderr
    lines = run.lines()
    assert all(isinstance(line, dict) for line in lines)
    access = [line for line in lines if line.get("message") == "request"]
    assert {(line["route"], line["status"], line["request_id"]) for line in access} >= {
        ("unmatched", 404, not_found.headers["X-Request-ID"]),
        ("/test/boom", 500, failed.headers["X-Request-ID"]),
    }
    assert any(line["method"] == "_OTHER" for line in access)
    [failure] = [line for line in lines if line.get("message") == "request.failed"]
    assert failure["exception_type"] == "builtins.ValueError"
    assert failure["request_id"] == failed.headers["X-Request-ID"]
    # uvicorn's warnings arrive (the request it could not parse); its start and stop
    # lines, which would hold no text, do not.
    uvicorn = [line for line in lines if str(line["logger"]).startswith("uvicorn")]
    assert uvicorn
    assert {line["level"] for line in uvicorn} <= {"warning", "error", "critical"}


def test_a_local_server_writes_messages_and_uvicorn_s_information_lines(
    tmp_path: Path,
) -> None:
    with serving_with_reload(tmp_path, {**SERVER_ENVIRONMENT, "ROADMAPS_ENV": "local"}) as (
        base,
        process,
    ):
        httpx2.get(f"{base}/test/boom")
        run = finish(process, tmp_path)

    lines = run.lines()
    [failure] = [line for line in lines if line.get("message") == "request.failed"]
    assert failure["exception_message"] == PLANTED
    assert any(
        line["logger"] == "uvicorn.error" and line["level"] == "info" and line["message"]
        for line in lines
    )


BAD_DATABASE_URLS = {
    "another driver's": f"mysql://{PLANTED}",
    "a password with an unencoded @ and :": f"postgresql+psycopg://u:p@s:{PLANTED}@db/x",
}


@pytest.mark.parametrize("url", BAD_DATABASE_URLS.values(), ids=BAD_DATABASE_URLS)
def test_bad_settings_stop_the_server_naming_each_one_never_its_value(
    tmp_path: Path, url: str
) -> None:
    environment = {**SERVER_ENVIRONMENT, "ROADMAPS_ENV": PLANTED, "ROADMAPS_DATABASE_URL": url}

    process = run_server(
        ["-m", "roadmaps_api.server", "--port", str(free_port())], environment, tmp_path
    )
    returncode = process.wait(timeout=20)
    run = finish(process, tmp_path)

    assert returncode == 1
    assert PLANTED not in run.stdout
    assert PLANTED not in run.stderr
    [invalid] = [line for line in run.lines() if line.get("message") == "settings.invalid"]
    assert invalid["invalid_settings"] == ["ROADMAPS_ENV", "ROADMAPS_DATABASE_URL"]


@pytest.mark.usefixtures("json_logging")
def test_the_command_line_starts_the_server_on_its_port_with_reload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    started: list[dict[str, object]] = []
    monkeypatch.setattr(server, "serve", lambda **options: started.append(options))
    for name, value in SERVER_ENVIRONMENT.items():
        monkeypatch.setenv(name, value)

    server.main(["--port", "8123", "--reload"])

    [options] = started
    assert (options["port"], options["reload"]) == (8123, True)
    assert options["settings"] == load_settings()


@pytest.mark.usefixtures("json_logging")
def test_the_factory_exits_logging_a_failure_s_type_never_its_text(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    def fail(_url: str) -> None:
        raise ValueError(PLANTED)

    for name, value in SERVER_ENVIRONMENT.items():
        monkeypatch.setenv(name, value)
    monkeypatch.setattr(app, "create_database_engine", fail)

    with pytest.raises(SystemExit) as exited:
        app.factory()

    captured = capsys.readouterr()
    [line] = [json.loads(text) for text in captured.out.splitlines()]
    assert exited.value.code == 1
    assert (line["message"], line["exception_type"]) == ("app.failed", "builtins.ValueError")
    assert PLANTED not in captured.out + captured.err


@pytest.mark.usefixtures("json_logging")
def test_the_factory_exits_on_bad_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ROADMAPS_DATABASE_URL", raising=False)

    with pytest.raises(SystemExit) as exited:
        app.factory()

    assert exited.value.code == 1


@pytest.mark.usefixtures("json_logging")
def test_the_factory_sends_python_s_warnings_to_the_log_without_their_text(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    for name, value in SERVER_ENVIRONMENT.items():
        monkeypatch.setenv(name, value)
    app.factory()
    # What `warnings.warn` calls to show a warning, once the filters let it through.
    warnings.showwarning(UserWarning(PLANTED), UserWarning, "x.py", 1)

    captured = capsys.readouterr()
    [line] = [json.loads(text) for text in captured.out.splitlines()]
    assert line["logger"] == "py.warnings"
    assert PLANTED not in captured.out + captured.err
