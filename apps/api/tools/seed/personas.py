"""Canonical seeded tenants and `local_mock` persona fixture specifications.

`STY-106`'s local mock OIDC provider imports `LOCAL_MOCK_ISSUER`, `NAMED_PERSONAS` and
`UNINVITED_PERSONA` directly so subjects, emails and display names never drift (`STY-093`
D11, `STY-106` D3).
"""

from dataclasses import dataclass
from typing import Final

from roadmaps_api.authz import ShippedRoleKey
from roadmaps_api.identity import LOCAL_MOCK_ISSUER

DHCW_SLUG: Final = "dhcw"
CWM_AUR_SLUG: Final = "cwm-aur"

__all__ = [
    "CWM_AUR_SLUG",
    "DHCW_SLUG",
    "LOCAL_MOCK_ISSUER",
    "NAMED_PERSONAS",
    "TENANT_SPECS",
    "UNINVITED_PERSONA",
    "PersonaSpec",
    "TenantSpec",
]


@dataclass(frozen=True)
class TenantSpec:
    slug: str
    name_en: str
    name_cy: str


TENANT_SPECS: Final[tuple[TenantSpec, ...]] = (
    TenantSpec(
        slug=DHCW_SLUG,
        name_en="Digital Health and Care Wales",
        name_cy="Iechyd a Gofal Digidol Cymru",
    ),
    TenantSpec(
        slug=CWM_AUR_SLUG,
        name_en="Cwm Aur Health Board",
        name_cy="Bwrdd Iechyd Cwm Aur",
    ),
)


@dataclass(frozen=True)
class PersonaSpec:
    key: str
    display_name: str
    email: str
    issuer: str
    subject: str
    memberships: tuple[tuple[str, ShippedRoleKey], ...]
    ended_in_tenants: frozenset[str] = frozenset()
    disabled: bool = False


NAMED_PERSONAS: Final[tuple[PersonaSpec, ...]] = (
    PersonaSpec(
        key="dhcw_admin_primary",
        display_name="Rhiannon Davies",
        email="rhiannon.davies@dhcw.example",
        issuer=LOCAL_MOCK_ISSUER,
        subject="local-dhcw-admin-1",
        memberships=((DHCW_SLUG, ShippedRoleKey.ADMIN),),
    ),
    PersonaSpec(
        key="dhcw_admin_secondary",
        display_name="Gareth Evans",
        email="gareth.evans@dhcw.example",
        issuer=LOCAL_MOCK_ISSUER,
        subject="local-dhcw-admin-2",
        memberships=((DHCW_SLUG, ShippedRoleKey.ADMIN),),
    ),
    PersonaSpec(
        key="dhcw_product_lead",
        display_name="Lowri Williams",
        email="lowri.williams@dhcw.example",
        issuer=LOCAL_MOCK_ISSUER,
        subject="local-dhcw-product-lead",
        memberships=((DHCW_SLUG, ShippedRoleKey.PRODUCT_LEAD),),
    ),
    PersonaSpec(
        key="dhcw_viewer",
        display_name="Huw Thomas",
        email="huw.thomas@dhcw.example",
        issuer=LOCAL_MOCK_ISSUER,
        subject="local-dhcw-viewer",
        memberships=((DHCW_SLUG, ShippedRoleKey.VIEWER),),
    ),
    PersonaSpec(
        key="multi_tenant_member",
        display_name="Nia Jones",
        email="nia.jones@dhcw.example",
        issuer=LOCAL_MOCK_ISSUER,
        subject="local-multi-tenant",
        memberships=(
            (DHCW_SLUG, ShippedRoleKey.PRODUCT_LEAD),
            (CWM_AUR_SLUG, ShippedRoleKey.ADMIN),
        ),
    ),
    PersonaSpec(
        key="cwm_aur_admin",
        display_name="Iwan Roberts",
        email="iwan.roberts@cwm-aur.example",
        issuer=LOCAL_MOCK_ISSUER,
        subject="local-cwm-aur-admin",
        memberships=((CWM_AUR_SLUG, ShippedRoleKey.ADMIN),),
    ),
    PersonaSpec(
        key="dhcw_ended_member",
        display_name="Elen Pritchard",
        email="elen.pritchard@dhcw.example",
        issuer=LOCAL_MOCK_ISSUER,
        subject="local-dhcw-ended",
        memberships=((DHCW_SLUG, ShippedRoleKey.VIEWER),),
        ended_in_tenants=frozenset({DHCW_SLUG}),
    ),
    PersonaSpec(
        key="dhcw_disabled_person",
        display_name="Owen Hughes",
        email="owen.hughes@dhcw.example",
        issuer=LOCAL_MOCK_ISSUER,
        subject="local-dhcw-disabled",
        memberships=((DHCW_SLUG, ShippedRoleKey.VIEWER),),
        disabled=True,
    ),
)

# Exported for STY-106's local mock OIDC provider; never seeded into PostgreSQL.
UNINVITED_PERSONA: Final[PersonaSpec] = PersonaSpec(
    key="uninvited_person",
    display_name="Sioned Parry",
    email="sioned.parry@dhcw.example",
    issuer=LOCAL_MOCK_ISSUER,
    subject="local-uninvited",
    memberships=(),
)
