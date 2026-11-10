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
    [{ status: "initializing" }, "Getting ready…", "neutral"],
    [{ status: "ready" }, "Not connected", "neutral"],
    [{ status: "connecting" }, "Connecting…", "warning"],
    [{ status: "connected", expiresAt }, "Google connected", "success"],
    [{ status: "expired" }, "Session expired", "warning"],
    [
      { status: "error", error: "access-denied" },
      "Connection failed",
      "danger",
    ],
  ] as const satisfies readonly (readonly [AuthState, string, string])[])(
    "shows %j as a %s tag in the %s colours, always with text",
    (state, text, variant) => {
      renderWithI18n(
        <AuthProvider client={createFakeAuthClient(state)}>
          <ConnectionStatus />
        </AuthProvider>,
      )

      const tag = screen.getByRole("status")
      expect(tag).toHaveTextContent(text)
      expect(tag).toHaveClass(`bg-status-${variant}-bg`, "border")
    },
  )
})
