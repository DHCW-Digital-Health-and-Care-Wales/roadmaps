"""The OpenAPI document: every error code and the one refusal shape (ADR-017 _Errors_)."""

from collections.abc import Iterator
from typing import Annotated, Any

from fastapi import FastAPI, Query
from fastapi.testclient import TestClient

from roadmaps_api.app import create_app
from roadmaps_api.errors import ErrorCode, ErrorResponse
from roadmaps_api.settings import Environment
from roadmaps_api.wire import ApiResponseModel
from tests.support import make_settings

ERROR_RESPONSE_REF = "#/components/schemas/ErrorResponse"


class OtherRefusal(ApiResponseModel):
    other_reason: str


def validating_app() -> FastAPI:
    """The API with routes FastAPI documents a 422 for, as the contract's will be."""
    app = create_app(make_settings())

    @app.get("/test/validating")
    def validating(page_size: Annotated[int, Query(alias="pageSize")] = 1) -> None: ...

    @app.get("/test/own-refusal", responses={422: {"model": OtherRefusal}})
    def own_refusal(page_size: Annotated[int, Query(alias="pageSize")] = 1) -> None: ...

    return app


def refs(node: object) -> Iterator[str]:
    """Every `$ref` anywhere in the document."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "$ref":
                yield str(value)
            else:
                yield from refs(value)
    elif isinstance(node, list):
        for value in node:
            yield from refs(value)


def schema_of_422(document: dict[str, Any], path: str) -> object:
    return document["paths"][path]["get"]["responses"]["422"]["content"]["application/json"][
        "schema"
    ]


def test_the_document_names_every_error_code_and_the_envelope() -> None:
    schemas = create_app(make_settings()).openapi()["components"]["schemas"]

    assert schemas["ErrorCode"]["type"] == "string"
    assert schemas["ErrorCode"]["enum"] == [code.value for code in ErrorCode]
    envelope = schemas["ErrorResponse"]
    assert sorted(envelope["required"]) == ["code", "detail", "params"]
    assert envelope["properties"]["detail"]["type"] == "string"
    assert envelope["properties"]["code"] == {"$ref": "#/components/schemas/ErrorCode"}
    assert envelope["properties"]["params"]["type"] == "object"
    assert envelope["properties"]["params"]["additionalProperties"] is True


def test_a_generated_422_is_the_envelope_and_fastapi_s_own_shapes_are_gone() -> None:
    app = validating_app()

    document = app.openapi()

    assert schema_of_422(document, "/test/validating") == {"$ref": ERROR_RESPONSE_REF}
    # A route's own 422 is left as it declares it.
    assert schema_of_422(document, "/test/own-refusal") == {
        "$ref": "#/components/schemas/OtherRefusal"
    }
    schemas = document["components"]["schemas"]
    assert {"HTTPValidationError", "ValidationError"}.isdisjoint(schemas)
    for ref in refs(document):
        assert ref.removeprefix("#/components/schemas/") in schemas
    # Built once more, as a second request for it does.
    assert app.openapi() == document


def test_a_route_added_after_the_document_is_built_is_shaped_too() -> None:
    app = create_app(make_settings())
    app.openapi()

    @app.get("/test/later")
    def later(count: int = 1) -> None: ...

    assert schema_of_422(app.openapi(), "/test/later") == {"$ref": ERROR_RESPONSE_REF}


def test_the_local_live_document_is_the_one_the_app_builds() -> None:
    app = create_app(make_settings(environment=Environment.LOCAL))

    with TestClient(app) as client:
        live = client.get("/api/v1/openapi.json")

    assert live.status_code == 200
    assert live.json() == app.openapi()
    # `/health` and `/ready` are no part of the contract, and it has no route yet.
    assert live.json()["paths"] == {}


def test_the_envelope_a_refusal_sends_is_the_documented_one(client: TestClient) -> None:
    body = client.get("/nothing-here").json()

    assert ErrorResponse.model_validate(body).model_dump(mode="json") == body
