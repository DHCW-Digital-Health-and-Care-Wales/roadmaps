"""Writes the API's OpenAPI document to `apps/api/openapi.json`, or checks it (`--check`).

The editor's schemas are generated from the committed file (`pnpm api:contract`), and CI
fails when it differs from the code. The app is built from one constant `Settings`, under
production's rules and never from the environment, so the file is the same on every
machine; building it connects to no database. `pnpm api:openapi` and
`pnpm api:openapi:check` run it from `apps/api`.
"""

import json
import sys
from pathlib import Path
from typing import Any, Final

from roadmaps_api.app import create_app
from roadmaps_api.settings import Environment, Settings

DOCUMENT: Final = Path(__file__).parent.parent / "openapi.json"
# Nothing connects to the database or answers a host, so both are placeholders.
SETTINGS: Final = Settings(
    environment=Environment.PRODUCTION,
    database_url="postgresql+psycopg://openapi@database.invalid/openapi",
    allowed_hosts=("openapi.invalid",),
    editor_origin="https://openapi.invalid",
)


def serialise(document: dict[str, Any]) -> str:
    return json.dumps(document, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def main(argv: list[str], path: Path = DOCUMENT) -> int:
    current = serialise(create_app(SETTINGS).openapi())
    if argv == []:
        path.write_text(current, encoding="utf-8")
        return 0
    if argv != ["--check"]:
        print("usage: python -m tools.export_openapi [--check]")  # noqa: T201 - the report
        return 2
    if path.is_file() and path.read_text(encoding="utf-8") == current:
        return 0
    print(  # noqa: T201 - the check's report
        f"{path} differs from the API's OpenAPI document: run `pnpm api:contract` "
        "and commit what it writes."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
