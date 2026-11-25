"""The API's traces: one per request, holding only allow-listed fields (ADR-017, STY-100).

Everything is set in code, never from OpenTelemetry's environment variables: the tracer
provider, which always records, so each request has a trace ID for its request ID, even
with `OTEL_SDK_DISABLED` set; its sampler, IDs and resource; and the export pipeline,
which is none without an exporter. No inbound trace context is ever read, so every
request starts its own trace (`RequestContext`). Nothing is global: FastAPI's own
telemetry stays off (`create_app`), and code that adds to a trace writes to the current
span or takes the app's tracer (`app.state.tracer`).

Before export, `ProbeDrop` drops a successful probe's spans once its outcome is known,
then `AllowList` keeps only the allow-listed fields of each span; a span needing a new
attribute records it as a decision of its own, within ADR-018's rule that only IDs are
logged (STY-100 D15).
"""

import re
import threading
from collections import OrderedDict
from collections.abc import Mapping
from typing import Any, Final, override

from opentelemetry.context import Context
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import Event, ReadableSpan, SpanProcessor, TracerProvider, sampling
from opentelemetry.sdk.trace import Span as RecordingSpan
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SimpleSpanProcessor, SpanExporter
from opentelemetry.trace import Span, SpanKind, Status, StatusCode, Tracer, format_trace_id
from sqlalchemy import Engine, event
from sqlalchemy.engine import Connection, ExceptionContext

from roadmaps_api.logs import exception_type, stack_frames
from roadmaps_api.settings import Settings

INSTRUMENTATION: Final = "roadmaps_api"

# A server span's attributes (OpenTelemetry's HTTP conventions), its duration being its
# own, and a database span's (its database conventions).
HTTP_METHOD: Final = "http.request.method"
HTTP_ROUTE: Final = "http.route"
HTTP_STATUS: Final = "http.response.status_code"
REQUEST_ID: Final = "roadmaps.request_id"
DB_OPERATION: Final = "db.operation.name"
DB_QUERY_TEXT: Final = "db.query.text"
SPAN_ATTRIBUTES: Final = frozenset(
    {HTTP_METHOD, HTTP_ROUTE, HTTP_STATUS, REQUEST_ID, DB_OPERATION, DB_QUERY_TEXT}
)

# An exception is recorded as its type and where it was raised, never its message.
EXCEPTION_EVENT: Final = "exception"
EXCEPTION_TYPE: Final = "exception.type"
EXCEPTION_STACKTRACE: Final = "exception.stacktrace"
EVENT_ATTRIBUTES: Final = frozenset({EXCEPTION_TYPE, EXCEPTION_STACKTRACE})

SERVICE_NAME: Final = "service.name"
ENVIRONMENT: Final = "deployment.environment.name"

# The first status a server span is marked an error from.
HTTP_SERVER_ERROR: Final = 500

# Set on a successful probe's server span, so `ProbeDrop` drops its trace; never exported.
PROBE_SUCCEEDED: Final = "roadmaps.probe_succeeded"
# How many dropped traces `ProbeDrop` remembers, to drop a span that ends after its trace's.
DROPPED_TRACES_REMEMBERED: Final = 1024

# The statement's first keyword: its operation.
_OPERATION = re.compile(r"\s*([A-Za-z]+)")
_SPANS_KEY: Final = "roadmaps_api.spans"


class CodeTracerProvider(TracerProvider):
    """A provider configured in code alone, whose tracers always record.

    The SDK's own provider hands out tracers that make no spans, so all-zero trace IDs,
    while `OTEL_SDK_DISABLED` is true; this one reads only what it is given.
    """

    def __init__(self, resource: Resource) -> None:
        super().__init__(sampler=sampling.ALWAYS_ON, resource=resource, shutdown_on_exit=False)
        self._disabled = False


