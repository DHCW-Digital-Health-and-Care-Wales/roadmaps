import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { GoogleOAuth2 } from "./gis-types"

type LoaderModule = typeof import("./load-gis-script")

const fakeOAuth2: GoogleOAuth2 = {
  initTokenClient: vi.fn(),
  hasGrantedAllScopes: vi.fn(),
  revoke: vi.fn(),
}

let loader: LoaderModule

/** The memo is module state, so each test loads a fresh copy of the module. */
beforeEach(async () => {
  vi.resetModules()
  loader = await import("./load-gis-script")
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  for (const script of gisScripts()) script.remove()
})

function gisScripts(): HTMLScriptElement[] {
  return [...document.querySelectorAll<HTMLScriptElement>("script")].filter(
    (script) => script.src === loader.GIS_SCRIPT_URL,
  )
}

function onlyGisScript(): HTMLScriptElement {
  const scripts = gisScripts()
  expect(scripts).toHaveLength(1)
  const [script] = scripts
  if (!script) throw new Error("GIS script not injected")
  return script
}

/** Simulates the browser running the GIS script. */
function runGisScript(script: HTMLScriptElement): void {
  vi.stubGlobal("google", { accounts: { oauth2: fakeOAuth2 } })
  script.dispatchEvent(new Event("load"))
}

describe("loadGisScript", () => {
  it("injects one async GIS script and resolves with google.accounts.oauth2", async () => {
    const loading = loader.loadGisScript()

    const script = onlyGisScript()
    expect(script.async).toBe(true)
    expect(script.parentElement).toBe(document.head)

    runGisScript(script)

    await expect(loading).resolves.toBe(fakeOAuth2)
  })

  it("resolves without injecting a script when GIS is already loaded", async () => {
    vi.stubGlobal("google", { accounts: { oauth2: fakeOAuth2 } })

    await expect(loader.loadGisScript()).resolves.toBe(fakeOAuth2)
    expect(gisScripts()).toHaveLength(0)
  })

  it("shares one load between callers", async () => {
    const first = loader.loadGisScript()
    const second = loader.loadGisScript()

    expect(second).toBe(first)
    runGisScript(onlyGisScript())
    await expect(first).resolves.toBe(fakeOAuth2)
    expect(loader.loadGisScript()).toBe(first)
  })

  it("rejects and removes the script when it fails to load", async () => {
    const loading = loader.loadGisScript()

    onlyGisScript().dispatchEvent(new Event("error"))

    await expect(loading).rejects.toThrow(/failed to load/)
    expect(gisScripts()).toHaveLength(0)
  })

  it("rejects when the script loads without the oauth2 API", async () => {
    const loading = loader.loadGisScript()

    onlyGisScript().dispatchEvent(new Event("load"))

    await expect(loading).rejects.toThrow(/without google\.accounts\.oauth2/)
    expect(gisScripts()).toHaveLength(0)
  })

  it("rejects and removes the script after the timeout", async () => {
    vi.useFakeTimers()
    const loading = loader.loadGisScript(5_000)
    const settled = vi.fn()
    loading.catch(settled)

    await vi.advanceTimersByTimeAsync(4_999)
    expect(settled).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await expect(loading).rejects.toThrow(/timed out after 5000 ms/)
    expect(gisScripts()).toHaveLength(0)
  })

  it("ignores a load that arrives after the timeout", async () => {
    vi.useFakeTimers()
    const loading = loader.loadGisScript(1_000)
    const script = onlyGisScript()
    loading.catch(() => undefined)

    await vi.advanceTimersByTimeAsync(1_000)
    runGisScript(script)

    await expect(loading).rejects.toThrow(/timed out/)
  })

  it("retries with a fresh script after a failure", async () => {
    const failed = loader.loadGisScript()
    const firstScript = onlyGisScript()
    firstScript.dispatchEvent(new Event("error"))
    await expect(failed).rejects.toThrow()

    const retry = loader.loadGisScript()

    expect(retry).not.toBe(failed)
    const secondScript = onlyGisScript()
    expect(secondScript).not.toBe(firstScript)
    runGisScript(secondScript)
    await expect(retry).resolves.toBe(fakeOAuth2)
  })
})
