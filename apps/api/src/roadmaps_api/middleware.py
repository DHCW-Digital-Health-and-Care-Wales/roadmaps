"""The API's own ASGI middleware, outermost in `create_app`, for ADR-020's response rules.

`RequestContext` gives each request its ID, sets the headers on every response, writes
the access line (named as `access_log` names it) and answers an unexpected error
itself, so nothing reaches Starlette's or uvicorn's own error handling, which would log
the exception's message. Inside it, Starlette's own middleware holds the `Host`
allow-list and the body limit (`create_app`), so their refusals carry the headers too.
"""

import logging
import secrets
import time
from http import HTTPStatus
from typing import Final

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from roadmaps_api.access_log import method_name, route_template
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

        entry = dict(scope)
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
            route = route_template(entry, scope)
            # A probe is the root's own path and route both, so no other route's
            # template can silence a line.
            probe = route in PROBE_PATHS and entry["path"] == route
            if not (probe and status in SUCCESS):
                logger.info(
                    "request",
                    extra={
                        "method": method_name(scope),
                        "route": route,
                        "status": status,
                        "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                    },
                )
            request_id_var.reset(token)
