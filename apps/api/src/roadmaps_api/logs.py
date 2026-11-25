"""JSON log lines on stdout, holding only allow-listed fields (ADR-017, ADR-018).

Every line is one JSON object. A field reaches it only if it is named here: the
record's own message is written only for this package's loggers, whose messages are
constants (ruff's `G` rules refuse formatted ones), and never with its arguments. An
exception is written as codes and names that tell one failure from another: its type,
the types of the exceptions it was raised from, and a database error's SQLSTATE and
constraint name, beside its stack frames. A line written while serving a request
carries its ID.

A third party's message, which may be preformatted with a value (uvicorn formats some
exceptions into theirs), and an exception's message are written only where the settings
allow it, on a developer's own machine (`Settings.writes_messages`); before the
settings are read, never.
"""

import contextlib
import json
import logging
import sys
import traceback
from collections.abc import Callable
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any, Final, override

import psycopg

from roadmaps_api.settings import Settings

PACKAGE: Final = "roadmaps_api"

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

# The `extra` fields a line may hold. Each is an ID, a code, a type, a name or a number,
# never a value a caller or a person supplied: an access line names its request by its
# route's template and a method HTTP defines (`access_log`), never as the caller sent it.
ALLOWED_EXTRA_FIELDS: Final = frozenset(
    {
        "method",
        "route",
        "status",
        "duration_ms",
        "code",
        "cause",
        "invalid_settings",
        # A revision `/ready` found ahead of the code's, only once it reads `NNNN_<slug>`.
        "revision",
    }
)


def exception_type(exc: BaseException) -> str:
    cls = type(exc)
    return f"{cls.__module__}.{cls.__qualname__}"


def exception_chain(exc: BaseException) -> list[BaseException]:
    """The exception, then each it was raised from, as Python prints them.

    Its cause, else its context unless suppressed (`raise … from None`), stopping at an
    exception already met.
    """
    chain: list[BaseException] = []
    current: BaseException | None = exc
    while current is not None and all(current is not met for met in chain):
        chain.append(current)
        context = None if current.__suppress_context__ else current.__context__
        current = current.__cause__ or context
    return chain


def stack_frames(exc: BaseException) -> list[str]:
    """Where an exception was raised, as `file:line in function`, without source text."""
    return [
        f"{frame.filename}:{frame.lineno} in {frame.name}"
        for frame in traceback.extract_tb(exc.__traceback__)
    ]


def exception_fields(exc: BaseException) -> dict[str, Any]:
    """The codes and names that tell one failure from another, never a message or value.

    SQLSTATE and the constraint's name come from psycopg's diagnostics, as the database
    reported them, never from a message's text. A database function can set either, so
    one this repository writes never sets them from a value (ADR-018).
    """
    chain = exception_chain(exc)
    fields: dict[str, Any] = {
        "exception_type": exception_type(exc),
        "exception_causes": [exception_type(cause) for cause in chain[1:]],
    }
    for error in chain:
        if isinstance(error, psycopg.Error) and error.diag.sqlstate is not None:
            fields["sqlstate"] = error.diag.sqlstate
            if error.diag.constraint_name is not None:
                fields["constraint_name"] = error.diag.constraint_name
            break
    fields["stack"] = stack_frames(exc)
    return fields


class JsonFormatter(logging.Formatter):
    def __init__(self, *, messages: bool = False) -> None:
        super().__init__()
        self.messages = messages

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
        elif not own and self.messages:
            line["message"] = _text(record.getMessage)
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
            line.update(exception_fields(exc))
            if self.messages:
                line["exception_message"] = _text(lambda: str(exc))
        return json.dumps(line, default=str)


def _text(render: Callable[[], object]) -> str | None:
    """A message as its writer formats it, or None where formatting it fails.

    A third party's arguments that do not fit its format, or an exception whose `__str__`
    raises, would otherwise raise in the code that logged it.
    """
    try:
        return str(render())
    except Exception:  # noqa: BLE001 - any failure to format leaves the message out
        return None


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


def log_config(settings: Settings | None = None) -> dict[str, Any]:
    """The configuration for `logging.config.dictConfig`, and so for uvicorn's `log_config`.

    `None` is before the settings are read. Every logger, uvicorn's included, propagates
    to the root's one JSON handler on stdout. uvicorn's access logger has no handler and
    does not propagate, since the API writes its own access lines without the query
    string or the client's address. Where messages are dropped, uvicorn's loggers write
    from warning up, since its information lines would hold only a time and a logger.
    """
    messages = settings is not None and settings.writes_messages
    uvicorn_level = "INFO" if messages else "WARNING"
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {"json": {"()": JsonFormatter, "messages": messages}},
        "handlers": {"stdout": {"()": StdoutHandler, "formatter": "json"}},
        "root": {"handlers": ["stdout"], "level": "INFO"},
        "loggers": {
            "uvicorn": {"handlers": [], "propagate": True, "level": uvicorn_level},
            "uvicorn.error": {"handlers": [], "propagate": True, "level": uvicorn_level},
            "uvicorn.access": {"handlers": [], "propagate": False},
        },
    }
