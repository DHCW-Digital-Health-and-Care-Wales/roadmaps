"""Every response carries ADR-020's headers and no CORS header; the live OpenAPI JSON."""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response

from roadmaps_api.app import create_app
from roadmaps_api.settings import MAX_BODY_BYTES, Environment
from tests.support import SAME_ORIGIN_HEADERS, make_settings, serving

HEADERS = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "cross-origin-resource-policy": "same-origin",
}

RESPONSES = {
    "a probe": lambda c: c.get("/health"),
    "a 503 probe": lambda c: c.get("/ready"),
    "a 404": lambda c: c.get("/nowhere"),
    "a 422": lambda c: c.post("/test/echo", json={}, headers=SAME_ORIGIN_HEADERS),
    "a 413": lambda c: c.post("/test/echo", content=b"x" * (MAX_BODY_BYTES + 1)),
    "a refused Host": lambda c: c.get("/health", headers={"Host": "elsewhere.example"}),
    "a 500": lambda c: c.get("/test/boom"),
    "a CORS preflight": lambda c: c.options(
        "/health",
        headers={"Origin": "https://elsewhere.example", "Access-Control-Request-Method": "GET"},
    ),
}


@pytest.mark.parametrize("send", RESPONSES.values(), ids=RESPONSES)
def test_every_response_carries_the_headers_and_no_cors(
    client: TestClient, send: Callable[[TestClient], Response]
) -> None:
    response = send(client)

    for name, value in HEADERS.items():
        assert response.headers.get(name) == value
    assert not [name for name in response.headers if name.startswith("access-control-")]


@pytest.mark.parametrize("environment", [Environment.TEST, Environment.PRODUCTION])
def test_no_docs_and_no_live_openapi_outside_local(environment: Environment) -> None:
    with serving(make_settings(environment=environment)) as client:
        for path in ("/api/v1/openapi.json", "/openapi.json", "/docs", "/redoc"):
            assert client.get(path).json()["code"] == "request.not_found"


def test_only_local_serves_the_live_openapi_json_and_no_docs_page() -> None:
    with serving(make_settings(environment=Environment.LOCAL)) as client:
        openapi = client.get("/api/v1/openapi.json")

        assert openapi.status_code == 200
        assert openapi.json()["info"]["title"] == "DHCW Roadmaps API"
        for name, value in HEADERS.items():
            assert openapi.headers[name] == value
        for path in ("/docs", "/redoc", "/openapi.json"):
            assert client.get(path).status_code == 404


def test_the_probes_are_left_out_of_the_contract() -> None:
    app = create_app(make_settings(environment=Environment.LOCAL))

    assert not {"/health", "/ready"} & set(app.openapi()["paths"])
