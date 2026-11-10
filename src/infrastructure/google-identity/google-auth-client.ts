import type {
  AuthCancellationCode,
  AuthClient,
  AuthErrorCode,
  AuthFailureCode,
  AuthState,
} from "@/domain/auth/auth-client"
import { createExternalStore } from "@/lib/external-store"

import type {
  ClientConfigError,
  GoogleOAuth2,
  OverridableTokenClientConfig,
  TokenResponse,
} from "./gis-types"
import { loadGisScript } from "./load-gis-script"
import { readTokenResponse } from "./token-response"

/** Stop using a token this long before Google expires it, so requests don't race expiry. */
export const EXPIRY_SKEW_MS = 60_000

export interface GoogleAuthClientOptions {
  /** OAuth client ID (`….apps.googleusercontent.com`). */
  clientId: string
  /** Scopes to request. Connecting fails with `scope-not-granted` unless all are granted. */
  scopes: readonly [string, ...string[]]
  /** Resolves with `google.accounts.oauth2`. Defaults to {@link loadGisScript}. */
  loadScript?: (() => Promise<GoogleOAuth2>) | undefined
  /** Called after `disconnect()` ends a session, e.g. to drop data fetched with it. */
  onDisconnect?: (() => void) | undefined
}

export interface GoogleAuthClient extends AuthClient {
  /**
   * Stops the expiry timer, forgets the token and freezes the state, so that late Google
   * callbacks and script loads are ignored. For tests and HMR; it does not revoke access.
   */
  readonly dispose: () => void
}

/**
 * One consent attempt. Its identity tells its Google callbacks apart from stale ones.
 * `connect` starts from `ready` or `error`, `reconnect` from `expired` (and stays there if
 * abandoned), and `renew` from `connected`, which it never leaves.
 */
interface Attempt {
  readonly kind: "connect" | "reconnect" | "renew"
}

/**
 * `AuthClient` on the Google Identity Services token model (ADR-003). It starts loading
 * GIS immediately, so `connect()` can open the consent popup synchronously inside the
 * user's click.
 */
