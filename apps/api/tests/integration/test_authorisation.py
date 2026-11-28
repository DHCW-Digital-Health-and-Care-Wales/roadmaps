"""S2 (DB), S3, S4 (read-only GET), S5: tenant dependency, matrix and cross-tenant sweep.

Runs against real PostgreSQL 18 as `roadmaps_app` on the shared single-connection pool
fixture (`pool_size=1, max_overflow=0`) so pooled transactions meet any leaked session
state. Uses a minimal test-only probe router beside `create_app(...)` until real contract
routes land in `STY-106` and `EPC-025` (D1, D4, D11, D12, D15).
"""

import dataclasses
import hashlib
import re
import uuid
from collections.abc import Callable, Generator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Final, Self

import psycopg
import pytest
from fastapi import APIRouter, FastAPI
from fastapi.routing import iter_route_contexts
from fastapi.testclient import TestClient
from sqlalchemy import Connection, Engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.app import create_app
from roadmaps_api.authz import (
    PERSON_ASSERTION_HEADER,
    SHIPPED_ROLE_NAMES,
    SHIPPED_ROLES,
    AuthenticatedPrincipal,
    CurrentPrincipal,
    CurrentTenant,
    Permission,
    PolicyAPIRoute,
    PolicyKind,
    RoutePolicy,
    ShippedRoleKey,
    get_current_principal,
    public,
    signed_in,
    tenant_member,
    tenant_permission,
)
from roadmaps_api.repositories.access_change_set import AccessChangeSetRepository
from roadmaps_api.wire import ApiRequestModel
from tests.harness import PROBE_TABLE, one_uuid
from tests.support import SAME_ORIGIN_HEADERS, Lines, make_settings

SEED_TIME: Final = datetime(2026, 11, 27, 12, 0, tzinfo=UTC)
SESSION_ID: Final = uuid.UUID("01950000-0000-7000-8000-0000000000aa")

# Standing S4 exemption list: only the future OIDC callback route may write on GET (D4, D15).
READ_ONLY_GET_EXEMPTIONS: Final[frozenset[str]] = frozenset()

# SQL patterns: session-activity bookkeeping (`STY-106` D12) will register its exact
# definer routine here so same-origin GETs may update last_activity_at while same-site /
# cross-site GETs must still write nothing at all (D4).
SESSION_BOOKKEEPING_PATTERNS: Final[tuple[re.Pattern[str], ...]] = ()
WRITE_SQL_PATTERN: Final = re.compile(
    r"^\s*(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|CALL)\b"
    r"|^\s*WITH\b.*\b(?:INSERT|UPDATE|DELETE|MERGE)\b",
    re.IGNORECASE | re.DOTALL,
)


class ProbeWriteBody(ApiRequestModel):
    label: str


@dataclass(frozen=True)
class AuthzFixture:
    tenant_a_id: uuid.UUID
    tenant_a_slug: str
    tenant_b_id: uuid.UUID
    tenant_b_slug: str
    roles_a: dict[ShippedRoleKey, uuid.UUID]
    roles_b: dict[ShippedRoleKey, uuid.UUID]
    admin_a: uuid.UUID
    lead_a: uuid.UUID
    viewer_a: uuid.UUID
    ended_a: uuid.UUID
    demoted_a: uuid.UUID
    admin_b: uuid.UUID
    multi_ab: uuid.UUID


@contextmanager
def _access_change_set(
    conn: psycopg.Connection,
    tenant_id: uuid.UUID,
    key: str,
    *,
    kind: str = "access_change",
) -> Generator[uuid.UUID]:
    request_hash = hashlib.sha256(key.encode("utf-8")).digest()
    cs_id = one_uuid(
        conn,
        "SELECT change_set_id FROM open_access_change_set_internal("
        " %s, %s, 'system', NULL, 'seed', %s, %s, NULL, NULL)",
        (tenant_id, kind, key, request_hash),
    )
    yield cs_id
    conn.execute("SELECT sign_off_access_change_set_internal(%s, %s)", (tenant_id, cs_id))


