"""The migration environment: runs the revisions as the owner role (STY-091 D17, D30).

The migration login is a member of the owner role with SET and without INHERIT, so it
creates nothing until it switches, and the owner role owns every object a revision
creates, `alembic_version` included. `roadmaps_api.migrate` hands it a connection;
Alembic's own command line, configured from `apps/api/pyproject.toml` to draft a revision
by autogenerate, connects to `ROADMAPS_MIGRATION_DATABASE_URL`.
"""

import os

from alembic import context
from sqlalchemy import Connection, create_engine, text
from sqlalchemy.pool import NullPool

from roadmaps_api.migrate import migration_url
from roadmaps_api.models import Base
from roadmaps_api.roles import OWNER_ROLE


def run(connection: Connection) -> None:
    connection.execute(text(f"SET ROLE {OWNER_ROLE}"))
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


given: Connection | None = context.config.attributes.get("connection")
if given is not None:
    run(given)
else:
    engine = create_engine(migration_url(os.environ), poolclass=NullPool, hide_parameters=True)
    try:
        with engine.connect() as connection:
            run(connection)
            connection.commit()
    finally:
        engine.dispose()
