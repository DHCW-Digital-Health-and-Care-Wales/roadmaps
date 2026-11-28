"""Cached OIDC discovery and JWKS fetcher with stale-key retention, backoff and single-flight.

Every outbound HTTP request carries explicit `(connect, read)` timeouts and
`allow_redirects=False` (D4). Keys and discovery documents are retained across provider
outages once cached, with per-provider failure backoff, single-flight deduplication and
non-blocking stale reads during an in-flight refresh so outbound discovery/JWKS refreshes
stay bounded to one in-flight fetch per cooldown; a cold cache fails closed (TM-09).
"""

import logging
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
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
class _CachedValue[T]:
    value: T
    fetched_at: float


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
        ttl_seconds: float = CACHE_TTL_SECONDS,
        unknown_kid_interval_seconds: float = UNKNOWN_KID_REFETCH_INTERVAL_SECONDS,
        failure_backoff_seconds: float = FAILURE_BACKOFF_SECONDS,
    ) -> None:
        self._adapter = adapter
        self._clock = clock
        self._ttl_seconds = ttl_seconds
        self._unknown_kid_interval = unknown_kid_interval_seconds
        self._failure_backoff = failure_backoff_seconds
        self._lock = threading.Lock()
        self._fetch_locks: dict[OidcProviderId, threading.Lock] = {}
        self._discovery: dict[OidcProviderId, _CachedValue[DiscoveryDocument]] = {}
        self._jwks: dict[OidcProviderId, _CachedValue[KeySet]] = {}
        self._discovery_failed_at: dict[OidcProviderId, float] = {}
        self._jwks_failed_at: dict[OidcProviderId, float] = {}
        self._last_kid_refetch: dict[OidcProviderId, float] = {}

    def _provider_fetch_lock(self, provider: OidcProviderId) -> threading.Lock:
        with self._lock:
            lock = self._fetch_locks.get(provider)
            if lock is None:
                lock = threading.Lock()
                self._fetch_locks[provider] = lock
            return lock

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

    def _cached_or_backed_off[T](
        self,
        store: dict[OidcProviderId, _CachedValue[T]],
        failed_at: dict[OidcProviderId, float],
        provider: OidcProviderId,
    ) -> tuple[T | None, T | None]:
        """Returns `(ready_value, stale_value)`; raises if cold and inside failure backoff."""
        now = self._clock()
        cached = store.get(provider)
        if cached is not None and (now - cached.fetched_at) < self._ttl_seconds:
            return cached.value, cached.value
        last_fail = failed_at.get(provider)
        if last_fail is not None and (now - last_fail) < self._failure_backoff:
            if cached is not None:
                return cached.value, cached.value
            msg = "provider_backoff"
            raise OidcProviderError(msg)
        return None, cached.value if cached is not None else None

    def _get_or_fetch[T](  # noqa: PLR0913 - shared typed cache state machine
        self,
        store: dict[OidcProviderId, _CachedValue[T]],
        failed_at: dict[OidcProviderId, float],
        provider: OidcProviderId,
        fetch: Callable[[], T],
        *,
        log_event: str,
        stale_reason: str,
    ) -> T:
        with self._lock:
            ready, stale = self._cached_or_backed_off(store, failed_at, provider)
            if ready is not None:
                return ready

        fetch_lock = self._provider_fetch_lock(provider)
        # Callers that already have a usable stale value never block behind an in-flight refresh.
        if stale is not None:
            if not fetch_lock.acquire(blocking=False):
                return stale
        else:
            fetch_lock.acquire()

        try:
            with self._lock:
                ready, _ = self._cached_or_backed_off(store, failed_at, provider)
                if ready is not None:
                    return ready

            try:
                fresh = fetch()
            except OidcProviderError:
                with self._lock:
                    failed_at[provider] = self._clock()
                    cached = store.get(provider)
                    if cached is not None:
                        logger.warning(
                            log_event,
                            extra={"provider": provider.value, "reason": stale_reason},
                        )
                        return cached.value
                raise

            with self._lock:
                store[provider] = _CachedValue(value=fresh, fetched_at=self._clock())
                failed_at.pop(provider, None)
            return fresh
        finally:
            fetch_lock.release()

    def get_discovery(self, config: ProviderConfig) -> DiscoveryDocument:
        return self._get_or_fetch(
            self._discovery,
            self._discovery_failed_at,
            config.provider,
            lambda: self._fetch_discovery(config),
            log_event="auth.discovery_refetch_failed",
            stale_reason="stale_retained",
        )

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

    def get_key_set(
        self, config: ProviderConfig, *, discovery: DiscoveryDocument | None = None
    ) -> KeySet:
        """Returns cached JWKS, refreshing past TTL with backoff and stale-key retention."""
        with self._lock:
            ready, _ = self._cached_or_backed_off(self._jwks, self._jwks_failed_at, config.provider)
            if ready is not None:
                return ready

        doc = discovery if discovery is not None else self.get_discovery(config)
        return self._get_or_fetch(
            self._jwks,
            self._jwks_failed_at,
            config.provider,
            lambda: self._fetch_key_set(doc),
            log_event="auth.jwks_refetch_failed",
            stale_reason="stale_retained",
        )

    def refetch_on_unknown_kid(
        self,
        config: ProviderConfig,
        *,
        discovery: DiscoveryDocument | None = None,
        previous_key_set: KeySet | None = None,
    ) -> KeySet | None:
        """Rate-limited JWKS refetch on unknown `kid`, sharing an in-flight rollover refresh."""
        doc = discovery if discovery is not None else self.get_discovery(config)
        with self._provider_fetch_lock(config.provider):
            with self._lock:
                # If another concurrent callback already refreshed the cache, reuse its new KeySet.
                if previous_key_set is not None:
                    current = self._jwks.get(config.provider)
                    if current is not None and current.value is not previous_key_set:
                        return current.value
                now = self._clock()
                last = self._last_kid_refetch.get(config.provider)
                if last is not None and (now - last) < self._unknown_kid_interval:
                    return None
                self._last_kid_refetch[config.provider] = now

            try:
                key_set = self._fetch_key_set(doc)
            except OidcProviderError:
                with self._lock:
                    self._jwks_failed_at[config.provider] = self._clock()
                logger.warning(
                    "auth.jwks_refetch_failed",
                    extra={"provider": config.provider.value, "reason": "unknown_kid_outage"},
                )
                return None

            with self._lock:
                self._jwks[config.provider] = _CachedValue(value=key_set, fetched_at=self._clock())
                self._jwks_failed_at.pop(config.provider, None)
            return key_set
