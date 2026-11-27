"""Same-origin proof and JSON media-type guards for state-changing routes (ADR-020, D7-D8)."""

from typing import Final

from starlette.datastructures import Headers

from roadmaps_api.errors import ApiError, ErrorCode

SAFE_METHODS: Final = frozenset({"GET", "HEAD", "OPTIONS"})
_SAME_ORIGIN_VALUE: Final = "same-origin"
_JSON_MEDIA_TYPE: Final = "application/json"


def enforce_same_origin(headers: Headers, expected_origin: str) -> None:
    """Requires Fetch Metadata `Sec-Fetch-Site: same-origin`, or exact `Origin` when absent.

    Never falls back to `Origin` when `Sec-Fetch-Site` is present with another value,
    requires `Origin` to match `expected_origin` whenever both are sent, and refuses
    duplicate `Sec-Fetch-Site` or `Origin` headers (STY-105 D7).
    """
    sec_fetch_sites = headers.getlist("sec-fetch-site")
    origins = headers.getlist("origin")
    if len(sec_fetch_sites) > 1 or len(origins) > 1:
        raise ApiError(ErrorCode.ORIGIN_NOT_ALLOWED)
    if sec_fetch_sites:
        if sec_fetch_sites[0] != _SAME_ORIGIN_VALUE:
            raise ApiError(ErrorCode.ORIGIN_NOT_ALLOWED)
        if origins and origins[0] != expected_origin:
            raise ApiError(ErrorCode.ORIGIN_NOT_ALLOWED)
        return
    if not origins or origins[0] != expected_origin:
        raise ApiError(ErrorCode.ORIGIN_NOT_ALLOWED)


def enforce_json_media_type(headers: Headers, *, expects_body: bool) -> None:
    """Requires `Content-Type: application/json` (allowing parameters such as `; charset=utf-8`).

    Routes declaring a body parameter always require `application/json` upfront before body
    parsing. Bodyless routes allow an omitted `Content-Type` only when `Transfer-Encoding`
    is absent and `Content-Length` is absent or `"0"`, and still refuse any non-JSON
    `Content-Type` (STY-105 D8).
    """
    content_types = headers.getlist("content-type")
    if len(content_types) > 1:
        raise ApiError(ErrorCode.UNSUPPORTED_MEDIA_TYPE)
    if content_types:
        media_type = content_types[0].split(";", 1)[0].strip().lower()
        if media_type != _JSON_MEDIA_TYPE:
            raise ApiError(ErrorCode.UNSUPPORTED_MEDIA_TYPE)
        return
    if expects_body:
        raise ApiError(ErrorCode.UNSUPPORTED_MEDIA_TYPE)
    if headers.getlist("transfer-encoding"):
        raise ApiError(ErrorCode.UNSUPPORTED_MEDIA_TYPE)
    content_lengths = headers.getlist("content-length")
    if len(content_lengths) > 1 or (content_lengths and content_lengths[0].strip() != "0"):
        raise ApiError(ErrorCode.UNSUPPORTED_MEDIA_TYPE)