def create_tracer_provider(
    settings: Settings, exporter: SpanExporter | None = None
) -> CodeTracerProvider:
    """The API's provider, exporting to `exporter`, else to the settings' OTLP endpoint.

    A test's exporter takes each span as it ends, and is the only one, whatever the
    settings hold; without either, nothing is exported, yet every span still has its IDs.
    """
    resource = Resource(
        {SERVICE_NAME: settings.service_name, ENVIRONMENT: settings.environment.value}
    )
    provider = CodeTracerProvider(resource)
    processor: SpanProcessor | None = None
    if exporter is not None:
        processor = SimpleSpanProcessor(exporter)
    elif settings.otlp_endpoint is not None:
        processor = BatchSpanProcessor(
            OTLPSpanExporter(endpoint=f"{settings.otlp_endpoint}/v1/traces")
        )
    if processor is not None:
        provider.add_span_processor(ProbeDrop(AllowList(processor, resource)))
    return provider


def record_exception(span: Span, exc: BaseException) -> None:
    """Marks the span an error, recording the exception's type and frames, not its text."""
    span.add_event(
        EXCEPTION_EVENT,
        {
            EXCEPTION_TYPE: exception_type(exc),
            EXCEPTION_STACKTRACE: "\n".join(stack_frames(exc)),
        },
    )
    span.set_status(Status(StatusCode.ERROR))


def start_server_span(tracer: Tracer, method: str) -> tuple[Span, str]:
    """A request's span, in a trace of its own, and its request ID, the trace's ID.

    No caller's context is read, whatever `OTEL_PROPAGATORS` holds (STY-100 D5, D16).
    """
    span = tracer.start_span(
        server_span_name(method, None),
        context=Context(),
        kind=SpanKind.SERVER,
        attributes={HTTP_METHOD: method},
    )
    request_id = format_trace_id(span.get_span_context().trace_id)
    span.set_attribute(REQUEST_ID, request_id)
    return span, request_id


def end_server_span(
    span: Span, *, method: str, route: str | None, status: int, probe_succeeded: bool
) -> None:
    """Names the span by its route's template, or its method alone, and ends it.

    A 5xx is an error, a 4xx not (OpenTelemetry's HTTP conventions).
    """
    span.update_name(server_span_name(method, route))
    if route is not None:
        span.set_attribute(HTTP_ROUTE, route)
    span.set_attribute(HTTP_STATUS, status)
    if status >= HTTP_SERVER_ERROR:
        span.set_status(Status(StatusCode.ERROR))
    if probe_succeeded:
        span.set_attribute(PROBE_SUCCEEDED, value=True)
    span.end()


def server_span_name(method: str, route: str | None) -> str:
    """`GET /api/v1/roadmaps/{id}`, or the method alone; `HTTP` for a method not defined."""
    name = "HTTP" if method == "_OTHER" else method
    return name if route is None else f"{name} {route}"


def trace_queries(engine: Engine, tracer: Tracer) -> None:
    """A span for each statement the engine runs, a child of the span current then.

    It holds the operation and the statement's text, whose values are bound parameters
    shown by their placeholders (`%(id)s`), never the values.
    """
    queries = _QuerySpans(tracer)
    event.listen(engine, "before_cursor_execute", queries.start)
    event.listen(engine, "after_cursor_execute", queries.end)
    event.listen(engine, "handle_error", queries.fail)


class _QuerySpans:
    """Each connection's statement spans, kept on it from the statement's start to its end."""

    def __init__(self, tracer: Tracer) -> None:
        self._tracer = tracer

    def start(
        self, connection: Connection, _cursor: object, statement: str, *_rest: object
    ) -> None:
        attributes = {DB_QUERY_TEXT: statement}
        operation = _OPERATION.match(statement)
        if operation is not None:
            attributes[DB_OPERATION] = operation.group(1).upper()
        span = self._tracer.start_span(
            attributes.get(DB_OPERATION, "postgresql"),
            kind=SpanKind.CLIENT,
            attributes=attributes,
        )
        connection.info.setdefault(_SPANS_KEY, []).append(span)

    def end(self, connection: Connection, *_rest: object) -> None:
        connection.info[_SPANS_KEY].pop().end()

    def fail(self, context: ExceptionContext) -> None:
        """Ends the failed statement's span as an error; one that failed to connect has none."""
        spans: list[Span] = (
            context.connection.info.get(_SPANS_KEY, []) if context.connection else []
        )
        if spans:
            span = spans.pop()
            record_exception(span, context.original_exception)
            span.end()


