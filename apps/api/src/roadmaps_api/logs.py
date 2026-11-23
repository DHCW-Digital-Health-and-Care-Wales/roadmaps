"""JSON log lines on stdout, holding only allow-listed fields (ADR-017, ADR-018).

Every line is one JSON object. A field reaches it only if it is named here: the
record's own message is written only for this package's loggers, whose messages are
constants (ruff's `G` rules refuse formatted ones), and never with its arguments; a
third party's message, which may be preformatted with a value (uvicorn formats some
exceptions into theirs), is dropped. An exception is written as its type and stack
frames, never its message. A line written while serving a request carries its ID.
"""

import contextlib
import json
import logging
import sys
import traceback
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any, Final, override

PACKAGE: Final = "roadmaps_api"

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

# The `extra` fields a line may hold. Each is an ID, a code, a type, a name or a number,
# never a value a caller or a person supplied.
ALLOWED_EXTRA_FIELDS: Final = frozenset(
    {
        "method",
        "path",
        "status",
        "duration_ms",
        "code",
        "exception_type",
        "invalid_settings",
    }
)


def exception_type(exc: BaseException) -> str:
    cls = type(exc)
    return f"{cls.__module__}.{cls.__qualname__}"


def stack_frames(exc: BaseException) -> list[str]:
    """Where an exception was raised, as `file:line in function`, without source text."""
    return [
        f"{frame.filename}:{frame.lineno} in {frame.name}"
        for frame in traceback.extract_tb(exc.__traceback__)
    ]


class JsonFormatter(logging.Formatter):
    @override
    def format(self, record: logging.LogRecord) -> str:
        line: dict[str, Any] = {
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
        }
        own = record.name == PACKAGE or record.name.startswith(f"{PACKAGE}.")
        if own and isinstance(record.msg, str):
            line["message"] = record.msg
        request_id = request_id_var.get()
        if request_id is not None:
            line["request_id"] = request_id
        line.update(
            {
                field: value
                for field, value in record.__dict__.items()
                if field in ALLOWED_EXTRA_FIELDS
            }
        )
        if record.exc_info and record.exc_info[1] is not None:
            exc = record.exc_info[1]
            line["exception_type"] = exception_type(exc)
            line["stack"] = stack_frames(exc)
        return json.dumps(line, default=str)


class StdoutHandler(logging.Handler):
    """Writes to whatever `sys.stdout` is at each line, so a test's capture sees it."""

    @override
    def emit(self, record: logging.LogRecord) -> None:
        line = self.format(record)
        # A broken stdout leaves nowhere to log to. Logging's own handleError would print
        # the record's message and arguments to stderr, so the line is dropped instead.
        with contextlib.suppress(OSError, ValueError):
            sys.stdout.write(line + "\n")
            sys.stdout.flush()


# For `logging.config.dictConfig`, and so for uvicorn's `log_config`: every logger,
# uvicorn's included, propagates to the root's one JSON handler on stdout. uvicorn's
# access logger has no handler and does not propagate, since the API writes its own
# access lines without the query string or the client's address.
LOG_CONFIG: Final[dict[str, Any]] = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"json": {"()": JsonFormatter}},
    "handlers": {"stdout": {"()": StdoutHandler, "formatter": "json"}},
    "root": {"handlers": ["stdout"], "level": "INFO"},
    "loggers": {
        "uvicorn": {"handlers": [], "propagate": True},
        "uvicorn.error": {"handlers": [], "propagate": True},
        "uvicorn.access": {"handlers": [], "propagate": False},
    },
}
