import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { disconnectFromHeader } from "@/features/auth/testing/account-menu"
import { createI18n } from "@/i18n"
import { DESKTOP_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { roadmapKeys } from "../hooks/roadmap-queries"
import { holdCall } from "../testing/held-call"
import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { change } from "../testing/change-roadmap"
import { editItemText } from "../testing/item-dialog"

// STY-055: which roadmaps have unpublished changes, from any page: a dot on each in the
// shell's navigation and under "All roadmaps" how many (S1 to S4, D1, D3); the phone's
// menu button saying so (D4); and the Disconnect question naming them (D2). STY-063: the
// count leads to the one roadmap with changes, and with two or more shows only those
// roadmaps. What the roadmaps feature keeps and shows of the changes is held elsewhere.

const family = { en: "Care Closer to Home", cy: "Gofal yn Nes at Adref" }
const ROADMAPS = [
  createTestRoadmap("producta", "Product A roadmap", { family }),
  createTestRoadmap("productb", "Product B roadmap", { family }),
  createTestRoadmap("productc", "Product C roadmap"),
]
const ROADMAP_ITEMS = {
  producta: [createTestRoadmapItem("A item", { id: "a-1" })],
  productb: [createTestRoadmapItem("B item", { id: "b-1" })],
  productc: [createTestRoadmapItem("C item", { id: "c-1" })],
}

const navigation = () => screen.getByRole("navigation", { name: "Roadmaps" })
/** The shell's live region that says the count, empty until there has been one. */
function announcement(): HTMLElement {
  const region = document.querySelector<HTMLElement>("[aria-live=polite]")
  if (!region) throw new Error("The shell has no live region")
  return region
}
/** The navigation's entry for the count: a button, a link, or text where it leads nowhere. */
const countEntry = () =>
  within(navigation()).queryByText(/^\d+ roadmaps? ha(s|ve) unpublished/)
const countName = /^\d+ roadmaps? ha(s|ve) unpublished changes$/
const countLink = () =>
  within(navigation()).getByRole("link", { name: countName })
const countButton = () =>
  within(navigation()).getByRole("button", { name: countName })
const total = (count: number) =>
  count === 1
    ? "1 roadmap has unpublished changes"
    : `${String(count)} roadmaps have unpublished changes`

async function renderShell(
  options: Parameters<typeof renderWithProviders>[0] = {},
) {
  const user = userEvent.setup()
  const rendered = await renderWithProviders({
    authState: connected,
    roadmaps: ROADMAPS,
    roadmapItems: ROADMAP_ITEMS,
    path: "/families",
    ...options,
  })
  return { user, ...rendered }
}

async function changeTwo(
  user: ReturnType<typeof userEvent.setup>,
  router: Parameters<typeof change>[1],
) {
  await change(user, router, "producta", "A item")
  await change(user, router, "productb", "B item")
  await act(() => router.navigate({ to: "/families" }))
}

describe("on a desktop", () => {
  it("shows no count and no dot while nothing is pending (S3)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    await renderShell()

    await within(navigation()).findByRole("link", { name: "Product A roadmap" })
    expect(announcement()).toBeEmptyDOMElement()
    expect(countEntry()).not.toBeInTheDocument()
    expect(
      within(navigation()).queryByText(/unpublished changes/),
    ).not.toBeInTheDocument()
  })

  it("says how many roadmaps have unpublished changes from the families page, and marks each (S1, D1)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderShell()
    await changeTwo(user, router)

    expect(countButton()).toHaveTextContent(total(2))
    expect(announcement()).toHaveTextContent(total(2))
    const nav = within(navigation())
    expect(
      nav.getByRole("link", { name: "Product A roadmap, unpublished changes" }),
    ).toBeInTheDocument()
    expect(
      nav.getByRole("link", { name: "Product B roadmap, unpublished changes" }),
    ).toBeInTheDocument()
    expect(
      nav.getByRole("link", { name: "Product C roadmap" }),
    ).toBeInTheDocument()
    // The dot is shape alone; the name says it in words.
    const dot = (name: string) =>
      nav
        .getByRole("link", { name })
        .querySelector("[data-slot=unpublished-dot]")
    expect(dot("Product A roadmap, unpublished changes")).toBeInTheDocument()
    expect(dot("Product C roadmap")).toBeNull()
  })

  it("leads to the roadmap with changes while it is the only one, and to nothing, the count not the current page, on its own page (STY-063 S5; S2)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderShell()
    await change(user, router, "productb", "B item")
    await act(() => router.navigate({ to: "/families" }))

    expect(countLink()).toHaveAttribute("href", "/roadmaps/productb")
    await user.click(countLink())

    await screen.findByRole("heading", { level: 1, name: "Product B roadmap" })
    expect(countEntry()).toHaveTextContent(total(1))
    expect(
      within(navigation()).queryByRole("link", { name: countName }),
    ).not.toBeInTheDocument()
    expect(
      within(navigation()).queryByRole("button", { name: countName }),
    ).not.toBeInTheDocument()
    // Only the roadmap open is the current page, not the count.
    await waitFor(() => {
      expect(
        within(navigation())
          .getAllByRole("link")
          .filter((link) => link.hasAttribute("aria-current")),
      ).toHaveLength(1)
    })
  })

  it("drops the count and the dot as a roadmap's last change goes (S3)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderShell()
    await change(user, router, "producta", "A item")
    expect(announcement()).toHaveTextContent(total(1))

    await user.click(
      within(screen.getByRole("main")).getByRole("button", {
        name: "Discard all changes",
      }),
    )
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Discard all changes",
      }),
    )

    // Nothing shows, and a screen reader is told that none is left.
    await waitFor(() => {
      expect(announcement()).toHaveTextContent("No roadmaps have unpublished")
    })
    expect(
      within(navigation()).queryByRole("link", { name: /^\d+ roadmaps? ha/ }),
    ).not.toBeInTheDocument()
    expect(
      within(navigation()).getByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()
  })

  it("speaks only when the number changes, not on a second edit or as the Product Lead moves between pages (S4)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderShell()
    const region = announcement()
    await change(user, router, "producta", "A item")
    expect(region).toBe(announcement())
    expect(region).toHaveTextContent(total(1))

    const mutations: MutationRecord[] = []
    const observer = new MutationObserver((records) => {
      mutations.push(...records)
    })
    observer.observe(region, {
      childList: true,
      characterData: true,
      subtree: true,
    })
    await editItemText(user, "A item, edited", "Title", "A item, edited again")
    // The count's entry in the navigation turns to text and back as its roadmap opens.
    await act(() => router.navigate({ to: "/families" }))
    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )
    observer.disconnect()

    expect(mutations).toEqual([])
    await change(user, router, "productb", "B item")
    expect(region).toHaveTextContent(total(2))
  })

  it("does not speak again as the language changes (S4)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router, i18n } = await renderShell()
    await change(user, router, "producta", "A item")
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver((records) => {
      mutations.push(...records)
    })
    observer.observe(announcement(), {
      childList: true,
      characterData: true,
      subtree: true,
    })

    await act(() => i18n.changeLanguage("cy"))
    observer.disconnect()

    expect(mutations).toEqual([])
  })

  it("keeps the dots and the count folded to a rail (D3)", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    localStorage.setItem("roadmaps.navigation", "folded")
    const { user, router } = await renderShell()
    await changeTwo(user, router)

    expect(
      within(navigation()).getByRole("button", { name: total(2) }),
    ).toHaveTextContent("2")
    expect(
      within(navigation()).getByRole("link", {
        name: /^PA Product A roadmap, unpublished changes$/,
      }),
    ).toBeInTheDocument()
    expect(
      within(navigation()).getByRole("link", {
        name: /^PC Product C roadmap$/,
      }),
    ).toBeInTheDocument()
    localStorage.clear()
  })

  it("says it as text alone while the roadmaps are not read, as after Disconnect keeps the changes", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderShell()
    await changeTwo(user, router)

    await disconnectFromHeader(user)
    await user.click(
      screen.getByRole("button", { name: "Keep changes and disconnect" }),
    )

    await waitFor(() => {
      expect(
        within(navigation()).queryByRole("link", { name: "Product A roadmap" }),
      ).not.toBeInTheDocument()
    })
    expect(announcement()).toHaveTextContent(total(2))
    // Nothing to press, while the roadmaps are unread (STY-063 S9).
    expect(countEntry()).toHaveTextContent(total(2))
    expect(
      within(navigation()).queryByRole("link", { name: countName }),
    ).not.toBeInTheDocument()
    expect(
      within(navigation()).queryByRole("button", { name: countName }),
    ).not.toBeInTheDocument()
  })
})

