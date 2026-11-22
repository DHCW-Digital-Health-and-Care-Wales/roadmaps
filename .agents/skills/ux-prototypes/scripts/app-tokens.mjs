// The app's theme tokens, read from apps/editor/src/styles/globals.css as CSS for a
// prototype page: every token under its own name, on `lightSelector`, with
// the dark theme's values on `darkSelector`.
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const GLOBALS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../apps/editor/src/styles/globals.css",
)
// The blocks of globals.css that hold tokens.
const BLOCK = /^(:root|@theme inline|\.dark) \{\n([\s\S]*?)^\}/gm

export async function appTokens({ lightSelector, darkSelector }, indent = "") {
  const scopes = {
    ":root": lightSelector,
    "@theme inline": lightSelector,
    ".dark": darkSelector,
  }
  const css = await readFile(GLOBALS, "utf8")
  const blocks = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(BLOCK)]
  for (const selector of Object.keys(scopes))
    if (!blocks.some(([, blockSelector]) => blockSelector === selector))
      throw new Error(`no ${selector} block of tokens found in globals.css`)
  return blocks
    .map(([, selector, body]) => {
      const declarations = body
        .replace(/\s*\n\s*/g, " ")
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .map((declaration) => `${indent}  ${declaration};`)
      return [`${scopes[selector]} {`, ...declarations, `${indent}}`].join("\n")
    })
    .join(`\n${indent}`)
}
