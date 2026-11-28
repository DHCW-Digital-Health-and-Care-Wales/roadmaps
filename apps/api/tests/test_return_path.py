"""D9 & TM-02: pure unit tests for strict relative SPA `returnPath` validation."""

import pytest

from roadmaps_api.services.auth import validate_return_path


@pytest.mark.parametrize(
    "bad_path",
    [
        "",
        "roadmaps",
        "https://evil.example/roadmaps",
        "http://evil.example/roadmaps",
        "//evil.example/roadmaps",
        "/\\evil.example",
        "/foo\\bar",
        "/foo#frag",
        "/foo bar",
        "/foo\nbar",
        "/foo\rbar",
        "/foo\x00bar",
        "/foo\x7fbar",
        "/foo\x85bar",
        "/foo\x90bar",
        "/foo\u202ebar",
        "/foo\u200bbar",
        "javascript:alert(1)",
        "/" + "a" * 512,
    ],
)
def test_return_path_rejects_open_redirects_and_unsafe_characters(bad_path: str) -> None:
    with pytest.raises(ValueError, match="returnPath"):
        validate_return_path(bad_path)


@pytest.mark.parametrize(
    "good_path",
    ["/", "/dhcw/roadmaps", "/dhcw/roadmaps?view=compact&q=1", "/" + "a" * 511],
)
def test_return_path_accepts_valid_relative_spa_paths(good_path: str) -> None:
    assert validate_return_path(good_path) == good_path
