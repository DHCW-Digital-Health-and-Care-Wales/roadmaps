"""In-repo Python/FastAPI loopback mock OIDC provider with persona picker and `/_test/*` hooks.

Imports `LOCAL_MOCK_ISSUER`, `NAMED_PERSONAS` and `UNINVITED_PERSONA` directly from
`tools.seed.personas` (D3, D5) and lives strictly under `tools/` (excluded from production
images and forbidden from `roadmaps_api` by `import-linter`).
"""

import base64
import hashlib
import hmac
import html
import json
import secrets
import time
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qs, urlencode

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from joserfc import jwt
from joserfc.jwk import OctKey, RSAKey

from roadmaps_api.identity.providers import (
    LOCAL_MOCK_CLIENT_ID,
    LOCAL_MOCK_CLIENT_SECRET,
)
from tools.seed.personas import (
    LOCAL_MOCK_ISSUER,
    NAMED_PERSONAS,
    UNINVITED_PERSONA,
    PersonaSpec,
)

ALL_PERSONAS: dict[str, PersonaSpec] = {
    persona.key: persona for persona in (*NAMED_PERSONAS, UNINVITED_PERSONA)
}


def _generate_signing_key() -> RSAKey:
    return RSAKey.generate_key(
        2048,
        parameters={"use": "sig", "alg": "RS256"},
        auto_kid=True,
    )


