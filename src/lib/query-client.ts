import { QueryClient } from "@tanstack/react-query"

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

/** The app's TanStack Query client, created once by the composition root (and per test). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
    },
  })
}
