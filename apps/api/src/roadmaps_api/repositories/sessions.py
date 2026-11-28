"""Repository for server-side session definer routines (ADR-018, STY-106 D4).

Confined exclusively to `roadmaps_api.services.sessions` by `import-linter`, so only the
session service can read or write sessions. Never ends a SQL transaction.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Final
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

CREATE_SESSION: Final = text(
    "SELECT session_id, signed_in_at, idle_expires_at, absolute_expires_at"
    " FROM public.create_session("
    " :token_hash, :person_id, :identity_id, :provider, :email, :display_name)"
)
LOOKUP_SESSION: Final = text(
    "SELECT session_id, person_id, provider, signed_in_at, last_activity_at,"
    " idle_expires_at, absolute_expires_at, needs_activity_touch"
    " FROM public.lookup_session(:token_hash)"
)
TOUCH_SESSION_ACTIVITY: Final = text(
    "SELECT last_activity_at, idle_expires_at FROM public.touch_session_activity(:token_hash)"
)
EXTEND_SESSION: Final = text(
    "SELECT idle_expires_at, absolute_expires_at FROM public.extend_session(:session_id)"
)
REVOKE_SESSION: Final = text("SELECT public.revoke_session(:session_id)")
REVOKE_ALL_PERSON_SESSIONS: Final = text("SELECT public.revoke_all_person_sessions()")


@dataclass(frozen=True, kw_only=True)
class NewSession:
    token_hash: bytes
    person_id: UUID
    identity_id: UUID
    provider: str
    email: str
    display_name: str | None


@dataclass(frozen=True)
class CreatedSession:
    session_id: UUID
    signed_in_at: datetime
    idle_expires_at: datetime
    absolute_expires_at: datetime


@dataclass(frozen=True)
class SessionLookup:
    session_id: UUID
    person_id: UUID
    provider: str
    signed_in_at: datetime
    last_activity_at: datetime
    idle_expires_at: datetime
    absolute_expires_at: datetime
    needs_activity_touch: bool


@dataclass(frozen=True)
class TouchedSession:
    last_activity_at: datetime
    idle_expires_at: datetime


@dataclass(frozen=True)
class ExtendedSession:
    idle_expires_at: datetime
    absolute_expires_at: datetime


class SessionRepository:
    """Thin wrapper over `roadmaps_auth_definer` session routines."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, new_session: NewSession) -> CreatedSession:
        row = self._session.execute(
            CREATE_SESSION,
            {
                "token_hash": new_session.token_hash,
                "person_id": new_session.person_id,
                "identity_id": new_session.identity_id,
                "provider": new_session.provider,
                "email": new_session.email,
                "display_name": new_session.display_name,
            },
        ).one()
        return CreatedSession(
            session_id=row.session_id,
            signed_in_at=row.signed_in_at,
            idle_expires_at=row.idle_expires_at,
            absolute_expires_at=row.absolute_expires_at,
        )

    def lookup(self, *, token_hash: bytes) -> SessionLookup | None:
        row = self._session.execute(LOOKUP_SESSION, {"token_hash": token_hash}).one_or_none()
        if row is None:
            return None
        return SessionLookup(
            session_id=row.session_id,
            person_id=row.person_id,
            provider=row.provider,
            signed_in_at=row.signed_in_at,
            last_activity_at=row.last_activity_at,
            idle_expires_at=row.idle_expires_at,
            absolute_expires_at=row.absolute_expires_at,
            needs_activity_touch=bool(row.needs_activity_touch),
        )

    def touch_activity(self, *, token_hash: bytes) -> TouchedSession | None:
        row = self._session.execute(
            TOUCH_SESSION_ACTIVITY, {"token_hash": token_hash}
        ).one_or_none()
        if row is None:
            return None
        return TouchedSession(
            last_activity_at=row.last_activity_at,
            idle_expires_at=row.idle_expires_at,
        )

    def extend(self, *, session_id: UUID) -> ExtendedSession | None:
        row = self._session.execute(EXTEND_SESSION, {"session_id": session_id}).one_or_none()
        if row is None:
            return None
        return ExtendedSession(
            idle_expires_at=row.idle_expires_at,
            absolute_expires_at=row.absolute_expires_at,
        )

    def revoke(self, *, session_id: UUID) -> bool:
        return bool(self._session.execute(REVOKE_SESSION, {"session_id": session_id}).scalar_one())

    def revoke_all_for_current_person(self) -> int:
        return int(self._session.execute(REVOKE_ALL_PERSON_SESSIONS).scalar_one())
