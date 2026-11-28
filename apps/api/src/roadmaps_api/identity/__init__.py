"""Confidential OIDC client, provider registry and cached JWKS verification (ADR-018, D4)."""

from roadmaps_api.identity.client import (
    OidcClient,
    TokenExchangeRequest,
    VerifiedIdentity,
    validate_id_token_claims,
)
from roadmaps_api.identity.errors import (
    OidcError,
    OidcProviderError,
    OidcVerificationError,
)
from roadmaps_api.identity.jwks import FAILURE_BACKOFF_SECONDS, OUTBOUND_TIMEOUT, JwksCache
from roadmaps_api.identity.providers import (
    GOOGLE_CANONICAL_ISSUER,
    LOCAL_MOCK_ISSUER,
    OidcProviderId,
    ProviderConfig,
    build_provider_configs,
    is_safe_deployed_issuer,
    provider_for_issuer,
    validate_deployed_providers,
)

__all__ = [
    "FAILURE_BACKOFF_SECONDS",
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
    "is_safe_deployed_issuer",
    "provider_for_issuer",
    "validate_deployed_providers",
    "validate_id_token_claims",
]
