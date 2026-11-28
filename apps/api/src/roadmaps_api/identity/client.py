"""Confidential OIDC client using `authlib` + `joserfc` + `requests` (ADR-018, D4, D10)."""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Final

import requests
from authlib.common.errors import AuthlibBaseError
from authlib.integrations.requests_client import OAuth2Session
from authlib.oidc.core import CodeIDToken
from joserfc import jwt
from joserfc.errors import InvalidKeyIdError, JoseError
from joserfc.jwk import KeySet
from requests.adapters import BaseAdapter

from roadmaps_api.identity.errors import OidcProviderError, OidcVerificationError
from roadmaps_api.identity.jwks import (
    HTTP_OK,
    OUTBOUND_TIMEOUT,
    DiscoveryDocument,
    JwksCache,
)
from roadmaps_api.identity.providers import (
    OIDC_SCOPES,
    OidcProviderId,
    ProviderConfig,
)

ALLOWED_JWS_ALGORITHMS: Final[tuple[str, ...]] = ("RS256",)
CLOCK_SKEW_SECONDS: Final[int] = 60


@dataclass(frozen=True)
class VerifiedIdentity:
    """Verified OIDC identity claims; provider tokens are discarded immediately (ADR-018)."""

    provider: OidcProviderId
    canonical_issuer: str
    subject: str
    email: str
    display_name: str | None


@dataclass(frozen=True, kw_only=True)
class TokenExchangeRequest:
    """Parameters for an OIDC authorization-code exchange and ID-token verification."""

    code: str
    redirect_uri: str
    code_verifier: str
    expected_nonce: str
    now: int | None = None


def _require_http_ok_response(response: requests.Response) -> requests.Response:
    """Compliance hook enforcing HTTP 200 on token-endpoint responses (RFC 6749 §5.1)."""
    if response.status_code != HTTP_OK:
        msg = "token_exchange_failed"
        raise OidcProviderError(msg)
    return response


def _validate_claims(
    config: ProviderConfig,
    token: jwt.Token,
    *,
    expected_nonce: str,
    now: int | None,
) -> VerifiedIdentity:
    """Validates a signature-verified ID token's claims against `config` (ADR-018).

    `jwt.decode` has already enforced the `RS256` allow-list. `CodeIDToken` checks
    `nonce` and `azp` from `params`, and joserfc checks the options below and that `exp`,
    `iat` and `nbf` are finite numbers within the skew. `aud` and `azp` are explicit
    options because authlib's defaults accept a wrong `aud` whose `azp` names this client.
    """
    options: dict[str, Any] = {
        "iss": {"essential": True, "values": list(config.accepted_issuers)},
        "sub": {"essential": True},
        "aud": {"essential": True, "value": config.client_id},
        "azp": {"value": config.client_id},
        "exp": {"essential": True},
        "iat": {"essential": True},
    }
    claims = CodeIDToken(
        dict(token.claims),
        dict(token.header),
        options=options,
        params={"nonce": expected_nonce, "client_id": config.client_id},
    )
    try:
        claims.validate(now=now, leeway=CLOCK_SKEW_SECONDS)
    except JoseError as exc:
        msg = "invalid_claims"
        raise OidcVerificationError(msg) from exc

    subject = claims["sub"]
    if not subject.strip():
        msg = "invalid_sub"
        raise OidcVerificationError(msg)

    email = claims.get("email")
    if not isinstance(email, str) or not email.strip():
        msg = "invalid_email"
        raise OidcVerificationError(msg)

    if config.require_email_verified and claims.get("email_verified") is not True:
        msg = "email_not_verified"
        raise OidcVerificationError(msg)

    if config.allowed_hd is not None:
        hd = claims.get("hd")
        if not isinstance(hd, str) or hd.strip().lower() not in config.allowed_hd:
            msg = "hd_not_allowed"
            raise OidcVerificationError(msg)

    raw_name = claims.get("name")
    display_name = raw_name.strip() if isinstance(raw_name, str) and raw_name.strip() else None

    return VerifiedIdentity(
        provider=config.provider,
        canonical_issuer=config.canonical_issuer,
        subject=subject,
        email=email.strip(),
        display_name=display_name,
    )


