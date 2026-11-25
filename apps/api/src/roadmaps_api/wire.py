"""The base of every model on the wire, where JSON is camelCase (ADR-017 _STY-092 amendments_).

A request's models, nested ones included, inherit `ApiRequestModel`, and a route's plain
query parameter takes `Annotated[Model, Query()]` or an explicit `alias`. A response's
inherit `ApiResponseModel`. `ApiError.params` keeps camelCase keys by hand.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiRequestModel(BaseModel):
    """Binds camelCase names alone, and refuses any key it does not declare.

    A field's snake_case name is such a key: sending it answers `extra_forbidden`, and
    `missing` beside it for a required field.

    Which keys a model is given is FastAPI's choice (as 0.163 makes it):

    - A query model is given the whole query string. A route with one takes no other
      query parameter, whether its own, a dependency's or one given where its router is
      included, or it refuses valid requests. Where another party writes the query, as a
      sign-in provider's callback, which may add parameters of its own, take plain
      aliased parameters or set `extra="ignore"`. Plain query parameters ignore keys
      they do not declare.
    - A header or cookie model is given every header or cookie, so it sets
      `extra="ignore"`. A header model's field reads the header its alias names, here the
      camelCase one, so give each the header's name as an explicit `alias`.
    - Several body parameters, or an embedded one, are each read from the body by name,
      and its other top-level keys are ignored: take a body as one model, not embedded.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        serialize_by_alias=True,
        validate_by_alias=True,
        validate_by_name=False,
        extra="forbid",
    )


class ApiResponseModel(BaseModel):
    """Built by snake_case field names in Python, serialised in camelCase."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        serialize_by_alias=True,
        validate_by_alias=True,
        validate_by_name=True,
    )
