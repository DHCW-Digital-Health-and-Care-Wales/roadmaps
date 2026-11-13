import { execFileSync, spawnSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { delimiter, dirname, join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

/**
 * `.claude/hooks/session-start.sh` tells every Claude session whether its branch is
 * behind `main`. Incident: from PR #11 until PR #55 its fetch never pruned, so the
 * "remote branch is gone" warning was dead code and no check noticed (CHO-006).
 */
const HOOK = join(
  import.meta.dirname,
  "..",
  ".claude",
  "hooks",
  "session-start.sh",
)

const ENV_EXAMPLE = "VITE_GOOGLE_CLIENT_ID=example\n"

/** Without `timeout` (stock macOS) the hook skips its fetch, so only a prune it ran can mark `[gone]`. */
const HAS_TIMEOUT = ["timeout", "gtimeout"].some(
  (name) =>
    spawnSync("sh", ["-c", `command -v ${name}`], { stdio: "ignore" })
      .status === 0,
)

let root: string
let env: NodeJS.ProcessEnv

/**
 * The runner's own git and Claude setup must not reach the hook: a global
 * `fetch.prune=true` would hide a missing `--prune`, `CLAUDE_CODE_REMOTE` would run the
 * install, and a pre-commit hook's `GIT_DIR` would point every command at this repo.
 */
function isolatedEnv(): NodeJS.ProcessEnv {
  const globalConfig = join(root, "gitconfig")
  writeFileSync(
    globalConfig,
    "[user]\n\tname = Hook Test\n\temail = hook-test@example.invalid\n[init]\n\tdefaultBranch = main\n",
  )
  return {
    PATH: [dirname(process.execPath), process.env.PATH].join(delimiter),
    HOME: root,
    TMPDIR: root,
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_NOSYSTEM: "1",
  }
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, env, encoding: "utf8" }).trim()
}

function commit(repo: string, message: string): void {
  git(repo, "commit", "--quiet", "--allow-empty", "-m", message)
}

/** A bare `origin` whose `main` has three commits and a `.env.example`. */
function createOrigin(): string {
  const origin = join(root, "origin.git")
  const seed = join(root, "seed")
  git(root, "init", "--quiet", "--bare", origin)
  git(root, "init", "--quiet", seed)
  writeFileSync(join(seed, ".env.example"), ENV_EXAMPLE)
  git(seed, "add", ".env.example")
  commit(seed, "one")
  commit(seed, "two")
  commit(seed, "three")
  git(seed, "push", "--quiet", origin, "main")
  return origin
}

function clone(origin: string, name: string, ...options: string[]): string {
  const path = join(root, name)
  git(root, "clone", "--quiet", ...options, origin, path)
  return path
}

/** Another session merges to `main` on the remote. */
function advanceOrigin(origin: string): void {
  const other = clone(origin, "other")
  commit(other, "four")
  git(other, "push", "--quiet", "origin", "main")
}

function runHook({
  projectDir,
  cwd = projectDir,
  extraEnv = {},
}: {
  projectDir: string
  cwd?: string
  extraEnv?: NodeJS.ProcessEnv
}) {
  const input = JSON.stringify({
    session_id: "test-session",
    transcript_path: join(root, "transcript.jsonl"),
    cwd,
    hook_event_name: "SessionStart",
    source: "startup",
  })
  const result = spawnSync("bash", [HOOK], {
    cwd: projectDir,
    env: { ...env, CLAUDE_PROJECT_DIR: projectDir, ...extraEnv },
    input,
    encoding: "utf8",
  })
  return { status: result.status, stdout: result.stdout }
}

const NOTE_BEHIND_ONE =
  '==> Note: HEAD is 1 commit(s) behind origin/main. Before publishing, rebase onto its base, even if its PR is open (implement-story\'s references/pull-requests.md, "Update a branch").\n'
