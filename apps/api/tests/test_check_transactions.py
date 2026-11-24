"""The transaction check fails a route or repository ending a transaction (ADR-017).

import-linter's layers contract is configured, not written here, so no test runs it.
"""

import subprocess
import sys
from pathlib import Path

import pytest

from tools import check_transactions

API_DIR = Path(__file__).parent.parent


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
