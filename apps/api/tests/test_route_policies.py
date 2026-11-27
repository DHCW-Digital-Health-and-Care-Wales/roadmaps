"""S1 and S4: fail-closed route policies, same-origin proof, JSON guard and person assertion.

Covers startup route verification (`verify_app_routes`), `PolicyAPIRoute` registration checks,
same-origin and media-type rules (D6-D8), person-assertion (D5) and D9's fixed evaluation
order before DB-backed tenant resolution.
"""

from collections.abc import Callable, Iterator
from typing import cast
from uuid import UUID

import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.responses import PlainTextResponse
from fastapi.routing import APIRoute, iter_route_contexts
from fastapi.testclient import TestClient
from starlette.routing import BaseRoute, Route

from roadmaps_api.app import create_app
from roadmaps_api.authz import (
    LOCAL_OPENAPI_ROUTES,
    PERSON_ASSERTION_HEADER,
    PUBLIC_ROUTES,
    AuthenticatedPrincipal,
    CurrentPrincipal,
    PolicyAPIRoute,
    PolicyKind,
    RoutePolicy,
    RoutePolicyError,
    get_current_principal,
    public,
    signed_in,
    tenant_member,
    tenant_permission,
    verify_app_routes,
)
from roadmaps_api.authz.permissions import Permission
from roadmaps_api.authz.policies import POLICY_ATTR
from roadmaps_api.settings import MAX_BODY_BYTES, Environment
from roadmaps_api.wire import ApiRequestModel
from tests.support import PLANTED, TEST_EDITOR_ORIGIN, make_settings

PERSON_A = UUID("01950000-0000-7000-8000-000000000001")
PERSON_B = UUID("01950000-0000-7000-8000-000000000002")
SESSION_A = UUID("01950000-0000-7000-8000-000000000099")


class Payload(ApiRequestModel):
    title: str


# ---------------------------------------------------------------------------
# S1: default-deny route registration and startup verification
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("environment", "expected_public"),
    [
        (Environment.PRODUCTION, PUBLIC_ROUTES),
        (Environment.TEST, PUBLIC_ROUTES),
        (Environment.LOCAL, PUBLIC_ROUTES | LOCAL_OPENAPI_ROUTES),
    ],
)
def test_every_route_on_create_app_is_classified_and_public_routes_match_allow_list(
    environment: Environment, expected_public: frozenset[tuple[str, str]]
) -> None:
    app = create_app(make_settings(environment=environment))

    verify_app_routes(app)
    assert list(app.router._iter_low_priority_routes()) == []  # noqa: SLF001 - D10

    discovered_public: set[tuple[str, str]] = set()
    for ctx in iter_route_contexts(app.routes):
        original = ctx.original_route
        assert ctx.methods
        assert ctx.path_format
        if isinstance(original, PolicyAPIRoute):
            if original.policy.kind is PolicyKind.PUBLIC:
                for method in ctx.methods:
                    discovered_public.add((method, ctx.path_format))
        else:
            assert type(original) is Route
            for method in ctx.methods:
                discovered_public.add((method, ctx.path_format))

    assert discovered_public == expected_public


def test_policy_api_route_refuses_missing_duplicate_or_invalid_policy() -> None:
    router = APIRouter(route_class=PolicyAPIRoute)

    with pytest.raises(RoutePolicyError, match="exactly one policy"):

        @router.get("/unclassified")
        def unclassified() -> dict[str, str]:
            return {"status": "ok"}

    with pytest.raises(RoutePolicyError, match="exactly one policy"):

        @router.get("/duplicate", dependencies=[public(), signed_in()])
        def duplicate() -> dict[str, str]:
            return {"status": "ok"}

    with pytest.raises(RoutePolicyError, match="exactly one policy"):

        @router.get("/same-duplicate", dependencies=[public(), public()])
        def same_duplicate() -> dict[str, str]:
            return {"status": "ok"}

    with pytest.raises(RoutePolicyError, match="Permission"):
        tenant_permission(cast("Permission", Permission.LISTS_EDIT.value))

    with pytest.raises(RoutePolicyError, match="Permission"):
        RoutePolicy(PolicyKind.TENANT_PERMISSION, permission=None)

    with pytest.raises(RoutePolicyError, match="must not specify"):
        RoutePolicy(PolicyKind.PUBLIC, permission=Permission.LISTS_EDIT)

    def bogus_dep() -> None:
        return None

    setattr(bogus_dep, POLICY_ATTR, "not-a-policy")
    with pytest.raises(RoutePolicyError, match="Invalid route policy"):

        @router.get("/bogus", dependencies=[Depends(bogus_dep)])
        def bogus() -> dict[str, str]:
            return {"status": "ok"}


