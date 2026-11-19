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
import { useEditSurface } from "./use-edit-surface"
import { EDIT_SURFACE_STORAGE_KEY } from "./edit-surface-preference"
import { EditSurfaceProvider } from "./edit-surface-provider"

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

describe("EditSurfaceMenuItem (STY-077)", () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("offers the side panel, with an icon, while the forms open as dialogs (S1)", async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)

    const item = await screen.findByRole("menuitem", {
      name: "Edit in a side panel",
    })

    expect(surface()).toBe("dialog")
    expect(item.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("closes the menu and hands focus back to its trigger when chosen (S1)", async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)

    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a side panel" }),
    )

    expect(surface()).toBe("panel")
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus()
  })

  it("offers the way back, which makes the forms open as dialogs again (S5)", async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)
    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a side panel" }),
    )
    await openMenu(user)

    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a dialog" }),
    )

    expect(surface()).toBe("dialog")
    expect(localStorage.getItem(EDIT_SURFACE_STORAGE_KEY)).toBeNull()
  })

  it("keeps the choice in this browser, so a reload still opens the panel (S6)", async () => {
    const user = userEvent.setup()
    const first = renderMenu()
    await openMenu(user)
    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a side panel" }),
    )
    expect(localStorage.getItem(EDIT_SURFACE_STORAGE_KEY)).toBe("panel")
    first.unmount()

    renderMenu()
    await openMenu(user)

    expect(surface()).toBe("panel")
    expect(
      await screen.findByRole("menuitem", { name: "Edit in a dialog" }),
    ).toBeInTheDocument()
  })

  it("ignores an unknown stored value (S6)", () => {
    localStorage.setItem(EDIT_SURFACE_STORAGE_KEY, "drawer")
    renderMenu()

    expect(surface()).toBe("dialog")
  })

  it("opens forms as dialogs where storage can't be read, and reports nothing (S6)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError")
    })
    renderMenu()

    expect(surface()).toBe("dialog")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("keeps forms opening as dialogs where storage can't be written, and reports nothing (S6)", async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError")
    })
    renderMenu()
    await openMenu(user)

    await user.click(
      await screen.findByRole("menuitem", { name: "Edit in a side panel" }),
    )

    expect(surface()).toBe("dialog")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("names both ways in Welsh (S11)", async () => {
    const user = userEvent.setup()
    renderMenu("cy")
    await user.click(screen.getByRole("button", { name: "Menu" }))
    await user.click(
      await screen.findByRole("menuitem", { name: "Golygu mewn panel ochr" }),
    )
    await user.click(screen.getByRole("button", { name: "Menu" }))

    expect(
      await screen.findByRole("menuitem", { name: "Golygu mewn deialog" }),
    ).toBeInTheDocument()
  })
})
