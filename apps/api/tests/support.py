"""The test app: the API as `create_app` builds it, plus routes that only tests mount.

The probes take no input and never fail unexpectedly, so the 422 and 500 cases need a
route of their own, and the body limit a route that reads no body. The server test runs
`create_test_app` under uvicorn.
"""

import contextlib
import json
import socket
import threading
import time
from collections.abc import Callable, Generator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Annotated, Any, Final, override
from uuid import UUID

import httpx2
import pytest
import requests
import uvicorn
from fastapi import APIRouter, FastAPI, Query, Request
from fastapi.testclient import TestClient
from opentelemetry import trace
from opentelemetry.sdk.trace import ReadableSpan
from opentelemetry.sdk.trace.export import SpanExporter
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind, Status, StatusCode
from requests.adapters import BaseAdapter
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

# Imported only to raise one, as FastAPI's routing would for a status it never uses.
from starlette.exceptions import HTTPException  # noqa: TID251

from roadmaps_api.app import create_app
from roadmaps_api.authz import AuthenticatedPrincipal, PolicyAPIRoute, public
from roadmaps_api.settings import Environment, Settings, load_settings
from roadmaps_api.wire import ApiRequestModel
from tools.mock_oidc.app import create_mock_oidc_app

TEST_HOST: Final = "testserver"
TEST_EDITOR_ORIGIN: Final = f"http://{TEST_HOST}"
SAME_ORIGIN_HEADERS: Final = {"Sec-Fetch-Site": "same-origin"}
SAME_ORIGIN_JSON_HEADERS: Final = {
    "Sec-Fetch-Site": "same-origin",
    "Content-Type": "application/json",
}
# A port where nothing listens: the database is down.
DOWN_DATABASE_URL: Final = "postgresql+psycopg://roadmaps:roadmaps@127.0.0.1:1/roadmaps"
PLANTED: Final = "PLANTED-VALUE-7f3a"

# Applies the API's log configuration for the settings (`configure_logging` in conftest).
type ConfigureLogging = Callable[[Settings | None], None]


class Lines:
    """The JSON lines written on stdout, none holding the planted value."""

    def __init__(self, capsys: pytest.CaptureFixture[str]) -> None:
        self._capsys = capsys

    def read(self) -> list[dict[str, Any]]:
        captured = self._capsys.readouterr()
        assert captured.err == ""
        assert PLANTED not in captured.out
        parsed = [json.loads(line) for line in captured.out.splitlines()]
        # The test client's own lines, one per request it sends.
        return [line for line in parsed if line["logger"] != "httpx2"]


def server_span(spans: InMemorySpanExporter) -> ReadableSpan:
    """The one request span the exporter holds."""
    [span] = [span for span in spans.get_finished_spans() if span.kind is SpanKind.SERVER]
    return span


def free_port() -> int:
    """A port nothing listens on now."""
    with socket.create_server(("127.0.0.1", 0)) as probe:
        return probe.getsockname()[1]


DEFAULT_TEST_SESSION_ID: Final = UUID("01950000-0000-7000-8000-000000000099")


def make_principal(
    person_id: UUID,
    *,
    session_id: UUID = DEFAULT_TEST_SESSION_ID,
    provider: str = "local_mock",
) -> AuthenticatedPrincipal:
    """Builds a complete `AuthenticatedPrincipal` for dependency-override tests."""
    now = datetime.now(UTC)
    return AuthenticatedPrincipal(
        person_id=person_id,
        session_id=session_id,
        provider=provider,
        signed_in_at=now,
        idle_expires_at=now + timedelta(minutes=60),
        absolute_expires_at=now + timedelta(hours=10),
    )


class RecordingAdapter(BaseAdapter):
    """In-memory `requests.adapters.BaseAdapter` capturing outbound calls without sockets."""

    def __init__(
        self,
        handler: Callable[[requests.PreparedRequest, Any], tuple[int, dict[str, str], bytes]],
    ) -> None:
        super().__init__()
        self._handler = handler

    @override
    def send(
        self,
        request: requests.PreparedRequest,
        stream: bool = False,
        timeout: float | tuple[float | None, float | None] | None = None,
        verify: bool | str = True,
        cert: bytes | str | tuple[bytes | str, bytes | str] | None = None,
        proxies: dict[str, str] | None = None,
    ) -> requests.Response:
        assert request.url is not None
        assert request.method is not None
        status, headers, body = self._handler(request, timeout)
        response = requests.Response()
        response.status_code = status
        response.headers.update(headers)
        response._content = body  # noqa: SLF001 - standard BaseAdapter response construction
        response.url = request.url
        response.request = request
        return response

    def close(self) -> None:
        return None


def wait_until_serving(base_url: str, *, timeout: float) -> None:
    """Polls `base_url`'s `/health` until it answers 200, failing the test after `timeout`.

    The one pause the tests allow, `time.sleep` being banned elsewhere: an interval
    between checks of a condition, never a fixed wait standing in for one.
    """
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with contextlib.suppress(httpx2.TransportError):
            if httpx2.get(f"{base_url}/health").status_code == HTTPStatus.OK:
                return
        time.sleep(0.05)  # noqa: TID251 - a poll interval, not a wait for an outcome
    pytest.fail(f"no server answered at {base_url}")