@pytest.mark.parametrize(
    "bad_methods",
    [[], ["HEAD"], ["OPTIONS"], ["GET", "HEAD"], ["TRACE"]],
    ids=["empty methods", "HEAD", "OPTIONS", "GET and HEAD", "TRACE"],
)
def test_policy_api_route_refuses_empty_or_disallowed_methods(bad_methods: list[str]) -> None:
    router = APIRouter(route_class=PolicyAPIRoute)

    with pytest.raises(RoutePolicyError, match="method"):
        router.add_api_route(
            "/bad-methods",
            lambda: {"ok": True},
            methods=bad_methods,
            operation_id="bad_methods",
            dependencies=[public()],
        )


def test_policy_api_route_defaults_omitted_methods_to_get() -> None:
    router = APIRouter(route_class=PolicyAPIRoute)
    router.add_api_route("/default-get", lambda: {"ok": True}, dependencies=[signed_in()])

    [route] = router.routes
    assert isinstance(route, PolicyAPIRoute)
    assert route.methods == {"GET"}


def test_tenant_route_with_include_time_tenant_slug_prefix_passes_verify() -> None:
    app = create_app(make_settings())
    sub = APIRouter(route_class=PolicyAPIRoute)

    @sub.get("/items", dependencies=[tenant_member()])
    def list_items() -> dict[str, str]:
        return {"status": "ok"}

    @sub.post("/items", dependencies=[tenant_permission(Permission.LISTS_EDIT)])
    def create_item() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(sub, prefix="/api/v1/tenants/{tenantSlug}")

    verify_app_routes(app)


def _add_unapproved_public(app: FastAPI) -> None:
    @app.get("/api/v1/rogue-public", dependencies=[public()])
    def rogue_public() -> dict[str, str]:
        return {"ok": "no"}


def _add_tenant_without_slug(app: FastAPI) -> None:
    @app.get("/api/v1/no-slug", dependencies=[tenant_member()])
    def no_slug() -> dict[str, str]:
        return {"ok": "no"}


def _add_permission_without_slug(app: FastAPI) -> None:
    @app.get("/api/v1/no-slug-perm", dependencies=[tenant_permission(Permission.LISTS_EDIT)])
    def no_slug_perm() -> dict[str, str]:
        return {"ok": "no"}


def _add_include_duplicate_policy(app: FastAPI) -> None:
    sub = APIRouter(route_class=PolicyAPIRoute)

    @sub.get("/dup", dependencies=[signed_in()])
    def dup() -> dict[str, str]:
        return {"ok": "no"}

    app.include_router(sub, prefix="/api/v1", dependencies=[public()])


def _add_mutated_empty_methods(app: FastAPI) -> None:
    @app.get("/api/v1/mutated", dependencies=[signed_in()])
    def mutated() -> dict[str, str]:
        return {"ok": "no"}

    route = app.routes[-1]
    assert isinstance(route, PolicyAPIRoute)
    route.methods = set()


def _add_plain_api_route(app: FastAPI) -> None:
    app.router.routes.append(APIRoute("/api/v1/plain", lambda: {"ok": "no"}, methods=["GET"]))


def _add_mount(app: FastAPI) -> None:
    app.mount("/mounted", FastAPI())


def _add_host(app: FastAPI) -> None:
    app.host("other.example", FastAPI())


def _add_app_frontend(app: FastAPI) -> None:
    app.frontend("/ui", directory="/tmp", check_dir=False)  # noqa: S108 - check_dir=False


def _add_nested_frontend(app: FastAPI) -> None:
    sub = APIRouter(route_class=PolicyAPIRoute)
    sub.frontend("/nested-ui", directory="/tmp", check_dir=False)  # noqa: S108 - check_dir=False
    app.include_router(sub, prefix="/sub")


def _add_websocket(app: FastAPI) -> None:
    @app.websocket("/ws")
    async def ws() -> None:
        return None


