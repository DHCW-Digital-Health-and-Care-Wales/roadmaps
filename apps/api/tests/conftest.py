import logging
import logging.config
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from roadmaps_api.logs import log_config
from tests.support import ConfigureLogging, Lines, make_settings, serving


@pytest.fixture
def client() -> Iterator[TestClient]:
    """The API with its database down; the readiness tests bring their own."""
    with serving(make_settings()) as client:
        yield client


@pytest.fixture
def configure_logging() -> Iterator[ConfigureLogging]:
    """Applies the API's log configuration for the settings, as uvicorn and its factory do.

    After the test the root's handlers and level and uvicorn's levels are restored, and
    warnings are no longer captured (the factory captures them).
    """
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    uvicorn = [logging.getLogger(name) for name in ("uvicorn", "uvicorn.error")]
    levels = [logger.level for logger in uvicorn]
    yield lambda settings: logging.config.dictConfig(log_config(settings))
    logging.captureWarnings(capture=False)
    root.handlers[:] = handlers
    root.setLevel(level)
    for logger, uvicorn_level in zip(uvicorn, levels, strict=True):
        logger.setLevel(uvicorn_level)


@pytest.fixture
def json_logging(configure_logging: ConfigureLogging) -> None:
    """The configuration before the settings are read, which writes no message."""
    configure_logging(None)


@pytest.fixture
def lines(
    capsys: pytest.CaptureFixture[str],
    json_logging: None,  # noqa: ARG001 - requested for its configuration
) -> Lines:
    return Lines(capsys)
