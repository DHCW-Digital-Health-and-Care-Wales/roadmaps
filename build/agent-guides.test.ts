import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The root guide loads into every agent session, so its size is a budget and it holds
 * rules, never a record of deliveries (docs/operations/authoring-agent-instructions.md).
 * Incident: by November 2026 the root guide had grown to about 9,900 words, 87% of them
 * a per-delivery handoff log. Review the budget's headroom by February 2027.
 */
const ROOT = join(import.meta.dirname, "..")
const ROOT_GUIDE_WORD_BUDGET = 1200

/** `docs/` defines the record ID format, so its guide is exempt. */
const SKIPPED_DIRECTORIES = new Set(["node_modules", "docs", "dist"])

const RECORD_ID = /\b(?:STY|DEF|CHO|EPC)-\d{3}\b/g

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
}

function findGuides(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      const skipped =
        entry.name.startsWith(".") || SKIPPED_DIRECTORIES.has(entry.name)
      return skipped ? [] : findGuides(path)
    }
    return entry.name === "AGENTS.md" ? [relative(ROOT, path)] : []
  })
}

describe("agent guides", () => {
  it(`keeps the root AGENTS.md within ${String(ROOT_GUIDE_WORD_BUDGET)} words`, () => {
    const words = read("AGENTS.md").split(/\s+/).filter(Boolean).length

    expect(
      words,
      `AGENTS.md is ${String(words)} words. Move a rule to its narrowest home ` +
        "(docs/operations/authoring-agent-instructions.md, Where it goes) rather than " +
        "deleting a live one; ask the owner when nothing can move.",
    ).toBeLessThanOrEqual(ROOT_GUIDE_WORD_BUDGET)
  })

  it.each(findGuides(ROOT))("%s cites no backlog record IDs", (path) => {
    expect(
      read(path).match(RECORD_ID) ?? [],
      `${path} cites records: state the rule itself and cite its ADR; a delivery's ` +
        "history belongs in the record and its PR.",
    ).toEqual([])
  })
})
