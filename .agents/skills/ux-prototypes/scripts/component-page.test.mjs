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

test("the starter page draws with the app's tokens, works, and passes the page check", async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "ux-prototype-start-"))
  const out = path.join(scratch, "page", "prototypes.html")
  let browser
  let server
  try {
    await run(process.execPath, [starter, out])
    const html = await readFile(out, "utf8")
    assert.doesNotMatch(html, /@app-tokens/)
    assert.match(html, /\.stage \{\s+--nhsw-/)
    assert.match(html, /\.stage\.dark \{\s+color-scheme: dark;/)

    // A page already there is someone's work.
    await assert.rejects(run(process.execPath, [starter, out]), (err) => {
      assert.match(err.stderr, /exists; not overwritten/)
      return true
    })
    assert.equal(await readFile(out, "utf8"), html)

    server = createServer((_, res) => {
      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(html)
    })
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
    const background = () =>
      stage.evaluate((el) => getComputedStyle(el).backgroundColor)
    const width = () => host.evaluate((el) => el.getBoundingClientRect().width)

    // Every tier of token resolves on the stage, and the dark theme changes it.
    const light = await background()
    assert.match(light, /^rgb\(/)
    await page.getByRole("button", { name: "Dark" }).click()
    assert.notEqual(await background(), light)

    // A screen sets the host to the width the app gives it there.
    assert.equal(await width(), 360)
    await page.getByRole("button", { name: "Small tablet 640" }).click()
    assert.equal(await width(), 294)
    assert.equal(await page.locator("#host-width").textContent(), "294")

    // The round trip by keyboard: Edit, type, Enter; focus returns to Edit.
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

    await page.getByRole("button", { name: "Start again" }).click()
    assert.equal(
      await host.locator("h3").textContent(),
      "Offer video appointments where suitable",
    )
  } finally {
    await browser?.close()
    server?.close()
    await rm(scratch, { recursive: true, force: true })
  }
})
