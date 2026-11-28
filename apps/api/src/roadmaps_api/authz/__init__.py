"""Authorisation catalogue, route policies, tenant dependency and guards (ADR-019, ADR-020)."""

from roadmaps_api.authz.permissions import (
    SHIPPED_ROLE_NAMES,
    SHIPPED_ROLES,
    Permission,
    ShippedRoleKey,
    validate_shipped_roles,
)
from roadmaps_api.authz.policies import (
    PERSON_ASSERTION_HEADER,
    AuthenticatedPrincipal,
    CurrentPrincipal,
    CurrentTenant,
    PolicyKind,
    RoutePolicy,
    RoutePolicyError,
    TenantContext,
    get_current_principal,
    parse_role_permissions,
    public,
    signed_in,
    tenant_member,
    tenant_permission,
)
from roadmaps_api.authz.routing import (
    LOCAL_OPENAPI_ROUTES,
    PUBLIC_ROUTES,
    PolicyAPIRoute,
    verify_app_routes,
)

__all__ = [
    "LOCAL_OPENAPI_ROUTES",
    "PERSON_ASSERTION_HEADER",
    "PUBLIC_ROUTES",
    "SHIPPED_ROLES",
    "SHIPPED_ROLE_NAMES",
    "AuthenticatedPrincipal",
    "CurrentPrincipal",
    "CurrentTenant",
    "Permission",
    "PolicyAPIRoute",
    "PolicyKind",
    "RoutePolicy",
    "RoutePolicyError",
    "ShippedRoleKey",
    "TenantContext",
    "get_current_principal",
    "parse_role_permissions",
    "public",
    "signed_in",
    "tenant_member",
    "tenant_permission",
    "validate_shipped_roles",
    "verify_app_routes",
]
