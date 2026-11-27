"""Fails any raw permission string literal outside `authz/permissions.py` (ADR-019, STY-105 D13).

Permission names live in `roadmaps_api.authz.permissions.Permission` and must only be
referenced through that enumeration, never as raw string literals in code. Docstrings are
ignored. Run from `apps/api` with no arguments to check `src/roadmaps_api/` and `tools/`,
or with directories to check.
"""

import ast
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Final

from roadmaps_api.authz.permissions import Permission

SCAN_ROOTS: Final = (Path("src/roadmaps_api"), Path("tools"))
CATALOGUE_PATH: Final = Path("src/roadmaps_api/authz/permissions.py")
PERMISSION_VALUES: Final = frozenset(permission.value for permission in Permission)


def _docstring_node_ids(tree: ast.AST) -> set[int]:
    """Identifies `ast.Constant` nodes that are module, class or function docstrings."""
    ids: set[int] = set()
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef | ast.AsyncFunctionDef)
            and node.body
            and isinstance(node.body[0], ast.Expr)
            and isinstance(node.body[0].value, ast.Constant)
            and isinstance(node.body[0].value.value, str)
        ):
            ids.add(id(node.body[0].value))
    return ids


def violations(path: Path) -> Iterator[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    docstrings = _docstring_node_ids(tree)
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Constant)
            and isinstance(node.value, str)
            and id(node) not in docstrings
            and node.value in PERMISSION_VALUES
        ):
            yield (
                f"{path}:{node.lineno}: raw permission string literal {node.value!r}; "
                "use roadmaps_api.authz.Permission (ADR-019)"
            )


def main(directories: list[str], *, catalogue_path: Path = CATALOGUE_PATH) -> int:
    roots = [Path(directory) for directory in directories] or list(SCAN_ROOTS)
    excluded = catalogue_path.resolve()
    found = [
        violation
        for root in roots
        for path in sorted(root.rglob("*.py"))
        if path.resolve() != excluded
        for violation in violations(path)
    ]
    for violation in found:
        print(violation)  # noqa: T201 - the check's report
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
