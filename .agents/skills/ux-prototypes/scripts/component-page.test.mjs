import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { launchChromium } from "./chromium.mjs"

const run = promisify(execFile)
const here = path.dirname(fileURLToPath(import.meta.url))
const starter = path.join(here, "component-page.mjs")
const checker = path.join(here, "check-page.mjs")

/** Runs `body` with a scratch folder and the path of a starter page written into it. */
async function withStarterPage(body) {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "ux-prototype-start-"))
  try {
    const out = path.join(scratch, "page", "prototypes.html")
    await run(process.execPath, [starter, out])
    await body(out, scratch)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

test("the starter page is written with the app's tokens, and never over a page already there", () =>
  withStarterPage(async (out) => {
    const html = await readFile(out, "utf8")
    assert.doesNotMatch(html, /@app-tokens/)
    assert.match(html, /\.stage \{\s+--nhsw-/)
    assert.match(html, /\.stage \{\s+--font-sans:/)
    assert.match(html, /\.stage\.dark \{\s+color-scheme: dark;/)

    await assert.rejects(run(process.execPath, [starter, out]), (err) => {
      assert.match(err.stderr, /exists; not overwritten/)
      return true
    })
    assert.equal(await readFile(out, "utf8"), html)
  }))

test("the starter page passes the page check, and its switches and design work by keyboard", () =>
  withStarterPage(async (out, scratch) => {
    const html = await readFile(out, "utf8")
    const server = createServer((_, res) => {
      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(html)
    })
    let browser
    try {
      server.listen(0, "127.0.0.1")
      await once(server, "listening")
      const url = `http://127.0.0.1:${server.address().port}/`

      const { stdout } = await run(process.execPath, [
        checker,
        url,
        path.join(scratch, "shots"),
      ])
      assert.match(stdout, /1 designs captured/)

      browser = await launchChromium()
      const page = await browser.newPage()
      await page.goto(url)
      const stage = page.locator("#pa .stage")
      const host = page.locator("#pa-host")
      const style = (property) =>
        stage.evaluate((el, name) => getComputedStyle(el)[name], property)
      const width = () =>
        host.evaluate((el) => el.getBoundingClientRect().width)
      const widthShown = () => page.locator("#host-width").textContent()

      // Each block of tokens resolves on the stage: a colour through the three
      // :root tiers, the font from the theme block, and .dark over both.
      const light = await style("backgroundColor")
      assert.match(light, /^rgb\(/)
      assert.match(await style("fontFamily"), /Roboto/)
      await page.getByRole("button", { name: "Dark" }).click()
      assert.notEqual(await style("backgroundColor"), light)

      // A screen sets the host to the width the app gives it there.
      assert.equal(await width(), 360)
      await page.getByRole("button", { name: "Small tablet 640" }).click()
      assert.equal(await width(), 294)
      assert.equal(await widthShown(), "294")

      // The round trip by keyboard: Edit, type, Enter; focus returns to Edit.
      const sample = await host.locator("h3").textContent()
      await page.getByRole("button", { name: /^Edit / }).press("Enter")
      await page.keyboard.press("ControlOrMeta+a")
      await page.keyboard.type("  Book  a video call ")
      await page.keyboard.press("Enter")
      assert.equal(await host.locator("h3").textContent(), "Book a video call")
      assert.equal(
        await page.locator("#pa-readout").textContent(),
        "Title: Book a video call",
      )
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        "Edit Book a video call",
      )

      // Each design's Start again is named for its design.
      await page.getByRole("button", { name: "Start again design A" }).click()
      assert.equal(await host.locator("h3").textContent(), sample)
      await page
        .getByRole("figure", { name: "A. The design's name" })
        .waitFor({ timeout: 1000 })

      // On a phone the page opens on the phone's host, drawn as wide as the
      // app draws it; a wider host keeps its width and its stage scrolls.
      const phone = await browser.newPage({
        viewport: { width: 375, height: 800 },
      })
      await phone.goto(url)
      const phoneWidth = () =>
        phone
          .locator("#pa-host")
          .evaluate((el) => el.getBoundingClientRect().width)
      assert.equal(await phoneWidth(), 343)
      assert.equal(await phone.locator("#host-width").textContent(), "343")
      await phone.getByRole("button", { name: "Large phone 639" }).click()
      assert.equal(await phoneWidth(), 607)
      assert.equal(
        await phone.evaluate(() => document.documentElement.scrollWidth),
        375,
      )
    } finally {
      await browser?.close()
      server.close()
    }
  }))
