"""D13: the `/me` provider enum each stored canonical identity issuer maps to."""

import pytest

from roadmaps_api.identity import GOOGLE_CANONICAL_ISSUER, LOCAL_MOCK_ISSUER
from roadmaps_api.services.me import IdentityProvider, provider_for_issuer


@pytest.mark.parametrize(
    ("issuer", "expected"),
    [
        (GOOGLE_CANONICAL_ISSUER, IdentityProvider.GOOGLE),
        (LOCAL_MOCK_ISSUER, IdentityProvider.LOCAL_MOCK),
        (
            "https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0",
            IdentityProvider.ENTRA,
        ),
    ],
    ids=["google", "local mock", "entra"],
)
def test_provider_for_issuer_maps_each_canonical_issuer(
    issuer: str, expected: IdentityProvider
) -> None:
    assert provider_for_issuer(issuer) is expected


@pytest.mark.parametrize(
    "issuer",
    [
        "https://unknown.example",
        "https://login.microsoftonline.com/common/v2.0/extra",
        "accounts.google.com",
    ],
)
def test_provider_for_issuer_refuses_an_unrecognised_issuer(issuer: str) -> None:
    with pytest.raises(ValueError, match="Unrecognised"):
        provider_for_issuer(issuer)
