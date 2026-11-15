import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { TEST_ORGANISATIONS } from "@/domain/roadmap/testing/test-organisations"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

/** The item's organisations as the card shows them. */
async function organisationsOf(title: string) {
  const card = (
    await screen.findByRole("heading", { level: 3, name: title })
  ).closest("li")
  if (!card) throw new Error(`No card for ${title}`)
  return within(card).getByText("Organisations", { selector: "dt" })
    .nextElementSibling?.textContent
}

function render(repository: RoadmapRepository, language: "en" | "cy" = "en") {
  return renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    language,
  })
}

const items = {
  producta: [
    createTestRoadmapItem("Cross-border work", {
      organisationIds: ["sbuhb", "national", "cavuhb"],
    }),
  ],
}

describe("RoadmapDetailPage organisations (STY-032)", () => {
  it("shows short names, the national one first then alphabetical (S1)", async () => {
    await render(createInMemoryRoadmapRepository(roadmaps, items))
    expect(await organisationsOf("Cross-border work")).toBe(
      "All Wales, Cardiff and Vale, Swansea Bay",
    )
  })

  it("shows the same English short names on the Welsh interface (S1)", async () => {
    await render(createInMemoryRoadmapRepository(roadmaps, items), "cy")

    const card = (
      await screen.findByRole("heading", {
        level: 3,
        name: "Cross-border work",
      })
    ).closest("li")
    expect(
      within(card as HTMLElement).getByText("Sefydliadau", { selector: "dt" })
        .nextElementSibling,
    ).toHaveTextContent("All Wales, Cardiff and Vale, Swansea Bay")
  })

  it("shows a thirteenth organisation by its short name in its sorted place, whatever order the list is served in (S4)", async () => {
    const thirteenth: Organisation = {
      id: "dyfed",
      code: "DYFED",
      shortName: "Dyfed",
      name: { en: "Dyfed Health Board", cy: "Bwrdd Iechyd Dyfed" },
      national: false,
    }
    const served = [thirteenth, ...[...TEST_ORGANISATIONS].reverse()]

    await render(
      createInMemoryRoadmapRepository(
        roadmaps,
        {
          producta: [
            createTestRoadmapItem("New body", {
              organisationIds: ["sbuhb", "dyfed", "cavuhb", "national"],
            }),
          ],
        },
        { organisations: served },
      ),
    )

    expect(await organisationsOf("New body")).toBe(
      "All Wales, Cardiff and Vale, Dyfed, Swansea Bay",
    )
  })

  it("does not show an organisation id the list doesn't hold, nor an unknown code", async () => {
    await render(
      createInMemoryRoadmapRepository(roadmaps, {
        producta: [
          createTestRoadmapItem("Typo", {
            organisationIds: ["cavuhb", "gone"],
            unknownOrganisationCodes: ["CAVHB"],
          }),
          createTestRoadmapItem("Only a typo", {
            unknownOrganisationCodes: ["CAVHB"],
          }),
        ],
      }),
    )

    expect(await organisationsOf("Typo")).toBe("Cardiff and Vale")
    expect(screen.queryByText("CAVHB")).not.toBeInTheDocument()
    const card = screen
      .getByRole("heading", { level: 3, name: "Only a typo" })
      .closest("li")
    expect(
      within(card as HTMLElement).queryByText("Organisations"),
    ).not.toBeInTheDocument()
  })

  describe("when the list can't be read (S5)", () => {
    it("shows the page's load failure with Retry, and no items, until the list is read", async () => {
      const user = userEvent.setup()
      const repository = createInMemoryRoadmapRepository(roadmaps, items)
      const listOrganisations = vi
        .fn<RoadmapRepository["listOrganisations"]>()
        .mockRejectedValueOnce(new AppError("network"))
        .mockRejectedValueOnce(new AppError("network"))
        .mockRejectedValueOnce(new AppError("network"))
        .mockResolvedValue([...TEST_ORGANISATIONS])
      await render({ ...repository, listOrganisations })

      const alert = await screen.findByRole("alert")
      expect(
        within(alert).getByRole("heading", {
          level: 2,
          name: "Couldn't load this roadmap's items",
        }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole("heading", { level: 3 }),
      ).not.toBeInTheDocument()

      await user.click(within(alert).getByRole("button", { name: "Retry" }))

      expect(await organisationsOf("Cross-border work")).toBe(
        "All Wales, Cardiff and Vale, Swansea Bay",
      )
    })

    it("fails with the list's error kind, not showing a stale name", async () => {
      const repository = createInMemoryRoadmapRepository(roadmaps, items, {
        organisations: new AppError("forbidden"),
      })
      await render(repository)

      const alert = await screen.findByRole("alert")
      expect(alert).toHaveTextContent(/permission|access/i)
      expect(screen.queryByText("Cardiff and Vale")).not.toBeInTheDocument()
      expect(
        within(alert).queryByRole("button", { name: "Retry" }),
      ).not.toBeInTheDocument()
    })
  })

  it("reads the list again on Refresh", async () => {
    const user = userEvent.setup()
    const repository = createInMemoryRoadmapRepository(roadmaps, items)
    const listOrganisations = vi.spyOn(repository, "listOrganisations")
    await render(repository)
    await organisationsOf("Cross-border work")
    expect(listOrganisations).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: "Refresh" }))

    await vi.waitFor(() => {
      expect(listOrganisations).toHaveBeenCalledTimes(2)
    })
  })
})
