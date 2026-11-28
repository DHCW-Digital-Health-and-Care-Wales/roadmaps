"""S1, S2, S3, D1-D2, D6, D9-D13: end-to-end OIDC sign-in, sessions, `/me` and log hygiene.

Drives the real API routes against real PostgreSQL 18 (`roadmaps_app`) and the real
in-repo local mock OIDC ASGI app running on an ephemeral loopback port per worker (D5),
proving full sign-in, uninvited refusal, disabled/Entra refusals, state/cookie replay and
concurrency race safety, session fixation protection, `/me` ordering, idle/absolute
timeouts, 1-minute throttled sliding, cross-site GET no-write, extend, sign-out and
sign-out-all, cookie attributes and allow-listed security event logging.
"""

import hashlib
import json
import threading
import time
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

import httpx2
import psycopg
import pytest
import requests
import uvicorn
from fastapi import FastAPI
from fastapi.testclient import TestClient
from joserfc import jwt
from joserfc.jwk import RSAKey
from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.app import create_app
from roadmaps_api.authz import PERSON_ASSERTION_HEADER, ShippedRoleKey
from roadmaps_api.identity import (
    GOOGLE_CANONICAL_ISSUER,
    OidcClient,
    build_provider_configs,
)
from roadmaps_api.identity.providers import GOOGLE_DISCOVERY_URL
from roadmaps_api.services.auth import validate_return_path
from roadmaps_api.settings import Environment, Settings
from tests import harness
from tests.support import (
    SAME_ORIGIN_HEADERS,
    SAME_ORIGIN_JSON_HEADERS,
    TEST_EDITOR_ORIGIN,
    TEST_HOST,
    Lines,
    free_port,
)
from tests.test_identity import RecordingAdapter
from tools.mock_oidc.app import create_mock_oidc_app
from tools.seed.factories import (
    ChangeSetRequest,
    MembershipInput,
    PersonInput,
    SessionInput,
    create_membership,
    create_person_with_identity,
    create_session,
    create_shipped_roles,
    create_tenant,
    system_access_change_set,
)
from tools.seed.personas import (
    CWM_AUR_SLUG,
    DHCW_SLUG,
    NAMED_PERSONAS,
    TENANT_SPECS,
    UNINVITED_PERSONA,
)

SEED_TIME = datetime(2026, 11, 27, 12, 0, tzinfo=UTC)


@dataclass(frozen=True)
class _AuthWorld:
    dhcw_id: UUID
    cwm_id: UUID
    admin_id: UUID
    admin_identity_id: UUID
    multi_id: UUID
    multi_identity_id: UUID
    m_multi_dhcw_id: UUID
    m_multi_cwm_id: UUID
    disabled_id: UUID


@dataclass(frozen=True)
class _AuthEnv:
    database_url: str
    worker_database: str
    worker_admin: psycopg.Connection
    engine: Engine
    sessions: sessionmaker[Session]
    mock_oidc_base_url: str

    def make_app(
        self,
        *,
        environment: Environment = Environment.TEST,
        editor_origin: str = TEST_EDITOR_ORIGIN,
        local_mock_oidc_url: str | None = None,
        google: tuple[str, str, tuple[str, ...]] | None = None,
    ) -> FastAPI:
        mock_url = self.mock_oidc_base_url if local_mock_oidc_url is None else local_mock_oidc_url
        g_id, g_secret, g_hd = google if google is not None else (None, None, ())
        settings = Settings(
            environment=environment,
            database_url=self.database_url,
            allowed_hosts=(TEST_HOST, "localhost", "127.0.0.1"),
            editor_origin=editor_origin,
            local_mock_oidc_url=mock_url or None,
            google_client_id=g_id,
            google_client_secret=g_secret,
            google_allowed_hd=g_hd,
        )
        app = create_app(settings)
        app.state.engine.dispose()
        app.state.engine = self.engine
        app.state.sessions = self.sessions
        return app


@pytest.fixture(scope="module")
def mock_oidc_base_url() -> Iterator[str]:
    """Starts the real local mock OIDC FastAPI app on an ephemeral loopback port (D5)."""
    port = free_port()
    base_url = f"http://127.0.0.1:{port}"
    mock_app = create_mock_oidc_app(base_url=base_url)
    config = uvicorn.Config(mock_app, host="127.0.0.1", port=port, log_level="critical")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 10.0
    while time.monotonic() < deadline:
        try:
            if httpx2.get(f"{base_url}/health").status_code == 200:
                break
        except httpx2.TransportError:
            time.sleep(0.05)
    else:
        pytest.fail("local mock OIDC server did not start")
    yield base_url
    server.should_exit = True
    thread.join(timeout=5.0)


@pytest.fixture
def auth_env(  # noqa: PLR0913, PLR0917 - pytest fixture injection bundle
    database_url: str,
    worker_database: str,
    worker_admin: psycopg.Connection,
    engine: Engine,
    sessions: sessionmaker[Session],
    mock_oidc_base_url: str,
) -> _AuthEnv:
    httpx2.post(f"{mock_oidc_base_url}/_test/reset")
    return _AuthEnv(
        database_url=database_url,
        worker_database=worker_database,
        worker_admin=worker_admin,
        engine=engine,
        sessions=sessions,
        mock_oidc_base_url=mock_oidc_base_url,
    )


