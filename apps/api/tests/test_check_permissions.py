"""The permission check fails raw permission string literals outside `authz/permissions.py`.

Mirrors `test_check_transactions.py` (ADR-019, STY-105 S2, D13).
"""

import subprocess
import sys
from pathlib import Path

import pytest

from roadmaps_api.authz import Permission
from tools import check_permissions

API_DIR = Path(__file__).parent.parent


def test_the_permission_check_passes_the_api_source_and_tools(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.chdir(API_DIR)

    assert check_permissions.main([]) == 0
    assert capsys.readouterr().out == ""


def test_the_permission_check_excludes_only_the_catalogue_module(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    catalogue = tmp_path / "src" / "roadmaps_api" / "authz" / "permissions.py"
    catalogue.parent.mkdir(parents=True)
    catalogue.write_text(f'X = "{Permission.ROADMAPS_EDIT.value}"\n', encoding="utf-8")

    assert (
        check_permissions.main(
            [str(tmp_path / "src" / "roadmaps_api")],
            catalogue_path=catalogue,
        )
        == 0
    )
    assert capsys.readouterr().out == ""


VIOLATIONS = {
    "a plain assignment": (f'NEEDED = "{Permission.MEMBERS_MANAGE.value}"\n', 1),
    "a comparison": (f'def f(p):\n    return p == "{Permission.LISTS_EDIT.value}"\n', 2),
    "a set literal": (f'ALLOWED = {{"{Permission.ROADMAPS_CREATE.value}"}}\n', 1),
    "an f-string holding a permission literal": (
        f'x = f"{Permission.TENANT_SETTINGS.value}"\n',
        1,
    ),
    "a non-docstring expression statement later in a function": (
        f'def f():\n    "module doc"\n    "{Permission.CONTENT_REDACT.value}"\n',
        3,
    ),
}


@pytest.mark.parametrize(("source", "line"), VIOLATIONS.values(), ids=VIOLATIONS)
def test_the_permission_check_fails_raw_permission_literals(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], source: str, line: int
) -> None:
    planted = tmp_path / "planted.py"
    planted.write_text(source, encoding="utf-8")
    (tmp_path / "clean.py").write_text('OTHER = "not:a-permission"\n', encoding="utf-8")

    assert check_permissions.main([str(tmp_path)]) == 1
    out = capsys.readouterr().out
    assert f"{planted}:{line}:" in out
    assert "Permission" in out


def test_the_permission_check_ignores_docstrings_at_every_scope(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    doc_file = tmp_path / "documented.py"
    doc_file.write_text(
        f'"{Permission.ROADMAPS_EDIT.value}"\n\n'
        "class Policy:\n"
        f'    "{Permission.ROADMAPS_EDIT_ANY.value}"\n\n'
        "    def check(self) -> None:\n"
        f'        "{Permission.ROADMAPS_PUBLISH.value}"\n\n'
        "    async def acheck(self) -> None:\n"
        f'        "{Permission.TAGS_EDIT.value}"\n',
        encoding="utf-8",
    )

    assert check_permissions.main([str(tmp_path)]) == 0
    assert capsys.readouterr().out == ""


def test_the_permission_check_runs_as_a_script_and_fails_a_violation(tmp_path: Path) -> None:
    planted = tmp_path / "planted.py"
    planted.write_text(f'P = "{Permission.ASSIGNMENTS_MANAGE.value}"\n', encoding="utf-8")

    result = subprocess.run(  # noqa: S603 - the test's own interpreter and arguments
        [sys.executable, "tools/check_permissions.py", str(tmp_path)],
        cwd=API_DIR,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 1
    assert f"{planted}:1:" in result.stdout