def _add_plain_route_methods_none(app: FastAPI) -> None:
    route = Route("/health", PlainTextResponse("ok"), methods=None)
    assert route.methods is None
    app.router.routes.append(route)


def _add_plain_route_methods_empty(app: FastAPI) -> None:
    route = Route("/health", lambda _req: PlainTextResponse("ok"), methods=[])
    assert route.methods == set()
    app.router.routes.append(route)


def _add_plain_route_unlisted_method_or_path(app: FastAPI) -> None:
    # Plain Starlette Route for /api/v1/openapi.json in production (serves_live_openapi=False).
    app.router.routes.append(
        Route("/api/v1/openapi.json", lambda _req: PlainTextResponse("{}"), methods=["GET"])
    )


def _add_custom_base_route(app: FastAPI) -> None:
    class RogueRoute(BaseRoute):
        pass

    app.router.routes.append(RogueRoute())


ILLICIT_ROUTES: dict[str, Callable[[FastAPI], None]] = {
    "an unapproved public PolicyAPIRoute": _add_unapproved_public,
    "a tenant_member route without {tenantSlug}": _add_tenant_without_slug,
    "a tenant_permission route without {tenantSlug}": _add_permission_without_slug,
    "a router inclusion adding a duplicate policy": _add_include_duplicate_policy,
    "a PolicyAPIRoute mutated to methods=[]": _add_mutated_empty_methods,
    "a plain FastAPI APIRoute": _add_plain_api_route,
    "a mounted ASGI app": _add_mount,
    "a Host route": _add_host,
    "app.frontend()": _add_app_frontend,
    "a nested router frontend()": _add_nested_frontend,
    "a WebSocketRoute": _add_websocket,
    "a plain Starlette Route with methods=None": _add_plain_route_methods_none,
    "a plain Starlette Route with methods=[]": _add_plain_route_methods_empty,
    "a plain Starlette Route for openapi.json when live OpenAPI is off": (
        _add_plain_route_unlisted_method_or_path
    ),
    "an unknown BaseRoute subclass": _add_custom_base_route,
}


@pytest.mark.parametrize("tamper", ILLICIT_ROUTES.values(), ids=ILLICIT_ROUTES)
def test_verify_app_routes_refuses_every_illicit_route(
    tamper: Callable[[FastAPI], None],
) -> None:
    app = create_app(make_settings())
    tamper(app)

    with pytest.raises(RoutePolicyError):
        verify_app_routes(app)


# ---------------------------------------------------------------------------
# S4: same-origin proof, JSON media type, person assertion and D9 ordering
# ---------------------------------------------------------------------------


def _build_guard_app(*, principal: AuthenticatedPrincipal | None = None) -> FastAPI:
    app = create_app(make_settings())
    router = APIRouter(prefix="/test-guard", route_class=PolicyAPIRoute)

    @router.post("/public-body", dependencies=[public()])
    def public_body(body: Payload) -> dict[str, str]:
        return {"title": body.title}

    @router.post("/public-empty", dependencies=[public()])
    def public_empty() -> dict[str, str]:
        return {"status": "ok"}

    @router.delete("/public-delete", dependencies=[public()])
    def public_delete() -> dict[str, str]:
        return {"status": "ok"}

    @router.get("/signed-in", dependencies=[signed_in()])
    def signed_in_get(current: CurrentPrincipal) -> dict[str, str]:
        return {"personId": str(current.person_id)}

    @router.post("/signed-in-body", dependencies=[signed_in()])
    def signed_in_body(body: Payload, current: CurrentPrincipal) -> dict[str, str]:
        return {"personId": str(current.person_id), "title": body.title}

    @router.put("/signed-in-empty", dependencies=[signed_in()])
    def signed_in_empty(current: CurrentPrincipal) -> dict[str, str]:
        return {"personId": str(current.person_id)}

    @router.patch("/signed-in-patch", dependencies=[signed_in()])
    def signed_in_patch(body: Payload, current: CurrentPrincipal) -> dict[str, str]:
        return {"personId": str(current.person_id), "title": body.title}

    app.include_router(router)
    if principal is not None:
        app.dependency_overrides[get_current_principal] = lambda: principal
    return app


