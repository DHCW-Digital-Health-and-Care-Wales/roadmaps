"""Every refusal is the envelope, with a stable code, and never echoes the input.

The two exceptions, the `Host` allow-list's 400 and the body limit's 413, are
Starlette's plain text (`test_middleware.py`).
"""

import json
import re
from collections.abc import Callable, Iterator, Mapping
from typing import Annotated, Any, Literal

import pytest
from fastapi import APIRouter, Body, Depends, FastAPI, Header, Query
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from httpx2 import Response
from pydantic import (
    AliasChoices,
    AliasPath,
    ConfigDict,
    Field,
    Json,
    Tag,
    ValidationError,
    field_validator,
    model_validator,
)
from pydantic_core import InitErrorDetails, PydanticCustomError

from roadmaps_api import error_locations
from roadmaps_api.app import create_app
from roadmaps_api.error_locations import CoreSchema, Segment
from roadmaps_api.wire import ApiRequestModel
from tests.support import PLANTED, make_settings

CAMEL_CASE = re.compile(r"[a-z][a-zA-Z0-9]*")


def keys(node: object) -> Iterator[str]:
    """Every key anywhere in a refusal's params, which are camelCase as the wire is."""
    if isinstance(node, dict):
        for key, value in node.items():
            yield key
            yield from keys(value)
    elif isinstance(node, list):
        for value in node:
            yield from keys(value)


REFUSALS = {
    "an unknown path": (
        lambda c: c.get(f"/api/v1/{PLANTED}?q={PLANTED}"),
        404,
        "request.not_found",
        {},
    ),
    "a known path with the wrong method": (
        lambda c: c.post("/health", content=PLANTED),
        405,
        "request.method_not_allowed",
        {},
    ),
    "a body that fails validation": (
        lambda c: c.post("/test/echo", json={"name": [PLANTED]}),
        422,
        "request.invalid",
        {"errors": [{"loc": ["body", "name"], "type": "string_type"}]},
    ),
    "a query that fails validation": (
        lambda c: c.post(f"/test/echo?count={PLANTED}", json={"name": "a"}),
        422,
        "request.invalid",
        {"errors": [{"loc": ["query", "count"], "type": "int_parsing"}]},
    ),
    "a body that is not JSON": (
        lambda c: c.post(
            "/test/echo", content=PLANTED, headers={"Content-Type": "application/json"}
        ),
        422,
        "request.invalid",
        {"errors": [{"loc": ["body", 0], "type": "json_invalid"}]},
    ),
    "a body that is not UTF-8": (
        lambda c: c.post(
            "/test/echo",
            content=b'{"name": "\xff"}',
            headers={"Content-Type": "application/json"},
        ),
        422,
        "request.invalid",
        {"errors": [{"loc": ["body"], "type": "body_unreadable"}]},
    ),
    "a route raising an unexpected error": (
        lambda c: c.get("/test/boom"),
        500,
        "server.internal_error",
        {},
    ),
    "a route raising a status FastAPI never raises": (
        lambda c: c.get("/test/teapot"),
        500,
        "server.internal_error",
        {},
    ),
}


@pytest.mark.parametrize(("send", "status", "code", "params"), REFUSALS.values(), ids=REFUSALS)
def test_a_refusal_is_the_envelope_without_the_input(
    client: TestClient,
    send: Callable[[TestClient], Response],
    status: int,
    code: str,
    params: dict[str, object],
) -> None:
    response = send(client)

    assert response.status_code == status
    body = response.json()
    assert set(body) == {"detail", "code", "params"}
    assert body["code"] == code
    assert body["params"] == params
    assert all(CAMEL_CASE.fullmatch(key) for key in keys(body["params"]))
    assert isinstance(body["detail"], str)
    assert PLANTED not in response.text
    assert "Traceback" not in response.text


def test_a_valid_request_passes_through(client: TestClient) -> None:
    response = client.post("/test/echo?count=2", json={"name": "a"})

    assert response.status_code == 200
    assert response.json() == {"name": "a", "count": 2}


