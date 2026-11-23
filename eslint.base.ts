import eslintReact from "@eslint-react/eslint-plugin"
import js from "@eslint/js"
import prettier from "eslint-config-prettier/flat"
import jsxA11y from "eslint-plugin-jsx-a11y-x"
import reactHooks from "eslint-plugin-react-hooks"
import { reactRefresh } from "eslint-plugin-react-refresh"
import { defineConfig } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

interface ReactAppOptions {
  /** The app's directory, whose tsconfig files type-check its files. */
  tsconfigRootDir: string
  /** Functions besides React's own that wrap a component, such as a router's `createLink`. */
  extraHOCs?: string[]
}

/**
 * The ESLint config both React apps share (ADR-016, _STY-095 amendments_), with the
 * app's own blocks between the shared ones and Prettier's, which comes last.
 */
export function reactAppConfig(
  { tsconfigRootDir, extraHOCs = [] }: ReactAppOptions,
  ...appConfigs: Parameters<typeof defineConfig>
) {
  return defineConfig(
    {
      files: ["**/*.{ts,tsx}"],
      extends: [
        js.configs.recommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
      ],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
    },
    {
      files: ["src/**/*.{ts,tsx}"],
      extends: [
        reactHooks.configs.flat["recommended-latest"],
        reactRefresh.configs.vite({ extraHOCs }),
        jsxA11y.configs.strict,
        eslintReact.configs["recommended-type-checked"],
      ],
      languageOptions: { globals: globals.browser },
    },
    ...appConfigs,
    prettier,
  )
}
