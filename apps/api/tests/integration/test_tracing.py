"""S4 and S5: database spans keep what their statements are, never their values.

A database span keeps its statement's placeholders and no value; a successful `/ready`
exports none of its spans, a failing one all of them.
"""

import psycopg
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind, StatusCode
from sqlalchemy.engine import make_url

from tests.harness import holding
from tests.support import PLANTED, make_settings, server_span, serving


def test_a_database_span_keeps_its_statement_with_placeholders_and_no_value(
    database_url: str, spans: InMemorySpanExporter
) -> None:
    with serving(make_settings(database_url), spans) as client:
        response = client.get("/test/query")

    assert response.status_code == 500
    url = make_url(database_url)
    finished = spans.get_finished_spans()
    server = server_span(spans)
    queries = [span for span in finished if span.kind is SpanKind.CLIENT]
    assert [span.attributes for span in queries] == [
        {"db.operation.name": "SELECT", "db.query.text": "SELECT %(value)s"},
        {"db.operation.name": "SELECT", "db.query.text": "SELECT CAST(%(value)s AS integer)"},
    ]
    for query in queries:
        assert query.name == "SELECT"
        assert query.parent is not None
        assert server.context is not None
        assert query.parent.span_id == server.context.span_id
    failed = queries[1]
    assert failed.status.status_code is StatusCode.ERROR
    [exception] = failed.events
    assert exception.attributes is not None
    assert exception.attributes["exception.type"] == "psycopg.errors.InvalidTextRepresentation"
    for span in finished:
        whole = span.to_json()
        for absent in (PLANTED, url.host, url.username):
            assert str(absent) not in whole


def test_a_successful_ready_exports_none_of_its_spans(
    database_url: str, spans: InMemorySpanExporter
) -> None:
    with serving(make_settings(database_url), spans) as client:
        response = client.get("/ready")

    assert response.status_code == 200
    assert len(response.headers["X-Request-ID"]) == 32
    assert spans.get_finished_spans() == ()


def test_a_failing_ready_exports_its_spans_its_queries_included(
    database_url: str, spans: InMemorySpanExporter, versions: psycopg.Connection
) -> None:
    holding("0000_older")(versions)

    with serving(make_settings(database_url), spans) as client:
        response = client.get("/ready")

    assert response.status_code == 503
    finished = spans.get_finished_spans()
    server = server_span(spans)
    queries = [span for span in finished if span.kind is SpanKind.CLIENT]
    assert server.status.status_code is StatusCode.ERROR
    assert len(queries) == 4
    assert server.context is not None
    for query in queries:
        assert query.context is not None
        assert query.context.trace_id == server.context.trace_id
        assert query.parent is not None
        assert query.parent.span_id == server.context.span_id
