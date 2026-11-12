import { createContext, use } from "react"

import { useAuth } from "./use-auth"

/**
 * What a Disconnect button calls, when something below the auth provider must be asked
 * first (pending edits, ADR-012): it may disconnect at once, ask, or not disconnect.
 * Provided by the feature that asks; without one, Disconnect disconnects.
 */
export const DisconnectRequestContext = createContext<(() => void) | null>(null)

/** The Disconnect action every Disconnect button calls. */
export function useRequestDisconnect(): () => void {
  const request = use(DisconnectRequestContext)
  const { disconnect } = useAuth()
  return request ?? disconnect
}
