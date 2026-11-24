import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename, dirname, extname, join } from "node:path"

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
const RECORDS_GUIDE = "docs/AGENTS.md"

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
      path !== RECORDS_GUIDE &&
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

/**
 * Repo-root backticked paths in AGENTS.md files exist on disk. `markdown-links.test.ts`
 * checks only Markdown links, which agent guides avoid in favour of plain code spans.
 * Incident: in November 2026 a review found broken/relative `fixtures/…` paths in
 * `apps/editor/tests/e2e/AGENTS.md` that looked like repo-root paths. Review by 2027-02-24.
 */
const REPO_ROOT_PREFIX =
  /^(?:apps|docs|build|scripts|fixtures|\.agents|\.claude|\.github)\//
const PLACEHOLDER = /[<>*…{}$]/
const GITIGNORED_PATH =
  /(?:^|\/)(?:\.env[^/]*\.local|\.data|node_modules|\.artifacts)(?:\/|$)/
const SKIPPED_PROSE = new RegExp(
  [
    /^[ \t]*(?<fence>(?<mark>`|~)\k<mark>{2,})[^\n]*\n[\s\S]*?(?:^[ \t]*\k<fence>\k<mark>*[ \t]*$|(?![\s\S]))/,
    /<!--[\s\S]*?-->/,
  ]
    .map((pattern) => pattern.source)
    .join("|"),
  "gm",
)
const INLINE_CODE =
  /(?<!`)(?<ticks>`+)(?!`)(?<content>(?:(?!\n[ \t]*\n)[\s\S])*?)(?<!`)\k<ticks>(?!`)/g

function repoRootPathsIn(markdown: string): string[] {
  const prose = markdown.replace(SKIPPED_PROSE, "")
  const paths = new Set<string>()
  for (const match of prose.matchAll(INLINE_CODE)) {
    const raw = match.groups?.content ?? ""
    if (raw.includes("\n")) continue
    const trimmed = raw.trim()
    if (
      trimmed.includes(" ") ||
      !REPO_ROOT_PREFIX.test(trimmed) ||
      PLACEHOLDER.test(trimmed) ||
      GITIGNORED_PATH.test(trimmed)
    ) {
      continue
    }
    paths.add(trimmed)
  }
  return [...paths]
}

/**
 * Every `AGENTS.md` has a sibling `CLAUDE.md` that only imports it (`@AGENTS.md`), and
 * no orphan `CLAUDE.md` sits without an `AGENTS.md` (AGENTS.md, Working conventions).
 * Guards against retiring or adding a nested guide without updating its shim.
 * Review by 2027-02-24.
 */
function claudeShimMismatches(
  paths: readonly string[],
  readContent: (path: string) => string,
): string[] {
  const agents = new Set(paths.filter((path) => basename(path) === "AGENTS.md"))
  const claudes = new Set(
    paths.filter((path) => basename(path) === "CLAUDE.md"),
  )
  const sibling = (path: string, name: string) => {
    const dir = dirname(path)
    return dir === "." ? name : `${dir}/${name}`
  }

  const mismatches: string[] = []
  for (const path of agents) {
    const shim = sibling(path, "CLAUDE.md")
    if (!claudes.has(shim)) {
      mismatches.push(`missing ${shim} for ${path}`)
    } else if (readContent(shim).trim() !== "@AGENTS.md") {
      mismatches.push(`${shim} must contain only "@AGENTS.md"`)
    }
  }
  for (const path of claudes) {
    const guide = sibling(path, "AGENTS.md")
    if (!agents.has(guide)) {
      mismatches.push(`orphan ${path} without ${guide}`)
    }
  }
  return mismatches
}

/**
 * Every `SKILL.md` with `disable-model-invocation: true` must match any sibling
 * `agents/openai.y*ml` (`allow_implicit_invocation: false`) so Claude and Codex runtimes
 * agree on discovery.
 * Incident: in November 2026 adding `disable-model-invocation: true` to SKILL.md left
 * sibling `agents/openai.yaml` files with `allow_implicit_invocation: true`.
 * Review by 2027-02-24.
 */
function invocationPolicyMismatches(
  paths: readonly string[],
  readContent: (path: string) => string,
): string[] {
  const pathSet = new Set(paths)
  const skillManifests = paths.filter((path) =>
    /^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(path),
  )
  const mismatches: string[] = []
  for (const skillPath of skillManifests) {
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(
      readContent(skillPath),
    )?.[1]
    if (
      !frontmatter ||
      !/^disable-model-invocation:\s*true$/m.test(frontmatter)
    ) {
      continue
    }
    const dir = dirname(skillPath)
    const openaiPath = [
      `${dir}/agents/openai.yaml`,
      `${dir}/agents/openai.yml`,
    ].find((candidate) => pathSet.has(candidate))
    if (!openaiPath) continue
    if (
      !/^\s*allow_implicit_invocation:\s*false(?:\s|$)/m.test(
        readContent(openaiPath),
      )
    ) {
      mismatches.push(
        `${openaiPath} must set allow_implicit_invocation: false to match ${skillPath}`,
      )
    }
  }
  return mismatches
}

const repositoryFiles = listRepositoryFiles()
const guides = selectGuides(repositoryFiles)
const agentsGuides = repositoryFiles.filter(
  (path) => basename(path) === "AGENTS.md",
)

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
    ["docs/CLAUDE.md", true],
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

  it("detects missing, orphan or modified CLAUDE.md shims", () => {
    const contents: Record<string, string> = {
      "CLAUDE.md": "@AGENTS.md\n",
      "apps/bad/CLAUDE.md": "extra rules\n",
      "apps/orphan/CLAUDE.md": "@AGENTS.md\n",
    }
    const mismatches = claudeShimMismatches(
      [
        "AGENTS.md",
        "CLAUDE.md",
        "apps/missing/AGENTS.md",
        "apps/bad/AGENTS.md",
        "apps/bad/CLAUDE.md",
        "apps/orphan/CLAUDE.md",
      ],
      (path) => contents[path] ?? "",
    )
    expect(mismatches).toEqual([
      "missing apps/missing/CLAUDE.md for apps/missing/AGENTS.md",
      'apps/bad/CLAUDE.md must contain only "@AGENTS.md"',
      "orphan apps/orphan/CLAUDE.md without apps/orphan/AGENTS.md",
    ])
  })

  it("pairs every AGENTS.md with a sibling @AGENTS.md CLAUDE.md", () => {
    expect(claudeShimMismatches(repositoryFiles, read)).toEqual([])
  })

  it("extracts only concrete repo-root paths from prose code spans", () => {
    const sample = [
      "Read `apps/editor/AGENTS.md` and `docs/GLOSSARY.md`.",
      "Double backticks `` `apps/ignored/wrapped.ts` `` do not break `docs/AGENTS.md`.",
      "Ignore `apps/editor/src/features/<name>/`, `apps/editor/src/**/*.ts`, `apps/editor/.env.local`, `apps/public-site/.data/`, `apps/editor/node_modules/pkg`, `.artifacts/out` and `pnpm editor:test src/styles`.",
      "<!-- `apps/commented/out.ts` -->",
      "```sh",
      "cat `apps/nonexistent/file.ts`",
      "```",
    ].join("\n")
    expect(repoRootPathsIn(sample)).toEqual([
      "apps/editor/AGENTS.md",
      "docs/GLOSSARY.md",
      "docs/AGENTS.md",
    ])
  })

  it.each(agentsGuides)("%s names only repo-root paths that exist", (path) => {
    const missing = repoRootPathsIn(read(path)).filter(
      (target) => !existsSync(join(ROOT, target)),
    )
    expect(
      missing,
      `${path} cites a path that does not exist on disk: update or remove it.`,
    ).toEqual([])
  })

  it("detects SKILL.md disable-model-invocation mismatches with openai.yaml", () => {
    const disabled = "---\nname: x\ndisable-model-invocation: true\n---\n"
    const files: Record<string, string> = {
      ".agents/skills/ok/SKILL.md": disabled,
      ".agents/skills/ok/agents/openai.yaml":
        "policy:\n  allow_implicit_invocation: false\n",
      ".agents/skills/true/SKILL.md": disabled,
      ".agents/skills/true/agents/openai.yaml":
        "policy:\n  allow_implicit_invocation: true\n",
      ".agents/skills/commented/SKILL.md": disabled,
      ".agents/skills/commented/agents/openai.yml":
        "# allow_implicit_invocation: false\n",
      ".agents/skills/model-invoked/SKILL.md": "---\nname: y\n---\n",
      ".agents/skills/model-invoked/agents/openai.yaml":
        "policy:\n  allow_implicit_invocation: true\n",
    }
    expect(
      invocationPolicyMismatches(Object.keys(files), (p) => files[p] ?? ""),
    ).toEqual([
      ".agents/skills/true/agents/openai.yaml must set allow_implicit_invocation: false to match .agents/skills/true/SKILL.md",
      ".agents/skills/commented/agents/openai.yml must set allow_implicit_invocation: false to match .agents/skills/commented/SKILL.md",
    ])
  })

  it("matches disable-model-invocation in SKILL.md with sibling openai.yaml policy", () => {
    expect(invocationPolicyMismatches(repositoryFiles, read)).toEqual([])
  })
})