class ProbeDrop(SpanProcessor):
    """Holds each request's spans until its own span ends, then drops a successful probe's.

    A trace is kept or dropped once its outcome is known, never up front, so a probe that
    fails exports all its spans (STY-100 D17). A span ending after its trace was decided
    follows the decision; one in no request's trace is passed on as it ends.
    """

    def __init__(self, then: SpanProcessor) -> None:
        self._then = then
        self._lock = threading.Lock()
        self._pending: dict[int, list[ReadableSpan]] = {}
        self._dropped: OrderedDict[int, None] = OrderedDict()

    @override
    def on_start(self, span: RecordingSpan, parent_context: Context | None = None) -> None:
        if span.parent is None:
            with self._lock:
                self._pending[span.context.trace_id] = []
        self._then.on_start(span, parent_context)

    @override
    def on_end(self, span: ReadableSpan) -> None:
        # An SDK span always has its context; 0 is the invalid trace ID otherwise.
        trace_id = getattr(span.context, "trace_id", 0)
        with self._lock:
            held = self._pending.get(trace_id)
            if held is not None and span.parent is not None:
                held.append(span)
                return
            if held is not None:
                del self._pending[trace_id]
                if (span.attributes or {}).get(PROBE_SUCCEEDED):
                    self._remember_dropped(trace_id)
                    return
                ending = [*held, span]
            elif trace_id in self._dropped:
                return
            else:
                ending = [span]
        for finished in ending:
            self._then.on_end(finished)

    def _remember_dropped(self, trace_id: int) -> None:
        self._dropped[trace_id] = None
        while len(self._dropped) > DROPPED_TRACES_REMEMBERED:
            self._dropped.popitem(last=False)

    @override
    def shutdown(self) -> None:
        self._then.shutdown()

    @override
    def force_flush(self, timeout_millis: int = 30000) -> bool:
        return self._then.force_flush(timeout_millis)


class AllowList(SpanProcessor):
    """Passes on each span with only its allow-listed fields (STY-100 S4, D15).

    Its attributes by `SPAN_ATTRIBUTES`; its events only as recorded exceptions, with
    `EVENT_ATTRIBUTES`; no link, no status description, and the API's own resource.
    """

    def __init__(self, then: SpanProcessor, resource: Resource) -> None:
        self._then = then
        self._resource = resource

    @override
    def on_start(self, span: RecordingSpan, parent_context: Context | None = None) -> None:
        self._then.on_start(span, parent_context)

    @override
    def on_end(self, span: ReadableSpan) -> None:
        self._then.on_end(
            ReadableSpan(
                name=span.name,
                context=span.context,
                parent=span.parent,
                resource=self._resource,
                attributes=_allowed(span.attributes, SPAN_ATTRIBUTES),
                events=[
                    Event(
                        EXCEPTION_EVENT,
                        _allowed(recorded.attributes, EVENT_ATTRIBUTES),
                        recorded.timestamp,
                    )
                    for recorded in span.events
                    if recorded.name == EXCEPTION_EVENT
                ],
                links=(),
                kind=span.kind,
                status=Status(span.status.status_code),
                start_time=span.start_time,
                end_time=span.end_time,
                instrumentation_scope=span.instrumentation_scope,
            )
        )

    @override
    def shutdown(self) -> None:
        self._then.shutdown()

    @override
    def force_flush(self, timeout_millis: int = 30000) -> bool:
        return self._then.force_flush(timeout_millis)


def _allowed(attributes: Mapping[str, Any] | None, keys: frozenset[str]) -> dict[str, Any]:
    return {key: value for key, value in (attributes or {}).items() if key in keys}
