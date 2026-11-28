"""Database queries for tenant membership and role-permission resolution (ADR-017, ADR-019).

`AuthorisationRepository` runs under person-scoped RLS (`app.tenant_id` unset) to resolve
a tenant slug against the caller's active membership. `TenantAuthorisationRepository` is
bound to one tenant under tenant-scoped RLS (`TENANT_POLICY`) to read `role_permissions`.
Neither repository ends a transaction.
"""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from roadmaps_api.models import Membership, RolePermission, Tenant


@dataclass(frozen=True, slots=True)
class ActiveMembership:
    """Resolved active membership for a person in one tenant."""

    tenant_id: UUID
    role_id: UUID


class AuthorisationRepository:
    """Person-scoped lookup resolving `{tenantSlug}` to an active membership."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def find_active_membership_by_slug(
        self, *, tenant_slug: str, person_id: UUID
    ) -> ActiveMembership | None:
        """Returns the caller's active membership for `tenant_slug`, or `None`."""
        row = self._session.execute(
            select(Tenant.id, Membership.role_id)
            .join(Membership, Membership.tenant_id == Tenant.id)
            .where(
                Tenant.slug == tenant_slug,
                Membership.person_id == person_id,
                Membership.ended_at.is_(None),
            )
        ).one_or_none()
        return ActiveMembership(tenant_id=row[0], role_id=row[1]) if row is not None else None


class TenantAuthorisationRepository:
    """Tenant-scoped lookup reading raw permission names for one role."""

    def __init__(self, session: Session, tenant_id: UUID) -> None:
        self._session = session
        self._tenant_id = tenant_id

    def list_role_permissions(self, *, role_id: UUID) -> list[str]:
        """Returns the raw permission strings stored for `role_id` in this tenant."""
        return list(
            self._session.scalars(
                select(RolePermission.permission).where(
                    RolePermission.tenant_id == self._tenant_id,
                    RolePermission.role_id == role_id,
                )
            )
        )
