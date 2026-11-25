"""The base of every model on the wire, where JSON is camelCase (ADR-017 _STY-092 amendments_).

A request's models, nested ones included, inherit `ApiRequestModel`, and a route's plain
query parameter takes `Annotated[Model, Query()]` or an explicit `alias`. A response's
inherit `ApiResponseModel`. `ApiError.params` keeps camelCase keys by hand.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiRequestModel(BaseModel):
    """Binds camelCase names alone, never a field's snake_case name.

    A snake_case key is ignored like any unknown one: a required field is then missing,
    and an optional one keeps its default.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        serialize_by_alias=True,
        validate_by_alias=True,
        validate_by_name=False,
    )


class ApiResponseModel(BaseModel):
    """Built by snake_case field names in Python, serialised in camelCase."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        serialize_by_alias=True,
        validate_by_alias=True,
        validate_by_name=True,
    )