def _seed_auth_world(worker_database: str) -> _AuthWorld:
    with harness.admin_session(worker_database) as session:
        dhcw = create_tenant(session, TENANT_SPECS[0], created_at=SEED_TIME)
        cwm = create_tenant(session, TENANT_SPECS[1], created_at=SEED_TIME)
        with system_access_change_set(session, dhcw.id, ChangeSetRequest.seeded(106, "dhcw-roles")):
            dhcw_roles = create_shipped_roles(session, tenant_id=dhcw.id, created_at=SEED_TIME)
        with system_access_change_set(session, cwm.id, ChangeSetRequest.seeded(106, "cwm-roles")):
            cwm_roles = create_shipped_roles(session, tenant_id=cwm.id, created_at=SEED_TIME)

        by_key = {p.key: p for p in NAMED_PERSONAS}
        admin_spec = by_key["dhcw_admin_primary"]
        multi_spec = by_key["multi_tenant_member"]
        disabled_spec = by_key["dhcw_disabled_person"]

        admin_person, admin_ident = create_person_with_identity(
            session,
            PersonInput(
                display_name="Old Name",
                email="old.email@dhcw.example",
                subject=admin_spec.subject,
                created_at=SEED_TIME,
            ),
        )
        multi_person, multi_ident = create_person_with_identity(
            session,
            PersonInput(
                display_name=multi_spec.display_name,
                email=multi_spec.email,
                subject=multi_spec.subject,
                created_at=SEED_TIME,
            ),
        )
        disabled_person, _ = create_person_with_identity(
            session,
            PersonInput(
                display_name=disabled_spec.display_name,
                email=disabled_spec.email,
                subject=disabled_spec.subject,
                disabled_at=SEED_TIME,
                created_at=SEED_TIME,
            ),
        )

        with system_access_change_set(
            session, dhcw.id, ChangeSetRequest.seeded(106, "dhcw-members")
        ):
            create_membership(
                session,
                MembershipInput(
                    tenant_id=dhcw.id,
                    person_id=admin_person.id,
                    role_id=dhcw_roles[ShippedRoleKey.ADMIN].id,
                    created_at=SEED_TIME,
                ),
            )
            m_multi_dhcw = create_membership(
                session,
                MembershipInput(
                    tenant_id=dhcw.id,
                    person_id=multi_person.id,
                    role_id=dhcw_roles[ShippedRoleKey.PRODUCT_LEAD].id,
                    created_at=SEED_TIME,
                ),
            )
        with system_access_change_set(session, cwm.id, ChangeSetRequest.seeded(106, "cwm-members")):
            m_multi_cwm = create_membership(
                session,
                MembershipInput(
                    tenant_id=cwm.id,
                    person_id=multi_person.id,
                    role_id=cwm_roles[ShippedRoleKey.ADMIN].id,
                    created_at=SEED_TIME,
                ),
            )
        world = _AuthWorld(
            dhcw_id=dhcw.id,
            cwm_id=cwm.id,
            admin_id=admin_person.id,
            admin_identity_id=admin_ident.id,
            multi_id=multi_person.id,
            multi_identity_id=multi_ident.id,
            m_multi_dhcw_id=m_multi_dhcw.id,
            m_multi_cwm_id=m_multi_cwm.id,
            disabled_id=disabled_person.id,
        )
        session.commit()
    return world


def _parse_set_cookies(headers: httpx2.Headers) -> dict[str, str]:
    cookies: dict[str, str] = {}
    for raw in headers.get_list("set-cookie"):
        name_val = raw.split(";", 1)[0]
        name, _val = name_val.split("=", 1)
        cookies[name] = raw
    return cookies


def _cookie_value(set_cookie_header: str) -> str:
    return set_cookie_header.split(";", 1)[0].split("=", 1)[1]


def _with_cookie(
    cookie_name: str, cookie_val: str, extra: dict[str, str] | None = None
) -> dict[str, str]:
    headers = {"Cookie": f"{cookie_name}={cookie_val}"}
    if extra:
        headers.update(extra)
    return headers


def _drive_mock_sign_in(
    client: TestClient,
    persona_key: str,
    *,
    return_path: str = "/",
    session_cookie_name: str = "__Host-session",
    extra_callback_query: str = "",
) -> tuple[httpx2.Response, str | None, dict[str, str]]:
    start = client.post(
        "/api/v1/auth/sign-in",
        headers=SAME_ORIGIN_JSON_HEADERS,
        json={"provider": "local_mock", "purpose": "sign-in", "returnPath": return_path},
    )
    assert start.status_code == 200, start.text
    start_cookies = _parse_set_cookies(start.headers)
    [tx_cookie_name] = list(start_cookies)
    tx_cookie_value = _cookie_value(start_cookies[tx_cookie_name])

    auth_url = start.json()["authorizationUrl"]
    provider_res = httpx2.get(
        f"{auth_url}&persona={persona_key}",
        follow_redirects=False,
    )
    assert provider_res.status_code == 302
    callback_loc = urlsplit(provider_res.headers["location"])
    query = f"{callback_loc.query}{extra_callback_query}"
    callback = client.get(
        f"{callback_loc.path}?{query}",
        headers=_with_cookie(tx_cookie_name, tx_cookie_value),
        follow_redirects=False,
    )
    cb_cookies = _parse_set_cookies(callback.headers)
    session_token = (
        _cookie_value(cb_cookies[session_cookie_name])
        if session_cookie_name in cb_cookies
        else None
    )
    return callback, session_token, start_cookies


