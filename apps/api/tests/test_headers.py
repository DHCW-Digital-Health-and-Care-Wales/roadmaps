"""S5: every response carries ADR-020's headers and no CORS header; the Host rules."""

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response

from roadmaps_api.app import create_app
from roadmaps_api.settings import MAX_BODY_BYTES, Environment
from tests.support import make_settings, serving

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
    "a 422": lambda c: c.post("/test/echo", json={}),
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


def test_the_host_allow_list_reads_the_host_header_never_x_forwarded_host(
    client: TestClient,
) -> None:
    forwarded_from_listed = client.get(
        "/health", headers={"Host": "elsewhere.example", "X-Forwarded-Host": "testserver"}
    )
    listed_forwarded_elsewhere = client.get(
        "/health", headers={"X-Forwarded-Host": "elsewhere.example"}
    )

    assert forwarded_from_listed.status_code == 400
    assert listed_forwarded_elsewhere.status_code == 200


HOSTS = {
    "a listed host with a port": ("testserver:8000", ("testserver",), 200),
    "a listed host in capitals": ("TestServer", ("testserver",), 200),
    "an IPv6 literal with a port": ("[::1]:8000", ("[::1]",), 200),
    "a subdomain of a wildcard": ("a.example.org", ("*.example.org",), 200),
    "the domain of a subdomain wildcard": ("example.org", ("*.example.org",), 400),
    "any host under *": ("anything.example", ("*",), 200),
    "an unlisted host": ("other.example", ("testserver",), 400),
    "a listed name as another's suffix": ("eviltestserver", ("testserver",), 400),
    "no host": ("", ("testserver",), 400),
    "a listed IPv6 literal with more after it": ("[::1]evil", ("[::1]",), 400),
    "a listed host with a port that is no number": ("testserver:x", ("testserver",), 400),
}


@pytest.mark.parametrize(("host", "allowed", "status"), HOSTS.values(), ids=HOSTS)
def test_the_host_allow_list(host: str, allowed: tuple[str, ...], status: int) -> None:
    with serving(make_settings(environment=Environment.LOCAL, hosts=allowed)) as client:
        assert client.get("/health", headers={"Host": host}).status_code == status


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
