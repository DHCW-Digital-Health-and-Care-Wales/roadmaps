import { useAuth } from "@/features/auth/use-auth"
import { AppError, toAppError } from "@/lib/errors"

/** Stands in for any query error while the session is expired or reconnecting. */
const SESSION_EXPIRED = new AppError("unauthenticated")

/**
 * Why the roadmaps on screen may not be current: an expired session (until reconnected),
 * otherwise the list query's last error. `null` when nothing is wrong.
 */
export function useRoadmapsProblem(error: Error | null): AppError | null {
  const connected = useAuth().state.status === "connected"
  if (!connected) return SESSION_EXPIRED
  const problem = error ? toAppError(error) : null
  // A rejected token ends the session at once, so while connected such an error is left
  // over from the previous session; the refetch after reconnecting replaces it.
  return problem?.kind === "unauthenticated" ? null : problem
}
