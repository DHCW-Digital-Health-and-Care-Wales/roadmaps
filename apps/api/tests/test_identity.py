"""S1, S4 & D4: OIDC client, JWKS cache, strict RS256/claim validation and outbound HTTP bounds.

Uses a custom `requests.adapters.BaseAdapter` for deterministic mocked Google transports
(D4) so every refused claim, key rollover, outage retention, rate-limited refetch, timeout,
and redirect refusal runs without sockets.
"""

import base64
import json
import time
from collections.abc import Callable
from typing import Any, override
from urllib.parse import parse_qs, urlsplit

import pytest
import requests
from joserfc import jws, jwt
from joserfc.jwk import ECKey, KeySet, OctKey, RSAKey
from requests.adapters import BaseAdapter

from roadmaps_api.identity.client import (
    OidcClient,
    OidcError,
    OidcProviderError,
    OidcVerificationError,
    TokenExchangeRequest,
    _validate_id_token_claims,
)
from roadmaps_api.identity.jwks import (
    OUTBOUND_TIMEOUT,
    UNKNOWN_KID_REFETCH_INTERVAL_SECONDS,
    JwksCache,
)
from roadmaps_api.identity.providers import (
    GOOGLE_CANONICAL_ISSUER,
    GOOGLE_DISCOVERY_URL,
    LOCAL_MOCK_ISSUER,
    OidcProviderId,
    ProviderConfig,
    build_provider_configs,
    provider_for_issuer,
    validate_deployed_providers,
)
from roadmaps_api.settings import Environment, Settings, SettingsError

GOOGLE_CLIENT_ID = "google-client-123"
GOOGLE_CLIENT_SECRET = "google-secret-456"  # noqa: S105 - synthetic test secret
GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"  # noqa: S105 - standard endpoint URL
GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs"
EDITOR_ORIGIN = "https://roadmaps.dhcw.example"


def _make_rsa_key(kid: str) -> RSAKey:
    return RSAKey.generate_key(2048, parameters={"kid": kid, "use": "sig", "alg": "RS256"})


class RecordingAdapter(BaseAdapter):
    """In-memory `requests.adapters.BaseAdapter` asserting timeouts and `allow_redirects=False`."""

    def __init__(
        self,
        handler: Callable[[requests.PreparedRequest, Any], tuple[int, dict[str, str], bytes]],
    ) -> None:
        super().__init__()
        self._handler = handler
        self.calls: list[tuple[str, str, Any]] = []

    @override
    def send(
        self,
        request: requests.PreparedRequest,
        stream: bool = False,
        timeout: float | tuple[float | None, float | None] | None = None,
        verify: bool | str = True,
        cert: bytes | str | tuple[bytes | str, bytes | str] | None = None,
        proxies: dict[str, str] | None = None,
    ) -> requests.Response:
        assert request.url is not None
        assert request.method is not None
        self.calls.append((request.method, request.url, timeout))
        status, headers, body = self._handler(request, timeout)
        response = requests.Response()
        response.status_code = status
        response.headers.update(headers)
        response._content = body  # noqa: SLF001 - standard BaseAdapter response construction
        response.url = request.url
        response.request = request
        return response

    def close(self) -> None:
        return None


def _json_response(payload: dict[str, Any], status: int = 200) -> tuple[int, dict[str, str], bytes]:
    return status, {"Content-Type": "application/json"}, json.dumps(payload).encode("utf-8")


def _google_settings() -> Settings:
    return Settings(
        environment=Environment.TEST,
        database_url="postgresql+psycopg://roadmaps:roadmaps@127.0.0.1:1/roadmaps",
        allowed_hosts=("roadmaps.dhcw.example",),
        editor_origin=EDITOR_ORIGIN,
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        google_allowed_hd=("wales.nhs.uk",),
    )


def _valid_claims(now: int, **overrides: object) -> dict[str, Any]:
    claims: dict[str, Any] = {
        "iss": GOOGLE_CANONICAL_ISSUER,
        "sub": "google-sub-001",
        "aud": GOOGLE_CLIENT_ID,
        "exp": now + 300,
        "iat": now,
        "nonce": "expected-nonce",
        "email": "rhiannon.davies@wales.nhs.uk",
        "email_verified": True,
        "hd": "wales.nhs.uk",
        "name": "Rhiannon Davies",
    }
    claims.update(overrides)
    return claims


