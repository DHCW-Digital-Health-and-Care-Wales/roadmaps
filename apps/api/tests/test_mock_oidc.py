"""D3, D5 & S4: local loopback mock OIDC provider and `/_test/*` control endpoints."""

import base64
import hashlib
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient

from roadmaps_api.identity.providers import (
    LOCAL_MOCK_CLIENT_ID,
    LOCAL_MOCK_CLIENT_SECRET,
    LOCAL_MOCK_ISSUER,
)
from roadmaps_api.settings import CLOUD_RUN_MARKERS, ENV, SettingsError
from tools.mock_oidc.app import create_mock_oidc_app
from tools.mock_oidc.server import validate_mock_environment
from tools.seed.personas import NAMED_PERSONAS, UNINVITED_PERSONA


def _pkce_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def test_mock_oidc_serves_discovery_jwks_picker_and_single_use_pkce_code() -> None:
    app = create_mock_oidc_app(base_url="http://127.0.0.1:21646")
    with TestClient(app) as client:
        disc = client.get("/.well-known/openid-configuration")
        assert disc.status_code == 200
        body = disc.json()
        base = "http://127.0.0.1:21646"
        assert body["issuer"] == LOCAL_MOCK_ISSUER
        assert body["authorization_endpoint"] == f"{base}/authorize"
        assert body["token_endpoint"] == f"{base}/token"
        assert body["jwks_uri"] == f"{base}/jwks"

        jwks = client.get("/jwks")
        assert jwks.status_code == 200
        assert len(jwks.json()["keys"]) == 1

        verifier = "test-pkce-verifier-" + "x" * 30
        challenge = _pkce_challenge(verifier)
        auth_params = {
            "client_id": LOCAL_MOCK_CLIENT_ID,
            "redirect_uri": "http://localhost:21640/api/v1/auth/callback/local_mock",
            "response_type": "code",
            "scope": "openid email profile",
            "state": "st-1",
            "nonce": "no-1",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
        picker = client.get("/authorize", params=auth_params)
        assert picker.status_code == 200
        for persona in (*NAMED_PERSONAS, UNINVITED_PERSONA):
            assert persona.display_name in picker.text
            assert persona.email in picker.text

        # Submit picker for primary admin.
        chosen = client.post(
            "/authorize",
            data={**auth_params, "persona": NAMED_PERSONAS[0].key},
            follow_redirects=False,
        )
        assert chosen.status_code == 302
        redirect = urlsplit(chosen.headers["location"])
        query = parse_qs(redirect.query)
        assert query["state"] == ["st-1"]
        code = query["code"][0]

        # Wrong PKCE verifier is refused.
        bad_pkce = client.post(
            "/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": auth_params["redirect_uri"],
                "code_verifier": "wrong-verifier",
                "client_id": LOCAL_MOCK_CLIENT_ID,
                "client_secret": LOCAL_MOCK_CLIENT_SECRET,
            },
        )
        assert bad_pkce.status_code == 400

        # Correct PKCE verifier succeeds and consumes the code.
        ok = client.post(
            "/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": auth_params["redirect_uri"],
                "code_verifier": verifier,
                "client_id": LOCAL_MOCK_CLIENT_ID,
                "client_secret": LOCAL_MOCK_CLIENT_SECRET,
            },
        )
        assert ok.status_code == 200
        assert "id_token" in ok.json()

        # Reusing the same code fails.
        replay = client.post(
            "/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": auth_params["redirect_uri"],
                "code_verifier": verifier,
                "client_id": LOCAL_MOCK_CLIENT_ID,
                "client_secret": LOCAL_MOCK_CLIENT_SECRET,
            },
        )
        assert replay.status_code == 400

        # Cancel flow returns error=access_denied.
        cancelled = client.post(
            "/authorize",
            data={**auth_params, "persona": "__cancel__"},
            follow_redirects=False,
        )
        assert cancelled.status_code == 302
        cancel_q = parse_qs(urlsplit(cancelled.headers["location"]).query)
        assert cancel_q["error"] == ["access_denied"]
        assert cancel_q["state"] == ["st-1"]

        # /_test/rotate-key adds a new signing key; /_test/reset restores initial state.
        rotated = client.post("/_test/rotate-key", json={})
        assert rotated.status_code == 200
        assert rotated.json()["keyCount"] == 2
        assert client.post("/_test/reset").status_code == 200


