from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from tests.support import add_test_routes, make_settings

from roadmaps_api.app import create_app
from roadmaps_api.settings import Settings


def client_for(settings: Settings) -> Iterator[TestClient]:
    app: FastAPI = add_test_routes(create_app(settings))
    with TestClient(app) as client:
        yield client


@pytest.fixture
def client() -> Iterator[TestClient]:
    """The API with its database down; the readiness tests bring their own."""
    yield from client_for(make_settings())
