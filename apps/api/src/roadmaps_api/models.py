"""The SQLAlchemy models' declarative base, whose metadata the migrations match.

Every constraint and index takes its name from SQLAlchemy's documented naming
convention (ADR-017 _Schema conventions_, STY-091 D18). No model exists yet.
"""

from typing import Final

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION: Final = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
