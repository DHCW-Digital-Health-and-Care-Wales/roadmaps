import { use, useMemo, useSyncExternalStore } from "react"

import type { AuthClient, AuthState } from "@/domain/auth/auth-client"

import { AuthContext } from "./auth-context"

export interface UseAuthResult {
  readonly state: AuthState
  readonly connect: AuthClient["connect"]
  readonly disconnect: AuthClient["disconnect"]
  readonly reportUnauthenticated: AuthClient["reportUnauthenticated"]
}

/**
 * The auth state, re-rendering on change, and stable actions. `connect` must run
 * synchronously in a click handler so the browser does not block the popup.
 */
export function useAuth(): UseAuthResult {
  const client = use(AuthContext)
  if (!client) throw new Error("useAuth must be used within an AuthProvider")

  const state = useSyncExternalStore(client.subscribe, client.getSnapshot)
  return useMemo(
    () => ({
      state,
      connect: client.connect,
      disconnect: client.disconnect,
      reportUnauthenticated: client.reportUnauthenticated,
    }),
    [client, state],
  )
}
