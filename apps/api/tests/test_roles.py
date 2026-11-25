"""The bootstrap file's database-scoped part, which the harness gives each clone."""

import pytest

from roadmaps_api import roles


def test_the_database_scoped_part_runs_from_its_marker_to_the_end() -> None:
    scoped = roles.database_scoped_sql()

    assert scoped.startswith(roles.DATABASE_SCOPED_MARKER)
    assert roles.bootstrap_sql().endswith(scoped)
    assert "CREATE ROLE" not in scoped


def test_a_file_without_the_marker_fails_loudly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(roles, "bootstrap_sql", lambda: "DO $$ BEGIN NULL; END $$;\n")

    with pytest.raises(ValueError, match="roadmaps:database-scoped"):
        roles.database_scoped_sql()
