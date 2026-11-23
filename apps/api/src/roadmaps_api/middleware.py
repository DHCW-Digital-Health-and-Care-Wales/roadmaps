"""ASGI middleware for ADR-020's response rules, outermost first in `create_app`.

`RequestContext` gives each request its ID, sets the headers on every response, writes
the access line and answers an unexpected error itself, so nothing reaches Starlette's
or uvicorn's own error handling, which would log the exception's message. Inside it,
`HostAllowList` refuses a `Host` the settings do not list, and `BodyLimit` refuses a
body over the limit before it is read whole.
"""

import logging
import re
import secrets
import time
from collections.abc import Iterable
from http import HTTPStatus
from typing import Final

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from roadmaps_api.errors import ErrorCode, error_response
from roadmaps_api.logs import request_id_var

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER: Final = "X-Request-ID"

# ADR-020: nothing is public yet, so nothing is cached; no CORS header is ever sent.
SECURITY_HEADERS: Final = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Resource-Policy": "same-origin",
}

# Platform probes: a success writes no access line (a failure still does).
PROBE_PATHS: Final = frozenset({"/health", "/ready"})
SUCCESS: Final = range(HTTPStatus.OK, HTTPStatus.MULTIPLE_CHOICES)


def new_request_id() -> str:
    """32 hex digits, the shape of the trace ID that replaces it."""
    return secrets.token_hex(16)


class RequestContext:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Generated here, never taken from the caller's header.
        request_id = new_request_id()
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status = 0

        async def send_with_headers(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                headers = MutableHeaders(scope=message)
                for name, value in SECURITY_HEADERS.items():
                    headers[name] = value
                headers[REQUEST_ID_HEADER] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_headers)
        except Exception:
            # The one place an unexpected error ends: its type and frames are logged.
            logger.exception("request.failed")
            if status == 0:
                await error_response(ErrorCode.INTERNAL_ERROR)(scope, receive, send_with_headers)
        finally:
            if not (scope["path"] in PROBE_PATHS and status in SUCCESS):
                logger.info(
                    "request",
                    extra={
                        "method": scope["method"],
                        # The path alone: Starlette keeps the query string apart.
                        "path": scope["path"],
                        "status": status,
                        "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                    },
                )
            request_id_var.reset(token)


# A name or a bracketed IPv6 literal, then at most a port.
_HOST: Final = re.compile(r"(?P<name>\[[0-9a-f:.]+\]|[^\[\]:]+)(?::\d*)?")


def _host_name(host: str) -> str | None:
    """The host without its port, or None for a header that is no host."""
    match = _HOST.fullmatch(host)
    return match["name"] if match else None


def _host_matches(host: str, pattern: str) -> bool:
    if pattern == "*":
        return True
    if pattern.startswith("*."):
        return host.endswith(pattern[1:])
    return host == pattern


class HostAllowList:
    """Reads the `Host` header only, never `X-Forwarded-Host` (ADR-020)."""

    def __init__(self, app: ASGIApp, allowed_hosts: Iterable[str]) -> None:
        self.app = app
        self.allowed_hosts = tuple(allowed_hosts)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        host = _host_name(Headers(scope=scope).get("host", "").lower())
        if host is not None and any(_host_matches(host, pattern) for pattern in self.allowed_hosts):
            await self.app(scope, receive, send)
            return
        await error_response(ErrorCode.HOST_NOT_ALLOWED)(scope, receive, send)


class BodyLimit:
    """Refuses a body over `max_bytes`, declared or streamed, before it is read whole.

    A declared `Content-Length` over the limit is refused unread. Otherwise the body is
    read here, chunk by chunk, up to the limit, and handed on: FastAPI turns an error
    raised while it reads a body into a 400, so the limit cannot be raised from there.
    """

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        too_large = error_response(ErrorCode.BODY_TOO_LARGE)
        declared = Headers(scope=scope).get("content-length", "")
        if declared.isdigit() and int(declared) > self.max_bytes:
            await too_large(scope, receive, send)
            return

        chunks: list[bytes] = []
        received = 0
        while True:
            message = await receive()
            if message["type"] != "http.request":
                # The client went away: the app sees the disconnect as it would have.
                break
            chunk = message.get("body", b"")
            received += len(chunk)
            if received > self.max_bytes:
                await too_large(scope, receive, send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                message = {"type": "http.request", "body": b"".join(chunks), "more_body": False}
                break
        pending = [message]

        async def replay() -> Message:
            return pending.pop() if pending else await receive()

        await self.app(scope, replay, send)
