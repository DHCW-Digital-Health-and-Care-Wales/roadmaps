import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

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
  },
} as const satisfies Record<Language, unknown>

describe.each(["en", "cy"] as const)("the shell in %s", (language) => {
  const c = copy[language]
  const appInfo = { version: "1.2.3+abc1234" }

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

    it("lists the controls in order: menu, home link, status, language, account", async () => {
      await renderWithProviders({ language, appInfo, authState: connected })

      const header = within(screen.getByRole("banner"))
      const status = header.getByRole("status")
      const home = header.getByRole("link")
      const controls = header.getAllByRole("button")
      expect(controls).toHaveLength(3)
      const [menu, language_, account] = controls
      const follows = (a: Node | undefined, b: Node | undefined) =>
        Boolean(
          a &&
          b &&
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        )
      expect(menu).toHaveAccessibleName(c.menu)
      expect(account).toHaveAccessibleName(c.account)
      expect(follows(menu, home)).toBe(true)
      expect(follows(home, status)).toBe(true)
      expect(follows(status, language_)).toBe(true)
      expect(follows(language_, account)).toBe(true)
    })
  })

  describe("phase banner", () => {
    it("names the phase and invites feedback, with no link when no address is set", async () => {
      await renderWithProviders({ language, appInfo })

      expect(screen.getByText("Beta")).toBeInTheDocument()
      expect(screen.getByText(c.phaseText)).toBeInTheDocument()
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

    it("sits between the header and the main content", async () => {
      await renderWithProviders({ language, appInfo })

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
  })

  describe("footer", () => {
    it("names DHCW and shows the app's version", async () => {
      await renderWithProviders({ language, appInfo })

      const footer = within(screen.getByRole("contentinfo"))
      expect(footer.getByText(c.copyright)).toBeInTheDocument()
      expect(footer.getByText(c.version)).toBeInTheDocument()
    })

    it("has no repository link when no address is set", async () => {
      await renderWithProviders({ language, appInfo })

      expect(
        within(screen.getByRole("contentinfo")).queryByRole("link"),
      ).not.toBeInTheDocument()
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
