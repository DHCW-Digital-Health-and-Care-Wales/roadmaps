import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"

import type {
  ClientConfigError,
  GoogleOAuth2,
  TokenClient,
  TokenClientConfig,
  TokenResponse,
} from "./gis-types"
import {
  createGoogleAuthClient,
  EXPIRY_SKEW_MS,
  type GoogleAuthClient,
  type GoogleAuthClientOptions,
} from "./google-auth-client"

const CLIENT_ID = "test-client.apps.googleusercontent.com"
const SCOPE = "https://www.googleapis.com/auth/spreadsheets"
const TOKEN = "ya29.secret-token"
const NOW = new Date("2026-11-10T12:00:00Z").getTime()
const LIFETIME_S = 3599
const EXPIRES_AT = NOW + LIFETIME_S * 1000 - EXPIRY_SKEW_MS

/** What Google may pass to `callback`: any subset of fields, of any type. */
type TokenResponseInput = Partial<Record<keyof TokenResponse, unknown>>

/** A controllable stand-in for `google.accounts.oauth2`. */
function createFakeGis() {
  const tokenClientConfigs: TokenClientConfig[] = []
  const requestAccessToken = vi.fn<TokenClient["requestAccessToken"]>()
  const oauth2 = {
    initTokenClient: vi.fn((config: TokenClientConfig) => {
      tokenClientConfigs.push(config)
      return { requestAccessToken }
    }),
    hasGrantedAllScopes: vi.fn<GoogleOAuth2["hasGrantedAllScopes"]>(() => true),
    revoke: vi.fn<GoogleOAuth2["revoke"]>(),
  } satisfies GoogleOAuth2

  /** Google's side of one attempt's token client; the latest by default. */
  function attempt(index = tokenClientConfigs.length - 1) {
    const config = tokenClientConfigs[index]
    if (!config) throw new Error(`No token client #${String(index)}`)
    const { callback, error_callback } = config

    /** Google calls `callback` with a (possibly partial) token response. */
    function respond(response: TokenResponseInput) {
      callback(response as TokenResponse)
    }
    return {
      respond,
      grant(lifetimeSeconds: unknown = LIFETIME_S) {
        respond({
          access_token: TOKEN,
          expires_in: lifetimeSeconds,
          scope: SCOPE,
        })
      },
      /** Google calls `error_callback` (popup problems). */
      failPopup(type: ClientConfigError["type"]) {
        error_callback?.(Object.assign(new Error(type), { type }))
      },
    }
  }

  return {
    oauth2,
    requestAccessToken,
    attempt,
    respond: (response: TokenResponseInput) => {
      attempt().respond(response)
    },
    grant: (lifetimeSeconds?: unknown) => {
      attempt().grant(lifetimeSeconds)
    },
    failPopup: (type: ClientConfigError["type"]) => {
      attempt().failPopup(type)
    },
  }
}

let clients: GoogleAuthClient[] = []

function createClient(options: Partial<GoogleAuthClientOptions> = {}) {
  const gis = createFakeGis()
  const onDisconnect = vi.fn()
  const client = createGoogleAuthClient({
    clientId: CLIENT_ID,
    scopes: [SCOPE],
    loadScript: () => Promise.resolve(gis.oauth2),
    onDisconnect,
    ...options,
  })
  clients.push(client)
  return { client, gis, onDisconnect }
}

async function createReadyClient(
  options: Partial<GoogleAuthClientOptions> = {},
) {
  const setup = createClient(options)
  await vi.waitFor(() => {
    expect(setup.client.getSnapshot()).toEqual({ status: "ready" })
  })
  // `waitFor` advances fake time while polling; pin the clock for expiry maths.
  vi.setSystemTime(NOW)
  return setup
}

async function createConnectedClient() {
  const setup = await createReadyClient()
  setup.client.connect()
  setup.gis.grant()
  expect(setup.client.getSnapshot()).toEqual({
    status: "connected",
    expiresAt: EXPIRES_AT,
  })
  return setup
}

/** Records every state the client publishes. */
function recordStates(client: GoogleAuthClient): AuthState[] {
  const states: AuthState[] = []
  client.subscribe(() => states.push(client.getSnapshot()))
  return states
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW })
})

afterEach(() => {
  for (const client of clients) client.dispose()
  clients = []
  vi.useRealTimers()
})

