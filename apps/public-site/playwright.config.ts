import { defineConfig, devices } from "@playwright/test"
import {
  PUBLIC_SITE_PORTS,
  resolveDevPorts,
} from "../../scripts/worktree/dev-ports.ts"

const BASE_URL = `http://localhost:${String(resolveDevPorts(PUBLIC_SITE_PORTS).preview)}/product-roadmaps/`

/**
 * End-to-end and ARIA snapshot tests against a production build (`vite preview`) of
 * the fixed data in e2e/fixtures/roadmaps.json, made from sheets/*.csv.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  expect: {
    // Desktop and mobile differ (the mobile menu), so each has its own file; a
    // page with the same tree on both has only the desktop one.
    toMatchAriaSnapshot: {
      pathTemplate:
        "{testDir}/__snapshots__/{testFileName}/{arg}-{projectName}{ext}",
    },
  },
  // A test runs on desktop unless it is tagged: "@both" runs it on mobile too and
  // "@mobile-only" on mobile alone (see apps/public-site/AGENTS.md, Tests).
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@mobile-only/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      grep: /@mobile-only|@both/,
    },
  ],
  webServer: {
    // vite preview listens on the same port (vite.config.ts).
    command: "pnpm build && pnpm preview",
    env: { ROADMAPS_DATA: "e2e/fixtures/roadmaps.json" },
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
