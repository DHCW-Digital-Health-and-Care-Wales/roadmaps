"""The platform's probes, at the root and unversioned (ADR-017's amendments)."""

from fastapi import APIRouter

from roadmaps_api.services.readiness import Readiness

router = APIRouter(include_in_schema=False)


@router.get("/health")
def health() -> dict[str, str]:
    """The process answers, whatever the database's state."""
    return {"status": "ok"}


@router.get("/ready")
def ready(readiness: Readiness) -> dict[str, str]:
    """The database answers too."""
    readiness.check()
    return {"status": "ok"}
