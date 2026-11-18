import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import {
  NAVIGATION_STORAGE_KEY,
  NAVIGATION_WIDTH_STORAGE_KEY,
} from "./navigation-preference"

// The shell's navigation (STY-054): a drawer on a phone (S5, D9), beside the page on a
// desktop and folding to a rail there (D5). What it lists is the roadmaps feature's,
// held in `roadmap-navigation.test.tsx`.

afterEach(() => {
  localStorage.clear()
})

const edge = () =>
  screen.queryByRole("separator", { name: "Resize the navigation" })

/** The width the bars pinned to the screen start after, as the page reads it. */
const barsStartAt = () =>
  document
    .querySelector<HTMLElement>("[data-navigation]")
    ?.style.getPropertyValue("--navigation-width")

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

  it("has no edge, and keeps the width it has, whatever width was remembered (S6)", async () => {
    localStorage.setItem(NAVIGATION_WIDTH_STORAGE_KEY, "320")
    const user = userEvent.setup()
    await renderWithProviders()

    await user.click(menuButton())

    await screen.findByRole("dialog", { name: "Menu" })
    expect(edge()).not.toBeInTheDocument()
    expect(barsStartAt()).toBeUndefined()
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

  describe("its width (STY-064)", () => {
    beforeEach(() => {
      // jsdom has no pointer capture.
      Element.prototype.setPointerCapture = vi.fn()
    })

    it("is 256px, with an edge that is its last stop (S4)", async () => {
      matchMediaQueries(DESKTOP_WIDTH)
      const user = userEvent.setup()
      await renderWithProviders()

      expect(barsStartAt()).toBe("256px")
      expect(edge()).toHaveAttribute("aria-valuenow", "256")
      const sidebar = document.querySelector<HTMLElement>(
        "[data-slot=navigation-sidebar]",
      )
      const stops = [
        ...(sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button, input, [tabindex='0']",
        ) ?? []),
      ]
      expect(stops.at(-1)).toBe(edge())
      // Tab from the last link in the list reaches it.
      stops.at(-2)?.focus()
      await user.tab()
      expect(edge()).toHaveFocus()
    })

    it("follows the edge, which the bars start after, and is remembered (S1, S5)", async () => {
      matchMediaQueries(DESKTOP_WIDTH)
      const user = userEvent.setup()
      await renderWithProviders()

      act(() => edge()?.focus())
      await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}")

      expect(barsStartAt()).toBe("320px")
      expect(localStorage.getItem(NAVIGATION_WIDTH_STORAGE_KEY)).toBe("320")
    })

    it("is as wide as last left on this device, after folding and opening again (S5)", async () => {
      localStorage.setItem(NAVIGATION_WIDTH_STORAGE_KEY, "320")
      matchMediaQueries(DESKTOP_WIDTH)
      const user = userEvent.setup()
      await renderWithProviders()
      expect(barsStartAt()).toBe("320px")

      await user.click(
        screen.getByRole("button", { name: "Fold the navigation" }),
      )
      expect(edge()).not.toBeInTheDocument()
      expect(barsStartAt()).toBe("")
      await user.click(
        screen.getByRole("button", { name: "Open the navigation" }),
      )

      expect(barsStartAt()).toBe("320px")
    })

    it("is 256px where the stored width is not readable (S5)", async () => {
      localStorage.setItem(NAVIGATION_WIDTH_STORAGE_KEY, "wide")
      matchMediaQueries(DESKTOP_WIDTH)
      await renderWithProviders()

      expect(barsStartAt()).toBe("256px")
    })

    it("has no edge in a rail (S6)", async () => {
      localStorage.setItem(NAVIGATION_STORAGE_KEY, "folded")
      matchMediaQueries(DESKTOP_WIDTH)
      await renderWithProviders()

      expect(edge()).not.toBeInTheDocument()
    })
  })
})
