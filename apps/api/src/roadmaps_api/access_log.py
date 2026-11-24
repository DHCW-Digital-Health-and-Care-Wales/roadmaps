"""How the access line names a request: by its route's template and a known method.

Never by the path or the method a caller sent (ADR-018 _Records and retention_; the
owner's rule for the access line): a path can hold a name, an email address or a token,
and HTTP accepts any token as a method.

The route is read from what routing leaves in the request's scope. FastAPI keeps the
template of the route it chose, with every prefix its routers were included under, in
`scope["fastapi"]["effective_route_context"]` (FastAPI 0.163; not a documented
interface, so `apps/api/tests/test_logs.py` pins each case and a FastAPI bump that
changes it fails there); Starlette's own routes are matched against the app's. A request
a mounted app handled is `unmatched`, whatever its routes, until a story mounts one.
"""

from collections.abc import Sequence
from http import HTTPMethod
from typing import Final

from starlette.routing import BaseRoute, Match, Route
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
    before routing (a `Host` not allowed), an unknown path, a redirect to the path with
    or without its trailing slash and a request a mounted app handled are `unmatched`; a
    FastAPI route's 405 names the route that takes the path.
    """
    # A mounted Starlette or FastAPI app puts itself in the scope, wherever it is mounted,
    # the root included, whose mount adds nothing to the root path. Any other mounted app
    # leaves no template for the lookups below.
    if routed.get("app") is not entry.get("app"):
        return UNMATCHED
    app_routes = getattr(entry.get("app"), "routes", ())
    return _fastapi_template(routed) or _starlette_template(app_routes, routed) or UNMATCHED


def _fastapi_template(routed: Scope) -> str | None:
    """The template FastAPI matched, include prefixes and all."""
    fastapi = routed.get("fastapi")
    context = fastapi.get("effective_route_context") if isinstance(fastapi, dict) else None
    path = getattr(context, "path", None) or getattr(routed.get("route"), "path", None)
    return path if isinstance(path, str) else None


def _starlette_template(routes: Sequence[BaseRoute], routed: Scope) -> str | None:
    """A Starlette `Route`'s template (the live OpenAPI JSON's), which FastAPI does not record."""
    for route in routes:
        if type(route) is Route and route.matches(dict(routed))[0] is Match.FULL:
            return route.path
    return None
