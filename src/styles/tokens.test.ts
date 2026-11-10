import { describe, expect, it } from "vitest"

import { FOCUS_UTILITIES, SHADOW_TOKENS, TEXT_TOKENS } from "@/lib/utils"

import css from "./globals.css?raw"
import {
  hasColourLiteral,
  readStylesheet,
  references,
  type Declaration,
} from "./testing/stylesheet"

/**
 * The pinned DHCW release's Sass, from the `dhcw-design-system` devDependency (an exact
 * GitHub tag in package.json, ADR-010), keyed by its path in that repository.
 */
const dhcwSources = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("/node_modules/dhcw-design-system/src/**/*.scss", {
      query: "?raw",
      import: "default",
      eager: true,
    }),
  ).map(([path, text]) => [
    path.replace("/node_modules/dhcw-design-system/", ""),
    text,
  ]),
)

const { declarations, properties } = readStylesheet(css)
const primitives = declarations.filter((d) => d.name.startsWith("--nhsw-"))

function normalise(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase()
}

/**
 * A Sass variable's value in `text`: its last assignment, which is the one Sass uses,
 * following `$a: $b` aliases within the file.
 */
function sassVariable(text: string, name: string): string | undefined {
  const escaped = name.replace(/[$-]/g, "\\$&")
  const pattern = new RegExp(String.raw`^\s*${escaped}\s*:\s*(.+?)\s*;`, "gm")
  const value = [...text.matchAll(pattern)]
    .at(-1)?.[1]
    ?.replace(/\s*!default$/, "")
  return value?.startsWith("$") ? sassVariable(text, value) : value
}

/**
 * The value of `property` set directly inside the first block opened by `selector {`
 * (e.g. `&--grey` or `@mixin nhsw-button-base`), not in a block nested in it.
 */
function blockProperty(
  text: string,
  selector: string,
  property: string,
): string | undefined {
  const lines = text.split("\n")
  const start = lines.findIndex((line) => line.trim() === `${selector} {`)
  if (start === -1) return undefined
  let depth = 0
  for (const line of lines.slice(start)) {
    const trimmed = line.trim()
    if (depth === 1) {
      const match = new RegExp(String.raw`^${property}\s*:\s*(.+?)\s*;`).exec(
        trimmed,
      )
      if (match) return match[1]
    }
    depth += (trimmed.match(/\{/g) ?? []).length
    depth -= (trimmed.match(/\}/g) ?? []).length
    if (depth === 0 && line !== lines[start]) return undefined
  }
  return undefined
}

/** What the pinned release holds for a primitive's `@source` and reference. */
function dhcwValue(primitive: Declaration): string | undefined {
  const text = primitive.source ? dhcwSources[primitive.source] : undefined
  const reference = primitive.reference
  if (text === undefined || reference === undefined) return undefined
  if (reference.startsWith("$")) return sassVariable(text, reference)
  const split = reference.lastIndexOf(" ")
  return blockProperty(
    text,
    reference.slice(0, split),
    reference.slice(split + 1),
  )
}

describe("DHCW primitives (S5)", () => {
  it("reads the pinned release's sources", () => {
    expect(Object.keys(dhcwSources)).toContain("src/tokens/_colours.scss")
    expect(primitives.length).toBeGreaterThan(40)
  })

  it.each(primitives.map((p) => [p.name, p] as const))(
    "%s equals its value in the pinned release",
    (_, primitive) => {
      expect(primitive.source, "an @source comment above it").toBeDefined()
      expect(primitive.reference, "a source reference beside it").toBeDefined()
      const value = dhcwValue(primitive)
      expect(
        value,
        `${primitive.reference ?? "?"} in ${primitive.source ?? "?"}`,
      ).toBeDefined()
      expect(normalise(primitive.value)).toBe(normalise(value ?? ""))
    },
  )

  it("finds every value the references point at", () => {
    // Guards the extractors themselves: a missing block or property returns undefined.
    const text = dhcwSources["src/components/content/_tag.scss"] ?? ""
    expect(blockProperty(text, "&--grey", "color")).toBe("#354550")
    expect(blockProperty(text, "&--grey", "border-radius")).toBeUndefined()
    expect(blockProperty(text, "&--no-such-tag", "color")).toBeUndefined()
    const colours = dhcwSources["src/tokens/_colours.scss"] ?? ""
    expect(sassVariable(colours, "$nhsw-colour-input-border")).toBe("#4c6272")
    // `_colours.scss` assigns `$nhswales-focus-colour` twice; Sass keeps the last.
    expect(sassVariable("$a: #111;\n$b: $a;\n$a: #222;\n", "$b")).toBe("#222")
  })
})

describe("token tiers (ADR-010)", () => {
  const primitiveBlocks = new Set(
    declarations
      .filter((d) => /^--(nhsw|app-dark)-/.test(d.name))
      .map((d) => d.block),
  )

  it("declares primitives only on :root, never per theme", () => {
    expect([...primitiveBlocks]).toEqual([":root"])
  })

  it("holds colour literals only in primitives", () => {
    const literals = [
      ...declarations.filter((d) => !/^--(nhsw|app-dark)-/.test(d.name)),
      ...properties,
    ]
      .filter((d) => hasColourLiteral(d.value))
      .map((d) => `${String(d.line)}: ${d.name}: ${d.value}`)
    expect(literals).toEqual([])
  })

  it("makes every semantic token a var() reference", () => {
    const semantic = declarations.filter(
      (d) =>
        (d.block === ":root" || d.block === ".dark") &&
        !/^--(nhsw|app-dark)-/.test(d.name),
    )
    expect(semantic.length).toBeGreaterThan(40)
    const literal = semantic
      .filter((d) => !/^var\(--[\w-]+\)$/.test(d.value))
      .map((d) => `${d.block} ${d.name}: ${d.value}`)
    expect(literal).toEqual([])
  })

  it("refers only to declared properties", () => {
    const declared = new Set(declarations.map((d) => d.name))
    const unknown = [...declarations, ...properties]
      .flatMap((d) => references(d.value))
      .filter((name) => !declared.has(name))
    expect(unknown).toEqual([])
  })

  it("defines exactly the type, shadow and focus names `cn` merges by", () => {
    const theme = declarations.filter((d) => d.block === "@theme inline")
    const text = theme
      .map((d) => /^--text-([\w-]+?)$/.exec(d.name)?.[1])
      .filter((name) => name !== undefined && !name.includes("--"))
    const shadows = theme
      .map((d) => /^--shadow-([\w-]+)$/.exec(d.name)?.[1])
      .filter((name) => name !== undefined)
    const utilities = [...css.matchAll(/^@utility ([\w-]+)/gm)].map(
      (match) => match[1],
    )
    expect(text).toEqual([...TEXT_TOKENS])
    expect(shadows).toEqual([...SHADOW_TOKENS])
    expect(utilities).toEqual([...FOCUS_UTILITIES])
  })
})
