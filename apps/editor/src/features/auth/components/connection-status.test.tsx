import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import { renderWithI18n } from "@/test/render-with-i18n"

import { AuthProvider } from "../auth-provider"
import { createFakeAuthClient } from "../testing/fake-auth-client"
import { ConnectionStatus } from "./connection-status"

const expiresAt = Date.now() + 3_600_000

describe("ConnectionStatus", () => {
  it.each([
    [{ status: "initializing" }, "Getting ready…"],
    [{ status: "ready" }, "Not connected"],
    [{ status: "connecting" }, "Connecting…"],
    [{ status: "connected", expiresAt }, "Google connected"],
    [{ status: "expired" }, "Session expired"],
    [{ status: "error", error: "access-denied" }, "Connection failed"],
  ] as const satisfies readonly (readonly [AuthState, string])[])(
    "announces %j as %s, to assistive technology only (STY-056 S1)",
    (state, text) => {
      renderWithI18n(
        <AuthProvider client={createFakeAuthClient(state)}>
          <ConnectionStatus />
        </AuthProvider>,
      )

      const status = screen.getByRole("status")
      expect(status).toHaveTextContent(text)
      expect(status).toHaveClass("sr-only")
    },
  )

  it("announces in Welsh", () => {
    renderWithI18n(
      <AuthProvider client={createFakeAuthClient({ status: "ready" })}>
        <ConnectionStatus />
      </AuthProvider>,
      { language: "cy" },
    )

    expect(screen.getByRole("status")).toHaveTextContent("Heb gysylltu")
  })
})
