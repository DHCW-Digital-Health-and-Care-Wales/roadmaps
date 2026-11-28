"""Canonical ADR-019 permission catalogue and immutable shipped roles."""

import re
from types import MappingProxyType
from typing import cast

import pytest

from roadmaps_api.authz import (
    SHIPPED_ROLE_NAMES,
    SHIPPED_ROLES,
    Permission,
    ShippedRoleKey,
    validate_shipped_roles,
)

PERMISSION_FORMAT = re.compile(r"^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$")


def test_permission_catalogue_matches_adr_019_and_db_format() -> None:
    expected = {
        "roadmaps:create",
        "roadmaps:edit",
        "roadmaps:edit-any",
        "roadmaps:publish",
        "tags:edit",
        "lists:edit",
        "members:manage",
        "assignments:manage",
        "content:redact",
        "tenant:settings",
    }
    actual = {permission.value for permission in Permission}
    assert actual == expected
    assert all(PERMISSION_FORMAT.fullmatch(value) for value in actual)


def test_shipped_roles_match_adr_019_and_are_immutable() -> None:
    assert isinstance(SHIPPED_ROLES, MappingProxyType)
    assert isinstance(SHIPPED_ROLE_NAMES, MappingProxyType)
    assert set(SHIPPED_ROLES) == {
        ShippedRoleKey.ADMIN,
        ShippedRoleKey.PRODUCT_LEAD,
        ShippedRoleKey.VIEWER,
    }
    assert set(SHIPPED_ROLE_NAMES) == set(SHIPPED_ROLES)

    # Admin holds every permission except roadmaps:edit (covered by roadmaps:edit-any).
    assert SHIPPED_ROLES[ShippedRoleKey.ADMIN] == frozenset(Permission) - {Permission.ROADMAPS_EDIT}
    assert SHIPPED_ROLES[ShippedRoleKey.PRODUCT_LEAD] == frozenset(
        {
            Permission.ROADMAPS_CREATE,
            Permission.ROADMAPS_EDIT,
            Permission.ROADMAPS_PUBLISH,
            Permission.TAGS_EDIT,
        }
    )
    assert SHIPPED_ROLES[ShippedRoleKey.VIEWER] == frozenset()
    assert dict(SHIPPED_ROLE_NAMES) == {
        ShippedRoleKey.ADMIN: "Admin",
        ShippedRoleKey.PRODUCT_LEAD: "Product Lead",
        ShippedRoleKey.VIEWER: "Viewer",
    }

    with pytest.raises(TypeError):
        cast("dict[object, object]", SHIPPED_ROLES)[ShippedRoleKey.VIEWER] = frozenset()
    with pytest.raises(TypeError):
        cast("dict[object, object]", SHIPPED_ROLE_NAMES)[ShippedRoleKey.VIEWER] = "Mutated"
    assert all(isinstance(perms, frozenset) for perms in SHIPPED_ROLES.values())


def test_validate_shipped_roles_accepts_the_catalogue_and_rejects_corrupted_roles() -> None:
    validate_shipped_roles()

    with pytest.raises(ValueError, match="missing"):
        validate_shipped_roles(roles={ShippedRoleKey.ADMIN: frozenset()})
    with pytest.raises(ValueError, match="unknown"):
        validate_shipped_roles(
            roles={
                ShippedRoleKey.ADMIN: frozenset({cast("Permission", "bogus:perm")}),
                ShippedRoleKey.PRODUCT_LEAD: frozenset(),
                ShippedRoleKey.VIEWER: frozenset(),
            }
        )
    with pytest.raises(TypeError, match="Permission"):
        validate_shipped_roles(
            roles={
                ShippedRoleKey.ADMIN: frozenset({cast("Permission", str(Permission.LISTS_EDIT))}),
                ShippedRoleKey.PRODUCT_LEAD: frozenset(),
                ShippedRoleKey.VIEWER: frozenset(),
            }
        )
