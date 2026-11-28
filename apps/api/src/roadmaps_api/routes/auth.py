"""OIDC sign-in, callback, `/me`, extend, sign-out and sign-out-all routes (S1-S3, D9-D13)."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, field_validator

from roadmaps_api.authz import CurrentPrincipal, PolicyAPIRoute, public, signed_in
from roadmaps_api.identity import OidcProviderId
from roadmaps_api.services.auth import (
    TRANSACTION_TTL_SECONDS,
    AuthSvc,
    validate_return_path,
)
from roadmaps_api.services.me import MeResponse, MeSvc
from roadmaps_api.services.sessions import SessionSvc
from roadmaps_api.wire import ApiRequestModel, ApiResponseModel

router = APIRouter(route_class=PolicyAPIRoute)


class SignInStartRequest(ApiRequestModel):
    provider: OidcProviderId
    purpose: Literal["sign-in"] = "sign-in"
    return_path: str = "/"

    @field_validator("return_path")
    @classmethod
    def _validate_return_path(cls, value: str) -> str:
        return validate_return_path(value)


class SignInStartResponse(ApiResponseModel):
    authorization_url: str


class ExtendSessionResponse(ApiResponseModel):
    idle_expires_at: datetime
    absolute_expires_at: datetime


class SignOutResponse(ApiResponseModel):
    status: Literal["ok"] = "ok"


class CallbackQuery(BaseModel):
    """OIDC callback query parameters; extra provider parameters (e.g. `hd`, `authuser`) ignored."""

    model_config = ConfigDict(extra="ignore")

    code: str | None = None
    state: str | None = None
    error: str | None = None


def _set_transaction_cookie(response: Response, *, cookie_name: str, cookie_token: str) -> None:
    response.set_cookie(
        key=cookie_name,
        value=cookie_token,
        max_age=TRANSACTION_TTL_SECONDS,
        path="/",
        secure=True,
        httponly=True,
        samesite="lax",
    )


def _clear_transaction_cookie(response: Response, *, cookie_name: str) -> None:
    response.set_cookie(
        key=cookie_name,
        value="",
        max_age=0,
        path="/",
        secure=True,
        httponly=True,
        samesite="lax",
    )


def _set_session_cookie(response: Response, *, cookie_name: str, raw_token: str) -> None:
    # No Expires / Max-Age attribute (ADR-018 _Sessions_).
    response.set_cookie(
        key=cookie_name,
        value=raw_token,
        path="/",
        secure=True,
        httponly=True,
        samesite="strict",
    )


def _clear_session_cookie(response: Response, *, cookie_name: str) -> None:
    response.set_cookie(
        key=cookie_name,
        value="",
        max_age=0,
        path="/",
        secure=True,
        httponly=True,
        samesite="strict",
    )


def _transaction_cookie_name(request: Request, transaction_id: UUID) -> str:
    prefix: str = request.app.state.transaction_cookie_prefix
    return f"{prefix}{transaction_id.hex}"


@router.post("/auth/sign-in", dependencies=[public()])
def sign_in_start(
    body: SignInStartRequest,
    request: Request,
    response: Response,
    auth: AuthSvc,
) -> SignInStartResponse:
    """Starts an OIDC sign-in transaction, sets its cookie and returns the provider URL."""
    started = auth.start_sign_in(provider=body.provider, return_path=body.return_path)
    _set_transaction_cookie(
        response,
        cookie_name=_transaction_cookie_name(request, started.transaction_id),
        cookie_token=started.cookie_token,
    )
    return SignInStartResponse(authorization_url=started.authorization_url)


@router.get("/auth/callback/{provider}", dependencies=[public()])
def sign_in_callback(
    provider: str,
    request: Request,
    auth: AuthSvc,
    query: Annotated[CallbackQuery, Query()],
) -> RedirectResponse:
    """Completes an OIDC sign-in callback, establishes the session cookie and redirects."""
    tx_prefix: str = request.app.state.transaction_cookie_prefix
    tx_cookie_values = [
        value for name, value in request.cookies.items() if name.startswith(tx_prefix) and value
    ]
    outcome = auth.complete_callback(
        raw_provider=provider,
        code=query.code,
        state=query.state,
        error=query.error,
        tx_cookie_values=tx_cookie_values,
    )
    redirect = RedirectResponse(url=outcome.redirect_url, status_code=302)
    if outcome.consumed_transaction_id is not None:
        _clear_transaction_cookie(
            redirect,
            cookie_name=_transaction_cookie_name(request, outcome.consumed_transaction_id),
        )
    if outcome.session_token is not None:
        _set_session_cookie(
            redirect,
            cookie_name=request.app.state.session_cookie_name,
            raw_token=outcome.session_token,
        )
    return redirect


@router.get("/me", dependencies=[signed_in()])
def get_me(principal: CurrentPrincipal, me_service: MeSvc) -> MeResponse:
    """Returns the signed-in person, identities, active memberships and session limits (D13)."""
    return me_service.get_me(principal)


@router.post("/auth/extend", dependencies=[signed_in()])
def extend_session(
    principal: CurrentPrincipal, session_service: SessionSvc
) -> ExtendSessionResponse:
    """Extends the current session's idle expiry immediately, capped at absolute expiry (D12)."""
    extended = session_service.extend_session(principal)
    return ExtendSessionResponse(
        idle_expires_at=extended.idle_expires_at,
        absolute_expires_at=extended.absolute_expires_at,
    )


@router.post("/auth/sign-out", dependencies=[signed_in()])
def sign_out(
    request: Request,
    response: Response,
    principal: CurrentPrincipal,
    session_service: SessionSvc,
) -> SignOutResponse:
    """Revokes the current session and expires the session cookie (S3)."""
    session_service.sign_out(principal)
    _clear_session_cookie(response, cookie_name=request.app.state.session_cookie_name)
    return SignOutResponse()


@router.post("/auth/sign-out-all", dependencies=[signed_in()])
def sign_out_all(
    request: Request,
    response: Response,
    principal: CurrentPrincipal,
    session_service: SessionSvc,
) -> SignOutResponse:
    """Revokes every active session for the current person and expires the session cookie (S3)."""
    session_service.sign_out_all(principal)
    _clear_session_cookie(response, cookie_name=request.app.state.session_cookie_name)
    return SignOutResponse()
