"""Fail-closed `PolicyAPIRoute` and default-deny startup route verification (ADR-019, D6, D10)."""

from collections.abc import Callable, Coroutine
from typing import Any, Final, override

from fastapi import FastAPI, Request, Response
from fastapi.dependencies.models import Dependant
from fastapi.routing import APIRoute, RouteContext, iter_route_contexts
from starlette.routing import Route

from roadmaps_api.authz.guards import SAFE_METHODS, enforce_json_media_type, enforce_same_origin
from roadmaps_api.authz.policies import POLICY_ATTR, PolicyKind, RoutePolicy, RoutePolicyError

ALLOWED_METHODS: Final = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE"})

# Reviewed allow-list of public endpoints (ADR-019 _Enforcement_, STY-105 S1, D10).
PUBLIC_ROUTES: Final[frozenset[tuple[str, str]]] = frozenset(
    {
        ("GET", "/health"),
        ("GET", "/ready"),
    }
)
LOCAL_OPENAPI_ROUTES: Final[frozenset[tuple[str, str]]] = frozenset(
    {
        ("GET", "/api/v1/openapi.json"),
        ("HEAD", "/api/v1/openapi.json"),
    }
)

_MISSING: Final = object()


def _collect_policies(dependant: Dependant, found: list[RoutePolicy]) -> None:
    for sub in dependant.dependencies:
        marker = getattr(sub.call, POLICY_ATTR, _MISSING)
        if marker is not _MISSING:
            if not isinstance(marker, RoutePolicy):
                msg = "Invalid route policy declaration"
                raise RoutePolicyError(msg)
            found.append(marker)
        _collect_policies(sub, found)


def extract_route_policy(dependant: Dependant) -> RoutePolicy:
    """Returns the route's single declared `RoutePolicy` or raises `RoutePolicyError`."""
    found: list[RoutePolicy] = []
    _collect_policies(dependant, found)
    if len(found) != 1:
        msg = f"Route must declare exactly one policy, found {len(found)}"
        raise RoutePolicyError(msg)
    return found[0]


class PolicyAPIRoute(APIRoute):
    """Custom FastAPI `APIRoute` enforcing declared policies and state-changing guards."""

    def __init__(
        self,
        path: str,
        endpoint: Callable[..., Any],
        *,
        methods: set[str] | list[str] | None = None,
        **kwargs: Any,  # noqa: ANN401 - forwards FastAPI APIRoute keyword arguments
    ) -> None:
        if methods is not None:
            normalized = {method.upper() for method in methods}
            if not normalized or not normalized.issubset(ALLOWED_METHODS):
                msg = f"Route {path!r} must declare a non-empty subset of allowed HTTP methods"
                raise RoutePolicyError(msg)
        super().__init__(path, endpoint, methods=methods, **kwargs)
        self.policy: RoutePolicy = extract_route_policy(self.dependant)

    @override
    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        original_handler = super().get_route_handler()
        # Startup verification refuses include-time dependencies, so the route's own
        # `body_field` is always the effective one.
        expects_body = self.body_field is not None

        async def guarded_handler(request: Request) -> Response:
            if request.method not in SAFE_METHODS:
                enforce_same_origin(request.headers, request.app.state.editor_origin)
                enforce_json_media_type(request.headers, expects_body=expects_body)
            return await original_handler(request)

        return guarded_handler


def _verify_policy_route(ctx: RouteContext, methods: set[str] | None, path_format: str) -> None:
    if not methods or not methods.issubset(ALLOWED_METHODS):
        msg = f"Route {path_format!r} has empty or disallowed HTTP methods"
        raise RoutePolicyError(msg)
    policy = extract_route_policy(ctx.dependant)
    if getattr(ctx.dependant.dependencies[0].call, POLICY_ATTR, _MISSING) is not policy:
        msg = f"Route {path_format!r} must place its policy dependency first"
        raise RoutePolicyError(msg)
    if policy.kind is PolicyKind.PUBLIC:
        if any((method, path_format) not in PUBLIC_ROUTES for method in methods):
            msg = f"Public route {path_format!r} is not in PUBLIC_ROUTES"
            raise RoutePolicyError(msg)
    elif policy.kind in {PolicyKind.TENANT_MEMBER, PolicyKind.TENANT_PERMISSION} and (
        "{tenantSlug}" not in path_format or "tenantSlug" not in ctx.param_convertors
    ):
        msg = f"Tenant-scoped route {path_format!r} must include '{{tenantSlug}}'"
        raise RoutePolicyError(msg)


def verify_app_routes(app: FastAPI) -> None:
    """Default-deny startup verification of every route on `app` (STY-105 D10).

    Admits only:
    1. A `PolicyAPIRoute` with non-empty methods within `ALLOWED_METHODS`, one valid
       effective policy placed first in the dependency list (no router-level or
       include-time dependency running ahead of it), `{tenantSlug}` on tenant policies,
       and `PUBLIC_ROUTES` membership for `public()` routes.
    2. A plain Starlette `Route` with a non-`None`, non-empty method set whose every
       `(method, path)` is in the active public allow-list (local `/api/v1/openapi.json`
       only when `serves_live_openapi` is enabled).

    Every other route (`Mount`, `Host`, `WebSocketRoute`, plain `APIRoute`, unknown classes)
    and any low-priority `frontend()` route is refused.
    """
    serves_live_openapi = bool(getattr(app.state, "serves_live_openapi", False))
    allowed_public = PUBLIC_ROUTES | LOCAL_OPENAPI_ROUTES if serves_live_openapi else PUBLIC_ROUTES

    if any(True for _ in app.router._iter_low_priority_routes()):  # noqa: SLF001 - D10
        msg = "Low-priority frontend routes are not permitted"
        raise RoutePolicyError(msg)

    for ctx in iter_route_contexts(app.routes):
        original = ctx.original_route
        methods = ctx.methods
        path_format = ctx.path_format or ""

        if type(original) is PolicyAPIRoute:
            _verify_policy_route(ctx, methods, path_format)
        elif type(original) is Route:
            if not methods or any(
                (method, path_format) not in allowed_public for method in methods
            ):
                msg = f"Plain Starlette Route {path_format!r} is not in the public allow-list"
                raise RoutePolicyError(msg)
        else:
            msg = f"Disallowed route class {type(original).__name__} at {path_format!r}"
            raise RoutePolicyError(msg)
