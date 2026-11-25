"""S4: the revisions are numbered in one line, each its file's name (`tools/revisions.py`)."""

import pytest

from tools.revisions import Script, package_scripts, problems


def script(revision: str, *follows: str, path: str | None = None) -> Script:
    return Script(path=path or f"versions/{revision}.py", revision=revision, down_revisions=follows)


def test_the_package_s_revisions_are_numbered_in_one_line() -> None:
    scripts = package_scripts()

    assert scripts
    assert problems(scripts) == []


CASES = {
    "one line of three": (
        [script("0001_a"), script("0002_b", "0001_a"), script("0003_c", "0002_b")],
        [],
    ),
    "two heads": (
        [script("0001_a"), script("0002_b", "0001_a"), script("0003_c", "0001_a")],
        [
            "the revisions have 2 heads: 0002_b, 0003_c",
            "0003_c follows 0001_a, not the revision below it",
        ],
    ),
    "a repeated number": (
        [script("0001_a"), script("0002_b", "0001_a"), script("0002_c", "0002_b")],
        ["number 0002 repeats: 0002_b, 0002_c"],
    ),
    "a skipped number": (
        [script("0001_a"), script("0003_c", "0001_a")],
        ["number 0002 is skipped"],
    ),
    "a number from 0000": (
        [script("0000_a"), script("0001_b", "0000_a")],
        ["the numbers start at 0001, not 0000", "0001_b follows 0000_a, not the revision below it"],
    ),
    "a revision that is not its file's name": (
        [script("0001_a", path="versions/0001_b.py")],
        ["0001_a differs from its file's name, versions/0001_b.py"],
    ),
    "a revision not of the form NNNN_<slug>": (
        [script("1a2b3c4d5e6f")],
        ["1a2b3c4d5e6f is not of the form NNNN_<slug>"],
    ),
    "a revision longer than the version column": (
        [script("0001_" + "a" * 28)],
        [f"0001_{'a' * 28} is longer than Alembic's version column's 32 characters"],
    ),
    "a first revision that follows another": (
        [script("0001_a", "elsewhere")],
        ["0001_a follows elsewhere, not the revision below it"],
    ),
}


@pytest.mark.parametrize(("scripts", "expected"), CASES.values(), ids=CASES)
def test_the_check_names_each_break_in_the_line(scripts: list[Script], expected: list[str]) -> None:
    assert problems(scripts) == expected
