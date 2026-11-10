import js from "@eslint/js"
import prettier from "eslint-config-prettier/flat"
import jsxA11y from "eslint-plugin-jsx-a11y-x"
import reactHooks from "eslint-plugin-react-hooks"
import { reactRefresh } from "eslint-plugin-react-refresh"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

/** Forbid imports of the given `src/` layers, via the `@/` alias or relative paths. */
function layers(...names: string[]) {
  return names.map((name) => ({
    regex: String.raw`^(?:@/|(?:\.\.?/)+)${name}(?:/|$)`,
    message: `Layering (ADR-0002): this layer must not import from "${name}".`,
  }))
}

const frameworks = [
  {
    group: ["react", "react/**", "react-dom", "react-dom/**"],
    message: "Layering (ADR-0002): no React here.",
  },
  {
    group: ["@tanstack/**"],
    message: "Layering (ADR-0002): no TanStack here.",
  },
]

export default defineConfig(
  globalIgnores([
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
    "src/routeTree.gen.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite(),
      jsxA11y.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Route modules export `Route` (HMR is handled by TanStack Router's Vite plugin);
    // shadcn/ui files export variant helpers alongside components.
    files: ["src/routes/**/*.tsx", "src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...frameworks,
            ...layers(
              "infrastructure",
              "features",
              "app",
              "routes",
              "components",
            ),
          ],
        },
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...frameworks,
            ...layers("features", "app", "routes", "components"),
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: layers("infrastructure") },
      ],
    },
  },
  prettier,
)
