"""JSON on the wire is camelCase, on requests and responses (ADR-017 _STY-092 amendments_)."""

from collections.abc import Callable, Iterator
from typing import Annotated, Any

import pytest
from fastapi import FastAPI, Query
from fastapi.testclient import TestClient

from roadmaps_api.app import create_app
from roadmaps_api.wire import ApiRequestModel, ApiResponseModel
from tests.support import make_settings


class Child(ApiRequestModel):
    item_name: str = "unnamed"
    item_count: int


class Search(ApiRequestModel):
    search_term: str
    page_size: int = 20


class Nested(ApiRequestModel):
    child_node: Child


class Found(ApiResponseModel):
    search_term: str
    page_size: int


class ChildFound(ApiResponseModel):
    item_name: str
    item_count: int


def wire_app() -> FastAPI:
    app = create_app(make_settings())

    @app.post("/test/search")
    def search_body(body: Search) -> Found:
        return Found(search_term=body.search_term, page_size=body.page_size)

    @app.get("/test/search")
    def search_query(query: Annotated[Search, Query()]) -> Found:
        return Found(search_term=query.search_term, page_size=query.page_size)

    @app.post("/test/nested")
    def nested(body: Nested) -> ChildFound:
        child = body.child_node
        return ChildFound(item_name=child.item_name, item_count=child.item_count)

    return app


@pytest.fixture
def wire_client() -> Iterator[TestClient]:
    with TestClient(wire_app()) as client:
        yield client


# Each request, and the camelCase response it answers.
BOUND: dict[str, tuple[str, str, Any, dict[str, object]]] = {
    "a camelCase body": (
        "POST",
        "/test/search",
        {"searchTerm": "a", "pageSize": 5},
        {"searchTerm": "a", "pageSize": 5},
    ),
    "a snake_case optional field of a body, ignored": (
        "POST",
        "/test/search",
        {"searchTerm": "a", "page_size": 5},
        {"searchTerm": "a", "pageSize": 20},
    ),
    "a camelCase query": (
        "GET",
        "/test/search?searchTerm=a&pageSize=5",
        None,
        {"searchTerm": "a", "pageSize": 5},
    ),
    "a snake_case optional field of a query, ignored": (
        "GET",
        "/test/search?searchTerm=a&page_size=5",
        None,
        {"searchTerm": "a", "pageSize": 20},
    ),
    "a camelCase nested model": (
        "POST",
        "/test/nested",
        {"childNode": {"itemName": "a", "itemCount": 1}},
        {"itemName": "a", "itemCount": 1},
    ),
    "a snake_case optional field of a nested model, ignored": (
        "POST",
        "/test/nested",
        {"childNode": {"item_name": "a", "itemCount": 1}},
        {"itemName": "unnamed", "itemCount": 1},
    ),
}


@pytest.mark.parametrize(("method", "url", "body", "answer"), BOUND.values(), ids=BOUND)
def test_a_request_binds_camel_case_names_alone(
    wire_client: TestClient, method: str, url: str, body: object, answer: dict[str, object]
) -> None:
    response = wire_client.request(method, url, json=body)

    assert response.status_code == 200
    assert response.json() == answer


# Each request, and where its required field is missing, by its camelCase alias.
MISSING: dict[str, tuple[str, str, Any, list[object]]] = {
    "a snake_case required field of a body": (
        "POST",
        "/test/search",
        {"search_term": "a"},
        ["body", "searchTerm"],
    ),
    "a snake_case required field of a query": (
        "GET",
        "/test/search?search_term=a",
        None,
        ["query", "searchTerm"],
    ),
    "a snake_case nested model": (
        "POST",
        "/test/nested",
        {"child_node": {"itemCount": 1}},
        ["body", "childNode"],
    ),
    "a snake_case required field of a nested model": (
        "POST",
        "/test/nested",
        {"childNode": {"item_count": 1}},
        ["body", "childNode", "itemCount"],
    ),
}


@pytest.mark.parametrize(("method", "url", "body", "loc"), MISSING.values(), ids=MISSING)
def test_a_snake_case_required_field_is_missing_at_its_camel_case_name(
    wire_client: TestClient, method: str, url: str, body: object, loc: list[object]
) -> None:
    response = wire_client.request(method, url, json=body)

    assert response.status_code == 422
    assert response.json()["code"] == "request.invalid"
    assert response.json()["params"] == {"errors": [{"loc": loc, "type": "missing"}]}


BUILT: dict[str, Callable[[], Found]] = {
    "built by field name": lambda: Found(search_term="a", page_size=1),
    "read by alias": lambda: Found.model_validate({"searchTerm": "a", "pageSize": 1}),
}


@pytest.mark.parametrize("build", BUILT.values(), ids=BUILT)
def test_a_response_model_serialises_camel_case(build: Callable[[], Found]) -> None:
    found = build()

    assert found.search_term == "a"
    assert found.model_dump() == {"searchTerm": "a", "pageSize": 1}
    assert found.model_dump_json() == '{"searchTerm":"a","pageSize":1}'
