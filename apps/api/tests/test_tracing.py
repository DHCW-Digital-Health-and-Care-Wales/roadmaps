"""Each request is traced with spans that keep only allow-listed fields (STY-100).

Every request starts its own trace, whose ID is its request ID; a successful probe's spans
are dropped once its outcome is known; tests export only to the in-memory exporter they
read. The database's spans are in `tests/integration/test_tracing.py`.
"""

import dataclasses
import logging
import re
import threading
from collections.abc import Callable, Generator, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, override

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response
from opentelemetry import trace
from opentelemetry.sdk.trace import ReadableSpan
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind, StatusCode, format_span_id, format_trace_id
from sqlalchemy import create_engine, text

from roadmaps_api import tracing
from roadmaps_api.settings import MAX_BODY_BYTES, Settings, load_settings
from tests.support import (
    PLANTED,
    SAME_ORIGIN_HEADERS,
    TEST_HOST,
    Lines,
    free_port,
    make_settings,
    server_span,
    serving,
)

HEX_32 = re.compile(r"[0-9a-f]{32}")
CALLER_TRACE = "0af7651916cd43dd8448eb211c80319c"
INBOUND_CONTEXT = {
    "traceparent": f"00-{CALLER_TRACE}-b7ad6b7169203331-01",
    "tracestate": f"vendor={PLANTED}",
    "baggage": f"user={PLANTED}",
}


def trace_id(span: ReadableSpan) -> str:
    assert span.context is not None
    return format_trace_id(span.context.trace_id)


PROPAGATION = {
    "OTEL_PROPAGATORS unset": {},
    "OTEL_PROPAGATORS set to read the caller's context": {
        "OTEL_PROPAGATORS": "tracecontext,baggage"
    },
    "OTEL_SDK_DISABLED set": {"OTEL_SDK_DISABLED": "true"},
}


@pytest.mark.parametrize("environment", PROPAGATION.values(), ids=PROPAGATION)
def test_every_request_starts_its_own_trace_whose_id_is_its_request_id(
    monkeypatch: pytest.MonkeyPatch,
    spans: InMemorySpanExporter,
    lines: Lines,
    environment: dict[str, str],
) -> None:
    for name, value in environment.items():
        monkeypatch.setenv(name, value)

    with serving(make_settings(), spans) as client:
        response = client.get("/test/items/1", headers=INBOUND_CONTEXT)

    request_id = response.headers["X-Request-ID"]
    span = server_span(spans)
    assert HEX_32.fullmatch(request_id)
    assert request_id not in {CALLER_TRACE, "0" * 32}
    assert trace_id(span) == request_id
    assert span.parent is None
    [access] = lines.read()
    assert access["request_id"] == access["trace_id"] == request_id


def test_a_log_line_carries_the_trace_and_span_of_the_request_it_was_written_in(
    client: TestClient, spans: InMemorySpanExporter, lines: Lines
) -> None:
    response = client.get("/test/boom")

    failure, access = lines.read()
    span = server_span(spans)
    assert span.context is not None
    for line in (failure, access):
        assert line["request_id"] == line["trace_id"] == response.headers["X-Request-ID"]
        assert line["span_id"] == format_span_id(span.context.span_id)


def test_a_line_written_outside_a_request_carries_no_trace(lines: Lines) -> None:
    logging.getLogger("roadmaps_api.test").info("outside")

    [line] = lines.read()
    assert {"request_id", "trace_id", "span_id"}.isdisjoint(line)


def get(path: str, headers: dict[str, str] | None = None) -> Callable[[TestClient], Response]:
    return lambda client: client.get(path, headers=headers)


@dataclass(frozen=True)
class Served:
    send: Callable[[TestClient], Response]
    status: int
    name: str
    route: str | None
    error: bool


