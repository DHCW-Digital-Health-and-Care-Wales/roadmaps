import { AppError, type AppErrorKind, isAppError } from "@/lib/errors"

import { describeGoogleError, isProtectedRefusal } from "./sheets-schemas"

const SHEETS_API_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets"

/**
 * The OAuth scope the access token needs. Full (read/write) access is deliberate, for the
 * planned editing features (ADR-003).
 */
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"

/** Returns the current OAuth access token, or `null` when not connected. */
type AccessTokenProvider = () => string | null

export interface SheetsClientOptions {
  getAccessToken: AccessTokenProvider
  /** Defaults to the global `fetch`, resolved at call time. */
  fetch?: typeof fetch | undefined
  /** Defaults to {@link SHEETS_API_BASE_URL}. No trailing slash. */
  baseUrl?: string | undefined
}

interface GetJsonOptions {
  searchParams?: Readonly<Record<string, string>> | undefined
  signal?: AbortSignal | undefined
}

export interface SheetsClient {
  /**
   * Performs an authorised GET of `baseUrl + path` and returns the unvalidated JSON body.
   * Rejects with an `AppError`, or with the abort reason once `signal` has aborted.
   */
  getJson(path: string, options?: GetJsonOptions): Promise<unknown>
  /**
   * Performs an authorised POST of `body`, as JSON, to `baseUrl + path`, ignoring the
   * answer's body. Rejects with an `AppError` as `getJson` does; it takes no signal, as
   * a write once sent must be waited for (ADR-012).
   */
  postJson(path: string, body: unknown): Promise<void>
}

export function createSheetsClient({
  getAccessToken,
  fetch: fetchImpl,
  baseUrl = SHEETS_API_BASE_URL,
}: SheetsClientOptions): SheetsClient {
  const doFetch = fetchImpl ?? ((input, init) => globalThis.fetch(input, init))

  /** The bearer authorisation header, or throws `AppError('unauthenticated')`. */
  function authorization(): string {
    const token = getAccessToken()
    if (!token) {
      throw new AppError("unauthenticated", {
        message: "No Google access token available",
      })
    }
    return `Bearer ${token}`
  }

  /** Sends a request, mapping a failure or an HTTP error to an `AppError`. */
  async function send(url: URL, init: RequestInit): Promise<Response> {
    try {
      const response = await doFetch(url, init)
      if (!response.ok) throw await toHttpError(response)
      return response
    } catch (error) {
      if (isAppError(error)) throw error
      throw new AppError("network", {
        message: "Google Sheets request did not complete",
        cause: error,
      })
    }
  }

  async function request(
    path: string,
    { searchParams = {}, signal }: GetJsonOptions,
  ): Promise<unknown> {
    const headers = {
      Accept: "application/json",
      Authorization: authorization(),
    }
    const url = new URL(baseUrl + path)
    for (const [name, value] of Object.entries(searchParams)) {
      url.searchParams.set(name, value)
    }

    let text: string
    try {
      const response = await send(url, {
        method: "GET",
        headers,
        signal: signal ?? null,
      })
      text = await response.text()
    } catch (error) {
      if (isAppError(error)) throw error
      throw new AppError("network", {
        message: "Google Sheets request did not complete",
        cause: error,
      })
    }

    try {
      return JSON.parse(text) as unknown
    } catch (error) {
      throw new AppError("invalid-response", {
        message: "Google Sheets response body is not valid JSON",
        cause: error,
      })
    }
  }

  return {
    async getJson(path, options = {}) {
      try {
        return await request(path, options)
      } finally {
        // Cancellation overrides any outcome: reject with the caller's abort reason.
        options.signal?.throwIfAborted()
      }
    },
    async postJson(path, body) {
      const headers = {
        Accept: "application/json",
        Authorization: authorization(),
        "Content-Type": "application/json",
      }
      await send(new URL(baseUrl + path), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
    },
  }
}

async function toHttpError(response: Response): Promise<AppError> {
  const { status } = response
  const body: unknown = await response.json().catch(() => undefined)
  const detail = describeGoogleError(body)
  return new AppError(kindOf(status, body), {
    message: `Google Sheets request failed with HTTP ${String(status)}${detail ? ` (${detail})` : ""}`,
    status,
    retryable: status === 429 || status >= 500,
  })
}

/**
 * The kind of an HTTP error: its status's, but for Google's refusal to change a
 * protected part of the spreadsheet, a 400 told apart by its body (STY-051 D6).
 */
function kindOf(status: number, body: unknown): AppErrorKind {
  return status === 400 && isProtectedRefusal(body)
    ? "protected"
    : kindForStatus(status)
}

function kindForStatus(status: number): AppErrorKind {
  switch (status) {
    case 401:
      return "unauthenticated"
    case 403:
      return "forbidden"
    case 404:
      return "not-found"
    case 429:
      return "rate-limited"
    default:
      // 5xx and unexpected statuses; 5xx are marked retryable by the caller.
      return "unknown"
  }
}
