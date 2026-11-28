"""The contract's routes, which the editor and later the public read rely on."""

from fastapi import APIRouter

from roadmaps_api.authz import PolicyAPIRoute

router = APIRouter(prefix="/api/v1", route_class=PolicyAPIRoute)
