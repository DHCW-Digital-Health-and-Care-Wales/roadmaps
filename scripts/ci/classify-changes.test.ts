import { spawnSync } from "node:child_process"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/** Runs the classifier as ci.yml's changes job does, with the changed paths on stdin. */
const SCRIPT = join(import.meta.dirname, "classify-changes.sh")

function classify(...paths: string[]): string {
  return run([], paths)
}

function run(args: string[], paths: string[]): string {
  const result = spawnSync(SCRIPT, args, {
    input: paths.map((path) => `${path}\n`).join(""),
    encoding: "utf8",
  })
  expect(result.stderr).toBe("")
  expect(result.status).toBe(0)
  return result.stdout
}

describe("classify-changes.sh", () => {
  it.each([
    ["documentation", ["docs/adr/ADR-016.md", "docs/backlog/README.md"]],
    ["Markdown anywhere", ["README.md", "apps/editor/AGENTS.md"]],
    [
      "another app's directory",
      ["apps/public-site/src/main.ts", "apps/api/app.py"],
    ],
    ["no files", []],
  ])("skips the editor's jobs for %s", (_case, paths) => {
    expect(classify(...paths)).toBe("editor=false\n")
  })

  it.each([
    ["the editor's code", ["apps/editor/src/main.tsx"]],
    ["the lockfile", ["pnpm-lock.yaml"]],
    [
      "the root's configuration",
      ["package.json", "pnpm-workspace.yaml", ".nvmrc"],
    ],
    ["a workflow", [".github/workflows/ci.yml"]],
    ["a file directly under apps/", ["apps/editor"]],
    ["one code file among documentation", ["docs/a.md", "eslint.config.ts"]],
  ])("runs the editor's jobs for %s", (_case, paths) => {
    expect(classify(...paths)).toBe("editor=true\n")
  })

  it("runs every app's jobs with --all, whatever the paths", () => {
    expect(run(["--all"], ["docs/a.md"])).toBe("editor=true\n")
  })
})
