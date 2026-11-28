"""Pinned OIDC provider registry and deployed-issuer guard (ADR-018, STY-106 S4, D1, D8, D10)."""

import os
import re
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Final

from roadmaps_api.settings import (
    CLOUD_RUN_MARKERS,
    LOCAL_MOCK_OIDC_URL,
    Environment,
    Settings,
    is_safe_deployed_issuer,
    refuse,
)

GOOGLE_CANONICAL_ISSUER: Final = "https://accounts.google.com"
GOOGLE_ACCEPTED_ISSUERS: Final = frozenset({"https://accounts.google.com", "accounts.google.com"})
GOOGLE_DISCOVERY_URL: Final = "https://accounts.google.com/.well-known/openid-configuration"

# Fixed non-HTTPS loopback issuer matching `tools.seed.personas.LOCAL_MOCK_ISSUER`.
LOCAL_MOCK_ISSUER: Final = "http://127.0.0.1/local-mock-oidc"
LOCAL_MOCK_CLIENT_ID: Final = "roadmaps-local-mock"
LOCAL_MOCK_CLIENT_SECRET: Final = "roadmaps-local-mock-secret"  # noqa: S105 - local mock only

OIDC_SCOPES: Final = "openid email profile"
ENTRA_ISSUER_PATTERN: Final = re.compile(r"^https://login\.microsoftonline\.com/[^/]+/v2\.0$")


class OidcProviderId(StrEnum):
    """Enabled v1 OIDC providers accepted by `/api/v1/auth/sign-in` and callbacks."""

    GOOGLE = "google"
    LOCAL_MOCK = "local_mock"


@dataclass(frozen=True, kw_only=True)
class ProviderConfig:
    """Immutable configuration for one allow-listed OIDC provider."""

    provider: OidcProviderId
    canonical_issuer: str
    accepted_issuers: frozenset[str]
    discovery_url: str
    client_id: str
    client_secret: str = field(repr=False)
    allowed_hd: frozenset[str] | None = None
    require_email_verified: bool = True
    require_https_endpoints: bool = True
    extra_auth_params: tuple[tuple[str, str], ...] = ()


def validate_deployed_providers(configs: dict[OidcProviderId, ProviderConfig]) -> None:
    """Fails closed if any configured provider uses a non-HTTPS or loopback issuer (S4)."""
    for config in configs.values():
        if not is_safe_deployed_issuer(config.canonical_issuer):
            refuse([LOCAL_MOCK_OIDC_URL])


def build_provider_configs(settings: Settings) -> dict[OidcProviderId, ProviderConfig]:
    """Builds enabled provider configs and re-verifies S4/D8 invariants at startup."""
    on_cloud_run = settings.on_cloud_run or any(
        marker in os.environ for marker in CLOUD_RUN_MARKERS
    )
    strict_mode = settings.environment is Environment.PRODUCTION or on_cloud_run

    configs: dict[OidcProviderId, ProviderConfig] = {}

    if settings.google_client_id is not None:
        assert settings.google_client_secret is not None  # noqa: S101 - validated in Settings
        configs[OidcProviderId.GOOGLE] = ProviderConfig(
            provider=OidcProviderId.GOOGLE,
            canonical_issuer=GOOGLE_CANONICAL_ISSUER,
            accepted_issuers=GOOGLE_ACCEPTED_ISSUERS,
            discovery_url=GOOGLE_DISCOVERY_URL,
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            allowed_hd=frozenset(settings.google_allowed_hd),
            require_email_verified=True,
            require_https_endpoints=True,
            # D10: always pass prompt=select_account to Google on every sign-in start.
            extra_auth_params=(("prompt", "select_account"),),
        )

    if settings.local_mock_oidc_url is not None:
        if strict_mode:
            refuse([LOCAL_MOCK_OIDC_URL])
        configs[OidcProviderId.LOCAL_MOCK] = ProviderConfig(
            provider=OidcProviderId.LOCAL_MOCK,
            canonical_issuer=LOCAL_MOCK_ISSUER,
            accepted_issuers=frozenset({LOCAL_MOCK_ISSUER}),
            discovery_url=f"{settings.local_mock_oidc_url}/.well-known/openid-configuration",
            client_id=LOCAL_MOCK_CLIENT_ID,
            client_secret=LOCAL_MOCK_CLIENT_SECRET,
            allowed_hd=None,
            require_email_verified=True,
            require_https_endpoints=False,
            extra_auth_params=(),
        )

    if strict_mode:
        validate_deployed_providers(configs)

    return configs


def provider_for_issuer(issuer: str) -> str:
    """Maps a stored canonical `identities.issuer` URL to its wire provider label (D13)."""
    if issuer == GOOGLE_CANONICAL_ISSUER:
        return "google"
    if issuer == LOCAL_MOCK_ISSUER:
        return "local_mock"
    if ENTRA_ISSUER_PATTERN.fullmatch(issuer):
        return "entra"
    msg = "Unrecognised canonical identity issuer"
    raise ValueError(msg)
