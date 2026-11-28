"""Cached OIDC discovery and JWKS fetcher with stale-key retention and failure backoff.

Every outbound HTTP request carries explicit `(connect, read)` timeouts and
`allow_redirects=False` (D4). Discovery documents and keys are retained across a provider
outage once cached; a failed fetch backs off for `FAILURE_BACKOFF_SECONDS`, an unknown
`kid` refetches at most once per `UNKNOWN_KID_REFETCH_INTERVAL_SECONDS`, and a cold cache
fails closed (TM-09). Each provider's discovery document and key set has its own lock,
held across its fetch: a caller needing that entry waits behind its refresh, so sign-ins
are serialised during the refresh (requests bounds each connect and read, not the whole
fetch), while fresh reads of every other entry carry on.
"""

import logging
import math
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Final

import requests
from joserfc.errors import JoseError
from joserfc.jwk import KeySet
from requests.adapters import BaseAdapter

from roadmaps_api.identity.errors import OidcProviderError
from roadmaps_api.identity.providers import (
    OidcProviderId,
    ProviderConfig,
    is_safe_deployed_issuer,
)
from roadmaps_api.settings import is_http_url

logger = logging.getLogger(__name__)

# Explicit (connect, read) timeout seconds on every outbound OIDC call (D4).
OUTBOUND_TIMEOUT: Final[tuple[float, float]] = (3.0, 5.0)
CACHE_TTL_SECONDS: Final[float] = 3600.0
UNKNOWN_KID_REFETCH_INTERVAL_SECONDS: Final[float] = 30.0
FAILURE_BACKOFF_SECONDS: Final[float] = 30.0
HTTP_OK: Final = 200


@dataclass(frozen=True)
class DiscoveryDocument:
    issuer: str
    authorization_endpoint: str
    token_endpoint: str
    jwks_uri: str


@dataclass
class _Entry[T]:
    """One provider's cached value, the lock held across its fetch, and its fetch times."""

    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)
    value: T | None = None
    fetched_at: float = -math.inf
    failed_at: float = -math.inf
    forced_at: float = -math.inf


def build_http_session(adapter: BaseAdapter | None = None) -> requests.Session:
    """Creates an isolated `requests.Session` (no ambient proxy env, optional test adapter)."""
    session = requests.Session()
    session.trust_env = False
    if adapter is not None:
        session.mount("https://", adapter)
        session.mount("http://", adapter)
    return session


def _valid_endpoint_url(value: object, *, require_https: bool) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    if require_https:
        return value if is_safe_deployed_issuer(value) else None
    return value if is_http_url(value) else None