ORIGIN_CASES: dict[str, tuple[list[tuple[str, str]], int]] = {
    "Sec-Fetch-Site: same-origin without Origin": ([("Sec-Fetch-Site", "same-origin")], 200),
    "Sec-Fetch-Site: same-origin with matching Origin": (
        [("Sec-Fetch-Site", "same-origin"), ("Origin", TEST_EDITOR_ORIGIN)],
        200,
    ),
    "absent Sec-Fetch-Site with matching Origin": ([("Origin", TEST_EDITOR_ORIGIN)], 200),
    "neither Sec-Fetch-Site nor Origin": ([], 403),
    "Sec-Fetch-Site: cross-site even with matching Origin": (
        [("Sec-Fetch-Site", "cross-site"), ("Origin", TEST_EDITOR_ORIGIN)],
        403,
    ),
    "Sec-Fetch-Site: same-site even with matching Origin": (
        [("Sec-Fetch-Site", "same-site"), ("Origin", TEST_EDITOR_ORIGIN)],
        403,
    ),
    "Sec-Fetch-Site: none even with matching Origin": (
        [("Sec-Fetch-Site", "none"), ("Origin", TEST_EDITOR_ORIGIN)],
        403,
    ),
    "Sec-Fetch-Site: SAME-ORIGIN uppercase": ([("Sec-Fetch-Site", "SAME-ORIGIN")], 403),
    "Sec-Fetch-Site: same-origin with wrong Origin": (
        [("Sec-Fetch-Site", "same-origin"), ("Origin", "https://evil.example")],
        403,
    ),
    "Sec-Fetch-Site: same-origin with null Origin": (
        [("Sec-Fetch-Site", "same-origin"), ("Origin", "null")],
        403,
    ),
    "absent Sec-Fetch-Site with wrong Origin": ([("Origin", "https://evil.example")], 403),
    "absent Sec-Fetch-Site with null Origin": ([("Origin", "null")], 403),
    "duplicate Sec-Fetch-Site headers": (
        [("Sec-Fetch-Site", "same-origin"), ("Sec-Fetch-Site", "same-origin")],
        403,
    ),
    "duplicate Origin headers": (
        [("Origin", TEST_EDITOR_ORIGIN), ("Origin", TEST_EDITOR_ORIGIN)],
        403,
    ),
}


@pytest.mark.parametrize(("headers", "expected"), ORIGIN_CASES.values(), ids=ORIGIN_CASES)
def test_same_origin_guard_on_state_changing_routes(
    headers: list[tuple[str, str]], expected: int
) -> None:
    with TestClient(_build_guard_app()) as client:
        response = client.post("/test-guard/public-empty", headers=headers)

    assert response.status_code == expected
    if expected == 403:
        assert response.json()["code"] == "request.origin_not_allowed"


BODY_MEDIA_CASES: dict[str, tuple[list[tuple[str, str]], bytes, int]] = {
    "application/json": ([("Content-Type", "application/json")], b'{"title":"a"}', 200),
    "application/json with charset": (
        [("Content-Type", "application/json; charset=utf-8")],
        b'{"title":"a"}',
        200,
    ),
    "APPLICATION/JSON uppercase with params": (
        [("Content-Type", "APPLICATION/JSON; charset=UTF-8")],
        b'{"title":"a"}',
        200,
    ),
    "missing Content-Type on body route": ([], b'{"title":"a"}', 415),
    "empty Content-Type on body route": ([("Content-Type", "")], b'{"title":"a"}', 415),
    "text/plain": ([("Content-Type", "text/plain")], b'{"title":"a"}', 415),
    "application/x-www-form-urlencoded": (
        [("Content-Type", "application/x-www-form-urlencoded")],
        b"title=a",
        415,
    ),
    "multipart/form-data": (
        [("Content-Type", "multipart/form-data; boundary=x")],
        b"--x--",
        415,
    ),
    "application/problem+json": (
        [("Content-Type", "application/problem+json")],
        b'{"title":"a"}',
        415,
    ),
    "duplicate Content-Type": (
        [("Content-Type", "application/json"), ("Content-Type", "application/json")],
        b'{"title":"a"}',
        415,
    ),
}


