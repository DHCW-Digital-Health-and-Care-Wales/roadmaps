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

const run = promisify(execFile)
const checker = fileURLToPath(new URL("./check-page.mjs", import.meta.url))
const fixtures = {
  "/links":
    '<figure id="d1"><nav><a href="#d1">Home</a></nav><div class="hdr"><a href="#d1">Roadmaps</a><button type="button">Disconnect</button></div><div role="navigation"><a href="#d1">Settings</a></div></figure>',
  "/labels":
    '<figure id="d1"><div class="dev"><nav><a href="#d1">Home</a></nav></div><div class="ph"><nav><span>Home</span></nav></div></figure>',
  "/header-labels":
    '<figure id="d1"><div class="hdr"><span>Roadmaps</span></div></figure>',
  "/role-labels":
    '<figure id="d1"><div role="navigation"><span>Home</span></div></figure>',
  "/wide": '<figure id="d1" style="min-width:800px">Timeline</figure>',
  "/inert-choice":
    '<figure id="d1"><div class="opt"><span class="rad on"></span>Platform</div></figure>',
  "/label-choice":
    '<figure id="d1"><label class="opt"><span class="rad"></span>Mobile app</label></figure>',
  "/text-input-choice":
    '<figure id="d1"><label><input type="text"><span class="rad"></span>Mobile app</label></figure>',
  "/for-choice":
    '<figure id="d1"><input id="fern" type="radio"><label for="fern"><span class="rad"></span>Mobile app</label></figure>',
  "/duplicate-ids":
    '<figure id="d1"><label for="email">Email</label><input id="email"></figure><figure id="d2"><label for="email">Email</label><input id="email"></figure>',
  "/figure-id-reused":
    '<figure id="d1"><a href="#d1">Home</a><span id="d2">Settings</span></figure><figure id="d2">Roadmap detail</figure>',
  "/script-error":
    '<figure id="d1"><div id="host"></div><script>document.getElementById("hosts").append("A")</script></figure>',
  "/native-choice":
    '<figure id="d1"><button type="button" role="radio" aria-checked="true" class="opt"><span class="rad on"></span>Platform</button><label><input type="checkbox"><span class="chk"></span>Mobile app</label><span aria-hidden="true" class="rad on"></span>Data and analytics</figure>',
}

test("prototype page checks exercise rendered browser fixtures", async (t) => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "ux-prototype-check-"))
  const server = createServer((req, res) => {
    const body = fixtures[req.url]
    res.writeHead(body ? 200 : 404, { "Content-Type": "text/html" })
    res.end(
      body ? `<!doctype html><html lang="en"><body>${body}</body></html>` : "",
    )
  })
  try {
    server.listen(0, "127.0.0.1")
    await once(server, "listening")
    const { port } = server.address()
    const check = (fixture) =>
      run(process.execPath, [
        checker,
        `http://127.0.0.1:${port}/${fixture}`,
        path.join(scratch, fixture),
      ])

    await t.test(
      "a page whose script throws as it opens is refused",
      async () => {
        await assert.rejects(
          () => check("script-error"),
          (error) =>
            error.code === 1 && /script threw as it opened/.test(error.stderr),
        )
      },
    )

    await t.test("native navigation passes and captures a design", async () => {
      const { stdout } = await check("links")
      assert.match(stdout, /1 designs captured/)
      const screenshot = await readFile(path.join(scratch, "links/d1.png"))
      assert.equal(screenshot.subarray(1, 4).toString(), "PNG")
    })

    await t.test(
      "label-only phone navigation is refused beside working desktop links",
      async () => {
        await assert.rejects(
          () => check("labels"),
          (error) =>
            error.code === 1 &&
            /navigation without native controls.*d1/.test(error.stderr),
        )
      },
    )

    await t.test("choice marks inside native controls pass", async () => {
      const { stdout } = await check("native-choice")
      assert.match(stdout, /1 designs captured/)
    })

    await t.test(
      "a label tied to a radio by its for attribute passes",
      async () => {
        const { stdout } = await check("for-choice")
        assert.match(stdout, /1 designs captured/)
      },
    )

    for (const fixture of [
      "inert-choice",
      "label-choice",
      "text-input-choice",
    ]) {
      await t.test(`${fixture} is refused`, async () => {
        await assert.rejects(
          () => check(fixture),
          (error) =>
            error.code === 1 &&
            /choice marks outside a native control in d1/.test(error.stderr),
        )
      })
    }

    await t.test("an id repeated across designs is refused", async () => {
      await assert.rejects(
        () => check("duplicate-ids"),
        (error) =>
          error.code === 1 &&
          /duplicate element ids: email in d1, d2/.test(error.stderr),
      )
    })

    await t.test(
      "a fragment id that reuses a design's id is refused",
      async () => {
        await assert.rejects(
          () => check("figure-id-reused"),
          (error) =>
            error.code === 1 &&
            /duplicate element ids: d2 in d1, d2/.test(error.stderr),
        )
      },
    )

    await t.test("mobile page overflow is still refused", async () => {
      await assert.rejects(
        () => check("wide"),
        (error) =>
          error.code === 1 && /page scrolls sideways/.test(error.stderr),
      )
    })

    for (const fixture of ["header-labels", "role-labels"]) {
      await t.test(`${fixture} without a nav element is refused`, async () => {
        await assert.rejects(
          () => check(fixture),
          (error) =>
            error.code === 1 &&
            /navigation without native controls.*d1/.test(error.stderr),
        )
      })
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await rm(scratch, { recursive: true, force: true })
  }
})
