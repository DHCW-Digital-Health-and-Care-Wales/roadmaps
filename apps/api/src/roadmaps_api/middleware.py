"""The API's own ASGI middleware, outermost in `create_app`, for ADR-020's response rules.

`RequestContext` starts each request's trace, whose ID is its request ID (`tracing`),
sets the headers on every response, writes the access line (named as `access_log` names
it), names and ends the request's span, and answers an unexpected error itself, so
nothing reaches Starlette's or uvicorn's own error handling, which would log the
exception's message. Inside it, Starlette's own middleware holds the `Host`
allow-list and the body limit (`create_app`), so their refusals carry the headers too.
"""

import logging
import time
from http import HTTPStatus
from typing import Final

from opentelemetry import trace
from opentelemetry.trace import Tracer
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from roadmaps_api.access_log import UNMATCHED, method_name, route_template
from roadmaps_api.errors import ErrorCode, error_response
from roadmaps_api.tracing import end_server_span, record_exception, start_server_span

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER: Final = "X-Request-ID"

# ADR-020: nothing is public yet, so nothing is cached; no CORS header is ever sent.
SECURITY_HEADERS: Final = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Resource-Policy": "same-origin",
}

# Platform probes: a success writes no access line and exports no span (a failure does).
PROBE_PATHS: Final = frozenset({"/health", "/ready"})
SUCCESS: Final = range(HTTPStatus.OK, HTTPStatus.MULTIPLE_CHOICES)


class RequestContext:
    def __init__(self, app: ASGIApp, tracer: Tracer) -> None:
        self.app = app
        self.tracer = tracer

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        entry = dict(scope)
        method = method_name(scope)
        # Its trace's ID, generated here, never taken from the caller's headers.
        span, request_id = start_server_span(self.tracer, method)
        started = time.perf_counter()
        status = 0
        completed = False

        async def send_with_headers(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                headers = MutableHeaders(scope=message)
                for name, value in SECURITY_HEADERS.items():
                    headers[name] = value
                headers[REQUEST_ID_HEADER] = request_id
            await send(message)

        # Current while the request is served, so its log lines and database spans are in
        # its trace; the span is ended here, after the access line.
        with trace.use_span(
            span, end_on_exit=False, record_exception=False, set_status_on_exception=False
        ):
            try:
                await self.app(scope, receive, send_with_headers)
                completed = True
            except Exception as exc:
                # The one place an unexpected error ends: its type and frames are logged.
                logger.exception("request.failed")
                record_exception(span, exc)
                if status == 0:
                    await error_response(ErrorCode.INTERNAL_ERROR)(
                        scope, receive, send_with_headers
                    )
            finally:
                route = route_template(entry, scope)
                # A probe is the root's own path and route both, so no other route's
                # template can silence a line or drop a span; one whose app raised or was
                # cancelled after its response started did not succeed.
                probe_succeeded = (
                    route in PROBE_PATHS
                    and entry["path"] == route
                    and status in SUCCESS
                    and completed
                )
                if not probe_succeeded:
                    logger.info(
                        "request",
                        extra={
                            "method": method,
                            "route": route,
                            "status": status,
                            "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                        },
                    )
                end_server_span(
                    span,
                    method=method,
                    route=None if route == UNMATCHED else route,
                    status=status,
                    probe_succeeded=probe_succeeded,
                )