def _seed_tenant_with_roles(
    conn: psycopg.Connection, *, slug: str, name: str, key: str
) -> tuple[uuid.UUID, dict[ShippedRoleKey, uuid.UUID]]:
    tenant_id = one_uuid(
        conn,
        "INSERT INTO tenants (slug, name_en) VALUES (%s, %s) RETURNING id",
        (slug, name),
    )
    conn.execute(
        "INSERT INTO tenant_scopes (tenant_id, scope) VALUES (%s, 'access'), (%s, 'lists')",
        (tenant_id, tenant_id),
    )
    role_ids: dict[ShippedRoleKey, uuid.UUID] = {}
    with _access_change_set(conn, tenant_id, f"seed-{key}", kind="migration"):
        for role_key, perms in SHIPPED_ROLES.items():
            role_id = one_uuid(
                conn,
                "INSERT INTO roles (tenant_id, name, system_key) VALUES (%s, %s, %s) RETURNING id",
                (tenant_id, SHIPPED_ROLE_NAMES[role_key], role_key.value),
            )
            role_ids[role_key] = role_id
            for perm in sorted(perms):
                conn.execute(
                    "INSERT INTO role_permissions (tenant_id, role_id, permission)"
                    " VALUES (%s, %s, %s)",
                    (tenant_id, role_id, perm.value),
                )
    return tenant_id, role_ids


def _insert_person(conn: psycopg.Connection, display_name: str, sub: str) -> uuid.UUID:
    person_id = one_uuid(
        conn,
        "INSERT INTO people (display_name) VALUES (%s) RETURNING id",
        (display_name,),
    )
    conn.execute(
        "INSERT INTO identities (person_id, issuer, subject, email)"
        " VALUES (%s, 'https://accounts.google.com', %s, %s)",
        (person_id, sub, f"{sub}@example.org"),
    )
    return person_id


@pytest.fixture
def authz_data(
    database_url: str,  # noqa: ARG001 - ensures teardown empties tables
    worker_admin: psycopg.Connection,
) -> AuthzFixture:
    ended_at = SEED_TIME - timedelta(days=1)
    with worker_admin.transaction():
        tenant_a_id, roles_a = _seed_tenant_with_roles(
            worker_admin, slug="tenant-a", name="Tenant A", key="tenant-a"
        )
        tenant_b_id, roles_b = _seed_tenant_with_roles(
            worker_admin, slug="tenant-b", name="Tenant B", key="tenant-b"
        )

        admin_a = _insert_person(worker_admin, "Admin A", "admin-a")
        lead_a = _insert_person(worker_admin, "Lead A", "lead-a")
        viewer_a = _insert_person(worker_admin, "Viewer A", "viewer-a")
        ended_a = _insert_person(worker_admin, "Ended A", "ended-a")
        demoted_a = _insert_person(worker_admin, "Demoted A", "demoted-a")
        admin_b = _insert_person(worker_admin, "Admin B", "admin-b")
        multi_ab = _insert_person(worker_admin, "Multi AB", "multi-ab")

        with _access_change_set(worker_admin, tenant_a_id, "members-a"):
            for person_id, role_key, ended in (
                (admin_a, ShippedRoleKey.ADMIN, None),
                (lead_a, ShippedRoleKey.PRODUCT_LEAD, None),
                (viewer_a, ShippedRoleKey.VIEWER, None),
                (ended_a, ShippedRoleKey.ADMIN, ended_at),
                # D1: ended Admin + active Viewer in the same tenant must resolve to Viewer.
                (demoted_a, ShippedRoleKey.ADMIN, ended_at),
                (demoted_a, ShippedRoleKey.VIEWER, None),
                (multi_ab, ShippedRoleKey.ADMIN, None),
            ):
                worker_admin.execute(
                    "INSERT INTO memberships (tenant_id, person_id, role_id, ended_at)"
                    " VALUES (%s, %s, %s, %s)",
                    (tenant_a_id, person_id, roles_a[role_key], ended),
                )

        with _access_change_set(worker_admin, tenant_b_id, "members-b"):
            for person_id, role_key in (
                (admin_b, ShippedRoleKey.ADMIN),
                (multi_ab, ShippedRoleKey.VIEWER),
            ):
                worker_admin.execute(
                    "INSERT INTO memberships (tenant_id, person_id, role_id) VALUES (%s, %s, %s)",
                    (tenant_b_id, person_id, roles_b[role_key]),
                )

    return AuthzFixture(
        tenant_a_id=tenant_a_id,
        tenant_a_slug="tenant-a",
        tenant_b_id=tenant_b_id,
        tenant_b_slug="tenant-b",
        roles_a=roles_a,
        roles_b=roles_b,
        admin_a=admin_a,
        lead_a=lead_a,
        viewer_a=viewer_a,
        ended_a=ended_a,
        demoted_a=demoted_a,
        admin_b=admin_b,
        multi_ab=multi_ab,
    )


