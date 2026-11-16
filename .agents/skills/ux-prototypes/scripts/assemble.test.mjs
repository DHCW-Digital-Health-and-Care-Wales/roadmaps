import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { launchChromium } from "./chromium.mjs"

const run = promisify(execFile)
const here = path.dirname(fileURLToPath(import.meta.url))

// A design's own shell often has a header bar and sectioned content, as a
// roadmap list prototype does. The page around the designs must not
// restyle them.
const fragment =
  '<div class="ab"><div class="dev"><header class="top" id="shell">Roadmaps</header><section><h1 id="heading">Today</h1></section><div class="brief" id="brief">Note</div></div></div>'

test("the review page styles its own chrome and leaves a design's markup alone", async () => {
  const scratch = await mkdtemp(
    path.join(os.tmpdir(), "ux-prototype-assemble-"),
  )
  let browser
  try {
    await writeFile(path.join(scratch, "a.html"), fragment)
    await writeFile(
      path.join(scratch, "manifest.json"),
      JSON.stringify({
        title: "Fixture",
        intro: "Intro",
        journeys: [
          {
            title: "One",
            brief: "Brief",
            designs: [{ title: "A", file: "a.html" }],
          },
        ],
      }),
    )
    const out = path.join(scratch, "page.html")
    await run(process.execPath, [
      path.join(here, "assemble.mjs"),
      path.join(scratch, "manifest.json"),
      out,
    ])
    browser = await launchChromium()
    const page = await browser.newPage()
    await page.setContent(await readFile(out, "utf8"))
    const styles = await page.evaluate(() => {
      const css = (el) => getComputedStyle(el)
      const byId = (id) => css(document.getElementById(id))
      return {
        pageHeader: css(document.querySelector("body > header")).position,
        pageHeading: css(document.querySelector("section > h2")).fontSize,
        frame: css(document.querySelector("figure > .frame")).overflowX,
        zoom: css(document.querySelector(".frame .ab")).zoom,
        shell: byId("shell").position,
        heading: byId("heading").fontSize,
        brief: byId("brief").maxWidth,
      }
    })
    const pageBrief = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector("section > .brief")).maxWidth,
    )
    assert.notEqual(pageBrief, "none", "the page's brief keeps its measure")
    assert.deepEqual(styles, {
      pageHeader: "sticky",
      pageHeading: "22px",
      frame: "auto",
      zoom: "0.8",
      shell: "static",
      // mock.css's h1 size, not the page's 22px.
      heading: "32px",
      brief: "none",
    })
  } finally {
    await browser?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})

test("a complete HTML design keeps the styles in its head, scoped to it", async () => {
  const scratch = await mkdtemp(
    path.join(os.tmpdir(), "ux-prototype-assemble-"),
  )
  try {
    await writeFile(
      path.join(scratch, "a.html"),
      '<!doctype html><html><head><style>.probe { color: rgb(1, 2, 3) }</style></head><body><p class="probe">Roadmaps</p></body></html>',
    )
    await writeFile(
      path.join(scratch, "manifest.json"),
      JSON.stringify({
        title: "Fixture",
        intro: "Intro",
        journeys: [
          {
            title: "One",
            brief: "Brief",
            designs: [{ title: "A", file: "a.html" }],
          },
        ],
      }),
    )
    const out = path.join(scratch, "page.html")
    await run(process.execPath, [
      path.join(here, "assemble.mjs"),
      path.join(scratch, "manifest.json"),
      out,
    ])
    const html = await readFile(out, "utf8")
    assert.match(html, /#d1 \.probe\s*\{\s*color: rgb\(1, 2, 3\)/)
    assert.match(html, /<p class="probe">Roadmaps<\/p>/)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})

test("every artboard draws with the app's tokens, mock.css and the manifest's shared styles", async () => {
  const scratch = await mkdtemp(
    path.join(os.tmpdir(), "ux-prototype-assemble-"),
  )
  let browser
  try {
    // One design, two moments: an artboard each, the second in the dark theme.
    await writeFile(
      path.join(scratch, "a.html"),
      '<div class="ab" id="light"><button class="btn p probe" type="button">Publish</button></div><div class="ab dark" id="dark"><button class="btn p" type="button">Publish</button></div>',
    )
    await writeFile(
      path.join(scratch, "shared.css"),
      ".ab .probe { outline: 3px solid rgb(4, 5, 6) } select { min-width: 300px } .ab:has(.missing, .probe) { padding: 31px }",
    )
    await writeFile(
      path.join(scratch, "manifest.json"),
      JSON.stringify({
        title: "Fixture",
        intro: "Intro",
        css: "shared.css",
        journeys: [
          {
            title: "One",
            brief: "Brief",
            designs: [{ title: "A", file: "a.html" }],
          },
        ],
      }),
    )
    const out = path.join(scratch, "page.html")
    await run(process.execPath, [
      path.join(here, "assemble.mjs"),
      path.join(scratch, "manifest.json"),
      out,
    ])
    browser = await launchChromium()
    const page = await browser.newPage()
    await page.setContent(await readFile(out, "utf8"))
    const button = (id) =>
      page.locator(`#${id} .btn`).evaluate((el) => {
        const { backgroundColor, outlineColor, fontFamily } =
          getComputedStyle(el)
        return { backgroundColor, outlineColor, fontFamily }
      })
    const light = await button("light")
    const dark = await button("dark")
    const pageFont = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    )
    // The primary colour resolves through the app's three tiers of token,
    // and the dark theme's differs.
    assert.match(light.backgroundColor, /^rgb\(/)
    assert.notEqual(dark.backgroundColor, light.backgroundColor)
    assert.notEqual(light.fontFamily, pageFont)
    assert.equal(light.outlineColor, "rgb(4, 5, 6)")
    // A comma inside :has() is the selector's own, so its second branch still matches.
    assert.equal(
      await page
        .locator("#light")
        .evaluate((el) => getComputedStyle(el).paddingTop),
      "31px",
    )
    // A shared rule for a bare element stays inside the designs.
    assert.notEqual(
      await page
        .locator("body > header select")
        .evaluate((el) => getComputedStyle(el).minWidth),
      "300px",
    )
  } finally {
    await browser?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})

test("an at-rule in the shared stylesheet stops the build, naming the stylesheet", async () => {
  const scratch = await mkdtemp(
    path.join(os.tmpdir(), "ux-prototype-assemble-"),
  )
  try {
    await writeFile(path.join(scratch, "a.html"), '<div class="ab"></div>')
    await writeFile(
      path.join(scratch, "shared.css"),
      "@media (min-width: 40em) { .ab .probe { color: red } }",
    )
    await writeFile(
      path.join(scratch, "manifest.json"),
      JSON.stringify({
        title: "Fixture",
        intro: "Intro",
        css: "shared.css",
        journeys: [
          {
            title: "One",
            brief: "Brief",
            designs: [{ title: "A", file: "a.html" }],
          },
        ],
      }),
    )
    const out = path.join(scratch, "page.html")
    await assert.rejects(
      run(process.execPath, [
        path.join(here, "assemble.mjs"),
        path.join(scratch, "manifest.json"),
        out,
      ]),
      (error) =>
        error.code === 1 &&
        /the shared stylesheet shared\.css: at-rules are not supported/.test(
          error.stderr,
        ),
    )
    await assert.rejects(readFile(out, "utf8"), { code: "ENOENT" })
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})
