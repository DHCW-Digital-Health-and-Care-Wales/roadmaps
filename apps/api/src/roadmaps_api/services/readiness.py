import contextvars
import logging
import queue
import threading
from dataclasses import dataclass
from enum import StrEnum
from typing import Annotated, NoReturn

from fastapi import Depends, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.database import TIMEOUT_SECONDS, Sessions
from roadmaps_api.errors import ApiError, ErrorCode
from roadmaps_api.migrations import Revision
from roadmaps_api.repositories.readiness import ReadinessRepository
from roadmaps_api.roles import APP_ROLE, CLOUD_SQL_IAM_ROLES

logger = logging.getLogger(__name__)


class Cause(StrEnum):
    """Why `/ready` is not ready, in its warning; the response has one code (STY-091 D20)."""

    NO_CONNECTION = "readiness.no_connection"
    REVISION_NOT_SERVED = "readiness.revision_not_served"
    LOGIN_UNSAFE = "readiness.login_unsafe"


@dataclass(frozen=True)
class Found:
    """What the database answered."""

    login_is_safe: bool
    # `alembic_version`'s rows; None without the table, or for an unsafe login, whose
    # revision is not read.
    revisions: list[str] | None


type Outcome = queue.SimpleQueue[Found | Exception]


def served_revision(latest: Revision, revisions: list[str] | None) -> Revision | None:
    """The database's revision when the code serves it, at or ahead of its latest.

    Ahead is a revision of the form `NNNN_<slug>` numbered above the code's latest, as
    while a deploy migrates before the new version serves (STY-091 D11, D29). Behind,
    another slug, another form, no row, several rows or no table is not served.
    """
    if revisions is None or len(revisions) != 1:
        return None
    found = Revision.parse(revisions[0])
    if found is None or (found != latest and found.number <= latest.number):
        return None
    return found


class ReadinessService:
    """Whether the API may serve, answered within about two seconds.

    Its database answers, at a revision the code serves, through a login that holds the
    application's role and nothing more.

    The check runs in a thread of its own, with its own session: a database that stops
    answering on a connection already open gives no error and no timeout from the
    driver, so the probe answers at its deadline and leaves the thread to end when the
    connection does.
    """

    def __init__(self, sessions: sessionmaker[Session], latest: Revision) -> None:
        self._sessions = sessions
        self._latest = latest

    def check(self) -> None:
        """Raises `service.not_ready` unless the API may serve."""
        outcome: Outcome = queue.SimpleQueue()
        # In the request's context, so its queries are spans of the request's trace.
        context = contextvars.copy_context()
        threading.Thread(target=context.run, args=(self._ask, outcome), daemon=True).start()
        try:
            found = outcome.get(timeout=TIMEOUT_SECONDS)
        except queue.Empty:
            found = TimeoutError()
        if isinstance(found, Exception):
            if not isinstance(found, SQLAlchemyError | TimeoutError):
                raise found
            # The line holds the exception's codes and names, and its message, which
            # names hosts and users, only where the settings allow it (`logs`).
            self._refuse(Cause.NO_CONNECTION, found)
        if not found.login_is_safe:
            self._refuse(Cause.LOGIN_UNSAFE)
        revision = served_revision(self._latest, found.revisions)
        if revision is None:
            self._refuse(Cause.REVISION_NOT_SERVED)
        if revision != self._latest:
            logger.info("readiness.ahead", extra={"revision": revision.name})

    def _refuse(self, cause: Cause, error: Exception | None = None) -> NoReturn:
        logger.warning(
            "readiness.failed",
            exc_info=error,
            extra={"code": ErrorCode.SERVICE_NOT_READY.value, "cause": cause.value},
        )
        raise ApiError(ErrorCode.SERVICE_NOT_READY) from None

    def _ask(self, outcome: Outcome) -> None:
        try:
            with self._sessions() as session:
                repository = ReadinessRepository(session)
                repository.limit_statement_time()
                safe = repository.login_is_safe(APP_ROLE, CLOUD_SQL_IAM_ROLES)
                # An unsafe login's revision is not read: it may lack the grant.
                found = Found(
                    login_is_safe=safe, revisions=repository.revisions() if safe else None
                )
        except Exception as exc:  # noqa: BLE001 - handed to the request's thread, which decides
            outcome.put(exc)
        else:
            outcome.put(found)


def get_readiness_service(request: Request, sessions: Sessions) -> ReadinessService:
    return ReadinessService(sessions, request.app.state.latest_revision)


Readiness = Annotated[ReadinessService, Depends(get_readiness_service)]