def _add_probe_router(app: FastAPI) -> None:
    """Minimal test-only probe router exercising every policy kind and a tenant write (D15)."""
    probe = APIRouter(prefix="/api/v1", route_class=PolicyAPIRoute)

    @probe.get("/probe/public", dependencies=[public()])
    def probe_public() -> dict[str, str]:
        return {"scope": "public"}

    @probe.get("/probe/signed-in", dependencies=[signed_in()])
    def probe_signed_in_get(principal: CurrentPrincipal) -> dict[str, str]:
        return {"personId": str(principal.person_id)}

    @probe.post("/probe/signed-in", dependencies=[signed_in()])
    def probe_signed_in_post(principal: CurrentPrincipal) -> dict[str, str]:
        return {"personId": str(principal.person_id)}

    tenant_probe = APIRouter(route_class=PolicyAPIRoute)

    @tenant_probe.get("/probe/member", dependencies=[tenant_member()])
    def probe_tenant_member(tenant: CurrentTenant) -> dict[str, Any]:
        with tenant.open_session() as session:
            current_tenant, current_person = session.execute(
                text(
                    "SELECT current_setting('app.tenant_id', true),"
                    " current_setting('app.person_id', true)"
                )
            ).one()
        return {
            "tenantId": str(tenant.tenant_id),
            "tenantSlug": tenant.tenant_slug,
            "personId": str(tenant.person_id),
            "roleId": str(tenant.role_id),
            "permissions": sorted(p.value for p in tenant.permissions),
            "rlsTenant": current_tenant,
            "rlsPerson": current_person,
        }

    @tenant_probe.get(
        "/probe/tags",
        dependencies=[tenant_permission(Permission.TAGS_EDIT)],
    )
    def probe_tags(tenant: CurrentTenant) -> dict[str, str]:
        return {"tenantId": str(tenant.tenant_id)}

    @tenant_probe.get(
        "/probe/lead-only",
        dependencies=[tenant_permission(Permission.ROADMAPS_EDIT)],
    )
    def probe_lead_only(tenant: CurrentTenant) -> dict[str, str]:
        return {"tenantId": str(tenant.tenant_id)}

    @tenant_probe.post(
        "/probe/write",
        dependencies=[tenant_permission(Permission.MEMBERS_MANAGE)],
    )
    def probe_write(body: ProbeWriteBody, tenant: CurrentTenant) -> dict[str, str]:
        with tenant.open_session() as session:
            session.execute(
                text(f"INSERT INTO {PROBE_TABLE} (tenant_id) VALUES (:tenant_id)"),  # noqa: S608
                {"tenant_id": tenant.tenant_id},
            )
            session.commit()
        return {"tenantId": str(tenant.tenant_id), "label": body.label}

    probe.include_router(tenant_probe, prefix="/tenants/{tenantSlug}")
    app.include_router(probe)


@pytest.fixture
def authz_app(database_url: str, engine: Engine, sessions: sessionmaker[Session]) -> FastAPI:
    """The real app (plus D15 probe router) wired to the shared single-connection pool."""
    app = create_app(make_settings(database_url))
    app.state.engine.dispose()
    app.state.engine = engine
    app.state.sessions = sessions
    _add_probe_router(app)
    return app


def _set_principal(app: FastAPI, person_id: uuid.UUID | None) -> None:
    if person_id is None:
        app.dependency_overrides.pop(get_current_principal, None)
    else:
        principal = AuthenticatedPrincipal(person_id=person_id, session_id=SESSION_ID)
        app.dependency_overrides[get_current_principal] = lambda: principal


def _headers_for(method: str, person_id: uuid.UUID | None) -> dict[str, str]:
    headers: dict[str, str] = {}
    if method != "GET":
        headers.update(SAME_ORIGIN_HEADERS)
        if person_id is not None:
            headers[PERSON_ASSERTION_HEADER] = str(person_id)
    return headers


# ---------------------------------------------------------------------------
# Fail-closed call-spec registry (D15)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CallSpec:
    """How the standing matrix, sweeps and read-only GET suite call one route."""

    path_for: Callable[[str], str]
    json_body: dict[str, Any] | None = None


