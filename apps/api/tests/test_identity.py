"""S1, S4 & D4: OIDC client, JWKS cache, strict RS256/claim validation and outbound HTTP bounds.

Uses `RecordingAdapter` (`requests.adapters.BaseAdapter`) for deterministic mocked Google
transports (D4) so every refused claim, key rollover, outage retention, failure backoff,
serialised refresh, token-endpoint refusal, timeout and redirect refusal runs without
sockets. Refused claims are driven through `exchange_code_and_verify`, so each case holds
whichever layer refuses it: joserfc's algorithm allow-list and claim types, authlib's
`CodeIDToken` (`nonce`, `azp`) or this module's own options and checks.
"""

import base64
import json
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from urllib.parse import parse_qs, urlsplit

import pytest
import requests
from joserfc import jws, jwt
from joserfc.jwk import ECKey, OctKey, RSAKey

from roadmaps_api.identity import (
    FAILURE_BACKOFF_SECONDS,
    GOOGLE_CANONICAL_ISSUER,
    LOCAL_MOCK_ISSUER,
    OidcClient,
    OidcError,
    OidcProviderError,
    OidcProviderId,
    OidcVerificationError,
    ProviderConfig,
    TokenExchangeRequest,
    build_provider_configs,
    is_safe_deployed_issuer,
    validate_deployed_providers,
)
from roadmaps_api.identity.jwks import (
    OUTBOUND_TIMEOUT,
    UNKNOWN_KID_REFETCH_INTERVAL_SECONDS,
    JwksCache,
)
from roadmaps_api.identity.providers import GOOGLE_DISCOVERY_URL
from roadmaps_api.settings import Environment, Settings, SettingsError
from tests.support import RecordingAdapter

GOOGLE_CLIENT_ID = "google-client-123"
GOOGLE_CLIENT_SECRET = "google-secret-456"  # noqa: S105 - synthetic test secret
GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"  # noqa: S105 - standard endpoint URL
GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs"
EDITOR_ORIGIN = "https://roadmaps.dhcw.example"


def _make_rsa_key(kid: str) -> RSAKey:
    return RSAKey.generate_key(2048, parameters={"kid": kid, "use": "sig", "alg": "RS256"})


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
        google_allowed_hd=("dhcw.example",),
    )


