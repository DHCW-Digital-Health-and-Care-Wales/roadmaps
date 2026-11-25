"""The API's OpenAPI document, the contract the editor's schemas are generated from.

FastAPI builds it from the routes; here it also names every error code and the one
refusal shape (ADR-017 _Errors_), in place of FastAPI's own for a 422, which the API
never sends.
"""

from typing import Any, Final

from fastapi import FastAPI
from fastapi.openapi.constants import REF_PREFIX

from roadmaps_api.errors import ErrorResponse

# The schemas FastAPI documents its own 422 with.
FASTAPI_SCHEMAS: Final = ("HTTPValidationError", "ValidationError")


def document_refusals(app: FastAPI) -> None:
    """Shapes `app.openapi()`, which the local live document serves too."""
    build = app.openapi

    def openapi() -> dict[str, Any]:
        # FastAPI keeps the document until the routes change, and shaping it again
        # changes nothing.
        document = build()
        _add_refusal_schemas(document)
        _point_422s_at_the_envelope(document)
        return document

    app.openapi = openapi


def _add_refusal_schemas(document: dict[str, Any]) -> None:
    envelope = ErrorResponse.model_json_schema(
        mode="serialization", ref_template=REF_PREFIX + "{model}"
    )
    components = document.setdefault("components", {})
    schemas = components.setdefault("schemas", {})
    schemas.update(envelope.pop("$defs"))
    schemas[ErrorResponse.__name__] = envelope
    for name in FASTAPI_SCHEMAS:
        schemas.pop(name, None)
    components["schemas"] = dict(sorted(schemas.items()))


def _point_422s_at_the_envelope(document: dict[str, Any]) -> None:
    fastapi_ref = {"$ref": REF_PREFIX + FASTAPI_SCHEMAS[0]}
    for path in document["paths"].values():
        for operation in path.values():
            content = operation["responses"].get("422", {}).get("content", {})
            for media in content.values():
                if media.get("schema") == fastapi_ref:
                    media["schema"] = {"$ref": REF_PREFIX + ErrorResponse.__name__}
