import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The root guide loads into every agent session, so its size is a budget and it holds
 * rules, never a record of deliveries (docs/operations/authoring-agent-instructions.md).
 */
const ROOT = join(import.meta.dirname, "..")
const ROOT_GUIDE_WORD_BUDGET = 1200

/** The code areas' guides; `docs/AGENTS.md` defines the ID format, so it is exempt. */
const GUIDES = ["AGENTS.md", "src/styles/AGENTS.md", "tests/e2e/AGENTS.md"]

const RECORD_ID = /\b(?:STY|DEF|CHO|EPC)-\d{3}\b/g

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
}

describe("agent guides", () => {
  it(`keeps the root AGENTS.md within ${String(ROOT_GUIDE_WORD_BUDGET)} words`, () => {
    const words = read("AGENTS.md").split(/\s+/).filter(Boolean).length

    expect(
      words,
      `AGENTS.md is ${String(words)} words. Move a rule to its narrowest home (a check, a code ` +
        "comment, a nested AGENTS.md, a skill reference or the epic's delivery-notes.md) " +
        "rather than deleting a live one; ask the owner when nothing can move.",
    ).toBeLessThanOrEqual(ROOT_GUIDE_WORD_BUDGET)
  })

  it.each(GUIDES)("%s cites no backlog record IDs", (path) => {
    expect(
      read(path).match(RECORD_ID) ?? [],
      `${path} cites records: state the rule itself and cite its ADR; a delivery's ` +
        "history belongs in the record and its PR.",
    ).toEqual([])
  })
})
