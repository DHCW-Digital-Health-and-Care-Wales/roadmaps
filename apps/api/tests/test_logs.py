"""S7: JSON lines on stdout, allow-listed fields only, tied to the response by its ID."""

import io
import json
import logging
import logging.config
import sys
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from tests.conftest import client_for
from tests.support import PLANTED, database_url, make_settings

from roadmaps_api.database import create_database_engine
from roadmaps_api.logs import LOG_CONFIG, JsonFormatter, StdoutHandler


@pytest.fixture
def lines(capsys: pytest.CaptureFixture[str]) -> Iterator[Lines]:
    logging.config.dictConfig(LOG_CONFIG)
    yield Lines(capsys)
    logging.config.dictConfig({"version": 1, "disable_existing_loggers": False})


class Lines:
    def __init__(self, capsys: pytest.CaptureFixture[str]) -> None:
        self._capsys = capsys

    def read(self) -> list[dict[str, Any]]:
        captured = self._capsys.readouterr()
        assert captured.err == ""
        assert PLANTED not in captured.out
        parsed = [json.loads(line) for line in captured.out.splitlines()]
        # The test client's own lines, one per request it sends.
        return [line for line in parsed if line["logger"] != "httpx2"]


def test_an_access_line_holds_the_allow_listed_fields_and_the_response_s_id(
    client: TestClient, lines: Lines
) -> None:
    response = client.get(f"/nowhere?token={PLANTED}", headers={"X-Request-ID": PLANTED})

    [line] = lines.read()
    request_id = response.headers["X-Request-ID"]
    assert len(request_id) == 32
    assert set(line) == {
        "time",
        "level",
        "logger",
        "message",
        "request_id",
        "method",
        "path",
        "status",
        "duration_ms",
    }
    assert line["message"] == "request"
    assert line["request_id"] == request_id
    assert (line["method"], line["path"], line["status"]) == ("GET", "/nowhere", 404)
    assert isinstance(line["duration_ms"], float)


def test_each_request_gets_its_own_id(client: TestClient) -> None:
    ids = {client.get("/health").headers["X-Request-ID"] for _ in range(3)}

    assert len(ids) == 3


def test_a_500_logs_the_exception_s_type_and_frames_never_its_message(
    client: TestClient, lines: Lines
) -> None:
    response = client.get("/test/boom")

    failure, access = lines.read()
    request_id = response.headers["X-Request-ID"]
    assert failure["level"] == "error"
    assert failure["message"] == "request.failed"
    assert failure["request_id"] == request_id
    assert failure["exception_type"] == "builtins.ValueError"
    assert any(frame.endswith(" in boom") for frame in failure["stack"])
    assert access["request_id"] == request_id
    assert access["status"] == 500


def test_ready_s_503_logs_a_warning_with_the_code_and_the_exception_s_type(
    client: TestClient, lines: Lines
) -> None:
    response = client.get("/ready")

    warning, access = lines.read()
    assert warning == {
        "time": warning["time"],
        "level": "warning",
        "logger": "roadmaps_api.services.readiness",
        "message": "readiness.failed",
        "request_id": response.headers["X-Request-ID"],
        "code": "service.not_ready",
        "exception_type": "sqlalchemy.exc.OperationalError",
    }
    assert (access["path"], access["status"]) == ("/ready", 503)


def test_a_probe_that_succeeds_writes_no_access_line(lines: Lines) -> None:
    for client in client_for(make_settings(database_url())):
        assert client.get("/health").status_code == 200
        assert client.get("/ready").status_code == 200

    assert lines.read() == []


def test_another_library_s_message_and_arguments_are_dropped(lines: Lines) -> None:
    logging.getLogger("uvicorn.error").warning(f"Error loading ASGI app. {PLANTED}")  # noqa: G004
    logging.getLogger("uvicorn.error").info("Started %s", PLANTED)
    logging.getLogger("roadmaps_api.anything").info("event %s", PLANTED)
    logging.getLogger("roadmaps_api").info(ValueError(PLANTED))

    foreign, foreign_args, own, own_object = lines.read()
    assert foreign == {"time": foreign["time"], "level": "warning", "logger": "uvicorn.error"}
    assert "message" not in foreign_args
    assert own["message"] == "event %s"
    assert "message" not in own_object


def test_a_warning_reaches_the_log_without_its_text(lines: Lines) -> None:
    for _client in client_for(make_settings()):
        logging.getLogger("py.warnings").warning("x.py:1: UserWarning: %s", PLANTED)

    [line] = lines.read()
    assert line["logger"] == "py.warnings"


def test_the_engine_hides_sql_parameters() -> None:
    engine = create_database_engine(database_url())

    with engine.connect() as connection, pytest.raises(SQLAlchemyError) as raised:
        connection.execute(text("SELECT 1 / 0 WHERE :value = :value"), {"value": PLANTED})

    assert PLANTED not in str(raised.value)
    engine.dispose()


def test_the_handler_writes_to_stdout_as_it_is_at_each_line(
    lines: Lines, monkeypatch: pytest.MonkeyPatch
) -> None:
    replaced = io.StringIO()
    monkeypatch.setattr(sys, "stdout", replaced)
    logging.getLogger("roadmaps_api").info("replaced")
    monkeypatch.undo()
    logging.getLogger("roadmaps_api").info("restored")

    assert json.loads(replaced.getvalue())["message"] == "replaced"
    assert [line["message"] for line in lines.read()] == ["restored"]


def test_a_broken_stdout_drops_the_line_without_raising(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    class Broken:
        def write(self, _text: str) -> None:
            raise OSError

    handler = StdoutHandler()
    handler.setFormatter(JsonFormatter())
    monkeypatch.setattr("sys.stdout", Broken())

    handler.emit(logging.makeLogRecord({"name": "roadmaps_api", "msg": "x"}))

    monkeypatch.undo()
    assert capsys.readouterr().err == ""
