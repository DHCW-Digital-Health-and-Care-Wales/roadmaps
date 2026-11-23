"""Every refusal is `{detail, code, params}`, with a stable code (ADR-017 _Errors_).

Routes and services raise an `ApiError`; FastAPI's own 404, 405 and 422 are wrapped in
the same envelope here. A refusal never carries the submitted input, a traceback or an
exception's text.
"""

from enum import StrEnum
from http import HTTPStatus
from typing import Any, Final

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# The one reference to it: FastAPI's routing raises it for an unknown path or method,
# so its handler is registered here. Routes raise `ApiError`.
from starlette.exceptions import HTTPException  # noqa: TID251


class ErrorCode(StrEnum):
    NOT_FOUND = "request.not_found"
    METHOD_NOT_ALLOWED = "request.method_not_allowed"
    INVALID = "request.invalid"
    BODY_TOO_LARGE = "request.body_too_large"
    HOST_NOT_ALLOWED = "request.host_not_allowed"
    SERVICE_NOT_READY = "service.not_ready"
    INTERNAL_ERROR = "server.internal_error"


# Each code's status and the English sentence its `detail` carries.
_ERRORS: Final[dict[ErrorCode, tuple[HTTPStatus, str]]] = {
    ErrorCode.NOT_FOUND: (HTTPStatus.NOT_FOUND, "Nothing is found at this path."),
    ErrorCode.METHOD_NOT_ALLOWED: (
        HTTPStatus.METHOD_NOT_ALLOWED,
        "This path does not accept this method.",
    ),
    ErrorCode.INVALID: (HTTPStatus.UNPROCESSABLE_CONTENT, "The request is not valid."),
    ErrorCode.BODY_TOO_LARGE: (
        HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
        "The request body is too large.",
    ),
    ErrorCode.HOST_NOT_ALLOWED: (HTTPStatus.BAD_REQUEST, "This host is not served here."),
    ErrorCode.SERVICE_NOT_READY: (
        HTTPStatus.SERVICE_UNAVAILABLE,
        "The service is not ready.",
    ),
    ErrorCode.INTERNAL_ERROR: (
        HTTPStatus.INTERNAL_SERVER_ERROR,
        "Something went wrong on the server.",
    ),
}

_ROUTING_CODES: Final = {
    HTTPStatus.NOT_FOUND: ErrorCode.NOT_FOUND,
    HTTPStatus.METHOD_NOT_ALLOWED: ErrorCode.METHOD_NOT_ALLOWED,
}


class ApiError(Exception):
    """A refusal with a stable code; `params` hold only what the editor's copy needs."""

    def __init__(self, code: ErrorCode, params: dict[str, Any] | None = None) -> None:
        super().__init__(code.value)
        self.code = code
        self.params = params or {}


def error_response(code: ErrorCode, params: dict[str, Any] | None = None) -> JSONResponse:
    status, detail = _ERRORS[code]
    return JSONResponse(
        {"detail": detail, "code": code.value, "params": params or {}},
        status_code=status,
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    def api_error(_request: Request, exc: ApiError) -> JSONResponse:
        return error_response(exc.code, exc.params)

    @app.exception_handler(RequestValidationError)
    def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        # Where and how each error failed, never the input or the message, which can
        # quote it.
        errors = [{"loc": list(error["loc"]), "type": error["type"]} for error in exc.errors()]
        return error_response(ErrorCode.INVALID, {"errors": errors})

    @app.exception_handler(HTTPException)
    def routing_error(_request: Request, exc: HTTPException) -> JSONResponse:
        code = _ROUTING_CODES.get(HTTPStatus(exc.status_code))
        if code is None:
            # FastAPI raises no other status itself: any other is an unexpected error.
            raise exc
        return error_response(code)
