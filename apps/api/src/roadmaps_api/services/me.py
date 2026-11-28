"""Service for `GET /api/v1/me` returning person, memberships and session (D2, D13)."""

from dataclasses import dataclass
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.authz import AuthenticatedPrincipal, Permission, parse_role_permissions
from roadmaps_api.database import Sessions, session_info
from roadmaps_api.errors import ApiError, ErrorCode
from roadmaps_api.identity import provider_for_issuer
from roadmaps_api.repositories.me import MeRepository


@dataclass(frozen=True)
class MeIdentity:
    id: UUID
    provider: str
    email: str
    last_sign_in_at: datetime | None
    linked_at: datetime


@dataclass(frozen=True)
class MeRole:
    id: UUID
    name: str
    system_key: str | None


@dataclass(frozen=True)
class MeMembership:
    tenant_id: UUID
    tenant_slug: str
    name_en: str
    name_cy: str | None
    role: MeRole
    permissions: tuple[Permission, ...]


@dataclass(frozen=True)
class MeSession:
    idle_expires_at: datetime
    absolute_expires_at: datetime
    signed_in_at: datetime
    provider: str


@dataclass(frozen=True)
class MeProfile:
    person_id: UUID
    display_name: str
    identities: tuple[MeIdentity, ...]
    memberships: tuple[MeMembership, ...]
    session: MeSession


class MeService:
    """Reads the signed-in person's profile and active memberships in one ORM query (D7)."""

    def __init__(self, sessions: sessionmaker[Session]) -> None:
        self._sessions = sessions

    def get_me(self, principal: AuthenticatedPrincipal) -> MeProfile:
        with self._sessions(info=session_info(person_id=principal.person_id)) as session:
            person = MeRepository(session).load_person_profile(principal.person_id)
            if person is None:
                raise ApiError(ErrorCode.UNAUTHENTICATED)

            identities = tuple(
                MeIdentity(
                    id=ident.id,
                    provider=provider_for_issuer(ident.issuer),
                    email=ident.email,
                    last_sign_in_at=ident.last_sign_in_at,
                    linked_at=ident.linked_at,
                )
                for ident in sorted(person.identities, key=lambda i: i.id)
            )

            ordered_memberships = sorted(
                person.memberships,
                key=lambda m: (m.id, m.tenant_id),
            )
            memberships = tuple(
                MeMembership(
                    tenant_id=m.tenant_id,
                    tenant_slug=m.tenant.slug,
                    name_en=m.tenant.name_en,
                    name_cy=m.tenant.name_cy,
                    role=MeRole(
                        id=m.role.id,
                        name=m.role.name,
                        system_key=m.role.system_key,
                    ),
                    permissions=tuple(
                        sorted(
                            parse_role_permissions(
                                (rp.permission for rp in m.role.permissions),
                                tenant_id=m.tenant_id,
                                role_id=m.role.id,
                            ),
                            key=lambda p: p.value,
                        )
                    ),
                )
                for m in ordered_memberships
            )
            display_name = person.display_name

        return MeProfile(
            person_id=principal.person_id,
            display_name=display_name,
            identities=identities,
            memberships=memberships,
            session=MeSession(
                idle_expires_at=principal.idle_expires_at,
                absolute_expires_at=principal.absolute_expires_at,
                signed_in_at=principal.signed_in_at,
                provider=principal.provider,
            ),
        )


def get_me_service(sessions: Sessions) -> MeService:
    return MeService(sessions)


MeSvc = Annotated[MeService, Depends(get_me_service)]
