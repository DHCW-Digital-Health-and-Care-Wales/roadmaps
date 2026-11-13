import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { renderWithProviders } from "@/test/render-with-providers"

import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

const items: RoadmapItem[] = [
  createTestRoadmapItem("Online booking", {
    id: "item-1",
    organisationIds: ["cavuhb"],
  }),
  createTestRoadmapItem("Typo", {
    id: "item-2",
    organisationIds: ["cavuhb"],
    unknownOrganisationCodes: ["CAVHB"],
  }),
]

type User = ReturnType<typeof userEvent.setup>

function main() {
  return within(screen.getByRole("main"))
}

/** The card (or form) of the item headed `title`. */
function card(title: string) {
  const heading = main().getByRole("heading", { level: 3, name: title })
  const item = heading.closest("li")
  if (!item) throw new Error(`No card for ${title}`)
  return item
}

/** The item's organisations as its card shows them, or `null` for none. */
function organisationsOf(title: string) {
  return (
    within(card(title)).queryByText("Organisations", { selector: "dt" })
      ?.nextElementSibling?.textContent ?? null
  )
}

async function renderPage({
  repository = createInMemoryRoadmapRepository(roadmaps, { producta: items }),
  language,
}: { repository?: InMemoryRoadmapRepository; language?: Language } = {}) {
  const user = userEvent.setup()
  await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  await main().findByRole("heading", { level: 3, name: "Typo" })
  return { user, repository }
}

/** Opens the item's form and returns its Organisations group. */
async function openOrganisations(user: User, title: string) {
  await user.click(main().getByRole("button", { name: `Edit ${title}` }))
  const form = within(main().getByRole("form", { name: title }))
  return within(form.getByRole("group", { name: "Organisations" }))
}

/** Ticks or unticks each named checkbox in the item's form, then confirms it. */
async function choose(user: User, title: string, toggle: readonly string[]) {
  const group = await openOrganisations(user, title)
  for (const name of toggle) {
    await user.click(group.getByRole("checkbox", { name }))
  }
  await user.click(
    within(main().getByRole("form", { name: title })).getByRole("button", {
      name: "Done",
    }),
  )
}

async function publish(user: User) {
  await user.click(main().getByRole("button", { name: "Publish changes" }))
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Publish changes",
    }),
  )
}

