import { describe, expect, it } from "vitest"

/**
 * The design rules (`build/design-token-lint.ts`) allow one exception, ADR-010's data
 * colour: a roadmap's own colour, set only by `RoadmapSwatch`. Any other inline
 * directive that could switch them off is reported here, so it fails `pnpm test` even
 * though ESLint itself honours it.
 */
const ALLOWED = [
  {
    path: "/src/features/roadmaps/components/roadmap-swatch.tsx",
    directive: "eslint-disable-next-line no-restricted-syntax",
  },
]

/** Rules a directive must not name, and directives that name none switch off all. */
const DESIGN_RULES = /\bno-restricted-syntax\b|\bbetter-tailwindcss\//

/** Every source module, as text; `routeTree.gen.ts` is generated and not linted. */
const sources = Object.entries(
  import.meta.glob<string>(["/src/**/*.{ts,tsx}", "!/src/routeTree.gen.ts"], {
    query: "?raw",
    import: "default",
    eager: true,
  }),
)

interface Directive {
  path: string
  directive: string
  reason: string | undefined
}

/** ESLint's inline configuration comments: `eslint-disable…`, `eslint-enable` and `eslint`. */
function directives(path: string, text: string): Directive[] {
  const comments = text.matchAll(
    /(?:\/\/|\/\*)\s*(eslint(?:-disable(?:-next-line|-line)?|-enable)?)(?![\w-])([^\n]*?)(?:\*\/|$)/gm,
  )
  return [...comments].map(([, kind = "", rest = ""]) => {
    const [rules = "", reason] = rest.split(/\s--\s/)
    return {
      path,
      directive: `${kind} ${rules.trim()}`.trim(),
      reason: reason?.trim(),
    }
  })
}

/** Whether a directive can switch off a design rule. */
function touchesDesignRules({ directive }: Directive): boolean {
  const [kind = "", ...rules] = directive.split(" ")
  return rules.length === 0
    ? kind !== "eslint-enable"
    : DESIGN_RULES.test(rules.join(" "))
}

// This file names the directives it looks for, so it is left out.
const all = sources
  .filter(([path]) => path !== "/src/styles/lint-exceptions.test.ts")
  .flatMap(([path, text]) => directives(path, text))

describe("design rule exceptions (ADR-010)", () => {
  it("reads the source tree's directives", () => {
    expect(sources.length).toBeGreaterThan(100)
    expect(all.length).toBeGreaterThan(0)
  })

  it("allows only the listed exceptions", () => {
    const found = all
      .filter(touchesDesignRules)
      .map(({ path, directive }) => ({ path, directive }))
    expect(found).toEqual(ALLOWED)
  })

  it("gives the data colour exception its reason", () => {
    const swatch = all.find((d) => d.path === ALLOWED[0]?.path)
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
        "// eslint-disable-next-line react-refresh/only-export-components -- why",
      ].join("\n"),
    ).filter(touchesDesignRules)
    expect(found.map((d) => d.directive)).toEqual([
      "eslint-disable-next-line no-restricted-syntax",
      "eslint-disable better-tailwindcss/no-unknown-classes",
      "eslint-disable",
      "eslint-disable-line",
      "eslint no-restricted-syntax: off",
    ])
  })
})
