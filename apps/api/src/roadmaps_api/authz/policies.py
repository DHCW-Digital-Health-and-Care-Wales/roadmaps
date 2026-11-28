"""Route authorisation policies, principal seam, person-assertion and tenant context.

Every API route declares exactly one policy (`public()`, `signed_in()`, `tenant_member()`,
or `tenant_permission(Permission.…)`). Auth, person-assertion and tenant dependencies read
headers and path parameters from `Request` directly (never validated `Header()`/`Path()`
parameters) so missing or malformed values answer `401`/`409`/`404` ahead of Pydantic
body validation (STY-105 D5, D9, D11, D12, D14).
"""

import logging
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Final, Protocol, TypeGuard
from uuid import UUID

from fastapi import Depends, Request
from fastapi.params import Depends as DependsParam
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.authz.guards import SAFE_METHODS
from roadmaps_api.authz.permissions import Permission
from roadmaps_api.database import Sessions, session_info
from roadmaps_api.errors import ApiError, ErrorCode
from roadmaps_api.models import (
    TENANT_SLUG_MAX_LENGTH,
    TENANT_SLUG_MIN_LENGTH,
    TENANT_SLUG_PATTERN,
)
from roadmaps_api.repositories.authorisation import (
    AuthorisationRepository,
    TenantAuthorisationRepository,
)

logger = logging.getLogger(__name__)

PERSON_ASSERTION_HEADER: Final = "X-Roadmaps-Person-Id"
POLICY_ATTR: Final = "_roadmaps_route_policy"

# Shared with `Tenant`'s `ck_tenants_slug_format` constraint: refusing malformed slugs
# (including NUL bytes) upfront keeps non-existent lookups a uniform 404 before PostgreSQL.
_TENANT_SLUG_FORM: Final = re.compile(TENANT_SLUG_PATTERN)


class RoutePolicyError(RuntimeError):
    """Raised at route registration or app assembly when a route violates policy rules."""


class PolicyKind(StrEnum):
    PUBLIC = "public"
    SIGNED_IN = "signed_in"
    TENANT_MEMBER = "tenant_member"
    TENANT_PERMISSION = "tenant_permission"


@dataclass(frozen=True)
class RoutePolicy:
    """The declared authorisation policy of one API route."""

    kind: PolicyKind
    permission: Permission | None = None

    def __post_init__(self) -> None:
        if self.kind is PolicyKind.TENANT_PERMISSION:
            if not isinstance(self.permission, Permission):
                msg = "tenant_permission policy requires a Permission enum member"
                raise RoutePolicyError(msg)
        elif self.permission is not None:
            msg = f"{self.kind.value} policy must not specify a permission"
            raise RoutePolicyError(msg)


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    """The authenticated person and session returned by `get_current_principal` (D14, D13)."""

    person_id: UUID
    session_id: UUID
    provider: str = "local_mock"
    signed_in_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    idle_expires_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    absolute_expires_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class SessionAuthenticator(Protocol):
    """Protocol implemented by `SessionService` and wired at the composition root (`app.py`)."""

    def authenticate(
        self, *, raw_token: str, allow_activity_update: bool
    ) -> AuthenticatedPrincipal | None: ...


@dataclass(frozen=True, kw_only=True)
class TenantContext:
    """Frozen tenant-scoped authorisation context with a pre-bound session factory (D12)."""

    tenant_id: UUID
    tenant_slug: str
    person_id: UUID
    role_id: UUID
    permissions: frozenset[Permission]
    _sessions: sessionmaker[Session] = field(repr=False, compare=False)

    def open_session(self) -> Session:
        """Opens a SQLAlchemy `Session` scoped to `(tenant_id, person_id)` for every tx."""
        return self._sessions(info=session_info(tenant_id=self.tenant_id, person_id=self.person_id))


def _allows_activity_update(request: Request) -> bool:
    """On GET, permits throttled activity updates only for same-origin or absent Sec-Fetch-Site."""
    if request.method not in SAFE_METHODS:
        return True
    sec_fetch_sites = request.headers.getlist("sec-fetch-site")
    if not sec_fetch_sites:
        return True
    return len(sec_fetch_sites) == 1 and sec_fetch_sites[0] == "same-origin"


def get_current_principal(request: Request) -> AuthenticatedPrincipal:
    """Authenticates the caller's `__Host-` session cookie via `SessionService` (D11-D12)."""
    cookie_name: str = request.app.state.session_cookie_name
    raw_token = request.cookies.get(cookie_name)
    if not raw_token:
        raise ApiError(ErrorCode.UNAUTHENTICATED)
    make_authenticator: Callable[[sessionmaker[Session]], SessionAuthenticator] = (
        request.app.state.make_session_authenticator
    )
    authenticator = make_authenticator(request.app.state.sessions)
    principal = authenticator.authenticate(
        raw_token=raw_token,
        allow_activity_update=_allows_activity_update(request),
    )
    if principal is None:
        raise ApiError(ErrorCode.UNAUTHENTICATED)
    return principal


def _parse_canonical_uuid(raw: str) -> UUID | None:
    try:
        parsed = UUID(raw)
    except ValueError:
        return None
    return parsed if str(parsed) == raw.lower() else None


def _parse_permission(raw: str) -> Permission | None:
    try:
        return Permission(raw)
    except ValueError:
        return None


