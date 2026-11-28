"""The platform's probes, at the root and unversioned (ADR-017's amendments)."""

from fastapi import APIRouter

from roadmaps_api.authz import PolicyAPIRoute, public
from roadmaps_api.services.readiness import Readiness

router = APIRouter(include_in_schema=False, route_class=PolicyAPIRoute)


@router.get("/health", dependencies=[public()])
def health() -> dict[str, str]:
    """The process answers, whatever the database's state."""
    return {"status": "ok"}


@router.get("/ready", dependencies=[public()])
def ready(readiness: Readiness) -> dict[str, str]:
    """The API may serve its database (`ReadinessService`)."""
    readiness.check()
    return {"status": "ok"}
