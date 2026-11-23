import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest"

import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

afterEach(() => {
  localStorage.clear()
})

/** Each language's DHCW name, home link label and shell copy, from the catalogues. */
const copy = {
  en: {
    logo: "Digital Health and Care Wales",
    homeWord: "home",
    name: "Roadmap Editor",
    shortName: "Roadmaps",
    phaseText: "This is a new service. Your feedback will help us improve it.",
    feedback: "Give feedback",
    repository: "View on GitHub",
    opensInNewTab: "(opens in a new tab)",
    copyright: "© Digital Health and Care Wales",
    version: "Version 1.2.3+abc1234",
    menu: "Menu",
    account: "Account",
    dismiss: "Dismiss message",
  },
  cy: {
    logo: "Iechyd a Gofal Digidol Cymru",
    homeWord: "hafan",
    name: "Golygydd Mapiau Trywydd",
    shortName: "Mapiau Trywydd",
    phaseText:
      "Mae hwn yn wasanaeth newydd. Bydd eich adborth yn ein helpu i'w wella.",
    feedback: "Rhoi adborth",
    repository: "Gweld ar GitHub",
    opensInNewTab: "(yn agor mewn tab newydd)",
    copyright: "© Iechyd a Gofal Digidol Cymru",
    version: "Fersiwn 1.2.3+abc1234",
    menu: "Dewislen",
    account: "Cyfrif",
    dismiss: "Cau'r neges",
  },
} as const satisfies Record<Language, unknown>

const appInfo = { version: "1.2.3+abc1234" }

/** What the shell says in each language: its copy, with the structure it holds below. */
describe.each(["en", "cy"] as const)("the shell in %s", (language) => {
  const c = copy[language]

  describe("header", () => {
    it("shows the DHCW logo, named for the organisation", async () => {
      await renderWithProviders({ language, appInfo })

      const logo = within(screen.getByRole("banner")).getByRole("img", {
        name: c.logo,
      })
      // The full logo from `sm`, the icon below, in one picture.
      expect(logo.closest("picture")?.querySelector("source")).toHaveAttribute(
        "media",
        "(min-width: 40rem)",
      )
    })

    it('has one home link named by the names it shows, then "home" (DEF-002)', async () => {
      await renderWithProviders({ language, appInfo })

      // jsdom applies no stylesheet, so both visible names are in the name here; the
      // per-width names are held by tests/e2e/shell.spec.ts.
      const home = within(screen.getByRole("banner")).getByRole("link", {
        name: new RegExp(`${c.name} ${c.homeWord}$`),
      })
      expect(home).toHaveAttribute("href", "/")
      // The visible names: the header's own (from `sm`) and the short one below it.
      expect(home).toHaveTextContent(c.name)
      expect(home).toHaveTextContent(c.shortName)
    })

    it("names its menu and account buttons", async () => {
      await renderWithProviders({ language, appInfo, authState: connected })

      const [menu, , account] = within(screen.getByRole("banner")).getAllByRole(
        "button",
      )
      expect(menu).toHaveAccessibleName(c.menu)
      expect(account).toHaveAccessibleName(c.account)
    })
  })

  describe("phase banner", () => {
    it("names the phase and invites feedback, with no link when no address is set", async () => {
      await renderWithProviders({ language, appInfo })

      expect(screen.getByText("Beta")).toBeInTheDocument()
      expect(screen.getByText(c.phaseText)).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: c.dismiss }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole("link", { name: new RegExp(c.feedback) }),
      ).not.toBeInTheDocument()
    })

    it("links to the feedback address, in a new tab, when one is set", async () => {
      await renderWithProviders({
        language,
        appInfo: { ...appInfo, feedbackUrl: "https://example.org/feedback" },
      })

      const link = screen.getByRole("link", { name: new RegExp(c.feedback) })
      expect(link).toHaveAttribute("href", "https://example.org/feedback")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })
  })

  describe("footer", () => {
    it("names DHCW and shows the app's version", async () => {
      await renderWithProviders({ language, appInfo })

      const footer = within(screen.getByRole("contentinfo"))
      expect(footer.getByText(c.copyright)).toBeInTheDocument()
      expect(footer.getByText(c.version)).toBeInTheDocument()
    })

    it("links to the repository, in a new tab, when an address is set", async () => {
      await renderWithProviders({
        language,
        appInfo: { ...appInfo, repositoryUrl: "https://example.org/repo" },
      })

      const link = within(screen.getByRole("contentinfo")).getByRole("link", {
        name: `${c.repository} ${c.opensInNewTab}`,
      })
      expect(link).toHaveAttribute("href", "https://example.org/repo")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("shows dev for a local build", async () => {
      await renderWithProviders({ language, appInfo: { version: "dev" } })

      const footer = within(screen.getByRole("contentinfo"))
      expect(
        footer.getByText(language === "en" ? "Version dev" : "Fersiwn dev"),
      ).toBeInTheDocument()
    })
  })
})

/** What nothing in a language changes: held once, in English. */
describe("the shell's structure", () => {
  const c = copy.en

  it("lists the header's controls in order: menu, home link, status, language, account", async () => {
    await renderWithProviders({ appInfo, authState: connected })

    const header = within(screen.getByRole("banner"))
    const status = header.getByRole("status")
    const home = header.getByRole("link")
    const controls = header.getAllByRole("button")
    expect(controls).toHaveLength(3)
    const [menu, language, account] = controls
    const follows = (a: Node | undefined, b: Node | undefined) =>
      Boolean(
        a &&
        b &&
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
      )
    expect(follows(menu, home)).toBe(true)
    expect(follows(home, status)).toBe(true)
    expect(follows(status, language)).toBe(true)
    expect(follows(language, account)).toBe(true)
  })

  it("sits the phase banner between the header and the main content", async () => {
    await renderWithProviders({ appInfo })

    const beta = screen.getByText("Beta")
    expect(
      screen.getByRole("banner").compareDocumentPosition(beta) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      beta.compareDocumentPosition(screen.getByRole("main")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("dismisses the phase banner by its button, which moves focus to the page's content (STY-065 S8)", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ appInfo })

    await user.click(screen.getByRole("button", { name: c.dismiss }))

    expect(screen.queryByText(c.phaseText)).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: c.dismiss }),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus()
    })
  })

  it("keeps the phase banner away after an in-app navigation, while the app stays loaded (STY-065 S8)", async () => {
    const user = userEvent.setup()
    const { router } = await renderWithProviders({ appInfo })
    await user.click(screen.getByRole("button", { name: c.dismiss }))

    await act(async () => {
      await router.navigate({ to: "/families" })
    })

    expect(router.state.location.pathname).toBe("/families")
    expect(screen.queryByText(c.phaseText)).not.toBeInTheDocument()
  })

  it("shows the phase banner again once the app is loaded again, as nothing is stored (STY-065 S8, D11)", async () => {
    const user = userEvent.setup()
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    onTestFinished(() => {
      setItem.mockRestore()
    })
    const first = await renderWithProviders({ appInfo })
    await user.click(screen.getByRole("button", { name: c.dismiss }))
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
    first.unmount()

    await renderWithProviders({ appInfo })

    expect(screen.getByText(c.phaseText)).toBeInTheDocument()
  })

  it("has no repository link in the footer when no address is set", async () => {
    await renderWithProviders({ appInfo })

    expect(
      within(screen.getByRole("contentinfo")).queryByRole("link"),
    ).not.toBeInTheDocument()
  })
})
