"""S4: every refusal is the envelope, with a stable code, and never echoes the input."""

import json
from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response
from tests.support import PLANTED

from roadmaps_api.settings import MAX_BODY_BYTES


def too_large_stream() -> Iterator[bytes]:
    chunk = PLANTED.encode().ljust(64 * 1024, b"x")
    for _ in range(MAX_BODY_BYTES // len(chunk) + 1):
        yield chunk


REFUSALS = {
    "an unknown path": (
        lambda c: c.get(f"/api/v1/{PLANTED}?q={PLANTED}"),
        404,
        "request.not_found",
        {},
    ),
    "a known path with the wrong method": (
        lambda c: c.post("/health", content=PLANTED),
        405,
        "request.method_not_allowed",
        {},
    ),
    "a body that fails validation": (
        lambda c: c.post("/test/echo", json={"name": [PLANTED]}),
        422,
        "request.invalid",
        {"errors": [{"loc": ["body", "name"], "type": "string_type"}]},
    ),
    "a query that fails validation": (
        lambda c: c.post(f"/test/echo?count={PLANTED}", json={"name": "a"}),
        422,
        "request.invalid",
        {"errors": [{"loc": ["query", "count"], "type": "int_parsing"}]},
    ),
    "a body that is not JSON": (
        lambda c: c.post(
            "/test/echo", content=PLANTED, headers={"Content-Type": "application/json"}
        ),
        422,
        "request.invalid",
        {"errors": [{"loc": ["body", 0], "type": "json_invalid"}]},
    ),
    "a declared body over 1 MiB": (
        lambda c: c.post("/test/echo", content=PLANTED.encode().ljust(MAX_BODY_BYTES + 1)),
        413,
        "request.body_too_large",
        {},
    ),
    "a streamed body over 1 MiB, with no Content-Length": (
        lambda c: c.post("/test/echo", content=too_large_stream()),
        413,
        "request.body_too_large",
        {},
    ),
    "a Host the settings do not list": (
        lambda c: c.get("/health", headers={"Host": f"{PLANTED}.example"}),
        400,
        "request.host_not_allowed",
        {},
    ),
    "a route raising an unexpected error": (
        lambda c: c.get("/test/boom"),
        500,
        "server.internal_error",
        {},
    ),
    "a route raising a status FastAPI never raises": (
        lambda c: c.get("/test/teapot"),
        500,
        "server.internal_error",
        {},
    ),
}


@pytest.mark.parametrize(("send", "status", "code", "params"), REFUSALS.values(), ids=REFUSALS)
def test_a_refusal_is_the_envelope_without_the_input(
    client: TestClient,
    send: Callable[[TestClient], Response],
    status: int,
    code: str,
    params: dict[str, object],
) -> None:
    response = send(client)

    assert response.status_code == status
    body = response.json()
    assert set(body) == {"detail", "code", "params"}
    assert body["code"] == code
    assert body["params"] == params
    assert isinstance(body["detail"], str)
    assert PLANTED not in response.text
    assert "Traceback" not in response.text


def test_a_body_at_the_limit_is_read(client: TestClient) -> None:
    name = "a" * (MAX_BODY_BYTES - len(json.dumps({"name": ""})))
    response = client.post(
        "/test/echo",
        content=json.dumps({"name": name}),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.json() == {"name": name, "count": 1}


def test_a_valid_request_passes_through(client: TestClient) -> None:
    response = client.post("/test/echo?count=2", json={"name": "a"})

    assert response.status_code == 200
    assert response.json() == {"name": "a", "count": 2}
