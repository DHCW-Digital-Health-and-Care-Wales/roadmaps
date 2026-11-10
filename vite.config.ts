import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

import { resolveBasePath } from "./build/resolve-base-path.ts"

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project sites live under /<repo>/ (ADR-007).
  base: resolveBasePath(process.env),
  plugins: [
    // Must come before the React plugin (TanStack Router docs).
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
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
      "tests/fixtures/**/*.test.ts",
    ],
    setupFiles: ["./src/test/setup.ts"],
    // Vitest empties the stylesheets it doesn't process, `?raw` imports included; the
    // token tests read the text of ours and of the pinned DHCW release's Sass.
    css: {
      include: [
        /src\/styles\/globals\.css/,
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