const WARNING_NOT_BASED =
  "==> Warning: HEAD is not based on current origin/main (its history meets it only at the root, or its remote branch is gone). Start new work on a branch from origin/main.\n"

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "session-start-hook-"))
  env = isolatedEnv()
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe("the session-start hook's behind-main check", () => {
  it("notes how far a checkout is behind the default branch", () => {
    const work = clone(createOrigin(), "work")
    git(work, "reset", "--quiet", "--hard", "HEAD~1")

    expect(runHook({ projectDir: work })).toEqual({
      status: 0,
      stdout: NOTE_BEHIND_ONE,
    })
  })

  it.skipIf(!HAS_TIMEOUT)(
    "warns when the branch's upstream was deleted on the remote",
    () => {
      const origin = createOrigin()
      const work = clone(origin, "work")
      git(work, "switch", "--quiet", "-c", "feature")
      commit(work, "feature work")
      git(work, "push", "--quiet", "-u", "origin", "feature")
      // The PR is squash-merged and its branch deleted; only the hook's own fetch
      // can learn that, since this checkout fetches nothing else.
      advanceOrigin(origin)
      git(origin, "branch", "--quiet", "-D", "feature")

      expect(runHook({ projectDir: work })).toEqual({
        status: 0,
        stdout: WARNING_NOT_BASED,
      })
    },
  )

  it("warns when the branch's history is unrelated to the default branch", () => {
    const origin = createOrigin()
    const work = clone(origin, "work")
    git(work, "switch", "--quiet", "--orphan", "unrelated")
    commit(work, "a fresh start")

    expect(runHook({ projectDir: work })).toEqual({
      status: 0,
      stdout: WARNING_NOT_BASED,
    })
  })

  it("warns when the branch meets the default branch only at its root", () => {
    const work = clone(createOrigin(), "work")
    git(work, "switch", "--quiet", "-c", "ancient", "HEAD~2")

    expect(runHook({ projectDir: work })).toEqual({
      status: 0,
      stdout: WARNING_NOT_BASED,
    })
  })

  it("is silent when the checkout is up to date", () => {
    const work = clone(createOrigin(), "work")

    expect(runHook({ projectDir: work })).toEqual({ status: 0, stdout: "" })
  })

  it("is silent in a shallow clone, whose count would be wrong", () => {
    const origin = createOrigin()
    // A file:// URL, since a local clone ignores --depth.
    const work = clone(`file://${origin}`, "work", "--depth", "1")
    advanceOrigin(origin)
    git(work, "fetch", "--quiet", "origin")

    expect(git(work, "rev-parse", "--is-shallow-repository")).toBe("true")
    expect(runHook({ projectDir: work })).toEqual({ status: 0, stdout: "" })
  })

  it("is silent when the remote has no default branch recorded", () => {
    const work = clone(createOrigin(), "work")
    git(work, "reset", "--quiet", "--hard", "HEAD~1")
    git(work, "remote", "set-head", "origin", "--delete")

    expect(runHook({ projectDir: work })).toEqual({ status: 0, stdout: "" })
  })

  it("checks the session's worktree, not the directory it was launched in", () => {
    const work = clone(createOrigin(), "work")
    const stale = join(root, "stale")
    git(work, "worktree", "add", "--quiet", "-b", "stale", stale, "HEAD~1")

    expect(runHook({ projectDir: work })).toEqual({ status: 0, stdout: "" })
    expect(runHook({ projectDir: work, cwd: stale })).toEqual({
      status: 0,
      stdout: NOTE_BEHIND_ONE,
    })
  })
})

describe("the session-start hook's remote preparation", () => {
  const INSTALLED = "==> Installed dependencies.\n"
  const CREATED_ENV = "==> Created .env.local from .env.example.\n"

  /** A `pnpm` first on PATH that prints its arguments and exits with `exitCode`. */
  function stubPnpm(exitCode: number): NodeJS.ProcessEnv {
    const bin = join(root, "bin")
    mkdirSync(bin)
    const stub = join(bin, "pnpm")
    writeFileSync(
      stub,
      `#!/bin/sh\necho "stub pnpm $*"\nexit ${String(exitCode)}\n`,
    )
    chmodSync(stub, 0o755)
    return { CLAUDE_CODE_REMOTE: "true", PATH: [bin, env.PATH].join(delimiter) }
  }

  function installLogs(): string[] {
    return readdirSync(root).filter((name) => name.startsWith("pnpm-install."))
  }

  it("installs dependencies and creates .env.local at the worktree root", () => {
    const work = clone(createOrigin(), "work")
    const subdirectory = join(work, "src")
    mkdirSync(subdirectory)

    expect(
      runHook({ projectDir: work, cwd: subdirectory, extraEnv: stubPnpm(0) }),
    ).toEqual({ status: 0, stdout: INSTALLED + CREATED_ENV })
    expect(readFileSync(join(work, ".env.local"), "utf8")).toBe(ENV_EXAMPLE)
    expect(existsSync(join(subdirectory, ".env.local"))).toBe(false)
    expect(installLogs()).toEqual([])
  })

  it("names the install log when the install fails, and still creates .env.local", () => {
    const work = clone(createOrigin(), "work")

    const { status, stdout } = runHook({
      projectDir: work,
      extraEnv: stubPnpm(1),
    })

    const [log] = installLogs()
    expect(log).toBeDefined()
    const logPath = join(root, log ?? "")
    expect({ status, stdout }).toEqual({
      status: 0,
      stdout: `==> Warning: pnpm install --frozen-lockfile failed (log: ${logPath}). Fix it before running any check.\n${CREATED_ENV}`,
    })
    expect(readFileSync(logPath, "utf8")).toBe(
      "stub pnpm install --frozen-lockfile\n",
    )
    expect(readFileSync(join(work, ".env.local"), "utf8")).toBe(ENV_EXAMPLE)
  })

  it("keeps an existing .env.local", () => {
    const work = clone(createOrigin(), "work")
    writeFileSync(join(work, ".env.local"), "OWN=1\n")

    expect(runHook({ projectDir: work, extraEnv: stubPnpm(0) })).toEqual({
      status: 0,
      stdout: INSTALLED,
    })
    expect(readFileSync(join(work, ".env.local"), "utf8")).toBe("OWN=1\n")
  })
})