describe("createGoogleAuthClient", () => {
  describe("initialisation", () => {
    it("loads GIS up front without starting an attempt", async () => {
      const { client, gis } = createClient()

      expect(client.getSnapshot()).toEqual({ status: "initializing" })
      await vi.waitFor(() => {
        expect(client.getSnapshot()).toEqual({ status: "ready" })
      })
      expect(gis.oauth2.initTokenClient).not.toHaveBeenCalled()
      expect(gis.requestAccessToken).not.toHaveBeenCalled()
    })

    it("moves to error when GIS fails to load, and connect() retries the load", async () => {
      const gis = createFakeGis()
      const loadScript = vi
        .fn<() => Promise<GoogleOAuth2>>()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(gis.oauth2)
      const { client } = createClient({ loadScript })

      await vi.waitFor(() => {
        expect(client.getSnapshot()).toEqual({
          status: "error",
          error: "script-load-failed",
        })
      })

      client.connect()

      expect(client.getSnapshot()).toEqual({ status: "initializing" })
      await vi.waitFor(() => {
        expect(client.getSnapshot()).toEqual({ status: "ready" })
      })
      expect(loadScript).toHaveBeenCalledTimes(2)
      // The retry click is no longer usable for a popup; the next one is.
      expect(gis.requestAccessToken).not.toHaveBeenCalled()
    })
  })

  describe("connect", () => {
    it("opens the consent popup synchronously, with Google's default prompt", async () => {
      const { client, gis } = await createReadyClient()

      client.connect()

      expect(gis.oauth2.initTokenClient).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ client_id: CLIENT_ID, scope: SCOPE }),
      )
      expect(gis.requestAccessToken).toHaveBeenCalledExactlyOnceWith(undefined)
      expect(client.getSnapshot()).toEqual({ status: "connecting" })
    })

    it("requests every scope, space-delimited", async () => {
      const { client, gis } = await createReadyClient({
        scopes: [SCOPE, "openid"],
      })

      client.connect()

      expect(gis.oauth2.initTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({ scope: `${SCOPE} openid` }),
      )
    })

    it("does nothing while initializing or connecting", async () => {
      const { client, gis } = createClient()
      client.connect()
      expect(client.getSnapshot()).toEqual({ status: "initializing" })
      await vi.waitFor(() => {
        expect(client.getSnapshot().status).toBe("ready")
      })

      client.connect()
      client.connect()
      expect(gis.requestAccessToken).toHaveBeenCalledTimes(1)
      expect(client.getSnapshot().status).toBe("connecting")
    })

    it("connects when all scopes are granted, keeping the token out of the state", async () => {
      const { client, gis } = await createReadyClient()

      client.connect()
      gis.grant()

      const state = client.getSnapshot()
      expect(state).toEqual({ status: "connected", expiresAt: EXPIRES_AT })
      expect(JSON.stringify(state)).not.toContain(TOKEN)
      expect(client.getAccessToken()).toBe(TOKEN)
      expect(gis.oauth2.hasGrantedAllScopes).toHaveBeenCalledWith(
        expect.objectContaining({ access_token: TOKEN }),
        SCOPE,
      )
    })

    it("accepts expires_in as a string, as @types/google.accounts declares it", async () => {
      const { client, gis } = await createReadyClient()

      client.connect()
      gis.respond({ access_token: TOKEN, expires_in: String(LIFETIME_S) })

      expect(client.getSnapshot()).toEqual({
        status: "connected",
        expiresAt: EXPIRES_AT,
      })
    })

    it("fails with scope-not-granted, then asks for consent on the next attempt", async () => {
      const { client, gis } = await createReadyClient()
      gis.oauth2.hasGrantedAllScopes.mockReturnValueOnce(false)

      client.connect()
      gis.grant()

      expect(client.getSnapshot()).toEqual({
        status: "error",
        error: "scope-not-granted",
      })
      expect(client.getAccessToken()).toBeNull()

      client.connect()

      expect(gis.requestAccessToken).toHaveBeenLastCalledWith({
        prompt: "consent",
      })
    })

    it.each([
      ["access_denied", "access-denied"],
      ["invalid_scope", "unknown"],
      ["server_error", "unknown"],
    ] as const)("maps the OAuth error %s to %s", async (oauthError, code) => {
      const { client, gis } = await createReadyClient()

      client.connect()
      gis.respond({ error: oauthError, error_description: "details" })

      expect(client.getSnapshot()).toEqual({ status: "error", error: code })
      expect(client.getAccessToken()).toBeNull()
    })

    it.each([
      ["no access token", { expires_in: LIFETIME_S }],
      ["an empty access token", { access_token: "", expires_in: LIFETIME_S }],
      ["no lifetime", { access_token: TOKEN }],
      ["a non-numeric lifetime", { access_token: TOKEN, expires_in: "soon" }],
    ])("fails with unknown for a response with %s", async (_, response) => {
      const { client, gis } = await createReadyClient()

      client.connect()
      gis.respond(response)

      expect(client.getSnapshot()).toEqual({
        status: "error",
        error: "unknown",
      })
      expect(client.getAccessToken()).toBeNull()
    })

    it("returns to ready with a note when the popup is closed or blocked", async () => {
      const { client, gis } = await createReadyClient()

      client.connect()
      gis.failPopup("popup_closed")
      expect(client.getSnapshot()).toEqual({
        status: "ready",
        lastError: "popup-closed",
      })

      client.connect()
      gis.failPopup("popup_failed_to_open")
      expect(client.getSnapshot()).toEqual({
        status: "ready",
        lastError: "popup-blocked",
      })
    })

    it("fails with unknown on any other popup error", async () => {
      const { client, gis } = await createReadyClient()

      client.connect()
      gis.failPopup("unknown")

      expect(client.getSnapshot()).toEqual({
        status: "error",
        error: "unknown",
      })
    })

    it.each(["initTokenClient", "requestAccessToken"] as const)(
      "fails with unknown if GIS throws from %s",
      async (method) => {
        const { client, gis } = await createReadyClient()
        const throwing = () => {
          throw new Error("boom")
        }
        if (method === "initTokenClient") {
          gis.oauth2.initTokenClient.mockImplementationOnce(throwing)
        } else {
          gis.requestAccessToken.mockImplementationOnce(throwing)
        }

        client.connect()

        expect(client.getSnapshot()).toEqual({
          status: "error",
          error: "unknown",
        })
      },
    )

    it("can retry after an error", async () => {
      const { client, gis } = await createReadyClient()
      client.connect()
      gis.respond({ error: "access_denied" })

      client.connect()
      gis.grant()

      expect(client.getSnapshot().status).toBe("connected")
    })

    it("ignores token responses and popup errors when no attempt is in progress", async () => {
      const { client, gis } = await createReadyClient()
      client.connect()
      gis.failPopup("popup_closed")
      const afterCancel = client.getSnapshot()

      gis.grant()
      gis.failPopup("unknown")

      expect(client.getSnapshot()).toBe(afterCancel)
      expect(client.getAccessToken()).toBeNull()
    })

    it("ignores callbacks from an abandoned attempt while a newer one is in progress", async () => {
      const { client, gis } = await createReadyClient()
      client.connect()
      client.disconnect()
      client.connect()
      const abandoned = gis.attempt(0)

      abandoned.grant()
      abandoned.failPopup("popup_closed")

      expect(client.getSnapshot()).toEqual({ status: "connecting" })
      expect(client.getAccessToken()).toBeNull()

      gis.attempt(1).grant()
      expect(client.getSnapshot().status).toBe("connected")
    })

    it("settles each attempt once", async () => {
      const { client, gis } = await createConnectedClient()
      const connected = client.getSnapshot()

      gis.failPopup("popup_closed")
      gis.respond({ error: "access_denied" })

      expect(client.getSnapshot()).toBe(connected)
      expect(client.getAccessToken()).toBe(TOKEN)
    })

    it("fails with unknown for a grant that is too short to use", async () => {
      const { client, gis } = await createReadyClient()

      client.connect()
      gis.grant(EXPIRY_SKEW_MS / 1000)

      expect(client.getSnapshot()).toEqual({
        status: "error",
        error: "unknown",
      })
      expect(client.getAccessToken()).toBeNull()
    })

    it("uses whatever lifetime remains beyond the skew", async () => {
      const { client, gis } = await createReadyClient()

      client.connect()
      gis.grant(EXPIRY_SKEW_MS / 1000 + 1)

      expect(client.getSnapshot()).toEqual({
        status: "connected",
        expiresAt: NOW + 1000,
      })
      vi.advanceTimersByTime(1000)
      expect(client.getSnapshot()).toEqual({ status: "expired" })
    })
  })

  describe("expiry", () => {
    it("expires when the token's lifetime (less the skew) has passed", async () => {
      const { client } = await createConnectedClient()
      const states = recordStates(client)

      vi.advanceTimersByTime(EXPIRES_AT - NOW - 1)
      expect(client.getAccessToken()).toBe(TOKEN)
      expect(states).toEqual([])

      vi.advanceTimersByTime(1)
      expect(states).toEqual([{ status: "expired" }])
      expect(client.getAccessToken()).toBeNull()
    })

    it("stops handing out the token once expired, even if the timer is late", async () => {
      const { client } = await createConnectedClient()

      // The clock jumps (e.g. the device slept) without the timer having fired.
      vi.setSystemTime(EXPIRES_AT)

      expect(client.getAccessToken()).toBeNull()
    })

    it("expires when the data source reports the token as unauthenticated", async () => {
      const { client } = await createConnectedClient()

      client.reportUnauthenticated()

      expect(client.getSnapshot()).toEqual({ status: "expired" })
      expect(client.getAccessToken()).toBeNull()
    })

    it("ignores reportUnauthenticated when not connected", async () => {
      const { client, gis } = await createReadyClient()
      const ready = client.getSnapshot()
      client.reportUnauthenticated()
      expect(client.getSnapshot()).toBe(ready)

      client.connect()
      client.reportUnauthenticated()
      expect(client.getSnapshot()).toEqual({ status: "connecting" })
      gis.grant()
      expect(client.getSnapshot().status).toBe("connected")
    })

    it("reconnects with a quiet prompt and keeps the expired state if the popup is closed", async () => {
      const { client, gis } = await createConnectedClient()
      client.reportUnauthenticated()

      client.connect()
      expect(gis.requestAccessToken).toHaveBeenLastCalledWith({ prompt: "" })
      gis.failPopup("popup_closed")
      expect(client.getSnapshot()).toEqual({
        status: "expired",
        lastError: "popup-closed",
      })

      client.connect()
      gis.grant()
      expect(client.getSnapshot().status).toBe("connected")
      expect(client.getAccessToken()).toBe(TOKEN)
    })
  })

  describe("renewal", () => {
    const RENEWED_TOKEN = "ya29.renewed-token"
    /** Ten minutes in, the renewed session's app expiry. */
    const RENEWED_AT = NOW + 10 * 60_000
    const RENEWED_EXPIRES_AT = RENEWED_AT + LIFETIME_S * 1000 - EXPIRY_SKEW_MS

    function grantRenewal(gis: ReturnType<typeof createFakeGis>) {
      gis.respond({
        access_token: RENEWED_TOKEN,
        expires_in: LIFETIME_S,
        scope: SCOPE,
      })
    }

    it("renews a connected session quietly, without passing through connecting", async () => {
      const { client, gis } = await createConnectedClient()
      const states = recordStates(client)
      vi.advanceTimersByTime(RENEWED_AT - NOW)

      client.connect()
      expect(gis.oauth2.initTokenClient).toHaveBeenCalledTimes(2)
      expect(gis.requestAccessToken).toHaveBeenLastCalledWith({ prompt: "" })
      // The session carries on, token and all, while Google answers.
      expect(states).toEqual([])
      expect(client.getAccessToken()).toBe(TOKEN)

      grantRenewal(gis)
      expect(states).toEqual([
        { status: "connected", expiresAt: RENEWED_EXPIRES_AT },
      ])
      expect(client.getAccessToken()).toBe(RENEWED_TOKEN)
      expect(gis.oauth2.revoke).not.toHaveBeenCalled()
    })

    it("moves the expiry timer to the renewed session's expiry", async () => {
      const { client, gis } = await createConnectedClient()
      vi.advanceTimersByTime(RENEWED_AT - NOW)
      client.connect()
      grantRenewal(gis)

      vi.advanceTimersByTime(EXPIRES_AT - RENEWED_AT)
      expect(client.getSnapshot().status).toBe("connected")

      vi.advanceTimersByTime(RENEWED_EXPIRES_AT - EXPIRES_AT)
      expect(client.getSnapshot()).toEqual({ status: "expired" })
    })

    it.each([
      ["popup_closed", "popup-closed"],
      ["popup_failed_to_open", "popup-blocked"],
      ["unknown", "unknown"],
    ] as const)(
      "keeps the session when the renewal popup reports %s",
      async (type, lastError) => {
        const { client, gis } = await createConnectedClient()

        client.connect()
        gis.failPopup(type)

        expect(client.getSnapshot()).toEqual({
          status: "connected",
          expiresAt: EXPIRES_AT,
          lastError,
        })
        expect(client.getAccessToken()).toBe(TOKEN)
      },
    )

    it.each<[string, TokenResponseInput, string]>([
      ["refused", { error: "access_denied" }, "access-denied"],
      [
        "granted without the scope",
        { access_token: RENEWED_TOKEN, expires_in: LIFETIME_S, scope: "" },
        "scope-not-granted",
      ],
      ["unreadable", { access_token: RENEWED_TOKEN }, "unknown"],
    ])(
      "keeps the session when the renewal is %s",
      async (_name, response, lastError) => {
        const { client, gis } = await createConnectedClient()
        gis.oauth2.hasGrantedAllScopes.mockImplementation(
          (granted) => granted.scope === SCOPE,
        )

        client.connect()
        gis.respond(response)

        expect(client.getSnapshot()).toEqual({
          status: "connected",
          expiresAt: EXPIRES_AT,
          lastError,
        })
        expect(client.getAccessToken()).toBe(TOKEN)
        expect(gis.oauth2.revoke).not.toHaveBeenCalled()
      },
    )

    it("keeps the session if GIS throws when renewing", async () => {
      const { client, gis } = await createConnectedClient()
      gis.requestAccessToken.mockImplementationOnce(() => {
        throw new Error("GIS exploded")
      })

      client.connect()

      expect(client.getSnapshot()).toEqual({
        status: "connected",
        expiresAt: EXPIRES_AT,
        lastError: "unknown",
      })
    })

    it("still expires on time after a failed renewal", async () => {
      const { client, gis } = await createConnectedClient()
      client.connect()
      gis.failPopup("popup_closed")

      vi.advanceTimersByTime(EXPIRES_AT - NOW)

      expect(client.getSnapshot()).toEqual({ status: "expired" })
      expect(client.getAccessToken()).toBeNull()
    })

    it("clears an earlier renewal's error when a renewal succeeds", async () => {
      const { client, gis } = await createConnectedClient()
      client.connect()
      gis.failPopup("popup_failed_to_open")
      vi.advanceTimersByTime(RENEWED_AT - NOW)

      client.connect()
      expect(gis.requestAccessToken).toHaveBeenLastCalledWith({ prompt: "" })
      grantRenewal(gis)

      expect(client.getSnapshot()).toEqual({
        status: "connected",
        expiresAt: RENEWED_EXPIRES_AT,
      })
    })

    it("ignores connect() while a renewal is in progress", async () => {
      const { client, gis } = await createConnectedClient()

      client.connect()
      client.connect()

      expect(gis.requestAccessToken).toHaveBeenCalledTimes(2)
    })

    it("abandons a renewal still in progress when the session expires", async () => {
      const { client, gis } = await createConnectedClient()
      client.connect()

      vi.advanceTimersByTime(EXPIRES_AT - NOW)
      grantRenewal(gis)

      expect(client.getSnapshot()).toEqual({ status: "expired" })
      expect(client.getAccessToken()).toBeNull()
    })

    it("abandons a renewal still in progress on disconnect", async () => {
      const { client, gis } = await createConnectedClient()
      client.connect()

      client.disconnect()
      grantRenewal(gis)

      expect(client.getSnapshot()).toEqual({ status: "ready" })
      expect(client.getAccessToken()).toBeNull()
      expect(gis.oauth2.revoke).toHaveBeenCalledExactlyOnceWith(
        TOKEN,
        expect.any(Function),
      )
    })
  })

  describe("returning to the tab", () => {
    function returnToTab() {
      document.dispatchEvent(new Event("visibilitychange"))
    }

    it("expires at once when the clock passed expiry while the timer was held back", async () => {
      const { client } = await createConnectedClient()

      // The device slept: the clock moved on, the timer did not fire.
      vi.setSystemTime(EXPIRES_AT)
      returnToTab()

      expect(client.getSnapshot()).toEqual({ status: "expired" })
    })

    it("keeps a session that has time left", async () => {
      const { client } = await createConnectedClient()
      const connected = client.getSnapshot()

      vi.setSystemTime(EXPIRES_AT - 1)
      returnToTab()

      expect(client.getSnapshot()).toBe(connected)
    })

    it("stops listening once disposed", async () => {
      const { client } = await createConnectedClient()
      const remove = vi.spyOn(document, "removeEventListener")

      client.dispose()

      expect(remove).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      )
      remove.mockRestore()
    })
  })

  describe("disconnect", () => {
    it("revokes the token, forgets it and returns to ready", async () => {
      const { client, gis, onDisconnect } = await createConnectedClient()

      client.disconnect()

      expect(gis.oauth2.revoke).toHaveBeenCalledExactlyOnceWith(
        TOKEN,
        expect.any(Function),
      )
      expect(client.getSnapshot()).toEqual({ status: "ready" })
      expect(client.getAccessToken()).toBeNull()
      expect(onDisconnect).toHaveBeenCalledOnce()
    })

    it("cancels the expiry timer", async () => {
      const { client } = await createConnectedClient()
      client.disconnect()
      const states = recordStates(client)

      vi.runAllTimers()

      expect(states).toEqual([])
    })

    it("ends an expired session without revoking the forgotten token", async () => {
      const { client, gis, onDisconnect } = await createConnectedClient()
      client.reportUnauthenticated()

      client.disconnect()

      expect(client.getSnapshot()).toEqual({ status: "ready" })
      expect(gis.oauth2.revoke).not.toHaveBeenCalled()
      expect(onDisconnect).toHaveBeenCalledOnce()
    })

    it("abandons an attempt in progress and drops its late token", async () => {
      const { client, gis } = await createReadyClient()
      client.connect()

      client.disconnect()
      gis.grant()

      expect(client.getSnapshot()).toEqual({ status: "ready" })
      expect(client.getAccessToken()).toBeNull()
    })

    it("does nothing when there is no session", async () => {
      const { client, gis, onDisconnect } = await createReadyClient()
      const ready = client.getSnapshot()

      client.disconnect()

      expect(client.getSnapshot()).toBe(ready)
      expect(gis.oauth2.revoke).not.toHaveBeenCalled()
      expect(onDisconnect).not.toHaveBeenCalled()
    })
  })

  describe("subscriptions", () => {
    it("publishes each transition once, with a stable snapshot in between", async () => {
      const { client, gis } = await createReadyClient()
      const states = recordStates(client)

      client.connect()
      expect(client.getSnapshot()).toBe(client.getSnapshot())
      gis.grant()
      client.disconnect()

      expect(states).toEqual([
        { status: "connecting" },
        { status: "connected", expiresAt: EXPIRES_AT },
        { status: "ready" },
      ])
    })

    it("stops notifying after unsubscribe", async () => {
      const { client } = await createReadyClient()
      const listener = vi.fn()
      const unsubscribe = client.subscribe(listener)

      unsubscribe()
      client.connect()

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe("dispose", () => {
    it("ignores a script load that finishes afterwards", async () => {
      const gis = createFakeGis()
      let finishLoading: (oauth2: GoogleOAuth2) => void = () => undefined
      const { client } = createClient({
        loadScript: () =>
          new Promise((resolve) => {
            finishLoading = resolve
          }),
      })

      client.dispose()
      finishLoading(gis.oauth2)
      await vi.runAllTimersAsync()

      expect(client.getSnapshot()).toEqual({ status: "initializing" })
    })

    it("forgets the token, stops the timer and ignores everything afterwards", async () => {
      const { client, gis, onDisconnect } = await createConnectedClient()
      const states = recordStates(client)

      client.dispose()
      vi.runAllTimers()
      client.reportUnauthenticated()
      client.disconnect()
      client.connect()

      expect(states).toEqual([])
      expect(client.getAccessToken()).toBeNull()
      expect(gis.oauth2.revoke).not.toHaveBeenCalled()
      expect(onDisconnect).not.toHaveBeenCalled()
      expect(gis.requestAccessToken).toHaveBeenCalledTimes(1)
    })

    it("ignores Google callbacks that arrive afterwards", async () => {
      const { client, gis } = await createReadyClient()
      client.connect()
      const states = recordStates(client)

      client.dispose()
      gis.grant()
      gis.failPopup("popup_closed")

      expect(states).toEqual([])
      expect(client.getAccessToken()).toBeNull()
    })
  })
})