@pytest.mark.parametrize(
    "bad_env",
    [
        {},
        {ENV: "production"},
        {ENV: "staging"},
        *({ENV: "local", marker: "1"} for marker in CLOUD_RUN_MARKERS),
        *({ENV: "test", marker: "1"} for marker in CLOUD_RUN_MARKERS),
    ],
)
def test_mock_oidc_server_refuses_outside_local_test_or_on_cloud_run(
    bad_env: dict[str, str],
) -> None:
    with pytest.raises(SettingsError):
        validate_mock_environment(bad_env)


def test_mock_oidc_fault_presets_invalid_requests_and_cli_entrypoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import subprocess  # noqa: PLC0415
    import sys  # noqa: PLC0415
    from pathlib import Path  # noqa: PLC0415

    import tools.mock_oidc.server as mock_server  # noqa: PLC0415

    app = create_mock_oidc_app(base_url="http://127.0.0.1:21646")
    verifier = "test-pkce-verifier-" + "y" * 30
    challenge = _pkce_challenge(verifier)
    auth_params = {
        "client_id": LOCAL_MOCK_CLIENT_ID,
        "redirect_uri": "http://localhost:21640/api/v1/auth/callback/local_mock",
        "response_type": "code",
        "scope": "openid email profile",
        "state": "st-2",
        "nonce": "no-2",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }

    with TestClient(app) as client:
        # Invalid authorize GET / POST and unknown persona.
        assert client.get("/authorize", params={"client_id": "wrong"}).status_code == 400
        assert client.post("/authorize", data={"client_id": "wrong"}).status_code == 400
        assert (
            client.post("/authorize", data={**auth_params, "persona": "missing"}).status_code == 400
        )

        # Malformed Basic header and invalid client / grant_type on /token.
        assert (
            client.post(
                "/token",
                headers={"Authorization": "Basic !!!invalid-base64!!!"},
                data={"grant_type": "authorization_code"},
            ).status_code
            == 401
        )
        assert (
            client.post(
                "/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": LOCAL_MOCK_CLIENT_ID,
                    "client_secret": LOCAL_MOCK_CLIENT_SECRET,
                },
            ).status_code
            == 400
        )

        # Rotate key dropping previous.
        rot = client.post("/_test/rotate-key", json={"dropPrevious": True})
        assert rot.json()["keyCount"] == 1

        # JWKS and token HTTP fault presets.
        client.post("/_test/fault", json={"jwksStatus": 503})
        assert client.get("/jwks").status_code == 503
        client.post("/_test/fault", json={"tokenStatus": 502})
        assert client.post("/token", data={}).status_code == 502

        # Claim overrides (set + remove), header overrides, and HS256 signing preset.
        for fault_body in (
            {
                "claimOverrides": {"email": None, "hd": "other.example"},
                "headerOverrides": {"kid": "override-kid"},
            },
            {"signWithHs256": True},
        ):
            client.post("/_test/fault", json=fault_body)
            res = client.get(
                "/authorize",
                params={**auth_params, "persona": NAMED_PERSONAS[0].key},
                follow_redirects=False,
            )
            code = parse_qs(urlsplit(res.headers["location"]).query)["code"][0]
            tok = client.post(
                "/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": auth_params["redirect_uri"],
                    "code_verifier": verifier,
                    "client_id": LOCAL_MOCK_CLIENT_ID,
                    "client_secret": LOCAL_MOCK_CLIENT_SECRET,
                },
            )
            assert tok.status_code == 200
            assert "id_token" in tok.json()

    # server.main runs uvicorn in local env and exits 1 in production env (and via python -m).
    calls: list[tuple[str, int]] = []
    monkeypatch.setattr(
        mock_server.uvicorn,
        "run",
        lambda _app, *, host, port, log_level: calls.append((host, port)),  # noqa: ARG005
    )
    assert mock_server.main(["--port", "21646"], environ={ENV: "local"}) == 0
    assert calls == [("127.0.0.1", 21646)]
    assert mock_server.main([], environ={ENV: "production"}) == 1

    import os  # noqa: PLC0415

    proc = subprocess.run(
        [sys.executable, "-m", "tools.mock_oidc"],
        cwd=Path(__file__).parent.parent,
        env={**os.environ, ENV: "production"},
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert proc.returncode == 1