def _pkce_s256(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


@dataclass
class _AuthCode:
    persona: PersonaSpec
    redirect_uri: str
    nonce: str
    code_challenge: str
    client_id: str


@dataclass
class _FaultPreset:
    jwks_status: int | None = None
    token_status: int | None = None
    claim_overrides: dict[str, Any] = field(default_factory=dict)
    header_overrides: dict[str, Any] = field(default_factory=dict)
    sign_with_hs256: bool = False
    alg_none: bool = False


class MockOidcState:
    """In-memory signing keys, issued codes and one-shot fault presets for local/test runs."""

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.keys: list[RSAKey] = []
        self.codes: dict[str, _AuthCode] = {}
        self.fault: _FaultPreset | None = None
        self.reset()

    def reset(self) -> None:
        self.keys = [_generate_signing_key()]
        self.codes.clear()
        self.fault = None

    @property
    def active_key(self) -> RSAKey:
        return self.keys[-1]

    def rotate_key(self, *, drop_previous: bool = False) -> RSAKey:
        new_key = _generate_signing_key()
        if drop_previous:
            self.keys = [new_key]
        else:
            self.keys.append(new_key)
        return new_key

    def sign_id_token(self, auth_code: _AuthCode) -> str:
        now = int(time.time())
        claims: dict[str, Any] = {
            "iss": LOCAL_MOCK_ISSUER,
            "sub": auth_code.persona.subject,
            "aud": auth_code.client_id,
            "exp": now + 300,
            "iat": now,
            "nonce": auth_code.nonce,
            "email": auth_code.persona.email,
            "email_verified": True,
            "name": auth_code.persona.display_name,
        }
        fault = self.fault
        self.fault = None
        if fault is not None:
            for key, value in fault.claim_overrides.items():
                if value is None:
                    claims.pop(key, None)
                else:
                    claims[key] = value
            if fault.alg_none:
                header_b64 = (
                    base64.urlsafe_b64encode(json.dumps({"alg": "none"}).encode())
                    .rstrip(b"=")
                    .decode()
                )
                payload_b64 = (
                    base64.urlsafe_b64encode(json.dumps(claims).encode()).rstrip(b"=").decode()
                )
                return f"{header_b64}.{payload_b64}."
            if fault.sign_with_hs256:
                oct_key = OctKey.import_key(b"mock-hs256-test-secret-at-least-32b")
                return jwt.encode({"alg": "HS256", "kid": self.active_key.kid}, claims, oct_key)

        header: dict[str, Any] = {
            "alg": "RS256",
            "typ": "JWT",
            "kid": self.active_key.kid,
        }
        if fault is not None:
            header.update(fault.header_overrides)
        return jwt.encode(header, claims, self.active_key)


def _render_picker_html(params: dict[str, str]) -> str:
    hidden = "\n".join(
        f'<input type="hidden" name="{html.escape(k)}" value="{html.escape(v)}" />'
        for k, v in params.items()
    )
    buttons: list[str] = []
    for persona in (*NAMED_PERSONAS, UNINVITED_PERSONA):
        badges: list[str] = []
        if persona.disabled:
            badges.append("disabled")
        if persona.ended_in_tenants:
            badges.append("ended")
        if not persona.memberships:
            badges.append("uninvited")
        else:
            badges.extend(f"{slug}:{role.value}" for slug, role in persona.memberships)
        label = f"{persona.display_name} ({persona.email}) — {', '.join(badges)}"
        buttons.append(
            f'<button type="submit" name="persona" value="{html.escape(persona.key)}">'
            f"{html.escape(label)}</button>"
        )
    buttons.append(
        '<button type="submit" name="persona" value="__cancel__">Cancel sign-in</button>'
    )
    rows = "\n".join(f"<li>{btn}</li>" for btn in buttons)
    return (
        "<!doctype html>"
        '<html lang="en"><head><meta charset="utf-8"><title>Local Mock OIDC</title></head>'
        "<body><h1>Local Mock OIDC — Choose Persona</h1>"
        f'<form method="post" action="/authorize">{hidden}<ul>{rows}</ul></form>'
        "</body></html>"
    )


async def _parse_form_urlencoded(request: Request) -> dict[str, str]:
    raw = (await request.body()).decode("utf-8", errors="strict")
    parsed = parse_qs(raw, keep_blank_values=True)
    return {key: values[0] for key, values in parsed.items() if values}


def _extract_client_credentials(
    request: Request, form_client_id: str | None, form_client_secret: str | None
) -> tuple[str | None, str | None]:
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Basic "):
        try:
            decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
            cid, csecret = decoded.split(":", 1)
        except ValueError:
            return None, None
        return cid, csecret
    return form_client_id, form_client_secret


@dataclass(frozen=True, kw_only=True)
class _AuthorizeRequest:
    persona_key: str
    client_id: str
    redirect_uri: str
    auth_state: str
    nonce: str
    code_challenge: str


def _issue_authorize_redirect(
    state: MockOidcState, auth_req: _AuthorizeRequest
) -> RedirectResponse | JSONResponse:
    if auth_req.persona_key == "__cancel__":
        query = urlencode({"error": "access_denied", "state": auth_req.auth_state})
        return RedirectResponse(f"{auth_req.redirect_uri}?{query}", status_code=302)
    persona = ALL_PERSONAS.get(auth_req.persona_key)
    if persona is None:
        return JSONResponse({"error": "unknown_persona"}, status_code=400)
    code = secrets.token_urlsafe(32)
    state.codes[code] = _AuthCode(
        persona=persona,
        redirect_uri=auth_req.redirect_uri,
        nonce=auth_req.nonce,
        code_challenge=auth_req.code_challenge,
        client_id=auth_req.client_id,
    )
    query = urlencode({"code": code, "state": auth_req.auth_state})
    return RedirectResponse(f"{auth_req.redirect_uri}?{query}", status_code=302)


def _register_oidc_routes(app: FastAPI, state: MockOidcState) -> None:
    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/.well-known/openid-configuration")
    def discovery() -> dict[str, Any]:
        return {
            "issuer": LOCAL_MOCK_ISSUER,
            "authorization_endpoint": f"{state.base_url}/authorize",
            "token_endpoint": f"{state.base_url}/token",
            "jwks_uri": f"{state.base_url}/jwks",
            "response_types_supported": ["code"],
            "subject_types_supported": ["public"],
            "id_token_signing_alg_values_supported": ["RS256"],
            "code_challenge_methods_supported": ["S256"],
        }

    @app.get("/jwks")
    def jwks() -> JSONResponse:
        if state.fault is not None and state.fault.jwks_status is not None:
            status = state.fault.jwks_status
            state.fault = None
            return JSONResponse({"error": "mock_jwks_fault"}, status_code=status)
        return JSONResponse({"keys": [k.as_dict(private=False) for k in state.keys]})

    @app.get("/authorize", response_model=None)
    def authorize_get(request: Request) -> HTMLResponse | RedirectResponse | JSONResponse:
        qp = request.query_params
        client_id = qp.get("client_id", "")
        redirect_uri = qp.get("redirect_uri", "")
        response_type = qp.get("response_type", "")
        scope = qp.get("scope", "")
        auth_state = qp.get("state", "")
        nonce = qp.get("nonce", "")
        code_challenge = qp.get("code_challenge", "")
        code_challenge_method = qp.get("code_challenge_method", "")
        persona = qp.get("persona")
        if (
            client_id != LOCAL_MOCK_CLIENT_ID
            or response_type != "code"
            or code_challenge_method != "S256"
            or not code_challenge
            or not auth_state
            or not nonce
        ):
            return JSONResponse({"error": "invalid_request"}, status_code=400)
        if persona is not None:
            return _issue_authorize_redirect(
                state,
                _AuthorizeRequest(
                    persona_key=persona,
                    client_id=client_id,
                    redirect_uri=redirect_uri,
                    auth_state=auth_state,
                    nonce=nonce,
                    code_challenge=code_challenge,
                ),
            )
        return HTMLResponse(
            _render_picker_html(
                {
                    "client_id": client_id,
                    "redirect_uri": redirect_uri,
                    "response_type": response_type,
                    "scope": scope,
                    "state": auth_state,
                    "nonce": nonce,
                    "code_challenge": code_challenge,
                    "code_challenge_method": code_challenge_method,
                }
            )
        )

    @app.post("/authorize", response_model=None)
    async def authorize_post(request: Request) -> RedirectResponse | JSONResponse:
        form = await _parse_form_urlencoded(request)
        client_id = form.get("client_id", "")
        if client_id != LOCAL_MOCK_CLIENT_ID:
            return JSONResponse({"error": "invalid_client"}, status_code=400)
        return _issue_authorize_redirect(
            state,
            _AuthorizeRequest(
                persona_key=form.get("persona", ""),
                client_id=client_id,
                redirect_uri=form.get("redirect_uri", ""),
                auth_state=form.get("state", ""),
                nonce=form.get("nonce", ""),
                code_challenge=form.get("code_challenge", ""),
            ),
        )


def _register_token_and_test_routes(app: FastAPI, state: MockOidcState) -> None:
    @app.post("/token")
    async def token(request: Request) -> JSONResponse:
        if state.fault is not None and state.fault.token_status is not None:
            status = state.fault.token_status
            state.fault = None
            return JSONResponse({"error": "mock_token_fault"}, status_code=status)

        form = await _parse_form_urlencoded(request)
        cid, csecret = _extract_client_credentials(
            request, form.get("client_id"), form.get("client_secret")
        )
        if cid != LOCAL_MOCK_CLIENT_ID or csecret != LOCAL_MOCK_CLIENT_SECRET:
            return JSONResponse({"error": "invalid_client"}, status_code=401)
        if form.get("grant_type") != "authorization_code":
            return JSONResponse({"error": "unsupported_grant_type"}, status_code=400)
        code = form.get("code", "")
        redirect_uri = form.get("redirect_uri", "")
        code_verifier = form.get("code_verifier", "")
        auth_code = state.codes.get(code)
        if auth_code is None or auth_code.redirect_uri != redirect_uri:
            return JSONResponse({"error": "invalid_grant"}, status_code=400)
        if not hmac.compare_digest(_pkce_s256(code_verifier), auth_code.code_challenge):
            return JSONResponse({"error": "invalid_grant"}, status_code=400)
        del state.codes[code]
        return JSONResponse(
            {
                "access_token": "mock-access-token",
                "token_type": "Bearer",
                "expires_in": 300,
                "id_token": state.sign_id_token(auth_code),
            }
        )

    @app.post("/_test/rotate-key")
    def test_rotate_key(payload: dict[str, Any] | None = None) -> dict[str, Any]:
        drop_previous = bool((payload or {}).get("dropPrevious", False))
        new_key = state.rotate_key(drop_previous=drop_previous)
        return {"kid": new_key.kid, "keyCount": len(state.keys)}

    @app.post("/_test/fault")
    def test_set_fault(payload: dict[str, Any]) -> dict[str, str]:
        state.fault = _FaultPreset(
            jwks_status=payload.get("jwksStatus"),
            token_status=payload.get("tokenStatus"),
            claim_overrides=dict(payload.get("claimOverrides", {})),
            header_overrides=dict(payload.get("headerOverrides", {})),
            sign_with_hs256=bool(payload.get("signWithHs256", False)),
            alg_none=bool(payload.get("algNone", False)),
        )
        return {"status": "ok"}

    @app.post("/_test/reset")
    def test_reset() -> dict[str, str]:
        state.reset()
        return {"status": "ok"}


def create_mock_oidc_app(*, base_url: str) -> FastAPI:
    """Builds the local mock OIDC ASGI app bound to `base_url`."""
    state = MockOidcState(base_url=base_url)
    app = FastAPI(title="Local Mock OIDC Provider", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.mock = state
    _register_oidc_routes(app, state)
    _register_token_and_test_routes(app, state)
    return app
