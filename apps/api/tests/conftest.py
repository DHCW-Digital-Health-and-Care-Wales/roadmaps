import logging
import logging.config
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from roadmaps_api.logs import LOG_CONFIG
from tests.support import make_settings, serving


@pytest.fixture
def client() -> Iterator[TestClient]:
    """The API with its database down; the readiness tests bring their own."""
    with serving(make_settings()) as client:
        yield client


@pytest.fixture
def json_logging() -> Iterator[None]:
    """The API's log configuration, as uvicorn applies it, undone after the test."""
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    logging.config.dictConfig(LOG_CONFIG)
    yield
    root.handlers[:] = handlers
    root.setLevel(level)
