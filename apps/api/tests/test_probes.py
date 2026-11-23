"""S3: /health answers for the process, /ready for the database, within two seconds."""

import socket
import threading
import time
from collections.abc import Iterator
from typing import cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from tests.conftest import client_for
from tests.support import DOWN_DATABASE_URL, database_url, make_settings

from roadmaps_api.database import MAX_OVERFLOW, POOL_SIZE

NOT_READY = {
    "detail": "The service is not ready.",
    "code": "service.not_ready",
    "params": {},
}


@pytest.fixture
def ready_client() -> Iterator[TestClient]:
    yield from client_for(make_settings(database_url()))


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
    for client in client_for(make_settings(silent_database)):
        started = time.monotonic()
        response = client.get("/ready")

        assert response.status_code == 503
        assert time.monotonic() - started < 3


def test_ready_gives_up_waiting_for_a_pooled_connection_within_about_two_seconds(
    ready_client: TestClient,
) -> None:
    engine: Engine = cast("FastAPI", ready_client.app).state.engine
    held = [engine.connect() for _ in range(POOL_SIZE + MAX_OVERFLOW)]
    try:
        started = time.monotonic()
        response = ready_client.get("/ready")

        assert response.status_code == 503
        assert time.monotonic() - started < 3
    finally:
        for connection in held:
            connection.close()
    assert ready_client.get("/ready").status_code == 200
