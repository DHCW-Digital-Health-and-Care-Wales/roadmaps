"""Repository for sign-in transactions and identity lookup definer routines (ADR-018)."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Final
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

CREATE_TRANSACTION: Final = text(
    "SELECT transaction_id, expires_at"
    " FROM public.create_sign_in_transaction("
    " :state_hash, :cookie_token_hash, :nonce, :code_verifier,"
    " :provider, :issuer, :purpose, :return_path,"
    " :invitation_id, :initiating_session_id, :initiating_person_id, :ttl_seconds)"
)
CONSUME_TRANSACTION: Final = text(
    "SELECT transaction_id, nonce, code_verifier, provider, issuer, purpose, return_path,"
    " invitation_id, initiating_session_id, initiating_person_id"
    " FROM public.consume_sign_in_transaction("
    " :state_hash, :cookie_token_hashes, :provider, :issuer)"
)
LOOKUP_IDENTITY: Final = text(
    "SELECT identity_id, person_id, person_disabled, has_entra_identity"
    " FROM public.lookup_sign_in_identity(:issuer, :subject)"
)


@dataclass(frozen=True, kw_only=True)
class NewSignInTransaction:
    state_hash: bytes
    cookie_token_hash: bytes
    nonce: str
    code_verifier: str
    provider: str
    issuer: str
    purpose: str
    return_path: str
    ttl_seconds: int = 600


@dataclass(frozen=True)
class CreatedTransaction:
    transaction_id: UUID
    expires_at: datetime


@dataclass(frozen=True)
class ConsumedTransaction:
    transaction_id: UUID
    nonce: str
    code_verifier: str
    provider: str
    issuer: str
    purpose: str
    return_path: str
    invitation_id: UUID | None
    initiating_session_id: UUID | None
    initiating_person_id: UUID | None


@dataclass(frozen=True)
class IdentityLookup:
    identity_id: UUID
    person_id: UUID
    person_disabled: bool
    has_entra_identity: bool


class AuthRepository:
    """Thin wrapper over `roadmaps_auth_definer` transaction and identity lookup routines."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def create_transaction(self, tx: NewSignInTransaction) -> CreatedTransaction:
        row = self._session.execute(
            CREATE_TRANSACTION,
            {
                "state_hash": tx.state_hash,
                "cookie_token_hash": tx.cookie_token_hash,
                "nonce": tx.nonce,
                "code_verifier": tx.code_verifier,
                "provider": tx.provider,
                "issuer": tx.issuer,
                "purpose": tx.purpose,
                "return_path": tx.return_path,
                "invitation_id": None,
                "initiating_session_id": None,
                "initiating_person_id": None,
                "ttl_seconds": tx.ttl_seconds,
            },
        ).one()
        return CreatedTransaction(transaction_id=row.transaction_id, expires_at=row.expires_at)

    def consume_transaction(
        self,
        *,
        state_hash: bytes,
        cookie_token_hashes: Sequence[bytes],
        provider: str,
        issuer: str,
    ) -> ConsumedTransaction | None:
        row = self._session.execute(
            CONSUME_TRANSACTION,
            {
                "state_hash": state_hash,
                "cookie_token_hashes": list(cookie_token_hashes),
                "provider": provider,
                "issuer": issuer,
            },
        ).one_or_none()
        if row is None:
            return None
        return ConsumedTransaction(
            transaction_id=row.transaction_id,
            nonce=row.nonce,
            code_verifier=row.code_verifier,
            provider=row.provider,
            issuer=row.issuer,
            purpose=row.purpose,
            return_path=row.return_path,
            invitation_id=row.invitation_id,
            initiating_session_id=row.initiating_session_id,
            initiating_person_id=row.initiating_person_id,
        )

    def lookup_identity(self, *, issuer: str, subject: str) -> IdentityLookup | None:
        row = self._session.execute(
            LOOKUP_IDENTITY, {"issuer": issuer, "subject": subject}
        ).one_or_none()
        if row is None:
            return None
        return IdentityLookup(
            identity_id=row.identity_id,
            person_id=row.person_id,
            person_disabled=bool(row.person_disabled),
            has_entra_identity=bool(row.has_entra_identity),
        )
