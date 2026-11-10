#!/usr/bin/env node
// Assembles UX prototype fragments into one self-contained review page.
// Usage: node assemble.mjs <manifest.json> <out.html>
// Each fragment's <style> blocks are scoped to its own design. They may hold
// plain rules and comments only; an at-rule stops the build, since scoping it
// would leave an open block that swallows every later design's styles.
// Fragments may be plain HTML or design-canvas .dc.html files (read inside <x-dc>).
import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  )
const paragraphs = (text = "") =>
  text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("")

function scope(css, id) {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "")
  if (plain.includes("@"))
    throw new Error(
      `design ${id}: at-rules are not supported in fragment styles`,
    )
  return plain
    .split("}")
    .filter((rule) => rule.includes("{"))
    .map((rule) => {
      const [selectors, body] = rule.split(/\{(.*)/s)
      const scoped = selectors
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !["body", "html", ":root"].includes(s))
        .map((s) => `#${id} ${s}`)
        .join(",")
      return scoped ? `${scoped}{${body}}` : ""
    })
    .join("\n")
}

function fragmentParts(source) {
  const dc = source.match(/<x-dc>([\s\S]*)<\/x-dc>/)
  let body = dc
    ? dc[1]
    : (source.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? source)
  const styles = []
  body = body
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (_, css) => {
      styles.push(css)
      return ""
    })
    .replace(/<\/?helmet>/g, "")
  return { body: body.trim(), css: styles.join("\n") }
}

async function assemble(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  const base = path.dirname(manifestPath)
  const mockCss = await readFile(path.join(here, "../assets/mock.css"), "utf8")
  const scoped = []
  const sections = []
  let n = 0
  for (const [j, journey] of manifest.journeys.entries()) {
    const figures = []
    for (const design of journey.designs) {
      const id = `d${++n}`
      const { body, css } = fragmentParts(
        await readFile(path.join(base, design.file), "utf8"),
      )
      scoped.push(scope(css, id))
      figures.push(
        `<figure id="${id}"><figcaption>${escapeHtml(design.title)}</figcaption><div class="frame">${body}</div></figure>`,
      )
    }
    sections.push(
      `<section id="j${j + 1}"><h2>${j + 1}. ${escapeHtml(journey.title)}</h2><div class="brief">${paragraphs(journey.brief)}</div>${figures.join("")}</section>`,
    )
  }
  const nav = manifest.journeys
    .map(
      (jr, j) =>
        `<a href="#j${j + 1}">${j + 1}. ${escapeHtml(jr.title.split(" — ")[0])}</a>`,
    )
    .join("")
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(manifest.title)}</title>
<style>
html,body{margin:0;background:#e2e7ee}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111827}
/* The page's own chrome, by child path from body, so a design's header, section or brief keeps its own styles. */
body>header.top{position:sticky;top:0;z-index:20;background:#ffffffee;border-bottom:1px solid #d1d5db;padding:10px 16px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
body>header.top strong{font-size:15px;margin-right:8px}
body>header.top a{font-size:13px;color:#1d4ed8;text-decoration:none;white-space:nowrap}
body>header.top label{font-size:13px;margin-left:auto}
body>main.wrap{padding:16px;display:flex;flex-direction:column;gap:40px}
body>main.wrap>.intro,body>main.wrap>section>.brief{max-width:80ch;font-size:14px;line-height:1.5;color:#374151;display:flex;flex-direction:column;gap:6px}
body>main.wrap>.intro>p,body>main.wrap>section>.brief>p{margin:0}
body>main.wrap>section{min-width:0}
body>main.wrap>section>h2{margin:0 0 8px;font-size:22px}
body>main.wrap>section>.brief{margin-bottom:12px}
body>main.wrap>section>figure{margin:0 0 20px}
body>main.wrap>section>figure>figcaption{font-weight:600;font-size:15px;margin:0 0 6px}
/* Each design scrolls inside its own frame; 32px is main.wrap's padding. Zoom fits a 1560px artboard on a laptop. */
body>main.wrap>section>figure>.frame{overflow-x:auto;border-radius:12px;max-width:calc(100vw - 32px)}
body>main.wrap>section>figure>.frame .ab{zoom:var(--z,.8)}
${mockCss}
${scoped.join("\n")}
</style>
</head>
<body>
<header class="top"><strong>${escapeHtml(manifest.title)}</strong>${nav}<label>Zoom <select onchange="document.documentElement.style.setProperty('--z',this.value)"><option value="0.5">50%</option><option value="0.65">65%</option><option value="0.8" selected>80%</option><option value="1">100%</option></select></label></header>
<main class="wrap">
<div class="intro">${paragraphs(manifest.intro)}</div>
${sections.join("\n")}
</main>
</body>
</html>
`
}

const [manifest, out] = process.argv.slice(2)
if (!manifest || !out) {
  console.error("usage: node assemble.mjs <manifest.json> <out.html>")
  process.exit(2)
}
try {
  const page = await assemble(manifest)
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, page)
  console.log(`wrote ${out}`)
} catch (err) {
  console.error(err.message)
  process.exitCode = 1
}
