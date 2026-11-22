import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { EditSurfaceProvider } from "@/components/edit-surface/edit-surface-provider"
import { ThemeProvider } from "@/components/theme/theme-provider"
import type { AuthState } from "@/domain/auth/auth-client"
import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { renderWithI18n } from "@/test/render-with-i18n"

import { AuthProvider } from "../auth-provider"
import { openAccountMenu } from "../testing/account-menu"
import { createFakeAuthClient } from "../testing/fake-auth-client"
import { AccountMenu } from "./account-menu"

async function openMenu(
  state: AuthState,
  { language }: { language?: Language } = {},
) {
  const user = userEvent.setup()
  const client = createFakeAuthClient(state)
  renderWithI18n(
    <AuthProvider client={client}>
      <ThemeProvider>
        <EditSurfaceProvider>
          <AccountMenu />
        </EditSurfaceProvider>
      </ThemeProvider>
    </AuthProvider>,
    { language },
  )
  await openAccountMenu(user, language === "cy" ? "Cyfrif" : "Account")
  return { user, client }
}

describe("AccountMenu", () => {
  it("offers the theme, where the forms open and Disconnect while connected (S2)", async () => {
    const { user, client } = await openMenu(connected)

    expect(screen.getAllByRole("menuitem")).toHaveLength(3)
    expect(
      screen.getByRole("menuitem", { name: "Switch to dark theme" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: "Edit in a dialog" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("menuitem", { name: "Disconnect" }))

    // After the menu has closed, so a question it asks keeps its focus.
    await waitFor(() => {
      expect(client.disconnect).toHaveBeenCalledOnce()
    })
  })

  it.each<[AuthState, string]>([
    [{ status: "ready" }, "Connect Google"],
    [{ status: "error", error: "access-denied" }, "Connect Google"],
    [{ status: "expired" }, "Reconnect"],
  ])(
    "offers Connect in place of Disconnect when the session is %j, calling connect() in the click (S3)",
    async (state, name) => {
      const { user, client } = await openMenu(state)

      await user.click(screen.getByRole("menuitem", { name }))

      expect(client.connect).toHaveBeenCalledOnce()
      expect(
        screen.queryByRole("menuitem", { name: "Disconnect" }),
      ).not.toBeInTheDocument()
    },
  )

  it.each<AuthState>([{ status: "initializing" }, { status: "connecting" }])(
    "waits while the session is %j",
    async (state) => {
      const { user, client } = await openMenu(state)

      const item = screen.getByRole("menuitem", { name: "Connect Google" })
      expect(item).toHaveAttribute("aria-disabled", "true")
      await user.click(item)
      expect(client.connect).not.toHaveBeenCalled()
    },
  )

  it("is in Welsh (S4)", async () => {
    await openMenu(connected, { language: "cy" })

    expect(
      screen.getByRole("menuitem", { name: "Newid i'r thema dywyll" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: "Datgysylltu" }),
    ).toBeInTheDocument()
  })
})