SERVED = {
    "a route": Served(
        get("/test/items/1"), 200, "GET /test/items/{item_id}", "/test/items/{item_id}", error=False
    ),
    "a path no route takes": Served(get("/nowhere"), 404, "GET", None, error=False),
    "a method HTTP does not define": Served(
        lambda client: client.request("BREW", "/nowhere"), 404, "HTTP", None, error=False
    ),
    "a Host the allow-list refuses, before routing": Served(
        get("/test/items/1", {"Host": "elsewhere.example"}), 400, "GET", None, error=False
    ),
    "a body over the limit": Served(
        lambda client: client.post("/test/echo", content=b"x" * (MAX_BODY_BYTES + 1)),
        413,
        "POST /test/echo",
        "/test/echo",
        error=False,
    ),
    "an invalid body": Served(
        lambda client: client.post("/test/echo", json={}, headers=SAME_ORIGIN_HEADERS),
        422,
        "POST /test/echo",
        "/test/echo",
        error=False,
    ),
    "a route that raises": Served(
        get("/test/boom"), 500, "GET /test/boom", "/test/boom", error=True
    ),
    "/ready with its database down": Served(get("/ready"), 503, "GET /ready", "/ready", error=True),
}


@pytest.mark.parametrize("case", SERVED.values(), ids=SERVED)
def test_a_server_span_is_named_by_its_route_and_marked_an_error_only_from_500(
    client: TestClient, spans: InMemorySpanExporter, case: Served
) -> None:
    response = case.send(client)

    span = server_span(spans)
    assert response.status_code == case.status
    assert span.name == case.name
    assert span.attributes is not None
    assert span.attributes.get("http.route") == case.route
    assert span.attributes["http.response.status_code"] == case.status
    assert span.attributes["roadmaps.request_id"] == response.headers["X-Request-ID"]
    assert trace_id(span) == response.headers["X-Request-ID"]
    assert (span.status.status_code is StatusCode.ERROR) == case.error
    assert span.status.description is None
    exceptions = [event for event in span.events if event.name == "exception"]
    assert len(exceptions) == (case.route == "/test/boom")


SPAN_KEYS = {
    "http.request.method",
    "http.route",
    "http.response.status_code",
    "roadmaps.request_id",
}


# The database down, at an address and as a login a span must not name.
PLANTED_DOWN_URL = f"postgresql+psycopg://{PLANTED}:{PLANTED}@127.0.0.1:1/roadmaps"


def test_a_span_keeps_only_allow_listed_fields(spans: InMemorySpanExporter) -> None:
    planted_headers = {"X-Planted": PLANTED, "User-Agent": PLANTED, "Cookie": f"c={PLANTED}"}
    with serving(make_settings(PLANTED_DOWN_URL), spans) as client:
        client.get(f"/test/items/1?token={PLANTED}", headers=planted_headers)
        client.get(f"/nowhere/{PLANTED}?token={PLANTED}", headers=planted_headers)
        client.get("/test/boom")
        client.get("/test/annotated")
        client.get("/test/recorded")
        assert client.get("/ready").status_code == 503

    finished = spans.get_finished_spans()
    assert len(finished) == 7
    for span in finished:
        assert span.attributes is not None
        assert set(span.attributes) <= SPAN_KEYS
        assert span.links == ()
        assert all(event.name == "exception" for event in span.events)
        assert dict(span.resource.attributes) == {
            "service.name": "roadmaps-api",
            "deployment.environment.name": "test",
        }
        whole = span.to_json()
        for absent in (PLANTED, "testclient", TEST_HOST, "127.0.0.1"):
            assert absent not in whole
    [boom] = [span for span in finished if span.name == "GET /test/boom"]
    [exception] = boom.events
    assert exception.attributes is not None
    assert set(exception.attributes) == {"exception.type", "exception.stacktrace"}
    assert exception.attributes["exception.type"] == "builtins.ValueError"
    assert " in boom" in str(exception.attributes["exception.stacktrace"])
    # Exceptions the SDK recorded itself keep their type alone: its stack trace holds the
    # message.
    for name in ("child", "GET /test/recorded"):
        [recorded] = [span for span in finished if span.name == name]
        assert [event.attributes for event in recorded.events] == [
            {"exception.type": "ValueError"}  # as the SDK names a built-in type
        ]