class JwksCache:
    """Thread-safe discovery and JWKS cache per provider (ADR-018, D4, TM-09)."""

    def __init__(
        self,
        *,
        adapter: BaseAdapter | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._adapter = adapter
        self._clock = clock
        self._entries_lock = threading.Lock()
        self._discovery: dict[OidcProviderId, _Entry[DiscoveryDocument]] = {}
        self._jwks: dict[OidcProviderId, _Entry[KeySet]] = {}

    def get_discovery(self, config: ProviderConfig) -> DiscoveryDocument:
        entry = self._entry(self._discovery, config.provider)
        with entry.lock:
            return self._cached(
                entry,
                config.provider,
                lambda: self._fetch_discovery(config),
                log_event="auth.discovery_refetch_failed",
            )

    def get_key_set(self, config: ProviderConfig, *, discovery: DiscoveryDocument) -> KeySet:
        """Returns cached JWKS, refreshing past TTL with backoff and stale-key retention."""
        entry = self._entry(self._jwks, config.provider)
        with entry.lock:
            return self._cached(
                entry,
                config.provider,
                lambda: self._fetch_key_set(discovery),
                log_event="auth.jwks_refetch_failed",
            )

    def refetch_on_unknown_kid(
        self,
        config: ProviderConfig,
        *,
        discovery: DiscoveryDocument,
        previous_key_set: KeySet,
    ) -> KeySet | None:
        """Rate-limited JWKS refetch on unknown `kid`; `None` when limited or the fetch fails."""
        entry = self._entry(self._jwks, config.provider)
        with entry.lock:
            # A concurrent callback that refreshed while this one waited already holds the keys.
            if entry.value is not None and entry.value is not previous_key_set:
                return entry.value
            now = self._clock()
            if now - entry.forced_at < UNKNOWN_KID_REFETCH_INTERVAL_SECONDS:
                return None
            entry.forced_at = now
            try:
                key_set = self._fetch_key_set(discovery)
            except OidcProviderError:
                entry.failed_at = self._clock()
                logger.warning(
                    "auth.jwks_refetch_failed",
                    extra={"provider": config.provider.value, "reason": "unknown_kid_outage"},
                )
                return None
            entry.value, entry.fetched_at = key_set, self._clock()
            return key_set

    def _entry[T](
        self, store: dict[OidcProviderId, _Entry[T]], provider: OidcProviderId
    ) -> _Entry[T]:
        with self._entries_lock:
            return store.setdefault(provider, _Entry())

    def _cached[T](
        self,
        entry: _Entry[T],
        provider: OidcProviderId,
        fetch: Callable[[], T],
        *,
        log_event: str,
    ) -> T:
        """Returns `entry`'s value, fetching it past TTL; the caller holds `entry.lock`."""
        now = self._clock()
        if entry.value is not None and now - entry.fetched_at < CACHE_TTL_SECONDS:
            return entry.value
        if now - entry.failed_at < FAILURE_BACKOFF_SECONDS:
            if entry.value is not None:
                return entry.value
            msg = "provider_backoff"
            raise OidcProviderError(msg)
        try:
            value = fetch()
        except OidcProviderError:
            entry.failed_at = self._clock()
            if entry.value is None:
                raise
            logger.warning(
                log_event, extra={"provider": provider.value, "reason": "stale_retained"}
            )
            return entry.value
        entry.value, entry.fetched_at = value, self._clock()
        return value

    def _get_json(self, url: str) -> dict[str, Any]:
        with build_http_session(self._adapter) as http:
            try:
                response = http.get(url, timeout=OUTBOUND_TIMEOUT, allow_redirects=False)
            except requests.RequestException as exc:
                msg = "provider_network_error"
                raise OidcProviderError(msg) from exc
        if response.status_code != HTTP_OK:
            msg = "provider_http_error"
            raise OidcProviderError(msg)
        try:
            payload = response.json()
        except ValueError as exc:
            msg = "provider_invalid_json"
            raise OidcProviderError(msg) from exc
        if not isinstance(payload, dict):
            msg = "provider_invalid_json"
            raise OidcProviderError(msg)
        return payload

    def _fetch_discovery(self, config: ProviderConfig) -> DiscoveryDocument:
        payload = self._get_json(config.discovery_url)
        if payload.get("issuer") != config.canonical_issuer:
            msg = "discovery_issuer_mismatch"
            raise OidcProviderError(msg)
        auth_endpoint = _valid_endpoint_url(
            payload.get("authorization_endpoint"), require_https=config.require_https_endpoints
        )
        token_endpoint = _valid_endpoint_url(
            payload.get("token_endpoint"), require_https=config.require_https_endpoints
        )
        jwks_uri = _valid_endpoint_url(
            payload.get("jwks_uri"), require_https=config.require_https_endpoints
        )
        if auth_endpoint is None or token_endpoint is None or jwks_uri is None:
            msg = "discovery_invalid_endpoints"
            raise OidcProviderError(msg)
        return DiscoveryDocument(
            issuer=config.canonical_issuer,
            authorization_endpoint=auth_endpoint,
            token_endpoint=token_endpoint,
            jwks_uri=jwks_uri,
        )

    def _fetch_key_set(self, discovery: DiscoveryDocument) -> KeySet:
        payload = self._get_json(discovery.jwks_uri)
        raw_keys = payload.get("keys")
        if not isinstance(raw_keys, list) or not all(isinstance(item, dict) for item in raw_keys):
            msg = "jwks_invalid"
            raise OidcProviderError(msg)
        if not raw_keys:
            msg = "jwks_empty"
            raise OidcProviderError(msg)
        try:
            return KeySet.import_key_set({"keys": raw_keys})
        except (JoseError, TypeError, ValueError) as exc:
            msg = "jwks_invalid"
            raise OidcProviderError(msg) from exc