@contextmanager
def serving_mock_oidc() -> Generator[str]:
    """Starts the in-repo local mock OIDC FastAPI app on an ephemeral loopback port."""
    port = free_port()
    base_url = f"http://127.0.0.1:{port}"
    mock_app = create_mock_oidc_app(base_url=base_url)
    server = uvicorn.Server(
        uvicorn.Config(mock_app, host="127.0.0.1", port=port, log_level="critical")
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    wait_until_serving(base_url, timeout=10.0)
    try:
        yield base_url
    finally:
        server.should_exit = True
        thread.join(timeout=5.0)


def make_settings(
    url: str = DOWN_DATABASE_URL,
    environment: Environment = Environment.TEST,
    hosts: tuple[str, ...] = (TEST_HOST,),
    editor_origin: str = TEST_EDITOR_ORIGIN,
    *,
    local_mock_oidc_url: str | None = None,
) -> Settings:
    return Settings(
        environment=environment,
        database_url=url,
        allowed_hosts=hosts,
        editor_origin=editor_origin,
        local_mock_oidc_url=local_mock_oidc_url,
    )


class Echo(ApiRequestModel):
    name: str


def add_test_routes(app: FastAPI) -> FastAPI:
    router = APIRouter(prefix="/test", route_class=PolicyAPIRoute)
    own = APIRouter(route_class=PolicyAPIRoute, dependencies=[public()])
    app.state.unread_calls = 0

    @own.post("/echo")
    def echo(body: Echo, count: Annotated[int, Query()] = 1) -> dict[str, object]:
        return {"name": body.name, "count": count}

    @own.post("/unread")
    def unread(request: Request) -> dict[str, str]:
        """Answers without reading the body, counting each call."""
        request.app.state.unread_calls += 1
        return {"status": "ok"}

    @own.get("/boom")
    def boom() -> None:
        raise ValueError(PLANTED)

    @own.get("/teapot")
    def teapot() -> None:
        raise HTTPException(status_code=418, detail=PLANTED)

    @own.get("/items/{item_id}")
    def item(item_id: str) -> dict[str, str]:
        return {"item": item_id}

    # Routers included in another, under a prefix of their own and one given at include
    # time, as the contract's resources will be under /api/v1.
    nested = APIRouter(prefix="/nested", route_class=PolicyAPIRoute, dependencies=[public()])

    @nested.get("/{item_id}")
    def nested_item(item_id: str) -> dict[str, str]:
        return {"item": item_id}

    admin = APIRouter(route_class=PolicyAPIRoute, dependencies=[public()])

    @admin.get("/things/{thing_id}")
    def thing(thing_id: str) -> dict[str, str]:
        return {"thing": thing_id}

    @admin.get("/health")
    def admin_health() -> dict[str, str]:
        return {"status": "ok"}

    add_tracing_routes(own)
    router.include_router(own)
    router.include_router(nested)
    router.include_router(admin, prefix="/admin")
    app.include_router(router)
    return app


def add_tracing_routes(router: APIRouter) -> None:
    """Routes that plant values where a span might take them up."""

    @router.get("/annotated")
    def annotated() -> dict[str, str]:
        """Writes a span attribute, an event and a status description no list allows."""
        span = trace.get_current_span()
        span.set_attribute("user.email", PLANTED)
        span.add_event(PLANTED, {"value": PLANTED})
        span.set_status(Status(StatusCode.ERROR, PLANTED))
        return {"status": "ok"}

    @router.get("/recorded")
    def recorded(request: Request) -> dict[str, str]:
        """Has the SDK record exceptions holding the planted value, as its own calls do."""
        tracer: trace.Tracer = request.app.state.tracer
        with contextlib.suppress(ValueError), tracer.start_as_current_span("child"):
            raise ValueError(PLANTED)
        trace.get_current_span().record_exception(ValueError(PLANTED))
        return {"status": "ok"}

    @router.get("/query")
    def query(request: Request) -> dict[str, str]:
        """Binds the planted value to a query, then to one that fails echoing it."""
        sessions: sessionmaker[Session] = request.app.state.sessions
        with sessions() as session:
            session.execute(text("SELECT :value"), {"value": PLANTED})
            session.execute(text("SELECT CAST(:value AS integer)"), {"value": PLANTED})
        return {"status": "ok"}


def mounted_app() -> FastAPI:
    """An app with a route of its own, to mount."""
    mounted = FastAPI()

    @mounted.get("/items/{item_id}")
    def mounted_item(item_id: str) -> dict[str, str]:
        return {"item": item_id}

    return mounted


@contextmanager
def serving(settings: Settings, span_exporter: SpanExporter | None = None) -> Generator[TestClient]:
    """A client of the test app, with its lifespan run, its spans sent to the exporter."""
    with TestClient(add_test_routes(create_app(settings, span_exporter=span_exporter))) as client:
        yield client


def create_test_app() -> FastAPI:
    """Uvicorn's factory for the server test: the settings come from the environment."""
    return add_test_routes(create_app(load_settings()))