def _sign_rs256(key: RSAKey, claims: dict[str, Any], *, kid: str | None = None) -> str:
    header: dict[str, Any] = {"alg": "RS256", "typ": "JWT"}
    effective_kid = key.kid if kid is None else kid
    if effective_kid:
        header["kid"] = effective_kid
    return jwt.encode(header, claims, key)


def _exchange_request(*, code: str = "auth-code", now: int) -> TokenExchangeRequest:
    return TokenExchangeRequest(
        code=code,
        redirect_uri=f"{EDITOR_ORIGIN}/api/v1/auth/callback/google",
        code_verifier="v" * 43,
        expected_nonce="expected-nonce",
        now=now,
    )


def _status_or_body(
    status: int, redirect_to: str, error_body: bytes, ok_payload: dict[str, Any]
) -> tuple[int, dict[str, str], bytes]:
    if status == 302:
        return 302, {"Location": redirect_to}, b""
    if status != 200:
        return status, {"Content-Type": "application/json"}, error_body
    return _json_response(ok_payload)


def _make_google_transport(
    keys: list[RSAKey],
    id_token_factory: Callable[[], str],
    *,
    discovery_override: dict[str, Any] | None = None,
    jwks_status: list[int] | None = None,
    token_status: int = 200,
) -> tuple[RecordingAdapter, dict[str, int]]:
    counts = {"discovery": 0, "jwks": 0, "token": 0}
    discovery = discovery_override or {
        "issuer": GOOGLE_CANONICAL_ISSUER,
        "authorization_endpoint": GOOGLE_AUTH_ENDPOINT,
        "token_endpoint": GOOGLE_TOKEN_ENDPOINT,
        "jwks_uri": GOOGLE_JWKS_URI,
    }

    def handle(
        request: requests.PreparedRequest, timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        assert timeout == OUTBOUND_TIMEOUT
        if request.url == GOOGLE_DISCOVERY_URL:
            counts["discovery"] += 1
            return _json_response(discovery)
        if request.url == GOOGLE_JWKS_URI:
            counts["jwks"] += 1
            status = jwks_status.pop(0) if jwks_status else 200
            return _status_or_body(
                status,
                "https://evil.example/jwks",
                b"outage",
                {"keys": [k.as_dict(private=False) for k in keys]},
            )
        if request.url == GOOGLE_TOKEN_ENDPOINT:
            counts["token"] += 1
            return _status_or_body(
                token_status,
                "https://evil.example/token",
                b'{"error":"bad"}',
                {
                    "access_token": "provider-access-token",
                    "token_type": "Bearer",
                    "id_token": id_token_factory(),
                },
            )
        pytest.fail(f"Unexpected outbound URL: {request.url}")

    return RecordingAdapter(handle), counts


def test_google_authorization_url_includes_pkce_s256_scopes_and_prompt_select_account() -> None:
    key = _make_rsa_key("k1")
    adapter, _counts = _make_google_transport([key], lambda: "")
    client = OidcClient(build_provider_configs(_google_settings()), adapter=adapter)

    url = client.create_authorization_url(
        OidcProviderId.GOOGLE,
        redirect_uri=f"{EDITOR_ORIGIN}/api/v1/auth/callback/google",
        state="state-abc",
        nonce="nonce-xyz",
        code_verifier="verifier-" + "a" * 40,
    )
    parts = urlsplit(url)
    query = parse_qs(parts.query)

    assert f"{parts.scheme}://{parts.netloc}{parts.path}" == GOOGLE_AUTH_ENDPOINT
    assert query["client_id"] == [GOOGLE_CLIENT_ID]
    assert query["redirect_uri"] == [f"{EDITOR_ORIGIN}/api/v1/auth/callback/google"]
    assert query["response_type"] == ["code"]
    assert query["response_mode"] == ["query"]
    assert query["scope"] == ["openid email profile"]
    assert query["state"] == ["state-abc"]
    assert query["nonce"] == ["nonce-xyz"]
    assert query["code_challenge_method"] == ["S256"]
    assert len(query["code_challenge"][0]) >= 40
    # D10: always pass prompt=select_account to Google.
    assert query["prompt"] == ["select_account"]


def test_google_short_issuer_normalises_to_canonical_url_and_accepts_case_insensitive_hd() -> None:
    key = _make_rsa_key("k1")
    now = int(time.time())
    token = _sign_rs256(
        key,
        _valid_claims(
            now, iss="accounts.google.com", hd="WALES.NHS.UK", exp=now - 59, iat=now + 59
        ),
    )
    adapter, _counts = _make_google_transport([key], lambda: token)
    client = OidcClient(build_provider_configs(_google_settings()), adapter=adapter)

    verified = client.exchange_code_and_verify(
        OidcProviderId.GOOGLE,
        _exchange_request(code="auth-code-1", now=now),
    )
    assert verified.provider is OidcProviderId.GOOGLE
    assert verified.canonical_issuer == GOOGLE_CANONICAL_ISSUER
    assert verified.subject == "google-sub-001"
    assert verified.email == "rhiannon.davies@wales.nhs.uk"
    assert verified.display_name == "Rhiannon Davies"


def test_multi_audience_with_matching_azp_is_accepted() -> None:
    key = _make_rsa_key("k1")
    now = int(time.time())
    token = _sign_rs256(
        key,
        _valid_claims(now, aud=[GOOGLE_CLIENT_ID, "other-aud"], azp=GOOGLE_CLIENT_ID),
    )
    adapter, _counts = _make_google_transport([key], lambda: token)
    client = OidcClient(build_provider_configs(_google_settings()), adapter=adapter)

    verified = client.exchange_code_and_verify(
        OidcProviderId.GOOGLE,
        _exchange_request(code="c", now=now),
    )
    assert verified.subject == "google-sub-001"


def _alg_none_token(claims: dict[str, Any]) -> str:
    h = base64.urlsafe_b64encode(json.dumps({"alg": "none"}).encode()).rstrip(b"=").decode()
    p = base64.urlsafe_b64encode(json.dumps(claims).encode()).rstrip(b"=").decode()
    return f"{h}.{p}."


def _hs256_token(claims: dict[str, Any]) -> str:
    oct_key = OctKey.import_key(b"symmetric-secret-key-at-least-32-bytes")
    return jwt.encode({"alg": "HS256", "kid": "k1"}, claims, oct_key)


def _rs384_token(key: RSAKey, claims: dict[str, Any]) -> str:
    rs384_key = RSAKey.import_key(key.as_pem(private=True), parameters={"kid": "k1"})
    return jwt.encode({"alg": "RS384", "kid": "k1"}, claims, rs384_key, algorithms=["RS384"])


def _es256_token(claims: dict[str, Any]) -> str:
    ec_key = ECKey.generate_key("P-256", parameters={"kid": "ec1", "alg": "ES256"})
    return jwt.encode({"alg": "ES256", "kid": "ec1"}, claims, ec_key)


def _tampered_signature_token(key: RSAKey, claims: dict[str, Any]) -> str:
    raw = _sign_rs256(key, claims)
    head, payload, sig = raw.split(".")
    flipped = ("A" if sig[0] != "A" else "B") + sig[1:]
    return f"{head}.{payload}.{flipped}"


REFUSED_TOKEN_CASES: dict[str, Callable[[RSAKey, int], str]] = {
    "wrong iss": lambda k, now: _sign_rs256(k, _valid_claims(now, iss="https://evil.example")),
    "missing iss": lambda k, now: _sign_rs256(
        k, {c: v for c, v in _valid_claims(now).items() if c != "iss"}
    ),
    "wrong aud": lambda k, now: _sign_rs256(k, _valid_claims(now, aud="other-client")),
    # D4 explicit requirement: wrong aud with matching azp MUST be refused.
    "wrong aud with matching azp": lambda k, now: _sign_rs256(
        k, _valid_claims(now, aud="other-client", azp=GOOGLE_CLIENT_ID)
    ),
    "wrong aud list with matching azp": lambda k, now: _sign_rs256(
        k, _valid_claims(now, aud=["other-a", "other-b"], azp=GOOGLE_CLIENT_ID)
    ),
    "multi-aud missing azp": lambda k, now: _sign_rs256(
        k, _valid_claims(now, aud=[GOOGLE_CLIENT_ID, "other-aud"])
    ),
    "multi-aud wrong azp": lambda k, now: _sign_rs256(
        k, _valid_claims(now, aud=[GOOGLE_CLIENT_ID, "other-aud"], azp="other-aud")
    ),
    "single aud wrong azp": lambda k, now: _sign_rs256(
        k, _valid_claims(now, aud=GOOGLE_CLIENT_ID, azp="other-client")
    ),
    "single aud empty azp": lambda k, now: _sign_rs256(
        k, _valid_claims(now, aud=GOOGLE_CLIENT_ID, azp="")
    ),
    "expired exp past 60s skew": lambda k, now: _sign_rs256(k, _valid_claims(now, exp=now - 61)),
    "future iat past 60s skew": lambda k, now: _sign_rs256(k, _valid_claims(now, iat=now + 61)),
    "future nbf past 60s skew": lambda k, now: _sign_rs256(k, _valid_claims(now, nbf=now + 61)),
    "boolean exp": lambda k, now: _sign_rs256(k, _valid_claims(now, exp=True)),
    "boolean iat": lambda k, now: _sign_rs256(k, _valid_claims(now, iat=True)),
    "boolean nbf": lambda k, now: _sign_rs256(k, _valid_claims(now, nbf=True)),
    "wrong nonce": lambda k, now: _sign_rs256(k, _valid_claims(now, nonce="wrong-nonce")),
    "missing nonce": lambda k, now: _sign_rs256(
        k, {c: v for c, v in _valid_claims(now).items() if c != "nonce"}
    ),
    "non-string nonce": lambda k, now: _sign_rs256(k, _valid_claims(now, nonce=12345)),
    "alg none": lambda _k, now: _alg_none_token(_valid_claims(now)),
    "alg HS256": lambda _k, now: _hs256_token(_valid_claims(now)),
    "alg RS384": lambda k, now: _rs384_token(k, _valid_claims(now)),
    "alg ES256": lambda _k, now: _es256_token(_valid_claims(now)),
    "tampered signature": lambda k, now: _tampered_signature_token(k, _valid_claims(now)),
    "wrong hd": lambda k, now: _sign_rs256(k, _valid_claims(now, hd="evil.example")),
    "missing hd": lambda k, now: _sign_rs256(
        k, {c: v for c, v in _valid_claims(now).items() if c != "hd"}
    ),
    "email_verified false": lambda k, now: _sign_rs256(k, _valid_claims(now, email_verified=False)),
    "email_verified missing": lambda k, now: _sign_rs256(
        k, {c: v for c, v in _valid_claims(now).items() if c != "email_verified"}
    ),
    "email_verified string true": lambda k, now: _sign_rs256(
        k, _valid_claims(now, email_verified="true")
    ),
    "email_verified int 1": lambda k, now: _sign_rs256(k, _valid_claims(now, email_verified=1)),
    "blank sub": lambda k, now: _sign_rs256(k, _valid_claims(now, sub="   ")),
    "blank email": lambda k, now: _sign_rs256(k, _valid_claims(now, email="   ")),
    "non-compact garbage": lambda _k, _now: "not-a-jwt",
    "unencoded JWS payload": lambda k, _now: jws.serialize_compact(
        {"alg": "RS256", "kid": "k1"}, b"not-json", k
    ),
}


@pytest.mark.parametrize("build_token", REFUSED_TOKEN_CASES.values(), ids=REFUSED_TOKEN_CASES)
def test_every_refused_jwt_claim_and_algorithm_is_rejected(
    build_token: Callable[[RSAKey, int], str],
) -> None:
    key = _make_rsa_key("k1")
    now = int(time.time())
    token = build_token(key, now)
    adapter, _counts = _make_google_transport([key], lambda: token)
    client = OidcClient(build_provider_configs(_google_settings()), adapter=adapter)

    with pytest.raises(OidcVerificationError):
        client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))


