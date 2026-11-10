import type { GoogleOAuth2 } from "./gis-types"

export const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client"

const DEFAULT_TIMEOUT_MS = 15_000

let pending: Promise<GoogleOAuth2> | undefined

/**
 * Loads the Google Identity Services script once and resolves with
 * `google.accounts.oauth2`. Callers share one promise. A failure clears it, so a later
 * call tries again with a fresh script element.
 */
export function loadGisScript(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<GoogleOAuth2> {
  pending ??= injectScript(timeoutMs).catch((error: unknown) => {
    pending = undefined
    throw error
  })
  return pending
}

function injectScript(timeoutMs: number): Promise<GoogleOAuth2> {
  const loaded = findOAuth2()
  if (loaded) return Promise.resolve(loaded)

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    const listeners = new AbortController()
    const timer = setTimeout(() => {
      fail(`timed out after ${String(timeoutMs)} ms`)
    }, timeoutMs)

    function settle(): void {
      clearTimeout(timer)
      listeners.abort()
    }
    function fail(reason: string): void {
      settle()
      script.remove()
      reject(new Error(`Google Identity Services script ${reason}`))
    }

    script.addEventListener(
      "load",
      () => {
        const oauth2 = findOAuth2()
        if (!oauth2) {
          fail("loaded without google.accounts.oauth2")
          return
        }
        settle()
        resolve(oauth2)
      },
      { signal: listeners.signal },
    )
    script.addEventListener(
      "error",
      () => {
        fail("failed to load")
      },
      { signal: listeners.signal },
    )

    script.src = GIS_SCRIPT_URL
    script.async = true
    document.head.append(script)
  })
}

function findOAuth2(): GoogleOAuth2 | undefined {
  // The global only exists once the script has run, whatever the ambient types claim.
  const { google } = globalThis as {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } }
  }
  return google?.accounts?.oauth2
}
