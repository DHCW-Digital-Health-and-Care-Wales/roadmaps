import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { AppError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps: Roadmap[] = [
  createTestRoadmap("0", "Platform"),
  createTestRoadmap("42", "Mobile app"),
]

function main() {
  return within(screen.getByRole("main"))
}

describe("RoadmapDetailPage", () => {
  it("names the roadmap, with a way back", async () => {
    await renderWithProviders({
      path: "/roadmaps/42",
      authState: connected,
      roadmaps,
    })

    expect(
      await main().findByRole("heading", { level: 1, name: "Mobile app" }),
    ).toBeInTheDocument()
    expect(
      main().getByText("Roadmap details are coming soon."),
    ).toBeInTheDocument()
    expect(
      main().getByRole("link", { name: "Back to roadmaps" }),
    ).toHaveAttribute("href", "/")
  })

  it("opens from its card", async () => {
    const user = userEvent.setup()
    const { router } = await renderWithProviders({
      authState: connected,
      roadmaps,
    })

    await user.click(await main().findByRole("link", { name: "Platform" }))

    expect(router.state.location.pathname).toBe("/roadmaps/0")
    expect(
      await main().findByRole("heading", { level: 1, name: "Platform" }),
    ).toBeInTheDocument()
  })

  it("shows a loading placeholder", async () => {
    await renderWithProviders({
      path: "/roadmaps/42",
      authState: connected,
      repository: { listRoadmaps: () => new Promise<never>(() => undefined) },
    })

    expect(main().getByRole("status")).toHaveTextContent("Loading…")
  })

  it("explains an unknown id", async () => {
    await renderWithProviders({
      path: "/roadmaps/999",
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
      main().getByText("This roadmap doesn't exist or is no longer visible."),
    ).toBeInTheDocument()
    expect(
      main().getAllByRole("link", { name: "Back to roadmaps" }),
    ).toHaveLength(2)
  })

  it("asks to connect when not connected", async () => {
    await renderWithProviders({ path: "/roadmaps/42", roadmaps })

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
      path: "/roadmaps/42",
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

  it("keeps a cached roadmap visible, with Reconnect, once the session expires", async () => {
    const { authClient } = await renderWithProviders({
      path: "/roadmaps/42",
      authState: connected,
      roadmaps,
    })
    await main().findByRole("heading", { level: 1, name: "Mobile app" })

    act(() => {
      authClient.setState({ status: "expired" })
    })

    const alert = main().getByRole("alert")
    expect(alert).toHaveTextContent("Your session has expired")
    expect(
      within(alert).getByRole("button", { name: "Reconnect" }),
    ).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 1, name: "Mobile app" }),
    ).toBeInTheDocument()
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
        repository: { listRoadmaps },
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
          params: { roadmapId: "0" },
        }),
      )

      expect(
        main().getByRole("heading", { level: 1, name: "Platform" }),
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
          params: { roadmapId: "999" },
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
      path: "/roadmaps/999",
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
