"""The revisions are numbered in one line (STY-091 S4, D7).

Each revision's ID is its file's name, `0001_<slug>`, short enough for Alembic's version
column; the numbers run from 0001 with no repeat and no gap; each revision follows the one
numbered below it, so they have one head. `tests/test_revisions.py` runs it on the
package's migrations.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from alembic.util import to_tuple

from roadmaps_api.migrations import REVISION, REVISION_MAX_LENGTH, scripts


@dataclass(frozen=True)
class Script:
    path: str
    revision: str
    # The revisions it follows: one, or none for the first.
    down_revisions: tuple[str, ...]


def package_scripts() -> list[Script]:
    return [
        Script(
            path=script.path,
            revision=script.revision,
            down_revisions=to_tuple(script.down_revision, default=()),
        )
        for script in scripts().walk_revisions()
    ]


def problems(scripts: Iterable[Script]) -> list[str]:
    """Each way the revisions break the numbering, or none."""
    scripts = list(scripts)
    found: list[str] = []
    followed = {down for script in scripts for down in script.down_revisions}
    heads = sorted(script.revision for script in scripts if script.revision not in followed)
    if len(heads) > 1:
        found.append(f"the revisions have {len(heads)} heads: {', '.join(heads)}")
    by_number: dict[int, list[Script]] = {}
    for script in scripts:
        found += _name_problems(script)
        match = REVISION.fullmatch(script.revision)
        if match is not None:
            by_number.setdefault(int(match["number"]), []).append(script)
    return found + _numbering_problems(by_number)


def _name_problems(script: Script) -> list[str]:
    found: list[str] = []
    if script.revision != Path(script.path).stem:
        found.append(f"{script.revision} differs from its file's name, {script.path}")
    if len(script.revision) > REVISION_MAX_LENGTH:
        found.append(
            f"{script.revision} is longer than Alembic's version column's "
            f"{REVISION_MAX_LENGTH} characters"
        )
    if REVISION.fullmatch(script.revision) is None:
        found.append(f"{script.revision} is not of the form NNNN_<slug>")
    return found


def _numbering_problems(by_number: dict[int, list[Script]]) -> list[str]:
    found: list[str] = []
    if 0 in by_number:
        found.append("the numbers start at 0001, not 0000")
    for number in range(1, max(by_number, default=0) + 1):
        numbered = by_number.get(number, [])
        below = by_number.get(number - 1, [])
        if not numbered:
            found.append(f"number {number:04d} is skipped")
        elif len(numbered) > 1:
            repeated = ", ".join(script.revision for script in numbered)
            found.append(f"number {number:04d} repeats: {repeated}")
        elif number == 1 or len(below) == 1:
            expected = () if number == 1 else (below[0].revision,)
            if numbered[0].down_revisions != expected:
                follows = ", ".join(numbered[0].down_revisions) or "no revision"
                found.append(f"{numbered[0].revision} follows {follows}, not the revision below it")
    return found
