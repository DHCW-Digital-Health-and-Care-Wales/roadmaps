import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { NAVIGATION_STORAGE_KEY } from "./navigation-preference"

// The shell's navigation (STY-054): a drawer on a phone (S5, D9), beside the page on a
// desktop and folding to a rail there (D5). What it lists is the roadmaps feature's,
// held in `roadmap-navigation.test.tsx`.

afterEach(() => {
  localStorage.clear()
})

const navigation = () => screen.getByRole("navigation", { name: "Roadmaps" })

describe("on a phone", () => {
  const menuButton = () =>
    within(screen.getByRole("banner")).getByRole("button", { name: "Menu" })

  it("opens the navigation as a drawer from the top bar, and closes back to its button", async () => {
    const user = userEvent.setup()
    await renderWithProviders()
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()

    await user.click(menuButton())

    const drawer = await screen.findByRole("dialog", { name: "Menu" })
    expect(within(drawer).getByRole("navigation")).toBe(navigation())
    expect(
      within(navigation()).getByRole("link", { name: "All roadmaps" }),
    ).toBeInTheDocument()
    await user.click(within(drawer).getByRole("button", { name: "Close menu" }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(menuButton()).toHaveFocus()
  })

  it("closes the drawer on Escape, back to its button", async () => {
    const user = userEvent.setup()
    await renderWithProviders()

    await user.click(menuButton())
    await screen.findByRole("dialog", { name: "Menu" })
    await user.keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(menuButton()).toHaveFocus()
  })

  it("closes the drawer when a link is chosen, and moves focus to the page it opens (S1)", async () => {
    const user = userEvent.setup()
    const { router } = await renderWithProviders()

    await user.click(menuButton())
    await screen.findByRole("dialog", { name: "Menu" })
    await user.click(
      within(navigation()).getByRole("link", {
        name: "Families, categories and organisations",
      }),
    )

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe("/families")
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus()
    })
  })

  it("stays open for a link opened elsewhere, with a modifier key", async () => {
    const user = userEvent.setup()
    await renderWithProviders()

    await user.click(menuButton())
    await screen.findByRole("dialog", { name: "Menu" })
    await user.keyboard("{Control>}")
    await user.click(
      within(navigation()).getByRole("link", {
        name: "Families, categories and organisations",
      }),
    )
    await user.keyboard("{/Control}")

    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument()
  })

  it("moves focus to the page even for a link to the page already open", async () => {
    const user = userEvent.setup()
    await renderWithProviders()

    await user.click(menuButton())
    await screen.findByRole("dialog", { name: "Menu" })
    await user.click(
      within(navigation()).getByRole("link", { name: "All roadmaps" }),
    )

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus()
    })
  })
})

describe("on a desktop", () => {
  it("stands beside the page, with no menu button", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    await renderWithProviders()

    expect(navigation()).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Menu" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Fold the navigation" }),
    ).toBeInTheDocument()
  })

  it("folds to a rail and opens again, keeping focus on its button and remembering the choice (D5)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const user = userEvent.setup()
    await renderWithProviders()

    await user.click(
      screen.getByRole("button", { name: "Fold the navigation" }),
    )

    const open = screen.getByRole("button", { name: "Open the navigation" })
    expect(open).toHaveFocus()
    expect(localStorage.getItem(NAVIGATION_STORAGE_KEY)).toBe("folded")
    // Folded, each destination keeps its name.
    expect(
      within(navigation()).getByRole("link", { name: "All roadmaps" }),
    ).toBeInTheDocument()

    await user.click(open)

    expect(
      screen.getByRole("button", { name: "Fold the navigation" }),
    ).toHaveFocus()
    expect(localStorage.getItem(NAVIGATION_STORAGE_KEY)).toBeNull()
  })

  it("starts folded when it was folded last on this device", async () => {
    localStorage.setItem(NAVIGATION_STORAGE_KEY, "folded")
    matchMediaQueries(DESKTOP_WIDTH)
    await renderWithProviders()

    expect(
      screen.getByRole("button", { name: "Open the navigation" }),
    ).toBeInTheDocument()
  })
})
