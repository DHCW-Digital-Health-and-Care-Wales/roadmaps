import logging

from sqlalchemy.exc import SQLAlchemyError

from roadmaps_api.errors import ApiError, ErrorCode
from roadmaps_api.logs import exception_type
from roadmaps_api.repositories.readiness import ReadinessRepository

logger = logging.getLogger(__name__)


class ReadinessService:
    def __init__(self, repository: ReadinessRepository) -> None:
        self._repository = repository

    def check(self) -> None:
        """Raises `service.not_ready` unless the database answers."""
        try:
            self._repository.select_one()
        except SQLAlchemyError as exc:
            # The code and the exception's type only: its message names hosts and users.
            logger.warning(
                "readiness.failed",
                extra={
                    "code": ErrorCode.SERVICE_NOT_READY.value,
                    "exception_type": exception_type(exc),
                },
            )
            raise ApiError(ErrorCode.SERVICE_NOT_READY) from None
