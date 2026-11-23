// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useLanguage, useStrings } from "../i18n"
import { LanguageProvider } from "./language-provider"
import { LanguageToggle } from "./language-toggle"

function Probe() {
  const { lang, route } = useLanguage()
  const strings = useStrings()
  return (
    <>
      <p>
        {lang} {route.slug}
      </p>
      <p>{strings.site.backToTop}</p>
    </>
  )
}

const renderAt = (url: string) => {
  window.history.replaceState(null, "", url)
  return render(
    <LanguageProvider>
      <Probe />
      <LanguageToggle />
    </LanguageProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("LanguageProvider", () => {
  it("takes the language from the path", () => {
    renderAt("/product-roadmaps/cy/a/")
    expect(screen.getByText("cy a")).toBeTruthy()
    expect(document.documentElement.lang).toBe("cy")
  })

  it("uses the default outside a language folder", () => {
    renderAt("/product-roadmaps/a/")
    expect(screen.getByText("en a")).toBeTruthy()
  })
})

describe("LanguageToggle", () => {
  it("links to the same page in each language", () => {
    renderAt("/product-roadmaps/en/a/")
    const welsh = screen.getByRole("link", { name: "Cymraeg" })
    const english = screen.getByRole("link", { name: "English" })
    expect(welsh.getAttribute("href")).toBe("/product-roadmaps/cy/a/")
    expect(welsh.getAttribute("aria-current")).toBeNull()
    expect(english.getAttribute("aria-current")).toBe("page")
  })

  it("switches without a reload, keeping the place on the page", () => {
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined)
    renderAt("/product-roadmaps/en/a/#roadmap")
    fireEvent.click(screen.getByRole("link", { name: "Cymraeg" }))

    expect(window.location.pathname).toBe("/product-roadmaps/cy/a/")
    expect(window.location.hash).toBe("#roadmap")
    expect(scrollTo).not.toHaveBeenCalled()
    expect(screen.getByText("cy a")).toBeTruthy()
    expect(screen.getByText("Nôl i’r brig")).toBeTruthy()
    expect(document.documentElement.lang).toBe("cy")
    expect(window.localStorage.getItem("dhcw-product-roadmaps-lang")).toBe("cy")
  })

  it("goes back to the other language with the browser's Back", async () => {
    window.history.pushState(null, "", "/elsewhere/")
    renderAt("/product-roadmaps/en/a/#roadmap")
    fireEvent.click(screen.getByRole("link", { name: "Cymraeg" }))
    expect(screen.getByText("cy a")).toBeTruthy()

    window.history.back()
    await waitFor(() => {
      expect(screen.getByText("en a")).toBeTruthy()
    })
    expect(document.documentElement.lang).toBe("en")
    expect(window.location.pathname).toBe("/product-roadmaps/en/a/")
  })

  it("adds no history entry for the current language", () => {
    renderAt("/product-roadmaps/en/a/")
    const before = window.history.length
    fireEvent.click(screen.getByRole("link", { name: "English" }))
    expect(window.history.length).toBe(before)
  })
})
