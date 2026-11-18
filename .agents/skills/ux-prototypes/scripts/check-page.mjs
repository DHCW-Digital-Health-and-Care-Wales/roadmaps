#!/usr/bin/env node
// Renders a UX prototype page: screenshots each design, and each of its
// artboards, at 1440px, writes the page's text for reviewers
// (page-text.txt), and fails if the page's script throws as it opens, the page
// scrolls sideways at 375px, a navigation contains no native controls, a
// choice mark sits outside a native control, an element id repeats, or the
// review bar does not link every design.
// Usage: node check-page.mjs <page.html-or-url> <shots-dir>
import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { launchChromium } from "./chromium.mjs"

const CHOICE_CONTROLS =
  'button, [tabindex]:is([role="radio"], [role="checkbox"]), [aria-hidden="true"]'

/**
 * A frame's outline: its visible text and each control's role and accessible
 * name, then the aria-hidden text it also draws, such as a logo, which the
 * outline leaves out.
 */
async function frameText(locator) {
  const outline = await locator.ariaSnapshot()
  const drawn = await locator.evaluate((root) =>
    [...root.querySelectorAll('[aria-hidden="true"]')]
      .filter(
        (el) =>
          !el.parentElement.closest('[aria-hidden="true"]') &&
          el.checkVisibility(),
      )
      .map((el) => (el.innerText ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean),
  )
  return drawn.length > 0
    ? `${outline}\n- aria-hidden text drawn: ${drawn.join(" | ")}`
    : outline
}

/** An artboard's frames in page order: each one's caption (its label strip), then its outline. */
async function artboardText(board) {
  const columns = board.locator(":scope > .col")
  const lines = []
  for (let n = 0; n < (await columns.count()); n++) {
    const column = columns.nth(n)
    const caption = await column.locator(":scope > .lbl").evaluateAll((lbls) =>
      lbls.map((lbl) =>
        [...lbl.childNodes]
          .map((node) => node.textContent.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" "),
      ),
    )
    lines.push(`\n### ${caption.join(" / ")}`)
    const frames = column.locator(":scope > :not(.lbl)")
    for (let f = 0; f < (await frames.count()); f++)
      lines.push(await frameText(frames.nth(f)))
  }
  return lines
}

const [page, out] = process.argv.slice(2)
if (!page || !out) {
  console.error("usage: node check-page.mjs <page.html-or-url> <shots-dir>")
  process.exit(2)
}
await mkdir(out, { recursive: true })
// An earlier run's images of a design or artboard since cut would be read as the page's.
for (const file of await readdir(out))
  if (/^(d\d+(-ab\d+)?\.png|page-text\.txt)$/.test(file))
    await rm(path.join(out, file))
const url = /^https?:\/\//.test(page)
  ? new URL(page).href
  : pathToFileURL(path.resolve(page)).href
const browser = await launchChromium()
try {
  const desk = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  })
  const phone = await browser.newPage({
    viewport: { width: 375, height: 800 },
  })
  // Both pages are opened first: a script may throw only at one width, in a
  // branch a phone alone takes.
  const scriptErrors = new Set()
  for (const page of [desk, phone]) {
    page.on("pageerror", (err) => scriptErrors.add(err.message))
    await page.goto(url)
  }
  if (scriptErrors.size > 0) {
    console.error(
      `the page's script threw as it opened: ${[...scriptErrors].join("; ")}`,
    )
    process.exitCode = 1
  }
  // Under automation the review chrome sits in the page's flow
  // (assets/review-chrome.js), so it crosses no design in a screenshot.
  const ids = await desk.$$eval("figure[id]", (fs) =>
    fs.filter((f) => !f.parentElement.closest("figure[id]")).map((f) => f.id),
  )
  const linked = await desk.$$eval(".review-bar a.review-design", (links) =>
    links.map((a) => a.getAttribute("href").slice(1)),
  )
  const unlinked = ids.filter((id) => !linked.includes(id))
  if (unlinked.length > 0) {
    console.error(
      `the review bar does not link ${unlinked.join(", ")}; keep the review chrome the starter and the assembler write`,
    )
    process.exitCode = 1
  }
  const emptyNavigation = await desk.$$eval(
    'figure[id] :is(nav, .hdr, [role="navigation"])',
    (navs) =>
      navs
        .filter((nav) => !nav.querySelector("a[href],button"))
        .map((nav) => nav.closest("figure[id]").id),
  )
  if (emptyNavigation.length > 0) {
    console.error(
      `navigation without native controls in ${[...new Set(emptyNavigation)].join(", ")}; use links or buttons`,
    )
    process.exitCode = 1
  }
  // Every design shares one document, so a repeated id, within a design or
  // across designs, points a label or aria reference at the wrong control.
  const duplicateIds = await desk.$$eval("[id]", (els) => {
    const where = new Map()
    for (const el of els) {
      const place = el.closest("figure[id]")?.id ?? "the page"
      where.set(el.id, [...(where.get(el.id) ?? []), place])
    }
    return [...where]
      .filter(([, places]) => places.length > 1)
      .map(([id, places]) => `${id} in ${[...new Set(places)].join(", ")}`)
  })
  if (duplicateIds.length > 0) {
    console.error(
      `duplicate element ids: ${duplicateIds.join("; ")}; prefix each id with its design`,
    )
    process.exitCode = 1
  }
  // A .rad or .chk mark must sit in a control reachable by keyboard and screen
  // reader, or be aria-hidden.
  const inertChoices = await desk.$$eval(
    "figure[id] :is(.rad, .chk)",
    (marks, controls) =>
      marks
        .filter(
          (mark) =>
            !mark.closest(controls) &&
            !["radio", "checkbox"].includes(
              mark.closest("label")?.control?.type,
            ),
        )
        .map((mark) => mark.closest("figure[id]").id),
    CHOICE_CONTROLS,
  )
  if (inertChoices.length > 0) {
    console.error(
      `choice marks outside a native control in ${[...new Set(inertChoices)].join(", ")}; put each in a button with a radio or checkbox role, or aria-hidden a legend's mark`,
    )
    process.exitCode = 1
  }
  let artboards = 0
  const text = []
  for (const id of ids) {
    const design = desk.locator(`#${id}`)
    await design.screenshot({ path: path.join(out, `${id}.png`) })
    const boards = design.locator(".ab")
    const count = await boards.count()
    const [title] = await design.locator("figcaption").allInnerTexts()
    text.push(`# ${id}${title ? `: ${title}` : ""}`)
    for (let n = 0; n < count; n++) {
      const name = `${id}-ab${n + 1}`
      const board = boards.nth(n)
      await board.screenshot({ path: path.join(out, `${name}.png`) })
      text.push(`\n## ${name}`)
      text.push(...(await artboardText(board)))
      artboards += 1
    }
    // A design drawn without artboards, such as a working component.
    if (count === 0) text.push(await frameText(design))
  }
  await writeFile(path.join(out, "page-text.txt"), `${text.join("\n")}\n`)
  const width = await phone.evaluate(() => document.documentElement.scrollWidth)
  console.log(
    `${ids.length} designs captured in ${out} (${artboards} artboards; text in page-text.txt); phone scroll width ${width}px`,
  )
  if (ids.length === 0 || width > 375) {
    console.error(
      ids.length === 0 ? "no designs found" : "page scrolls sideways at 375px",
    )
    process.exitCode = 1
  }
} finally {
  await browser.close()
}