def _assert_cookie_attributes(tx_header: str, sess_header: str) -> None:
    assert tx_header.startswith("__Host-tx-")
    assert "HttpOnly" in tx_header
    assert "Secure" in tx_header
    assert "SameSite=lax" in tx_header or "SameSite=Lax" in tx_header
    assert "Max-Age=600" in tx_header
    assert "Domain=" not in tx_header

    assert "HttpOnly" in sess_header
    assert "Secure" in sess_header
    assert "SameSite=strict" in sess_header or "SameSite=Strict" in sess_header
    assert "Path=/" in sess_header
    assert "Expires=" not in sess_header
    assert "Max-Age=" not in sess_header
    assert "Domain=" not in sess_header


@pytest.mark.parametrize(
    "bad_path",
    [
        "",
        "roadmaps",
        "https://evil.example/roadmaps",
        "http://evil.example/roadmaps",
        "//evil.example/roadmaps",
        "/\\evil.example",
        "/foo\\bar",
        "/foo#frag",
        "/foo bar",
        "/foo\nbar",
        "/foo\rbar",
        "/foo\x00bar",
        "/foo\x7fbar",
        "javascript:alert(1)",
        "/" + "a" * 512,
    ],
)
def test_return_path_rejects_open_redirects_and_unsafe_characters(bad_path: str) -> None:
    with pytest.raises(ValueError, match="returnPath"):
        validate_return_path(bad_path)


@pytest.mark.parametrize(
    "good_path",
    ["/", "/dhcw/roadmaps", "/dhcw/roadmaps?view=compact&q=1", "/" + "a" * 511],
)
def test_return_path_accepts_valid_relative_spa_paths(good_path: str) -> None:
    assert validate_return_path(good_path) == good_path


def test_full_sign_in_refreshes_identity_sets_strict_cookies_and_serves_me(
    auth_env: _AuthEnv, lines: Lines
) -> None:
    world = _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()

    with TestClient(app) as client:
        # Also proves extra provider callback params (e.g. Google's hd/authuser/scope) are ignored.
        cb, session_token, start_cookies = _drive_mock_sign_in(
            client,
            "dhcw_admin_primary",
            return_path="/dhcw/roadmaps?view=compact",
            extra_callback_query="&hd=wales.nhs.uk&authuser=0&scope=openid",
        )
        assert cb.status_code == 302
        assert cb.headers["location"] == (
            f"{TEST_EDITOR_ORIGIN}/#/auth/callback?returnTo=%2Fdhcw%2Froadmaps%3Fview%3Dcompact"
        )
        assert cb.headers["cache-control"] == "no-store"

        [tx_cookie_header] = list(start_cookies.values())
        cb_cookies = _parse_set_cookies(cb.headers)
        _assert_cookie_attributes(tx_cookie_header, cb_cookies["__Host-session"])
        assert session_token is not None

        # Raw session token never reaches PostgreSQL (SHA-256 hash only).
        stored = auth_env.worker_admin.execute("SELECT token_hash FROM public.sessions").fetchall()
        assert stored == [(hashlib.sha256(session_token.encode()).digest(),)]

        # Display name, email and last_sign_in_at were refreshed from the ID token.
        me = client.get("/api/v1/me", headers=_with_cookie("__Host-session", session_token))
        assert me.status_code == 200
        me_body = me.json()
        assert me_body["personId"] == str(world.admin_id)
        assert me_body["displayName"] == "Rhiannon Davies"
        assert me_body["identities"][0]["provider"] == "local_mock"
        assert me_body["identities"][0]["email"] == "rhiannon.davies@dhcw.example"
        assert me_body["identities"][0]["lastSignInAt"] is not None
        assert me_body["memberships"][0]["tenantSlug"] == DHCW_SLUG
        assert me_body["memberships"][0]["nameCy"] == "Iechyd a Gofal Digidol Cymru"
        assert me_body["memberships"][0]["role"]["systemKey"] == "admin"
        assert me_body["memberships"][0]["permissions"] == sorted(
            me_body["memberships"][0]["permissions"]
        )
        assert me_body["session"]["provider"] == "local_mock"

        # Multi-tenant /me orders memberships deterministically by (id ASC, tenant_id ASC) (D2).
        cb_multi, multi_token, _ = _drive_mock_sign_in(client, "multi_tenant_member")
        assert cb_multi.status_code == 302
        assert cb_multi.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/auth/callback"
        assert multi_token is not None
        assert multi_token != session_token
        me_multi = client.get("/api/v1/me", headers=_with_cookie("__Host-session", multi_token))
        assert [m["tenantSlug"] for m in me_multi.json()["memberships"]] == [
            DHCW_SLUG,
            CWM_AUR_SLUG,
        ]

    # Security event logs carry IDs and codes only, never raw tokens or emails.
    all_lines = lines.read()
    serialized = json.dumps(all_lines)
    assert session_token not in serialized
    assert "rhiannon.davies@dhcw.example" not in serialized
    signed_in_events = [line for line in all_lines if line.get("message") == "auth.signed_in"]
    assert len(signed_in_events) == 2
    assert signed_in_events[0]["person_id"] == str(world.admin_id)
    assert signed_in_events[0]["provider"] == "local_mock"


