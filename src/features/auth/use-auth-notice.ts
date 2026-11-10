import { useLocation } from "@tanstack/react-router"
import { useState } from "react"

import type {
  AuthCancellationCode,
  AuthErrorCode,
  AuthFailureCode,
  AuthState,
} from "@/domain/auth/auth-client"

import { useAuth } from "./use-auth"

/** What the page notice says about the session, as codes; the notice picks the copy. */
export type AuthNotice =
  /** Connecting failed: nothing loads until it works. */
  | { readonly kind: "failed"; readonly code: AuthFailureCode }
  /** A connect attempt was abandoned: its popup was closed or blocked. */
  | { readonly kind: "cancelled"; readonly code: AuthCancellationCode }
  /** "Stay connected" didn't work. The session carries on until it ends. */
  | { readonly kind: "renewal-failed"; readonly code: AuthErrorCode }
  /** The user's own connect or disconnect worked. */
  | { readonly kind: "confirmed"; readonly code: "connected" | "disconnected" }

type Confirmation = Extract<AuthNotice, { kind: "confirmed" }>["code"]

/** A failure the state still carries: it lasts until the next attempt or expiry. */
function failureIn(state: AuthState): AuthNotice | null {
  switch (state.status) {
    case "error":
      return { kind: "failed", code: state.error }
    case "ready":
    case "expired":
      return state.lastError
        ? { kind: "cancelled", code: state.lastError }
        : null
    case "connected":
      return state.lastError
        ? { kind: "renewal-failed", code: state.lastError }
        : null
    default:
      return null
  }
}

/**
 * The confirmation a transition deserves: connecting worked, or the user ended a session.
 * A renewal (`connected` to `connected`) and an expiry confirm nothing.
 */
function confirmationOf(
  before: AuthState,
  after: AuthState,
): Confirmation | null {
  // Only `connect()` leads into `connected`; React may not render `connecting` first.
  if (after.status === "connected" && before.status !== "connected") {
    return "connected"
  }
  // Disconnecting is the only way into `ready` from a session without a `lastError`.
  if (
    after.status === "ready" &&
    !after.lastError &&
    ["connecting", "connected", "expired"].includes(before.status)
  ) {
    return "disconnected"
  }
  return null
}

/**
 * The notice for the top of the page in view, and how to dismiss it. A failure lasts as
 * long as the state that carries it; a confirmation until the next change of state or
 * page. Dismissing hides it until the state changes again.
 */
export function useAuthNotice(): {
  readonly notice: AuthNotice | null
  readonly dismiss: () => void
} {
  const { state } = useAuth()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [seen, setSeen] = useState(state)
  const [confirmation, setConfirmation] = useState<{
    readonly state: AuthState
    readonly pathname: string
    readonly code: Confirmation
  } | null>(null)
  const [dismissed, setDismissed] = useState<AuthState | null>(null)

  if (seen !== state) {
    // Derived from the previous render's state (React's "storing information from
    // previous renders" pattern), so each transition is seen once, with no effect.
    setSeen(state)
    const code = confirmationOf(seen, state)
    setConfirmation(code ? { state, pathname, code } : null)
  }

  const confirmed =
    confirmation?.state === state && confirmation.pathname === pathname
      ? ({ kind: "confirmed", code: confirmation.code } as const)
      : null
  const notice = dismissed === state ? null : (failureIn(state) ?? confirmed)
  return {
    notice,
    dismiss: () => {
      setDismissed(state)
    },
  }
}