def test_a_405_names_the_methods_the_path_allows(client: TestClient) -> None:
    assert client.post("/health").headers["Allow"] == "GET"


# A 422's `loc` keeps only what the route's schema declares, since the caller chooses the
# keys they send (ADR-020). Each row sends the planted value as such a key.


class Strict(ApiRequestModel):
    """As a request's models will be once `ApiRequestModel` forbids extra keys."""

    model_config = ConfigDict(extra="forbid")


class Leaf(Strict):
    item_count: int = 0


class Cat(Strict):
    kind: Literal["cat"]
    lives: int = 0


class Dog(Strict):
    kind: Literal["dog"]
    barks: int = 0


class Branch(Strict):
    """A model that holds itself, which Pydantic's schema names by reference."""

    branches: list[Branch] = Field([])


def refuse_at(*loc: str | int) -> ValidationError:
    """A validator's own error, at a `loc` of its choosing."""
    error = PydanticCustomError("own_error", "refused")
    return ValidationError.from_exception_data(
        "own", [InitErrorDetails(type=error, loc=loc, input=None)]
    )


class Shapes(Strict):
    leaf: Leaf | None = None
    leaves: list[Leaf] = Field([])
    leaf_set: set[int] = Field(set())
    pair: tuple[int, Leaf] | None = None
    run: tuple[Leaf, ...] = ()
    counts: dict[str, int] = Field({})
    named_leaves: dict[str, Leaf] = Field({})
    short_keys: dict[Annotated[str, Field(max_length=1)], int] = Field({})
    anything: dict[str, Any] | int = 0
    pet: Annotated[Cat | Dog, Field(discriminator="kind")] | None = None
    either: Cat | Dog | None = None
    tagged: Annotated[Leaf, Tag("tagged-leaf")] | int = 0
    branch: Branch | None = None
    encoded: Json[dict[str, int]] | None = None
    renamed: int = Field(0, validation_alias=AliasChoices("first", "spare", AliasPath("second", 0)))
    own_field: str = ""
    own_model: str = ""
    own_pair: tuple[str | int, int] | None = None
    own_json: Json = None
    own_list: list[str] | None = None
    own_counts: dict[str, int] | None = None
    own_pet: Annotated[Cat | Dog, Field(discriminator="kind")] | None = None

    @field_validator("own_field")
    @classmethod
    def refuse_the_field(cls, value: str) -> str:
        raise refuse_at(value, "deeper")

    @field_validator("own_pair")
    @classmethod
    def refuse_the_pair(cls, value: tuple[str | int, int]) -> tuple[str | int, int]:
        raise refuse_at(*value)

    @field_validator("own_counts")
    @classmethod
    def refuse_the_counts(cls, value: dict[str, int]) -> dict[str, int]:
        raise refuse_at(*value.values())

    @field_validator("own_pet", mode="before")
    @classmethod
    def refuse_the_pet(cls, value: str) -> None:
        raise refuse_at(value)

    @field_validator("own_list")
    @classmethod
    def refuse_the_list(cls, value: list[str]) -> list[str]:
        raise refuse_at(-len(value))

    @field_validator("own_json")
    @classmethod
    def refuse_the_json(cls, value: str) -> str:
        raise refuse_at(value)

    @model_validator(mode="after")
    def refuse_the_model(self) -> Shapes:
        if self.own_model:
            raise refuse_at(*self.own_model.split("/"))
        return self


class Search(Strict):
    page_size: int = 20


class ParsedMapping(Strict):
    """A parameter model with a dictionary named as the route names the model."""

    query: dict[str, int] = Field({})
    page_size: int = 20

    @field_validator("query", mode="before")
    @classmethod
    def parse(cls, value: str) -> object:
        return json.loads(value)


class Filter(Strict):
    only_mine: bool = False


def filtered(chosen: Annotated[Filter, Query()]) -> None: ...


