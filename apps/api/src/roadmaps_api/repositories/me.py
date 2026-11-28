"""Single-query person profile repository for `GET /api/v1/me` (STY-106 D7, D13)."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from roadmaps_api.models import Membership, Person, Role


class MeRepository:
    """Loads the authenticated person, identities and active memberships under person-scoped RLS."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def load_person_profile(self, person_id: UUID) -> Person | None:
        """Executes one ORM query relying on `SoftEndMixin` and D7 `person_select` RLS."""
        stmt = (
            select(Person)
            .where(Person.id == person_id, Person.disabled_at.is_(None))
            .options(
                joinedload(Person.identities),
                joinedload(Person.memberships).joinedload(Membership.tenant),
                joinedload(Person.memberships)
                .joinedload(Membership.role)
                .joinedload(Role.permissions),
            )
        )
        return self._session.scalars(stmt).unique().one_or_none()
