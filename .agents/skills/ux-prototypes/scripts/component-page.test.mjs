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
    const out = path.join(scratch, "page", "sample-ux-prototypes.html")
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

test("the starter page, served", (t) =>
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
      browser = await launchChromium()
      const page = await browser.newPage()
      await page.goto(url)
      const stage = page.locator("#pa .stage")
      const host = page.locator("#pa-host")
      const style = (property) =>
        stage.evaluate((el, name) => getComputedStyle(el)[name], property)
      const width = (locator) =>
        locator.evaluate((el) => el.getBoundingClientRect().width)

      await t.test("passes the page check", async () => {
        const { stdout } = await run(process.execPath, [
          checker,
          url,
          path.join(scratch, "shots"),
        ])
        assert.match(stdout, /1 designs captured/)
      })

      // Each block of tokens resolves on the stage: a colour through the three
      // :root tiers, the app's font from the theme block (not the page's own),
      // and .dark over both.
      await t.test("draws with the app's tokens, light and dark", async () => {
        const light = await style("backgroundColor")
        assert.match(light, /^rgb\(/)
        assert.notEqual(
          await style("fontFamily"),
          await page
            .locator(".page")
            .evaluate((el) => getComputedStyle(el).fontFamily),
        )
        await page.getByRole("button", { name: "Dark" }).click()
        assert.notEqual(await style("backgroundColor"), light)
      })

      await t.test("a screen sets the host to its width there", async () => {
        assert.equal(await width(host), 360)
        await page.getByRole("button", { name: "Small tablet 640" }).click()
        assert.equal(await width(host), 294)
        assert.equal(await page.locator("#host-width").textContent(), "294")
      })

      await t.test(
        "the design works by keyboard and starts again",
        async () => {
          const sample = await host.locator("h3").textContent()
          await page.getByRole("button", { name: /^Edit / }).press("Enter")
          // As tall as the app's field: 24px of text, 8px padding, a 2px border.
          assert.equal(
            await page
              .getByRole("textbox", { name: "Title" })
              .evaluate((el) => el.getBoundingClientRect().height),
            44,
          )
          await page.keyboard.press("ControlOrMeta+a")
          await page.keyboard.type("  Book  a video call ")
          await page.keyboard.press("Enter")
          assert.equal(
            await host.locator("h3").textContent(),
            "Book a video call",
          )
          assert.equal(
            await page.locator("#pa-readout").textContent(),
            "Title: Book a video call",
          )
          // Focus returns to Edit, named for the item.
          assert.equal(
            await page.evaluate(() => document.activeElement.textContent),
            "Edit Book a video call",
          )
          await page
            .getByRole("button", { name: "Start again design A" })
            .click()
          assert.equal(await host.locator("h3").textContent(), sample)
        },
      )

      await t.test("a design's figure is named for the design", async () => {
        assert.equal(
          await page
            .getByRole("figure", { name: "A. The design's name" })
            .count(),
          1,
        )
      })

      // The phone's host is drawn as wide as the app draws it; a wider host
      // keeps its width and its stage scrolls.
      await t.test("on a phone it opens on the phone's host", async () => {
        const phone = await browser.newPage({
          viewport: { width: 375, height: 800 },
        })
        await phone.goto(url)
        const phoneHost = phone.locator("#pa-host")
        assert.equal(await width(phoneHost), 343)
        assert.equal(await phone.locator("#host-width").textContent(), "343")
        await phone.getByRole("button", { name: "Large phone 639" }).click()
        assert.equal(await width(phoneHost), 607)
        assert.equal(
          await phone.evaluate(() => document.documentElement.scrollWidth),
          375,
        )
      })
    } finally {
      await browser?.close()
      server.close()
    }
  }))
