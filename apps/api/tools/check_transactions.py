"""Fails a route, authz module or repository that ends a transaction (ADR-017 _Layering_).

Services end transactions; routes, authz modules and repositories never call `commit()`,
`rollback()` or `begin()` on a session (`with session.begin():` commits as it closes).
A call by any of those names fails, whatever object it is made on, since the type is
not known here: name the method otherwise. Run from `apps/api` with no arguments to
check the API, or with the directories to check.
"""

import ast
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Final

LAYERS: Final = (
    Path("src/roadmaps_api/routes"),
    Path("src/roadmaps_api/authz"),
    Path("src/roadmaps_api/repositories"),
)
ENDS_A_TRANSACTION: Final = frozenset({"commit", "rollback", "begin"})


def violations(path: Path) -> Iterator[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr in ENDS_A_TRANSACTION
        ):
            yield (
                f"{path}:{node.lineno}: `.{node.func.attr}()` ends a transaction; "
                "only a service does (ADR-017 Layering)"
            )


def main(directories: list[str]) -> int:
    roots = [Path(directory) for directory in directories] or list(LAYERS)
    found = [
        violation
        for root in roots
        for path in sorted(root.rglob("*.py"))
        for violation in violations(path)
    ]
    for violation in found:
        print(violation)  # noqa: T201 - the check's report
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
