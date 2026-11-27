"""Deterministic UUIDv7 IDs, invitation token derivation and request hashes for local seeding."""

import base64
import hashlib
from datetime import UTC, datetime
from typing import Final
from uuid import UUID

DEFAULT_SEED: Final = 20260115
# Fixed historical anchor so historical rows keep stable UUIDv7 IDs and timestamps across runs.
ANCHOR_TIME: Final = datetime(2025, 1, 15, 9, 0, 0, tzinfo=UTC)


def deterministic_uuidv7(namespace: str, timestamp: datetime) -> UUID:
    """Returns a deterministic RFC 9562 UUIDv7 bound to `(namespace, timestamp)`."""
    unix_ts_ms = int(timestamp.astimezone(UTC).timestamp() * 1000)
    digest = hashlib.sha256(f"{namespace}:{unix_ts_ms}".encode()).digest()
    rand_a = int.from_bytes(digest[0:2], "big") & 0x0FFF
    rand_b = int.from_bytes(digest[2:10], "big") & 0x3FFFFFFFFFFFFFFF
    value = (
        ((unix_ts_ms & 0xFFFFFFFFFFFF) << 80) | (0x7 << 76) | (rand_a << 64) | (0x2 << 62) | rand_b
    )
    return UUID(int=value)


def derive_invitation_token(seed: int, label: str) -> tuple[str, bytes]:
    """Returns `(raw_token, sha256_hash)` for a deterministic 256-bit invitation token."""
    token_bytes = hashlib.sha256(f"roadmaps-seed:{seed}:invitation:{label}".encode()).digest()
    raw_token = base64.urlsafe_b64encode(token_bytes).rstrip(b"=").decode("ascii")
    token_hash = hashlib.sha256(raw_token.encode("ascii")).digest()
    return raw_token, token_hash


def request_hash_for(seed: int, key: str) -> bytes:
    """Returns a deterministic 32-byte SHA-256 request hash for a seeded access change set."""
    return hashlib.sha256(f"roadmaps-seed:{seed}:request:{key}".encode()).digest()
