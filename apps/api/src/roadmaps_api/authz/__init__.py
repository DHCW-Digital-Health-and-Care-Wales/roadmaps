"""Authorisation catalogue and shipped role definitions (ADR-019)."""

from roadmaps_api.authz.permissions import (
    SHIPPED_ROLE_NAMES,
    SHIPPED_ROLES,
    Permission,
    ShippedRoleKey,
)

__all__ = [
    "SHIPPED_ROLES",
    "SHIPPED_ROLE_NAMES",
    "Permission",
    "ShippedRoleKey",
]
