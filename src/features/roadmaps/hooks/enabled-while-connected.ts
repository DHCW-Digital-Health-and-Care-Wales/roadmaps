import { useAuth } from "@/features/auth/use-auth"

/**
 * Adds `enabled` to these query options, true only while connected. Cached data stays
 * readable while the session is expired; disconnecting removes it, as all roadmap data
 * is auth-scoped.
 */
export function useEnabledWhileConnected<Options extends object>(
  options: Options,
): Options & { enabled: boolean } {
  const connected = useAuth().state.status === "connected"
  return { ...options, enabled: connected }
}
