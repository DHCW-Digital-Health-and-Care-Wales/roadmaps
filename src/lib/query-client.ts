import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

import { isAppError } from "./errors"

/** Retries after the first failure, for errors that may succeed when retried. */
const MAX_RETRIES = 2

/**
 * Retries only `AppError`s marked retryable (e.g. network, rate limiting), at most twice.
 * Anything else is a bug or a permanent failure, so retrying would only delay the error.
 */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  return isAppError(error) && error.retryable && failureCount < MAX_RETRIES
}

export interface QueryClientOptions {
  /**
   * Called once per query or mutation that fails with an `unauthenticated` `AppError`
   * (after retries, which never apply to that kind). The composition root expires the
   * session.
   */
  onUnauthenticated?: (() => void) | undefined
  /**
   * The current session's identity, compared with `===`. A mutation's `unauthenticated`
   * error is reported only while the session it started in is still current: writes are
   * never cancelled when a session ends, so one sent before a reconnect can fail after it,
   * and must not expire the new session. Queries need no check: the end of a session
   * cancels them. Without it, every mutation's 401 is reported.
   */
  currentSession?: (() => unknown) | undefined
}

/** The app's TanStack Query client, created once by the composition root (and per test). */
export function createQueryClient({
  onUnauthenticated,
  currentSession,
}: QueryClientOptions = {}): QueryClient {
  const isUnauthenticated = (error: unknown) =>
    isAppError(error) && error.kind === "unauthenticated"
  const mutationSessions = new WeakMap<object, unknown>()
  return new QueryClient({
    // One place for every query and mutation, current and future, rather than per hook.
    queryCache: new QueryCache({
      onError: (error) => {
        if (isUnauthenticated(error)) onUnauthenticated?.()
      },
    }),
    mutationCache: new MutationCache({
      onMutate: (_variables, mutation) => {
        mutationSessions.set(mutation, currentSession?.())
      },
      onError: (error, _variables, _result, mutation) => {
        const session = mutationSessions.get(mutation)
        if (isUnauthenticated(error) && session === currentSession?.()) {
          onUnauthenticated?.()
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
    },
  })
}
