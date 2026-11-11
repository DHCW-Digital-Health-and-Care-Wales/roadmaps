import { defineConfig, devices } from "@playwright/test"

import { resolveBasePath } from "./build/resolve-base-path.ts"

const PORT = 4173
// `vite preview` serves the build under its base path (in CI, /<repo>/), so the specs
// navigate relative to it.
const baseURL = `http://localhost:${String(PORT)}${resolveBasePath(process.env)}`
const ci = Boolean(process.env.CI)

/**
 * E2E tests run against the production build served by `vite preview`, with Google
 * faked in the browser (ADR-006, `tests/e2e/fixtures`).
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: ci,
  expect: {
    // Aria snapshots (tests/e2e/structure.spec.ts) must match exactly: by default an
    // element added to a screen would still match the committed snapshot.
    toMatchAriaSnapshot: { children: "deep-equal" },
  },
  retries: ci ? 2 : 0,
  reporter: ci
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "en-GB",
    timezoneId: "Europe/London",
    colorScheme: "light",
    // Service workers bypass request routing, and so the fakes (tests/e2e/fixtures).
    serviceWorkers: "block",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm preview --port ${String(PORT)} --strictPort`,
    url: baseURL,
    reuseExistingServer: !ci,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
})
