import { globalIgnores } from "eslint/config"
import globals from "globals"

import { reactAppConfig } from "../../eslint.base.ts"

export default reactAppConfig(
  { tsconfigRootDir: import.meta.dirname },
  globalIgnores([
    "dist",
    "dist-ssr",
    "test-results",
    "playwright-report",
    ".lighthouseci",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // `||` deliberately treats empty sheet and env strings as missing.
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true } },
      ],
    },
  },
  {
    // Build-time entry, never hot-reloaded.
    files: ["src/entry-server.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["scripts/**/*.ts", "e2e/**/*.ts", "*.config.ts"],
    languageOptions: { globals: globals.node },
  },
)
