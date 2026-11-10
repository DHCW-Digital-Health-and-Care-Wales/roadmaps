import type { QueryClient } from "@tanstack/react-query"

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