class OidcClient:
    """Confidential OIDC client handling auth-URL creation, code exchange and token verification."""

    def __init__(
        self,
        providers: Mapping[OidcProviderId, ProviderConfig],
        *,
        jwks_cache: JwksCache | None = None,
        adapter: BaseAdapter | None = None,
    ) -> None:
        self._providers = dict(providers)
        self._adapter = adapter
        self._jwks_cache = jwks_cache or JwksCache(adapter=adapter)

    def get_provider(self, provider: OidcProviderId) -> ProviderConfig | None:
        return self._providers.get(provider)

    def _require_provider(self, provider: OidcProviderId) -> ProviderConfig:
        config = self._providers.get(provider)
        if config is None:
            msg = "provider_not_enabled"
            raise OidcProviderError(msg)
        return config

    def _make_oauth_session(self, config: ProviderConfig, *, redirect_uri: str) -> OAuth2Session:
        session = OAuth2Session(
            client_id=config.client_id,
            client_secret=config.client_secret,
            scope=OIDC_SCOPES,
            redirect_uri=redirect_uri,
            code_challenge_method="S256",
        )
        session.trust_env = False
        session.register_compliance_hook("access_token_response", _require_http_ok_response)
        if self._adapter is not None:
            session.mount("https://", self._adapter)
            session.mount("http://", self._adapter)
        return session

    def create_authorization_url(
        self,
        provider: OidcProviderId,
        *,
        redirect_uri: str,
        state: str,
        nonce: str,
        code_verifier: str,
    ) -> str:
        """Builds the provider's authorisation URL with PKCE S256, state, nonce and query mode."""
        config = self._require_provider(provider)
        discovery = self._jwks_cache.get_discovery(config)
        with self._make_oauth_session(config, redirect_uri=redirect_uri) as oauth:
            url, _returned_state = oauth.create_authorization_url(
                discovery.authorization_endpoint,
                state=state,
                nonce=nonce,
                code_verifier=code_verifier,
                response_mode="query",
                **dict(config.extra_auth_params),
            )
        return str(url)

    def _decode_with_rollover(
        self, config: ProviderConfig, raw_id_token: str, *, discovery: DiscoveryDocument
    ) -> jwt.Token:
        key_set: KeySet = self._jwks_cache.get_key_set(config, discovery=discovery)
        try:
            return jwt.decode(raw_id_token, key_set, algorithms=list(ALLOWED_JWS_ALGORITHMS))
        except InvalidKeyIdError:
            refreshed = self._jwks_cache.refetch_on_unknown_kid(
                config, discovery=discovery, previous_key_set=key_set
            )
            if refreshed is None:
                msg = "unknown_kid"
                raise OidcVerificationError(msg) from None
            try:
                return jwt.decode(raw_id_token, refreshed, algorithms=list(ALLOWED_JWS_ALGORITHMS))
            except (JoseError, ValueError) as exc:
                msg = "invalid_signature"
                raise OidcVerificationError(msg) from exc
        except (JoseError, ValueError) as exc:
            msg = "invalid_token"
            raise OidcVerificationError(msg) from exc

    def exchange_code_and_verify(
        self,
        provider: OidcProviderId,
        request: TokenExchangeRequest,
    ) -> VerifiedIdentity:
        """Exchanges the authorisation code with PKCE and validates the ID token in full."""
        config = self._require_provider(provider)
        discovery = self._jwks_cache.get_discovery(config)
        with self._make_oauth_session(config, redirect_uri=request.redirect_uri) as oauth:
            try:
                token_response = oauth.fetch_token(
                    discovery.token_endpoint,
                    code=request.code,
                    code_verifier=request.code_verifier,
                    timeout=OUTBOUND_TIMEOUT,
                    allow_redirects=False,
                )
            except (AuthlibBaseError, requests.RequestException, TypeError, ValueError) as exc:
                msg = "token_exchange_failed"
                raise OidcProviderError(msg) from exc

        raw_id_token = token_response.get("id_token") if isinstance(token_response, dict) else None
        if not isinstance(raw_id_token, str) or not raw_id_token:
            msg = "missing_id_token"
            raise OidcVerificationError(msg)

        decoded = self._decode_with_rollover(config, raw_id_token, discovery=discovery)
        return _validate_claims(
            config, decoded, expected_nonce=request.expected_nonce, now=request.now
        )
