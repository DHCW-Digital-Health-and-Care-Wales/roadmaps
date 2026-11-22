import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { EditSurfaceMenuItem } from "./edit-surface-menu-item"
import { EDIT_SURFACE_STORAGE_KEY } from "./edit-surface-preference"
import { EditSurfaceProvider } from "./edit-surface-provider"
import { useEditSurface } from "./use-edit-surface"

/** What a form dialog reads: where the forms open now. */
function Surface() {
  return <p data-testid="surface">{useEditSurface().surface}</p>
}

function renderMenu(language?: Language) {
  return renderWithI18n(
    <EditSurfaceProvider>
      <Surface />
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <EditSurfaceMenuItem />
        </DropdownMenuContent>
      </DropdownMenu>
    </EditSurfaceProvider>,
    { language },
  )
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Menu" }))
}

const surface = () => screen.getByTestId("surface").textContent

describe("EditSurfaceMenuItem (STY-083)", () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("opens the forms as a side panel and offers the dialog, with an icon, until one is chosen (S1, S2)", async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)

    const item = await screen.findByRole("menuitem", {
      name: "Edit in a dialog",
    })

    expect(surface()).toBe("panel")
    expect(item.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(
      screen.queryByRole("menuitem", { name: "Edit in a side panel" }),
    ).not.toBeInTheDocument()
  })

  it("closes the menu and hands focus back to its trigger when the dialog is chosen (S2)", async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)

    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a dialog" }),
    )

    expect(surface()).toBe("dialog")
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus()
  })

  it("offers the way back, which makes the forms open as the side panel again (S3)", async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)
    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a dialog" }),
    )
    await openMenu(user)

    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a side panel" }),
    )

    expect(surface()).toBe("panel")
    expect(localStorage.getItem(EDIT_SURFACE_STORAGE_KEY)).toBeNull()
  })

  it("keeps the dialog in this browser, so a reload still opens dialogs (S4)", async () => {
    const user = userEvent.setup()
    const first = renderMenu()
    await openMenu(user)
    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a dialog" }),
    )
    expect(localStorage.getItem(EDIT_SURFACE_STORAGE_KEY)).toBe("dialog")
    first.unmount()

    renderMenu()
    await openMenu(user)

    expect(surface()).toBe("dialog")
    expect(
      await screen.findByRole("menuitem", { name: "Edit in a side panel" }),
    ).toBeInTheDocument()
  })

  it("still opens the side panel for a browser that chose it under STY-077 (S5)", () => {
    localStorage.setItem(EDIT_SURFACE_STORAGE_KEY, "panel")
    renderMenu()

    expect(surface()).toBe("panel")
  })

  it("ignores an unknown stored value (S5)", () => {
    localStorage.setItem(EDIT_SURFACE_STORAGE_KEY, "drawer")
    renderMenu()

    expect(surface()).toBe("panel")
  })

  it("opens the side panel where storage can't be read, and reports nothing (S4)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    renderMenu()

    expect(surface()).toBe("panel")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("keeps the forms as the side panel where storage can't be written, and reports nothing (S4)", async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError")
    })
    renderMenu()
    await openMenu(user)

    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a dialog" }),
    )

    expect(surface()).toBe("panel")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("names both ways in Welsh", async () => {
    const user = userEvent.setup()
    renderMenu("cy")
    await user.click(screen.getByRole("button", { name: "Menu" }))
    await user.click(
      await screen.findByRole("menuitem", { name: "Golygu mewn deialog" }),
    )
    await user.click(screen.getByRole("button", { name: "Menu" }))

    expect(
      await screen.findByRole("menuitem", { name: "Golygu mewn panel ochr" }),
    ).toBeInTheDocument()
  })
})
