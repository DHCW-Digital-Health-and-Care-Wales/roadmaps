import { readdirSync, readFileSync } from "node:fs"
import { basename, extname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The root guide loads into every agent session, so its size is a budget and it holds
 * rules, never a record of deliveries (docs/operations/authoring-agent-instructions.md).
 * Incident: by November 2026 the root guide had grown to about 9,900 words, 87% of them
 * a per-delivery handoff log. Review the budget's headroom by February 2027.
 */
const ROOT = join(import.meta.dirname, "..")
const ROOT_GUIDE_WORD_BUDGET = 1200

const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist"])
/** The top-level `docs/` defines the record ID format, so its guide is exempt. */
const RECORDS_GUIDE_DIRECTORY = join(ROOT, "docs")

/**
 * Every guide file the policy names (docs/operations/authoring-agent-instructions.md):
 * an `AGENTS.md` or `CLAUDE.md` anywhere, each file under these directories, and these
 * files, which the app guides tell every agent to follow.
 */
const GUIDE_DIRECTORIES = [".agents/skills", ".claude/agents"]
const GUIDE_FILES = ["apps/typescript-react-conventions.md"]
const GUIDE_NAMES = new Set(["AGENTS.md", "CLAUDE.md"])
const BINARY_EXTENSIONS = new Set([".png"])

/**
 * A record ID a guide shows as an example of the format, not as a citation of a record:
 * the guide, then the IDs it may show. A test below fails when the example goes, so the
 * list cannot outlive it.
 */
const FORMAT_EXAMPLES: Readonly<Record<string, readonly string[]>> = {
  ".agents/skills/implement-story/references/pull-requests.md": ["STY-010"],
}

/**
 * Not preceded by a letter or digit, nor followed by a digit, since `\b` treats `_` as
 * part of a word and so missed an ID set in italics (`_STY-… amendments_`, an ADR
 * section's name), which a reviewer caught instead. Review by February 2027.
 */
const RECORD_ID = /(?<![A-Za-z\d])(?:STY|DEF|CHO|EPC)-\d{3}(?!\d)/g

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
}

function listFiles(
  directory: string,
  isSkipped: (path: string) => boolean,
): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return isSkipped(path) ? [] : listFiles(path, isSkipped)
    }
    return [relative(ROOT, path)]
  })
}

function findGuides(): string[] {
  const guideNamed = listFiles(
    ROOT,
    (path) =>
      basename(path).startsWith(".") ||
      SKIPPED_DIRECTORIES.has(basename(path)) ||
      path === RECORDS_GUIDE_DIRECTORY,
  ).filter((path) => GUIDE_NAMES.has(basename(path)))
  const guideDirectories = GUIDE_DIRECTORIES.flatMap((directory) =>
    listFiles(join(ROOT, directory), (path) =>
      SKIPPED_DIRECTORIES.has(basename(path)),
    ),
  ).filter((path) => !BINARY_EXTENSIONS.has(extname(path)))
  return [...guideNamed, ...guideDirectories, ...GUIDE_FILES]
}

function citedRecordIds(path: string): string[] {
  const examples = FORMAT_EXAMPLES[path] ?? []
  return (read(path).match(RECORD_ID) ?? []).filter(
    (id) => !examples.includes(id),
  )
}

const guides = findGuides()

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

  it.each([
    ["STY-101", true],
    ["(ADR-020, _STY-101 amendments_)", true],
    ["_CHO-048_", true],
    ["XSTY-101", false],
    ["STY-1010", false],
  ])("reads %j as a record ID: %s", (text, isRecordId) => {
    expect(text.match(RECORD_ID) !== null).toBe(isRecordId)
  })

  it.each([
    "AGENTS.md",
    "apps/editor/AGENTS.md",
    "apps/typescript-react-conventions.md",
    ".agents/skills/threat-review/SKILL.md",
    ".agents/skills/implement-story/references/pull-requests.md",
    ".claude/agents/code-reviewer.md",
  ])("reads the guide file %s", (path) => {
    expect(guides).toContain(path)
  })

  it.each(["docs/AGENTS.md", ".agents/skills/shadcn/assets/shadcn.png"])(
    "leaves %s unread",
    (path) => {
      expect(guides).not.toContain(path)
    },
  )

  it.each(guides)("%s cites no backlog record IDs", (path) => {
    expect(
      citedRecordIds(path),
      `${path} cites records: state the rule itself and cite its ADR; a delivery's ` +
        "history belongs in the record and its PR. A deliberate example of the format " +
        "goes in FORMAT_EXAMPLES.",
    ).toEqual([])
  })

  it.each(Object.entries(FORMAT_EXAMPLES))(
    "%s still shows its format example",
    (path, ids) => {
      const shown = read(path).match(RECORD_ID) ?? []
      expect(shown).toEqual(expect.arrayContaining([...ids]))
    },
  )
})