def test_local_mode_cookies_carry_editor_origin_port_and_ignore_host_headers(
    auth_env: _AuthEnv,
) -> None:
    _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app(
        environment=Environment.LOCAL,
        editor_origin="http://localhost:21640",
    )

    with TestClient(app) as client:
        start = client.post(
            "/api/v1/auth/sign-in",
            headers={
                **SAME_ORIGIN_JSON_HEADERS,
                "Host": "127.0.0.1:21644",
                "X-Forwarded-Host": "evil.example",
            },
            json={"provider": "local_mock"},
        )
        assert start.status_code == 200
        auth_query = parse_qs(urlsplit(start.json()["authorizationUrl"]).query)
        assert auth_query["redirect_uri"] == [
            "http://localhost:21640/api/v1/auth/callback/local_mock"
        ]
        [tx_name] = list(_parse_set_cookies(start.headers))
        assert tx_name.startswith("__Host-21640-tx-")

        cb, sess_token, _ = _drive_mock_sign_in(
            client, "dhcw_admin_primary", session_cookie_name="__Host-21640-session"
        )
        assert cb.status_code == 302
        assert cb.headers["location"] == "http://localhost:21640/#/auth/callback"
        assert sess_token is not None
        assert (
            client.get(
                "/api/v1/me", headers=_with_cookie("__Host-21640-session", sess_token)
            ).status_code
            == 200
        )


def test_sign_in_start_rejects_disabled_provider_unreachable_provider_and_bad_requests(
    auth_env: _AuthEnv,
) -> None:
    app = auth_env.make_app()
    with TestClient(app) as client:
        # Google is not enabled in this test app -> 400 auth.provider_not_enabled.
        disabled = client.post(
            "/api/v1/auth/sign-in",
            headers=SAME_ORIGIN_JSON_HEADERS,
            json={"provider": "google"},
        )
        assert disabled.status_code == 400
        assert disabled.json()["code"] == "auth.provider_not_enabled"

        # Unsupported purposes (redeem, link) and open-redirect returnPath -> 422.
        for payload in (
            {"provider": "local_mock", "purpose": "redeem"},
            {"provider": "local_mock", "purpose": "link"},
            {"provider": "local_mock", "returnPath": "https://evil.example/"},
        ):
            bad = client.post(
                "/api/v1/auth/sign-in",
                headers=SAME_ORIGIN_JSON_HEADERS,
                json=payload,
            )
            assert bad.status_code == 422

    # Provider discovery unreachable -> 503 auth.provider_unavailable.
    unreachable_port = free_port()
    app_down = auth_env.make_app(local_mock_oidc_url=f"http://127.0.0.1:{unreachable_port}")
    with TestClient(app_down) as client:
        down = client.post(
            "/api/v1/auth/sign-in",
            headers=SAME_ORIGIN_JSON_HEADERS,
            json={"provider": "local_mock"},
        )
        assert down.status_code == 503
        assert down.json()["code"] == "auth.provider_unavailable"


def test_uninvited_disabled_cancelled_and_faulty_sign_ins_are_refused(
    auth_env: _AuthEnv, lines: Lines
) -> None:
    _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()
    admin = auth_env.worker_admin

    before_people = admin.execute("SELECT count(*) FROM public.people").fetchone()
    before_idents = admin.execute("SELECT count(*) FROM public.identities").fetchone()

    with TestClient(app) as client:
        # S2: Uninvited user writes zero people/identities/sessions rows and redirects not_invited.
        cb_uninvited, tok, _ = _drive_mock_sign_in(client, UNINVITED_PERSONA.key)
        assert cb_uninvited.status_code == 302
        assert (
            cb_uninvited.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=not_invited"
        )
        assert tok is None
        assert admin.execute("SELECT count(*) FROM public.people").fetchone() == before_people
        assert admin.execute("SELECT count(*) FROM public.identities").fetchone() == before_idents
        assert admin.execute("SELECT count(*) FROM public.sessions").fetchone() == (0,)

        # Disabled person is refused with person_disabled and writes no session.
        cb_disabled, tok, _ = _drive_mock_sign_in(client, "dhcw_disabled_person")
        assert cb_disabled.status_code == 302
        assert (
            cb_disabled.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=person_disabled"
        )
        assert tok is None

        # User cancellation (error=access_denied) redirects sign_in_cancelled.
        cb_cancel, tok, _ = _drive_mock_sign_in(client, "__cancel__")
        assert cb_cancel.status_code == 302
        assert (
            cb_cancel.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_cancelled"
        )
        assert tok is None

        # Faulty ID token from mock provider (alg=none) redirects sign_in_failed.
        httpx2.post(f"{auth_env.mock_oidc_base_url}/_test/fault", json={"algNone": True})
        cb_fault, tok, _ = _drive_mock_sign_in(client, "dhcw_admin_primary")
        assert cb_fault.status_code == 302
        assert (
            cb_fault.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"
        )
        assert tok is None

    assert admin.execute("SELECT count(*) FROM public.sessions").fetchone() == (0,)
    refused = [line for line in lines.read() if line.get("message") == "auth.sign_in_refused"]
    assert {e["reason"] for e in refused} >= {
        "not_invited",
        "person_disabled",
        "sign_in_cancelled",
    }


