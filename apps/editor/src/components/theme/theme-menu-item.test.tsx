import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { renderWithI18n } from "@/test/render-with-i18n"

import { ThemeProvider } from "./theme-provider"
import { THEME_STORAGE_KEY } from "./theme-preference"
import { ThemeMenuItem } from "./theme-menu-item"

function renderMenu() {
  return renderWithI18n(
    <ThemeProvider>
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <ThemeMenuItem />
        </DropdownMenuContent>
      </DropdownMenu>
    </ThemeProvider>,
  )
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Menu" }))
}

describe("ThemeMenuItem", () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  it("starts light, then switches to dark and remembers it", async () => {
    const user = userEvent.setup()
    renderMenu()
    expect(document.documentElement).not.toHaveClass("dark")
    await openMenu(user)

    await user.click(
      await screen.findByRole("menuitem", { name: "Switch to dark theme" }),
    )

    expect(document.documentElement).toHaveClass("dark")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    await openMenu(user)
    await user.click(
      await screen.findByRole("menuitem", { name: "Switch to light theme" }),
    )
    expect(document.documentElement).not.toHaveClass("dark")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
  })

  it("restores the stored theme", async () => {
    const user = userEvent.setup()
    localStorage.setItem(THEME_STORAGE_KEY, "dark")
    renderMenu()
    await openMenu(user)

    expect(document.documentElement).toHaveClass("dark")
    expect(
      await screen.findByRole("menuitem", { name: "Switch to light theme" }),
    ).toBeInTheDocument()
  })

  it("ignores an unknown stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia")
    renderMenu()

    expect(document.documentElement).not.toHaveClass("dark")
  })
})