@pytest.mark.parametrize(
    ("headers", "body", "expected"), BODY_MEDIA_CASES.values(), ids=BODY_MEDIA_CASES
)
def test_json_media_type_guard_on_body_routes(
    headers: list[tuple[str, str]], body: bytes, expected: int
) -> None:
    with TestClient(_build_guard_app()) as client:
        response = client.post(
            "/test-guard/public-body",
            headers=[("Sec-Fetch-Site", "same-origin"), *headers],
            content=body,
        )

    assert response.status_code == expected
    if expected == 415:
        assert response.json()["code"] == "request.unsupported_media_type"


BODYLESS_MEDIA_CASES: dict[
    str, tuple[str, list[tuple[str, str]], bytes | Iterator[bytes] | None, int]
] = {
    "POST without Content-Type or body": ("POST", [], None, 200),
    "DELETE without Content-Type or body": ("DELETE", [], None, 200),
    "POST with Content-Length: 0 and no Content-Type": (
        "POST",
        [("Content-Length", "0")],
        b"",
        200,
    ),
    "POST with application/json": ("POST", [("Content-Type", "application/json")], b"", 200),
    "POST with text/plain and empty body": ("POST", [("Content-Type", "text/plain")], b"", 415),
    "POST with form content-type and empty body": (
        "POST",
        [("Content-Type", "application/x-www-form-urlencoded")],
        b"",
        415,
    ),
    "POST with multipart content-type and empty body": (
        "POST",
        [("Content-Type", "multipart/form-data; boundary=a")],
        b"",
        415,
    ),
    "POST with non-zero body and no Content-Type": ("POST", [], b"hello", 415),
    "POST with chunked stream and no Content-Type": ("POST", [], iter([b"x"]), 415),
    "POST with duplicate Content-Length and no Content-Type": (
        "POST",
        [("Content-Length", "0"), ("Content-Length", "0")],
        b"",
        415,
    ),
}


@pytest.mark.parametrize(
    ("method", "headers", "content", "expected"),
    BODYLESS_MEDIA_CASES.values(),
    ids=BODYLESS_MEDIA_CASES,
)
def test_json_media_type_guard_on_bodyless_routes(
    method: str,
    headers: list[tuple[str, str]],
    content: bytes | Iterator[bytes] | None,
    expected: int,
) -> None:
    path = "/test-guard/public-delete" if method == "DELETE" else "/test-guard/public-empty"
    with TestClient(_build_guard_app()) as client:
        response = client.request(
            method,
            path,
            headers=[("Sec-Fetch-Site", "same-origin"), *headers],
            content=content,
        )

    assert response.status_code == expected
    if expected == 415:
        assert response.json()["code"] == "request.unsupported_media_type"


PERSON_HEADER_CASES: dict[str, tuple[list[tuple[str, str]], int]] = {
    "matching UUID": ([(PERSON_ASSERTION_HEADER, str(PERSON_A))], 200),
    "matching uppercase UUID": ([(PERSON_ASSERTION_HEADER, str(PERSON_A).upper())], 200),
    "missing header": ([], 409),
    "empty header": ([(PERSON_ASSERTION_HEADER, "")], 409),
    "malformed UUID": ([(PERSON_ASSERTION_HEADER, PLANTED)], 409),
    "non-canonical 32-hex UUID": ([(PERSON_ASSERTION_HEADER, PERSON_A.hex)], 409),
    "different person UUID": ([(PERSON_ASSERTION_HEADER, str(PERSON_B))], 409),
    "duplicate header": (
        [(PERSON_ASSERTION_HEADER, str(PERSON_A)), (PERSON_ASSERTION_HEADER, str(PERSON_A))],
        409,
    ),
}


@pytest.mark.parametrize(
    ("extra_headers", "expected"), PERSON_HEADER_CASES.values(), ids=PERSON_HEADER_CASES
)
def test_person_assertion_header_on_authenticated_state_changing_routes(
    extra_headers: list[tuple[str, str]], expected: int
) -> None:
    principal = AuthenticatedPrincipal(person_id=PERSON_A, session_id=SESSION_A)
    with TestClient(_build_guard_app(principal=principal)) as client:
        response = client.put(
            "/test-guard/signed-in-empty",
            headers=[("Sec-Fetch-Site", "same-origin"), *extra_headers],
        )

    assert response.status_code == expected
    if expected == 409:
        assert response.json()["code"] == "auth.person_mismatch"
        assert PLANTED not in response.text


