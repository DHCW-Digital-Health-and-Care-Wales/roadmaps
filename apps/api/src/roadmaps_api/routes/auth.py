"""OIDC sign-in, callback, `/me`, extend, sign-out and sign-out-all routes (S1-S3, D9-D13)."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import ConfigDict, field_validator

from roadmaps_api.authz import CurrentPrincipal, Permission, PolicyAPIRoute, public, signed_in
from roadmaps_api.identity import OidcProviderId
from roadmaps_api.services.auth import (
    TRANSACTION_TTL_SECONDS,
    AuthSvc,
    validate_return_path,
)
from roadmaps_api.services.me import IdentityProvider, MeSvc
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


class MeIdentityResponse(ApiResponseModel):
    id: UUID
    provider: IdentityProvider
    email: str
    last_sign_in_at: datetime | None
    linked_at: datetime


class MeRoleResponse(ApiResponseModel):
    id: UUID
    name: str
    system_key: str | None


class MeMembershipResponse(ApiResponseModel):
    tenant_id: UUID
    tenant_slug: str
    name_en: str
    name_cy: str | None
    role: MeRoleResponse
    permissions: list[Permission]


class MeSessionResponse(ApiResponseModel):
    idle_expires_at: datetime
    absolute_expires_at: datetime
    signed_in_at: datetime
    provider: IdentityProvider


class MeResponse(ApiResponseModel):
    person_id: UUID
    display_name: str
    identities: list[MeIdentityResponse]
    memberships: list[MeMembershipResponse]
    session: MeSessionResponse


class ExtendSessionResponse(ApiResponseModel):
    idle_expires_at: datetime
    absolute_expires_at: datetime


class SignOutResponse(ApiResponseModel):
    status: Literal["ok"] = "ok"


class CallbackQuery(ApiRequestModel):
    """OIDC callback query parameters; extra provider parameters (e.g. `hd`, `authuser`) ignored."""

    model_config = ConfigDict(extra="ignore")

    code: str | None = None
    state: str | None = None
    error: str | None = None


def _write_host_cookie(
    response: Response,
    *,
    name: str,
    value: str,
    samesite: Literal["lax", "strict"],
    max_age: int | None = None,
) -> None:
    response.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        path="/",
        secure=True,
        httponly=True,
        samesite=samesite,
    )


def _clear_session_cookie(request: Request, response: Response) -> None:
    _write_host_cookie(
        response,
        name=request.app.state.session_cookie_name,
        value="",
        samesite="strict",
        max_age=0,
    )


@router.post("/auth/sign-in", dependencies=[public()])
def sign_in_start(
    body: SignInStartRequest,
    request: Request,
    response: Response,
    auth: AuthSvc,
) -> SignInStartResponse:
    """Starts an OIDC sign-in transaction, sets its cookie and returns the provider URL."""
    started = auth.start_sign_in(provider=body.provider, return_path=body.return_path)
    _write_host_cookie(
        response,
        name=request.app.state.format_transaction_cookie_name(started.transaction_id),
        value=started.cookie_token,
        samesite="lax",
        max_age=TRANSACTION_TTL_SECONDS,
    )
    return SignInStartResponse(authorization_url=started.authorization_url)


@router.get(
    "/auth/callback/{provider}",
    dependencies=[public()],
    status_code=302,
    response_class=RedirectResponse,
)
def sign_in_callback(
    provider: str,
    request: Request,
    auth: AuthSvc,
    query: Annotated[CallbackQuery, Query()],
) -> RedirectResponse:
    """Completes an OIDC sign-in callback, establishes the session cookie and redirects."""
    tx_prefix: str = request.app.state.transaction_cookie_prefix
    # Sort by UUIDv7-bearing cookie name so newest cookies stay at the tail regardless of order.
    tx_cookie_values = [
        value
        for _name, value in sorted(
            (name, value)
            for name, value in request.cookies.items()
            if name.startswith(tx_prefix) and value
        )
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
        _write_host_cookie(
            redirect,
            name=request.app.state.format_transaction_cookie_name(outcome.consumed_transaction_id),
            value="",
            samesite="lax",
            max_age=0,
        )
    if outcome.session_token is not None:
        # No Expires / Max-Age attribute (ADR-018 _Sessions_).
        _write_host_cookie(
            redirect,
            name=request.app.state.session_cookie_name,
            value=outcome.session_token,
            samesite="strict",
        )
    return redirect


@router.get("/me", dependencies=[signed_in()])
def get_me(principal: CurrentPrincipal, me_service: MeSvc) -> MeResponse:
    """Returns the signed-in person, identities, active memberships and session limits (D13)."""
    profile = me_service.get_me(principal)
    return MeResponse(
        person_id=profile.person_id,
        display_name=profile.display_name,
        identities=[
            MeIdentityResponse(
                id=ident.id,
                provider=ident.provider,
                email=ident.email,
                last_sign_in_at=ident.last_sign_in_at,
                linked_at=ident.linked_at,
            )
            for ident in profile.identities
        ],
        memberships=[
            MeMembershipResponse(
                tenant_id=m.tenant_id,
                tenant_slug=m.tenant_slug,
                name_en=m.name_en,
                name_cy=m.name_cy,
                role=MeRoleResponse(
                    id=m.role.id,
                    name=m.role.name,
                    system_key=m.role.system_key,
                ),
                permissions=list(m.permissions),
            )
            for m in profile.memberships
        ],
        session=MeSessionResponse(
            idle_expires_at=profile.session.idle_expires_at,
            absolute_expires_at=profile.session.absolute_expires_at,
            signed_in_at=profile.session.signed_in_at,
            provider=profile.session.provider,
        ),
    )


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
    _clear_session_cookie(request, response)
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
    _clear_session_cookie(request, response)
    return SignOutResponse()
