/**
 * A reader for `globals.css`, enough for its tests: one declaration per line, as
 * Prettier formats it. Test-only.
 */

/** One custom property declaration. */
export interface Declaration {
  /** The enclosing top-level block: `:root`, `.dark`, `@theme inline`, … */
  block: string
  name: string
  value: string
  /** The comment on the same line, if any: a primitive's source reference. */
  reference: string | undefined
  /** The last `@source` comment above it in its block. */
  source: string | undefined
  line: number
}

/** A plain declaration (`outline: …`), for the literal-colour scan. */
export interface Property {
  block: string
  name: string
  value: string
  line: number
}

const CUSTOM_PROPERTY = /^(--[\w-]+):\s*(.+?);\s*(?:\/\*\s*(.*?)\s*\*\/)?$/
const PROPERTY = /^([a-z-]+):\s*(.+?);$/
const SOURCE = /^\/\*\s*@source\s+(\S+)\s*\*\/$/

export function readStylesheet(css: string): {
  declarations: Declaration[]
  properties: Property[]
} {
  const declarations: Declaration[] = []
  const properties: Property[] = []
  const blocks: string[] = []
  let source: string | undefined
  let inComment = false
  // A declaration Prettier wrapped over several lines, joined until its `;`.
  let pending: { text: string; line: number } | undefined

  css.split("\n").forEach((raw, index) => {
    let line = index + 1
    let text = raw.trim()
    if (pending) {
      pending.text += ` ${text}`
      if (!text.includes(";")) return
      ;({ text, line } = pending)
      text = text
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .replace(/\s+/g, " ")
      pending = undefined
    } else if (/^(?:--[\w-]+|[a-z-]+):/.test(text) && !text.includes(";")) {
      pending = { text, line }
      return
    }
    if (inComment) {
      if (text.includes("*/")) inComment = false
      return
    }
    const sourceMatch = SOURCE.exec(text)
    if (sourceMatch) {
      source = sourceMatch[1]
      return
    }
    if (text.startsWith("/*")) {
      if (!text.includes("*/")) inComment = true
      return
    }
    if (text.endsWith("{")) {
      blocks.push(text.slice(0, -1).trim())
      if (blocks.length === 1) source = undefined
      return
    }
    if (text === "}") {
      blocks.pop()
      return
    }
    const block = blocks[0] ?? ""
    const custom = CUSTOM_PROPERTY.exec(text)
    if (custom) {
      const [, name = "", value = "", reference] = custom
      declarations.push({ block, name, value, reference, source, line })
      return
    }
    const property = PROPERTY.exec(text)
    if (property) {
      const [, name = "", value = ""] = property
      properties.push({ block, name, value, line })
    }
  })

  return { declarations, properties }
}

const COLOUR_LITERAL =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(|\b(?:white|black|red|green|blue|yellow|grey|gray)\b/i

/**
 * Whether a value holds a colour literal: hex, a colour function or a common named
 * colour. Custom property names (`--nhsw-tag-grey-ink`) don't count.
 */
export function hasColourLiteral(value: string): boolean {
  return COLOUR_LITERAL.test(value.replace(/--[\w-]+/g, ""))
}

/** The names a value refers to through `var(--name)`, fallbacks included. */
export function references(value: string): string[] {
  return [...value.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1] ?? "")
}
