"""Canonical ADR-019 permission catalogue, shipped roles and dev-only packaging boundary.

Verifies `Permission`, `ShippedRoleKey`, immutable `SHIPPED_ROLES` and `SHIPPED_ROLE_NAMES`
against ADR-019, and holds S5's boundary that `faker` stays in `[dependency-groups].dev`
and nothing under `src/roadmaps_api/` imports `faker` or `tools`.
"""

import ast
import re
import tomllib
from pathlib import Path
from types import MappingProxyType
from typing import cast

import pytest

from roadmaps_api.authz import (
    SHIPPED_ROLE_NAMES,
    SHIPPED_ROLES,
    Permission,
    ShippedRoleKey,
)

API_DIR = Path(__file__).parent.parent
SRC_DIR = API_DIR / "src" / "roadmaps_api"
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


def test_faker_is_dev_only_and_never_imported_by_runtime_package() -> None:
    pyproject = tomllib.loads((API_DIR / "pyproject.toml").read_text(encoding="utf-8"))
    runtime_deps: list[str] = pyproject["project"]["dependencies"]
    dev_deps: list[str] = pyproject["dependency-groups"]["dev"]

    assert not any(dep.lower().startswith("faker") for dep in runtime_deps)
    assert any(dep.lower().startswith("faker") for dep in dev_deps)

    forbidden_roots = {"faker", "tools"}
    for path in sorted(SRC_DIR.rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert alias.name.split(".")[0] not in forbidden_roots, f"{path}: {alias.name}"
            elif isinstance(node, ast.ImportFrom) and node.module is not None:
                assert node.module.split(".")[0] not in forbidden_roots, f"{path}: {node.module}"