def test_safe_get_and_public_post_ignore_person_assertion_header() -> None:
    principal = AuthenticatedPrincipal(person_id=PERSON_A, session_id=SESSION_A)
    with TestClient(_build_guard_app(principal=principal)) as client:
        # GET signed_in ignores missing or disagreeing person-assertion header and origin.
        assert client.get("/test-guard/signed-in").status_code == 200
        assert (
            client.get(
                "/test-guard/signed-in",
                headers={PERSON_ASSERTION_HEADER: str(PERSON_B), "Sec-Fetch-Site": "cross-site"},
            ).status_code
            == 200
        )
        # Public POST ignores missing or disagreeing person-assertion header.
        assert (
            client.post(
                "/test-guard/public-empty",
                headers={"Sec-Fetch-Site": "same-origin", PERSON_ASSERTION_HEADER: str(PERSON_B)},
            ).status_code
            == 200
        )


def test_d9_evaluation_order_on_authenticated_body_route() -> None:
    # 1. Declared Content-Length above limit answers 413 even without same-origin/JSON.
    with TestClient(_build_guard_app()) as anon:
        too_big = anon.patch(
            "/test-guard/signed-in-patch",
            content=b"x" * (MAX_BODY_BYTES + 1),
        )
        assert too_big.status_code == 413

        # 2. Bad origin beats bad content-type and unauthenticated -> 403 origin_not_allowed.
        bad_origin = anon.patch(
            "/test-guard/signed-in-patch",
            headers={"Content-Type": "text/plain"},
            content=b"not-json",
        )
        assert (bad_origin.status_code, bad_origin.json()["code"]) == (
            403,
            "request.origin_not_allowed",
        )

        # 3. Valid origin + bad content-type beats invalid JSON and auth -> 415.
        bad_ct = anon.patch(
            "/test-guard/signed-in-patch",
            headers={"Sec-Fetch-Site": "same-origin", "Content-Type": "text/plain"},
            content=b"not-json",
        )
        assert (bad_ct.status_code, bad_ct.json()["code"]) == (
            415,
            "request.unsupported_media_type",
        )

        # 4. Valid origin + application/json + malformed JSON -> 422 json_invalid.
        bad_json = anon.patch(
            "/test-guard/signed-in-patch",
            headers={"Sec-Fetch-Site": "same-origin", "Content-Type": "application/json"},
            content=b"{bad",
        )
        assert (bad_json.status_code, bad_json.json()["code"]) == (422, "request.invalid")
        assert bad_json.json()["params"]["errors"][0]["type"] == "json_invalid"

        # 5. Valid JSON (even failing Pydantic validation) + anonymous -> 401 before 422.
        unauth = anon.patch(
            "/test-guard/signed-in-patch",
            headers={"Sec-Fetch-Site": "same-origin"},
            json={"wrongField": 1},
        )
        assert (unauth.status_code, unauth.json()["code"]) == (401, "auth.unauthenticated")

    # 6. Signed in + missing person assertion beats Pydantic validation -> 409 before 422.
    principal = AuthenticatedPrincipal(person_id=PERSON_A, session_id=SESSION_A)
    with TestClient(_build_guard_app(principal=principal)) as authed:
        mismatch = authed.patch(
            "/test-guard/signed-in-patch",
            headers={"Sec-Fetch-Site": "same-origin"},
            json={"wrongField": 1},
        )
        assert (mismatch.status_code, mismatch.json()["code"]) == (409, "auth.person_mismatch")

        # 7. Signed in + matching person assertion + invalid Pydantic fields -> 422.
        invalid_body = authed.patch(
            "/test-guard/signed-in-patch",
            headers={
                "Sec-Fetch-Site": "same-origin",
                PERSON_ASSERTION_HEADER: str(PERSON_A),
            },
            json={"wrongField": 1},
        )
        assert (invalid_body.status_code, invalid_body.json()["code"]) == (422, "request.invalid")


def test_wrong_method_still_answers_405_with_allow_header_before_guards() -> None:
    with TestClient(_build_guard_app()) as client:
        post_health = client.post("/health")
        assert post_health.status_code == 405
        assert post_health.headers["Allow"] == "GET"

        delete_post = client.delete("/test-guard/public-body")
        assert delete_post.status_code == 405
        assert delete_post.headers["Allow"] == "POST"