describe("Choosing an item's organisations (STY-034)", () => {
  it("offers a checkbox per organisation, short name and code, All Wales first, the item's ticked (S1)", async () => {
    const { user } = await renderPage()

    const group = await openOrganisations(user, "Online booking")

    const names = [
      "All Wales (National)",
      "Betsi Cadwaladr (BCUHB)",
      "Cardiff and Vale (CAVUHB)",
      "Health Education and Improvement Wales (HEIW)",
      "Hywel Dda (HDUHB)",
      "Public Health Wales (PHW)",
      "Swansea Bay (SBUHB)",
    ]
    const boxes = group.getAllByRole("checkbox")
    expect(boxes).toHaveLength(names.length)
    boxes.forEach((box, index) => {
      expect(box).toHaveAccessibleName(names[index])
    })
    const ticked = group.getAllByRole("checkbox", { checked: true })
    expect(ticked).toHaveLength(1)
    expect(ticked[0]).toHaveAccessibleName("Cardiff and Vale (CAVUHB)")
  })

  it("labels the group in Welsh, the short names staying English (S1)", async () => {
    const { user } = await renderPage({ language: "cy" })

    await user.click(main().getByRole("button", { name: "Golygu Typo" }))
    const form = within(main().getByRole("form", { name: "Typo" }))
    const group = within(form.getByRole("group", { name: "Sefydliadau" }))
    expect(
      group.getByRole("checkbox", { name: "Cardiff and Vale (CAVUHB)" }),
    ).toBeChecked()
  })

  it("keeps a choice pending, shown on the card and listed in the publish dialog (S2)", async () => {
    const { user, repository } = await renderPage()
    const write = vi.spyOn(repository, "publishRoadmapChanges")

    await choose(user, "Online booking", ["Swansea Bay (SBUHB)"])

    expect(organisationsOf("Online booking")).toBe(
      "Cardiff and Vale, Swansea Bay",
    )
    expect(within(card("Online booking")).getByText("Changed")).toBeVisible()
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    expect(
      within(screen.getByRole("alertdialog")).getByRole("listitem"),
    ).toHaveTextContent(/^Online booking\s*Organisations$/)
    expect(write).not.toHaveBeenCalled()
  })

  it("accepts All Wales beside another, and none, no tick clearing another (S3)", async () => {
    const { user } = await renderPage()

    await choose(user, "Online booking", [
      "All Wales (National)",
      "Hywel Dda (HDUHB)",
    ])
    expect(organisationsOf("Online booking")).toBe(
      "All Wales, Cardiff and Vale, Hywel Dda",
    )

    await choose(user, "Online booking", [
      "All Wales (National)",
      "Cardiff and Vale (CAVUHB)",
      "Hywel Dda (HDUHB)",
    ])
    expect(organisationsOf("Online booking")).toBeNull()
    expect(within(card("Online booking")).getByText("Changed")).toBeVisible()
  })

  it("names an unknown code in the form, saying a change removes it (S4)", async () => {
    const { user } = await renderPage()

    await openOrganisations(user, "Typo")

    const group = within(main().getByRole("form", { name: "Typo" })).getByRole(
      "group",
      { name: "Organisations" },
    )
    expect(group).toHaveAccessibleDescription(
      "CAVHB isn't recognised. Changing the organisations will remove it.",
    )
    expect(
      within(group).getByText(
        "CAVHB isn't recognised. Changing the organisations will remove it.",
      ),
    ).toBeVisible()
  })

  it("names every unknown code, as a list (S4)", async () => {
    const { user } = await renderPage({
      repository: createInMemoryRoadmapRepository(roadmaps, {
        producta: [
          createTestRoadmapItem("Typo", {
            unknownOrganisationCodes: ["CAVHB", "Mars", "SBHB"],
          }),
        ],
      }),
    })

    const group = await openOrganisations(user, "Typo")

    expect(
      group.getByText(
        "CAVHB, Mars, SBHB aren't recognised. Changing the organisations will remove them.",
      ),
    ).toBeVisible()
  })

  it("says nothing of unknown codes for an item with none (S4)", async () => {
    const { user } = await renderPage()

    const group = await openOrganisations(user, "Online booking")

    expect(group.queryByText(/isn't recognised/)).toBeNull()
  })

  it("publishes the chosen set, dropping an unknown code, and leaves it on other edits (S4, S5)", async () => {
    const { user, repository } = await renderPage()

    await choose(user, "Typo", [
      "All Wales (National)",
      "Cardiff and Vale (CAVUHB)",
      "Swansea Bay (SBUHB)",
    ])
    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeInTheDocument()
    const [booking, typo] = await repository.listRoadmapItems("producta")
    expect(typo?.organisationIds).toEqual(["national", "sbuhb"])
    expect(typo?.unknownOrganisationCodes).toEqual([])
    expect(booking?.organisationIds).toEqual(["cavuhb"])
    expect(organisationsOf("Typo")).toBe("All Wales, Swansea Bay")
    expect(within(card("Typo")).queryByText("Changed")).toBeNull()
  })

  it("shows a co-lead's other set by short names beside yours, to keep or use (S7)", async () => {
    const { user, repository } = await renderPage()
    await choose(user, "Online booking", ["Swansea Bay (SBUHB)"])
    repository.coLead((_list, itemsOf) => {
      const booking = itemsOf("producta")[0]
      if (booking) booking.organisationIds = ["hduhb"]
    })

    await publish(user)

    const review = await main().findByRole("alert")
    const conflict = within(within(review).getByRole("listitem"))
    expect(conflict.getByText(/: /, { selector: "p" })).toHaveTextContent(
      "Online booking: Organisations",
    )
    expect(
      conflict.getAllByRole("definition").map(({ textContent }) => textContent),
    ).toEqual(["Cardiff and Vale, Swansea Bay", "Hywel Dda"])
    await user.click(
      conflict.getByRole("button", {
        name: "Use theirs Online booking: Organisations",
      }),
    )
    expect(organisationsOf("Online booking")).toBe("Hywel Dda")
  })

  it("drops a pending choice that Refresh finds a co-lead already made (S8)", async () => {
    const { user, repository } = await renderPage()
    await choose(user, "Online booking", ["Swansea Bay (SBUHB)"])
    repository.coLead((_list, itemsOf) => {
      const booking = itemsOf("producta")[0]
      if (booking) booking.organisationIds = ["sbuhb", "cavuhb"]
    })

    await user.click(main().getByRole("button", { name: "Refresh" }))

    await vi.waitFor(() => {
      expect(within(card("Online booking")).queryByText("Changed")).toBeNull()
    })
    expect(organisationsOf("Online booking")).toBe(
      "Cardiff and Vale, Swansea Bay",
    )
  })
})
