import type { QueryClient } from "@tanstack/react-query"

import type { AuthClient } from "@/domain/auth/auth-client"

/**
 * Root of every query key whose data was fetched with the user's authorisation. Feature
 * query keys extend it (e.g. `[...authScopedQueryKey, "roadmaps"]`), so disconnecting can
 * drop all of them at once.
 */
export const authScopedQueryKey = ["auth-scoped"] as const

/** Forgets all data fetched with the session. Wired to the auth client's disconnect. */
export function removeAuthScopedQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: authScopedQueryKey })
}

/**
 * When a session ends without a disconnect (it expired), keeps its data on screen but
 * marks it stale, so reconnecting refetches it even within `staleTime`. Returns the
 * unsubscribe function. Wired once, next to `removeAuthScopedQueries`.
 */
export function invalidateAuthScopedQueriesOnSessionEnd(
  authClient: Pick<AuthClient, "getSnapshot" | "subscribe">,
  queryClient: QueryClient,
): () => void {
  let wasConnected = authClient.getSnapshot().status === "connected"
  return authClient.subscribe(() => {
    const connected = authClient.getSnapshot().status === "connected"
    if (wasConnected && !connected) {
      void queryClient.invalidateQueries({
        queryKey: authScopedQueryKey,
        refetchType: "none",
      })
    }
    wasConnected = connected
  })
}
