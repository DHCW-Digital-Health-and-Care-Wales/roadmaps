"""`pnpm api:openapi` exports the contract offline, and its check fails on drift."""

import json
import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

from tools import export_openapi

API_DIR = Path(__file__).parent.parent


@pytest.fixture
def no_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in [name for name in os.environ if name.startswith("ROADMAPS_")]:
        monkeypatch.delenv(name)


def exported(path: Path) -> str:
    assert export_openapi.main([], path) == 0
    return path.read_text(encoding="utf-8")


@pytest.mark.usefixtures("no_settings")
def test_the_export_needs_no_setting_and_reads_none(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    unset = exported(tmp_path / "unset.json")
    monkeypatch.setenv("ROADMAPS_ENV", "local")
    monkeypatch.setenv("ROADMAPS_DATABASE_URL", "not a URL")
    monkeypatch.setenv("ROADMAPS_ALLOWED_HOSTS", "*")

    assert exported(tmp_path / "local.json") == unset
    assert json.loads(unset)["info"]["title"] == "DHCW Roadmaps API"
    assert export_openapi.SETTINGS.environment == "production"
    assert unset.endswith("}\n")


@pytest.mark.usefixtures("no_settings")
def test_the_check_passes_the_committed_document(capsys: pytest.CaptureFixture[str]) -> None:
    assert export_openapi.main(["--check"]) == 0
    assert capsys.readouterr().out == ""


def add_a_route(document: dict[str, Any]) -> None:
    document["paths"]["/api/v1/planted"] = {"get": {"responses": {}}}


def drop_an_error_code(document: dict[str, Any]) -> None:
    document["components"]["schemas"]["ErrorCode"]["enum"].pop()


def add_an_error_code(document: dict[str, Any]) -> None:
    document["components"]["schemas"]["ErrorCode"]["enum"].append("planted.code")


DIVERGENCES: dict[str, Callable[[dict[str, Any]], None]] = {
    "a route the code does not have": add_a_route,
    "an error code missing from the document": drop_an_error_code,
    "an error code the code does not have": add_an_error_code,
}


@pytest.mark.parametrize("diverge", DIVERGENCES.values(), ids=DIVERGENCES)
def test_the_check_fails_a_document_that_diverges(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
    diverge: Callable[[dict[str, Any]], None],
) -> None:
    path = tmp_path / "openapi.json"
    document = json.loads(exported(path))
    diverge(document)
    path.write_text(export_openapi.serialise(document), encoding="utf-8")
    committed = path.read_text(encoding="utf-8")

    assert export_openapi.main(["--check"], path) == 1
    assert "pnpm api:contract" in capsys.readouterr().out
    assert path.read_text(encoding="utf-8") == committed


def test_an_unknown_argument_writes_nothing(tmp_path: Path) -> None:
    path = tmp_path / "openapi.json"

    assert export_openapi.main(["--chek"], path) == 2
    assert not path.exists()


def test_the_check_fails_a_missing_document(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    path = tmp_path / "openapi.json"

    assert export_openapi.main(["--check"], path) == 1
    assert "pnpm api:contract" in capsys.readouterr().out
    assert not path.exists()


def test_the_check_runs_as_a_module_with_no_setting() -> None:
    environment = {k: v for k, v in os.environ.items() if not k.startswith("ROADMAPS_")}

    result = subprocess.run(
        [sys.executable, "-m", "tools.export_openapi", "--check"],
        cwd=API_DIR,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )

    assert (result.returncode, result.stdout, result.stderr) == (0, "", "")
