#!/usr/bin/env node
// Starts a working-component prototype page: writes assets/component-page.html
// with the app's theme tokens (src/styles/globals.css) set on every .stage, so
// a prototype draws with the app's own token names, light and dark.
// Usage: node component-page.mjs <out.html>
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const MARKER = "/* @app-tokens */"
// The blocks of globals.css that hold tokens, and the selector each takes here.
const SCOPES = {
  ":root": ".stage",
  "@theme inline": ".stage",
  ".dark": ".stage.dark",
}
const BLOCK = /^(:root|@theme inline|\.dark) \{\n([\s\S]*?)^\}/gm

function appTokens(css, indent) {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "")
  const blocks = [...plain.matchAll(BLOCK)]
  for (const selector of Object.keys(SCOPES))
    if (!blocks.some(([, found]) => found === selector))
      throw new Error(`no ${selector} block of tokens found in globals.css`)
  return blocks
    .map(([, selector, body]) => {
      const declarations = body
        .replace(/\s*\n\s*/g, " ")
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .map((declaration) => `${indent}  ${declaration};`)
      return [`${SCOPES[selector]} {`, ...declarations, `${indent}}`].join("\n")
    })
    .join(`\n${indent}`)
}

const [out] = process.argv.slice(2)
if (!out) {
  console.error("usage: node component-page.mjs <out.html>")
  process.exit(2)
}
try {
  const starter = await readFile(
    path.join(here, "../assets/component-page.html"),
    "utf8",
  )
  const globals = await readFile(
    path.join(here, "../../../../src/styles/globals.css"),
    "utf8",
  )
  const at = starter.indexOf(MARKER)
  if (at < 0) throw new Error(`the starter page has no ${MARKER} marker`)
  const indent = starter.slice(starter.lastIndexOf("\n", at) + 1, at)
  await mkdir(path.dirname(out), { recursive: true })
  // "wx": a page already there is someone's work, never overwritten.
  const tokens = appTokens(globals, indent)
  await writeFile(
    out,
    starter.replace(MARKER, () => tokens),
    { flag: "wx" },
  )
  console.log(`wrote ${out}`)
} catch (err) {
  console.error(
    err.code === "EEXIST" ? `${out} exists; not overwritten` : err.message,
  )
  process.exitCode = 1
}
