/// <reference types="google.accounts" />
import type { Page } from "@playwright/test"

import { appConfig, SHEETS_SCOPE } from "./app-config"

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client"

/** Google's usual access token lifetime, in seconds. */
const TOKEN_LIFETIME_S = 3599

/** The app ends a session this long before Google's expiry (ADR-003), in seconds. */
const EXPIRY_MARGIN_S = 60

/** How long before a session ends its warning opens, in milliseconds. */
export const SESSION_WARNING_MS = 2 * 60 * 1000

/**
 * How long a session lasts from the grant that starts it, in milliseconds: the grant's
 * `expiresIn` seconds, by default the fake's own, less the app's margin. Move the clock
 * by it to end a session, and by it less `SESSION_WARNING_MS` to open the warning.
 */
export function sessionMs(expiresIn = TOKEN_LIFETIME_S): number {
  return (expiresIn - EXPIRY_MARGIN_S) * 1000
}

/** How the fake Google answers one `requestAccessToken()` call. */
export type TokenOutcome =
  /** The user consents. `scope` defaults to the scopes the app asked for. */
  | { type: "grant"; expiresIn?: number; scope?: string }
  /** The user declines on the consent screen. */
  | { type: "access-denied" }
  /** The user closes Google's popup. */
  | { type: "popup-closed" }
  /** The browser blocks Google's popup. */
  | { type: "popup-blocked" }

/** One `requestAccessToken()` call, as Google sees it. */
export interface TokenRequest {
  clientId: string
  scope: string
  /** The effective `prompt`: the call's override, else the token client's. */
  prompt: string | undefined
}

/** Sent from the page for each `requestAccessToken()` call. */
interface PageTokenRequest extends TokenRequest {
  /** Whether the call had transient user activation, which Google's popup needs. */
  userGesture: boolean
}

/** Answer for the page: a token response for `callback`, or a popup error type. */
type PageTokenReply =
  | { response: Record<string, unknown> }
  | { popupError: google.accounts.oauth2.ClientConfigError["type"] }

const BINDINGS = {
  requestAccessToken: "__fakeGisRequestAccessToken",
  revoke: "__fakeGisRevoke",
} as const

/**
 * The fake GIS script: defines `google.accounts.oauth2` with exactly the members the app
 * uses, and hands each call to the test through page bindings. It is serialized into the
 * page, so it must not reference anything outside itself (types are erased).
 */
function fakeGisScript(bindings: typeof BINDINGS): void {
  const host = window as unknown as Record<
    string,
    (...args: unknown[]) => Promise<unknown>
  >
  const requestAccessToken = host[bindings.requestAccessToken] as (
    request: PageTokenRequest,
  ) => Promise<PageTokenReply>
  const revoke = host[bindings.revoke] as (token: string) => Promise<void>

  const oauth2 = {
    initTokenClient(config) {
      if (!config.client_id || typeof config.callback !== "function") {
        throw new Error("initTokenClient: client_id and callback are required")
      }
      return {
        requestAccessToken(overrides) {
          const request: PageTokenRequest = {
            clientId: config.client_id,
            scope: config.scope,
            prompt: overrides?.prompt ?? config.prompt,
            // Read now: like a real popup, it must open inside the user's click.
            userGesture: navigator.userActivation.isActive,
          }
          // Google answers asynchronously, once the popup is done.
          void requestAccessToken(request).then((reply) => {
            if ("popupError" in reply) {
              config.error_callback?.(
                Object.assign(new Error(reply.popupError), {
                  type: reply.popupError,
                }),
              )
            } else {
              // The app treats the response as untrusted and parses it.
              config.callback(
                reply.response as unknown as google.accounts.oauth2.TokenResponse,
              )
            }
          })
        },
      }
    },
    hasGrantedAllScopes(response, firstScope, ...restScopes) {
      const granted = new Set(response.scope.split(" "))
      return [firstScope, ...restScopes].every((scope) => granted.has(scope))
    },
    revoke(accessToken, done) {
      void revoke(accessToken).then(done)
    },
  } satisfies Pick<
    typeof google.accounts.oauth2,
    "initTokenClient" | "hasGrantedAllScopes" | "revoke"
  >

  Object.assign(window, { google: { accounts: { oauth2 } } })
}

