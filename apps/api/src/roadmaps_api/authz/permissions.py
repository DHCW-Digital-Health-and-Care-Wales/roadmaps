"""Canonical permission catalogue and shipped roles (ADR-019).

`Permission` is the single source of truth for permission names across routes, services,
platform operator jobs (`STY-104`), route authorisation (`STY-105`) and the local seeder
(`STY-093`). `SHIPPED_ROLES` and `SHIPPED_ROLE_NAMES` are immutable mappings so no caller
can mutate role definitions at runtime.
"""

from collections.abc import Mapping
from enum import StrEnum
from types import MappingProxyType
from typing import Final


class Permission(StrEnum):
    ROADMAPS_CREATE = "roadmaps:create"
    ROADMAPS_EDIT = "roadmaps:edit"
    ROADMAPS_EDIT_ANY = "roadmaps:edit-any"
    ROADMAPS_PUBLISH = "roadmaps:publish"
    TAGS_EDIT = "tags:edit"
    LISTS_EDIT = "lists:edit"
    MEMBERS_MANAGE = "members:manage"
    ASSIGNMENTS_MANAGE = "assignments:manage"
    CONTENT_REDACT = "content:redact"
    TENANT_SETTINGS = "tenant:settings"


class ShippedRoleKey(StrEnum):
    ADMIN = "admin"
    PRODUCT_LEAD = "product_lead"
    VIEWER = "viewer"


SHIPPED_ROLES: Final[Mapping[ShippedRoleKey, frozenset[Permission]]] = MappingProxyType(
    {
        # Admin holds every permission except roadmaps:edit, which roadmaps:edit-any covers.
        ShippedRoleKey.ADMIN: frozenset(
            permission for permission in Permission if permission is not Permission.ROADMAPS_EDIT
        ),
        ShippedRoleKey.PRODUCT_LEAD: frozenset(
            {
                Permission.ROADMAPS_CREATE,
                Permission.ROADMAPS_EDIT,
                Permission.ROADMAPS_PUBLISH,
                Permission.TAGS_EDIT,
            }
        ),
        ShippedRoleKey.VIEWER: frozenset(),
    }
)

SHIPPED_ROLE_NAMES: Final[Mapping[ShippedRoleKey, str]] = MappingProxyType(
    {
        ShippedRoleKey.ADMIN: "Admin",
        ShippedRoleKey.PRODUCT_LEAD: "Product Lead",
        ShippedRoleKey.VIEWER: "Viewer",
    }
)


def validate_shipped_roles(
    roles: Mapping[ShippedRoleKey, frozenset[Permission]] | None = None,
) -> None:
    """Validates code-level shipped role definitions against `Permission` at startup (D11)."""
    target = SHIPPED_ROLES if roles is None else roles
    expected_keys = set(ShippedRoleKey)
    if set(target) != expected_keys:
        msg = "SHIPPED_ROLES is missing one or more ShippedRoleKey entries"
        raise ValueError(msg)
    for role_key, permissions in target.items():
        for permission in permissions:
            if not isinstance(permission, Permission):
                try:
                    Permission(permission)
                except ValueError:
                    msg = f"Shipped role {role_key.value!r} contains an unknown permission"
                    raise ValueError(msg) from None
                msg = f"Shipped role {role_key.value!r} must use Permission enum members"
                raise TypeError(msg)
