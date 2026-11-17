import { delay, HttpResponse } from "msw"
import { http } from "msw/http"
import { describe, expect, it, vi } from "vitest"

import { AppError, type AppErrorKind } from "@/lib/errors"
import { server } from "@/test/msw-server"

import { createSheetsClient } from "./sheets-client"

const ENDPOINT = "https://sheets.googleapis.com/v4/spreadsheets/sheet-1"

function connectedClient() {
  return createSheetsClient({ getAccessToken: () => "token-123" })
}

/** Resolves to whatever the promise rejects with; fails if it resolves. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => expect.fail("expected the promise to reject"),
    (reason: unknown) => reason,
  )
}

describe("createSheetsClient", () => {
  it("sends an authorised JSON GET with the query parameters and returns the body", async () => {
    let request: Request | undefined
    server.use(
      http.get(ENDPOINT, (info) => {
        request = info.request
        return HttpResponse.json({ ok: true })
      }),
    )

    const body = await connectedClient().getJson("/sheet-1", {
      searchParams: { fields: "sheets(properties(sheetId))" },
    })

    expect(body).toEqual({ ok: true })
    expect(request?.method).toBe("GET")
    expect(request?.headers.get("Authorization")).toBe("Bearer token-123")
    expect(request?.headers.get("Accept")).toBe("application/json")
    expect(new URL(request?.url ?? "").searchParams.get("fields")).toBe(
      "sheets(properties(sheetId))",
    )
  })

  it("uses the injected fetch and base URL", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(Response.json([1, 2])),
    )
    const client = createSheetsClient({
      getAccessToken: () => "t",
      fetch,
      baseUrl: "https://api.example.test/v1",
    })

    await expect(client.getJson("/things")).resolves.toEqual([1, 2])
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0]?.[0]).toHaveProperty(
      "href",
      "https://api.example.test/v1/things",
    )
  })

  it.each([["null", null] as const, ["an empty string", ""] as const])(
    "fails as unauthenticated without a request when the token is %s",
    async (_, token) => {
      const fetch = vi.fn<typeof globalThis.fetch>()
      const client = createSheetsClient({ getAccessToken: () => token, fetch })

      const error = await rejectionOf(client.getJson("/sheet-1"))

      expect(error).toBeInstanceOf(AppError)
      expect(error).toMatchObject({ kind: "unauthenticated", retryable: false })
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it.each<[number, AppErrorKind, boolean]>([
    [400, "unknown", false],
    [401, "unauthenticated", false],
    [403, "forbidden", false],
    [404, "not-found", false],
    [429, "rate-limited", true],
    [500, "unknown", true],
    [503, "unknown", true],
  ])("maps HTTP %i to %s (retryable=%s)", async (status, kind, retryable) => {
    server.use(
      http.get(ENDPOINT, () =>
        HttpResponse.json(
          {
            error: { code: status, status: "SOME_STATUS", message: "Details" },
          },
          { status },
        ),
      ),
    )

    const error = await rejectionOf(connectedClient().getJson("/sheet-1"))

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ kind, retryable, status })
    expect((error as AppError).message).toBe(
      `Google Sheets request failed with HTTP ${String(status)} (SOME_STATUS: Details)`,
    )
  })

  it("still maps the status when the error body is not Google's JSON envelope", async () => {
    server.use(
      http.get(
        ENDPOINT,
        () => new HttpResponse("<html>Forbidden</html>", { status: 403 }),
      ),
    )

    const error = await rejectionOf(connectedClient().getJson("/sheet-1"))

    expect(error).toMatchObject({
      kind: "forbidden",
      status: 403,
      message: "Google Sheets request failed with HTTP 403",
    })
  })

  it("maps a network failure to a retryable network error", async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.error()))

    const error = await rejectionOf(connectedClient().getJson("/sheet-1"))

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({
      kind: "network",
      retryable: true,
      status: undefined,
    })
    expect((error as AppError).cause).toBeInstanceOf(TypeError)
  })

  it("maps a successful response with a non-JSON body to invalid-response", async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.text("not json")))

    const error = await rejectionOf(connectedClient().getJson("/sheet-1"))

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ kind: "invalid-response", retryable: false })
  })

  it("maps a connection failure while reading the body to a retryable network error", async () => {
    const cause = new TypeError("terminated")
    const body = new ReadableStream({
      start(controller) {
        controller.error(cause)
      },
    })
    const client = createSheetsClient({
      getAccessToken: () => "t",
      fetch: () => Promise.resolve(new Response(body, { status: 200 })),
    })

    const error = await rejectionOf(client.getJson("/sheet-1"))

    expect(error).toBeInstanceOf(AppError)
    expect(error).toMatchObject({ kind: "network", retryable: true })
    expect((error as AppError).cause).toBe(cause)
  })

  it("rejects with the abort reason, not unauthenticated, when aborted without a token", async () => {
    const reason = new DOMException("Cancelled", "AbortError")
    const client = createSheetsClient({ getAccessToken: () => null })

    await expect(
      client.getJson("/sheet-1", { signal: AbortSignal.abort(reason) }),
    ).rejects.toBe(reason)
  })

  it.each([
    ["a successful", 200],
    ["an error", 500],
  ])(
    "rejects with the abort reason when aborted before %s response is read",
    async (_, status) => {
      const controller = new AbortController()
      const reason = new Error("custom abort reason")
      // A fetch that ignores the signal, so only the client's own check can honour it.
      const client = createSheetsClient({
        getAccessToken: () => "t",
        fetch: () => {
          controller.abort(reason)
          return Promise.resolve(Response.json({}, { status }))
        },
      })

      await expect(
        client.getJson("/sheet-1", { signal: controller.signal }),
      ).rejects.toBe(reason)
    },
  )

  it("rejects with the abort reason when the signal is already aborted", async () => {
    const reason = new DOMException("Cancelled", "AbortError")

    await expect(
      connectedClient().getJson("/sheet-1", {
        signal: AbortSignal.abort(reason),
      }),
    ).rejects.toBe(reason)
  })

  it("rejects with the abort reason when aborted mid-request", async () => {
    server.use(
      http.get(ENDPOINT, async () => {
        await delay("infinite")
        return HttpResponse.json({})
      }),
    )
    const controller = new AbortController()
    const reason = new DOMException("Cancelled", "AbortError")

    const pending = connectedClient().getJson("/sheet-1", {
      signal: controller.signal,
    })
    controller.abort(reason)

    await expect(pending).rejects.toBe(reason)
  })

  describe("postJson", () => {
    const BATCH = `${ENDPOINT}:batchUpdate`

    it("sends an authorised JSON POST of the body and ignores the answer", async () => {
      let request: Request | undefined
      let sent: unknown
      server.use(
        http.post(BATCH, async (info) => {
          request = info.request
          sent = await info.request.json()
          return HttpResponse.text("not json")
        }),
      )

      await expect(
        connectedClient().postJson("/sheet-1:batchUpdate", { requests: [] }),
      ).resolves.toBeUndefined()

      expect(request?.method).toBe("POST")
      expect(request?.headers.get("Authorization")).toBe("Bearer token-123")
      expect(request?.headers.get("Content-Type")).toBe("application/json")
      expect(sent).toEqual({ requests: [] })
    })

    it("fails as unauthenticated without a request when there is no token", async () => {
      const fetch = vi.fn<typeof globalThis.fetch>()
      const client = createSheetsClient({ getAccessToken: () => null, fetch })

      await expect(
        client.postJson("/sheet-1:batchUpdate", {}),
      ).rejects.toMatchObject({ kind: "unauthenticated" })
      expect(fetch).not.toHaveBeenCalled()
    })

    it.each<[number, AppErrorKind]>([
      [401, "unauthenticated"],
      [403, "forbidden"],
      [500, "unknown"],
    ])("maps HTTP %i to %s", async (status, kind) => {
      server.use(http.post(BATCH, () => HttpResponse.json({}, { status })))

      await expect(
        connectedClient().postJson("/sheet-1:batchUpdate", {}),
      ).rejects.toMatchObject({ kind, status })
    })

    it("maps Google's refusal to change what is protected to protected, not retryable, and any other HTTP 400 to unknown (STY-051 S7)", async () => {
      const refuse = (message: string) => {
        server.use(
          http.post(BATCH, () =>
            HttpResponse.json(
              { error: { code: 400, status: "INVALID_ARGUMENT", message } },
              { status: 400 },
            ),
          ),
        )
      }

      refuse(
        "Invalid requests[0].moveDimension: You are trying to edit a protected cell or object. Please contact the spreadsheet owner to remove protection if you need to edit.",
      )
      await expect(
        connectedClient().postJson("/sheet-1:batchUpdate", {}),
      ).rejects.toMatchObject({
        kind: "protected",
        status: 400,
        retryable: false,
      })

      refuse(
        "Invalid requests[0].moveDimension: destinationIndex[2] must be outside the requested range[2-3]",
      )
      await expect(
        connectedClient().postJson("/sheet-1:batchUpdate", {}),
      ).rejects.toMatchObject({ kind: "unknown", status: 400 })
    })

    it("maps a lost answer to a network error", async () => {
      server.use(http.post(BATCH, () => HttpResponse.error()))

      await expect(
        connectedClient().postJson("/sheet-1:batchUpdate", {}),
      ).rejects.toMatchObject({ kind: "network" })
    })
  })
})
