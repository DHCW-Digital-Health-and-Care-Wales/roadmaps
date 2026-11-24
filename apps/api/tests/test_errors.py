"""Every refusal is the envelope, with a stable code, and never echoes the input.

The two exceptions, the `Host` allow-list's 400 and the body limit's 413, are
Starlette's plain text (`test_middleware.py`).
"""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response

from tests.support import PLANTED

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
    "a body that is not UTF-8": (
        lambda c: c.post(
            "/test/echo",
            content=b'{"name": "\xff"}',
            headers={"Content-Type": "application/json"},
        ),
        422,
        "request.invalid",
        {"errors": [{"loc": ["body"], "type": "body_unreadable"}]},
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


def test_a_valid_request_passes_through(client: TestClient) -> None:
    response = client.post("/test/echo?count=2", json={"name": "a"})

    assert response.status_code == 200
    assert response.json() == {"name": "a", "count": 2}


def test_a_405_names_the_methods_the_path_allows(client: TestClient) -> None:
    assert client.post("/health").headers["Allow"] == "GET"