LIMIT_VARIABLES = {
    "no span attributes": {"OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT": "0"},
    "no attributes": {"OTEL_ATTRIBUTE_COUNT_LIMIT": "0"},
    "values of five characters": {"OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT": "5"},
    "span values of five characters": {"OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT": "5"},
    "no events": {"OTEL_SPAN_EVENT_COUNT_LIMIT": "0"},
}


@pytest.mark.parametrize("environment", LIMIT_VARIABLES.values(), ids=LIMIT_VARIABLES)
def test_the_sdk_s_span_limit_variables_change_nothing(
    monkeypatch: pytest.MonkeyPatch, spans: InMemorySpanExporter, environment: dict[str, str]
) -> None:
    for name, value in environment.items():
        monkeypatch.setenv(name, value)

    with serving(make_settings(), spans) as client:
        # Dropped still: `server_span` finds the one server span, the 500's.
        client.get("/health")
        response = client.get("/test/boom")

    span = server_span(spans)
    assert span.attributes is not None
    assert span.attributes["roadmaps.request_id"] == response.headers["X-Request-ID"]
    assert span.attributes["http.route"] == "/test/boom"
    assert [event.name for event in span.events] == ["exception"]


def test_a_successful_probe_exports_no_span_yet_has_a_trace_id(
    client: TestClient, spans: InMemorySpanExporter
) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert HEX_32.fullmatch(response.headers["X-Request-ID"])
    assert spans.get_finished_spans() == ()


@pytest.fixture
def pipeline() -> Iterator[tuple[tracing.CodeTracerProvider, InMemorySpanExporter]]:
    exporter = InMemorySpanExporter()
    provider = tracing.create_tracer_provider(make_settings(), exporter)
    yield provider, exporter
    provider.shutdown()


def test_a_span_ending_after_its_trace_s_probe_was_dropped_is_dropped_too(
    pipeline: tuple[tracing.CodeTracerProvider, InMemorySpanExporter],
) -> None:
    provider, exporter = pipeline
    tracer = provider.get_tracer("test")
    root = tracer.start_span("GET /health", kind=SpanKind.SERVER)
    late = tracer.start_span("SELECT", context=trace.set_span_in_context(root))
    root.set_attribute(tracing.PROBE_SUCCEEDED, value=True)
    root.end()
    late.end()

    assert exporter.get_finished_spans() == ()


def test_a_span_ending_after_its_trace_was_kept_is_exported(
    pipeline: tuple[tracing.CodeTracerProvider, InMemorySpanExporter],
) -> None:
    provider, exporter = pipeline
    tracer = provider.get_tracer("test")
    root = tracer.start_span("GET /ready", kind=SpanKind.SERVER)
    late = tracer.start_span("SELECT", context=trace.set_span_in_context(root))
    root.end()
    late.end()

    assert provider.force_flush()
    assert [span.name for span in exporter.get_finished_spans()] == ["GET /ready", "SELECT"]


def test_a_statement_whose_operation_cannot_be_read_is_named_by_its_database(
    pipeline: tuple[tracing.CodeTracerProvider, InMemorySpanExporter],
) -> None:
    provider, exporter = pipeline
    engine = create_engine("sqlite://")
    tracing.trace_queries(engine, provider.get_tracer("test"))

    with engine.connect() as connection:
        connection.execute(text("/* a comment first */ SELECT 1"))
    engine.dispose()

    [span] = exporter.get_finished_spans()
    assert span.name == "postgresql"
    assert span.attributes == {"db.query.text": "/* a comment first */ SELECT 1"}


