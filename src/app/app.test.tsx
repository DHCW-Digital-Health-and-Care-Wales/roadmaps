import { createHashHistory } from "@tanstack/react-router"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "react"
import { afterEach, describe, expect, it } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import { authScopedQueryKey } from "@/features/auth/auth-scoped-queries"
import { renderWithProviders } from "@/test/render-with-providers"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

/** Sonner renders queued toasts on a timer; let it run before asserting absence. */
async function flushToasts() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
}

function header() {
  return within(screen.getByRole("banner"))
}

function main() {
  return within(screen.getByRole("main"))
}

afterEach(() => {
  localStorage.clear()
})

describe("landing page", () => {
  it("introduces the app and offers Connect when not connected", async () => {
    await renderWithProviders()

    expect(
      main().getByRole("heading", { level: 1, name: "Product Roadmaps" }),
    ).toBeInTheDocument()
    expect(
      main().getByText(
        "A simple way to explore and manage your product roadmaps.",
      ),
    ).toBeInTheDocument()
    expect(
      main().getByText(
        "Your roadmaps are currently sourced from Google Sheets.",
      ),
    ).toBeInTheDocument()
    expect(
      main().getByText(
        "You'll need to connect Google so the app can load your roadmaps.",
      ),
    ).toBeInTheDocument()
    expect(main().getByRole("button", { name: "Connect Google" })).toBeEnabled()
  })

  it("connects from the hero, toasts once and shows the roadmaps slot", async () => {
    const user = userEvent.setup()
    const { authClient } = await renderWithProviders()

    await user.click(main().getByRole("button", { name: "Connect Google" }))

    expect(authClient.connect).toHaveBeenCalledOnce()
    expect(
      await screen.findByRole("heading", { level: 1, name: "Your Roadmaps" }),
    ).toBeInTheDocument()
    expect(await screen.findByText("Connected to Google")).toBeInTheDocument()
  })

  it("waits, still focusable, while Google loads", async () => {
    await renderWithProviders({ authState: { status: "initializing" } })

    const connect = main().getByRole("button", { name: "Connect Google" })
    expect(connect).toHaveAttribute("aria-disabled", "true")
    expect(connect).toHaveAttribute("aria-busy", "true")
    expect(connect).not.toBeDisabled()
  })

  it.each<[AuthState, string]>([
    [
      { status: "error", error: "script-load-failed" },
      "Google couldn't be reached. Check your internet connection and try again.",
    ],
    [
      { status: "ready", lastError: "popup-closed" },
      "The Google window was closed before connecting finished.",
    ],
  ])("explains why it is not connected (%j)", async (authState, notice) => {
    await renderWithProviders({ authState })

    expect(main().getByText(notice)).toBeInTheDocument()
  })

  it("renders in Welsh", async () => {
    await renderWithProviders({ language: "cy" })

    expect(
      main().getByRole("heading", {
        level: 1,
        name: "Mapiau Trywydd Cynnyrch",
      }),
    ).toBeInTheDocument()
    expect(
      main().getByRole("button", { name: "Cysylltu â Google" }),
    ).toBeInTheDocument()
    expect(header().getByRole("status")).toHaveTextContent("Heb gysylltu")
  })
})

