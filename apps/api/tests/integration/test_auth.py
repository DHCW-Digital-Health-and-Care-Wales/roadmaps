"""S1, S2, S3, D1-D2, D6, D9-D13: end-to-end OIDC sign-in, sessions, `/me` and log hygiene.

Drives the real API routes against real PostgreSQL 18 (`roadmaps_app`) and the real
in-repo local mock OIDC ASGI app running on an ephemeral loopback port per worker (D5),
proving full sign-in, uninvited refusal, disabled/Entra refusals, state/cookie replay,
parallel-tab concurrency without deadlocks, session fixation protection, `/me` ordering,
idle/absolute timeouts, 1-minute throttled sliding, cross-site GET no-write, extend,
sign-out and sign-out-all, cookie attributes and allow-listed security event logging.
"""

import hashlib
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

import httpx2
import psycopg
import pytest
import requests
from fastapi import FastAPI
from fastapi.testclient import TestClient
from joserfc import jwt
from joserfc.jwk import RSAKey
from sqlalchemy import Engine, create_engine
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session, sessionmaker

from roadmaps_api.app import create_app
from roadmaps_api.authz import PERSON_ASSERTION_HEADER, ShippedRoleKey, get_current_principal
from roadmaps_api.database import create_sessions
from roadmaps_api.identity import (
    GOOGLE_CANONICAL_ISSUER,
    OidcClient,
    build_provider_configs,
)
from roadmaps_api.identity.providers import GOOGLE_DISCOVERY_URL
from roadmaps_api.repositories.sessions import SessionRepository
from roadmaps_api.services.sessions import SessionRefusedError, SessionService
from roadmaps_api.settings import Environment, Settings
from tests import harness
from tests.support import (
    SAME_ORIGIN_HEADERS,
    SAME_ORIGIN_JSON_HEADERS,
    TEST_EDITOR_ORIGIN,
    TEST_HOST,
    Lines,
    RecordingAdapter,
    free_port,
    make_principal,
)
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
    disabled_identity_id: UUID


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
        pool_engine: Engine | None = None,
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
        if pool_engine is not None:
            app.state.engine = pool_engine
            app.state.sessions = create_sessions(pool_engine)
        else:
            app.state.engine = self.engine
            app.state.sessions = self.sessions
        return app


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
        disabled_person, disabled_ident = create_person_with_identity(
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
            disabled_identity_id=disabled_ident.id,
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


@dataclass(frozen=True)
class _SignInResult:
    callback: httpx2.Response
    session_token: str | None
    start_cookies: dict[str, str]
    tx_cookie_value: str
    state: str
    nonce: str
    code: str | None


def _drive_mock_sign_in(
    client: TestClient,
    persona_key: str,
    *,
    return_path: str = "/",
    session_cookie_name: str = "__Host-session",
    extra_callback_query: str = "",
) -> _SignInResult:
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
    auth_query = parse_qs(urlsplit(auth_url).query)
    provider_res = httpx2.get(
        f"{auth_url}&persona={persona_key}",
        follow_redirects=False,
    )
    assert provider_res.status_code == 302
    callback_loc = urlsplit(provider_res.headers["location"])
    cb_params = parse_qs(callback_loc.query)
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
    return _SignInResult(
        callback=callback,
        session_token=session_token,
        start_cookies=start_cookies,
        tx_cookie_value=tx_cookie_value,
        state=auth_query["state"][0],
        nonce=auth_query["nonce"][0],
        code=cb_params.get("code", [None])[0],
    )


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


def test_full_sign_in_refreshes_identity_sets_strict_cookies_and_serves_me(
    auth_env: _AuthEnv, lines: Lines
) -> None:
    world = _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()

    with TestClient(app) as client:
        # Also proves extra provider callback params (e.g. Google's hd/authuser/scope) are ignored.
        res = _drive_mock_sign_in(
            client,
            "dhcw_admin_primary",
            return_path="/dhcw/roadmaps?view=compact",
            extra_callback_query="&hd=wales.nhs.uk&authuser=0&scope=openid",
        )
        assert res.callback.status_code == 302
        assert res.callback.headers["location"] == (
            f"{TEST_EDITOR_ORIGIN}/#/auth/callback?returnTo=%2Fdhcw%2Froadmaps%3Fview%3Dcompact"
        )
        assert res.callback.headers["cache-control"] == "no-store"

        [tx_cookie_header] = list(res.start_cookies.values())
        cb_cookies = _parse_set_cookies(res.callback.headers)
        _assert_cookie_attributes(tx_cookie_header, cb_cookies["__Host-session"])
        assert res.session_token is not None
        assert res.code is not None

        # Raw session token never reaches PostgreSQL (SHA-256 hash only).
        stored = auth_env.worker_admin.execute("SELECT token_hash FROM public.sessions").fetchall()
        assert stored == [(hashlib.sha256(res.session_token.encode()).digest(),)]

        # Display name, email and last_sign_in_at were refreshed from the ID token.
        me = client.get("/api/v1/me", headers=_with_cookie("__Host-session", res.session_token))
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
        multi_res = _drive_mock_sign_in(client, "multi_tenant_member")
        assert multi_res.callback.status_code == 302
        assert multi_res.callback.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/auth/callback"
        assert multi_res.session_token is not None
        assert multi_res.session_token != res.session_token
        me_multi = client.get(
            "/api/v1/me", headers=_with_cookie("__Host-session", multi_res.session_token)
        )
        assert [m["tenantSlug"] for m in me_multi.json()["memberships"]] == [
            DHCW_SLUG,
            CWM_AUR_SLUG,
        ]

    # Security event logs carry IDs and codes only, never tokens, codes, state, nonce or emails.
    all_lines = lines.read()
    serialized = json.dumps(all_lines)
    for secret_value in (
        res.session_token,
        res.tx_cookie_value,
        res.state,
        res.nonce,
        res.code,
        "rhiannon.davies@dhcw.example",
    ):
        assert secret_value not in serialized
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

        res = _drive_mock_sign_in(
            client, "dhcw_admin_primary", session_cookie_name="__Host-21640-session"
        )
        assert res.callback.status_code == 302
        assert res.callback.headers["location"] == "http://localhost:21640/#/auth/callback"
        assert res.session_token is not None
        assert (
            client.get(
                "/api/v1/me", headers=_with_cookie("__Host-21640-session", res.session_token)
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
        uninvited = _drive_mock_sign_in(client, UNINVITED_PERSONA.key)
        assert uninvited.callback.status_code == 302
        assert (
            uninvited.callback.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=not_invited"
        )
        assert uninvited.session_token is None
        assert admin.execute("SELECT count(*) FROM public.people").fetchone() == before_people
        assert admin.execute("SELECT count(*) FROM public.identities").fetchone() == before_idents
        assert admin.execute("SELECT count(*) FROM public.sessions").fetchone() == (0,)

        # Disabled person is refused with person_disabled and writes no session.
        disabled = _drive_mock_sign_in(client, "dhcw_disabled_person")
        assert disabled.callback.status_code == 302
        assert (
            disabled.callback.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=person_disabled"
        )
        assert disabled.session_token is None

        # User cancellation (error=access_denied) redirects sign_in_cancelled.
        cancel = _drive_mock_sign_in(client, "__cancel__")
        assert cancel.callback.status_code == 302
        assert (
            cancel.callback.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_cancelled"
        )
        assert cancel.session_token is None

        # Faulty ID token from mock provider (alg=none) redirects sign_in_failed.
        httpx2.post(f"{auth_env.mock_oidc_base_url}/_test/fault", json={"algNone": True})
        fault = _drive_mock_sign_in(client, "dhcw_admin_primary")
        assert fault.callback.status_code == 302
        assert (
            fault.callback.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"
        )
        assert fault.session_token is None

    assert admin.execute("SELECT count(*) FROM public.sessions").fetchone() == (0,)
    refused = [line for line in lines.read() if line.get("message") == "auth.sign_in_refused"]
    assert {e["reason"] for e in refused} >= {
        "not_invited",
        "person_disabled",
        "sign_in_cancelled",
    }


def test_callback_with_invalid_authorization_code_refuses_cleanly_without_500(
    auth_env: _AuthEnv, lines: Lines
) -> None:
    _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()

    with TestClient(app) as client:
        start = client.post(
            "/api/v1/auth/sign-in",
            headers=SAME_ORIGIN_JSON_HEADERS,
            json={"provider": "local_mock"},
        )
        assert start.status_code == 200
        start_cookies = _parse_set_cookies(start.headers)
        [tx_name] = list(start_cookies)
        tx_val = _cookie_value(start_cookies[tx_name])
        state = parse_qs(urlsplit(start.json()["authorizationUrl"]).query)["state"][0]

        cb = client.get(
            f"/api/v1/auth/callback/local_mock?code=bogus-invalid-code&state={state}",
            headers=_with_cookie(tx_name, tx_val),
            follow_redirects=False,
        )
        assert cb.status_code == 302
        assert cb.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=sign_in_failed"
        cb_cookies = _parse_set_cookies(cb.headers)
        assert "__Host-session" not in cb_cookies
        assert "Max-Age=0" in cb_cookies[tx_name]

    assert auth_env.worker_admin.execute("SELECT count(*) FROM public.sessions").fetchone() == (0,)
    assert any(
        line.get("message") == "auth.sign_in_refused"
        and line.get("reason") == "token_exchange_failed"
        for line in lines.read()
    )


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


def test_parallel_sign_in_callbacks_for_same_person_succeed_without_deadlock(
    auth_env: _AuthEnv,
) -> None:
    """Two parallel tabs signing in as the same person on separate connections never deadlock."""
    _seed_auth_world(auth_env.worker_database)
    concurrent_engine = create_engine(auth_env.database_url, pool_size=4, max_overflow=0)
    try:
        app = auth_env.make_app(pool_engine=concurrent_engine)
        with TestClient(app) as client:
            callbacks: list[tuple[str, str, str]] = []
            for _ in range(2):
                start = client.post(
                    "/api/v1/auth/sign-in",
                    headers=SAME_ORIGIN_JSON_HEADERS,
                    json={"provider": "local_mock"},
                )
                assert start.status_code == 200
                [tx_name] = list(_parse_set_cookies(start.headers))
                tx_val = _cookie_value(_parse_set_cookies(start.headers)[tx_name])
                prov = httpx2.get(
                    f"{start.json()['authorizationUrl']}&persona=dhcw_admin_primary",
                    follow_redirects=False,
                )
                loc = urlsplit(prov.headers["location"])
                callbacks.append((f"{loc.path}?{loc.query}", tx_name, tx_val))

            barrier = threading.Barrier(2)

            def finish(item: tuple[str, str, str]) -> tuple[int, str, str]:
                url, tx_name, tx_val = item
                barrier.wait(timeout=5.0)
                res = client.get(url, headers=_with_cookie(tx_name, tx_val), follow_redirects=False)
                token = _cookie_value(_parse_set_cookies(res.headers)["__Host-session"])
                return res.status_code, res.headers["location"], token

            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(finish, callbacks))

            assert [status for status, _, _ in results] == [302, 302]
            assert [loc for _, loc, _ in results] == [
                f"{TEST_EDITOR_ORIGIN}/#/auth/callback",
                f"{TEST_EDITOR_ORIGIN}/#/auth/callback",
            ]
            assert results[0][2] != results[1][2]
            assert auth_env.worker_admin.execute(
                "SELECT count(*) FROM public.sessions"
            ).fetchone() == (2,)
    finally:
        concurrent_engine.dispose()


def test_newest_transaction_cookie_succeeds_when_over_twenty_transactions_started(
    auth_env: _AuthEnv,
) -> None:
    _seed_auth_world(auth_env.worker_database)
    app = auth_env.make_app()

    with TestClient(app) as client:
        cookie_pairs: list[str] = []
        last_auth_url = ""
        for _ in range(21):
            start = client.post(
                "/api/v1/auth/sign-in",
                headers=SAME_ORIGIN_JSON_HEADERS,
                json={"provider": "local_mock"},
            )
            assert start.status_code == 200
            cookies = _parse_set_cookies(start.headers)
            [tx_name] = list(cookies)
            cookie_pairs.append(f"{tx_name}={_cookie_value(cookies[tx_name])}")
            last_auth_url = start.json()["authorizationUrl"]

        prov = httpx2.get(
            f"{last_auth_url}&persona=dhcw_admin_primary",
            follow_redirects=False,
        )
        loc = urlsplit(prov.headers["location"])
        cb = client.get(
            f"{loc.path}?{loc.query}",
            headers={"Cookie": "; ".join(cookie_pairs)},
            follow_redirects=False,
        )
        assert cb.status_code == 302
        assert cb.headers["location"] == f"{TEST_EDITOR_ORIGIN}/#/auth/callback"


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

        ghost_principal = make_principal(
            UUID("00000000-0000-0000-0000-000000000099"),
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

        admin_principal = make_principal(
            world.admin_id,
            session_id=UUID("00000000-0000-0000-0000-000000000097"),
        )
        app.dependency_overrides[get_current_principal] = lambda: admin_principal
        assert client.get("/api/v1/me").status_code == 403
        app.dependency_overrides.clear()


def test_session_touch_and_create_refusal_race_recovery(
    auth_env: _AuthEnv, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Covers touch-activity races and domain vs infrastructure `create_session` errors."""
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

    # 1. Domain refusals from `public.create_session` translate to `SessionRefusedError`.
    with pytest.raises(SessionRefusedError) as disabled_refusal:
        sess_svc.create_session(
            person_id=world.disabled_id,
            identity_id=world.disabled_identity_id,
            provider="local_mock",
            email="owen.hughes@dhcw.example",
            display_name="Owen Hughes",
        )
    assert disabled_refusal.value.reason == "person_disabled"

    with pytest.raises(SessionRefusedError) as missing_refusal:
        sess_svc.create_session(
            person_id=world.admin_id,
            identity_id=UUID("00000000-0000-0000-0000-000000000099"),
            provider="local_mock",
            email="rhiannon.davies@dhcw.example",
            display_name="Rhiannon Davies",
        )
    assert missing_refusal.value.reason == "session_create_refused"

    # Non-refusal DBAPIError propagates out of SessionService.create_session.
    pg_other = DBAPIError.instance(
        "SELECT 1", {}, psycopg.OperationalError("connection lost"), Exception
    )

    def _raise_other(_self: SessionRepository, _new_session: object) -> object:
        raise pg_other

    monkeypatch.setattr(SessionRepository, "create", _raise_other)
    with pytest.raises(DBAPIError):
        sess_svc.create_session(
            person_id=world.admin_id,
            identity_id=world.admin_identity_id,
            provider="local_mock",
            email="rhiannon.davies@dhcw.example",
            display_name="Rhiannon Davies",
        )
    monkeypatch.undo()

    # 2. Concurrent touch-activity races: benign contention keeps auth; revocation returns None.
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
    monkeypatch.undo()

    # 3. Person disabled between lookup and create_session redirects cleanly via callback route.
    def _refuse_create(_self: SessionService, **_kwargs: object) -> object:
        msg = "person_disabled"
        raise SessionRefusedError(msg)

    monkeypatch.setattr(SessionService, "create_session", _refuse_create)
    with TestClient(app) as client:
        res = _drive_mock_sign_in(client, "dhcw_admin_primary")
        assert res.callback.status_code == 302
        assert (
            res.callback.headers["location"]
            == f"{TEST_EDITOR_ORIGIN}/#/sign-in?error=person_disabled"
        )
        assert res.session_token is None
