"""S8: the layering checks fail a planted violation, naming its file and line."""

import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from tools import check_transactions

API_DIR = Path(__file__).parent.parent
PACKAGE = API_DIR / "src" / "roadmaps_api"


def lint_imports(source: Path, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # noqa: S603 - the test's own interpreter and arguments
        [Path(sys.executable).parent / "lint-imports", "--no-cache"],
        cwd=cwd,
        env={**os.environ, "PYTHONPATH": str(source)},
        capture_output=True,
        text=True,
        check=False,
    )


def test_import_linter_keeps_the_api_s_layers() -> None:
    result = lint_imports(API_DIR / "src", API_DIR)

    assert result.returncode == 0, result.stdout
    assert "1 kept, 0 broken" in result.stdout


UPWARD_IMPORTS = {
    "a service importing a route": ("services/readiness.py", "roadmaps_api.routes.probes"),
    "a repository importing a service": (
        "repositories/readiness.py",
        "roadmaps_api.services.readiness",
    ),
    "a repository importing a route": ("repositories/readiness.py", "roadmaps_api.routes"),
}


@pytest.mark.parametrize(("module", "imported"), UPWARD_IMPORTS.values(), ids=UPWARD_IMPORTS)
def test_import_linter_fails_an_import_of_a_layer_above(
    tmp_path: Path, module: str, imported: str
) -> None:
    source = tmp_path / "src"
    shutil.copytree(PACKAGE, source / "roadmaps_api")
    shutil.copy(API_DIR / "pyproject.toml", tmp_path)
    planted = source / "roadmaps_api" / module
    lines = planted.read_text().splitlines()
    planted.write_text("\n".join([f"import {imported}  # planted", *lines]) + "\n")

    result = lint_imports(source, tmp_path)

    importer = "roadmaps_api." + module.removesuffix(".py").replace("/", ".")
    assert result.returncode == 1
    assert f"{importer} -> {imported} (l.1)" in result.stdout


def test_the_transaction_check_passes_the_api_s_routes_and_repositories(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.chdir(API_DIR)

    assert check_transactions.main([]) == 0
    assert capsys.readouterr().out == ""


ENDING_A_TRANSACTION = {
    "a route committing": ("routes/a.py", "def f(session):\n    session.commit()\n", 2, "commit"),
    "a repository rolling back": (
        "repositories/a.py",
        "class R:\n    def f(self):\n        self._session.rollback()\n",
        3,
        "rollback",
    ),
    "a repository beginning a transaction it commits": (
        "repositories/a.py",
        "def f(session):\n    with session.begin():\n        pass\n",
        2,
        "begin",
    ),
}


@pytest.mark.parametrize("case", ENDING_A_TRANSACTION.values(), ids=ENDING_A_TRANSACTION)
def test_the_transaction_check_fails_a_route_or_repository_ending_a_transaction(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], case: tuple[str, str, int, str]
) -> None:
    module, source, line, method = case
    planted = tmp_path / module
    planted.parent.mkdir()
    planted.write_text(source)
    (planted.parent / "clean.py").write_text("def f(session):\n    session.execute()\n")

    assert check_transactions.main([str(planted.parent)]) == 1
    assert capsys.readouterr().out == (
        f"{planted}:{line}: `.{method}()` ends a transaction; only a service does "
        "(ADR-017 Layering)\n"
    )


def test_the_transaction_check_runs_as_a_script_and_fails_a_violation(tmp_path: Path) -> None:
    (tmp_path / "planted.py").write_text("session.commit()\n")

    result = subprocess.run(  # noqa: S603 - the test's own interpreter and arguments
        [sys.executable, "tools/check_transactions.py", str(tmp_path)],
        cwd=API_DIR,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 1
    assert f"{tmp_path / 'planted.py'}:1:" in result.stdout
