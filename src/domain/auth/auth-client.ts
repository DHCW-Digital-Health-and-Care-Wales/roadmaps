/** Why connecting failed. The client moves to the `error` state. */
export type AuthFailureCode =
  "script-load-failed" | "access-denied" | "scope-not-granted" | "unknown"

/** Why a connection attempt was abandoned. The user can just try again. */
export type AuthCancellationCode = "popup-closed" | "popup-blocked"

/**
 * Every auth error code. These are codes, never copy: the UI picks localised text for
 * each one (ADR-008).
 */
export type AuthErrorCode = AuthFailureCode | AuthCancellationCode

/**
 * The authorisation session as the UI sees it (ADR-003). It proves access, not identity,
 * and never contains the access token.
 */
export type AuthState =
  | { readonly status: "initializing" }
  | { readonly status: "ready"; readonly lastError?: AuthCancellationCode }
  | { readonly status: "connecting" }
  | {
      readonly status: "connected"
      /** Epoch ms after which the token is no longer used (shortly before Google's expiry). */
      readonly expiresAt: number
    }
  | { readonly status: "expired"; readonly lastError?: AuthCancellationCode }
  | { readonly status: "error"; readonly error: AuthFailureCode }

/**
 * App-level authorisation port, implemented in infrastructure. Members are standalone
 * functions, so they can be passed around detached (e.g. to `useSyncExternalStore`).
 */
export interface AuthClient {
  /** The current state. The object only changes identity when the state changes. */
  readonly getSnapshot: () => AuthState
  /** Registers a change listener and returns its unsubscribe function. */
  readonly subscribe: (listener: () => void) => () => void
  /**
   * Starts the consent flow from `ready`, `expired` or `error`. Call it synchronously from
   * a user gesture, or the browser may block the popup.
   */
  readonly connect: () => void
  /** Ends the session: revokes access where possible and forgets the token. */
  readonly disconnect: () => void
  /** The token while `connected` and unexpired, otherwise `null`. Never store or log it. */
  readonly getAccessToken: () => string | null
  /** The data source rejected the token (e.g. HTTP 401): `connected` becomes `expired`. */
  readonly reportUnauthenticated: () => void
}
