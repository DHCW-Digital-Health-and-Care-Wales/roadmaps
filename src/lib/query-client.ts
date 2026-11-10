import { QueryCache, QueryClient } from "@tanstack/react-query"

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
   * Called once per query that fails with an `unauthenticated` `AppError` (after
   * retries, which never apply to that kind). The composition root expires the session.
   */
  onUnauthenticated?: (() => void) | undefined
}

/** The app's TanStack Query client, created once by the composition root (and per test). */
export function createQueryClient({
  onUnauthenticated,
}: QueryClientOptions = {}): QueryClient {
  return new QueryClient({
    // One place for every query, current and future, rather than per hook or observer.
    queryCache: new QueryCache({
      onError: (error) => {
        if (isAppError(error) && error.kind === "unauthenticated") {
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
