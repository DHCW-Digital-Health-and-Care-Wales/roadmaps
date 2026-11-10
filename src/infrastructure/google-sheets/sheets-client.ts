import { AppError, type AppErrorKind, isAppError } from "@/lib/errors"

import { describeGoogleError } from "./sheets-schemas"

const SHEETS_API_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets"

/**
 * The OAuth scope the access token needs. Full (read/write) access is deliberate, for the
 * planned editing features (ADR-003).
 */
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"

/** Returns the current OAuth access token, or `null` when not connected. */
export type AccessTokenProvider = () => string | null

export interface SheetsClientOptions {
  getAccessToken: AccessTokenProvider
  /** Defaults to the global `fetch`, resolved at call time. */
  fetch?: typeof fetch | undefined
  /** Defaults to {@link SHEETS_API_BASE_URL}. No trailing slash. */
  baseUrl?: string | undefined
}

export interface GetJsonOptions {
  searchParams?: Readonly<Record<string, string>> | undefined
  signal?: AbortSignal | undefined
}

export interface SheetsClient {
  /**
   * Performs an authorised GET of `baseUrl + path` and returns the unvalidated JSON body.
   * Rejects with an `AppError`, or with the abort reason once `signal` has aborted.
   */
  getJson(path: string, options?: GetJsonOptions): Promise<unknown>
}

export function createSheetsClient({
  getAccessToken,
  fetch: fetchImpl,
  baseUrl = SHEETS_API_BASE_URL,
}: SheetsClientOptions): SheetsClient {
  const doFetch = fetchImpl ?? ((input, init) => globalThis.fetch(input, init))

  async function request(
    path: string,
    { searchParams = {}, signal }: GetJsonOptions,
  ): Promise<unknown> {
    const token = getAccessToken()
    if (!token) {
      throw new AppError("unauthenticated", {
        message: "No Google access token available",
      })
    }

    const url = new URL(baseUrl + path)
    for (const [name, value] of Object.entries(searchParams)) {
      url.searchParams.set(name, value)
    }

    let text: string
    try {
      const response = await doFetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: signal ?? null,
      })
      if (!response.ok) throw await toHttpError(response)
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
  }
}

async function toHttpError(response: Response): Promise<AppError> {
  const { status } = response
  const body: unknown = await response.json().catch(() => undefined)
  const detail = describeGoogleError(body)
  return new AppError(kindForStatus(status), {
    message: `Google Sheets request failed with HTTP ${String(status)}${detail ? ` (${detail})` : ""}`,
    status,
    retryable: status === 429 || status >= 500,
  })
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
