import { createContext, use, useLayoutEffect, useRef } from "react"

import { useAuth } from "./use-auth"

/** An action that waits for the Product Lead to reconnect. */
export interface ReconnectRequest {
  /** The control that was pressed: focus returns to it as the dialog closes. */
  readonly from: HTMLElement | null
  /** Carries on with the action, once reconnected. */
  readonly carryOn: () => void
}

/** Opens the reconnect dialog for a request. Provided by `ReconnectDialogProvider`. */
export const ReconnectRequestContext = createContext<
  ((request: ReconnectRequest) => void) | null
>(null)

/**
 * Wraps an action that needs a session, such as a write or a read (STY-057): while
 * connected it runs at once; otherwise the reconnect dialog asks to reconnect first and,
 * once reconnected, the action carries on, as its component then renders it. Call the
 * result with the control pressed, where focus returns. An action whose component has
 * gone by then does not carry on.
 */
export function useSessionAction(
  action: () => void,
): (from: HTMLElement | null) => void {
  const askToReconnect = use(ReconnectRequestContext)
  if (!askToReconnect) {
    throw new Error(
      "useSessionAction must be used within a ReconnectDialogProvider",
    )
  }
  const connected = useAuth().state.status === "connected"
  const latest = useRef<(() => void) | null>(null)
  useLayoutEffect(() => {
    latest.current = action
    return () => {
      latest.current = null
    }
  })

  return (from) => {
    if (connected) {
      action()
      return
    }
    askToReconnect({
      from,
      carryOn: () => {
        latest.current?.()
      },
    })
  }
}
