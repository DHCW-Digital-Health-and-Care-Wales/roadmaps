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
 * in two delivery-run records. Review the exemptions by February 2027.
 */
const ROOT = join(import.meta.dirname, "..")

/** Templates whose links are placeholders, and records waiting on CHO-022. */
const EXEMPT_PATHS = new Set([
  ".github/pull_request_template.md",
  "docs/backlog/_templates/epic.md",
  "docs/analysis/delivery-runs/2026-11-14-epc-011-adding-roadmaps-and-items.md",
  "docs/analysis/delivery-runs/2026-11-15-backlog-triage-mop-up.md",
])

/** An inline link or image: its destination, bare or in `<>`, then an optional title. */
const INLINE_LINK =
  /\]\((?:<([^>\n]+)>|([^)\s]+))(?:\s+(?:"[^"]*"|'[^']*'))?\)/g
/** A URL with a scheme, an anchor in the same document, or a root-absolute path. */
const NOT_A_RELATIVE_FILE = /^(?:[a-z][a-z+.-]*:|#|\/)/i

/** The relative file targets of a document's inline links and images, outside code. */
function relativeTargets(markdown: string): string[] {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
  return [...prose.matchAll(INLINE_LINK)]
    .map(([, bracketed, bare]) => bracketed ?? bare ?? "")
    .filter((target) => !NOT_A_RELATIVE_FILE.test(target))
    .map((target) => decodeURIComponent(target.split("#")[0] ?? ""))
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
  it("reads only relative file targets, outside code", () => {
    const markdown = [
      "See [the epic](../README.md#progress) and ![a frame](frame.png 'x').",
      'A [titled link](notes.md "Notes"), a [site](https://example.org) and [a heading](#top).',
      "A capture: ![the menu](<shots/menu open.png>), [a spaced name](<my%20notes.md>).",
      "Code keeps its own: `[a](missing.md)`.",
      "```md",
      "[b](missing.md)",
      "```",
    ].join("\n")

    expect(relativeTargets(markdown)).toEqual([
      "../README.md",
      "frame.png",
      "notes.md",
      "shots/menu open.png",
      "my notes.md",
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
