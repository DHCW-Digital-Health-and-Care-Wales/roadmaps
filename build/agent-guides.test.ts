import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename, extname, join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The root guide loads into every agent session, so its size is a budget and it holds
 * rules, never a record of deliveries (docs/operations/authoring-agent-instructions.md).
 * Incident: by November 2026 the root guide had grown to about 9,900 words, 87% of them
 * a per-delivery handoff log. Review the budget's headroom by February 2027.
 */
const ROOT = join(import.meta.dirname, "..")
const ROOT_GUIDE_WORD_BUDGET = 1200

/**
 * Every guide file the policy names (docs/operations/authoring-agent-instructions.md):
 * an `AGENTS.md` or `CLAUDE.md` anywhere, each file under these directories, and these
 * files, which the app guides tell every agent to follow.
 */
const GUIDE_DIRECTORIES = [".agents/skills/", ".claude/agents/"]
const GUIDE_FILES = new Set(["apps/typescript-react-conventions.md"])
const GUIDE_NAMES = new Set(["AGENTS.md", "CLAUDE.md"])
const BINARY_EXTENSIONS = new Set([".png"])
/** `docs/` defines the record ID format, so its own guide is exempt, and no other. */
const RECORDS_GUIDES = new Set(["docs/AGENTS.md", "docs/CLAUDE.md"])

/**
 * A record ID a guide shows once as an example of the format, not as a citation of a
 * record: the guide, then the IDs it may show. A test below fails when the example goes,
 * so the list cannot outlive it.
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

/** The repository's files by Git, so a guide in a dot-directory or under `docs/` counts. */
function listRepositoryFiles(): string[] {
  const listing = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  )
  return listing
    .split("\0")
    .filter((path) => path !== "" && existsSync(join(ROOT, path)))
}

function selectGuides(paths: readonly string[]): string[] {
  return paths.filter(
    (path) =>
      !RECORDS_GUIDES.has(path) &&
      !BINARY_EXTENSIONS.has(extname(path)) &&
      (GUIDE_NAMES.has(basename(path)) ||
        GUIDE_FILES.has(path) ||
        GUIDE_DIRECTORIES.some((directory) => path.startsWith(directory))),
  )
}

/** Each example is exempt once: a second citation of its ID in the file still fails. */
function citedRecordIds(path: string): string[] {
  const cited: string[] = [...(read(path).match(RECORD_ID) ?? [])]
  for (const example of FORMAT_EXAMPLES[path] ?? []) {
    const index = cited.indexOf(example)
    if (index !== -1) cited.splice(index, 1)
  }
  return cited
}

const guides = selectGuides(listRepositoryFiles())

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
    ["AGENTS.md", true],
    ["apps/editor/AGENTS.md", true],
    ["apps/editor/CLAUDE.md", true],
    [".github/AGENTS.md", true],
    ["docs/adr/AGENTS.md", true],
    ["apps/typescript-react-conventions.md", true],
    [".agents/skills/threat-review/SKILL.md", true],
    [".agents/skills/implement-story/references/pull-requests.md", true],
    [".claude/agents/code-reviewer.md", true],
    ["docs/AGENTS.md", false],
    ["docs/CLAUDE.md", false],
    ["docs/backlog/README.md", false],
    [".claude/skills", false],
    [".agents/skills/shadcn/assets/shadcn.png", false],
    ["apps/editor/src/main.tsx", false],
  ])("reads %s as a guide file: %s", (path, isGuide) => {
    expect(selectGuides([path]).length === 1).toBe(isGuide)
  })

  it("reads the repository's guides, skills and agent definitions", () => {
    expect(guides).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        "apps/editor/AGENTS.md",
        "apps/typescript-react-conventions.md",
        ".agents/skills/threat-review/SKILL.md",
        ".claude/agents/code-reviewer.md",
      ]),
    )
  })

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
