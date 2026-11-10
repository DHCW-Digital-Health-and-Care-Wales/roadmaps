import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before the React plugin (TanStack Router docs).
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Hermetic placeholder config so modules importing `@/app/config` load in tests.
    env: {
      VITE_GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
      VITE_GOOGLE_SPREADSHEET_ID: "test-spreadsheet-id",
    },
  },
})
