"""The test app: the API as `create_app` builds it, plus routes that only tests mount.

The probes take no input and never fail unexpectedly, so the 422 and 500 cases need a
route of their own. The server test runs `create_test_app` under uvicorn.
"""

import os
from typing import Annotated, Final

from fastapi import APIRouter, FastAPI, Query
from pydantic import BaseModel

# Imported only to raise one, as FastAPI's routing would for a status it never uses.
from starlette.exceptions import HTTPException  # noqa: TID251

from roadmaps_api.app import create_app
from roadmaps_api.settings import Environment, Settings

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

    app.include_router(router)
    return app


def create_test_app() -> FastAPI:
    """Uvicorn's factory for the server test: the settings come from the environment."""
    return add_test_routes(create_app())
