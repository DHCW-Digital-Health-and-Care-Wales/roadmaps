"""Server-side session lifecycle service — sole writer of `sessions` (ADR-018, STY-106 D4, D12)."""

import hashlib
import logging
import secrets
from enum import StrEnum
from typing import Annotated, Final
from uuid import UUID

from fastapi import Depends
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.authz import AuthenticatedPrincipal
from roadmaps_api.database import Sessions, session_info
from roadmaps_api.errors import ApiError, ErrorCode
from roadmaps_api.repositories.sessions import (
    CreatedSession,
    ExtendedSession,
    NewSession,
    SessionRepository,
)

logger = logging.getLogger(__name__)


class SessionRefusal(StrEnum):
    """Closed set of domain refusals translated from `public.create_session`."""

    PERSON_DISABLED = "person_disabled"
    ENTRA_REQUIRED = "entra_required"
    SESSION_CREATE_REFUSED = "session_create_refused"


# SQLSTATEs raised by `public.create_session` for expected domain refusals (P0001 raise_exception,
# P0002 no_data_found, 22023 invalid_parameter_value); transient/infrastructure errors propagate.
_SESSION_REFUSAL_SQLSTATES: Final = frozenset({"P0001", "P0002", "22023"})
_SESSION_REFUSAL_REASONS: Final[dict[str, SessionRefusal]] = {
    "person is disabled": SessionRefusal.PERSON_DISABLED,
    "entra sign-in required": SessionRefusal.ENTRA_REQUIRED,
}


class SessionRefusedError(Exception):
    """Raised when `public.create_session` refuses to establish a session for a domain reason."""

    def __init__(self, reason: SessionRefusal) -> None:
        self.reason = reason
        super().__init__(reason.value)


def hash_token(raw_token: str) -> bytes:
    """Returns the 32-byte SHA-256 digest stored in PostgreSQL instead of raw secrets."""
    return hashlib.sha256(raw_token.encode("utf-8")).digest()


class SessionService:
    """Manages opaque 256-bit sessions: create, authenticate/slide, extend, sign-out."""

    def __init__(self, sessions: sessionmaker[Session]) -> None:
        self._sessions = sessions

    def create_session(
        self,
        *,
        person_id: UUID,
        identity_id: UUID,
        provider: str,
        email: str,
        display_name: str | None,
    ) -> tuple[str, CreatedSession]:
        """Generates a fresh 256-bit session token, stores only its SHA-256 hash, and logs."""
        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_token(raw_token)
        with self._sessions() as session:
            try:
                created = SessionRepository(session).create(
                    NewSession(
                        token_hash=token_hash,
                        person_id=person_id,
                        identity_id=identity_id,
                        provider=provider,
                        email=email,
                        display_name=display_name,
                    )
                )
            except DBAPIError as exc:
                sqlstate = getattr(exc.orig, "sqlstate", None)
                if sqlstate in _SESSION_REFUSAL_SQLSTATES:
                    primary = getattr(getattr(exc.orig, "diag", None), "message_primary", None)
                    reason = _SESSION_REFUSAL_REASONS.get(
                        primary or "", SessionRefusal.SESSION_CREATE_REFUSED
                    )
                    raise SessionRefusedError(reason) from None
                raise
            session.commit()
        logger.info(
            "auth.signed_in",
            extra={
                "person_id": str(person_id),
                "session_id": str(created.session_id),
                "provider": provider,
            },
        )
        return raw_token, created

    def authenticate(
        self, *, raw_token: str, allow_activity_update: bool
    ) -> AuthenticatedPrincipal | None:
        """Re-reads the session and person, updating activity at most once per minute (D12)."""
        token_hash = hash_token(raw_token)
        with self._sessions() as session:
            repo = SessionRepository(session)
            record = repo.lookup(token_hash=token_hash)
            if record is None:
                return None
            idle_expires_at = record.idle_expires_at
            if record.needs_activity_touch and allow_activity_update:
                touched = repo.touch_activity(token_hash=token_hash)
                session.commit()
                if touched is not None:
                    idle_expires_at = touched.idle_expires_at
                else:
                    # Re-read if another concurrent request touched it or the session ended.
                    reread = repo.lookup(token_hash=token_hash)
                    if reread is None:
                        return None
                    idle_expires_at = reread.idle_expires_at
        return AuthenticatedPrincipal(
            person_id=record.person_id,
            session_id=record.session_id,
            provider=record.provider,
            signed_in_at=record.signed_in_at,
            idle_expires_at=idle_expires_at,
            absolute_expires_at=record.absolute_expires_at,
        )

    def extend_session(self, principal: AuthenticatedPrincipal) -> ExtendedSession:
        """Slides `idle_expires_at` immediately, capped at `absolute_expires_at` (D12)."""
        with self._sessions(info=session_info(person_id=principal.person_id)) as session:
            extended = SessionRepository(session).extend(session_id=principal.session_id)
            session.commit()
        if extended is None:
            raise ApiError(ErrorCode.UNAUTHENTICATED)
        logger.info(
            "auth.session_extended",
            extra={
                "person_id": str(principal.person_id),
                "session_id": str(principal.session_id),
            },
        )
        return extended

    def sign_out(self, principal: AuthenticatedPrincipal) -> None:
        """Revokes the current session (S3)."""
        with self._sessions(info=session_info(person_id=principal.person_id)) as session:
            SessionRepository(session).revoke(session_id=principal.session_id)
            session.commit()
        logger.info(
            "auth.signed_out",
            extra={
                "person_id": str(principal.person_id),
                "session_id": str(principal.session_id),
            },
        )

    def sign_out_all(self, principal: AuthenticatedPrincipal) -> int:
        """Revokes every active session belonging to `principal.person_id` (S3)."""
        with self._sessions(info=session_info(person_id=principal.person_id)) as session:
            revoked_count = SessionRepository(session).revoke_all_for_current_person()
            session.commit()
        logger.info(
            "auth.signed_out_all",
            extra={
                "person_id": str(principal.person_id),
                "session_id": str(principal.session_id),
                "revoked_count": revoked_count,
            },
        )
        return revoked_count


def get_session_service(sessions: Sessions) -> SessionService:
    return SessionService(sessions)


SessionSvc = Annotated[SessionService, Depends(get_session_service)]
