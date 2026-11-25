import i18next from "eslint-plugin-i18next"
import { globalIgnores } from "eslint/config"

import { reactAppConfig } from "../../eslint.base.ts"
import { apiTypesImport, apiTypesRules } from "./build/api-types-lint.ts"
import { designTokenRules } from "./build/design-token-lint.ts"
import { e2eRules } from "./build/e2e-lint.ts"

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
function infrastructureImports(
  patterns: unknown[] = [],
): ["error", { paths: (typeof unconfiguredCn)[]; patterns: unknown[] }] {
  return ["error", { paths: [unconfiguredCn], patterns }]
}

/**
 * The rule for every file outside `src/infrastructure/`: it also forbids the API's
 * generated package (build/api-types-lint.ts).
 */
function restrictedImports(patterns: unknown[] = []) {
  return infrastructureImports([apiTypesImport, ...patterns])
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

export default reactAppConfig(
  {
    tsconfigRootDir: import.meta.dirname,
    // TanStack Router's `createLink` makes a link component (`NavigationLink`).
    extraHOCs: ["createLink"],
  },
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
    // Later blocks set the rule again for their layer, so each is built the same way,
    // keeping `unconfiguredCn` and, outside infrastructure, the API's generated package.
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
      "no-restricted-imports": infrastructureImports([
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
  // Only infrastructure imports the API's generated package: build/api-types-lint.ts.
  ...apiTypesRules,
  // Off-brand styling fails lint (ADR-010): build/design-token-lint.ts.
  ...designTokenRules,
  // A Playwright test never slows the machine: build/e2e-lint.ts.
  ...e2eRules,
)
