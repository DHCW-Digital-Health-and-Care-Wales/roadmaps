/**
 * Runs Lighthouse CI (lighthouserc.json) against `vite preview` of a build,
 * on this checkout's preview port (scripts/worktree/dev-ports.ts), so parallel
 * worktrees don't audit each other's servers. `pnpm lighthouse` builds the
 * example data first.
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"
import {
  PUBLIC_SITE_PORTS,
  resolveDevPorts,
} from "../../../scripts/worktree/dev-ports.ts"

// POSIX sockaddr_un.sun_path caps Unix socket paths at 104 bytes on macOS and
// 108 bytes on Linux. Chromium creates sockets such as
// `/org.chromium.Chromium.XXXXXX/SingletonSocket` (45 bytes) under TMPDIR, so
// any TMPDIR longer than 55 bytes risks `Socket path too long` in sandboxes.
export const MAX_UNIX_TMPDIR_LENGTH = 55

export interface ResolveLighthouseEnvOptions {
  platform?: NodeJS.Platform
  playwrightChromePath?: () => string | undefined
  pathExists?: (path: string) => boolean
}

function defaultPlaywrightChromePath(): string | undefined {
  try {
    return chromium.executablePath()
  } catch {
    return undefined
  }
}

export function resolveLighthouseEnv(
  env: NodeJS.ProcessEnv,
  options: ResolveLighthouseEnvOptions = {},
): NodeJS.ProcessEnv {
  const {
    platform = process.platform,
    playwrightChromePath = defaultPlaywrightChromePath,
    pathExists = existsSync,
  } = options
  const next: NodeJS.ProcessEnv = { ...env }

  // Fall back to Playwright's installed Chromium when CHROME_PATH is unset,
  // leaving CHROME_PATH unset when Playwright's binary is absent (e.g. CI's
  // Lighthouse job, which uses the runner's system Chrome).
  if (!next.CHROME_PATH?.trim()) {
    const candidate = playwrightChromePath()
    if (candidate && pathExists(candidate)) {
      next.CHROME_PATH = candidate
    }
  }

  if (
    platform !== "win32" &&
    next.TMPDIR &&
    next.TMPDIR.length > MAX_UNIX_TMPDIR_LENGTH &&
    pathExists("/tmp")
  ) {
    next.TMPDIR = "/tmp"
  }

  return next
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const base = `http://localhost:${String(resolveDevPorts(PUBLIC_SITE_PORTS).preview)}/product-roadmaps/`
  const pages = ["en/", "cy/producta/"]

  const { status, error } = spawnSync(
    "lhci",
    ["autorun", ...pages.map((page) => `--collect.url=${base}${page}`)],
    { stdio: "inherit", env: resolveLighthouseEnv(process.env) },
  )
  if (error) throw error
  process.exit(status ?? 1)
}