describe("header", () => {
  it.each<[AuthState, string, string]>([
    [{ status: "initializing" }, "Getting ready…", "Connect Google"],
    [{ status: "ready" }, "Not connected", "Connect Google"],
    [{ status: "connecting" }, "Connecting…", "Connect Google"],
    [connected, "Google connected", "Disconnect"],
    [{ status: "expired" }, "Session expired", "Reconnect"],
    [
      { status: "error", error: "unknown" },
      "Connection failed",
      "Connect Google",
    ],
  ])("reflects the %j auth state", async (authState, status, action) => {
    await renderWithProviders({ authState })

    expect(header().getByRole("status")).toHaveTextContent(status)
    expect(header().getByRole("button", { name: action })).toBeInTheDocument()
  })

  it("follows auth state changes", async () => {
    const { authClient } = await renderWithProviders()

    act(() => {
      authClient.setState({ status: "connecting" })
    })

    expect(header().getByRole("status")).toHaveTextContent("Connecting…")
  })

  it("disconnects, clearing only auth-scoped queries, with one toast", async () => {
    const user = userEvent.setup()
    const { authClient, queryClient } = await renderWithProviders({
      authState: connected,
    })
    const scopedKey = [...authScopedQueryKey, "roadmaps"]
    queryClient.setQueryData(scopedKey, ["cached"])
    queryClient.setQueryData(["public"], "kept")

    await user.click(header().getByRole("button", { name: "Disconnect" }))

    expect(authClient.disconnect).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(scopedKey)).toBeUndefined()
    expect(queryClient.getQueryData(["public"])).toBe("kept")
    expect(header().getByRole("status")).toHaveTextContent("Not connected")
    expect(
      await screen.findByText("Disconnected from Google"),
    ).toBeInTheDocument()
  })

  it("toasts a failed connection, but not a closed popup", async () => {
    const { authClient } = await renderWithProviders({
      authState: { status: "connecting" },
    })

    act(() => {
      authClient.setState({ status: "ready", lastError: "popup-closed" })
    })
    await flushToasts()
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()

    act(() => {
      authClient.setState({ status: "connecting" })
    })
    act(() => {
      authClient.setState({ status: "error", error: "access-denied" })
    })
    const message = "Access wasn't granted, so your roadmaps can't be loaded."
    expect(
      await within(
        screen.getByRole("region", { name: /Notifications/ }),
      ).findByText(message),
    ).toBeInTheDocument()
  })

  it("switches the language from the header", async () => {
    const user = userEvent.setup()
    await renderWithProviders()

    await user.click(header().getByRole("button", { name: "Language English" }))
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Cymraeg" }),
    )

    expect(
      await main().findByRole("button", { name: "Cysylltu â Google" }),
    ).toBeInTheDocument()
  })

  it("links the product name to the home page", async () => {
    await renderWithProviders({ path: "/roadmaps/7" })

    expect(
      header().getByRole("link", { name: "Product Roadmaps home" }),
    ).toHaveAttribute("href", "/")
  })
})

describe("routes", () => {
  describe("with hash history", () => {
    afterEach(() => {
      window.history.replaceState(null, "", "/")
    })

    it("renders the not-found page for an unknown hash path", async () => {
      window.history.replaceState(null, "", "/#/no/such/page")
      await renderWithProviders({ history: createHashHistory() })

      expect(
        main().getByRole("heading", { name: "Page not found" }),
      ).toBeInTheDocument()
    })

    it("keeps the route when the skip link moves focus", async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, "", "/#/roadmaps/7")
      const { router } = await renderWithProviders({
        history: createHashHistory(),
      })

      await user.click(
        screen.getByRole("link", { name: "Skip to main content" }),
      )

      expect(screen.getByRole("main")).toHaveFocus()
      expect(window.location.hash).toBe("#/roadmaps/7")
      expect(router.state.location.pathname).toBe("/roadmaps/7")
    })
  })

  it("renders the not-found page inside the shell for an unknown path", async () => {
    await renderWithProviders({ path: "/no/such/page" })

    expect(
      main().getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument()
    expect(
      main().getByRole("link", { name: "Go to the home page" }),
    ).toHaveAttribute("href", "/")
    expect(screen.getByRole("banner")).toBeInTheDocument()
  })

  it("routes /roadmaps/$roadmapId to the roadmap detail page", async () => {
    const { router } = await renderWithProviders({
      path: "/roadmaps/7",
      authState: connected,
      roadmaps: [{ id: "7", name: "Platform" }],
    })

    expect(router.state.location.pathname).toBe("/roadmaps/7")
    expect(
      await main().findByRole("heading", { level: 1, name: "Platform" }),
    ).toBeInTheDocument()
  })

  it("moves focus to the main content from the skip link", async () => {
    const user = userEvent.setup()
    const { router } = await renderWithProviders()

    await user.tab()
    const skip = screen.getByRole("link", { name: "Skip to main content" })
    expect(skip).toHaveFocus()
    await user.keyboard("{Enter}")

    expect(screen.getByRole("main")).toHaveFocus()
    expect(router.state.location.pathname).toBe("/")
  })
})
