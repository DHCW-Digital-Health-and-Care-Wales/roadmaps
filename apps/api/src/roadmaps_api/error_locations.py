"""A 422's `loc`, cut to what the route's schema declares (ADR-020).

A caller chooses a `loc`'s segment wherever they choose a key: one a model forbids, a
dictionary's, and any a validator puts in a `loc` of its own. So each `loc` is followed
through the Pydantic core schemas of the route that refused it, and cut before the first
segment they do not declare. A shape not followed here ends the `loc` at the field that
has it, so a new one loses detail rather than echo a key.

FastAPI's record of the route and a parameter's schema are not documented interfaces:
`apps/api/tests/test_errors.py` holds each case, and a bump that changes one fails there.
"""

from collections.abc import Iterator, Mapping, Sequence
from typing import Any, Final

from starlette.types import Scope

type Segment = str | int
type CoreSchema = Mapping[str, Any]
type Definitions = Mapping[str, CoreSchema]

# Where FastAPI says an error is, ahead of anything the schema names.
_PARAMETERS: Final = ("query", "path", "header", "cookie")
# Schemas around another, which add no segment of their own.
_WRAPPERS: Final = frozenset(
    {"model", "nullable", "default", "function-before", "function-after", "function-wrap", "json"}
)
_COLLECTIONS: Final = frozenset({"list", "set", "frozenset", "deque", "generator"})


def declared_location(scope: Scope, loc: Sequence[Segment], error_type: str) -> list[Segment]:
    """The leading segments of `loc` that the schema declares: field names and indices."""
    if not loc or loc[0] not in ("body", *_PARAMETERS):
        return []
    source, *rest = loc
    # FastAPI's own, for a body it could not parse: the position where reading it failed.
    if (
        error_type == "json_invalid"
        and source == "body"
        and len(rest) == 1
        and type(rest[0]) is int
    ):
        return list(loc)
    # A forbidden key is the caller's, even one spelled as a name the schema has.
    if error_type == "extra_forbidden":
        rest = rest[:-1]
    # FastAPI keeps an included router's route, with what was given where it was
    # included, apart from the scope's `route`.
    route = scope.get("fastapi", {}).get("effective_route_context") or scope["route"]
    if source == "body":
        length = _in_body(route.body_field, rest)
    else:
        length = _in_parameters(route.dependant, str(source), rest)
    return [source, *rest[:length]]


def _in_body(body_field: Any, segments: Sequence[Segment]) -> int:  # noqa: ANN401 FastAPI's
    # FastAPI's one field for the whole body, a model of its own over several parameters.
    return 0 if body_field is None else _declared(_schema_of(body_field), segments)


def _in_parameters(dependant: Any, source: str, segments: Sequence[Segment]) -> int:  # noqa: ANN401
    lengths = [0]
    for parameter in _parameters(dependant, source):
        schema = _schema_of(parameter)
        # A parameter model's fields come straight after the source; any other
        # parameter comes by its own name.
        lengths.append(_declared(schema, segments))
        if segments and segments[0] == (parameter.validation_alias or parameter.alias):
            lengths.append(1 + _declared(schema, segments[1:]))
    return max(lengths)


def _parameters(dependant: Any, source: str) -> Iterator[Any]:  # noqa: ANN401 FastAPI's
    yield from getattr(dependant, f"{source}_params")
    for dependency in dependant.dependencies:
        yield from _parameters(dependency, source)


def _schema_of(field: Any) -> CoreSchema:  # noqa: ANN401 FastAPI's
    return field._type_adapter.core_schema  # noqa: SLF001 FastAPI gives no public way to it


def _declared(schema: CoreSchema, segments: Sequence[Segment]) -> int:
    """How many leading segments `schema` declares, over every way it can follow them."""
    declared = 0
    definitions: dict[str, CoreSchema] = {}
    # A list of what is left to follow, never recursion: a model that holds itself lets
    # a caller nest a `loc` deeper than Python recurses.
    pending: list[tuple[CoreSchema | None, int]] = [(schema, 0)]
    while pending:
        node, at = pending.pop()
        declared = max(declared, at)
        if node is None or at == len(segments):
            continue
        pending.extend(
            (inner, at + used) for inner, used in _steps(node, segments, at, definitions)
        )
    return declared


def _steps(
    node: CoreSchema, segments: Sequence[Segment], at: int, definitions: dict[str, CoreSchema]
) -> Iterator[tuple[CoreSchema | None, int]]:
    """The schemas under `node`, each with how many segments, from `at`, lead to it.

    None leads to a segment the schema declares with nothing known under it. A node that
    yields nothing ends the `loc`: a dictionary, whose keys are the caller's, among them.
    """
    kind = node["type"]
    if kind == "definitions":
        definitions.update({each["ref"]: each for each in node["definitions"]})
    if kind == "definition-ref":
        yield definitions[node["schema_ref"]], 0
    elif kind == "definitions" or kind in _WRAPPERS:
        # A bare `Json` field's has no schema inside.
        yield node.get("schema"), 0
    elif kind == "model-fields":
        for name, field in node["fields"].items():
            for path in _paths(name, field):
                if list(segments[at : at + len(path)]) == path:
                    yield field["schema"], len(path)
    elif kind in ("union", "tagged-union"):
        yield from ((choice, 1) for choice in _choices(node, segments[at], definitions))
    elif isinstance(index := segments[at], int):
        yield from ((item, 1) for item in _items(node, index))


def _items(node: CoreSchema, index: int) -> Iterator[CoreSchema | None]:
    """The schema at `index` of a sequence or a set, and nothing for any other node."""
    if node["type"] in _COLLECTIONS:
        yield node.get("items_schema")
    elif node["type"] == "tuple":
        yield _item_of_tuple(node, index)


def _choices(node: CoreSchema, label: Segment, definitions: Definitions) -> Iterator[CoreSchema]:
    """A union's choices that `label` names, as Pydantic names the one it tried."""
    if node["type"] == "tagged-union":
        if label in node["choices"]:
            yield node["choices"][label]
        return
    for choice in node["choices"]:
        # Named by the schema's own tag, or else by its model's class.
        if isinstance(choice, tuple):
            schema, name = choice
        else:
            schema = choice
            model = definitions.get(choice.get("schema_ref"), choice)
            name = getattr(model.get("cls"), "__name__", None)
        if label == name:
            yield schema


def _paths(name: str, field: CoreSchema) -> list[list[Segment]]:
    # A name, a path of segments, or a list of such paths to choose from.
    alias = field.get("validation_alias", name)
    if isinstance(alias, str):
        return [[alias]]
    return alias if isinstance(alias[0], list) else [alias]


def _item_of_tuple(node: CoreSchema, index: int) -> CoreSchema | None:
    items = node["items_schema"]
    # Pydantic's one variadic form, `tuple[X, ...]`, has `X` alone.
    if "variadic_item_index" in node:
        return items[0]
    return items[index] if 0 <= index < len(items) else None
