import type {
  AuthCancellationCode,
  AuthFailureCode,
  AuthState,
} from "@/domain/auth/auth-client"

/** Why the latest attempt to connect didn't succeed, as codes; the UI picks the copy. */
export type ConnectFailure =
  /** Google refused, or couldn't be reached: the state is `error`. */
  | { readonly kind: "failed"; readonly code: AuthFailureCode }
  /** The attempt was abandoned, its popup closed or blocked. */
  | { readonly kind: "cancelled"; readonly code: AuthCancellationCode }

/**
 * The failure of the latest attempt to connect, while the state still carries it: until
 * the next attempt or expiry. An abandoned attempt returns to `expired`, or to `ready`
 * when it began from `ready` or `error`. A renewal's failure is not a connect's.
 */
export function connectFailure(state: AuthState): ConnectFailure | null {
  switch (state.status) {
    case "error":
      return { kind: "failed", code: state.error }
    case "ready":
    case "expired":
      return state.lastError
        ? { kind: "cancelled", code: state.lastError }
        : null
    default:
      return null
  }
}
