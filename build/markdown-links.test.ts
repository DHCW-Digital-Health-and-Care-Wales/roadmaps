import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Every relative link in the repository's Markdown names a file that exists. A record
 * moves to `_archive/` when it closes (docs/AGENTS.md), which breaks the links into it
 * and the relative links out of it.
 * Incident: in November 2026 an epic's archive move left its stories' links to the epic
 * one directory too high, caught only in review, and earlier moves had broken 14 links
 * in two delivery-run records. Review by February 2027 whether it has caught any since.
 */
const ROOT = join(import.meta.dirname, "..")

/** Templates whose links are placeholders. */
const EXEMPT_PATHS = new Set([
  ".github/pull_request_template.md",
  "docs/backlog/_templates/epic.md",
])

/**
 * What a document shows rather than says, so its links are examples. An indented code
 * block is still read: its indent is a nested list's too.
 */
const NOT_PROSE = [
  // A fence of backticks or tildes, closed by one at least as long, or by the end.
  /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]*\1|(?![\s\S]))/gm,
  /<!--[\s\S]*?-->/g,
  // A code span, closed by as many backticks as open it, within its paragraph.
  /(?<!`)(`+)(?!`)(?:(?!\n[ \t]*\n)[\s\S])*?(?<!`)\1(?!`)/g,
]
/**
 * An inline link or image: its destination, in `<>` or bare (which may hold balanced
 * brackets), then an optional title.
 */
const INLINE_LINK =
  /\]\((?:<([^>\n]+)>|((?:[^()\s]|\([^()\s]*\))+))(?:\s+(?:"[^"]*"|'[^']*'))?\)/g
/** A URL with a scheme, an anchor in the same document, or a root-absolute path. */
const NOT_A_RELATIVE_FILE = /^(?:[a-z][a-z+.-]*:|#|\/)/i

/** The relative file targets of a document's inline links and images, in its prose. */
function relativeTargets(markdown: string): string[] {
  const prose = NOT_PROSE.reduce(
    (text, code) => text.replace(code, ""),
    markdown,
  )
  return [...prose.matchAll(INLINE_LINK)]
    .map(([, bracketed, bare]) => bracketed ?? bare ?? "")
    .filter((target) => !NOT_A_RELATIVE_FILE.test(target))
    .map((target) => decodeURIComponent(target.split(/[?#]/)[0] ?? ""))
}

/** Tracked and untracked Markdown files that `.gitignore` leaves in, as they are on disk. */
function findMarkdown(): string[] {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "*.md"],
    { cwd: ROOT, encoding: "utf8" },
  )
    .split("\0")
    .filter((path) => path !== "" && existsSync(join(ROOT, path)))
}

describe("markdown links", () => {
  it("reads only relative file targets, in prose", () => {
    const markdown = [
      "See [the epic](../README.md#progress) and ![a frame](frame.png 'x').",
      'A [titled link](notes.md "Notes"), a [site](https://example.org) and [a heading](#top).',
      "A capture: ![the menu](<shots/menu open.png>), [a spaced name](<my%20notes.md>).",
      "A [bracketed name](notes_(old).md) and a [plain view](guide.md?plain=1#top).",
      "Code keeps its own: `[a](missing.md)`, ``[b](missing.md) and a ` `` and a span",
      "that `wraps [c](missing.md)",
      "over a line`. <!-- [d](missing.md) -->",
      "```md",
      "[e](missing.md)",
      "```",
      "~~~",
      "[f](missing.md)",
      "~~~",
      "1. A step:",
      "   ````md",
      "   ```md",
      "   [g](missing.md)",
      "   ```",
      "   [h](missing.md)",
      "   ````",
      "   - [a nested item](nested.md)",
      "",
      "A lone ` reaches no further than its paragraph.",
      "",
      "After it, [a link](after.md) and its `code`.",
      "```md",
      "[i](missing.md), in a fence left open",
    ].join("\n")

    expect(relativeTargets(markdown)).toEqual([
      "../README.md",
      "frame.png",
      "notes.md",
      "shots/menu open.png",
      "my notes.md",
      "notes_(old).md",
      "guide.md",
      "nested.md",
      "after.md",
    ])
  })

  it("resolves every relative link to a file that exists", () => {
    const files = findMarkdown()
    const broken = files
      .filter((path) => !EXEMPT_PATHS.has(path))
      .flatMap((path) =>
        relativeTargets(readFileSync(join(ROOT, path), "utf8"))
          .filter((target) => !existsSync(join(ROOT, dirname(path), target)))
          .map((target) => `${path} -> ${target}`),
      )

    expect(files, "the scan reads the repository's Markdown").toContain(
      "docs/AGENTS.md",
    )
    expect(
      broken,
      "A moved file breaks the relative links into it and out of it: point each at the file's path now. Exempt only a template whose links are placeholders.",
    ).toEqual([])
  })
})
