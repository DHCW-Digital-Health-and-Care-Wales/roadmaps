"""Deterministic Welsh name helpers scoped to `STY-103`'s columns.

Later schema stories (`EPC-026`) extend this module with Welsh roadmap, item and list phrase
helpers following the same seeded-Faker pattern (`STY-093` D8).
"""

import re
import unicodedata
from typing import Final

from faker import Faker

WELSH_GIVEN_NAMES: Final[tuple[str, ...]] = (
    "Aled",
    "Angharad",
    "Bryn",
    "Carys",
    "Cerys",
    "Dafydd",
    "Emyr",
    "Ffion",
    "Gethin",
    "Harri",
    "Ieuan",
    "Llio",
    "Megan",
    "Osian",
    "Rhian",
    "Siân",
)

WELSH_SURNAMES: Final[tuple[str, ...]] = (
    "Davies",
    "Edwards",
    "Evans",
    "Griffiths",
    "Hughes",
    "Jenkins",
    "Jones",
    "Lewis",
    "Lloyd",
    "Morgan",
    "Owen",
    "Parry",
    "Price",
    "Pritchard",
    "Rees",
    "Williams",
)

_NON_SLUG_CHARS = re.compile(r"[^a-z0-9-]+")


def create_faker(seed: int) -> Faker:
    """Returns an isolated `Faker` instance deterministically seeded with `seed`."""
    faker = Faker("en_GB")
    faker.seed_instance(seed)
    return faker


def welsh_name_parts(faker: Faker) -> tuple[str, str]:
    """Draws a deterministic Welsh `(given_name, surname)` pair from the seeded `faker`."""
    given: str = faker.random_element(WELSH_GIVEN_NAMES)
    family: str = faker.random_element(WELSH_SURNAMES)
    return given, family


def _ascii_slug(value: str) -> str:
    normalised = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return _NON_SLUG_CHARS.sub("", normalised.lower())


def example_email(given: str, family: str, *, index: int, domain: str) -> str:
    """Formats a deterministic RFC 2606 `.example` address from name parts and index."""
    return f"{_ascii_slug(given)}.{_ascii_slug(family)}.{index}@{domain}"
