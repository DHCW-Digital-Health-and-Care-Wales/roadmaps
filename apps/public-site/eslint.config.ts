import i18next from "eslint-plugin-i18next"
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
    // All interface text comes from the catalogues (ADR-008): no literal JSX text or
    // literal user-facing attributes. Tests are exempt.
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": {
            include: [
              "^(aria-label|aria-description|aria-roledescription|aria-valuetext|title|alt|placeholder|label)$",
            ],
          },
        },
      ],
    },
  },
  {
    // The catalogues fill counts into their text unformatted, so the prerendered page
    // and the browser's render give the same text.
    files: ["src/i18n/locales/*.ts"],
    rules: {
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
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
