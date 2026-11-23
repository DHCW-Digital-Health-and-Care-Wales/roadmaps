from sqlalchemy import text
from sqlalchemy.orm import Session

from roadmaps_api.database import TIMEOUT_SECONDS


class ReadinessRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def select_one(self) -> None:
        """Runs `SELECT 1`, cancelled by the database after about two seconds."""
        self._session.execute(
            text("SELECT set_config('statement_timeout', :timeout, true)"),
            {"timeout": f"{TIMEOUT_SECONDS}s"},
        )
        self._session.execute(text("SELECT 1"))
