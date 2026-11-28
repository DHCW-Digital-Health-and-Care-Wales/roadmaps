"""OIDC sign-in start, callback orchestration and strict returnPath/redirect rules (S1, S2, D9)."""

import logging
import secrets
from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum
from typing import Annotated, Final
from urllib.parse import quote
from uuid import UUID

import psycopg
from fastapi import Depends, Request
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.database import Sessions
from roadmaps_api.errors import ApiError, ErrorCode
from roadmaps_api.identity import (
    OidcClient,
    OidcError,
    OidcProviderId,
    TokenExchangeRequest,
    VerifiedIdentity,
)
from roadmaps_api.repositories.auth import AuthRepository, NewSignInTransaction
from roadmaps_api.services.sessions import SessionService, SessionSvc, hash_token

logger = logging.getLogger(__name__)

MAX_RETURN_PATH_LENGTH: Final = 512
MAX_TRANSACTION_COOKIES_CHECKED: Final = 20
TRANSACTION_TTL_SECONDS: Final = 600
_ASCII_SPACE: Final = 0x20
_ASCII_DEL: Final = 0x7F


class SignInErrorCode(StrEnum):
    """Closed five-code refusal grammar redirected to `/#/sign-in?error=<code>` (D9)."""

    NOT_INVITED = "not_invited"
    PERSON_DISABLED = "person_disabled"
    ENTRA_REQUIRED = "entra_required"
    SIGN_IN_CANCELLED = "sign_in_cancelled"
    SIGN_IN_FAILED = "sign_in_failed"


@dataclass(frozen=True)
class StartedSignIn:
    transaction_id: UUID
    cookie_token: str
    authorization_url: str


@dataclass(frozen=True)
class CallbackOutcome:
    redirect_url: str
    session_token: str | None = None
    consumed_transaction_id: UUID | None = None


def validate_return_path(raw: str) -> str:
    """Validates `returnPath` as a strict internal relative SPA path (D9, TM-02)."""
    if (
        not raw
        or len(raw) > MAX_RETURN_PATH_LENGTH
        or not raw.startswith("/")
        or raw.startswith("//")
        or "\\" in raw
        or "#" in raw
        or any(ch.isspace() or ord(ch) < _ASCII_SPACE or ord(ch) == _ASCII_DEL for ch in raw)
    ):
        msg = "returnPath must be a relative path starting with '/'"
        raise ValueError(msg)
    return raw


def build_success_redirect(editor_origin: str, return_path: str) -> str:
    """Builds the static editor callback redirect URL (`/#/auth/callback`, D6, D9)."""
    if return_path == "/":
        return f"{editor_origin}/#/auth/callback"
    return f"{editor_origin}/#/auth/callback?returnTo={quote(return_path, safe='')}"


def build_error_redirect(editor_origin: str, code: SignInErrorCode) -> str:
    """Builds the editor sign-in error redirect URL (`/#/sign-in?error=<code>`, D6, D9)."""
    return f"{editor_origin}/#/sign-in?error={code.value}"


def _log_refusal(
    *,
    reason: str,
    code: SignInErrorCode,
    provider: OidcProviderId | None = None,
    person_id: UUID | None = None,
) -> None:
    extra: dict[str, str] = {"reason": reason, "code": code.value}
    if provider is not None:
        extra["provider"] = provider.value
    if person_id is not None:
        extra["person_id"] = str(person_id)
    logger.warning("auth.sign_in_refused", extra=extra)


