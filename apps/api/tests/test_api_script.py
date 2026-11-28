"""Tests that `apps/api/scripts/api.sh dev` wires `.env.worktree`'s `DEV_PORT` into settings."""

import os
import shutil
import stat
import subprocess
from pathlib import Path

import pytest

from roadmaps_api.settings import CLOUD_RUN_MARKERS, load_settings

API_DIR = Path(__file__).parent.parent
BASH = shutil.which("bash") or "/bin/bash"
WORKTREE_ENV = (
    "WORKTREE_SLOT=64\nDEV_PORT=21640\nAPI_PORT=21644\nDB_PORT=21645\nOIDC_PORT=21646\n"
    "API_DB_PROJECT=roadmaps-slot-64\n"
)


def _prepare_api_script_sandbox(tmp_path: Path, env_worktree: str | None) -> tuple[Path, Path]:
    """Stages a copy of `api.sh` with stub `docker`/`uv` executables to observe `api.sh dev`."""
    script_dir = tmp_path / "apps" / "api" / "scripts"
    script_dir.mkdir(parents=True)
    script = script_dir / "api.sh"
    shutil.copy2(API_DIR / "scripts" / "api.sh", script)
    if env_worktree is not None:
        (tmp_path / ".env.worktree").write_text(env_worktree, encoding="utf-8")

    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    uv_stub = (
        "#!/usr/bin/env bash\n"
        'if [[ "$*" == *"tools.mock_oidc"* ]]; then\n'
        '  printf "MOCK_ARGS=%s\\n" "$*"\n'
        "  exit 0\n"
        "fi\n"
        'if [[ "$*" == *"roadmaps_api.server"* ]]; then\n'
        '  printf "ORIGIN=%s\\n" "${ROADMAPS_EDITOR_ORIGIN:-}"\n'
        '  printf "HOSTS=%s\\n" "${ROADMAPS_ALLOWED_HOSTS:-}"\n'
        '  printf "ENV=%s\\n" "${ROADMAPS_ENV:-}"\n'
        '  printf "DB=%s\\n" "${ROADMAPS_DATABASE_URL:-}"\n'
        '  printf "MOCK_URL=%s\\n" "${ROADMAPS_LOCAL_MOCK_OIDC_URL:-}"\n'
        "fi\n"
        "exit 0\n"
    )
    for name, body in (("docker", "#!/usr/bin/env bash\nexit 0\n"), ("uv", uv_stub)):
        exe = bin_dir / name
        exe.write_text(body, encoding="utf-8")
        exe.chmod(exe.stat().st_mode | stat.S_IXUSR)
    return script, bin_dir


@pytest.mark.parametrize(
    ("env_worktree", "expected_origin", "expected_mock_url"),
    [
        (WORKTREE_ENV, "http://localhost:21640", "http://127.0.0.1:21646"),
        (None, "http://localhost:5173", "http://127.0.0.1:8001"),
    ],
    ids=[
        "worktree DEV_PORT and OIDC_PORT reach settings",
        "non-worktree falls back to 5173 and 8001",
    ],
)
def test_api_script_dev_exports_editor_origin_from_worktree_dev_port(
    tmp_path: Path, env_worktree: str | None, expected_origin: str, expected_mock_url: str
) -> None:
    script, bin_dir = _prepare_api_script_sandbox(tmp_path, env_worktree)
    env = {
        k: v
        for k, v in os.environ.items()
        if not k.startswith("ROADMAPS_") and k not in CLOUD_RUN_MARKERS
    }
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"

    result = subprocess.run(  # noqa: S603 - staged repo script with controlled PATH
        [BASH, str(script), "dev"],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    exported = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    assert exported["ORIGIN"] == expected_origin
    assert exported["MOCK_URL"] == expected_mock_url
    loaded = load_settings(
        {
            "ROADMAPS_ENV": exported["ENV"],
            "ROADMAPS_DATABASE_URL": exported["DB"],
            "ROADMAPS_ALLOWED_HOSTS": exported["HOSTS"],
            "ROADMAPS_EDITOR_ORIGIN": exported["ORIGIN"],
            "ROADMAPS_LOCAL_MOCK_OIDC_URL": exported["MOCK_URL"],
        }
    )
    assert loaded.editor_origin == expected_origin
    assert loaded.local_mock_oidc_url == expected_mock_url


def test_api_script_fails_when_worktree_env_lacks_dev_port(tmp_path: Path) -> None:
    script, bin_dir = _prepare_api_script_sandbox(
        tmp_path,
        "WORKTREE_SLOT=64\nAPI_PORT=21644\nDB_PORT=21645\nOIDC_PORT=21646\n"
        "API_DB_PROJECT=roadmaps-slot-64\n",
    )
    env = {"PATH": f"{bin_dir}:{os.environ.get('PATH', '')}"}

    result = subprocess.run(  # noqa: S603 - staged repo script with controlled PATH
        [BASH, str(script), "dev"],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )

    assert result.returncode == 1
    assert "DEV_PORT" in result.stderr


def test_api_script_dev_fails_when_worktree_env_lacks_oidc_port(tmp_path: Path) -> None:
    script, bin_dir = _prepare_api_script_sandbox(
        tmp_path,
        "WORKTREE_SLOT=64\nDEV_PORT=21640\nAPI_PORT=21644\nDB_PORT=21645\n"
        "API_DB_PROJECT=roadmaps-slot-64\n",
    )
    env = {"PATH": f"{bin_dir}:{os.environ.get('PATH', '')}"}

    result = subprocess.run(  # noqa: S603 - staged repo script with controlled PATH
        [BASH, str(script), "dev"],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )

    assert result.returncode == 1
    assert "OIDC_PORT" in result.stderr