def test_jwks_key_rollover_rate_limited_refetch_and_stale_key_retention() -> None:
    key1 = _make_rsa_key("k1")
    key2 = _make_rsa_key("k2")
    key3 = _make_rsa_key("k3")
    active_keys: list[RSAKey] = [key1]
    jwks_statuses: list[int] = []
    current_token = ""
    clock = [1000.0]

    adapter, counts = _make_google_transport(
        active_keys, lambda: current_token, jwks_status=jwks_statuses
    )
    cache = JwksCache(adapter=adapter, clock=lambda: clock[0])
    configs = build_provider_configs(_google_settings())
    client = OidcClient(configs, jwks_cache=cache, adapter=adapter)
    now = int(time.time())

    # 1. Warm cache with key1.
    current_token = _sign_rs256(key1, _valid_claims(now))
    client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(code="c1", now=now))
    assert counts["jwks"] == 1

    # 2. Cached key1 reused without extra JWKS fetch.
    client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(code="c2", now=now))
    assert counts["jwks"] == 1

    # 3. Provider rotates to key2 -> unknown kid triggers ONE refetch and verifies!
    clock[0] += UNKNOWN_KID_REFETCH_INTERVAL_SECONDS + 1.0
    active_keys.append(key2)
    current_token = _sign_rs256(key2, _valid_claims(now))
    verified = client.exchange_code_and_verify(
        OidcProviderId.GOOGLE, _exchange_request(code="c3", now=now)
    )
    assert verified.subject == "google-sub-001"
    assert counts["jwks"] == 2

    # 4. Flood of unknown kid (key3) within rate-limit window triggers ZERO extra fetches.
    current_token = _sign_rs256(key3, _valid_claims(now))
    for _ in range(3):
        with pytest.raises(OidcVerificationError):
            client.exchange_code_and_verify(
                OidcProviderId.GOOGLE, _exchange_request(code="c-flood", now=now)
            )
    assert counts["jwks"] == 2

    # 5. After cache TTL expires during a provider outage (503), stale keys are retained!
    clock[0] += 7200.0
    jwks_statuses.append(503)
    current_token = _sign_rs256(key2, _valid_claims(now))
    verified_during_outage = client.exchange_code_and_verify(
        OidcProviderId.GOOGLE, _exchange_request(code="c-outage", now=now)
    )
    assert verified_during_outage.subject == "google-sub-001"
    assert counts["jwks"] == 3


