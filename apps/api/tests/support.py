"""The test app: the API as `create_app` builds it, plus routes that only tests mount.

The probes take no input and never fail unexpectedly, so the 422 and 500 cases need a
route of their own, and the body limit a route that reads no body. The server test runs
`create_test_app` under uvicorn.
"""

import json
from collections.abc import Callable, Generator
from contextlib import contextmanager
from typing import Annotated, Any, Final

import pytest
from fastapi import APIRouter, FastAPI, Query, Request
from fastapi.testclient import TestClient
from pydantic import BaseModel

# Imported only to raise one, as FastAPI's routing would for a status it never uses.
from starlette.exceptions import HTTPException  # noqa: TID251

from roadmaps_api.app import create_app
from roadmaps_api.settings import Environment, Settings, load_settings

TEST_HOST: Final = "testserver"
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


def make_settings(
    url: str = DOWN_DATABASE_URL,
    environment: Environment = Environment.TEST,
    hosts: tuple[str, ...] = (TEST_HOST,),
) -> Settings:
    return Settings(environment=environment, database_url=url, allowed_hosts=hosts)


class Echo(BaseModel):
    name: str


def add_test_routes(app: FastAPI) -> FastAPI:
    router = APIRouter(prefix="/test")
    app.state.unread_calls = 0

    @router.post("/echo")
    def echo(body: Echo, count: Annotated[int, Query()] = 1) -> dict[str, object]:
        return {"name": body.name, "count": count}

    @router.post("/unread")
    def unread(request: Request) -> dict[str, str]:
        """Answers without reading the body, counting each call."""
        request.app.state.unread_calls += 1
        return {"status": "ok"}

    @router.get("/boom")
    def boom() -> None:
        raise ValueError(PLANTED)

    @router.get("/teapot")
    def teapot() -> None:
        raise HTTPException(status_code=418, detail=PLANTED)

    @router.get("/items/{item_id}")
    def item(item_id: str) -> dict[str, str]:
        return {"item": item_id}

    # Routers included in another, under a prefix of their own and one given at include
    # time, as the contract's resources will be under /api/v1.
    nested = APIRouter(prefix="/nested")

    @nested.get("/{item_id}")
    def nested_item(item_id: str) -> dict[str, str]:
        return {"item": item_id}

    admin = APIRouter()

    @admin.get("/things/{thing_id}")
    def thing(thing_id: str) -> dict[str, str]:
        return {"thing": thing_id}

    @admin.get("/health")
    def admin_health() -> dict[str, str]:
        return {"status": "ok"}

    router.include_router(nested)
    router.include_router(admin, prefix="/admin")
    app.include_router(router)
    return app


def mounted_app() -> FastAPI:
    """An app with a route of its own, to mount."""
    mounted = FastAPI()

    @mounted.get("/items/{item_id}")
    def mounted_item(item_id: str) -> dict[str, str]:
        return {"item": item_id}

    return mounted


@contextmanager
def serving(settings: Settings) -> Generator[TestClient]:
    """A client of the test app, with its lifespan run."""
    with TestClient(add_test_routes(create_app(settings))) as client:
        yield client


def create_test_app() -> FastAPI:
    """Uvicorn's factory for the server test: the settings come from the environment."""
    return add_test_routes(create_app(load_settings()))
