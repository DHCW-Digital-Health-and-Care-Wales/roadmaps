/**
 * Transport-agnostic failure categories (ADR-0002). The UI picks localised copy from the
 * kind alone (ADR-0008), so `message` is developer diagnostics only — never UI copy.
 */
export type AppErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "rate-limited"
  | "network"
  | "invalid-response"
  | "unknown"

export interface AppErrorOptions {
  /** Developer diagnostics; defaults to the kind. Never shown to users. */
  message?: string | undefined
  /** Whether retrying the same operation may succeed; defaults per kind. */
  retryable?: boolean | undefined
  /** Transport status code (e.g. HTTP), when there is one. */
  status?: number | undefined
  cause?: unknown
}

const retryableByDefault: ReadonlySet<AppErrorKind> = new Set([
  "rate-limited",
  "network",
])

export class AppError extends Error {
  override readonly name = "AppError"
  readonly kind: AppErrorKind
  readonly retryable: boolean
  readonly status: number | undefined

  constructor(kind: AppErrorKind, options: AppErrorOptions = {}) {
    const { message = kind, retryable, status, cause } = options
    super(message, cause === undefined ? undefined : { cause })
    this.kind = kind
    this.retryable = retryable ?? retryableByDefault.has(kind)
    this.status = status
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

/** Normalises any thrown value to an `AppError`, keeping the original as `cause`. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error
  return new AppError("unknown", {
    message: error instanceof Error ? error.message : undefined,
    cause: error,
  })
}