export function createGoogleAuthClient({
  clientId,
  scopes,
  loadScript = loadGisScript,
  onDisconnect,
}: GoogleAuthClientOptions): GoogleAuthClient {
  const store = createExternalStore<AuthState>({ status: "initializing" })
  let gis: GoogleOAuth2 | undefined
  let accessToken: string | null = null
  let expiryTimer: ReturnType<typeof setTimeout> | undefined
  /** The attempt in progress: while `connecting`, or renewing while `connected`. */
  let attempt: Attempt | undefined
  let disposed = false

  const state = store.getSnapshot
  function setState(next: AuthState): void {
    if (!disposed) store.setSnapshot(next)
  }
  function fail(error: AuthFailureCode): void {
    setState({ status: "error", error })
  }

  /** A renewal that didn't succeed: the session carries on until it expires. */
  function keepSession(lastError: AuthErrorCode): void {
    const current = state()
    if (current.status !== "connected") return
    setState({ status: "connected", expiresAt: current.expiresAt, lastError })
  }

  /** Settles a failed attempt: a renewal keeps its session, others move to `error`. */
  function settleFailure(pending: Attempt, error: AuthFailureCode): void {
    if (pending.kind === "renew") keepSession(error)
    else fail(error)
  }

  /** Settles an abandoned attempt: back where it started, noting why. */
  function settleCancellation(
    pending: Attempt,
    lastError: AuthCancellationCode,
  ): void {
    if (pending.kind === "renew") keepSession(lastError)
    else {
      setState({
        status: pending.kind === "reconnect" ? "expired" : "ready",
        lastError,
      })
    }
  }

  /** Settles `pending` if it is still the attempt in progress; false for stale callbacks. */
  function claim(pending: Attempt): boolean {
    if (disposed || attempt !== pending) return false
    attempt = undefined
    return true
  }

  /** Forgets the token and its timer, returning the token that was held. */
  function clearSession(): string | null {
    clearTimeout(expiryTimer)
    const token = accessToken
    accessToken = null
    return token
  }

  async function initialize(): Promise<void> {
    try {
      const oauth2 = await loadScript()
      if (disposed) return
      gis = oauth2
      setState({ status: "ready" })
    } catch {
      fail("script-load-failed")
    }
  }

  function handleTokenResponse(
    pending: Attempt,
    oauth2: GoogleOAuth2,
    response: TokenResponse,
  ): void {
    if (!claim(pending)) return

    const outcome = readTokenResponse(oauth2, response, scopes)
    if (typeof outcome === "string") {
      settleFailure(pending, outcome)
      return
    }
    const usableMs = outcome.lifetimeMs - EXPIRY_SKEW_MS
    if (usableMs <= 0) {
      settleFailure(pending, "unknown")
      return
    }

    // A renewal replaces the session's token and timer. The old token is not revoked:
    // that would end the grant the new token belongs to.
    clearSession()
    accessToken = outcome.accessToken
    expiryTimer = setTimeout(expire, usableMs)
    setState({ status: "connected", expiresAt: Date.now() + usableMs })
  }

  function handleClientError(
    pending: Attempt,
    { type }: ClientConfigError,
  ): void {
    if (!claim(pending)) return
    switch (type) {
      case "popup_closed":
        settleCancellation(pending, "popup-closed")
        break
      case "popup_failed_to_open":
        settleCancellation(pending, "popup-blocked")
        break
      default:
        settleFailure(pending, "unknown")
    }
  }

  function expire(): void {
    if (state().status !== "connected") return
    // A renewal still waiting on Google is abandoned with the session it was renewing.
    attempt = undefined
    clearSession()
    setState({ status: "expired" })
  }

  /**
   * Timers are throttled in background tabs and paused while the device sleeps, so the
   * expiry timer can fire late. Coming back to the tab checks the clock instead.
   */
  function expireIfDue(): void {
    const current = state()
    if (current.status === "connected" && Date.now() >= current.expiresAt) {
      expire()
    }
  }

  document.addEventListener("visibilitychange", expireIfDue)
  void initialize()

  return {
    getSnapshot: state,
    subscribe: store.subscribe,

    connect() {
      const current = state()
      if (
        disposed ||
        current.status === "initializing" ||
        current.status === "connecting" ||
        // One renewal at a time.
        (current.status === "connected" && attempt)
      ) {
        return
      }
      const oauth2 = gis
      if (!oauth2) {
        // GIS failed to load. Retry; a popup now would no longer be inside the click.
        setState({ status: "initializing" })
        void initialize()
        return
      }

      const pending: Attempt = {
        kind:
          current.status === "connected"
            ? "renew"
            : current.status === "expired"
              ? "reconnect"
              : "connect",
      }
      attempt = pending
      // A renewal keeps the session (and its roadmaps) on screen while Google answers.
      if (pending.kind !== "renew") setState({ status: "connecting" })
      try {
        // A token client per attempt binds Google's callbacks to that attempt, so a late
        // response from an abandoned one cannot complete this one. Creating it is
        // synchronous, so the popup still opens inside the click.
        oauth2
          .initTokenClient({
            client_id: clientId,
            scope: scopes.join(" "),
            callback: (response) => {
              handleTokenResponse(pending, oauth2, response)
            },
            error_callback: (error) => {
              handleClientError(pending, error)
            },
          })
          .requestAccessToken(promptFor(current))
      } catch {
        if (claim(pending)) settleFailure(pending, "unknown")
      }
    },

    disconnect() {
      const { status } = state()
      if (
        disposed ||
        (status !== "connecting" &&
          status !== "connected" &&
          status !== "expired")
      ) {
        return
      }
      attempt = undefined
      const token = clearSession()
      setState({ status: "ready" })
      // Best effort: the token is forgotten locally whether or not revocation succeeds.
      if (token) gis?.revoke(token, () => undefined)
      onDisconnect?.()
    },

    getAccessToken() {
      const current = state()
      // Checks the clock too: timers are throttled in background tabs and paused in sleep.
      return current.status === "connected" && Date.now() < current.expiresAt
        ? accessToken
        : null
    },

    reportUnauthenticated: expire,

    dispose() {
      disposed = true
      attempt = undefined
      clearSession()
      document.removeEventListener("visibilitychange", expireIfDue)
    },
  }
}

/**
 * The GIS `prompt` for an attempt: a quiet re-grant to renew or after expiry, forced
 * consent after a partial grant (re-prompting needs it), and the default account chooser
 * otherwise. A quiet re-grant for an account that has consented opens a popup that closes
 * itself, with nothing to click (STY-017's spike against the real Google).
 */
function promptFor(state: AuthState): OverridableTokenClientConfig | undefined {
  if (state.status === "connected" || state.status === "expired") {
    return { prompt: "" }
  }
  if (state.status === "error" && state.error === "scope-not-granted") {
    return { prompt: "consent" }
  }
  return undefined
}