describe("on a phone", () => {
  const menuButton = (name: string) =>
    within(screen.getByRole("banner")).getByRole("button", { name })

  it("has a plain menu button while nothing is pending, and says how many once something is (D4)", async () => {
    const { user, router } = await renderShell()
    expect(menuButton("Menu")).toBeInTheDocument()

    // The dot is shape alone, named by the button.
    expect(
      menuButton("Menu").querySelector("[data-slot=unpublished-dot]"),
    ).toBeNull()

    await change(user, router, "producta", "A item")
    expect(menuButton(`Menu, ${total(1)}`)).toBeInTheDocument()
    expect(
      menuButton(`Menu, ${total(1)}`).querySelector(
        "[data-slot=unpublished-dot]",
      ),
    ).toBeInTheDocument()
    await change(user, router, "productb", "B item")
    expect(menuButton(`Menu, ${total(2)}`)).toBeInTheDocument()
  })

  it("tells a screen reader of the count with the drawer closed (S4, D4)", async () => {
    const { user, router } = await renderShell()
    expect(announcement()).toBeEmptyDOMElement()

    await change(user, router, "producta", "A item")
    expect(announcement()).toHaveTextContent(total(1))
    await change(user, router, "productb", "B item")
    expect(announcement()).toHaveTextContent(total(2))
    expect(
      screen.queryByRole("navigation", { name: "Roadmaps" }),
    ).not.toBeInTheDocument()
  })

  it("shows the dots and the count inside the drawer (D4)", async () => {
    const { user, router } = await renderShell()
    await changeTwo(user, router)

    await user.click(menuButton(`Menu, ${total(2)}`))

    const drawer = await screen.findByRole("dialog", { name: "Menu" })
    const nav = within(within(drawer).getByRole("navigation"))
    expect(nav.getByRole("button", { name: total(2) })).toBeInTheDocument()
    expect(
      nav.getByRole("link", { name: "Product A roadmap, unpublished changes" }),
    ).toBeInTheDocument()
  })
})

