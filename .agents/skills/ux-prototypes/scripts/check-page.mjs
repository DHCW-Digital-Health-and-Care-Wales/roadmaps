#!/usr/bin/env node
// Renders a UX prototype page: screenshots each design at 1440px and fails if
// the page's script throws as it opens, the page scrolls sideways at 375px, a
// navigation contains no native controls, a choice mark sits outside a native
// control, or an element id repeats.
// Usage: node check-page.mjs <page.html-or-url> <shots-dir>
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { launchChromium } from "./chromium.mjs"

const CHOICE_CONTROLS =
  'button, [tabindex]:is([role="radio"], [role="checkbox"]), [aria-hidden="true"]'

const [page, out] = process.argv.slice(2)
if (!page || !out) {
  console.error("usage: node check-page.mjs <page.html-or-url> <shots-dir>")
  process.exit(2)
}
await mkdir(out, { recursive: true })
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
  // An assembled page's own header stays in view as the page scrolls, and
  // would cross every design taller than the window in its screenshot.
  await desk.addStyleTag({ content: "body>header.top{position:static}" })
  const ids = await desk.$$eval("figure[id]", (fs) => fs.map((f) => f.id))
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
  for (const id of ids)
    await desk
      .locator(`#${id}`)
      .screenshot({ path: path.join(out, `${id}.png`) })
  const width = await phone.evaluate(() => document.documentElement.scrollWidth)
  console.log(
    `${ids.length} designs captured in ${out}; phone scroll width ${width}px`,
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