def add_raising_routes(app: FastAPI) -> None:
    """A route's own refusal, and a dependency given where a router is included."""

    @app.get("/test/raised")
    def raised(loc: str) -> None:
        """A route's own validation error, at a `loc` of the caller's."""
        raise RequestValidationError([{"loc": (loc, PLANTED), "type": "own_error"}])

    # A dependency given where the router is included, whose parameters only FastAPI's
    # record of the route it chose holds.
    router = APIRouter()

    @router.post("/shapes")
    def included(body: Leaf) -> None: ...

    app.include_router(router, prefix="/test/included", dependencies=[Depends(filtered)])


def locations_app() -> FastAPI:
    app = create_app(make_settings())

    @app.post("/test/shapes")
    def shapes(body: Shapes) -> None: ...

    @app.post("/test/leaf-list")
    def leaf_list(body: list[Leaf]) -> None: ...

    @app.post("/test/dictionary")
    def dictionary(body: dict[str, int]) -> None: ...

    @app.post("/test/two-bodies")
    def two_bodies(leaf: Leaf, counts: dict[str, int]) -> None: ...

    @app.post("/test/embedded")
    def embedded(counts: Annotated[dict[str, int], Body(embed=True)]) -> None: ...

    @app.get("/test/search")
    def search(query: Annotated[Search, Query()]) -> None: ...

    @app.get("/test/mapping")
    def mapping(query: Annotated[ParsedMapping, Query()]) -> None: ...

    @app.get("/test/parameters/{itemId}")
    def parameters(
        itemId: int,  # noqa: N803 the wire's name, as a path template spells it
        ids: Annotated[list[int], Query(alias="itemIds")] = [],  # noqa: B006 FastAPI copies it
        limit: int = 1,
        x_page: Annotated[int, Header()] = 1,
    ) -> None: ...

    add_raising_routes(app)
    return app


@pytest.fixture(scope="module")
def locations_client() -> Iterator[TestClient]:
    with TestClient(locations_app()) as client:
        yield client


type Errors = list[tuple[list[str | int], str]]


def shapes_row(
    sent: object, *errors: tuple[list[str | int], str]
) -> tuple[str, str, object, Errors]:
    return "POST", "/test/shapes", sent, list(errors)


def nested_branches(depth: int) -> dict[str, object]:
    """A branch holding a branch, `depth` deep, the deepest with the planted key."""
    branch: dict[str, object] = {PLANTED: 1}
    for _ in range(depth):
        branch = {"branches": [branch]}
    return {"branch": branch}


