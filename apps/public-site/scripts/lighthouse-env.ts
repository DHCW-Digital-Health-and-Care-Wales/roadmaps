import { existsSync } from "node:fs"
import { chromium } from "@playwright/test"

// POSIX sockaddr_un.sun_path caps Unix socket paths at 104 bytes on macOS
// (103 usable bytes before NUL) and 108 bytes on Linux. Chromium creates
// sockets such as `/org.chromium.Chromium.XXXXXX/SingletonSocket` (45 bytes)
// under TMPDIR, leaving 58 usable bytes on macOS; 55 leaves a small safety
// margin so deep sandbox TMPDIR paths don't hit `Socket path too long`.
export const MAX_UNIX_TMPDIR_BYTES = 55

interface ResolveLighthouseEnvOptions {
  platform?: NodeJS.Platform
  playwrightChromePath?: () => string | undefined
  pathExists?: (path: string) => boolean
}

function defaultPlaywrightChromePath(): string | undefined {
  try {
    return chromium.executablePath()
  } catch {
    // Playwright throws on platforms where it has no browser; leave lhci to find Chrome itself.
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

  // Fall back to Playwright's installed Chromium when CHROME_PATH is unset or
  // blank, leaving CHROME_PATH unset when Playwright's binary is absent (e.g.
  // CI's Lighthouse job, which uses the runner's system Chrome).
  if (!next.CHROME_PATH?.trim()) {
    const candidate = playwrightChromePath()
    if (candidate && pathExists(candidate)) {
      next.CHROME_PATH = candidate
    } else {
      delete next.CHROME_PATH
    }
  }

  if (
    platform !== "win32" &&
    next.TMPDIR &&
    Buffer.byteLength(next.TMPDIR, "utf8") > MAX_UNIX_TMPDIR_BYTES &&
    pathExists("/tmp")
  ) {
    next.TMPDIR = "/tmp"
  }

  return next
}
