"""Repository for access-scope change-set open, sign-off and summary reads (STY-103 D15).

Calls the `roadmaps_history_definer` `SECURITY DEFINER` routines and never ends a SQL
transaction (ADR-017 _Layering_).
"""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from roadmaps_api.models import ChangeSummary

OPEN_ACCESS_CHANGE_SET = text(
    "SELECT change_set_id, revision, is_replay"
    " FROM public.open_access_change_set(:idempotency_key, :request_hash, :note, :batch_ref)"
)
SIGN_OFF_ACCESS_CHANGE_SET = text("SELECT public.sign_off_access_change_set(:change_set_id)")


@dataclass(frozen=True)
class ChangeSetOpenResult:
    change_set_id: UUID
    revision: int
    is_replay: bool


class AccessChangeSetRepository:
    def __init__(self, session: Session, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id

    def open(
        self,
        *,
        idempotency_key: str,
        request_hash: bytes,
        note: str | None = None,
        batch_ref: UUID | None = None,
    ) -> ChangeSetOpenResult:
        """Locks the tenant's access scope and opens (or replays) an access change set."""
        row = self._session.execute(
            OPEN_ACCESS_CHANGE_SET,
            {
                "idempotency_key": idempotency_key,
                "request_hash": request_hash,
                "note": note,
                "batch_ref": batch_ref,
            },
        ).one()
        return ChangeSetOpenResult(
            change_set_id=row.change_set_id,
            revision=row.revision,
            is_replay=row.is_replay,
        )

    def sign_off(self, change_set_id: UUID) -> None:
        """Marks the transaction's open access change set completed."""
        self._session.execute(SIGN_OFF_ACCESS_CHANGE_SET, {"change_set_id": change_set_id})

    def summaries_for(self, change_set_id: UUID) -> list[ChangeSummary]:
        """Returns the summaries recorded for one change set in this tenant."""
        statement = (
            select(ChangeSummary)
            .where(
                ChangeSummary.tenant_id == self._tenant_id,
                ChangeSummary.change_set_id == change_set_id,
            )
            .order_by(ChangeSummary.id)
        )
        return list(self._session.scalars(statement))
