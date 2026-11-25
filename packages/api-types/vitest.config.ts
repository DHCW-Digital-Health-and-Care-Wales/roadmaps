import { defineConfig } from "vitest/config"

// The generator and the drift check; the generated source has no test of its own.
export default defineConfig({
  test: { include: ["scripts/**/*.test.ts"] },
})
