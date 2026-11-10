import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Language } from "@/i18n"
import { renderWithProviders } from "@/test/render-with-providers"

const copy = {
  en: {
    title: "DHCW Roadmap Editor",
    source: "Your roadmaps are currently sourced from Google Sheets.",
    connect: "Connect Google",
    access: "You'll need to connect Google so the app can load your roadmaps.",
    denied: "Access wasn't granted, so your roadmaps can't be loaded.",
  },
  cy: {
    title: "Golygydd Mapiau Trywydd IGDC",
    source: "Ar hyn o bryd, daw eich mapiau trywydd o Google Sheets.",
    connect: "Cysylltu â Google",
    access:
      "Bydd angen i chi gysylltu â Google er mwyn i'r ap lwytho eich mapiau trywydd.",
    denied:
      "Ni roddwyd mynediad, felly does dim modd llwytho eich mapiau trywydd.",
  },
} as const satisfies Record<Language, unknown>

/** Every signed-out state the start page shows. */
const states: readonly (readonly [string, AuthState])[] = [
  ["ready", { status: "ready" }],
  ["after a closed popup", { status: "ready", lastError: "popup-closed" }],
  ["after a blocked popup", { status: "ready", lastError: "popup-blocked" }],
  ["after an auth error", { status: "error", error: "access-denied" }],
  ["while connecting", { status: "connecting" }],
]

describe.each(["en", "cy"] as const)("the start page in %s", (language) => {
  const c = copy[language]

  it.each(states)("shows the plain start page %s", async (_, authState) => {
    await renderWithProviders({ language, authState })

    const main = within(screen.getByRole("main"))
    const section = main.getByRole("heading", { level: 1 }).closest("section")
    expect(section).not.toBeNull()
    const text = section?.textContent ?? ""
    expect(text).toContain(c.title)
    expect(text).toContain(c.source)
    expect(text).toContain(c.access)
    expect(main.getByRole("button", { name: c.connect })).toBeInTheDocument()
  })

  it("puts the source note in DHCW inset text", async () => {
    await renderWithProviders({ language })

    expect(
      screen.getByText(c.source).closest("[data-slot='inset-text']"),
    ).not.toBeNull()
  })

  it("shows a notice first, above the heading", async () => {
    await renderWithProviders({
      language,
      authState: { status: "error", error: "access-denied" },
    })

    const main = within(screen.getByRole("main"))
    const notice = main.getByRole("alert")
    expect(notice).toHaveTextContent(c.denied)
    expect(
      notice.compareDocumentPosition(main.getByRole("heading", { level: 1 })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("shows no notice when there is nothing to say", async () => {
    await renderWithProviders({ language })

    const main = within(screen.getByRole("main"))
    expect(main.queryByRole("note")).not.toBeInTheDocument()
    expect(main.queryByRole("alert")).not.toBeInTheDocument()
  })
})
