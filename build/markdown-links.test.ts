import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"

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

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  "blob-report",
  "test-results",
])

/** Templates whose links are placeholders, and records waiting on CHO-022. */
const EXEMPT_PATHS = [
  ".github/pull_request_template.md",
  "docs/backlog/_templates/",
  "docs/analysis/delivery-runs/2026-11-14-epc-011-adding-roadmaps-and-items.md",
  "docs/analysis/delivery-runs/2026-11-15-backlog-triage-mop-up.md",
]

const INLINE_LINK = /\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g
const EXTERNAL_OR_ANCHOR = /^(?:[a-z][a-z+.-]*:|#|\/)/i

/** The relative file targets of a document's inline links and images, outside code. */
function relativeTargets(markdown: string): string[] {
  const prose = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
  return [...prose.matchAll(INLINE_LINK)]
    .map(([, target = ""]) => target)
    .filter((target) => !EXTERNAL_OR_ANCHOR.test(target))
    .map((target) => decodeURIComponent(target.split("#")[0] ?? ""))
}

function findMarkdown(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) ? [] : findMarkdown(path)
    }
    return entry.isFile() && entry.name.endsWith(".md")
      ? [relative(ROOT, path)]
      : []
  })
}

describe("markdown links", () => {
  it("reads only relative file targets, outside code", () => {
    const markdown = [
      "See [the epic](../README.md#progress) and ![a frame](frame.png 'x').",
      'A [titled link](notes.md "Notes"), a [site](https://example.org) and [a heading](#top).',
      "Code keeps its own: `[a](missing.md)`.",
      "```md",
      "[b](missing.md)",
      "```",
    ].join("\n")

    expect(relativeTargets(markdown)).toEqual([
      "../README.md",
      "frame.png",
      "notes.md",
    ])
  })

  it("resolves every relative link to a file that exists", () => {
    const broken = findMarkdown(ROOT)
      .filter((path) => !EXEMPT_PATHS.some((exempt) => path.startsWith(exempt)))
      .flatMap((path) =>
        relativeTargets(readFileSync(join(ROOT, path), "utf8"))
          .filter((target) => !existsSync(join(ROOT, dirname(path), target)))
          .map((target) => `${path} -> ${target}`),
      )

    expect(broken).toEqual([])
  })
})
