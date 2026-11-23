import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"

const roadmaps: Roadmap[] = [
  createTestRoadmap("producta", "Product A roadmap"),
  createTestRoadmap("productb", "Product B roadmap"),
]

function main() {
  return within(screen.getByRole("main"))
}

describe("RoadmapDetailPage", () => {
  it("names the roadmap, with no link back: the navigation leads to the list (STY-059 D3, STY-065 S1)", async () => {
    await renderWithProviders({
      path: "/roadmaps/productb",
      authState: connected,
      roadmaps,
    })

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Product B roadmap",
      }),
    ).toBeInTheDocument()
    expect(
      main().queryByRole("link", { name: "Back to roadmaps" }),
    ).not.toBeInTheDocument()
  })

  it("opens from its card", async () => {
    const user = userEvent.setup()
    const { router } = await renderWithProviders({
      authState: connected,
      roadmaps,
    })

    await user.click(
      await main().findByRole("link", { name: "Product A roadmap" }),
    )

    expect(router.state.location.pathname).toBe("/roadmaps/producta")
    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Product A roadmap",
      }),
    ).toBeInTheDocument()
  })

  it("shows a loading placeholder", async () => {
    await renderWithProviders({
      path: "/roadmaps/productb",
      authState: connected,
      repository: {
        ...createInMemoryRoadmapRepository(roadmaps),
        listRoadmaps: () => new Promise<never>(() => undefined),
      },
    })

    expect(main().getByRole("status")).toHaveTextContent("Loading…")
  })

  it("explains an unknown id", async () => {
    await renderWithProviders({
      path: "/roadmaps/0",
      authState: connected,
      roadmaps,
    })

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Roadmap not found",
      }),
    ).toBeInTheDocument()
    expect(
      main().getByText("This roadmap doesn't exist or is no longer listed."),
    ).toBeInTheDocument()
    expect(
      main().getByRole("link", { name: "Back to roadmaps" }),
    ).toHaveAttribute("href", "/")
  })

  it("asks to connect when not connected", async () => {
    await renderWithProviders({ path: "/roadmaps/productb", roadmaps })

    expect(
      main().getByRole("heading", { level: 1, name: "Roadmap" }),
    ).toBeInTheDocument()
    expect(
      main().getByText("Connect Google to view this roadmap."),
    ).toBeInTheDocument()
    expect(
      main().getByRole("button", { name: "Connect Google" }),
    ).toBeInTheDocument()
  })

  it("explains a failure to load", async () => {
    await renderWithProviders({
      path: "/roadmaps/productb",
      authState: connected,
      repository: createInMemoryRoadmapRepository(new AppError("not-found")),
    })

    const alert = await main().findByRole("alert")
    expect(
      within(alert).getByRole("heading", {
        level: 1,
        name: "Couldn't load your roadmaps",
      }),
    ).toBeInTheDocument()
    expect(alert).toHaveTextContent(
      "The spreadsheet couldn't be found. Check that it still exists.",
    )
  })

  it("shows no product details while the list loads", async () => {
    await renderWithProviders({
      path: "/roadmaps/productb",
      authState: connected,
      repository: {
        ...createInMemoryRoadmapRepository(roadmaps),
        listRoadmaps: () => new Promise<never>(() => undefined),
      },
    })
    expect(main().getByRole("status")).toHaveTextContent("Loading…")
    expect(main().queryByRole("region")).toBeNull()
  })

  it("shows no product details when the list failed", async () => {
    await renderWithProviders({
      path: "/roadmaps/productb",
      authState: connected,
      repository: createInMemoryRoadmapRepository(new AppError("not-found")),
    })
    await main().findByRole("alert")
    expect(main().queryByRole("region")).toBeNull()
  })

  describe("after a failed refresh", () => {
    async function renderAfterFailedRefresh() {
      const user = userEvent.setup()
      const listRoadmaps = vi
        .fn<RoadmapRepository["listRoadmaps"]>()
        .mockResolvedValueOnce(roadmaps)
        .mockRejectedValue(new AppError("forbidden"))
      const result = await renderWithProviders({
        authState: connected,
        repository: { ...createInMemoryRoadmapRepository(), listRoadmaps },
      })
      await main().findByText("2 roadmaps")
      await user.click(main().getByRole("button", { name: "Refresh" }))
      await main().findByRole("alert")
      return result
    }

    it("shows the cached roadmap with the failure", async () => {
      const { router } = await renderAfterFailedRefresh()

      await act(() =>
        router.navigate({
          to: "/roadmaps/$roadmapId",
          params: { roadmapId: "producta" },
        }),
      )

      expect(
        main().getByRole("heading", { level: 1, name: "Product A roadmap" }),
      ).toBeInTheDocument()
      expect(main().getByRole("alert")).toHaveTextContent(
        "Couldn't refresh your roadmaps",
      )
    })

    it("does not claim an id is missing from stale data", async () => {
      const { router } = await renderAfterFailedRefresh()

      await act(() =>
        router.navigate({
          to: "/roadmaps/$roadmapId",
          params: { roadmapId: "0" },
        }),
      )

      expect(
        main().queryByRole("heading", { name: "Roadmap not found" }),
      ).not.toBeInTheDocument()
      expect(
        main().getByRole("heading", {
          level: 1,
          name: "Couldn't load your roadmaps",
        }),
      ).toBeInTheDocument()
    })
  })

  it("renders in Welsh", async () => {
    await renderWithProviders({
      path: "/roadmaps/0",
      authState: connected,
      roadmaps,
      language: "cy",
    })

    expect(
      await main().findByRole("heading", {
        name: "Heb ddod o hyd i'r map trywydd",
      }),
    ).toBeInTheDocument()
  })

  it("names the roadmap by its Welsh title in Welsh", async () => {
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      roadmaps: [
        createTestRoadmap("producta", "Product A roadmap", {
          title: { en: "Product A roadmap", cy: "Trywydd Cynnyrch A" },
        }),
      ],
      language: "cy",
    })

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Trywydd Cynnyrch A",
      }),
    ).toBeInTheDocument()
  })
})
