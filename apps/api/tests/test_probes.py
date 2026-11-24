"""S3: /health answers for the process, /ready for the database, within two seconds."""

import contextlib
import socket
import threading
import time
from collections.abc import Iterator
from typing import cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.engine import make_url

from roadmaps_api.database import MAX_OVERFLOW, POOL_SIZE
from roadmaps_api.repositories.readiness import ReadinessRepository
from tests.support import DOWN_DATABASE_URL, Lines, database_url, make_settings, serving

# About two seconds, with room for a loaded machine.
DEADLINE = 3.5

NOT_READY = {
    "detail": "The service is not ready.",
    "code": "service.not_ready",
    "params": {},
}


@pytest.fixture
def ready_client() -> Iterator[TestClient]:
    with serving(make_settings(database_url())) as client:
        yield client


def test_the_probes_answer_200_with_the_database_up(ready_client: TestClient) -> None:
    assert ready_client.get("/health").json() == {"status": "ok"}
    response = ready_client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_answers_200_with_the_database_down(client: TestClient) -> None:
    assert client.get("/health").status_code == 200


def test_ready_answers_503_with_the_database_down(client: TestClient) -> None:
    response = client.get("/ready")

    assert response.status_code == 503
    assert response.json() == NOT_READY


@pytest.fixture
def silent_database() -> Iterator[str]:
    """A server that accepts connections and never answers, as a hung database does."""
    listener = socket.create_server(("127.0.0.1", 0))
    accepted: list[socket.socket] = []
    stop = threading.Event()

    def accept() -> None:
        listener.settimeout(0.1)
        while not stop.is_set():
            try:
                accepted.append(listener.accept()[0])
            except TimeoutError:
                continue

    thread = threading.Thread(target=accept)
    thread.start()
    port = listener.getsockname()[1]
    yield DOWN_DATABASE_URL.replace("127.0.0.1:1", f"127.0.0.1:{port}")
    stop.set()
    thread.join()
    for connection in accepted:
        connection.close()
    listener.close()


def test_ready_gives_up_on_a_silent_database_within_about_two_seconds(
    silent_database: str,
) -> None:
    with serving(make_settings(silent_database)) as client:
        started = time.monotonic()
        response = client.get("/ready")

        assert response.status_code == 503
        assert time.monotonic() - started < DEADLINE


def test_ready_gives_up_waiting_for_a_pooled_connection_within_about_two_seconds(
    ready_client: TestClient,
) -> None:
    engine: Engine = cast("FastAPI", ready_client.app).state.engine
    held = [engine.connect() for _ in range(POOL_SIZE + MAX_OVERFLOW)]
    try:
        started = time.monotonic()
        response = ready_client.get("/ready")

        assert response.status_code == 503
        assert time.monotonic() - started < DEADLINE
    finally:
        for connection in held:
            connection.close()
    assert ready_client.get("/ready").status_code == 200


class FreezingProxy:
    """Forwards to the database until frozen, then holds its connections open, silent.

    As a paused container or a stalled server does to a connection already in the pool.
    """

    def __init__(self, target: tuple[str, int]) -> None:
        self._target = target
        self._listener = socket.create_server(("127.0.0.1", 0))
        self._listener.settimeout(0.1)
        self._sockets: list[socket.socket] = []
        self.frozen = threading.Event()
        self._stop = threading.Event()
        self._threads = [threading.Thread(target=self._accept)]
        self._threads[0].start()

    @property
    def port(self) -> int:
        return self._listener.getsockname()[1]

    def _accept(self) -> None:
        while not self._stop.is_set():
            try:
                client = self._listener.accept()[0]
            except TimeoutError:
                continue
            server = socket.create_connection(self._target)
            self._sockets += [client, server]
            for source, sink in ((client, server), (server, client)):
                thread = threading.Thread(target=self._pipe, args=(source, sink))
                self._threads.append(thread)
                thread.start()

    def _pipe(self, source: socket.socket, sink: socket.socket) -> None:
        source.settimeout(0.1)
        while not self._stop.is_set():
            try:
                data = source.recv(65536)
            except TimeoutError:
                continue
            except OSError:
                return
            if not data:
                return
            while self.frozen.is_set() and not self._stop.is_set():
                time.sleep(0.05)
            with contextlib.suppress(OSError):
                sink.sendall(data)

    def close(self) -> None:
        self._stop.set()
        for thread in self._threads:
            thread.join()
        for sock in [*self._sockets, self._listener]:
            sock.close()


def test_ready_gives_up_on_a_pooled_connection_whose_database_stops_answering(
    lines: Lines,
) -> None:
    url = make_url(database_url())
    proxy = FreezingProxy((url.host or "127.0.0.1", url.port or 5432))
    try:
        with serving(
            make_settings(url.set(port=proxy.port).render_as_string(hide_password=False))
        ) as client:
            assert client.get("/ready").status_code == 200
            proxy.frozen.set()
            started = time.monotonic()
            response = client.get("/ready")

            assert response.status_code == 503
            assert time.monotonic() - started < DEADLINE
    finally:
        proxy.close()
    # The probe's own deadline, which its warning tells from a failed connection.
    [warning] = [line for line in lines.read() if line.get("message") == "readiness.failed"]
    assert (warning["exception_type"], warning["exception_causes"]) == (
        "builtins.TimeoutError",
        [],
    )


def test_ready_lets_an_unexpected_error_through_as_a_500(
    ready_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail(_self: ReadinessRepository) -> None:
        raise ValueError

    monkeypatch.setattr(ReadinessRepository, "select_one", fail)

    assert ready_client.get("/ready").json()["code"] == "server.internal_error"
