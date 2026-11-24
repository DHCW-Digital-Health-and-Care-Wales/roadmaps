"""The test app: the API as `create_app` builds it, plus routes that only tests mount.

The probes take no input and never fail unexpectedly, so the 422 and 500 cases need a
route of their own. The server test runs `create_test_app` under uvicorn.
"""

import os
from collections.abc import Generator
from contextlib import contextmanager
from typing import Annotated, Final

from fastapi import APIRouter, FastAPI, Query
from fastapi.responses import PlainTextResponse
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


def database_url() -> str:
    """The test database, which `scripts/api.sh test` or CI's service container gives."""
    url = os.environ.get("ROADMAPS_TEST_DATABASE_URL")
    if not url:
        msg = "Run the tests with pnpm api:test, which sets ROADMAPS_TEST_DATABASE_URL."
        raise RuntimeError(msg)
    return url


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

    @router.post("/echo")
    def echo(body: Echo, count: Annotated[int, Query()] = 1) -> dict[str, object]:
        return {"name": body.name, "count": count}

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

    # A mounted app, under a template of its own, and a mounted app with no routes.
    tenant = FastAPI()

    @tenant.get("/items/{item_id}")
    def tenant_item(item_id: str) -> dict[str, str]:
        return {"item": item_id}

    app.mount("/test/tenants/{tenant}", tenant)
    app.mount("/test/raw", PlainTextResponse("raw"))
    return app


@contextmanager
def serving(settings: Settings) -> Generator[TestClient]:
    """A client of the test app, with its lifespan run."""
    with TestClient(add_test_routes(create_app(settings))) as client:
        yield client


def create_test_app() -> FastAPI:
    """Uvicorn's factory for the server test: the settings come from the environment."""
    return add_test_routes(create_app(load_settings()))