LOCATIONS: dict[str, tuple[str, str, object, Errors]] = {
    "an unknown key": shapes_row({PLANTED: 1}, (["body"], "extra_forbidden")),
    "an unknown key of a nested model": shapes_row(
        {"leaf": {PLANTED: 1}}, (["body", "leaf"], "extra_forbidden")
    ),
    "an unknown key of a model in a list": shapes_row(
        {"leaves": [{}, {PLANTED: 1}]}, (["body", "leaves", 1], "extra_forbidden")
    ),
    "a field of a model in a list": shapes_row(
        {"leaves": [{"itemCount": PLANTED}]}, (["body", "leaves", 0, "itemCount"], "int_parsing")
    ),
    "an index of a set": shapes_row(
        {"leafSet": [PLANTED]}, (["body", "leafSet", 0], "int_parsing")
    ),
    "a place in a fixed tuple": shapes_row(
        {"pair": [1, {"itemCount": PLANTED, PLANTED: 1}]},
        (["body", "pair", 1, "itemCount"], "int_parsing"),
        (["body", "pair", 1], "extra_forbidden"),
    ),
    "a place in a tuple of any length": shapes_row(
        {"run": [{}, {"itemCount": PLANTED}]}, (["body", "run", 1, "itemCount"], "int_parsing")
    ),
    "a dictionary entry whose value fails": shapes_row(
        {"counts": {PLANTED: "x"}}, (["body", "counts"], "int_parsing")
    ),
    "a model in a dictionary": shapes_row(
        {"namedLeaves": {PLANTED: {"itemCount": "x"}}}, (["body", "namedLeaves"], "int_parsing")
    ),
    "a dictionary key that fails": shapes_row(
        {"shortKeys": {PLANTED: 1}}, (["body", "shortKeys"], "string_too_long")
    ),
    "a dictionary key spelled as a declared field": shapes_row(
        {"namedLeaves": {"leaf": {PLANTED: 1}}}, (["body", "namedLeaves"], "extra_forbidden")
    ),
    "a union of a dictionary and a number": shapes_row(
        {"anything": [PLANTED]},
        (["body", "anything"], "dict_type"),
        (["body", "anything"], "int_type"),
    ),
    "an unknown key of a discriminated union's choice": shapes_row(
        {"pet": {"kind": "cat", "lives": "x", PLANTED: 1}},
        (["body", "pet", "cat", "lives"], "int_parsing"),
        (["body", "pet", "cat"], "extra_forbidden"),
    ),
    "an unknown discriminator": shapes_row(
        {"pet": {"kind": PLANTED}}, (["body", "pet"], "union_tag_invalid")
    ),
    "an unknown key of a union of models": shapes_row(
        {"either": {"kind": "cat", "lives": "x", PLANTED: 1}},
        (["body", "either", "Cat", "lives"], "int_parsing"),
        (["body", "either", "Cat"], "extra_forbidden"),
        (["body", "either", "Dog", "kind"], "literal_error"),
        (["body", "either", "Dog"], "extra_forbidden"),
        (["body", "either", "Dog"], "extra_forbidden"),
    ),
    "a union choice the schema tags": shapes_row(
        {"tagged": {"itemCount": PLANTED}},
        (["body", "tagged", "tagged-leaf", "itemCount"], "int_parsing"),
        (["body", "tagged"], "int_type"),
    ),
    "an unknown key deep in a model that holds itself": shapes_row(
        {"branch": {"branches": [{"branches": [{PLANTED: 1}]}]}},
        (["body", "branch", "branches", 0, "branches", 0], "extra_forbidden"),
    ),
    "a body nested as deep as Pydantic follows": shapes_row(
        nested_branches(200),
        (["body", "branch", *["branches", 0] * 200], "extra_forbidden"),
    ),
    "a key inside a field of encoded JSON": shapes_row(
        {"encoded": f'{{"{PLANTED}": "x"}}'}, (["body", "encoded"], "int_parsing")
    ),
    "a field read at a path": shapes_row(
        {"second": [PLANTED]}, (["body", "second", 0], "int_parsing")
    ),
    "an alias left over once another bound": shapes_row(
        {"first": 1, "spare": PLANTED}, (["body"], "extra_forbidden")
    ),
    "a field's snake_case name": shapes_row(
        {"leaf": {"item_count": PLANTED}}, (["body", "leaf"], "extra_forbidden")
    ),
    "a validator's own loc under a field": shapes_row(
        {"ownField": PLANTED}, (["body", "ownField"], "own_error")
    ),
    "a validator's own loc on a model": shapes_row({"ownModel": PLANTED}, (["body"], "own_error")),
    "a validator's own key under a field read at a path": shapes_row(
        {"ownModel": f"second/{PLANTED}"}, (["body", "second"], "own_error")
    ),
    "a validator's own key under a tuple": shapes_row(
        {"ownPair": [PLANTED, 0]}, (["body", "ownPair"], "own_error")
    ),
    "a validator's own index past a tuple's end": shapes_row(
        {"ownPair": [9, 0]}, (["body", "ownPair"], "own_error")
    ),
    "a validator's own index before a list's start": shapes_row(
        {"ownList": [PLANTED]}, (["body", "ownList"], "own_error")
    ),
    "a validator's own index under a dictionary": shapes_row(
        {"ownCounts": {PLANTED: 7}}, (["body", "ownCounts"], "own_error")
    ),
    "a validator's own text under a discriminated union": shapes_row(
        {"ownPet": PLANTED}, (["body", "ownPet"], "own_error")
    ),
    "a validator's own text under encoded JSON of any shape": shapes_row(
        {"ownJson": f'"{PLANTED}"'}, (["body", "ownJson"], "own_error")
    ),
    "a list as the body": (
        "POST",
        "/test/leaf-list",
        [{"itemCount": PLANTED, PLANTED: 1}],
        [(["body", 0, "itemCount"], "int_parsing"), (["body", 0], "extra_forbidden")],
    ),
    "a dictionary as the body": (
        "POST",
        "/test/dictionary",
        {PLANTED: "x"},
        [(["body"], "int_parsing")],
    ),
    "two body parameters": (
        "POST",
        "/test/two-bodies",
        {"leaf": {PLANTED: 1}, "counts": {PLANTED: "x"}},
        [(["body", "leaf"], "extra_forbidden"), (["body", "counts"], "int_parsing")],
    ),
    "an embedded body parameter": (
        "POST",
        "/test/embedded",
        {"counts": {PLANTED: "x"}},
        [(["body", "counts"], "int_parsing")],
    ),
    "an unknown query key of a query model": (
        "GET",
        f"/test/search?pageSize=x&{PLANTED}=1",
        None,
        [(["query", "pageSize"], "int_parsing"), (["query"], "extra_forbidden")],
    ),
    "a dictionary of a query model, named as the model is, with a field's name for a key": (
        "GET",
        '/test/mapping?query={"pageSize":"x"}',
        None,
        [(["query", "query"], "int_parsing")],
    ),
    "a path, a query and a header parameter": (
        "GET",
        "/test/parameters/x?itemIds=1&itemIds=x",
        None,
        [
            (["path", "itemId"], "int_parsing"),
            (["query", "itemIds", 1], "int_parsing"),
            (["header", "x-page"], "int_parsing"),
        ],
    ),
    "a dependency given where a router is included": (
        "POST",
        f"/test/included/shapes?onlyMine=x&{PLANTED}=1",
        {PLANTED: 1},
        [
            (["query", "onlyMine"], "bool_parsing"),
            (["query"], "extra_forbidden"),
            (["body"], "extra_forbidden"),
        ],
    ),
    "a route's own error under a source": (
        "GET",
        "/test/raised?loc=body",
        None,
        [(["body"], "own_error")],
    ),
    "a route's own error under no source": (
        "GET",
        f"/test/raised?loc={PLANTED}",
        None,
        [([], "own_error")],
    ),
}


