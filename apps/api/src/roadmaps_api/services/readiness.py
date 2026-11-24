import logging
import queue
import threading
from typing import Annotated

from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.database import TIMEOUT_SECONDS, Sessions
from roadmaps_api.errors import ApiError, ErrorCode
from roadmaps_api.logs import exception_type
from roadmaps_api.repositories.readiness import ReadinessRepository

logger = logging.getLogger(__name__)

type Outcome = queue.SimpleQueue[Exception | None]


class ReadinessService:
    """Whether the database answers, within about two seconds whatever its state.

    The check runs in a thread of its own, with its own session: a database that stops
    answering on a connection already open gives no error and no timeout from the
    driver, so the probe answers at its deadline and leaves the thread to end when the
    connection does.
    """

    def __init__(self, sessions: sessionmaker[Session]) -> None:
        self._sessions = sessions

    def check(self) -> None:
        """Raises `service.not_ready` unless the database answers in time."""
        outcome: Outcome = queue.SimpleQueue()
        threading.Thread(target=self._select_one, args=(outcome,), daemon=True).start()
        try:
            error = outcome.get(timeout=TIMEOUT_SECONDS)
        except queue.Empty:
            error = TimeoutError()
        if error is None:
            return
        if not isinstance(error, SQLAlchemyError | TimeoutError):
            raise error
        # The code and the exception's type only: its message names hosts and users.
        logger.warning(
            "readiness.failed",
            extra={
                "code": ErrorCode.SERVICE_NOT_READY.value,
                "exception_type": exception_type(error),
            },
        )
        raise ApiError(ErrorCode.SERVICE_NOT_READY) from None

    def _select_one(self, outcome: Outcome) -> None:
        try:
            with self._sessions() as session:
                ReadinessRepository(session).select_one()
        except Exception as exc:  # noqa: BLE001 - handed to the request's thread, which decides
            outcome.put(exc)
        else:
            outcome.put(None)


def get_readiness_service(sessions: Sessions) -> ReadinessService:
    return ReadinessService(sessions)


Readiness = Annotated[ReadinessService, Depends(get_readiness_service)]