def _valid_claims(now: int, **overrides: object) -> dict[str, Any]:
    claims: dict[str, Any] = {
        "iss": GOOGLE_CANONICAL_ISSUER,
        "sub": "google-sub-001",
        "aud": GOOGLE_CLIENT_ID,
        "exp": now + 300,
        "iat": now,
        "nonce": "expected-nonce",
        "email": "rhiannon.davies@dhcw.example",
        "email_verified": True,
        "hd": "dhcw.example",
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


def _standard_discovery() -> dict[str, str]:
    return {
        "issuer": GOOGLE_CANONICAL_ISSUER,
        "authorization_endpoint": GOOGLE_AUTH_ENDPOINT,
        "token_endpoint": GOOGLE_TOKEN_ENDPOINT,
        "jwks_uri": GOOGLE_JWKS_URI,
    }


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
    discovery = discovery_override or _standard_discovery()

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


@pytest.mark.parametrize(
    ("issuer", "expected"),
    [
        ("https://accounts.google.com", True),
        ("https://login.microsoftonline.com/00000000-0000-0000-0000-000000000001/v2.0", True),
        ("", False),
        ("https://accounts.google.com\n", False),
        ("https://accounts.google.com:badport", False),
        ("http://127.0.0.1/local-mock-oidc", False),
        ("http://accounts.google.com", False),
        ("https://localhost/oidc", False),
        ("https://sub.localhost/oidc", False),
        ("https://127.0.0.1/oidc", False),
        ("https://127.0.0.2/oidc", False),
        ("https://[::1]/oidc", False),
        ("https://0.0.0.0/oidc", False),
        ("https://[::]/oidc", False),
        ("https://[::ffff:0.0.0.0]/oidc", False),
        ("ftp://accounts.google.com", False),
        ("not-a-url", False),
    ],
)
def test_deployed_issuer_guard_refuses_non_https_and_loopback_issuers(
    issuer: str, *, expected: bool
) -> None:
    assert is_safe_deployed_issuer(issuer) is expected


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
            now, iss="accounts.google.com", hd="DHCW.EXAMPLE", exp=now - 59, iat=now + 59
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
    assert verified.email == "rhiannon.davies@dhcw.example"
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


def _rs256_raw_payload_token(key: RSAKey, payload: bytes) -> str:
    """Signs a payload verbatim, e.g. with the non-standard JSON `NaN`/`Infinity` literals."""
    return jws.serialize_compact({"alg": "RS256", "kid": key.kid}, payload, key)


def _without(claims: dict[str, Any], name: str) -> dict[str, Any]:
    return {c: v for c, v in claims.items() if c != name}


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
    "missing iss": lambda k, now: _sign_rs256(k, _without(_valid_claims(now), "iss")),
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
    "single aud non-string azp": lambda k, now: _sign_rs256(
        k, _valid_claims(now, aud=GOOGLE_CLIENT_ID, azp=12345)
    ),
    "single aud azp list naming this client and another": lambda k, now: _sign_rs256(
        k, _valid_claims(now, aud=GOOGLE_CLIENT_ID, azp=[GOOGLE_CLIENT_ID, "other-client"])
    ),
    "expired exp past 60s skew": lambda k, now: _sign_rs256(k, _valid_claims(now, exp=now - 61)),
    "future iat past 60s skew": lambda k, now: _sign_rs256(k, _valid_claims(now, iat=now + 61)),
    "future nbf past 60s skew": lambda k, now: _sign_rs256(k, _valid_claims(now, nbf=now + 61)),
    "missing exp": lambda k, now: _sign_rs256(k, _without(_valid_claims(now), "exp")),
    "missing iat": lambda k, now: _sign_rs256(k, _without(_valid_claims(now), "iat")),
    "boolean exp": lambda k, now: _sign_rs256(k, _valid_claims(now, exp=True)),
    "boolean iat": lambda k, now: _sign_rs256(k, _valid_claims(now, iat=True)),
    "boolean nbf": lambda k, now: _sign_rs256(k, _valid_claims(now, nbf=True)),
    "string exp": lambda k, now: _sign_rs256(k, _valid_claims(now, exp=str(now + 300))),
    "string iat": lambda k, now: _sign_rs256(k, _valid_claims(now, iat=str(now))),
    "string nbf": lambda k, now: _sign_rs256(k, _valid_claims(now, nbf=str(now))),
    "null exp": lambda k, now: _sign_rs256(k, _valid_claims(now, exp=None)),
    "NaN exp": lambda k, now: _rs256_raw_payload_token(
        k, json.dumps(_valid_claims(now, exp=float("nan"))).encode()
    ),
    "Infinity exp": lambda k, now: _rs256_raw_payload_token(
        k, json.dumps(_valid_claims(now, exp=float("inf"))).encode()
    ),
    "null iat": lambda k, now: _sign_rs256(k, _valid_claims(now, iat=None)),
    "null nbf": lambda k, now: _sign_rs256(k, _valid_claims(now, nbf=None)),
    "NaN iat": lambda k, now: _rs256_raw_payload_token(
        k, json.dumps(_valid_claims(now, iat=float("nan"))).encode()
    ),
    "NaN nbf": lambda k, now: _rs256_raw_payload_token(
        k, json.dumps(_valid_claims(now, nbf=float("nan"))).encode()
    ),
    "wrong nonce": lambda k, now: _sign_rs256(k, _valid_claims(now, nonce="wrong-nonce")),
    "missing nonce": lambda k, now: _sign_rs256(k, _without(_valid_claims(now), "nonce")),
    "empty nonce": lambda k, now: _sign_rs256(k, _valid_claims(now, nonce="")),
    "nonce list containing the expected nonce": lambda k, now: _sign_rs256(
        k, _valid_claims(now, nonce=["expected-nonce", "other"])
    ),
    "non-string nonce": lambda k, now: _sign_rs256(k, _valid_claims(now, nonce=12345)),
    "non-ASCII nonce": lambda k, now: _sign_rs256(k, _valid_claims(now, nonce="n\u00f6nce")),
    "alg none": lambda _k, now: _alg_none_token(_valid_claims(now)),
    "alg HS256": lambda _k, now: _hs256_token(_valid_claims(now)),
    "alg RS384": lambda k, now: _rs384_token(k, _valid_claims(now)),
    "alg ES256": lambda _k, now: _es256_token(_valid_claims(now)),
    "tampered signature": lambda k, now: _tampered_signature_token(k, _valid_claims(now)),
    "wrong hd": lambda k, now: _sign_rs256(k, _valid_claims(now, hd="evil.example")),
    "missing hd": lambda k, now: _sign_rs256(k, _without(_valid_claims(now), "hd")),
    "email_verified false": lambda k, now: _sign_rs256(k, _valid_claims(now, email_verified=False)),
    "email_verified missing": lambda k, now: _sign_rs256(
        k, _without(_valid_claims(now), "email_verified")
    ),
    "email_verified string true": lambda k, now: _sign_rs256(
        k, _valid_claims(now, email_verified="true")
    ),
    "email_verified int 1": lambda k, now: _sign_rs256(k, _valid_claims(now, email_verified=1)),
    "missing sub": lambda k, now: _sign_rs256(k, _without(_valid_claims(now), "sub")),
    "empty sub": lambda k, now: _sign_rs256(k, _valid_claims(now, sub="")),
    "blank sub": lambda k, now: _sign_rs256(k, _valid_claims(now, sub="   ")),
    "non-string sub": lambda k, now: _sign_rs256(k, _valid_claims(now, sub=12345)),
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


@pytest.mark.parametrize(
    "claims_change",
    [{"nonce": ""}, {"nonce": "any-nonce"}, {"nonce": None}],
    ids=["empty nonce", "some nonce", "no nonce"],
)
def test_an_empty_expected_nonce_refuses_every_token(claims_change: dict[str, Any]) -> None:
    key = _make_rsa_key("k1")
    now = int(time.time())
    claims = {k: v for k, v in {**_valid_claims(now), **claims_change}.items() if v is not None}
    token = _sign_rs256(key, claims)
    adapter, _counts = _make_google_transport([key], lambda: token)
    client = OidcClient(build_provider_configs(_google_settings()), adapter=adapter)
    request = TokenExchangeRequest(
        code="auth-code",
        redirect_uri=f"{EDITOR_ORIGIN}/api/v1/auth/callback/google",
        code_verifier="v" * 43,
        expected_nonce="",
        now=now,
    )

    with pytest.raises(OidcVerificationError):
        client.exchange_code_and_verify(OidcProviderId.GOOGLE, request)


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

    # Discovery returning a mismatched-issuer document fails closed.
    bad_discovery = {**_standard_discovery(), "issuer": "https://evil.example"}
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


@pytest.mark.parametrize(
    ("status", "body"),
    [
        (400, b'{"error": "invalid_grant", "error_description": "code expired"}'),
        (401, b'{"error": "invalid_client"}'),
        (200, b'{"error": "invalid_grant"}'),
        (302, b'{"access_token": "a", "token_type": "Bearer", "id_token": "x.y.z"}'),
        (502, b'{"detail": "bad gateway"}'),
        (200, b'{"access_token": "a", "token_type": "Bearer", "expires_in": [1]}'),
    ],
    ids=[
        "400 invalid_grant OAuthError",
        "401 invalid_client OAuthError",
        "200 with error JSON",
        "302 with JSON body",
        "502 with non-OAuth JSON",
        "200 with non-scalar expires_in",
    ],
)
def test_token_endpoint_oauth_errors_and_non_200_responses_raise_provider_error(
    status: int, body: bytes
) -> None:
    key = _make_rsa_key("k1")
    now = int(time.time())

    def handle(
        request: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if request.url == GOOGLE_DISCOVERY_URL:
            return _json_response(_standard_discovery())
        if request.url == GOOGLE_JWKS_URI:
            return _json_response({"keys": [key.as_dict(private=False)]})
        return status, {"Content-Type": "application/json"}, body

    client = OidcClient(
        build_provider_configs(_google_settings()), adapter=RecordingAdapter(handle)
    )
    with pytest.raises(OidcProviderError) as exc_info:
        client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))
    assert exc_info.value.reason == "token_exchange_failed"


