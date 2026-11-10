import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { renderWithI18n } from "@/test/render-with-i18n"

import { ThemeProvider } from "./theme-provider"
import { THEME_STORAGE_KEY } from "./theme-preference"
import { ThemeToggle } from "./theme-toggle"

function renderToggle() {
  return renderWithI18n(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe("ThemeToggle", () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  it("starts light, then switches to dark and remembers it", async () => {
    const user = userEvent.setup()
    renderToggle()
    expect(document.documentElement).not.toHaveClass("dark")

    await user.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    )

    expect(document.documentElement).toHaveClass("dark")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark")
    await user.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    )
    expect(document.documentElement).not.toHaveClass("dark")
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
  })

  it("restores the stored theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark")
    renderToggle()

    expect(document.documentElement).toHaveClass("dark")
    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument()
  })

  it("ignores an unknown stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia")
    renderToggle()

    expect(document.documentElement).not.toHaveClass("dark")
  })
})