def test_cold_jwks_outage_and_redirects_fail_closed() -> None:
    key = _make_rsa_key("k1")
    now = int(time.time())
    token = _sign_rs256(key, _valid_claims(now))

    # Cold JWKS 503 fails closed.
    adapter_503, _ = _make_google_transport([key], lambda: token, jwks_status=[503])
    client_503 = OidcClient(build_provider_configs(_google_settings()), adapter=adapter_503)
    with pytest.raises(OidcProviderError):
        client_503.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))

    # JWKS 302 redirect is refused (allow_redirects=False).
    adapter_302, _ = _make_google_transport([key], lambda: token, jwks_status=[302])
    client_302 = OidcClient(build_provider_configs(_google_settings()), adapter=adapter_302)
    with pytest.raises(OidcProviderError):
        client_302.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))

    # Token endpoint 302 redirect is refused (allow_redirects=False).
    adapter_tok_302, _ = _make_google_transport([key], lambda: token, token_status=302)
    client_tok_302 = OidcClient(build_provider_configs(_google_settings()), adapter=adapter_tok_302)
    with pytest.raises(OidcError):
        client_tok_302.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))

    # Discovery returning a non-HTTPS or mismatched-issuer document fails closed.
    bad_discovery = {
        "issuer": "https://evil.example",
        "authorization_endpoint": GOOGLE_AUTH_ENDPOINT,
        "token_endpoint": GOOGLE_TOKEN_ENDPOINT,
        "jwks_uri": GOOGLE_JWKS_URI,
    }
    adapter_bad_disc, _ = _make_google_transport(
        [key], lambda: token, discovery_override=bad_discovery
    )
    configs = build_provider_configs(_google_settings())
    client_bad_disc = OidcClient(configs, adapter=adapter_bad_disc)
    with pytest.raises(OidcProviderError):
        client_bad_disc.create_authorization_url(
            OidcProviderId.GOOGLE,
            redirect_uri=f"{EDITOR_ORIGIN}/api/v1/auth/callback/google",
            state="s",
            nonce="n",
            code_verifier="v" * 43,
        )


