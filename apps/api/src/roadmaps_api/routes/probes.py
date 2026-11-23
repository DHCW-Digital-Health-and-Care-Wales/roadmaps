"""The platform's probes, at the root and unversioned (ADR-017 _STY-090 amendments_)."""

from fastapi import APIRouter

from roadmaps_api.database import DbSession
from roadmaps_api.repositories.readiness import ReadinessRepository
from roadmaps_api.services.readiness import ReadinessService

router = APIRouter(include_in_schema=False)


@router.get("/health")
def health() -> dict[str, str]:
    """The process answers, whatever the database's state."""
    return {"status": "ok"}


@router.get("/ready")
def ready(session: DbSession) -> dict[str, str]:
    """The database answers too."""
    ReadinessService(ReadinessRepository(session)).check()
    return {"status": "ok"}
