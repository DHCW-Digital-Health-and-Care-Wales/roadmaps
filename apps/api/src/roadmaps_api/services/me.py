"""Service for `GET /api/v1/me` returning person, memberships and session (D2, D13)."""

import logging
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.authz import AuthenticatedPrincipal, Permission
from roadmaps_api.database import Sessions, session_info
from roadmaps_api.errors import ApiError, ErrorCode
from roadmaps_api.identity import provider_for_issuer
from roadmaps_api.repositories.me import MeRepository
from roadmaps_api.wire import ApiResponseModel

logger = logging.getLogger(__name__)


class MeIdentityResponse(ApiResponseModel):
    id: UUID
    provider: str
    email: str
    last_sign_in_at: datetime | None
    linked_at: datetime


class MeRoleResponse(ApiResponseModel):
    id: UUID
    name: str
    system_key: str | None


class MeMembershipResponse(ApiResponseModel):
    tenant_id: UUID
    tenant_slug: str
    name_en: str
    name_cy: str | None
    role: MeRoleResponse
    permissions: list[Permission]


class MeSessionResponse(ApiResponseModel):
    idle_expires_at: datetime
    absolute_expires_at: datetime
    signed_in_at: datetime
    provider: str


class MeResponse(ApiResponseModel):
    person_id: UUID
    display_name: str
    identities: list[MeIdentityResponse]
    memberships: list[MeMembershipResponse]
    session: MeSessionResponse


_PERMISSIONS_BY_VALUE: dict[str, Permission] = {p.value: p for p in Permission}


def _parse_permissions(
    raw_permissions: list[str], *, tenant_id: UUID, role_id: UUID
) -> list[Permission]:
    parsed: list[Permission] = []
    for raw in raw_permissions:
        permission = _PERMISSIONS_BY_VALUE.get(raw)
        if permission is None:
            logger.error(
                "authz.unknown_permission",
                extra={
                    "tenant_id": str(tenant_id),
                    "role_id": str(role_id),
                    "code": ErrorCode.FORBIDDEN.value,
                },
            )
            raise ApiError(ErrorCode.FORBIDDEN)
        parsed.append(permission)
    return sorted(set(parsed), key=lambda p: p.value)


class MeService:
    """Reads the signed-in person's profile and active memberships in one ORM query (D7)."""

    def __init__(self, sessions: sessionmaker[Session]) -> None:
        self._sessions = sessions

    def get_me(self, principal: AuthenticatedPrincipal) -> MeResponse:
        with self._sessions(info=session_info(person_id=principal.person_id)) as session:
            person = MeRepository(session).load_person_profile(principal.person_id)
            if person is None:
                raise ApiError(ErrorCode.UNAUTHENTICATED)

            identities = [
                MeIdentityResponse(
                    id=ident.id,
                    provider=provider_for_issuer(ident.issuer),
                    email=ident.email,
                    last_sign_in_at=ident.last_sign_in_at,
                    linked_at=ident.linked_at,
                )
                for ident in sorted(person.identities, key=lambda i: i.id)
            ]

            ordered_memberships = sorted(
                person.memberships,
                key=lambda m: (m.id, m.tenant_id),
            )
            memberships = [
                MeMembershipResponse(
                    tenant_id=m.tenant_id,
                    tenant_slug=m.tenant.slug,
                    name_en=m.tenant.name_en,
                    name_cy=m.tenant.name_cy,
                    role=MeRoleResponse(
                        id=m.role.id,
                        name=m.role.name,
                        system_key=m.role.system_key,
                    ),
                    permissions=_parse_permissions(
                        [rp.permission for rp in m.role.permissions],
                        tenant_id=m.tenant_id,
                        role_id=m.role.id,
                    ),
                )
                for m in ordered_memberships
            ]
            display_name = person.display_name

        return MeResponse(
            person_id=principal.person_id,
            display_name=display_name,
            identities=identities,
            memberships=memberships,
            session=MeSessionResponse(
                idle_expires_at=principal.idle_expires_at,
                absolute_expires_at=principal.absolute_expires_at,
                signed_in_at=principal.signed_in_at,
                provider=principal.provider,
            ),
        )


def get_me_service(sessions: Sessions) -> MeService:
    return MeService(sessions)


MeSvc = Annotated[MeService, Depends(get_me_service)]
