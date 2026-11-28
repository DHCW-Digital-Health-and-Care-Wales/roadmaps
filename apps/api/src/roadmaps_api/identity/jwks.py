"""Cached OIDC discovery and JWKS fetcher with stale-key retention, backoff and single-flight.

Every outbound HTTP request carries explicit `(connect, read)` timeouts and
`allow_redirects=False` (D4). Keys and discovery documents are retained across provider
outages once cached, with per-provider failure backoff and single-flight deduplication so
an upstream hang cannot starve the sync threadpool; a cold cache fails closed (TM-09).
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
    ) -> T | None:
        """Returns fresh/stale cached value inside TTL/backoff, raises if cold & backed off."""
        now = self._clock()
        cached = store.get(provider)
        if cached is not None and (now - cached.fetched_at) < self._ttl_seconds:
            return cached.value
        last_fail = failed_at.get(provider)
        if last_fail is not None and (now - last_fail) < self._failure_backoff:
            if cached is not None:
                return cached.value
            msg = "provider_backoff"
            raise OidcProviderError(msg)
        return None

    def get_discovery(self, config: ProviderConfig) -> DiscoveryDocument:
        with self._lock:
            ready = self._cached_or_backed_off(
                self._discovery, self._discovery_failed_at, config.provider
            )
            if ready is not None:
                return ready

        with self._provider_fetch_lock(config.provider):
            with self._lock:
                ready = self._cached_or_backed_off(
                    self._discovery, self._discovery_failed_at, config.provider
                )
                if ready is not None:
                    return ready

            try:
                doc = self._fetch_discovery(config)
            except OidcProviderError:
                with self._lock:
                    self._discovery_failed_at[config.provider] = self._clock()
                    stale = self._discovery.get(config.provider)
                    if stale is not None:
                        logger.warning(
                            "auth.jwks_refetch_failed",
                            extra={
                                "provider": config.provider.value,
                                "cause": "discovery_stale_retained",
                            },
                        )
                        return stale.value
                raise

            with self._lock:
                self._discovery[config.provider] = _CachedValue(value=doc, fetched_at=self._clock())
                self._discovery_failed_at.pop(config.provider, None)
            return doc

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
            ready = self._cached_or_backed_off(self._jwks, self._jwks_failed_at, config.provider)
            if ready is not None:
                return ready

        doc = discovery if discovery is not None else self.get_discovery(config)
        with self._provider_fetch_lock(config.provider):
            with self._lock:
                ready = self._cached_or_backed_off(
                    self._jwks, self._jwks_failed_at, config.provider
                )
                if ready is not None:
                    return ready

            try:
                key_set = self._fetch_key_set(doc)
            except OidcProviderError:
                with self._lock:
                    self._jwks_failed_at[config.provider] = self._clock()
                    stale = self._jwks.get(config.provider)
                    if stale is not None:
                        logger.warning(
                            "auth.jwks_refetch_failed",
                            extra={"provider": config.provider.value, "cause": "stale_retained"},
                        )
                        return stale.value
                raise

            with self._lock:
                self._jwks[config.provider] = _CachedValue(value=key_set, fetched_at=self._clock())
                self._jwks_failed_at.pop(config.provider, None)
            return key_set

    def refetch_on_unknown_kid(
        self, config: ProviderConfig, *, discovery: DiscoveryDocument | None = None
    ) -> KeySet | None:
        """Rate-limited JWKS refetch on unknown `kid`, retaining stale keys on outage."""
        with self._lock:
            now = self._clock()
            last = self._last_kid_refetch.get(config.provider)
            if last is not None and (now - last) < self._unknown_kid_interval:
                return None
            self._last_kid_refetch[config.provider] = now

        doc = discovery if discovery is not None else self.get_discovery(config)
        with self._provider_fetch_lock(config.provider):
            try:
                key_set = self._fetch_key_set(doc)
            except OidcProviderError:
                with self._lock:
                    self._jwks_failed_at[config.provider] = self._clock()
                logger.warning(
                    "auth.jwks_refetch_failed",
                    extra={"provider": config.provider.value, "cause": "unknown_kid_outage"},
                )
                return None

            with self._lock:
                self._jwks[config.provider] = _CachedValue(value=key_set, fetched_at=self._clock())
                self._jwks_failed_at.pop(config.provider, None)
            return key_set
