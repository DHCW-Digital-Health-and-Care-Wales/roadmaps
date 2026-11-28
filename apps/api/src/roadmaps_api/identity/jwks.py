"""Cached OIDC discovery and JWKS fetcher with stale-key retention and rate-limited refetch.

Every outbound HTTP request carries explicit `(connect, read)` timeouts and
`allow_redirects=False` (D4). Keys are retained across provider outages once cached; a
cold cache or unreachable provider fails closed (TM-09).
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

from roadmaps_api.identity.providers import OidcProviderId, ProviderConfig
from roadmaps_api.settings import is_http_url, is_safe_deployed_issuer

logger = logging.getLogger(__name__)

# Explicit (connect, read) timeout seconds on every outbound OIDC call (D4).
OUTBOUND_TIMEOUT: Final[tuple[float, float]] = (3.0, 5.0)
CACHE_TTL_SECONDS: Final[float] = 3600.0
UNKNOWN_KID_REFETCH_INTERVAL_SECONDS: Final[float] = 30.0
_HTTP_OK: Final = 200


class OidcError(Exception):
    """Base error for OIDC sign-in failures; never leaks token or claim values."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class OidcProviderError(OidcError):
    """Raised when discovery, JWKS or token exchange fails or returns invalid data."""


def _provider_error(reason: str) -> OidcProviderError:
    return OidcProviderError(reason)


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
    ) -> None:
        self._adapter = adapter
        self._clock = clock
        self._ttl_seconds = ttl_seconds
        self._unknown_kid_interval = unknown_kid_interval_seconds
        self._lock = threading.Lock()
        self._discovery: dict[OidcProviderId, _CachedValue[DiscoveryDocument]] = {}
        self._jwks: dict[OidcProviderId, _CachedValue[KeySet]] = {}
        self._last_kid_refetch: dict[OidcProviderId, float] = {}

    def _get_json(self, url: str) -> dict[str, Any]:
        with build_http_session(self._adapter) as http:
            try:
                response = http.get(url, timeout=OUTBOUND_TIMEOUT, allow_redirects=False)
            except requests.RequestException as exc:
                msg = "provider_network_error"
                raise _provider_error(msg) from exc
        if response.status_code != _HTTP_OK:
            msg = "provider_http_error"
            raise _provider_error(msg)
        try:
            payload = response.json()
        except ValueError as exc:
            msg = "provider_invalid_json"
            raise _provider_error(msg) from exc
        if not isinstance(payload, dict):
            msg = "provider_invalid_json"
            raise _provider_error(msg)
        return payload

    def get_discovery(self, config: ProviderConfig) -> DiscoveryDocument:
        now = self._clock()
        with self._lock:
            cached = self._discovery.get(config.provider)
            if cached is not None and (now - cached.fetched_at) < self._ttl_seconds:
                return cached.value

        try:
            doc = self._fetch_discovery(config)
        except OidcProviderError:
            with self._lock:
                stale = self._discovery.get(config.provider)
                if stale is not None:
                    return stale.value
            raise

        with self._lock:
            self._discovery[config.provider] = _CachedValue(value=doc, fetched_at=self._clock())
        return doc

    def _fetch_discovery(self, config: ProviderConfig) -> DiscoveryDocument:
        payload = self._get_json(config.discovery_url)
        if payload.get("issuer") != config.canonical_issuer:
            msg = "discovery_issuer_mismatch"
            raise _provider_error(msg)
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
            raise _provider_error(msg)
        return DiscoveryDocument(
            issuer=config.canonical_issuer,
            authorization_endpoint=auth_endpoint,
            token_endpoint=token_endpoint,
            jwks_uri=jwks_uri,
        )

    def _fetch_key_set(self, config: ProviderConfig) -> KeySet:
        discovery = self.get_discovery(config)
        payload = self._get_json(discovery.jwks_uri)
        raw_keys = payload.get("keys")
        if not isinstance(raw_keys, list) or not all(isinstance(item, dict) for item in raw_keys):
            msg = "jwks_invalid"
            raise _provider_error(msg)
        if not raw_keys:
            msg = "jwks_empty"
            raise _provider_error(msg)
        try:
            return KeySet.import_key_set({"keys": raw_keys})
        except (JoseError, TypeError, ValueError) as exc:
            msg = "jwks_invalid"
            raise _provider_error(msg) from exc

    def get_key_set(self, config: ProviderConfig) -> KeySet:
        """Returns cached JWKS, refreshing past TTL and retaining stale keys on outage."""
        now = self._clock()
        with self._lock:
            cached = self._jwks.get(config.provider)
            if cached is not None and (now - cached.fetched_at) < self._ttl_seconds:
                return cached.value

        try:
            key_set = self._fetch_key_set(config)
        except OidcProviderError:
            with self._lock:
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
        return key_set

    def refetch_on_unknown_kid(self, config: ProviderConfig) -> KeySet | None:
        """Rate-limited JWKS refetch on unknown `kid`, retaining stale keys on outage."""
        with self._lock:
            now = self._clock()
            last = self._last_kid_refetch.get(config.provider)
            if last is not None and (now - last) < self._unknown_kid_interval:
                return None
            self._last_kid_refetch[config.provider] = now

        try:
            key_set = self._fetch_key_set(config)
        except OidcProviderError:
            logger.warning(
                "auth.jwks_refetch_failed",
                extra={"provider": config.provider.value, "cause": "unknown_kid_outage"},
            )
            return None

        with self._lock:
            self._jwks[config.provider] = _CachedValue(value=key_set, fetched_at=self._clock())
        return key_set
