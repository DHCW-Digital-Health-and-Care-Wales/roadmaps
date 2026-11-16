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
  '<div class="ab"><div class="dev"><header class="top" id="shell">Roadmaps</header><section><h2 id="heading">Today</h2></section><div class="brief" id="brief">Note</div></div></div>'

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
      // mock.css's h2 size, not the page's 22px.
      heading: "17px",
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

test("a numbered journey title stops the build, since the page numbers journeys", async () => {
  const scratch = await mkdtemp(
    path.join(os.tmpdir(), "ux-prototype-assemble-"),
  )
  try {
    await writeFile(path.join(scratch, "a.html"), "<p>Roadmaps</p>")
    const assembleWith = async (title) => {
      await writeFile(
        path.join(scratch, "manifest.json"),
        JSON.stringify({
          title: "Fixture",
          intro: "Intro",
          journeys: [
            {
              title,
              brief: "Brief",
              designs: [{ title: "A", file: "a.html" }],
            },
          ],
        }),
      )
      return run(process.execPath, [
        path.join(here, "assemble.mjs"),
        path.join(scratch, "manifest.json"),
        path.join(scratch, "page.html"),
      ])
    }
    await assert.rejects(
      assembleWith("1. Put an item in its place"),
      /journey 1: leave the number out of "1\. Put an item in its place"/,
    )
    await assembleWith("2.0 roadmaps")
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})