class AuthService:
    """Orchestrates OIDC sign-in start and callback completion."""

    def __init__(
        self,
        sessions: sessionmaker[Session],
        oidc_client: OidcClient,
        session_service: SessionService,
        *,
        editor_origin: str,
    ) -> None:
        self._sessions = sessions
        self._oidc = oidc_client
        self._session_service = session_service
        self._editor_origin = editor_origin

    def _redirect_uri(self, provider: OidcProviderId) -> str:
        # Built strictly from ROADMAPS_EDITOR_ORIGIN, never Host / X-Forwarded-Host (D6).
        return f"{self._editor_origin}/api/v1/auth/callback/{provider.value}"

    def start_sign_in(self, *, provider: OidcProviderId, return_path: str) -> StartedSignIn:
        """Creates a single-use transaction and returns the provider authorisation URL (S1)."""
        config = self._oidc.get_provider(provider)
        if config is None:
            raise ApiError(ErrorCode.PROVIDER_NOT_ENABLED)

        state = secrets.token_urlsafe(32)
        cookie_token = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(32)
        code_verifier = secrets.token_urlsafe(32)

        try:
            authorization_url = self._oidc.create_authorization_url(
                provider,
                redirect_uri=self._redirect_uri(provider),
                state=state,
                nonce=nonce,
                code_verifier=code_verifier,
            )
        except OidcError:
            logger.warning(
                "auth.sign_in_refused",
                extra={
                    "provider": provider.value,
                    "reason": "provider_discovery_failed",
                    "code": ErrorCode.PROVIDER_UNAVAILABLE.value,
                },
            )
            raise ApiError(ErrorCode.PROVIDER_UNAVAILABLE) from None

        with self._sessions() as session:
            created = AuthRepository(session).create_transaction(
                NewSignInTransaction(
                    state_hash=hash_token(state),
                    cookie_token_hash=hash_token(cookie_token),
                    nonce=nonce,
                    code_verifier=code_verifier,
                    provider=provider.value,
                    issuer=config.canonical_issuer,
                    purpose="sign-in",
                    return_path=return_path,
                    ttl_seconds=TRANSACTION_TTL_SECONDS,
                )
            )
            session.commit()

        return StartedSignIn(
            transaction_id=created.transaction_id,
            cookie_token=cookie_token,
            authorization_url=authorization_url,
        )

    def _consume_matching_transaction(
        self,
        *,
        state: str | None,
        tx_cookie_values: Sequence[str],
        provider: OidcProviderId,
        issuer: str,
    ) -> tuple[UUID | None, str | None, str | None, str | None]:
        if not state or not tx_cookie_values:
            return None, None, None, None
        cookie_hashes = [hash_token(v) for v in tx_cookie_values[:MAX_TRANSACTION_COOKIES_CHECKED]]
        with self._sessions() as session:
            consumed = AuthRepository(session).consume_transaction(
                state_hash=hash_token(state),
                cookie_token_hashes=cookie_hashes,
                provider=provider.value,
                issuer=issuer,
            )
            session.commit()
        if consumed is None or consumed.purpose != "sign-in":
            return None, None, None, None
        return (
            consumed.transaction_id,
            consumed.nonce,
            consumed.code_verifier,
            consumed.return_path,
        )

    def _refuse(
        self,
        *,
        reason: str,
        code: SignInErrorCode,
        provider: OidcProviderId | None = None,
        person_id: UUID | None = None,
        consumed_transaction_id: UUID | None = None,
    ) -> CallbackOutcome:
        _log_refusal(reason=reason, code=code, provider=provider, person_id=person_id)
        return CallbackOutcome(
            redirect_url=build_error_redirect(self._editor_origin, code),
            consumed_transaction_id=consumed_transaction_id,
        )

    def _resolve_and_create_session(
        self,
        *,
        provider: OidcProviderId,
        verified: VerifiedIdentity,
        return_path: str,
        tx_id: UUID,
    ) -> CallbackOutcome:
        with self._sessions() as session:
            identity = AuthRepository(session).lookup_identity(
                issuer=verified.canonical_issuer,
                subject=verified.subject,
            )

        if identity is None:
            return self._refuse(
                reason="not_invited",
                code=SignInErrorCode.NOT_INVITED,
                provider=provider,
                consumed_transaction_id=tx_id,
            )
        if identity.person_disabled:
            return self._refuse(
                reason="person_disabled",
                code=SignInErrorCode.PERSON_DISABLED,
                provider=provider,
                person_id=identity.person_id,
                consumed_transaction_id=tx_id,
            )
        if provider is OidcProviderId.GOOGLE and identity.has_entra_identity:
            return self._refuse(
                reason="entra_required",
                code=SignInErrorCode.ENTRA_REQUIRED,
                provider=provider,
                person_id=identity.person_id,
                consumed_transaction_id=tx_id,
            )

        try:
            raw_session_token, _created = self._session_service.create_session(
                person_id=identity.person_id,
                identity_id=identity.identity_id,
                provider=provider.value,
                email=verified.email,
                display_name=verified.display_name,
            )
        except DBAPIError as exc:
            if isinstance(exc.orig, psycopg.errors.RaiseException):
                return self._refuse(
                    reason="session_create_refused",
                    code=SignInErrorCode.SIGN_IN_FAILED,
                    provider=provider,
                    person_id=identity.person_id,
                    consumed_transaction_id=tx_id,
                )
            raise

        return CallbackOutcome(
            redirect_url=build_success_redirect(self._editor_origin, return_path),
            session_token=raw_session_token,
            consumed_transaction_id=tx_id,
        )

    def complete_callback(
        self,
        *,
        raw_provider: str,
        code: str | None,
        state: str | None,
        error: str | None,
        tx_cookie_values: Sequence[str],
    ) -> CallbackOutcome:
        """Validates callback, exchanges code, verifies ID token and creates a fresh session."""
        try:
            provider = OidcProviderId(raw_provider)
        except ValueError:
            return self._refuse(reason="invalid_provider", code=SignInErrorCode.SIGN_IN_FAILED)

        config = self._oidc.get_provider(provider)
        if config is None:
            return self._refuse(
                reason="provider_not_enabled",
                code=SignInErrorCode.SIGN_IN_FAILED,
                provider=provider,
            )

        if error is not None:
            tx_id, _, _, _ = self._consume_matching_transaction(
                state=state,
                tx_cookie_values=tx_cookie_values,
                provider=provider,
                issuer=config.canonical_issuer,
            )
            is_cancel = error == "access_denied"
            return self._refuse(
                reason="sign_in_cancelled" if is_cancel else "provider_error",
                code=(
                    SignInErrorCode.SIGN_IN_CANCELLED
                    if is_cancel
                    else SignInErrorCode.SIGN_IN_FAILED
                ),
                provider=provider,
                consumed_transaction_id=tx_id,
            )

        tx_id, nonce, code_verifier, return_path = (
            self._consume_matching_transaction(
                state=state,
                tx_cookie_values=tx_cookie_values,
                provider=provider,
                issuer=config.canonical_issuer,
            )
            if code
            else (None, None, None, None)
        )
        if (
            not code
            or tx_id is None
            or nonce is None
            or code_verifier is None
            or return_path is None
        ):
            return self._refuse(
                reason="missing_code" if not code else "invalid_transaction",
                code=SignInErrorCode.SIGN_IN_FAILED,
                provider=provider,
            )

        try:
            verified = self._oidc.exchange_code_and_verify(
                provider,
                TokenExchangeRequest(
                    code=code,
                    redirect_uri=self._redirect_uri(provider),
                    code_verifier=code_verifier,
                    expected_nonce=nonce,
                ),
            )
        except OidcError as exc:
            return self._refuse(
                reason=exc.reason,
                code=SignInErrorCode.SIGN_IN_FAILED,
                provider=provider,
                consumed_transaction_id=tx_id,
            )

        return self._resolve_and_create_session(
            provider=provider,
            verified=verified,
            return_path=return_path,
            tx_id=tx_id,
        )


def get_auth_service(
    request: Request, sessions: Sessions, session_service: SessionSvc
) -> AuthService:
    return AuthService(
        sessions,
        request.app.state.oidc_client,
        session_service,
        editor_origin=request.app.state.editor_origin,
    )


AuthSvc = Annotated[AuthService, Depends(get_auth_service)]
