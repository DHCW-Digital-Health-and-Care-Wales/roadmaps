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
    """The API's log configuration, as uvicorn and its factory apply it.

    After the test the root's handlers and level are restored and warnings are no longer
    captured (the factory captures them); the named loggers keep their settings.
    """
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    logging.config.dictConfig(LOG_CONFIG)
    yield
    logging.captureWarnings(capture=False)
    root.handlers[:] = handlers
    root.setLevel(level)