def test_build_provider_configs_refuses_local_mock_in_production_or_cloud_run() -> None:
    prod_with_mock = Settings(
        environment=Environment.PRODUCTION,
        database_url="postgresql+psycopg://roadmaps:roadmaps@127.0.0.1:1/roadmaps",
        allowed_hosts=("roadmaps.dhcw.example",),
        editor_origin=EDITOR_ORIGIN,
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        google_allowed_hd=("wales.nhs.uk",),
        local_mock_oidc_url="http://127.0.0.1:8001",
    )
    with pytest.raises(SettingsError) as exc_info:
        build_provider_configs(prod_with_mock)
    assert "ROADMAPS_LOCAL_MOCK_OIDC_URL" in exc_info.value.invalid

    local_on_cloud_run = Settings(
        environment=Environment.LOCAL,
        database_url="postgresql+psycopg://roadmaps:roadmaps@127.0.0.1:1/roadmaps",
        allowed_hosts=("localhost",),
        editor_origin="http://localhost:5173",
        local_mock_oidc_url="http://127.0.0.1:8001",
        on_cloud_run=True,
    )
    with pytest.raises(SettingsError):
        build_provider_configs(local_on_cloud_run)

    # Confirm KeySet and LOCAL_MOCK_ISSUER consistency with tools.seed.personas.
    assert LOCAL_MOCK_ISSUER == "http://127.0.0.1/local-mock-oidc"
    assert isinstance(KeySet([_make_rsa_key("k1")]), KeySet)

    # Direct provider-registry defense-in-depth and issuer-to-provider mapping.
    unsafe_config = ProviderConfig(
        provider=OidcProviderId.LOCAL_MOCK,
        canonical_issuer=LOCAL_MOCK_ISSUER,
        accepted_issuers=frozenset({LOCAL_MOCK_ISSUER}),
        discovery_url="http://127.0.0.1:8001/.well-known/openid-configuration",
        client_id="c",
        client_secret="s",  # noqa: S106 - synthetic test secret
    )
    with pytest.raises(SettingsError):
        validate_deployed_providers({OidcProviderId.LOCAL_MOCK: unsafe_config})

    assert provider_for_issuer(GOOGLE_CANONICAL_ISSUER) == "google"
    assert provider_for_issuer(LOCAL_MOCK_ISSUER) == "local_mock"
    assert (
        provider_for_issuer(
            "https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0"
        )
        == "entra"
    )
    with pytest.raises(ValueError, match="Unrecognised"):
        provider_for_issuer("https://unknown.example")