@pytest.mark.parametrize(("method", "url", "sent", "errors"), LOCATIONS.values(), ids=LOCATIONS)
def test_a_422_names_only_what_the_schema_declares(
    locations_client: TestClient, method: str, url: str, sent: object, errors: Errors
) -> None:
    # Only the route with a header parameter reads it.
    response = locations_client.request(method, url, json=sent, headers={"x-page": "x"})

    assert response.status_code == 422
    assert response.json()["params"] == {
        "errors": [{"loc": loc, "type": error_type} for loc, error_type in errors]
    }
    assert PLANTED not in response.text


def test_the_walk_takes_each_shared_step_once_however_many_errors_share_it(
    locations_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A caller chooses how many errors a body has, and how deep: see DEF-040."""
    taken: list[object] = []
    steps = error_locations._steps  # noqa: SLF001 the walk's cost shows nowhere else

    def counted(
        node: CoreSchema, segment: Segment, definitions: Mapping[str, CoreSchema]
    ) -> Iterator[CoreSchema | None]:
        taken.append(segment)
        return steps(node, segment, definitions)

    monkeypatch.setattr(error_locations, "_steps", counted)

    def steps_for(entries: int) -> int:
        taken.clear()
        sent = {"counts": {f"{PLANTED}{entry}": "x" for entry in range(entries)}}
        response = locations_client.post("/test/shapes", json=sent)
        assert len(response.json()["params"]["errors"]) == entries
        # Each error's own last segment, the dictionary's key, is a step of its own.
        return len(taken) - entries

    assert steps_for(50) == steps_for(1)
