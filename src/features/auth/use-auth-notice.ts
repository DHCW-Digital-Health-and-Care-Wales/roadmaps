import { useLocation } from "@tanstack/react-router"
import { useCallback, useState } from "react"

import type { AuthErrorCode, AuthState } from "@/domain/auth/auth-client"

import { type ConnectFailure, connectFailure } from "./connect-failure"
import { useAuth } from "./use-auth"

/** What the page notice says about the session, as codes; the notice picks the copy. */
export type AuthNotice =
  /** Connecting failed (nothing loads until it works), or was abandoned. */
  | ConnectFailure
  /** "Stay connected" didn't work. The session carries on until it ends. */
  | { readonly kind: "renewal-failed"; readonly code: AuthErrorCode }
  /** The user's own connect or disconnect worked. */
  | { readonly kind: "confirmed"; readonly code: "connected" | "disconnected" }

type Confirmation = Extract<AuthNotice, { kind: "confirmed" }>["code"]

/** A failure the state still carries: it lasts until the next attempt or expiry. */
function failureIn(state: AuthState): AuthNotice | null {
  if (state.status === "connected") {
    return state.lastError
      ? { kind: "renewal-failed", code: state.lastError }
      : null
  }
  return connectFailure(state)
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
 * long as the state that carries it; a confirmation at most until the next change of state
 * or page (`AuthNotice` also clears it after a dwell, `useNoticeDwell`). Dismissing hides
 * it until the state changes again.
 */
export function useAuthNotice(): {
  readonly notice: AuthNotice | null
  /**
   * Changes with every new state, so a notice can remount and be announced again when
   * the same failure repeats: Google may report a blocked popup inside the click, before
   * `connecting` is ever rendered.
   */
  readonly version: number
  readonly dismiss: () => void
} {
  const { state } = useAuth()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [seen, setSeen] = useState(state)
  const [seenPathname, setSeenPathname] = useState(pathname)
  const [version, setVersion] = useState(0)
  const [confirmation, setConfirmation] = useState<{
    readonly state: AuthState
    readonly code: Confirmation
  } | null>(null)
  const [dismissed, setDismissed] = useState<AuthState | null>(null)

  // Derived from the previous render (React's "storing information from previous
  // renders" pattern), so each transition and each page change is seen once, with no
  // effect.
  if (seen !== state) {
    setSeen(state)
    setVersion(version + 1)
    const code = confirmationOf(seen, state)
    setConfirmation(code ? { state, code } : null)
  }
  if (seenPathname !== pathname) {
    // Moving on to another page ends a confirmation for good, even on the way back.
    setSeenPathname(pathname)
    setConfirmation(null)
  }

  const confirmed =
    confirmation?.state === state
      ? ({ kind: "confirmed", code: confirmation.code } as const)
      : null
  const notice = dismissed === state ? null : (failureIn(state) ?? confirmed)
  // Stable for a state, so a confirmation's dwell (which depends on it) does not restart
  // when something else re-renders the notice.
  const dismiss = useCallback(() => {
    setDismissed(state)
  }, [state])
  return { notice, version, dismiss }
}
