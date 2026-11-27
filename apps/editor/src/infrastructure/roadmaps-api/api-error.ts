import { type ErrorCode, zErrorResponse } from "@roadmaps/api-types"

import { AppError, type AppErrorKind } from "@/lib/errors"

interface Mapping {
  kind: AppErrorKind
  retryable: boolean
}

/**
 * Each of the API's error codes as the editor's failure. Typed by the generated codes,
 * so a code the API adds fails the editor's typecheck until it is mapped here (ADR-017
 * _Errors_). Several codes may share a kind, which alone picks the copy (ADR-008).
 */
const BY_CODE: Record<ErrorCode, Mapping> = {
  "auth.unauthenticated": { kind: "unauthenticated", retryable: false },
  "auth.person_mismatch": { kind: "unauthenticated", retryable: false },
  "authz.forbidden": { kind: "forbidden", retryable: false },
  "request.origin_not_allowed": { kind: "unknown", retryable: false },
  "request.unsupported_media_type": { kind: "unknown", retryable: false },
  "request.not_found": { kind: "not-found", retryable: false },
  "request.method_not_allowed": { kind: "unknown", retryable: false },
  "request.invalid": { kind: "unknown", retryable: false },
  "service.not_ready": { kind: "unknown", retryable: true },
  "server.internal_error": { kind: "unknown", retryable: true },
}

/**
 * The failure of an answer that is no envelope, or holds a code this build doesn't know:
 * the API's two plain-text refusals (400 and 413), an answer from in front of it, or a
 * newer API's.
 */
function byStatus(status: number): Mapping {
  switch (status) {
    case 401:
      return { kind: "unauthenticated", retryable: false }
    case 403:
      return { kind: "forbidden", retryable: false }
    case 404:
      return { kind: "not-found", retryable: false }
    case 429:
      return { kind: "rate-limited", retryable: true }
    case 400:
    case 413:
      return { kind: "unknown", retryable: false }
    default:
      return status >= 500 && status < 600
        ? { kind: "unknown", retryable: true }
        : { kind: "invalid-response", retryable: false }
  }
}

/**
 * The `AppError` for an answer from the API that is not a success (any non-2xx), reading
 * its body. Its message holds the status and a known code, never the body's own text. It
 * resolves for a body it cannot read, an aborted request's included, so a caller holding
 * an abort signal checks it afterwards.
 */
export async function toApiError(response: Response): Promise<AppError> {
  const { status } = response
  const body: unknown = await response.json().catch(() => undefined)
  const envelope = zErrorResponse.safeParse(body)
  const code = envelope.success ? envelope.data.code : undefined
  const { kind, retryable } =
    code === undefined ? byStatus(status) : BY_CODE[code]
  return new AppError(kind, {
    message: `Roadmaps API request failed with HTTP ${String(status)}${code ? ` (${code})` : ""}`,
    status,
    retryable,
  })
}
