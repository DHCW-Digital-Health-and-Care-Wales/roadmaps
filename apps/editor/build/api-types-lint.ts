/**
 * Only `src/infrastructure/` may import `@roadmaps/api-types`, the API's generated types
 * and schemas (ADR-017, STY-092 amendments): the rest of the editor sees the domain and
 * `AppError` alone. `no-restricted-imports` holds a static import or re-export, by
 * `apiTypesImport` in every block that sets it outside infrastructure. It reads neither
 * `import()` nor an `import("…")` type, so a rule of the app's own holds those.
 */
import type { Linter, Rule } from "eslint"

/**
 * A specifier that reaches the package: any with an `api-types` segment, so its name, a
 * subpath of it, every spelling of a path into its folder (`packages/./api-types`,
 * `packages//api-types`) and each with a query or fragment, as Vite reads one. No folder
 * of the editor's own takes that name.
 */
const API_TYPES = String.raw`(?:^|/)api-types(?:[/?#]|$)`

const MESSAGE =
  "Only src/infrastructure/ may import @roadmaps/api-types, the API's generated types and schemas (ADR-017)."

/** The `no-restricted-imports` pattern. */
export const apiTypesImport = { regex: API_TYPES, message: MESSAGE }

const API_TYPES_PATTERN = new RegExp(API_TYPES, "i")

/** A specifier node, as `import()` and an `import("…")` type hold it. */
interface Specifier {
  type: string
  value?: unknown
  quasis?: readonly { value: { cooked?: string | null } }[]
}

/**
 * A specifier's text as far as it is written: a template's own parts, with `/` for each
 * expression between them, so whatever is built onto the package's name still reads as
 * a path from it.
 */
function writtenText({ value, quasis }: Specifier): string {
  if (typeof value === "string") return value
  return quasis?.map((quasi) => quasi.value.cooked ?? "").join("/") ?? ""
}

const noDeferredImport: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [],
    messages: { restricted: MESSAGE },
  },
  create(context) {
    function check(node: { source: unknown }) {
      const source = node.source as Specifier
      if (API_TYPES_PATTERN.test(writtenText(source))) {
        context.report({
          node: node.source as Rule.Node,
          messageId: "restricted",
        })
      }
    }
    return { ImportExpression: check, TSImportType: check }
  },
}

/** `import()` and `import("…")` types, outside `src/infrastructure/`. */
export const apiTypesRules: Linter.Config[] = [
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/infrastructure/**"],
    plugins: {
      "api-types": { rules: { "no-deferred-import": noDeferredImport } },
    },
    rules: { "api-types/no-deferred-import": "error" },
  },
]