def _is_valid_tenant_slug(value: object) -> TypeGuard[str]:
    return (
        isinstance(value, str)
        and TENANT_SLUG_MIN_LENGTH <= len(value) <= TENANT_SLUG_MAX_LENGTH
        and _TENANT_SLUG_FORM.fullmatch(value) is not None
    )


def require_asserted_person(
    request: Request,
    principal: Annotated[AuthenticatedPrincipal, Depends(get_current_principal)],
) -> AuthenticatedPrincipal:
    """Enforces `X-Roadmaps-Person-Id` on authenticated state-changing requests (D5, D9)."""
    if request.method in SAFE_METHODS:
        return principal
    headers = request.headers.getlist(PERSON_ASSERTION_HEADER)
    if len(headers) != 1:
        raise ApiError(ErrorCode.PERSON_MISMATCH)
    asserted = _parse_canonical_uuid(headers[0])
    if asserted is None or asserted != principal.person_id:
        raise ApiError(ErrorCode.PERSON_MISMATCH)
    return principal


def resolve_tenant_context(
    request: Request,
    sessions: Sessions,
    principal: Annotated[AuthenticatedPrincipal, Depends(require_asserted_person)],
) -> TenantContext:
    """Resolves `{tenantSlug}` against active membership and validates role permissions (S2-S3)."""
    tenant_slug = request.path_params.get("tenantSlug")
    if not _is_valid_tenant_slug(tenant_slug):
        raise ApiError(ErrorCode.NOT_FOUND)

    # Transaction 1 (person-scoped RLS): resolve active membership for the named tenant slug.
    with sessions(info=session_info(person_id=principal.person_id)) as session:
        membership = AuthorisationRepository(session).find_active_membership_by_slug(
            tenant_slug=tenant_slug, person_id=principal.person_id
        )
    if membership is None:
        raise ApiError(ErrorCode.NOT_FOUND)
    tenant_id = membership.tenant_id
    role_id = membership.role_id

    # Transaction 2 (tenant-scoped RLS): read role_permissions and parse strictly via Permission.
    with sessions(info=session_info(tenant_id=tenant_id, person_id=principal.person_id)) as session:
        raw_permissions = TenantAuthorisationRepository(session, tenant_id).list_role_permissions(
            role_id=role_id
        )

    permissions: set[Permission] = set()
    for raw in raw_permissions:
        permission = _parse_permission(raw)
        if permission is None:
            # Never log the raw unknown permission string (D11, ADR-018/ADR-019).
            logger.error(
                "authz.unknown_permission",
                extra={
                    "tenant_id": str(tenant_id),
                    "role_id": str(role_id),
                    "code": ErrorCode.FORBIDDEN.value,
                },
            )
            raise ApiError(ErrorCode.FORBIDDEN)
        permissions.add(permission)

    return TenantContext(
        tenant_id=tenant_id,
        tenant_slug=tenant_slug,
        person_id=principal.person_id,
        role_id=role_id,
        permissions=frozenset(permissions),
        _sessions=sessions,
    )


CurrentPrincipal = Annotated[AuthenticatedPrincipal, Depends(require_asserted_person)]
CurrentTenant = Annotated[TenantContext, Depends(resolve_tenant_context)]


def _public_policy() -> None:
    return None


setattr(_public_policy, POLICY_ATTR, RoutePolicy(PolicyKind.PUBLIC))


def _signed_in_policy(principal: CurrentPrincipal) -> AuthenticatedPrincipal:
    return principal


setattr(_signed_in_policy, POLICY_ATTR, RoutePolicy(PolicyKind.SIGNED_IN))


def _tenant_member_policy(context: CurrentTenant) -> TenantContext:
    return context


setattr(_tenant_member_policy, POLICY_ATTR, RoutePolicy(PolicyKind.TENANT_MEMBER))


def _make_permission_dependency(permission: Permission) -> Callable[[CurrentTenant], TenantContext]:
    policy = RoutePolicy(PolicyKind.TENANT_PERMISSION, permission)

    def _require_permission(context: CurrentTenant) -> TenantContext:
        if permission not in context.permissions:
            raise ApiError(ErrorCode.FORBIDDEN)
        return context

    setattr(_require_permission, POLICY_ATTR, policy)
    return _require_permission


_PERMISSION_DEPENDENCIES: Final[dict[Permission, Callable[[CurrentTenant], TenantContext]]] = {
    permission: _make_permission_dependency(permission) for permission in Permission
}


def public() -> DependsParam:
    """Marks a route as publicly reachable (must also appear in `PUBLIC_ROUTES`)."""
    return Depends(_public_policy)


def signed_in() -> DependsParam:
    """Requires an authenticated session (plus person-assertion on state-changing methods)."""
    return Depends(_signed_in_policy)


def tenant_member() -> DependsParam:
    """Requires an active membership in `{tenantSlug}` (404 for non-members/unknown)."""
    return Depends(_tenant_member_policy)


def tenant_permission(permission: Permission) -> DependsParam:
    """Requires an active membership in `{tenantSlug}` whose role holds `permission`."""
    if not isinstance(permission, Permission):
        msg = "tenant_permission requires a Permission enum member"
        raise RoutePolicyError(msg)
    return Depends(_PERMISSION_DEPENDENCIES[permission])