/**
 * Google Identity Services, faked: serves a fake `gsi/client` script and plays Google's
 * side of each consent attempt. Requests are granted unless queued otherwise.
 */
export class FakeGis {
  /** Every `requestAccessToken()` call, in order. */
  readonly tokenRequests: TokenRequest[] = []
  /** Tokens the app revoked, in order. */
  readonly revokedTokens: string[] = []
  /** Misuses of the API; the fixture fails the test if there are any. */
  readonly violations: string[] = []
  /** When false, the script fails to load (HTTP 503), like when Google is unreachable. */
  scriptAvailable = true

  readonly #outcomes: TokenOutcome[] = []
  readonly #issuedTokens: string[] = []

  /** Queues answers for the next token requests; once they run out, requests are granted. */
  respondWith(...outcomes: TokenOutcome[]): void {
    this.#outcomes.push(...outcomes)
  }

  /** The token of the latest grant. */
  get latestToken(): string | undefined {
    return this.#issuedTokens.at(-1)
  }

  /** Every token granted so far, in order. */
  get issuedTokens(): readonly string[] {
    return this.#issuedTokens
  }

  /** Whether Google would accept the token: this fake issued it and it was not revoked. */
  accepts(token: string): boolean {
    return (
      this.#issuedTokens.includes(token) && !this.revokedTokens.includes(token)
    )
  }

  async install(page: Page): Promise<void> {
    await page.exposeFunction(
      BINDINGS.requestAccessToken,
      (request: PageTokenRequest) => this.#answer(request),
    )
    await page.exposeFunction(BINDINGS.revoke, (token: string) => {
      if (!this.accepts(token)) {
        this.violations.push(`revoke() of a token not in use: ${token}`)
      }
      this.revokedTokens.push(token)
    })
    const script = `(${fakeGisScript.toString()})(${JSON.stringify(BINDINGS)})`
    await page.route(GIS_SCRIPT_URL, (route) =>
      route.fulfill(
        this.scriptAvailable
          ? { contentType: "text/javascript", body: script }
          : { status: 503 },
      ),
    )
  }

  #answer({ userGesture, ...request }: PageTokenRequest): PageTokenReply {
    this.tokenRequests.push(request)
    if (request.clientId !== appConfig.clientId) {
      this.violations.push(
        `initTokenClient() with client_id ${request.clientId}`,
      )
    }
    if (request.scope !== SHEETS_SCOPE) {
      this.violations.push(`initTokenClient() with scope "${request.scope}"`)
    }
    // `page.evaluate` runs with a user gesture, so it cannot exercise this check.
    if (!userGesture) {
      this.violations.push("requestAccessToken() outside a user gesture")
      return { popupError: "popup_failed_to_open" }
    }

    const outcome = this.#outcomes.shift() ?? { type: "grant" }
    switch (outcome.type) {
      case "grant": {
        const token = `e2e-token-${String(this.#issuedTokens.length + 1)}`
        this.#issuedTokens.push(token)
        return {
          response: {
            access_token: token,
            token_type: "Bearer",
            expires_in: outcome.expiresIn ?? TOKEN_LIFETIME_S,
            scope: outcome.scope ?? request.scope,
            prompt: request.prompt ?? "",
          },
        }
      }
      case "access-denied":
        return {
          response: {
            error: "access_denied",
            error_description: "The user denied access.",
          },
        }
      case "popup-closed":
        return { popupError: "popup_closed" }
      case "popup-blocked":
        return { popupError: "popup_failed_to_open" }
    }
  }
}