def test_only_the_latest_dropped_traces_are_remembered(
    pipeline: tuple[tracing.CodeTracerProvider, InMemorySpanExporter],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(tracing, "DROPPED_TRACES_REMEMBERED", 1)
    provider, exporter = pipeline
    tracer = provider.get_tracer("test")
    first, second = (tracer.start_span("GET /health") for _ in range(2))
    late = tracer.start_span("SELECT", context=trace.set_span_in_context(first))
    for root in (first, second):
        root.set_attribute(tracing.PROBE_SUCCEEDED, value=True)
        root.end()
    late.end()

    # The first trace was forgotten once the second was dropped.
    assert [span.name for span in exporter.get_finished_spans()] == ["SELECT"]


class Collector(BaseHTTPRequestHandler):
    """A stand-in for Jaeger's OTLP port, recording each path posted to it."""

    posted: list[str]

    def do_POST(self) -> None:
        self.rfile.read(int(self.headers["Content-Length"]))
        type(self).posted.append(self.path)
        self.send_response(200)
        self.end_headers()

    @override
    def log_message(self, format: str, *args: Any) -> None:
        pass


@contextmanager
def collector() -> Generator[tuple[str, list[str]]]:
    posted: list[str] = []
    handler = type("Handler", (Collector,), {"posted": posted})
    with HTTPServer(("127.0.0.1", 0), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_address[1]}", posted
        finally:
            server.shutdown()


def with_endpoint(endpoint: str | None) -> Settings:
    return dataclasses.replace(make_settings(), otlp_endpoint=endpoint)


def test_an_api_with_an_endpoint_exports_its_spans_there() -> None:
    with collector() as (endpoint, posted):
        with serving(with_endpoint(endpoint)) as client:
            client.get("/test/items/1")

        assert posted == ["/v1/traces"]


def test_an_api_without_an_endpoint_exports_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    with collector() as (endpoint, posted):
        # Variables FastAPI's own telemetry or the SDK would export by, were they read.
        monkeypatch.setenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", f"{endpoint}/v1/traces")
        monkeypatch.setenv("FASTAPI_OTEL_AUTO_CONFIGURE", "true")
        with serving(with_endpoint(None)) as client:
            response = client.get("/test/items/1")

        assert HEX_32.fullmatch(response.headers["X-Request-ID"])
        assert posted == []


def test_a_test_s_exporter_is_the_only_one_whatever_the_environment_holds(
    monkeypatch: pytest.MonkeyPatch, spans: InMemorySpanExporter
) -> None:
    with collector() as (endpoint, posted):
        monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", endpoint)
        monkeypatch.setenv("FASTAPI_OTEL_AUTO_CONFIGURE", "true")
        monkeypatch.setenv("ROADMAPS_DATABASE_URL", make_settings().database_url)
        monkeypatch.setenv("ROADMAPS_ALLOWED_HOSTS", TEST_HOST)
        monkeypatch.setenv("ROADMAPS_EDITOR_ORIGIN", f"https://{TEST_HOST}")
        monkeypatch.setenv("ROADMAPS_GOOGLE_CLIENT_ID", "test-google-client-id")
        monkeypatch.setenv("ROADMAPS_GOOGLE_CLIENT_SECRET", "test-google-client-secret")
        monkeypatch.setenv("ROADMAPS_GOOGLE_ALLOWED_HD", "wales.nhs.uk")
        settings = load_settings()
        assert settings.otlp_endpoint == endpoint

        with serving(settings, spans) as client:
            client.get("/test/items/1")

        assert posted == []
        assert len(spans.get_finished_spans()) == 1


def test_the_exporter_s_failures_are_logged_without_their_url_or_message(
    monkeypatch: pytest.MonkeyPatch, lines: Lines
) -> None:
    port = str(free_port())
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_TIMEOUT", "1")

    with serving(with_endpoint(f"http://127.0.0.1:{port}")) as client:
        client.get(f"/test/items/1?token={PLANTED}")

    exporter = [line for line in lines.read() if line["logger"].startswith("opentelemetry")]
    assert exporter
    for line in exporter:
        assert set(line) == {"time", "level", "logger"}
        assert port not in str(line)
