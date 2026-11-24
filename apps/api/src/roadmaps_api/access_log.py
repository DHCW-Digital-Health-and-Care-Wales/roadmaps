"""How the access line names a request: by its route's template and a known method.

Never by the path or the method a caller sent (ADR-018 _Records and retention_; the
owner's rule for the access line): a path can hold a name, an email address or a token,
and HTTP accepts any token as a method.

The route is read from what routing leaves in the request's scope. FastAPI keeps the
template of the route it chose, with every prefix its routers were included under, in
`scope["fastapi"]["effective_route_context"]` (FastAPI 0.163; not a documented
interface, so `apps/api/tests/test_logs.py` pins each case and a FastAPI bump that
changes it fails there); Starlette's own routes are matched against the app's. A mount
adds its template in front, found by matching the mounts, since routing leaves only
the concrete prefix in `root_path`.
"""

from collections.abc import Sequence
from http import HTTPMethod
from typing import Final

from starlette.routing import BaseRoute, Match, Mount, Route
from starlette.types import Scope

UNMATCHED: Final = "unmatched"
# A method HTTP does not define, as OpenTelemetry names one.
OTHER_METHOD: Final = "_OTHER"


def method_name(scope: Scope) -> str:
    method = scope["method"]
    return method if method in HTTPMethod else OTHER_METHOD


def route_template(entry: Scope, routed: Scope) -> str:
    """The template of the route that answered, or `unmatched`.

    `entry` is the request's scope before routing, `routed` after it. A request refused
    before routing (a bad `Host`, a body over the limit), an unknown path and a redirect
    to the path with or without its trailing slash are `unmatched`; a 405 names the
    route that takes the path; a mounted app with no routes is its mount's template and
    `{path:path}`.
    """
    mounts: list[Mount] = []
    if routed.get("root_path", "") != entry.get("root_path", ""):
        mounts = _mounts(getattr(entry.get("app"), "routes", ()), entry)
    prefix = "".join(mount.path for mount in mounts)
    innermost = mounts[-1].routes if mounts else getattr(entry.get("app"), "routes", ())
    path = _fastapi_template(routed) or _starlette_template(innermost, routed)
    if path is not None:
        return prefix + path
    if mounts and not mounts[-1].routes:
        return f"{prefix}/{{path:path}}"
    return UNMATCHED


def _mounts(routes: Sequence[BaseRoute], scope: Scope) -> list[Mount]:
    """The mounts a request passes through, outermost first, as routing finds them."""
    for route in routes:
        if isinstance(route, Mount):
            match, child_scope = route.matches(dict(scope))
            if match is Match.FULL:
                return [route, *_mounts(route.routes, {**scope, **child_scope})]
    return []


def _fastapi_template(routed: Scope) -> str | None:
    """The template FastAPI matched, include prefixes and all."""
    fastapi = routed.get("fastapi")
    context = fastapi.get("effective_route_context") if isinstance(fastapi, dict) else None
    path = getattr(context, "path", None) or getattr(routed.get("route"), "path", None)
    return path if isinstance(path, str) and not isinstance(routed.get("route"), Mount) else None


def _starlette_template(routes: Sequence[BaseRoute], routed: Scope) -> str | None:
    """A Starlette `Route`'s template (the live OpenAPI JSON's), which FastAPI does not record."""
    for route in routes:
        if type(route) is Route and route.matches(dict(routed))[0] is Match.FULL:
            return route.path
    return None
