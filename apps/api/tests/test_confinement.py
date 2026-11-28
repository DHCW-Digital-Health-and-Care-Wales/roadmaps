"""D4: proves ruff banned-API and import-linter confinement rules actually reject violations."""

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

API_DIR = Path(__file__).parent.parent


@pytest.mark.parametrize(
    ("code", "expected"),
    [
        ("import jose\n", "TID251"),
        ("from jose import jwt\n", "TID251"),
        ("from authlib.jose import jwt\n", "TID251"),
        ("import authlib.jose\n", "TID251"),
    ],
    ids=["import jose", "from jose import jwt", "from authlib.jose", "import authlib.jose"],
)
def test_ruff_bans_python_jose_and_deprecated_authlib_jose(code: str, expected: str) -> None:
    ruff = Path(sys.executable).parent / "ruff"
    result = subprocess.run(  # noqa: S603 - repo venv ruff binary on synthetic stdin
        [str(ruff), "check", "--stdin-filename", "src/roadmaps_api/probe.py", "-"],
        cwd=API_DIR,
        input=code,
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert result.returncode == 1
    assert expected in result.stdout


@pytest.mark.parametrize(
    ("target_relpath", "bad_import", "contract_snippet"),
    [
        (
            "src/roadmaps_api/services/probe_bad.py",
            "import authlib\n",
            "Only roadmaps_api.identity",
        ),
        (
            "src/roadmaps_api/services/probe_bad.py",
            "import joserfc\n",
            "Only roadmaps_api.identity",
        ),
        (
            "src/roadmaps_api/services/probe_bad.py",
            "import requests\n",
            "Only roadmaps_api.identity",
        ),
        (
            "src/roadmaps_api/services/probe_bad.py",
            "from roadmaps_api.repositories import sessions\n",
            "Only roadmaps_api.services.sessions",
        ),
        (
            "src/roadmaps_api/routes/probe_bad.py",
            "from roadmaps_api.repositories.sessions import SessionRepository\n",
            "Only roadmaps_api.services.sessions",
        ),
    ],
    ids=[
        "authlib outside identity",
        "joserfc outside identity",
        "requests outside identity",
        "SessionRepository from services",
        "SessionRepository from routes",
    ],
)
def test_import_linter_rejects_oidc_and_session_repository_confinement_breaks(
    tmp_path: Path, target_relpath: str, bad_import: str, contract_snippet: str
) -> None:
    """Copies pyproject.toml and src/ into tmp_path with one bad import and runs lint-imports."""
    shutil.copy(API_DIR / "pyproject.toml", tmp_path / "pyproject.toml")
    shutil.copytree(API_DIR / "src", tmp_path / "src")
    (tmp_path / target_relpath).write_text(bad_import, encoding="utf-8")

    lint_imports = Path(sys.executable).parent / "lint-imports"
    env = {"PATH": str(Path(sys.executable).parent), "PYTHONPATH": str(tmp_path / "src")}
    result = subprocess.run(  # noqa: S603 - repo venv lint-imports on isolated temp copy
        [str(lint_imports)],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert result.returncode == 1, result.stdout + result.stderr
    assert contract_snippet in result.stdout
