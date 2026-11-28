import type { ErrorCode } from "@roadmaps/api-types"
import { describe, expect, it } from "vitest"

import type { AppErrorKind } from "@/lib/errors"

import { toApiError } from "./api-error"

type Mapping = readonly [kind: AppErrorKind, retryable: boolean]

/** Each code the API's contract names, with the status the API sends it with. */
const CODES: Readonly<Record<ErrorCode, readonly [number, ...Mapping]>> = {
  "auth.unauthenticated": [401, "unauthenticated", false],
  "auth.person_mismatch": [409, "unauthenticated", false],
  "auth.provider_not_enabled": [400, "unknown", false],
  "auth.provider_unavailable": [503, "unknown", true],
  "authz.forbidden": [403, "forbidden", false],
  "request.origin_not_allowed": [403, "unknown", false],
  "request.unsupported_media_type": [415, "unknown", false],
  "request.not_found": [404, "not-found", false],
  "request.method_not_allowed": [405, "unknown", false],
  "request.invalid": [422, "unknown", false],
  "service.not_ready": [503, "unknown", true],
  "server.internal_error": [500, "unknown", true],
}

function envelope(status: number, code: string): Response {
  return Response.json(
    { detail: "A sentence about the refusal.", code, params: {} },
    { status },
  )
}

function plainText(status: number): Response {
  return new Response("Invalid host header", {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

function html(status: number): Response {
  return new Response("<html><h1>413 Request Entity Too Large</h1></html>", {
    status,
    headers: { "Content-Type": "text/html" },
  })
}

describe("toApiError", () => {
  it.each(Object.entries(CODES))(
    "maps the envelope's %s",
    async (code, [status, kind, retryable]) => {
      const error = await toApiError(envelope(status, code))

      expect(error).toMatchObject({ kind, retryable, status })
      expect(error.message).toContain(code)
    },
  )

  it("maps an envelope by its code, whatever its status", async () => {
    const error = await toApiError(envelope(401, "server.internal_error"))

    expect(error).toMatchObject({ kind: "unknown", retryable: true })
  })

  it.each<[string, () => Response, ...Mapping]>([
    [
      "the Host allow-list's plain-text 400",
      () => plainText(400),
      "unknown",
      false,
    ],
    ["the body limit's plain-text 413", () => plainText(413), "unknown", false],
    ["a proxy's HTML 413", () => html(413), "unknown", false],
    ["an edge's 401", () => html(401), "unauthenticated", false],
    ["an edge's 403", () => html(403), "forbidden", false],
    ["an edge's 404", () => html(404), "not-found", false],
    ["an edge's 429", () => html(429), "rate-limited", true],
    ["an edge's 500", () => html(500), "unknown", true],
    ["an edge's 502", () => html(502), "unknown", true],
    ["an edge's 599", () => plainText(599), "unknown", true],
    [
      "a code the editor does not know yet, on a 404",
      () => envelope(404, "roadmap.new_code"),
      "not-found",
      false,
    ],
    [
      "a code the editor does not know yet, on a 503",
      () => envelope(503, "roadmap.new_code"),
      "unknown",
      true,
    ],
    [
      "a code the editor does not know yet, on a 409",
      () => envelope(409, "roadmap.new_code"),
      "invalid-response",
      false,
    ],
    [
      "a code named as an object's own member",
      () => envelope(418, "toString"),
      "invalid-response",
      false,
    ],
    [
      "an envelope short of its params",
      () =>
        Response.json(
          { detail: "d", code: "server.internal_error" },
          { status: 409 },
        ),
      "invalid-response",
      false,
    ],
    [
      "malformed JSON",
      () =>
        new Response('{"code":', {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      "invalid-response",
      false,
    ],
    [
      "JSON that is no object",
      () => Response.json(null, { status: 409 }),
      "invalid-response",
      false,
    ],
    [
      "an empty body",
      () => new Response(null, { status: 418 }),
      "invalid-response",
      false,
    ],
    [
      "a body that breaks off",
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new TypeError("connection reset"))
            },
          }),
          { status: 502 },
        ),
      "unknown",
      true,
    ],
    [
      "a redirect",
      () => Response.redirect("https://example.test/", 302),
      "invalid-response",
      false,
    ],
    ["status 0", () => Response.error(), "invalid-response", false],
  ])(
    "falls back by status for %s",
    async (_name, response, kind, retryable) => {
      const answered = response()

      const error = await toApiError(answered)

      expect(error).toMatchObject({ kind, retryable, status: answered.status })
    },
  )

  it("never puts the body's text in the error's message", async () => {
    const planted = "PLANTED-7f3a"
    const responses = [
      new Response(planted, { status: 500 }),
      envelope(500, planted),
      Response.json(
        { detail: planted, code: "server.internal_error", params: { planted } },
        { status: 500 },
      ),
    ]

    for (const response of responses) {
      const error = await toApiError(response)
      expect(error.message).not.toContain(planted)
      expect(error.cause).toBeUndefined()
    }
  })
})
