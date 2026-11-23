import eslintReact from "@eslint-react/eslint-plugin"
import js from "@eslint/js"
import prettier from "eslint-config-prettier/flat"
import jsxA11y from "eslint-plugin-jsx-a11y-x"
import reactHooks from "eslint-plugin-react-hooks"
import { reactRefresh } from "eslint-plugin-react-refresh"
import { defineConfig } from "eslint/config"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * The handlers that make an element interactive, for jsx-a11y's interaction rules: its
 * strict defaults without `onFocus` and `onBlur`. An element no keyboard reaches is
 * only ever told of focus bubbling up from a control inside it, so observing focus
 * makes no control of it; a `tabIndex` that would is `no-noninteractive-tabindex`'s.
 */
const interactionHandlers = [
  "onKeyDown",
  "onKeyPress",
  "onKeyUp",
  "onClick",
  "onContextMenu",
  "onDblClick",
  "onDoubleClick",
  "onDrag",
  "onDragEnd",
  "onDragEnter",
  "onDragExit",
  "onDragLeave",
  "onDragOver",
  "onDragStart",
  "onDrop",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
]

/**
 * The rules react-hooks and `@eslint-react` both run, turned off in `@eslint-react`
 * (CHO-046): react-hooks, the React team's own, owns each, so a finding has one rule
 * name and React's own exemptions, such as a value measured from a ref.
 */
const eslintReactRules =
  eslintReact.configs["recommended-type-checked"].rules ?? {}
const ownedByReactHooks = Object.fromEntries(
  Object.keys(reactHooks.configs.flat["recommended-latest"].rules)
    .map((rule) => rule.replace(/^react-hooks\//, "@eslint-react/"))
    .filter((rule) => Object.hasOwn(eslintReactRules, rule))
    .map((rule) => [rule, "off" as const]),
)

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
      rules: {
        ...ownedByReactHooks,
        "jsx-a11y-x/no-static-element-interactions": [
          "error",
          { handlers: interactionHandlers },
        ],
        "jsx-a11y-x/no-noninteractive-element-interactions": [
          "error",
          {
            handlers: [...interactionHandlers, "onLoad", "onError"],
            // As strict: these load, so they may say when they have or could not.
            body: ["onError", "onLoad"],
            iframe: ["onError", "onLoad"],
            img: ["onError", "onLoad"],
          },
        ],
      },
    },
    ...appConfigs,
    prettier,
  )
}