describe("in Welsh", () => {
  const { t } = createI18n({ language: "cy" })

  it("names the count with the noun in its right form, and the menu button with it", () => {
    expect(t("layout.navigation.unpublished", { count: 1 })).toBe(
      "1 map trywydd â newidiadau heb eu cyhoeddi",
    )
    expect(t("layout.navigation.unpublished", { count: 2 })).toBe(
      "2 fap trywydd â newidiadau heb eu cyhoeddi",
    )
    expect(t("layout.navigation.unpublished", { count: 7 })).toBe(
      "7 o fapiau trywydd â newidiadau heb eu cyhoeddi",
    )
    expect(t("layout.navigation.menuUnpublished", { roadmaps: 2 })).toBe(
      "Dewislen, 2 fap trywydd â newidiadau heb eu cyhoeddi",
    )
  })

  it("names a roadmap with a dot", () => {
    expect(t("roadmaps.navigation.changed", { name: "Product A" })).toBe(
      "Product A, newidiadau heb eu cyhoeddi",
    )
  })
})

describe("Disconnect's question (D2)", () => {
  async function askToDisconnect(user: ReturnType<typeof userEvent.setup>) {
    await disconnectFromHeader(user)
    return within(await screen.findByRole("alertdialog"))
  }

  it("names each roadmap with unpublished changes as a link to it", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderShell()
    await changeTwo(user, router)

    const question = await askToDisconnect(user)

    const list = question.getByRole("list", { name: total(2) })
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Product A roadmap", "/roadmaps/producta"],
      ["Product B roadmap", "/roadmaps/productb"],
    ])
  })

  it("closes on choosing one, leaving the connection and the changes, and moves focus to its page", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router, authClient } = await renderShell()
    await changeTwo(user, router)

    const question = await askToDisconnect(user)
    await user.click(question.getByRole("link", { name: "Product B roadmap" }))

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe("/roadmaps/productb")
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus()
    })
    expect(authClient.disconnect).not.toHaveBeenCalled()
    expect(announcement()).toHaveTextContent(total(2))
  })

  it("stays open for a link opened elsewhere, with a modifier key", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router } = await renderShell()
    await changeTwo(user, router)

    const question = await askToDisconnect(user)
    await user.keyboard("{Control>}")
    await user.click(question.getByRole("link", { name: "Product B roadmap" }))
    await user.keyboard("{/Control}")

    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/families")
  })

  it("follows the changes while it is open, as a read can drop a roadmap's", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router, queryClient } = await renderShell()
    await changeTwo(user, router)
    const question = await askToDisconnect(user)
    expect(question.getAllByRole("link")).toHaveLength(2)

    // A co-lead removed Product B from the list: its changes go with it.
    act(() => {
      queryClient.setQueryData(
        roadmapKeys.list(),
        ROADMAPS.filter(({ id }) => id !== "productb"),
      )
    })

    await waitFor(() => {
      expect(
        question.queryByRole("link", { name: "Product B roadmap" }),
      ).not.toBeInTheDocument()
    })
    expect(question.getByRole("list", { name: total(1) })).toBeInTheDocument()
    expect(
      question.getByText(/You've changed 1 roadmap without publishing/),
    ).toBeInTheDocument()
  })

  it("disconnects when a read leaves nothing to keep while it is open", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const { user, router, queryClient, authClient } = await renderShell()
    await change(user, router, "producta", "A item")
    await askToDisconnect(user)

    act(() => {
      queryClient.setQueryData(roadmapKeys.list(), [])
    })

    await waitFor(() => {
      expect(authClient.disconnect).toHaveBeenCalledTimes(1)
    })
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("keeps its count and names none while the roadmaps are being read again", async () => {
    matchMediaQueries(DESKTOP_WIDTH)
    const repository = createInMemoryRoadmapRepository(ROADMAPS, ROADMAP_ITEMS)
    const { user, router, queryClient } = await renderShell({ repository })
    await change(user, router, "producta", "A item")
    const { held, release, released } = holdCall(
      repository.listRoadmaps.bind(repository),
    )
    vi.spyOn(repository, "listRoadmaps").mockImplementation(held)
    queryClient.removeQueries({ queryKey: roadmapKeys.list() })

    const question = await askToDisconnect(user)

    expect(
      question.getByText(/You've changed 1 roadmap without publishing/),
    ).toBeInTheDocument()
    expect(question.queryByRole("list")).not.toBeInTheDocument()
    await act(async () => {
      release()
      await released
    })
  })
})