def test_jwks_and_client_edge_error_paths() -> None:
    key = _make_rsa_key("k1")
    unknown_key = _make_rsa_key("k-unknown")
    configs = build_provider_configs(_google_settings())
    google_cfg = configs[OidcProviderId.GOOGLE]
    now = int(time.time())

    # Direct alg guard in _validate_id_token_claims.
    with pytest.raises(OidcVerificationError):
        _validate_id_token_claims(
            google_cfg,
            {"alg": "HS256"},
            _valid_claims(now),
            expected_nonce="expected-nonce",
            now=now,
        )

    # Unconfigured provider raises OidcProviderError.
    with pytest.raises(OidcProviderError):
        OidcClient({}).create_authorization_url(
            OidcProviderId.GOOGLE,
            redirect_uri=f"{EDITOR_ORIGIN}/api/v1/auth/callback/google",
            state="s",
            nonce="n",
            code_verifier="v" * 43,
        )

    # Malformed JSON / non-dict JSON / invalid endpoints / bad JWKS / empty JWKS.
    for body_bytes, url_mode in (
        (b"not-json", "discovery"),
        (b"[]", "discovery"),
        (
            json.dumps(
                {
                    "issuer": GOOGLE_CANONICAL_ISSUER,
                    "authorization_endpoint": "",
                    "token_endpoint": GOOGLE_TOKEN_ENDPOINT,
                    "jwks_uri": GOOGLE_JWKS_URI,
                }
            ).encode(),
            "discovery",
        ),
        (
            json.dumps(
                {
                    "issuer": GOOGLE_CANONICAL_ISSUER,
                    "authorization_endpoint": "http://insecure.example/auth",
                    "token_endpoint": GOOGLE_TOKEN_ENDPOINT,
                    "jwks_uri": GOOGLE_JWKS_URI,
                }
            ).encode(),
            "discovery",
        ),
        (b'{"keys": "not-a-list"}', "jwks"),
        (b'{"keys": [{"kty": "RSA"}]}', "jwks"),
        (b'{"keys": []}', "jwks"),
    ):

        def _edge_handler(
            req: requests.PreparedRequest,
            _timeout: object,
            *,
            payload: bytes = body_bytes,
            mode: str = url_mode,
        ) -> tuple[int, dict[str, str], bytes]:
            if req.url == GOOGLE_DISCOVERY_URL and mode == "discovery":
                return 200, {"Content-Type": "application/json"}, payload
            if req.url == GOOGLE_DISCOVERY_URL:
                return _json_response(
                    {
                        "issuer": GOOGLE_CANONICAL_ISSUER,
                        "authorization_endpoint": GOOGLE_AUTH_ENDPOINT,
                        "token_endpoint": GOOGLE_TOKEN_ENDPOINT,
                        "jwks_uri": GOOGLE_JWKS_URI,
                    }
                )
            return 200, {"Content-Type": "application/json"}, payload

        cache = JwksCache(adapter=RecordingAdapter(_edge_handler))
        with pytest.raises(OidcProviderError):
            cache.get_key_set(google_cfg)

    # Stale discovery retained past TTL; unknown-kid outage & still-unknown kid fail closed.
    clock = [1000.0]
    disc_fail = [False]
    jwks_fail = [False]
    token_payload: dict[str, Any] = {"access_token": "a", "token_type": "Bearer"}

    def _lifecycle_handler(
        req: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if req.url == GOOGLE_DISCOVERY_URL:
            if disc_fail[0]:
                return 503, {}, b"down"
            return _json_response(
                {
                    "issuer": GOOGLE_CANONICAL_ISSUER,
                    "authorization_endpoint": GOOGLE_AUTH_ENDPOINT,
                    "token_endpoint": GOOGLE_TOKEN_ENDPOINT,
                    "jwks_uri": GOOGLE_JWKS_URI,
                }
            )
        if req.url == GOOGLE_JWKS_URI:
            if jwks_fail[0]:
                return 503, {}, b"down"
            return _json_response({"keys": [key.as_dict(private=False)]})
        return _json_response(token_payload)

    adapter = RecordingAdapter(_lifecycle_handler)
    cache = JwksCache(adapter=adapter, clock=lambda: clock[0])
    client = OidcClient(configs, jwks_cache=cache, adapter=adapter)

    # Warm discovery + JWKS, then fail discovery after TTL -> retains stale discovery!
    assert cache.get_discovery(google_cfg).issuer == GOOGLE_CANONICAL_ISSUER
    clock[0] += 7200.0
    disc_fail[0] = True
    assert cache.get_discovery(google_cfg).issuer == GOOGLE_CANONICAL_ISSUER

    # Missing id_token in token endpoint response -> OidcVerificationError.
    with pytest.raises(OidcVerificationError):
        client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))

    # Unknown kid when refetch succeeds but still lacks that kid -> OidcVerificationError.
    token_payload["id_token"] = _sign_rs256(unknown_key, _valid_claims(now))
    with pytest.raises(OidcVerificationError):
        client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))

    # Unknown kid when refetch hits 503 outage -> returns None cleanly -> OidcVerificationError.
    clock[0] += UNKNOWN_KID_REFETCH_INTERVAL_SECONDS + 1.0
    jwks_fail[0] = True
    assert cache.refetch_on_unknown_kid(google_cfg) is None
