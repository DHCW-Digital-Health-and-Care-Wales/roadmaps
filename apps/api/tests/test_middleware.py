"""The middleware's cases no request through `TestClient` can reach."""

import asyncio
import logging

import pytest
from starlette.types import Message, Receive, Scope, Send

from roadmaps_api.middleware import PROBE_PATHS, BodyLimit, RequestContext
from roadmaps_api.routes import probes

SCOPE: Scope = {"type": "http", "method": "POST", "path": "/x", "headers": []}


def messages(*sent: Message) -> Receive:
    queue = list(sent)

    async def receive() -> Message:
        return queue.pop(0)

    return receive


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


def test_the_body_limit_hands_on_a_disconnect_then_the_messages_after_it() -> None:
    received: list[Message] = []

    async def app(_scope: Scope, receive: Receive, _send: Send) -> None:
        received.append(await receive())
        received.append(await receive())

    async def send(_message: Message) -> None:
        pytest.fail("nothing is sent")

    disconnect: Message = {"type": "http.disconnect"}
    asyncio.run(BodyLimit(app, max_bytes=8)(SCOPE, messages(disconnect, disconnect), send))

    assert received == [disconnect, disconnect]


def test_the_body_limit_joins_a_streamed_body_under_the_limit() -> None:
    received: list[Message] = []

    async def app(_scope: Scope, receive: Receive, _send: Send) -> None:
        received.append(await receive())

    async def send(_message: Message) -> None:
        pytest.fail("nothing is sent")

    body = messages(
        {"type": "http.request", "body": b"abc", "more_body": True},
        {"type": "http.request", "body": b"def", "more_body": False},
    )
    asyncio.run(BodyLimit(app, max_bytes=8)(SCOPE, body, send))

    assert received == [{"type": "http.request", "body": b"abcdef", "more_body": False}]


def test_the_probes_without_an_access_line_are_the_probe_routes() -> None:
    assert {getattr(route, "path", None) for route in probes.router.routes} == PROBE_PATHS
