"""What FastAPI leaves in a request's scope about the route it chose.

FastAPI 0.163 keeps an included router's route there as it was included, its prefixes and
what was given with it, which the scope's own `route` lacks. It is not a documented
interface: `apps/api/tests/test_logs.py` and `apps/api/tests/test_errors.py` hold what
reads it, and a FastAPI bump that changes it fails there.
"""

from starlette.types import Scope


def effective_route_context(scope: Scope) -> object | None:
    """None for a route of the app's own, and for a request no FastAPI route took."""
    fastapi = scope.get("fastapi")
    return fastapi.get("effective_route_context") if isinstance(fastapi, dict) else None
