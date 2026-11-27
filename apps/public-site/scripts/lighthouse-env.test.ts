import { describe, expect, it } from "vitest"
import {
  MAX_UNIX_TMPDIR_BYTES,
  resolveLighthouseEnv,
} from "./lighthouse-env.ts"

const PLAYWRIGHT_CHROME = "/cache/ms-playwright/chromium/chrome"
const LONG_TMPDIR =
  "/home/user/.runtime/userdata/provider-tmp/abcdef123456/run-xyz"
// 50 UTF-16 code units, 60 UTF-8 bytes (`ŵ` is 2 UTF-8 bytes) — tests byte vs
// code-unit measurement against MAX_UNIX_TMPDIR_BYTES.
const MULTIBYTE_OVER_LIMIT_TMPDIR = `/tmp/${"ŵ".repeat(10)}/${"a".repeat(34)}`

describe("resolveLighthouseEnv", () => {
  it.each([
    [
      "uses Playwright Chromium when CHROME_PATH is unset and binary exists",
      {},
      {
        playwrightChromePath: () => PLAYWRIGHT_CHROME,
        pathExists: (path: string) => path === PLAYWRIGHT_CHROME,
      },
      PLAYWRIGHT_CHROME,
    ],
    [
      "uses Playwright Chromium when CHROME_PATH is blank",
      { CHROME_PATH: "   " },
      {
        playwrightChromePath: () => PLAYWRIGHT_CHROME,
        pathExists: (path: string) => path === PLAYWRIGHT_CHROME,
      },
      PLAYWRIGHT_CHROME,
    ],
    [
      "preserves an explicit CHROME_PATH without consulting Playwright",
      { CHROME_PATH: "/usr/bin/google-chrome" },
      {
        playwrightChromePath: () => {
          throw new Error("should not be called")
        },
        pathExists: () => true,
      },
      "/usr/bin/google-chrome",
    ],
    [
      "leaves CHROME_PATH unset when Playwright Chromium is not installed",
      {},
      {
        playwrightChromePath: () => PLAYWRIGHT_CHROME,
        pathExists: () => false,
      },
      undefined,
    ],
    [
      "clears a blank CHROME_PATH when Playwright Chromium is not installed",
      { CHROME_PATH: "   " },
      {
        playwrightChromePath: () => PLAYWRIGHT_CHROME,
        pathExists: () => false,
      },
      undefined,
    ],
    [
      "leaves CHROME_PATH unset when Playwright returns no path",
      {},
      {
        playwrightChromePath: () => undefined,
        pathExists: () => true,
      },
      undefined,
    ],
  ])("%s", (_, env, options, expectedChromePath) => {
    const resolved = resolveLighthouseEnv(env, {
      platform: "linux",
      ...options,
    })
    expect(resolved.CHROME_PATH).toBe(expectedChromePath)
    if (expectedChromePath === undefined) {
      expect("CHROME_PATH" in resolved).toBe(false)
    }
  })

  it.each([
    [
      "rewrites a long POSIX TMPDIR to /tmp when /tmp exists",
      { TMPDIR: LONG_TMPDIR },
      { platform: "linux" as const, pathExists: (p: string) => p === "/tmp" },
      "/tmp",
    ],
    [
      "keeps a short POSIX TMPDIR unchanged",
      { TMPDIR: "/var/folders/ab/cdef01234567890123456789012345/T/" },
      { platform: "darwin" as const, pathExists: () => true },
      "/var/folders/ab/cdef01234567890123456789012345/T/",
    ],
    [
      "keeps a TMPDIR exactly at MAX_UNIX_TMPDIR_BYTES unchanged",
      { TMPDIR: "/".padEnd(MAX_UNIX_TMPDIR_BYTES, "a") },
      { platform: "linux" as const, pathExists: () => true },
      "/".padEnd(MAX_UNIX_TMPDIR_BYTES, "a"),
    ],
    [
      "keeps a long POSIX TMPDIR when /tmp does not exist",
      { TMPDIR: LONG_TMPDIR },
      { platform: "linux" as const, pathExists: () => false },
      LONG_TMPDIR,
    ],
    [
      "leaves TMPDIR unchanged on win32",
      { TMPDIR: LONG_TMPDIR },
      { platform: "win32" as const, pathExists: () => true },
      LONG_TMPDIR,
    ],
  ])("%s", (_, env, options, expectedTmpdir) => {
    const resolved = resolveLighthouseEnv(env, {
      playwrightChromePath: () => undefined,
      ...options,
    })
    expect(resolved.TMPDIR).toBe(expectedTmpdir)
  })

  it("rewrites a multibyte POSIX TMPDIR exceeding MAX_UNIX_TMPDIR_BYTES in UTF-8 bytes", () => {
    expect(MULTIBYTE_OVER_LIMIT_TMPDIR.length).toBeLessThanOrEqual(
      MAX_UNIX_TMPDIR_BYTES,
    )
    expect(
      Buffer.byteLength(MULTIBYTE_OVER_LIMIT_TMPDIR, "utf8"),
    ).toBeGreaterThan(MAX_UNIX_TMPDIR_BYTES)
    const resolved = resolveLighthouseEnv(
      { TMPDIR: MULTIBYTE_OVER_LIMIT_TMPDIR },
      {
        platform: "linux",
        playwrightChromePath: () => undefined,
        pathExists: (p: string) => p === "/tmp",
      },
    )
    expect(resolved.TMPDIR).toBe("/tmp")
  })

  it("does not mutate the caller's environment object", () => {
    const env: NodeJS.ProcessEnv = { TMPDIR: LONG_TMPDIR }
    const resolved = resolveLighthouseEnv(env, {
      platform: "linux",
      playwrightChromePath: () => PLAYWRIGHT_CHROME,
      pathExists: () => true,
    })
    expect(env).toEqual({ TMPDIR: LONG_TMPDIR })
    expect(resolved).toEqual({
      TMPDIR: "/tmp",
      CHROME_PATH: PLAYWRIGHT_CHROME,
    })
  })
})
