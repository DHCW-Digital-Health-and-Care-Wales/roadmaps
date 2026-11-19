import { readFileSync } from "node:fs"

import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

import { resolveBasePath } from "./build/resolve-base-path.ts"
import { resolveBuildVersion } from "./build/resolve-build-version.ts"
import { resolveDevPorts } from "./build/resolve-dev-ports.ts"

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string }
// A parallel worktree's own ports (scripts/worktree/worktree.sh), else 5173 and 4173.
const ports = resolveDevPorts(new URL("./.env.worktree", import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project sites live under /<repo>/ (ADR-007).
  base: resolveBasePath(process.env),
  // The footer's version: the package version and commit of a CI build, "dev" locally.
  define: {
    __APP_VERSION__: JSON.stringify(resolveBuildVersion(version, process.env)),
  },
  plugins: [
    // Must come before the React plugin (TanStack Router docs). Vitest loads every route
    // with the router, so a file's first test does not pay to load its pages (DEF-022).
    tanstackRouter({ target: "react", autoCodeSplitting: !process.env.VITEST }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  // Strict, so a busy port fails instead of drifting onto another worktree's port or
  // onto an origin the OAuth client does not list.
  server: { port: ports.dev, strictPort: true },
  preview: { port: ports.preview, strictPort: true },
  build: {
    // Long-lived chunks: app code changes on every deploy, React and the other
    // dependencies only when upgraded, so returning visitors re-download only the app.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 2,
            },
            { name: "vendor", test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    // Unit and component tests only; Playwright runs tests/e2e.
    include: [
      "src/**/*.test.{ts,tsx}",
      "build/**/*.test.ts",
      "scripts/**/*.test.ts",
      "tests/fixtures/**/*.test.ts",
    ],
    setupFiles: ["./src/test/setup.ts"],
    // A page test drives the whole app in jsdom: up to 3 s on an idle host, and two to
    // three times that on a busy one. The budget catches a hang, not a slow page
    // (DEF-022); Testing Library's waits are set in the setup file.
    testTimeout: 15_000,
    // Vitest empties the stylesheets it doesn't process, `?raw` imports included; the
    // token tests read the text of every stylesheet in src/ and of the pinned DHCW
    // release's Sass.
    css: {
      include: [
        /\/src\/.+\.(?:css|scss|sass|less|styl|stylus|pcss|postcss)(?:\?|$)/,
        /node_modules\/dhcw-design-system\/src\/.+\.scss/,
      ],
    },
    // Hermetic placeholder config so modules importing `@/app/config` load in tests.
    env: {
      VITE_GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
      VITE_GOOGLE_SPREADSHEET_ID: "test-spreadsheet-id",
    },
  },
})
