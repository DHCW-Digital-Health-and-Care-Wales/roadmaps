import { defineConfig } from "vitest/config"

// The root package's own tests: the repository's checks, which scan the whole tree, and
// the worktree script's. Each app under apps/ runs its own.
export default defineConfig({
  test: {
    include: ["build/**/*.test.ts", "scripts/**/*.test.ts"],
  },
})