CALL_SPECS: Final[dict[tuple[str, str], CallSpec]] = {
    ("GET", "/health"): CallSpec(lambda _slug: "/health"),
    ("GET", "/ready"): CallSpec(lambda _slug: "/ready"),
    ("GET", "/api/v1/probe/public"): CallSpec(lambda _slug: "/api/v1/probe/public"),
    ("GET", "/api/v1/probe/signed-in"): CallSpec(lambda _slug: "/api/v1/probe/signed-in"),
    ("POST", "/api/v1/probe/signed-in"): CallSpec(lambda _slug: "/api/v1/probe/signed-in"),
    ("GET", "/api/v1/tenants/{tenantSlug}/probe/member"): CallSpec(
        lambda slug: f"/api/v1/tenants/{slug}/probe/member"
    ),
    ("GET", "/api/v1/tenants/{tenantSlug}/probe/tags"): CallSpec(
        lambda slug: f"/api/v1/tenants/{slug}/probe/tags"
    ),
    ("GET", "/api/v1/tenants/{tenantSlug}/probe/lead-only"): CallSpec(
        lambda slug: f"/api/v1/tenants/{slug}/probe/lead-only"
    ),
    ("POST", "/api/v1/tenants/{tenantSlug}/probe/write"): CallSpec(
        lambda slug: f"/api/v1/tenants/{slug}/probe/write",
        json_body={"label": "probe"},
    ),
}


def _discover_policy_routes(app: FastAPI) -> dict[tuple[str, str], RoutePolicy]:
    discovered: dict[tuple[str, str], RoutePolicy] = {}
    for ctx in iter_route_contexts(app.routes):
        original = ctx.original_route
        assert isinstance(original, PolicyAPIRoute)
        assert ctx.methods
        assert ctx.path_format
        for method in ctx.methods:
            discovered[(method, ctx.path_format)] = original.policy
    return discovered


def _assert_call_specs_cover_all_routes(
    discovered: dict[tuple[str, str], RoutePolicy],
    specs: dict[tuple[str, str], CallSpec],
) -> None:
    missing = set(discovered) - set(specs)
    extra = set(specs) - set(discovered)
    assert not missing, f"Routes missing from CALL_SPECS: {sorted(missing)}"
    assert not extra, f"Stale entries in CALL_SPECS: {sorted(extra)}"


def _expected_status(
    policy: RoutePolicy, *, role_key: ShippedRoleKey | None, signed_in_caller: bool
) -> int:
    if policy.kind is PolicyKind.PUBLIC:
        return 200
    if not signed_in_caller:
        return 401
    if policy.kind is PolicyKind.SIGNED_IN:
        return 200
    if role_key is None:
        return 404
    if policy.kind is PolicyKind.TENANT_MEMBER:
        return 200
    assert policy.permission is not None
    return 200 if policy.permission in SHIPPED_ROLES[role_key] else 403


def _authorised_person_for(policy: RoutePolicy, data: AuthzFixture) -> uuid.UUID:
    """Picks a seeded Tenant A person authorised to reach the handler for `policy`."""
    if policy.kind is PolicyKind.TENANT_PERMISSION:
        assert policy.permission is not None
        by_role = {
            ShippedRoleKey.ADMIN: data.admin_a,
            ShippedRoleKey.PRODUCT_LEAD: data.lead_a,
            ShippedRoleKey.VIEWER: data.viewer_a,
        }
        for role_key, person_id in by_role.items():
            if policy.permission in SHIPPED_ROLES[role_key]:
                return person_id
        pytest.fail(f"No shipped role holds {policy.permission}")
    return data.admin_a


# ---------------------------------------------------------------------------
# S3: tenant dependency, isolation, frozen context and pool hygiene
# ---------------------------------------------------------------------------


