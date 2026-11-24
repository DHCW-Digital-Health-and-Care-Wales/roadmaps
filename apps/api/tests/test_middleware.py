"""The middleware as `create_app` wires it: Starlette's body limit and `Host` allow-list.

The tests hold the repository's wiring (the hosts, no redirect, the limit, the order
and what `RequestContext` adds), not Starlette's own behaviour beyond the cases ADR-020
names.
"""

import asyncio
import json
import logging
from collections.abc import Callable, Iterator
from typing import cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx2 import Response
from starlette.types import Message, Receive, Scope, Send

from roadmaps_api.middleware import PROBE_PATHS, REQUEST_ID_HEADER, RequestContext
from roadmaps_api.routes import probes
from roadmaps_api.settings import MAX_BODY_BYTES
from tests.support import PLANTED, TEST_HOST, Lines, make_settings, serving


def too_large_stream() -> Iterator[bytes]:
    """A body over the limit with no `Content-Length`, sent in chunks."""
    chunk = PLANTED.encode().ljust(64 * 1024, b"x")
    for _ in range(MAX_BODY_BYTES // len(chunk) + 1):
        yield chunk


def at_the_limit() -> str:
    """A JSON body of exactly the limit that the echo route accepts."""
    return json.dumps({"name": "a" * (MAX_BODY_BYTES - len(json.dumps({"name": ""})))})


TOO_LARGE = PLANTED.encode().ljust(MAX_BODY_BYTES + 1)

# Each request, its status, the route its access line names and whether the route that
# reads no body ran.
BODIES = {
    "a declared body over the limit to a route that reads it": (
        lambda c: c.post("/test/echo", content=TOO_LARGE),
        413,
        "/test/echo",
        0,
    ),
    "a streamed body over the limit to a route that reads it": (
        lambda c: c.post("/test/echo", content=too_large_stream()),
        413,
        "/test/echo",
        0,
    ),
    "a body at the limit": (
        lambda c: c.post(
            "/test/echo", content=at_the_limit(), headers={"Content-Type": "application/json"}
        ),
        200,
        "/test/echo",
        0,
    ),
    # Answered once the route has run: nothing is read, and the route's answer is not sent.
    "a declared body over the limit to a route that reads none": (
        lambda c: c.post("/test/unread", content=TOO_LARGE),
        413,
        "/test/unread",
        1,
    ),
    # Left unread, with the route's own answer.
    "a streamed body over the limit to a route that reads none": (
        lambda c: c.post("/test/unread", content=too_large_stream()),
        200,
        "/test/unread",
        1,
    ),
}


@pytest.mark.parametrize("case", BODIES.values(), ids=BODIES)
def test_the_body_limit_counts_a_body_as_a_route_reads_it(
    client: TestClient,
    lines: Lines,
    case: tuple[Callable[[TestClient], Response], int, str, int],
) -> None:
    send, status, route, unread_calls = case
    response = send(client)

    assert response.status_code == status
    if status == 413:
        assert response.headers["content-type"].startswith("text/plain")
        assert response.text == "Content Too Large"
    assert cast("FastAPI", client.app).state.unread_calls == unread_calls
    [access] = [line for line in lines.read() if line.get("message") == "request"]
    assert (access["route"], access["status"]) == (route, status)
    assert access["request_id"] == response.headers[REQUEST_ID_HEADER]


ALLOWED_HOSTS = (TEST_HOST, "[::1]", "www.example.org")

HOSTS = {
    "a listed host with a port": ({"Host": f"{TEST_HOST}:8000"}, 200),
    "a listed host in capitals": ({"Host": TEST_HOST.upper()}, 200),
    "a listed IPv6 literal with a port": ({"Host": "[::1]:8000"}, 200),
    "an unlisted host": ({"Host": f"{PLANTED}.example"}, 400),
    "a listed name as another's suffix": ({"Host": f"evil{TEST_HOST}"}, 400),
    # Refused, never redirected to the listed name.
    "the bare name of a listed www. host": ({"Host": "example.org"}, 400),
    "an unlisted Host forwarded from a listed one": (
        {"Host": "elsewhere.example", "X-Forwarded-Host": TEST_HOST},
        400,
    ),
    "a listed Host forwarded from an unlisted one": (
        {"Host": TEST_HOST, "X-Forwarded-Host": "elsewhere.example"},
        200,
    ),
}


@pytest.mark.parametrize(("headers", "status"), HOSTS.values(), ids=HOSTS)
def test_the_host_allow_list_serves_only_the_listed_hosts(
    lines: Lines, headers: dict[str, str], status: int
) -> None:
    with serving(make_settings(hosts=ALLOWED_HOSTS)) as client:
        response = client.get("/test/items/1", headers=headers, follow_redirects=False)

    assert response.status_code == status
    access = [line for line in lines.read() if line.get("message") == "request"]
    if status == 400:
        assert response.headers["content-type"].startswith("text/plain")
        assert response.text == "Invalid host header"
        [refused] = access
        assert (refused["route"], refused["status"]) == ("unmatched", 400)
        assert refused["request_id"] == response.headers[REQUEST_ID_HEADER]
    else:
        assert access[0]["route"] == "/test/items/{item_id}"


def test_the_host_allow_list_comes_before_the_body_limit(client: TestClient) -> None:
    response = client.post("/test/echo", content=TOO_LARGE, headers={"Host": "elsewhere.example"})

    assert response.status_code == 400


def messages(*sent: Message) -> Receive:
    queue = list(sent)

    async def receive() -> Message:
        return queue.pop(0)

    return receive


SCOPE: Scope = {"type": "http", "method": "POST", "path": "/x", "headers": []}


def test_an_error_after_the_response_started_is_logged_and_sends_nothing_more(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)
    sent: list[Message] = []

    async def app(_scope: Scope, _receive: Receive, send: Send) -> None:
        await send({"type": "http.response.start", "status": 200, "headers": []})
        raise ValueError

    async def send(message: Message) -> None:
        sent.append(message)

    asyncio.run(RequestContext(app)(SCOPE, messages(), send))

    assert [message["type"] for message in sent] == ["http.response.start"]
    assert sent[0]["status"] == 200
    assert [record.msg for record in caplog.records] == ["request.failed", "request"]


def test_the_probes_without_an_access_line_are_the_probe_routes() -> None:
    assert {getattr(route, "path", None) for route in probes.router.routes} == PROBE_PATHS
