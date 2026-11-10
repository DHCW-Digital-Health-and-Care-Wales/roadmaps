import js from "@eslint/js"
import prettier from "eslint-config-prettier/flat"
import jsxA11y from "eslint-plugin-jsx-a11y-x"
import i18next from "eslint-plugin-i18next"
import reactHooks from "eslint-plugin-react-hooks"
import { reactRefresh } from "eslint-plugin-react-refresh"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

import { designTokenRules } from "./build/design-token-lint.ts"

/** Forbid imports of the given `src/` layers, via the `@/` alias or relative paths. */
function layers(...names: string[]) {
  return names.map((name) => ({
    regex: String.raw`^(?:@/|(?:\.\.?/)+)${name}(?:/|$)`,
    message: `Layering (ADR-002): this layer must not import from "${name}".`,
  }))
}

/**
 * Every module merges classes with `@/lib/utils`' `cn`, which knows the theme's type and
 * shadow names (ADR-010). shadcn's CLI writes `import { cn } from "cn"`; change it.
 */
const unconfiguredCn = {
  name: "cn",
  message:
    'Import cn from "@/lib/utils": the bare package drops type tokens such as text-body as colours.',
}

/** `no-restricted-imports` with the given patterns, always forbidding the bare `cn`. */
function restrictedImports(
  patterns: unknown[] = [],
): ["error", { paths: (typeof unconfiguredCn)[]; patterns: unknown[] }] {
  return ["error", { paths: [unconfiguredCn], patterns }]
}

const frameworks = [
  {
    group: ["react", "react/**", "react-dom", "react-dom/**"],
    message: "Layering (ADR-002): no React here.",
  },
  {
    group: ["@tanstack/**"],
    message: "Layering (ADR-002): no TanStack here.",
  },
  {
    group: ["i18next", "react-i18next", "lucide-react", "@base-ui/**"],
    message:
      "Layering (ADR-002, ADR-008): no UI or copy here; emit codes, not text.",
  },
]

export default defineConfig(
  globalIgnores([
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
    "src/routeTree.gen.ts",
    // Deliberately off-brand: linted by build/design-token-lint.test.ts.
    "build/fixtures",
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
    // All copy comes from the i18n catalogues (ADR-008): no literal JSX text or literal
    // user-facing attributes. Tests and generated shadcn components are exempt.
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx", "src/test/**", "src/components/ui/**"],
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
    // Route modules export `Route` (HMR is handled by TanStack Router's Vite plugin);
    // shadcn/ui files export variant helpers alongside components.
    files: ["src/routes/**/*.tsx", "src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Later blocks set the rule again for their layer, so each keeps `unconfiguredCn`.
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": restrictedImports() },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports([
        ...frameworks,
        ...layers(
          "infrastructure",
          "features",
          "app",
          "routes",
          "components",
          "i18n",
        ),
      ]),
    },
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports([
        ...frameworks,
        ...layers("features", "app", "routes", "components", "i18n"),
      ]),
    },
  },
  {
    // Only the Google Identity Services adapter may touch the `google` global (ADR-003).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/infrastructure/google-identity/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          // Also catches `window.google` and `globalThis.google`.
          checkGlobalObject: true,
          globals: [
            {
              name: "google",
              message:
                "Only src/infrastructure/google-identity may use the Google Identity Services global (ADR-003).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports(
        layers("infrastructure", "app", "routes"),
      ),
    },
  },
  {
    // Shared building blocks sit below features, so they never reach back up.
    files: ["src/components/**/*.{ts,tsx}", "src/i18n/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports(
        layers("infrastructure", "features", "app", "routes"),
      ),
    },
  },
  {
    // Utilities everything else builds on, the domain included.
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictedImports(
        layers(
          "domain",
          "infrastructure",
          "features",
          "app",
          "routes",
          "components",
          "i18n",
        ),
      ),
    },
  },
  // Off-brand styling fails lint (ADR-010): build/design-token-lint.ts.
  ...designTokenRules,
  prettier,
)