def test_tenant_dependency_scopes_session_and_isolates_roles_across_tenants(
    authz_app: FastAPI, authz_data: AuthzFixture
) -> None:
    with TestClient(authz_app) as client:
        # Active Admin of Tenant A receives scoped TenantContext and RLS settings.
        _set_principal(authz_app, authz_data.admin_a)
        res = client.get(f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/member")
        assert res.status_code == 200
        assert res.json() == {
            "tenantId": str(authz_data.tenant_a_id),
            "tenantSlug": authz_data.tenant_a_slug,
            "personId": str(authz_data.admin_a),
            "roleId": str(authz_data.roles_a[ShippedRoleKey.ADMIN]),
            "permissions": sorted(p.value for p in SHIPPED_ROLES[ShippedRoleKey.ADMIN]),
            "rlsTenant": str(authz_data.tenant_a_id),
            "rlsPerson": str(authz_data.admin_a),
        }

        # Multi-tenant person resolves Admin in Tenant A and Viewer in Tenant B.
        _set_principal(authz_app, authz_data.multi_ab)
        assert (
            client.get(f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/tags").status_code == 200
        )
        b_tags = client.get(f"/api/v1/tenants/{authz_data.tenant_b_slug}/probe/tags")
        assert (b_tags.status_code, b_tags.json()["code"]) == (403, "authz.forbidden")

        # Unknown and malformed slugs (including NUL bytes) return uniform 404, never 500.
        unknown = client.get("/api/v1/tenants/no-such-tenant/probe/member")
        assert (unknown.status_code, unknown.json()["code"]) == (404, "request.not_found")
        for bad_slug in ("%00", "Tenant-A", "a", "a" * 64):
            malformed = client.get(f"/api/v1/tenants/{bad_slug}/probe/member")
            assert (malformed.status_code, malformed.json()) == (404, unknown.json()), bad_slug

        _set_principal(authz_app, authz_data.admin_b)
        non_member = client.get(f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/member")
        assert non_member.json() == unknown.json()

        _set_principal(authz_app, authz_data.ended_a)
        ended = client.get(f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/member")
        assert ended.json() == unknown.json()


def test_tenant_context_is_frozen_and_never_leaks_rls_across_pooled_connections(
    authz_app: FastAPI, authz_data: AuthzFixture
) -> None:
    captured: list[Any] = []
    extra = APIRouter(route_class=PolicyAPIRoute)

    @extra.post("/probe/check-frozen", dependencies=[tenant_member()])
    def check_frozen(tenant: CurrentTenant) -> dict[str, str]:
        captured.append(tenant)
        with tenant.open_session() as session:
            session.execute(
                text(f"INSERT INTO {PROBE_TABLE} (tenant_id) VALUES (:tenant_id)"),  # noqa: S608
                {"tenant_id": tenant.tenant_id},
            )
            session.commit()
            # A second transaction on the same session retains tenant and person.
            second = session.execute(
                text(
                    "SELECT current_setting('app.tenant_id', true),"
                    " current_setting('app.person_id', true)"
                )
            ).one()
            assert second == (str(tenant.tenant_id), str(tenant.person_id))
        return {"status": "ok"}

    authz_app.include_router(extra, prefix="/api/v1/tenants/{tenantSlug}")

    _set_principal(authz_app, authz_data.admin_a)
    with TestClient(authz_app) as client:
        res = client.post(
            f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/check-frozen",
            headers=_headers_for("POST", authz_data.admin_a),
        )
        assert res.status_code == 200

    [tenant_ctx] = captured
    with pytest.raises(dataclasses.FrozenInstanceError):
        tenant_ctx.tenant_slug = "mutated"  # type: ignore[misc]

    # Next transaction on the single-connection pool sees empty tenant/person and zero rows.
    with authz_app.state.sessions() as session:
        assert session.execute(
            text(
                "SELECT current_setting('app.tenant_id', true),"
                " current_setting('app.person_id', true)"
            )
        ).one() == ("", "")
        assert list(session.scalars(text(f"SELECT tenant_id FROM {PROBE_TABLE}"))) == []  # noqa: S608


def test_tenant_dependency_fails_closed_if_route_lacks_tenant_slug(
    authz_app: FastAPI, authz_data: AuthzFixture
) -> None:
    @authz_app.get("/api/v1/probe/miswired-no-slug", dependencies=[tenant_member()])
    def miswired(tenant: CurrentTenant) -> dict[str, str]:
        return {"tenantId": str(tenant.tenant_id)}

    _set_principal(authz_app, authz_data.admin_a)
    with TestClient(authz_app) as client:
        res = client.get("/api/v1/probe/miswired-no-slug")

    assert (res.status_code, res.json()["code"]) == (404, "request.not_found")


def test_d9_db_evaluation_order_runs_tenant_and_permission_checks_before_body_validation(
    authz_app: FastAPI, authz_data: AuthzFixture
) -> None:
    url = f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/write"
    bad_body = {"unexpectedField": 1}

    with TestClient(authz_app) as client:
        # Non-member with invalid body -> 404 before 422.
        _set_principal(authz_app, authz_data.admin_b)
        res = client.post(url, headers=_headers_for("POST", authz_data.admin_b), json=bad_body)
        assert (res.status_code, res.json()["code"]) == (404, "request.not_found")

        # Member lacking permission with invalid body -> 403 before 422.
        _set_principal(authz_app, authz_data.viewer_a)
        res = client.post(url, headers=_headers_for("POST", authz_data.viewer_a), json=bad_body)
        assert (res.status_code, res.json()["code"]) == (403, "authz.forbidden")

        # Authorised Admin wiring check: invalid body reaches 422, valid body succeeds.
        _set_principal(authz_app, authz_data.admin_a)
        res = client.post(url, headers=_headers_for("POST", authz_data.admin_a), json=bad_body)
        assert (res.status_code, res.json()["code"]) == (422, "request.invalid")
        res = client.post(
            url, headers=_headers_for("POST", authz_data.admin_a), json={"label": "ok"}
        )
        assert res.status_code == 200


# ---------------------------------------------------------------------------
# S2 (DB): unknown permission fails closed and logs IDs only (D11)
# ---------------------------------------------------------------------------


def test_unknown_permission_in_role_fails_closed_without_logging_raw_value(
    authz_app: FastAPI,
    authz_data: AuthzFixture,
    worker_admin: psycopg.Connection,
    lines: Lines,
) -> None:
    unknown_permission = "future:planted-secret"
    # Insert a valid-format unknown permission onto Tenant A's Viewer role (D1).
    with (
        worker_admin.transaction(),
        _access_change_set(worker_admin, authz_data.tenant_a_id, "unknown-perm"),
    ):
        worker_admin.execute(
            "INSERT INTO role_permissions (tenant_id, role_id, permission) VALUES (%s, %s, %s)",
            (authz_data.tenant_a_id, authz_data.roles_a[ShippedRoleKey.VIEWER], unknown_permission),
        )

    with TestClient(authz_app) as client:
        _set_principal(authz_app, authz_data.viewer_a)
        # Fails closed on BOTH tenant_member and tenant_permission routes (D11).
        member_res = client.get(f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/member")
        perm_res = client.get(f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/tags")
        assert (member_res.status_code, member_res.json()["code"]) == (403, "authz.forbidden")
        assert (perm_res.status_code, perm_res.json()["code"]) == (403, "authz.forbidden")
        assert unknown_permission not in member_res.text
        assert unknown_permission not in perm_res.text

        # Other roles in the same tenant and other tenants are unaffected.
        _set_principal(authz_app, authz_data.lead_a)
        assert (
            client.get(f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/tags").status_code == 200
        )
        _set_principal(authz_app, authz_data.admin_b)
        assert (
            client.get(f"/api/v1/tenants/{authz_data.tenant_b_slug}/probe/member").status_code
            == 200
        )

    all_lines = lines.read()
    assert unknown_permission not in str(all_lines)
    unknown_events = [
        line for line in all_lines if line.get("message") == "authz.unknown_permission"
    ]
    assert len(unknown_events) == 2
    for event_line in unknown_events:
        assert event_line["level"] == "error"
        assert event_line["tenant_id"] == str(authz_data.tenant_a_id)
        assert event_line["role_id"] == str(authz_data.roles_a[ShippedRoleKey.VIEWER])
        assert event_line["code"] == "authz.forbidden"


# ---------------------------------------------------------------------------
# S5: generated role-by-route matrix, non-GET same-origin sweep & cross-tenant sweep
# ---------------------------------------------------------------------------


def test_call_specs_registry_is_fail_closed_for_unregistered_routes(authz_app: FastAPI) -> None:
    discovered = _discover_policy_routes(authz_app)
    _assert_call_specs_cover_all_routes(discovered, CALL_SPECS)

    # Adding an uncatalogued route fails the completeness check immediately.
    @authz_app.get("/api/v1/probe/uncatalogued", dependencies=[signed_in()])
    def uncatalogued() -> dict[str, str]:
        return {"status": "ok"}

    with pytest.raises(AssertionError, match="uncatalogued"):
        _assert_call_specs_cover_all_routes(_discover_policy_routes(authz_app), CALL_SPECS)


def test_generated_role_by_route_matrix_exercises_every_route_and_principal(
    authz_app: FastAPI, authz_data: AuthzFixture
) -> None:
    discovered = _discover_policy_routes(authz_app)
    _assert_call_specs_cover_all_routes(discovered, CALL_SPECS)

    principals: list[tuple[str, uuid.UUID | None, ShippedRoleKey | None]] = [
        ("admin", authz_data.admin_a, ShippedRoleKey.ADMIN),
        ("product_lead", authz_data.lead_a, ShippedRoleKey.PRODUCT_LEAD),
        ("viewer", authz_data.viewer_a, ShippedRoleKey.VIEWER),
        ("ended_member", authz_data.ended_a, None),
        ("demoted_viewer", authz_data.demoted_a, ShippedRoleKey.VIEWER),
        ("non_member", authz_data.admin_b, None),
        ("anonymous", None, None),
    ]

    with TestClient(authz_app) as client:
        for (method, template), policy in sorted(discovered.items()):
            spec = CALL_SPECS[(method, template)]
            path = spec.path_for(authz_data.tenant_a_slug)
            for label, person_id, role_key in principals:
                _set_principal(authz_app, person_id)
                expected = _expected_status(
                    policy,
                    role_key=role_key,
                    signed_in_caller=person_id is not None,
                )
                response = client.request(
                    method,
                    path,
                    headers=_headers_for(method, person_id),
                    json=spec.json_body,
                )
                assert response.status_code == expected, (
                    f"{method} {template} as {label}: expected {expected}, "
                    f"got {response.status_code} ({response.text})"
                )
                if expected == 401:
                    assert response.json()["code"] == "auth.unauthenticated"
                elif expected == 403:
                    assert response.json()["code"] == "authz.forbidden"
                elif expected == 404:
                    assert response.json()["code"] == "request.not_found"


def test_every_non_get_route_refuses_missing_same_origin_proof(
    authz_app: FastAPI, authz_data: AuthzFixture
) -> None:
    discovered = _discover_policy_routes(authz_app)
    _assert_call_specs_cover_all_routes(discovered, CALL_SPECS)
    write_routes = [(m, t) for (m, t) in sorted(discovered) if m != "GET"]
    assert write_routes

    _set_principal(authz_app, authz_data.admin_a)
    with TestClient(authz_app) as client:
        for method, template in write_routes:
            spec = CALL_SPECS[(method, template)]
            response = client.request(
                method,
                spec.path_for(authz_data.tenant_a_slug),
                headers={PERSON_ASSERTION_HEADER: str(authz_data.admin_a)},
                json=spec.json_body,
            )
            assert (response.status_code, response.json()["code"]) == (
                403,
                "request.origin_not_allowed",
            )


def test_cross_tenant_sweep_returns_404_and_changes_nothing(
    authz_app: FastAPI, authz_data: AuthzFixture, worker_admin: psycopg.Connection
) -> None:
    discovered = _discover_policy_routes(authz_app)
    _assert_call_specs_cover_all_routes(discovered, CALL_SPECS)
    tenant_routes = [
        (method, template)
        for (method, template), policy in sorted(discovered.items())
        if policy.kind in {PolicyKind.TENANT_MEMBER, PolicyKind.TENANT_PERMISSION}
    ]
    assert tenant_routes

    count_sql = f"SELECT count(*) FROM {PROBE_TABLE}".encode()  # noqa: S608 - harness constant
    before_count = worker_admin.execute(count_sql).fetchone()
    assert before_count is not None

    _set_principal(authz_app, authz_data.admin_b)
    with TestClient(authz_app) as client:
        for method, template in tenant_routes:
            spec = CALL_SPECS[(method, template)]
            response = client.request(
                method,
                spec.path_for(authz_data.tenant_a_slug),
                headers=_headers_for(method, authz_data.admin_b),
                json=spec.json_body,
            )
            assert (response.status_code, response.json()["code"]) == (404, "request.not_found")

    after_count = worker_admin.execute(count_sql).fetchone()
    assert after_count == before_count


# ---------------------------------------------------------------------------
# S4: standing read-only GET guarantee (D4, D15)
# ---------------------------------------------------------------------------


class _WriteTracker:
    """Detects every DB write during a GET: DML, writable CTEs and definer/trigger writes.

    Pairs SQL statement classification (catching zero-row DML attempts) with PostgreSQL's
    native `pg_current_xact_id_if_assigned()` checked on a separate DBAPI cursor after
    each statement (catching any write hidden inside a `SECURITY DEFINER` routine, trigger
    or CTE).
    """

    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        self.bookkeeping: list[str] = []
        self.domain_writes: list[str] = []
        self._tx_xid: int | None = None

    def clear(self) -> None:
        self.bookkeeping.clear()
        self.domain_writes.clear()
        self._tx_xid = None

    def _on_begin(self, _conn: Connection) -> None:
        self._tx_xid = None

    def _on_end(self, _conn: Connection) -> None:
        self._tx_xid = None

    def _on_after_execute(
        self,
        conn: Connection,
        _cursor: object,
        statement: str,
        _parameters: object,
        _context: object,
        _executemany: bool,  # noqa: FBT001 - SQLAlchemy event hook signature
    ) -> None:
        xid_assigned_now = False
        raw_conn = conn.connection.dbapi_connection
        assert raw_conn is not None
        probe = raw_conn.cursor()
        try:
            probe.execute("SELECT pg_current_xact_id_if_assigned()")
            row = probe.fetchone()
            xid = row[0] if row is not None else None
        finally:
            probe.close()
        if xid is not None and self._tx_xid is None:
            self._tx_xid = xid
            xid_assigned_now = True

        if any(pattern.search(statement) for pattern in SESSION_BOOKKEEPING_PATTERNS):
            self.bookkeeping.append(statement)
        elif xid_assigned_now or WRITE_SQL_PATTERN.search(statement):
            self.domain_writes.append(statement)

    def __enter__(self) -> Self:
        event.listen(self._engine, "begin", self._on_begin)
        event.listen(self._engine, "commit", self._on_end)
        event.listen(self._engine, "rollback", self._on_end)
        event.listen(self._engine, "after_cursor_execute", self._on_after_execute)
        return self

    def __exit__(self, *_exc: object) -> None:
        event.remove(self._engine, "after_cursor_execute", self._on_after_execute)
        event.remove(self._engine, "rollback", self._on_end)
        event.remove(self._engine, "commit", self._on_end)
        event.remove(self._engine, "begin", self._on_begin)


def test_every_non_exempt_get_route_makes_no_domain_write_and_cross_site_writes_nothing(
    authz_app: FastAPI, authz_data: AuthzFixture
) -> None:
    discovered = _discover_policy_routes(authz_app)
    get_routes = [
        (method, template)
        for (method, template) in sorted(discovered)
        if method == "GET" and template not in READ_ONLY_GET_EXEMPTIONS
    ]
    assert get_routes
    missing = set(get_routes) - set(CALL_SPECS)
    assert not missing, f"GET routes missing from CALL_SPECS: {sorted(missing)}"

    with _WriteTracker(authz_app.state.engine) as tracker, TestClient(authz_app) as client:
        for method, template in get_routes:
            policy = discovered[(method, template)]
            _set_principal(authz_app, _authorised_person_for(policy, authz_data))
            path = CALL_SPECS[(method, template)].path_for(authz_data.tenant_a_slug)

            for site_header in ("same-origin", None, "same-site", "cross-site"):
                tracker.clear()
                headers = {"Sec-Fetch-Site": site_header} if site_header is not None else {}
                response = client.get(path, headers=headers)
                assert response.status_code == 200, f"{template} ({site_header})"
                assert tracker.domain_writes == [], (
                    f"GET {template} executed writes: {tracker.domain_writes}"
                )
                if site_header in {"same-site", "cross-site"}:
                    assert tracker.bookkeeping == [], (
                        f"{site_header} GET {template} wrote session bookkeeping: "
                        f"{tracker.bookkeeping}"
                    )


def _write_plain_insert(tenant: CurrentTenant) -> None:
    with tenant.open_session() as session:
        session.execute(
            text(f"INSERT INTO {PROBE_TABLE} (tenant_id) VALUES (:tenant_id)"),  # noqa: S608
            {"tenant_id": tenant.tenant_id},
        )
        session.commit()


def _write_cte(tenant: CurrentTenant) -> None:
    with tenant.open_session() as session:
        session.execute(
            text(
                f"WITH inserted AS (INSERT INTO {PROBE_TABLE} (tenant_id)"  # noqa: S608
                " VALUES (:tenant_id) RETURNING tenant_id)"
                " SELECT tenant_id FROM inserted"
            ),
            {"tenant_id": tenant.tenant_id},
        )
        session.commit()


def _write_definer_select(tenant: CurrentTenant) -> None:
    with tenant.open_session() as session:
        repo = AccessChangeSetRepository(session, tenant.tenant_id)
        opened = repo.open(
            idempotency_key="bad-get-definer",
            request_hash=hashlib.sha256(b"bad-get-definer").digest(),
        )
        repo.sign_off(opened.change_set_id)
        session.commit()


MUTATING_GET_WRITES: dict[str, Callable[[CurrentTenant], None]] = {
    "plain INSERT": _write_plain_insert,
    "writable CTE (WITH ... INSERT ... SELECT)": _write_cte,
    "mutating SECURITY DEFINER SELECT": _write_definer_select,
}


@pytest.mark.parametrize("do_write", MUTATING_GET_WRITES.values(), ids=MUTATING_GET_WRITES)
def test_read_only_get_detector_catches_every_write_kind(
    authz_app: FastAPI,
    authz_data: AuthzFixture,
    do_write: Callable[[CurrentTenant], None],
) -> None:
    rogue = APIRouter(route_class=PolicyAPIRoute)

    @rogue.get("/probe/bad-get", dependencies=[tenant_member()])
    def bad_get(tenant: CurrentTenant) -> dict[str, str]:
        do_write(tenant)
        return {"status": "ok"}

    authz_app.include_router(rogue, prefix="/api/v1/tenants/{tenantSlug}")

    with _WriteTracker(authz_app.state.engine) as tracker, TestClient(authz_app) as client:
        _set_principal(authz_app, authz_data.admin_a)
        res = client.get(f"/api/v1/tenants/{authz_data.tenant_a_slug}/probe/bad-get")
        assert res.status_code == 200
        assert len(tracker.domain_writes) >= 1
