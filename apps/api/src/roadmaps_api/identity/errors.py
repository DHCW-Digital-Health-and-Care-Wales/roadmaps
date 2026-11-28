"""OIDC error hierarchy carrying closed reason codes only, never tokens or claims."""


class OidcError(Exception):
    """Base error for OIDC sign-in failures; never leaks token or claim values."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class OidcProviderError(OidcError):
    """Raised when discovery, JWKS or token exchange fails or returns invalid data."""


class OidcVerificationError(OidcError):
    """Raised when an ID token fails signature, algorithm or claim validation."""
