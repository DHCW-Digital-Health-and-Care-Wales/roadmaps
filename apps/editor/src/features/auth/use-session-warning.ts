import { useEffect, useState } from "react"

import { useAuth } from "./use-auth"

/** How long before the session's end the warning opens (STY-017 D4). */
export const SESSION_WARNING_MS = 2 * 60_000

export interface SessionWarning {
  /** Whether the warning is showing. */
  readonly open: boolean
  /** Whole seconds left in the session, rounded up; 0 when not connected. */
  readonly secondsLeft: number
  /** Closes the warning for the rest of this session (a renewed one warns again). */
  readonly close: () => void
}

/**
 * The warning before a connected session ends: open from {@link SESSION_WARNING_MS}
 * before its `expiresAt` until it ends, unless closed. A renewal moves `expiresAt`, so
 * the renewed session gets its own warning.
 */
export function useSessionWarning(): SessionWarning {
  const { state } = useAuth()
  const expiresAt = state.status === "connected" ? state.expiresAt : null
  const now = useSessionClock(expiresAt)
  const [closedFor, setClosedFor] = useState<number | null>(null)

  const msLeft = expiresAt === null ? 0 : Math.max(0, expiresAt - now)
  return {
    open:
      expiresAt !== null &&
      expiresAt !== closedFor &&
      msLeft > 0 &&
      msLeft <= SESSION_WARNING_MS,
    secondsLeft: Math.ceil(msLeft / 1000),
    close: () => {
      setClosedFor(expiresAt)
    },
  }
}

/**
 * The current time, as often as the warning needs it: when it opens, then each second
 * until the session ends. Timers are held back in background tabs and while the device
 * sleeps, so coming back to the tab reads the clock again.
 */
function useSessionClock(expiresAt: number | null): number {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (expiresAt === null) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = (delay: number) => {
      clearTimeout(timer)
      timer = setTimeout(tick, delay)
    }
    const tick = () => {
      const current = Date.now()
      setNow(current)
      const opensAt = expiresAt - SESSION_WARNING_MS
      if (current < opensAt) schedule(opensAt - current)
      // On the second boundary of the time left, so the countdown never skips one.
      else if (current < expiresAt)
        schedule((expiresAt - current) % 1000 || 1000)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tick()
    }

    // A new session (or a renewal) reads the clock straight away.
    schedule(0)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [expiresAt])

  return now
}
