#!/usr/bin/env node
// Starts a working-component prototype page: writes assets/component-page.html
// with the app's theme tokens set on every .stage, so a prototype draws with
// the app's own token names, light and dark.
// Usage: node component-page.mjs <out.html>
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { appTokens } from "./app-tokens.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const MARKER = "/* @app-tokens */"

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
  const at = starter.indexOf(MARKER)
  if (at < 0) throw new Error(`the starter page has no ${MARKER} marker`)
  const indent = starter.slice(starter.lastIndexOf("\n", at) + 1, at)
  const tokens = await appTokens(
    { light: ".stage", dark: ".stage.dark" },
    indent,
  )
  await mkdir(path.dirname(out), { recursive: true })
  // "wx": a page already there is someone's work, never overwritten.
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
