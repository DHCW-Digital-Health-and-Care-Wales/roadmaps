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
    [
      "Markdown anywhere",
      ["README.md", "apps/editor/AGENTS.md", "apps/public-site/README.md"],
    ],
    ["a directory under apps/ that is no app", ["apps/other/app.py"]],
    ["no files", []],
  ])("skips every app's jobs for %s", (_case, paths) => {
    expect(classify(...paths)).toBe("editor=false\nsite=false\napi=false\n")
  })

  it.each([
    ["the editor's code", ["apps/editor/src/main.tsx"]],
    ["the editor's E2E snapshots", ["apps/editor/tests/e2e/a-snapshots/b.yml"]],
  ])("runs only the editor's jobs for %s", (_case, paths) => {
    expect(classify(...paths)).toBe("editor=true\nsite=false\napi=false\n")
  })

  it.each([
    ["the public site's code", ["apps/public-site/src/main.tsx"]],
    [
      "the public site's ARIA snapshots",
      ["apps/public-site/e2e/__snapshots__/structure.spec.ts/a.aria.yml"],
    ],
  ])("runs only the public site's jobs for %s", (_case, paths) => {
    expect(classify(...paths)).toBe("editor=false\nsite=true\napi=false\n")
  })

  it.each([
    ["the API's code", ["apps/api/src/roadmaps_api/app.py"]],
    [
      "the API's lockfile and Compose file",
      ["apps/api/uv.lock", "apps/api/compose.yaml"],
    ],
  ])("runs only the API's jobs for %s", (_case, paths) => {
    expect(classify(...paths)).toBe("editor=false\nsite=false\napi=true\n")
  })

  it.each([
    [
      "the API's generated schemas",
      ["packages/api-types/src/generated/zod.gen.ts"],
    ],
    ["the generated package's manifest", ["packages/api-types/package.json"]],
  ])("runs the editor's and the API's jobs for %s", (_case, paths) => {
    expect(classify(...paths)).toBe("editor=true\nsite=false\napi=true\n")
  })

  it.each([
    ["the lockfile", ["pnpm-lock.yaml"]],
    ["any other package", ["packages/other/src/index.ts"]],
    ["a package whose name starts as api-types", ["packages/api-types-x/a.ts"]],
    [
      "the root's configuration",
      ["package.json", "pnpm-workspace.yaml", ".nvmrc"],
    ],
    ["a workflow", [".github/workflows/ci.yml"]],
    ["the shared example sheets", ["fixtures/sheets/ProductA.csv"]],
    ["a file directly under apps/", ["apps/editor"]],
    ["one code file among documentation", ["docs/a.md", "eslint.config.ts"]],
    [
      "every app's code",
      [
        "apps/editor/src/main.tsx",
        "apps/public-site/src/main.tsx",
        "apps/api/src/roadmaps_api/app.py",
      ],
    ],
  ])("runs every app's jobs for %s", (_case, paths) => {
    expect(classify(...paths)).toBe("editor=true\nsite=true\napi=true\n")
  })

  it("reads a last path with no newline after it", () => {
    const result = spawnSync(SCRIPT, {
      input: "docs/a.md\napps/public-site/src/main.tsx",
      encoding: "utf8",
    })
    expect(result.stdout).toBe("editor=false\nsite=true\napi=false\n")
  })

  it("runs every app's jobs with --all, whatever the paths", () => {
    expect(run(["--all"], ["docs/a.md"])).toBe(
      "editor=true\nsite=true\napi=true\n",
    )
  })
})
