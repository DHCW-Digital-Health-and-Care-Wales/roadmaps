import { createHashHistory } from "@tanstack/react-router"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { authScopedQueryKey } from "@/features/auth/auth-scoped-queries"
import {
  disconnectFromHeader,
  openAccountMenu,
} from "@/features/auth/testing/account-menu"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

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
      main().getByRole("heading", { level: 1, name: "DHCW Roadmap Editor" }),
    ).toBeInTheDocument()
    expect(
      main().getByText(
        "Keep your products' public roadmaps up to date: now, next and later.",
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

  it("connects from the start page and shows the roadmaps", async () => {
    const user = userEvent.setup()
    const { authClient } = await renderWithProviders()

    await user.click(main().getByRole("button", { name: "Connect Google" }))

    expect(authClient.connect).toHaveBeenCalledOnce()
    expect(
      await screen.findByRole("heading", { level: 1, name: "Your roadmaps" }),
    ).toBeInTheDocument()
    // The roadmaps show it: no notice follows a connect (STY-056 S1).
    expect(main().queryByRole("note")).not.toBeInTheDocument()
  })

  it("waits, still focusable, while Google loads", async () => {
    await renderWithProviders({ authState: { status: "initializing" } })

    const connect = main().getByRole("button", { name: "Connect Google" })
    expect(connect).toHaveAttribute("aria-disabled", "true")
    expect(connect).toHaveAttribute("aria-busy", "true")
    expect(connect).not.toBeDisabled()
  })
})

describe("header", () => {
  it("announces the auth state, shows nothing of it, and offers its action in the menu", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ authState: { status: "expired" } })

    const announcement = header().getByRole("status")
    expect(announcement).toHaveTextContent("Session expired")
    expect(announcement).toHaveClass("sr-only")
    const menu = await openAccountMenu(user)
    expect(menu.getByRole("menuitem", { name: "Reconnect" })).toBeEnabled()
  })

  it("follows auth state changes", async () => {
    const { authClient } = await renderWithProviders()

    act(() => {
      authClient.setState({ status: "connecting" })
    })

    expect(header().getByRole("status")).toHaveTextContent("Connecting…")
  })

  it("disconnects, clearing only auth-scoped queries, and confirms it", async () => {
    const user = userEvent.setup()
    const { authClient, queryClient } = await renderWithProviders({
      authState: connected,
    })
    const scopedKey = [...authScopedQueryKey, "roadmaps"]
    queryClient.setQueryData(scopedKey, ["cached"])
    queryClient.setQueryData(["public"], "kept")

    await disconnectFromHeader(user)

    expect(authClient.disconnect).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(scopedKey)).toBeUndefined()
    expect(queryClient.getQueryData(["public"])).toBe("kept")
    expect(header().getByRole("status")).toHaveTextContent("Not connected")
    expect(main().getByRole("note")).toHaveTextContent(
      "Disconnected from Google",
    )
  })

  it("replaces the previous notice instead of stacking them", async () => {
    const user = userEvent.setup()
    await renderWithProviders()

    await user.click(main().getByRole("button", { name: "Connect Google" }))
    await disconnectFromHeader(user)
    await user.click(main().getByRole("button", { name: "Connect Google" }))
    await disconnectFromHeader(user)

    expect(main().getAllByRole("note")).toHaveLength(1)
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
      window.history.replaceState(null, "", "/#/roadmaps/producta")
      const { router } = await renderWithProviders({
        history: createHashHistory(),
      })

      await user.click(
        screen.getByRole("link", { name: "Skip to main content" }),
      )

      expect(screen.getByRole("main")).toHaveFocus()
      expect(window.location.hash).toBe("#/roadmaps/producta")
      expect(router.state.location.pathname).toBe("/roadmaps/producta")
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
    // A link home, not a button.
    expect(main().queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByRole("banner")).toBeInTheDocument()
  })

  it("leads from the not-found page's link to the landing page", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ path: "/no/such/page" })

    await user.click(
      await screen.findByRole("link", { name: "Go to the home page" }),
    )

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "DHCW Roadmap Editor",
      }),
    ).toBeInTheDocument()
  })

  it("routes /roadmaps/$roadmapId to the roadmap detail page", async () => {
    const { router } = await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      roadmaps: [createTestRoadmap("producta", "Product A roadmap")],
    })

    expect(router.state.location.pathname).toBe("/roadmaps/producta")
    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Product A roadmap",
      }),
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

  it("keeps focus in the content when Connect gives way to the roadmaps", async () => {
    const user = userEvent.setup()
    await renderWithProviders({
      roadmaps: [createTestRoadmap("producta", "Product A roadmap")],
    })
    main().getByRole("button", { name: "Connect Google" }).focus()

    await user.keyboard("{Enter}")

    expect(
      await main().findByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus()
    })
  })

  it("connects from the account menu, which keeps focus as its item changes", async () => {
    const user = userEvent.setup()
    const { authClient } = await renderWithProviders({
      roadmaps: [createTestRoadmap("producta", "Product A roadmap")],
    })

    const menu = await openAccountMenu(user)
    await user.click(menu.getByRole("menuitem", { name: "Connect Google" }))

    // Called inside the click, so the browser would allow Google's popup (ADR-003).
    expect(authClient.connect).toHaveBeenCalledOnce()
    expect(
      await main().findByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()
    expect(header().getByRole("button", { name: "Account" })).toHaveFocus()
  })

  it("moves focus to the new page's content after navigating, not on first load", async () => {
    const user = userEvent.setup()
    await renderWithProviders({
      authState: connected,
      roadmaps: [createTestRoadmap("producta", "Product A roadmap")],
    })
    expect(screen.getByRole("main")).not.toHaveFocus()

    await user.click(
      await main().findByRole("link", { name: "Product A roadmap" }),
    )
    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Product A roadmap",
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveFocus()

    await user.click(
      header().getByRole("link", { name: /Roadmap Editor home$/ }),
    )
    expect(
      await main().findByRole("heading", { level: 1, name: "Your roadmaps" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveFocus()
  })
})
