"""The base of every model on the wire, where JSON is camelCase (ADR-017 _STY-092 amendments_).

A request's models, nested ones included, inherit `ApiRequestModel`, and a route's plain
query parameter takes `Annotated[Model, Query()]` or an explicit `alias`. A response's
inherit `ApiResponseModel`. `ApiError.params` keeps camelCase keys by hand.
`apps/api/AGENTS.md` (_The contract_) says where FastAPI hands a model more than the
caller's keys for it, or less.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiRequestModel(BaseModel):
    """Binds camelCase names alone, and refuses any key it does not declare.

    A field's snake_case name is such a key: sending it answers `extra_forbidden`, and
    `missing` beside it for a required field.
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
