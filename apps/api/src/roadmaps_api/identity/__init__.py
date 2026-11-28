"""Confidential OIDC client, provider registry and cached JWKS verification (ADR-018, D4)."""

from roadmaps_api.identity.client import (
    OidcClient,
    OidcError,
    OidcProviderError,
    OidcVerificationError,
    TokenExchangeRequest,
    VerifiedIdentity,
)
from roadmaps_api.identity.jwks import OUTBOUND_TIMEOUT, JwksCache
from roadmaps_api.identity.providers import (
    GOOGLE_CANONICAL_ISSUER,
    LOCAL_MOCK_ISSUER,
    OidcProviderId,
    ProviderConfig,
    build_provider_configs,
    provider_for_issuer,
)

__all__ = [
    "GOOGLE_CANONICAL_ISSUER",
    "LOCAL_MOCK_ISSUER",
    "OUTBOUND_TIMEOUT",
    "JwksCache",
    "OidcClient",
    "OidcError",
    "OidcProviderError",
    "OidcProviderId",
    "OidcVerificationError",
    "ProviderConfig",
    "TokenExchangeRequest",
    "VerifiedIdentity",
    "build_provider_configs",
    "provider_for_issuer",
]
