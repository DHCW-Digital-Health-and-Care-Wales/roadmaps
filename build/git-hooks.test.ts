import { execFileSync, spawnSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

/**
 * `pnpm install` installs the Git hooks (lefthook.yml) through the root package's
 * postinstall, which runs on every install that builds node_modules. lefthook's own
 * install script runs only the first time the package is built on a machine: pnpm
 * restores it from its store after that, so a later clone got no hooks (DEF-028).
 * The test runs the root's postinstall against a scratch repository.
 */
const ROOT = join(import.meta.dirname, "..")
const HOOKS = ["pre-commit", "pre-push"]

interface RootPackage {
  scripts: Record<string, string | undefined>
}

let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "git-hooks-"))
  execFileSync("git", ["init", "-q"], { cwd: scratch })
  copyFileSync(join(ROOT, "lefthook.yml"), join(scratch, "lefthook.yml"))
})

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true })
})

/** Runs the root's postinstall as pnpm does, for an install started in `scratch`. */
function postinstall(env: NodeJS.ProcessEnv): string[] {
  const { scripts } = JSON.parse(
    readFileSync(join(ROOT, "package.json"), "utf8"),
  ) as RootPackage
  const script = scripts.postinstall
  expect(
    script,
    "the root package.json needs a postinstall script",
  ).toBeDefined()

  const result = spawnSync("sh", ["-c", script ?? ""], {
    cwd: ROOT,
    env: { ...env, INIT_CWD: scratch },
    encoding: "utf8",
  })
  expect(result.status, result.stderr).toBe(0)
  return HOOKS.filter((hook) =>
    existsSync(join(scratch, ".git", "hooks", hook)),
  )
}

function withoutCi(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.CI
  delete env.LEFTHOOK
  return env
}

describe("the root package's postinstall", () => {
  it("installs the commit and push hooks", () => {
    expect(postinstall(withoutCi())).toEqual(HOOKS)
  })

  it("installs none in CI", () => {
    expect(postinstall({ ...withoutCi(), CI: "true" })).toEqual([])
  })
})