def test_discovery_and_jwks_outage_backoff_avoids_upstream_storms() -> None:
    key = _make_rsa_key("k1")
    google_cfg = build_provider_configs(_google_settings())[OidcProviderId.GOOGLE]

    clock = [1000.0]
    counts = {"discovery": 0, "jwks": 0}
    disc_status = [503]
    jwks_status = [503]

    def backoff_handler(
        req: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if req.url == GOOGLE_DISCOVERY_URL:
            counts["discovery"] += 1
            if disc_status[0] != 200:
                return disc_status[0], {}, b"down"
            return _json_response(_standard_discovery())
        counts["jwks"] += 1
        if jwks_status[0] != 200:
            return jwks_status[0], {}, b"down"
        return _json_response({"keys": [key.as_dict(private=False)]})

    cache = JwksCache(adapter=RecordingAdapter(backoff_handler), clock=lambda: clock[0])

    with pytest.raises(OidcProviderError):
        cache.get_discovery(google_cfg)
    assert counts["discovery"] == 1
    with pytest.raises(OidcProviderError) as backed_off:
        cache.get_discovery(google_cfg)
    assert backed_off.value.reason == "provider_backoff"
    assert counts["discovery"] == 1

    # After backoff elapses, discovery succeeds and caches.
    clock[0] += FAILURE_BACKOFF_SECONDS + 1.0
    disc_status[0] = 200
    discovery = cache.get_discovery(google_cfg)
    assert discovery.issuer == GOOGLE_CANONICAL_ISSUER
    assert counts["discovery"] == 2

    # Cold JWKS outage backs off similarly.
    with pytest.raises(OidcProviderError):
        cache.get_key_set(google_cfg, discovery=discovery)
    assert counts["jwks"] == 1
    with pytest.raises(OidcProviderError) as jwks_backed_off:
        cache.get_key_set(google_cfg, discovery=discovery)
    assert jwks_backed_off.value.reason == "provider_backoff"
    assert counts["jwks"] == 1

    # After backoff elapses, JWKS succeeds and caches.
    clock[0] += FAILURE_BACKOFF_SECONDS + 1.0
    jwks_status[0] = 200
    assert cache.get_key_set(google_cfg, discovery=discovery) is not None
    assert counts["jwks"] == 2

    # Warm discovery + JWKS outage past TTL retains stale values AND backs off follow-ups.
    clock[0] += 7200.0
    disc_status[0] = 503
    jwks_status[0] = 503
    assert cache.get_discovery(google_cfg).issuer == GOOGLE_CANONICAL_ISSUER
    assert counts["discovery"] == 3
    assert cache.get_discovery(google_cfg).issuer == GOOGLE_CANONICAL_ISSUER
    assert counts["discovery"] == 3

    assert cache.get_key_set(google_cfg, discovery=discovery) is not None
    assert counts["jwks"] == 3
    assert cache.get_key_set(google_cfg, discovery=discovery) is not None
    assert counts["jwks"] == 3


def test_concurrent_discovery_and_jwks_callers_share_one_fetch() -> None:
    key = _make_rsa_key("k1")
    google_cfg = build_provider_configs(_google_settings())[OidcProviderId.GOOGLE]

    sf_counts = {"discovery": 0, "jwks": 0}
    disc_entered = threading.Event()
    disc_release = threading.Event()
    jwks_entered = threading.Event()
    jwks_release = threading.Event()

    def sf_handler(
        req: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if req.url == GOOGLE_DISCOVERY_URL:
            sf_counts["discovery"] += 1
            disc_entered.set()
            disc_release.wait(timeout=5.0)
            return _json_response(_standard_discovery())
        sf_counts["jwks"] += 1
        jwks_entered.set()
        jwks_release.wait(timeout=5.0)
        return _json_response({"keys": [key.as_dict(private=False)]})

    sf_cache = JwksCache(adapter=RecordingAdapter(sf_handler))
    with ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(sf_cache.get_discovery, google_cfg)
        assert disc_entered.wait(timeout=5.0)
        f2 = pool.submit(sf_cache.get_discovery, google_cfg)
        time.sleep(0.05)
        disc_release.set()
        discovery = f1.result()
        assert discovery.issuer == GOOGLE_CANONICAL_ISSUER
        assert f2.result().issuer == GOOGLE_CANONICAL_ISSUER
    assert sf_counts["discovery"] == 1

    with ThreadPoolExecutor(max_workers=2) as pool:
        k1 = pool.submit(sf_cache.get_key_set, google_cfg, discovery=discovery)
        assert jwks_entered.wait(timeout=5.0)
        k2 = pool.submit(sf_cache.get_key_set, google_cfg, discovery=discovery)
        time.sleep(0.05)
        jwks_release.set()
        assert k1.result() is not None
        assert k2.result() is not None
    assert sf_counts["jwks"] == 1


def test_fresh_discovery_read_does_not_wait_behind_a_key_set_fetch() -> None:
    key = _make_rsa_key("k1")
    google_cfg = build_provider_configs(_google_settings())[OidcProviderId.GOOGLE]
    jwks_entered = threading.Event()
    jwks_release = threading.Event()

    def handler(
        req: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if req.url == GOOGLE_DISCOVERY_URL:
            return _json_response(_standard_discovery())
        jwks_entered.set()
        jwks_release.wait(timeout=5.0)
        return _json_response({"keys": [key.as_dict(private=False)]})

    cache = JwksCache(adapter=RecordingAdapter(handler))
    discovery = cache.get_discovery(google_cfg)
    with ThreadPoolExecutor(max_workers=2) as pool:
        key_set = pool.submit(cache.get_key_set, google_cfg, discovery=discovery)
        try:
            assert jwks_entered.wait(timeout=5.0)
            fresh = pool.submit(cache.get_discovery, google_cfg)
            assert fresh.result(timeout=2.0) is discovery
        finally:
            jwks_release.set()
        assert key_set.result() is not None


def test_concurrent_key_rollover_callbacks_share_one_refetch_and_both_succeed() -> None:
    key1 = _make_rsa_key("k1")
    key2 = _make_rsa_key("k2")
    active_keys: list[RSAKey] = [key1]
    now = int(time.time())
    clock = [1000.0]
    jwks_calls = [0]
    rollover_entered = threading.Event()
    rollover_release = threading.Event()
    current_token = [_sign_rs256(key1, _valid_claims(now))]

    def handler(
        req: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if req.url == GOOGLE_DISCOVERY_URL:
            return _json_response(_standard_discovery())
        if req.url == GOOGLE_JWKS_URI:
            jwks_calls[0] += 1
            if jwks_calls[0] == 2:
                rollover_entered.set()
                rollover_release.wait(timeout=5.0)
            return _json_response({"keys": [k.as_dict(private=False) for k in active_keys]})
        return _json_response(
            {
                "access_token": "tok",
                "token_type": "Bearer",
                "id_token": current_token[0],
            }
        )

    adapter = RecordingAdapter(handler)
    cache = JwksCache(adapter=adapter, clock=lambda: clock[0])
    client = OidcClient(
        build_provider_configs(_google_settings()), jwks_cache=cache, adapter=adapter
    )

    # Warm cache with key1.
    client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(code="c0", now=now))
    assert jwks_calls[0] == 1

    # Rotate to key2 and send two concurrent callbacks: both succeed with ONE refetch.
    clock[0] += UNKNOWN_KID_REFETCH_INTERVAL_SECONDS + 1.0
    active_keys.append(key2)
    current_token[0] = _sign_rs256(key2, _valid_claims(now))

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(
            client.exchange_code_and_verify,
            OidcProviderId.GOOGLE,
            _exchange_request(code="c1", now=now),
        )
        assert rollover_entered.wait(timeout=5.0)
        second = pool.submit(
            client.exchange_code_and_verify,
            OidcProviderId.GOOGLE,
            _exchange_request(code="c2", now=now),
        )
        time.sleep(0.05)
        rollover_release.set()
        assert first.result().subject == "google-sub-001"
        assert second.result().subject == "google-sub-001"
    assert jwks_calls[0] == 2


def test_unknown_kid_refetch_reuses_keys_another_callback_already_refetched() -> None:
    key = _make_rsa_key("k1")
    google_cfg = build_provider_configs(_google_settings())[OidcProviderId.GOOGLE]
    jwks_calls = [0]

    def handler(
        req: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if req.url == GOOGLE_DISCOVERY_URL:
            return _json_response(_standard_discovery())
        jwks_calls[0] += 1
        return _json_response({"keys": [key.as_dict(private=False)]})

    cache = JwksCache(adapter=RecordingAdapter(handler), clock=lambda: 1000.0)
    discovery = cache.get_discovery(google_cfg)
    stale = cache.get_key_set(google_cfg, discovery=discovery)

    # The first callback's refetch replaces the keys; a second callback that decoded against
    # the replaced set gets the new set back, inside the rate limit and without a fetch.
    refreshed = cache.refetch_on_unknown_kid(
        google_cfg, discovery=discovery, previous_key_set=stale
    )
    assert refreshed is not None
    assert refreshed is not stale
    assert (
        cache.refetch_on_unknown_kid(google_cfg, discovery=discovery, previous_key_set=stale)
        is refreshed
    )
    assert jwks_calls[0] == 2


def test_build_provider_configs_refuses_local_mock_in_production_or_cloud_run() -> None:
    prod_with_mock = Settings(
        environment=Environment.PRODUCTION,
        database_url="postgresql+psycopg://roadmaps:roadmaps@127.0.0.1:1/roadmaps",
        allowed_hosts=("roadmaps.dhcw.example",),
        editor_origin=EDITOR_ORIGIN,
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        google_allowed_hd=("dhcw.example",),
        local_mock_oidc_url="http://127.0.0.1:8001",
    )
    with pytest.raises(SettingsError) as exc_info:
        build_provider_configs(prod_with_mock)
    assert "ROADMAPS_LOCAL_MOCK_OIDC_URL" in exc_info.value.invalid

    missing_secret = Settings(
        environment=Environment.TEST,
        database_url="postgresql+psycopg://roadmaps:roadmaps@127.0.0.1:1/roadmaps",
        allowed_hosts=("roadmaps.dhcw.example",),
        editor_origin=EDITOR_ORIGIN,
        google_client_id=GOOGLE_CLIENT_ID,
        google_allowed_hd=("dhcw.example",),
    )
    with pytest.raises(SettingsError) as missing_secret_exc:
        build_provider_configs(missing_secret)
    assert missing_secret_exc.value.invalid == ["ROADMAPS_GOOGLE_CLIENT_SECRET"]

    missing_hd = Settings(
        environment=Environment.TEST,
        database_url="postgresql+psycopg://roadmaps:roadmaps@127.0.0.1:1/roadmaps",
        allowed_hosts=("roadmaps.dhcw.example",),
        editor_origin=EDITOR_ORIGIN,
        google_client_id=GOOGLE_CLIENT_ID,
        google_client_secret=GOOGLE_CLIENT_SECRET,
        google_allowed_hd=(),
    )
    with pytest.raises(SettingsError) as missing_hd_exc:
        build_provider_configs(missing_hd)
    assert missing_hd_exc.value.invalid == ["ROADMAPS_GOOGLE_ALLOWED_HD"]

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


@pytest.mark.parametrize(
    ("provider", "issuer", "expected_invalid"),
    [
        (OidcProviderId.LOCAL_MOCK, LOCAL_MOCK_ISSUER, ["ROADMAPS_LOCAL_MOCK_OIDC_URL"]),
        (OidcProviderId.GOOGLE, "http://accounts.google.com", ["ROADMAPS_GOOGLE_CLIENT_ID"]),
    ],
    ids=["loopback mock issuer", "non-HTTPS Google issuer"],
)
def test_deployed_provider_guard_names_the_setting_enabling_an_unsafe_issuer(
    provider: OidcProviderId, issuer: str, expected_invalid: list[str]
) -> None:
    config = ProviderConfig(
        provider=provider,
        canonical_issuer=issuer,
        accepted_issuers=frozenset({issuer}),
        discovery_url=f"{issuer}/.well-known/openid-configuration",
        client_id="c",
        client_secret="s",  # noqa: S106 - synthetic test secret
    )
    with pytest.raises(SettingsError) as exc_info:
        validate_deployed_providers({provider: config})
    assert exc_info.value.invalid == expected_invalid


def test_unconfigured_provider_raises_provider_error() -> None:
    with pytest.raises(OidcProviderError):
        OidcClient({}).create_authorization_url(
            OidcProviderId.GOOGLE,
            redirect_uri=f"{EDITOR_ORIGIN}/api/v1/auth/callback/google",
            state="s",
            nonce="n",
            code_verifier="v" * 43,
        )


MALFORMED_PROVIDER_DOCS: dict[str, tuple[str, bytes]] = {
    "discovery non-JSON": ("discovery", b"not-json"),
    "discovery JSON list": ("discovery", b"[]"),
    "discovery blank auth endpoint": (
        "discovery",
        json.dumps({**_standard_discovery(), "authorization_endpoint": ""}).encode(),
    ),
    "discovery non-HTTPS auth endpoint": (
        "discovery",
        json.dumps(
            {**_standard_discovery(), "authorization_endpoint": "http://insecure.example/auth"}
        ).encode(),
    ),
    "jwks non-list keys": ("jwks", b'{"keys": "not-a-list"}'),
    "jwks invalid key object": ("jwks", b'{"keys": [{"kty": "RSA"}]}'),
    "jwks empty key list": ("jwks", b'{"keys": []}'),
}


@pytest.mark.parametrize(
    ("mode", "payload"), MALFORMED_PROVIDER_DOCS.values(), ids=MALFORMED_PROVIDER_DOCS
)
def test_malformed_discovery_and_jwks_documents_fail_closed(mode: str, payload: bytes) -> None:
    google_cfg = build_provider_configs(_google_settings())[OidcProviderId.GOOGLE]

    def handler(
        req: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if req.url == GOOGLE_DISCOVERY_URL and mode == "discovery":
            return 200, {"Content-Type": "application/json"}, payload
        if req.url == GOOGLE_DISCOVERY_URL:
            return _json_response(_standard_discovery())
        return 200, {"Content-Type": "application/json"}, payload

    cache = JwksCache(adapter=RecordingAdapter(handler))
    with pytest.raises(OidcProviderError):
        cache.get_key_set(google_cfg, discovery=cache.get_discovery(google_cfg))


def test_missing_id_token_and_unknown_kid_refetch_failures_fail_closed() -> None:
    key = _make_rsa_key("k1")
    unknown_key = _make_rsa_key("k-unknown")
    configs = build_provider_configs(_google_settings())
    google_cfg = configs[OidcProviderId.GOOGLE]
    now = int(time.time())

    clock = [1000.0]
    jwks_fail = [False]
    token_payload: dict[str, Any] = {"access_token": "a", "token_type": "Bearer"}

    def handler(
        req: requests.PreparedRequest, _timeout: object
    ) -> tuple[int, dict[str, str], bytes]:
        if req.url == GOOGLE_DISCOVERY_URL:
            return _json_response(_standard_discovery())
        if req.url == GOOGLE_JWKS_URI:
            if jwks_fail[0]:
                return 503, {}, b"down"
            return _json_response({"keys": [key.as_dict(private=False)]})
        return _json_response(token_payload)

    adapter = RecordingAdapter(handler)
    cache = JwksCache(adapter=adapter, clock=lambda: clock[0])
    client = OidcClient(configs, jwks_cache=cache, adapter=adapter)

    with pytest.raises(OidcVerificationError):
        client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))

    token_payload["id_token"] = _sign_rs256(unknown_key, _valid_claims(now))
    with pytest.raises(OidcVerificationError):
        client.exchange_code_and_verify(OidcProviderId.GOOGLE, _exchange_request(now=now))

    discovery = cache.get_discovery(google_cfg)
    current = cache.get_key_set(google_cfg, discovery=discovery)
    clock[0] += UNKNOWN_KID_REFETCH_INTERVAL_SECONDS + 1.0
    jwks_fail[0] = True
    assert (
        cache.refetch_on_unknown_kid(google_cfg, discovery=discovery, previous_key_set=current)
        is None
    )
