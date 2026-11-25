import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { Linter } from "eslint"
import tseslint from "typescript-eslint"
import { describe, expect, it } from "vitest"

/**
 * The design rules (`build/design-token-lint.ts`) allow one exception, ADR-010's data
 * colour: a roadmap's own colour, set only by `RoadmapSwatch`. Any other inline
 * directive that could switch them off is reported here, so it fails `pnpm test` even
 * though ESLint itself honours it.
 */
const SWATCH = "/src/features/roadmaps/components/roadmap-swatch.tsx"
const ALLOWED = [
  { path: SWATCH, directive: "eslint-disable-next-line no-restricted-syntax" },
]

/** Rules a directive must not name, and directives that name none switch off all. */
const DESIGN_RULES = /\bno-restricted-syntax\b|\bbetter-tailwindcss\//

const EDITOR = join(import.meta.dirname, "..")

/**
 * Every source module, as text; `routeTree.gen.ts` is generated and not linted. Read
 * from disk, not with `import.meta.glob`, which `pnpm knip` counts as importing every
 * module, so that none would ever be reported unused.
 */
const sources = readdirSync(join(EDITOR, "src"), {
  recursive: true,
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
  .map((entry) => join(entry.parentPath, entry.name))
  .map((file): [string, string] => [
    `/${relative(EDITOR, file)}`,
    readFileSync(file, "utf8"),
  ])
  .filter(([path]) => path !== "/src/routeTree.gen.ts")

interface Directive {
  path: string
  directive: string
  reason: string | undefined
}

/** ESLint's inline configuration comments, as ESLint reads them. */
const DIRECTIVE =
  /^(eslint(?:-disable(?:-next-line|-line)?|-enable)?)(?:\s+([\s\S]*))?$/

/** ESLint with no rules: it parses each module as `pnpm lint` does. */
const linter = new Linter({ configType: "flat" })
const PARSE_ONLY: Linter.Config[] = [
  { files: ["**/*.{ts,tsx}"], languageOptions: { parser: tseslint.parser } },
]

/**
 * ESLint's inline configuration comments (`eslint-disable…`, `eslint-enable` and
 * `eslint`), found by parsing, so a comment's every line counts and a comment-like
 * string does not.
 */
function directives(path: string, text: string): Directive[] {
  linter.verify(text, PARSE_ONLY, path.replace(/^\//, ""))
  return linter
    .getSourceCode()
    .getAllComments()
    .flatMap(({ value }) => {
      const [, kind, rest = ""] = DIRECTIVE.exec(value.trim()) ?? []
      if (kind === undefined) return []
      // ESLint ends the rule list at a ` -- reason`.
      const [rules = "", reason] = rest.split(/\s-{2,}\s/)
      return [
        {
          path,
          directive: `${kind} ${rules.replace(/\s+/g, " ").trim()}`.trim(),
          reason: reason?.trim(),
        },
      ]
    })
}

/** Whether a directive can switch off a design rule. */
function touchesDesignRules({ directive }: Directive): boolean {
  const [kind = "", ...rules] = directive.split(" ")
  return rules.length === 0
    ? kind !== "eslint-enable"
    : DESIGN_RULES.test(rules.join(" "))
}

const all = sources.flatMap(([path, text]) => directives(path, text))

describe("design rule exceptions (ADR-010)", () => {
  it("reads the source tree's directives", () => {
    expect(sources.map(([path]) => path)).toContain(SWATCH)
    expect(all.length).toBeGreaterThan(ALLOWED.length)
  })

  it("allows only the listed exceptions", () => {
    const found = all
      .filter(touchesDesignRules)
      .map(({ path, directive }) => ({ path, directive }))
    expect(found).toEqual(ALLOWED)
  })

  it("gives the data colour exception its reason", () => {
    const swatch = all.find((d) => d.path === SWATCH)
    expect(swatch?.reason).toMatch(/^ADR-010's data-colour exception/)
  })

  it("recognises every way to switch a rule off", () => {
    const found = directives(
      "x.tsx",
      [
        "// eslint-disable-next-line no-restricted-syntax -- why",
        "/* eslint-disable better-tailwindcss/no-unknown-classes */",
        "/* eslint-disable */",
        "const a = 1 // eslint-disable-line",
        "/* eslint no-restricted-syntax: off */",
        '/* eslint react-hooks/exhaustive-deps: "off",',
        '   "better-tailwindcss/no-unknown-classes": "off" */',
        "// eslint-disable-next-line react-refresh/only-export-components -- why",
        'const b = "/* eslint-disable */"',
        "const c = <p>// eslint-disable</p>",
      ].join("\n"),
    ).filter(touchesDesignRules)
    expect(found.map((d) => d.directive)).toEqual([
      "eslint-disable-next-line no-restricted-syntax",
      "eslint-disable better-tailwindcss/no-unknown-classes",
      "eslint-disable",
      "eslint-disable-line",
      "eslint no-restricted-syntax: off",
      'eslint react-hooks/exhaustive-deps: "off", "better-tailwindcss/no-unknown-classes": "off"',
    ])
  })
})