def test_google_sign_in_for_person_with_entra_identity_redirects_entra_required(
    auth_env: _AuthEnv, lines: Lines
) -> None:
    """S1 end-to-end: person holding an Entra identity signing in via Google gets entra_required."""
    world = _seed_auth_world(auth_env.worker_database)
    with auth_env.worker_admin.transaction():
        auth_env.worker_admin.execute(
            "INSERT INTO public.identities (person_id, issuer, subject, email)"
            " VALUES (%s, %s, 'google-sub-entra-user', 'admin@wales.nhs.uk'),"
            " (%s, 'https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0',"
            "  'entra-oid-1', 'admin@wales.nhs.uk')",
            (world.admin_id, GOOGLE_CANONICAL_ISSUER, world.admin_id),
        )

    google_key = RSAKey.generate_key(2048, parameters={"kid": "g1", "use": "sig", "alg": "RS256"})
    captured_nonce: list[str] = []
    client_id = "google-test-client"

    def handle_google(
        request: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if request.url == GOOGLE_DISCOVERY_URL:
            body = {
                "issuer": GOOGLE_CANONICAL_ISSUER,
                "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
                "token_endpoint": "https://oauth2.googleapis.com/token",
                "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",
            }
            return 200, {"Content-Type": "application/json"}, json.dumps(body).encode()
        if request.url == "https://www.googleapis.com/oauth2/v3/certs":
            body = {"keys": [google_key.as_dict(private=False)]}
            return 200, {"Content-Type": "application/json"}, json.dumps(body).encode()
        if request.url == "https://oauth2.googleapis.com/token":
            now = int(time.time())
            id_token = jwt.encode(
                {"alg": "RS256", "typ": "JWT", "kid": "g1"},
                {
                    "iss": GOOGLE_CANONICAL_ISSUER,
                    "sub": "google-sub-entra-user",
                    "aud": client_id,
                    "exp": now + 300,
                    "iat": now,
                    "nonce": captured_nonce[0],
                    "email": "admin@wales.nhs.uk",
                    "email_verified": True,
                    "hd": "wales.nhs.uk",
                    "name": "Rhiannon Davies",
                },
                google_key,
            )
            body = {"access_token": "tok", "token_type": "Bearer", "id_token": id_token}
            return 200, {"Content-Type": "application/json"}, json.dumps(body).encode()
        pytest.fail(f"Unexpected URL: {request.url}")

    google_settings = Settings(
        environment=Environment.TEST,
        database_url=auth_env.database_url,
        allowed_hosts=(TEST_HOST,),
        editor_origin=TEST_EDITOR_ORIGIN,
        google_client_id=client_id,
        google_client_secret="google-test-secret",  # noqa: S106 - test fixture
        google_allowed_hd=("wales.nhs.uk",),
    )
    app = auth_env.make_app(
        google=(client_id, "google-test-secret", ("wales.nhs.uk",)),
    )
    app.state.oidc_client = OidcClient(
        build_provider_configs(google_settings),
        adapter=RecordingAdapter(handle_google),
    )

    with TestClient(app) as client:
        start = client.post(
            "/api/v1/auth/sign-in",
            headers=SAME_ORIGIN_JSON_HEADERS,
            json={"provider": "google"},
        )
        assert start.status_code == 200
        auth_query = parse_qs(urlsplit(start.json()["authorizationUrl"]).query)
        captured_nonce.append(auth_query["nonce"][0])
        [tx_name] = list(_parse_set_cookies(start.headers))
        tx_val = _cookie_value(_parse_set_cookies(start.headers)[tx_name])

        cb = client.get(
            f"/api/v1/auth/callback/google?code=g-code&state={auth_query['state'][0]}",
            headers=_with_cookie(tx_name, tx_val),
            follow_redirects=False,
        )
        assert cb.status_code == 302
        assert cb.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=entra_required"
        assert "__Host-session" not in _parse_set_cookies(cb.headers)

    assert auth_env.worker_admin.execute("SELECT count(*) FROM public.sessions").fetchone() == (0,)
    assert any(
        line.get("message") == "auth.sign_in_refused" and line.get("reason") == "entra_required"
        for line in lines.read()
    )


def test_transaction_single_use_cookie_binding_provider_binding_and_concurrent_race(
    auth_env: _AuthEnv,
) -> None:
    _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()

    with TestClient(app) as client:
        # Two parallel tabs start sign-in without overwriting each other's transaction cookies.
        start1 = client.post(
            "/api/v1/auth/sign-in",
            headers=SAME_ORIGIN_JSON_HEADERS,
            json={"provider": "local_mock"},
        )
        start2 = client.post(
            "/api/v1/auth/sign-in",
            headers=SAME_ORIGIN_JSON_HEADERS,
            json={"provider": "local_mock"},
        )
        [tx1_name] = list(_parse_set_cookies(start1.headers))
        [tx2_name] = list(_parse_set_cookies(start2.headers))
        assert tx1_name != tx2_name
        tx1_val = _cookie_value(_parse_set_cookies(start1.headers)[tx1_name])
        tx2_val = _cookie_value(_parse_set_cookies(start2.headers)[tx2_name])

        p1 = httpx2.get(
            f"{start1.json()['authorizationUrl']}&persona=dhcw_admin_primary",
            follow_redirects=False,
        )
        loc1 = urlsplit(p1.headers["location"])

        # Missing transaction cookie (login CSRF) is refused and does NOT consume tx1.
        no_cookie = client.get(f"{loc1.path}?{loc1.query}", follow_redirects=False)
        assert (
            no_cookie.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"
        )

        # Wrong transaction cookie (tab 2's cookie with tab 1's state) is refused.
        wrong_cookie = client.get(
            f"{loc1.path}?{loc1.query}",
            headers=_with_cookie(tx2_name, tx2_val),
            follow_redirects=False,
        )
        assert (
            wrong_cookie.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"
        )

        # Cross-provider callback path is refused (mix-up attack).
        wrong_provider = client.get(
            f"/api/v1/auth/callback/google?{loc1.query}",
            headers=_with_cookie(tx1_name, tx1_val),
            follow_redirects=False,
        )
        assert (
            wrong_provider.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"
        )

        # Concurrent race on the same valid callback: exactly ONE succeeds, the other fails!
        def hit_callback() -> str:
            res = client.get(
                f"{loc1.path}?{loc1.query}",
                headers=_with_cookie(tx1_name, tx1_val),
                follow_redirects=False,
            )
            return res.headers["location"]

        with ThreadPoolExecutor(max_workers=2) as pool:
            f1 = pool.submit(hit_callback)
            f2 = pool.submit(hit_callback)
            outcomes = sorted([f1.result(), f2.result()])
        assert outcomes == sorted(
            [
                f"{TEST_EDITOR_ORIGIN}/#/auth/callback",
                f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed",
            ]
        )

        # Replaying after consumption fails too.
        replay = client.get(
            f"{loc1.path}?{loc1.query}",
            headers=_with_cookie(tx1_name, tx1_val),
            follow_redirects=False,
        )
        assert replay.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"

        # Expired transaction is refused.
        with auth_env.worker_admin.transaction():
            auth_env.worker_admin.execute(
                "UPDATE public.sign_in_transactions"
                " SET created_at = now() - interval '15 minutes',"
                "     expires_at = now() - interval '5 minutes'"
                " WHERE consumed_at IS NULL"
            )
        p2 = httpx2.get(
            f"{start2.json()['authorizationUrl']}&persona=dhcw_admin_primary",
            follow_redirects=False,
        )
        loc2 = urlsplit(p2.headers["location"])
        expired_cb = client.get(
            f"{loc2.path}?{loc2.query}",
            headers=_with_cookie(tx2_name, tx2_val),
            follow_redirects=False,
        )
        assert (
            expired_cb.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"
        )


def test_session_idle_absolute_throttled_sliding_and_extend(auth_env: _AuthEnv) -> None:
    world = _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()
    now = datetime.now(UTC)

    with harness.admin_session(auth_env.worker_database) as s:
        s1 = create_session(
            s,
            SessionInput(
                person_id=world.admin_id,
                identity_id=world.admin_identity_id,
                raw_token="token-s1",  # noqa: S106 - test fixture
                signed_in_at=now - timedelta(minutes=30),
                last_activity_at=now - timedelta(minutes=2),
                idle_expires_at=now + timedelta(minutes=30),
                absolute_expires_at=now + timedelta(hours=9, minutes=30),
            ),
        )
        create_session(
            s,
            SessionInput(
                person_id=world.admin_id,
                identity_id=world.admin_identity_id,
                raw_token="token-s2",  # noqa: S106 - test fixture
                signed_in_at=now - timedelta(hours=9, minutes=45),
                last_activity_at=now,
                idle_expires_at=now + timedelta(minutes=5),
                absolute_expires_at=now + timedelta(minutes=15),
            ),
        )
        create_session(
            s,
            SessionInput(
                person_id=world.admin_id,
                identity_id=world.admin_identity_id,
                raw_token="token-idle-expired",  # noqa: S106 - test fixture
                signed_in_at=now - timedelta(hours=2),
                last_activity_at=now - timedelta(hours=2),
                idle_expires_at=now - timedelta(seconds=1),
                absolute_expires_at=now + timedelta(hours=8),
            ),
        )
        create_session(
            s,
            SessionInput(
                person_id=world.admin_id,
                identity_id=world.admin_identity_id,
                raw_token="token-abs-expired",  # noqa: S106 - test fixture
                signed_in_at=now - timedelta(hours=10, minutes=1),
                last_activity_at=now - timedelta(minutes=1),
                idle_expires_at=now - timedelta(minutes=1),
                absolute_expires_at=now - timedelta(minutes=1),
            ),
        )
        s1_id = s1.id
        s.commit()

    admin = auth_env.worker_admin
    with TestClient(app) as client:
        for expired_token in ("token-idle-expired", "token-abs-expired"):
            assert (
                client.get(
                    "/api/v1/me", headers=_with_cookie("__Host-session", expired_token)
                ).status_code
                == 401
            )

        # Cross-site / same-site GET does NOT update last_activity_at (D12).
        before_activity = admin.execute(
            "SELECT last_activity_at FROM public.sessions WHERE id = %s", (s1_id,)
        ).fetchone()
        for site in ("cross-site", "same-site"):
            r = client.get(
                "/api/v1/me",
                headers=_with_cookie("__Host-session", "token-s1", {"Sec-Fetch-Site": site}),
            )
            assert r.status_code == 200
        assert (
            admin.execute(
                "SELECT last_activity_at FROM public.sessions WHERE id = %s", (s1_id,)
            ).fetchone()
            == before_activity
        )

        # Same-origin GET after >= 1 minute slides idle_expires_at and updates last_activity_at.
        r1 = client.get(
            "/api/v1/me",
            headers=_with_cookie("__Host-session", "token-s1", SAME_ORIGIN_HEADERS),
        )
        assert r1.status_code == 200
        after_first = admin.execute(
            "SELECT last_activity_at, idle_expires_at FROM public.sessions WHERE id = %s",
            (s1_id,),
        ).fetchone()
        assert after_first is not None
        assert before_activity is not None
        assert after_first[0] > before_activity[0]

        # Immediate second GET within 1 minute is throttled (no DB update).
        r2 = client.get(
            "/api/v1/me",
            headers=_with_cookie("__Host-session", "token-s1", SAME_ORIGIN_HEADERS),
        )
        assert r2.status_code == 200
        assert (
            admin.execute(
                "SELECT last_activity_at, idle_expires_at FROM public.sessions WHERE id = %s",
                (s1_id,),
            ).fetchone()
            == after_first
        )

        # POST /api/v1/auth/extend bypasses throttle and caps idle at absolute (D12).
        ext = client.post(
            "/api/v1/auth/extend",
            headers=_with_cookie(
                "__Host-session",
                "token-s2",
                {**SAME_ORIGIN_HEADERS, PERSON_ASSERTION_HEADER: str(world.admin_id)},
            ),
        )
        assert ext.status_code == 200
        ext_body = ext.json()
        assert ext_body["idleExpiresAt"] == ext_body["absoluteExpiresAt"]


def test_sign_out_sign_out_all_and_person_disable_revoke_sessions(auth_env: _AuthEnv) -> None:
    world = _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()
    now = datetime.now(UTC)

    with harness.admin_session(auth_env.worker_database) as s:
        for tok in ("token-s1", "token-s2", "token-s3"):
            create_session(
                s,
                SessionInput(
                    person_id=world.admin_id,
                    identity_id=world.admin_identity_id,
                    raw_token=tok,
                    signed_in_at=now,
                ),
            )
        s.commit()

    with TestClient(app) as client:
        # POST /api/v1/auth/sign-out revokes only s1 and expires cookie without Clear-Site-Data.
        so = client.post(
            "/api/v1/auth/sign-out",
            headers=_with_cookie(
                "__Host-session",
                "token-s1",
                {**SAME_ORIGIN_HEADERS, PERSON_ASSERTION_HEADER: str(world.admin_id)},
            ),
        )
        assert so.status_code == 200
        assert "clear-site-data" not in so.headers
        assert "Max-Age=0" in _parse_set_cookies(so.headers)["__Host-session"]
        assert (
            client.get("/api/v1/me", headers=_with_cookie("__Host-session", "token-s1")).status_code
            == 401
        )
        assert (
            client.get("/api/v1/me", headers=_with_cookie("__Host-session", "token-s2")).status_code
            == 200
        )

        # POST /api/v1/auth/sign-out-all revokes both remaining sessions s2 and s3.
        soa = client.post(
            "/api/v1/auth/sign-out-all",
            headers=_with_cookie(
                "__Host-session",
                "token-s2",
                {**SAME_ORIGIN_HEADERS, PERSON_ASSERTION_HEADER: str(world.admin_id)},
            ),
        )
        assert soa.status_code == 200
        for tok in ("token-s2", "token-s3"):
            assert (
                client.get("/api/v1/me", headers=_with_cookie("__Host-session", tok)).status_code
                == 401
            )

        # Disabling a person immediately refuses an otherwise active session (S3).
        with harness.admin_session(auth_env.worker_database) as s:
            create_session(
                s,
                SessionInput(
                    person_id=world.admin_id,
                    identity_id=world.admin_identity_id,
                    raw_token="token-s4",  # noqa: S106 - test fixture
                    signed_in_at=now,
                ),
            )
            s.commit()
        assert (
            client.get("/api/v1/me", headers=_with_cookie("__Host-session", "token-s4")).status_code
            == 200
        )
        with auth_env.worker_admin.transaction():
            auth_env.worker_admin.execute(
                "UPDATE public.people SET disabled_at = now() WHERE id = %s", (world.admin_id,)
            )
        assert (
            client.get("/api/v1/me", headers=_with_cookie("__Host-session", "token-s4")).status_code
            == 401
        )


def test_callback_and_me_edge_refusals(auth_env: _AuthEnv) -> None:
    """Covers invalid/missing callback params, ghost principal and unknown permission on /me."""
    from roadmaps_api.authz import AuthenticatedPrincipal, get_current_principal  # noqa: PLC0415

    world = _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()

    with TestClient(app) as client:
        # Unknown provider, provider error != access_denied, and missing code -> sign_in_failed.
        for bad_cb in (
            "/api/v1/auth/callback/not_a_provider?code=x&state=y",
            "/api/v1/auth/callback/local_mock?error=server_error&state=y",
            "/api/v1/auth/callback/local_mock?state=y",
        ):
            r = client.get(bad_cb, follow_redirects=False)
            assert r.status_code == 302
            assert r.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"

        # Unknown permission row on /me fails closed with 403 authz.forbidden.
        with auth_env.worker_admin.transaction():
            role_id = auth_env.worker_admin.execute(
                "SELECT id FROM public.roles WHERE tenant_id = %s AND system_key = 'admin'",
                (world.dhcw_id,),
            ).fetchone()
            assert role_id is not None
            auth_env.worker_admin.execute(
                "ALTER TABLE public.role_permissions DISABLE TRIGGER USER"
            )
            auth_env.worker_admin.execute(
                "INSERT INTO public.role_permissions (tenant_id, role_id, permission)"
                " VALUES (%s, %s, 'rogue:unknown')",
                (world.dhcw_id, role_id[0]),
            )
            auth_env.worker_admin.execute("ALTER TABLE public.role_permissions ENABLE TRIGGER USER")

        ghost_principal = AuthenticatedPrincipal(
            person_id=UUID("00000000-0000-0000-0000-000000000099"),
            session_id=UUID("00000000-0000-0000-0000-000000000098"),
        )
        app.dependency_overrides[get_current_principal] = lambda: ghost_principal
        assert client.get("/api/v1/me").status_code == 401
        assert (
            client.post(
                "/api/v1/auth/extend",
                headers={
                    **SAME_ORIGIN_HEADERS,
                    PERSON_ASSERTION_HEADER: str(ghost_principal.person_id),
                },
            ).status_code
            == 401
        )

        admin_principal = AuthenticatedPrincipal(
            person_id=world.admin_id,
            session_id=UUID("00000000-0000-0000-0000-000000000097"),
        )
        app.dependency_overrides[get_current_principal] = lambda: admin_principal
        assert client.get("/api/v1/me").status_code == 403
        app.dependency_overrides.clear()


def test_session_touch_and_create_race_recovery(
    auth_env: _AuthEnv, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Covers repository None paths, concurrent touch-activity races and DBAPIError handling."""
    from sqlalchemy.exc import DBAPIError  # noqa: PLC0415

    from roadmaps_api.identity import OidcProviderId, VerifiedIdentity  # noqa: PLC0415
    from roadmaps_api.repositories.sessions import SessionRepository  # noqa: PLC0415
    from roadmaps_api.services.auth import AuthService  # noqa: PLC0415
    from roadmaps_api.services.sessions import SessionService  # noqa: PLC0415

    world = _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()
    now = datetime.now(UTC)
    race_token = "race-tok"  # noqa: S105 - test fixture

    with harness.admin_session(auth_env.worker_database) as s:
        create_session(
            s,
            SessionInput(
                person_id=world.admin_id,
                identity_id=world.admin_identity_id,
                raw_token=race_token,
                signed_in_at=now - timedelta(minutes=10),
                last_activity_at=now - timedelta(minutes=5),
                idle_expires_at=now + timedelta(minutes=55),
                absolute_expires_at=now + timedelta(hours=9),
            ),
        )
        s.commit()

    with auth_env.sessions() as db_sess:
        repo = SessionRepository(db_sess)
        assert repo.touch_activity(token_hash=b"\x00" * 32) is None
        assert repo.extend(session_id=UUID("00000000-0000-0000-0000-000000000099")) is None

    sess_svc = SessionService(auth_env.sessions)

    def _noop_touch(_self: SessionRepository, *, token_hash: bytes) -> None:
        del token_hash

    monkeypatch.setattr(SessionRepository, "touch_activity", _noop_touch)
    assert sess_svc.authenticate(raw_token=race_token, allow_activity_update=True) is not None

    def _revoke_then_none(_self: SessionRepository, *, token_hash: bytes) -> None:
        with auth_env.worker_admin.transaction():
            auth_env.worker_admin.execute(
                "UPDATE public.sessions SET revoked_at = now() WHERE token_hash = %s",
                (token_hash,),
            )

    monkeypatch.setattr(SessionRepository, "touch_activity", _revoke_then_none)
    assert sess_svc.authenticate(raw_token=race_token, allow_activity_update=True) is None

    # RaiseException during create_session refuses cleanly; other DBAPIError re-raises.
    auth_svc = AuthService(
        auth_env.sessions,
        app.state.oidc_client,
        sess_svc,
        editor_origin=TEST_EDITOR_ORIGIN,
    )
    verified = VerifiedIdentity(
        provider=OidcProviderId.LOCAL_MOCK,
        canonical_issuer="http://127.0.0.1/local-mock-oidc",
        subject=NAMED_PERSONAS[0].subject,
        email="rhiannon.davies@dhcw.example",
        display_name="Rhiannon Davies",
    )

    pg_raise = DBAPIError.instance(
        "SELECT 1", {}, psycopg.errors.RaiseException("person is disabled"), Exception
    )

    def _raise_pg_err(**_kwargs: object) -> object:
        raise pg_raise

    monkeypatch.setattr(sess_svc, "create_session", _raise_pg_err)
    outcome = auth_svc._resolve_and_create_session(  # noqa: SLF001 - testing race recovery branch
        provider=OidcProviderId.LOCAL_MOCK,
        verified=verified,
        return_path="/",
        tx_id=UUID("00000000-0000-0000-0000-000000000011"),
    )
    assert outcome.redirect_url == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"

    pg_other = DBAPIError.instance(
        "SELECT 1", {}, psycopg.OperationalError("connection lost"), Exception
    )

    def _raise_other_err(**_kwargs: object) -> object:
        raise pg_other

    monkeypatch.setattr(sess_svc, "create_session", _raise_other_err)
    with pytest.raises(DBAPIError):
        auth_svc._resolve_and_create_session(  # noqa: SLF001 - testing non-RaiseException re-raise
            provider=OidcProviderId.LOCAL_MOCK,
            verified=verified,
            return_path="/",
            tx_id=UUID("00000000-0000-0000-0000-000000000011"),
        )
