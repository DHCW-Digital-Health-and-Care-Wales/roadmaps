import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useTranslation } from "react-i18next"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { syncDocumentLanguage } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { LanguageSwitcher } from "./language-switcher"

function Harness() {
  const { t } = useTranslation()
  return (
    <>
      <LanguageSwitcher />
      <p>{t("auth.connect")}</p>
    </>
  )
}

describe("LanguageSwitcher", () => {
  let stopSync: () => void = () => undefined

  const originalTitle = document.title

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    stopSync()
    stopSync = () => undefined
    document.documentElement.lang = "en"
    document.title = originalTitle
    localStorage.clear()
  })

  it("names the trigger with the visible language", () => {
    renderWithI18n(<LanguageSwitcher />)
    expect(
      screen.getByRole("button", { name: "Language English" }),
    ).toBeInTheDocument()
  })

  it("switches language without a reload, updates <html lang> and remembers it", async () => {
    const user = userEvent.setup()
    const { i18n } = renderWithI18n(<Harness />)
    stopSync = syncDocumentLanguage(i18n)

    await user.click(screen.getByRole("button", { name: "Language English" }))
    const welsh = await screen.findByRole("menuitemradio", { name: "Cymraeg" })
    expect(welsh).toHaveAttribute("lang", "cy")
    expect(screen.getByRole("menuitemradio", { name: "English" })).toBeChecked()
    await user.click(welsh)

    expect(await screen.findByText("Cysylltu â Google")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Iaith Cymraeg" }),
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe("cy")
    expect(document.title).toBe("Golygydd Mapiau Trywydd IGDC")
    expect(localStorage.getItem("roadmaps.language")).toBe("cy")
  })

  it("can be operated with the keyboard", async () => {
    const user = userEvent.setup()
    renderWithI18n(<Harness />)

    await user.tab()
    expect(
      screen.getByRole("button", { name: "Language English" }),
    ).toHaveFocus()
    await user.keyboard("{Enter}")
    const welsh = await screen.findByRole("menuitemradio", { name: "Cymraeg" })
    await user.keyboard("{ArrowDown}")
    await vi.waitFor(() => {
      expect(welsh).toHaveFocus()
    })
    await user.keyboard("{Enter}")

    expect(await screen.findByText("Cysylltu â Google")).toBeInTheDocument()
    expect(localStorage.getItem("roadmaps.language")).toBe("cy")
  })

  it("remembers re-selecting the current language as an explicit choice", async () => {
    const user = userEvent.setup()
    renderWithI18n(<LanguageSwitcher />, { language: "cy" })

    await user.click(screen.getByRole("button", { name: "Iaith Cymraeg" }))
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Cymraeg" }),
    )

    expect(localStorage.getItem("roadmaps.language")).toBe("cy")
  })

  it("renders in Welsh when the instance starts in Welsh", () => {
    renderWithI18n(<Harness />, { language: "cy" })
    expect(
      screen.getByRole("button", { name: "Iaith Cymraeg" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Cysylltu â Google")).toBeInTheDocument()
  })
})
