"""A 422's `loc`, cut to what the route's schema declares (ADR-020).

A caller chooses a `loc`'s segment wherever they choose a key: one a model forbids, a
dictionary's, and any a validator puts in a `loc` of its own. So each `loc` is followed
through the Pydantic core schemas of the route that refused it, and cut before the first
segment they do not declare. A shape not followed here ends the `loc` at the field that
has it, so a new one loses detail rather than echo a key.

What a route and a parameter hold is read from FastAPI's own, not all of it documented:
`apps/api/tests/test_errors.py` holds each case, and a bump that changes one fails there.
"""

from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any, Final

from fastapi._compat import ModelField
from fastapi.dependencies.models import Dependant

# FastAPI's own rule for a parameter whose fields come straight after its source.
from fastapi.dependencies.utils import _get_param_model
from starlette.types import Scope

from roadmaps_api.fastapi_scope import effective_route_context

type Segment = str | int
type CoreSchema = Mapping[str, Any]

# Where FastAPI says an error is, ahead of anything the schema names.
_PARAMETERS: Final = ("query", "path", "header", "cookie")
# Schemas around another, which take no segment of their own.
_WRAPPERS: Final = frozenset(
    {"model", "nullable", "default", "function-before", "function-after", "function-wrap", "json"}
)
_COLLECTIONS: Final = frozenset({"list", "set", "frozenset", "deque", "generator"})


@dataclass
class _Reached:
    """Where a walk stands: the schemas it may be at, and where each next segment led."""

    # None for a segment the schema declares with nothing known under it.
    schemas: list[CoreSchema | None]
    after: dict[Segment, _Reached] = field(default_factory=dict)


class DeclaredLocations:
    """Cuts each `loc` of one refused request.

    A caller chooses how many errors a request has, and how deep each lies, so each step
    into a schema is worked out once and kept for the errors that share it.
    """

    def __init__(self, scope: Scope) -> None:
        # The scope's `route` lacks what was given where its router was included.
        self._route: Any = effective_route_context(scope) or scope["route"]
        self._starts: dict[int, _Reached] = {}
        self._definitions: dict[str, CoreSchema] = {}

    def cut(self, loc: Sequence[Segment], error_type: str) -> list[Segment]:
        """The leading segments of `loc` that the schema declares: field names and indices."""
        if not loc or loc[0] not in ("body", *_PARAMETERS):
            return []
        source, *rest = loc
        # FastAPI's own, for a body it could not parse: the position where reading failed.
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
        if source == "body":
            length = self._declared_in_body(rest)
        else:
            length = self._declared_in_parameters(str(source), rest)
        return [source, *rest[:length]]

    def _declared_in_body(self, segments: Sequence[Segment]) -> int:
        # FastAPI's one field for the whole body, a model of its own over several parameters.
        body: ModelField | None = self._route.body_field
        return 0 if body is None else self._declared(_schema_of(body), segments)

    def _declared_in_parameters(self, source: str, segments: Sequence[Segment]) -> int:
        lengths = [0]
        for parameter in _parameters(self._route.dependant, source):
            if _get_param_model(parameter) is not None:
                lengths.append(self._declared(_schema_of(parameter), segments))
            # Any other parameter comes by its own name.
            elif segments and segments[0] == (parameter.validation_alias or parameter.alias):
                lengths.append(1 + self._declared(_schema_of(parameter), segments[1:]))
        return max(lengths)

    def _declared(self, schema: CoreSchema, segments: Sequence[Segment]) -> int:
        """How many leading segments `schema` declares, over every way it can follow them.

        One segment at a time, never by recursion: a model that holds itself lets a
        caller nest a `loc` deeper than Python recurses.
        """
        reached = self._starts.get(id(schema))
        if reached is None:
            reached = self._starts[id(schema)] = _Reached([schema])
        for count, segment in enumerate(segments):
            following = reached.after.get(segment)
            if following is None:
                following = reached.after[segment] = _Reached(self._follow(reached, segment))
            if not following.schemas:
                return count
            reached = following
        return len(segments)

    def _follow(self, reached: _Reached, segment: Segment) -> list[CoreSchema | None]:
        """What `segment` leads to, from every schema the walk may be at."""
        following: list[CoreSchema | None] = []
        pending = list(reached.schemas)
        while pending:
            node = pending.pop()
            if node is None:
                continue
            if node["type"] == "definitions":
                self._definitions.update({each["ref"]: each for each in node["definitions"]})
                pending.append(node["schema"])
            elif node["type"] == "definition-ref":
                pending.append(self._definitions[node["schema_ref"]])
            elif node["type"] in _WRAPPERS:
                # A bare `Json` field's has no schema inside.
                pending.append(node.get("schema"))
            else:
                following.extend(_steps(node, segment, self._definitions))
        return following


def _parameters(dependant: Dependant, source: str) -> Iterator[ModelField]:
    yield from getattr(dependant, f"{source}_params")
    for dependency in dependant.dependencies:
        yield from _parameters(dependency, source)


def _schema_of(parameter: ModelField) -> CoreSchema:
    return parameter._type_adapter.core_schema  # noqa: SLF001 FastAPI gives no public way to it


def _steps(
    node: CoreSchema, segment: Segment, definitions: Mapping[str, CoreSchema]
) -> Iterator[CoreSchema | None]:
    """What lies under `segment` of `node`, if `node` declares it.

    A dictionary yields nothing, since its keys are the caller's, as does any shape not
    followed here.
    """
    kind = node["type"]
    if kind == "model-fields":
        for name, model_field in node["fields"].items():
            for path in _paths(name, model_field):
                if path[0] == segment:
                    yield _along(path[1:], model_field["schema"])
    elif kind == "alias-path":
        if node["path"][0] == segment:
            yield _along(node["path"][1:], node["schema"])
    elif kind in ("union", "tagged-union"):
        yield from _choices(node, segment, definitions)
    elif isinstance(segment, int) and segment >= 0:
        yield from _items(node, segment)


def _paths(name: str, model_field: CoreSchema) -> list[list[Segment]]:
    # A name, a path of segments, or a list of such paths to choose from.
    alias = model_field.get("validation_alias", name)
    if isinstance(alias, str):
        return [[alias]]
    return alias if isinstance(alias[0], list) else [alias]


def _along(path: list[Segment], schema: CoreSchema) -> CoreSchema:
    """`schema`, behind what is left of the path an alias reads it at."""
    # Not a Pydantic schema: the walk's own, for a path of more than one segment.
    return {"type": "alias-path", "path": path, "schema": schema} if path else schema


def _choices(
    node: CoreSchema, label: Segment, definitions: Mapping[str, CoreSchema]
) -> Iterator[CoreSchema]:
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


def _items(node: CoreSchema, index: int) -> Iterator[CoreSchema | None]:
    """The schema at `index` of a sequence or a set, and nothing for any other node."""
    if node["type"] in _COLLECTIONS:
        yield node.get("items_schema")
    elif node["type"] == "tuple":
        items = node["items_schema"]
        # Pydantic's one variadic form, `tuple[X, ...]`, has `X` alone.
        if "variadic_item_index" in node:
            yield items[0]
        elif index < len(items):
            yield items[index]
