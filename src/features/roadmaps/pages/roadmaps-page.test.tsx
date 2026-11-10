import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { AppError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render-with-providers"

import { roadmapKeys } from "../hooks/roadmap-queries"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps: Roadmap[] = [
  { id: "0", name: "Platform" },
  { id: "42", name: "Mobile app" },
  { id: "7", name: "Data" },
]

type Outcome = readonly Roadmap[] | AppError | "pending"

/** A repository answering each call with the next outcome (the last one repeats). */
function scriptedRepository(...outcomes: Outcome[]) {
  let call = 0
  const listRoadmaps = vi.fn<RoadmapRepository["listRoadmaps"]>(() => {
    const outcome = outcomes[Math.min(call++, outcomes.length - 1)]
    if (outcome === "pending") return new Promise<never>(() => undefined)
    if (outcome instanceof AppError) return Promise.reject(outcome)
    return Promise.resolve(outcome ? [...outcome] : [])
  })
  return { listRoadmaps }
}

function main() {
  return within(screen.getByRole("main"))
}

function cardNames() {
  return within(main().getByRole("list"))
    .getAllByRole("link")
    .map((link) => link.textContent)
}

describe("RoadmapsPage", () => {
  it("shows loading skeletons until the roadmaps arrive", async () => {
    await renderWithProviders({
      authState: connected,
      repository: scriptedRepository("pending"),
    })

    expect(main().getByRole("status")).toHaveTextContent("Loading roadmaps…")
    expect(main().queryByRole("link")).not.toBeInTheDocument()
    expect(main().getByRole("button", { name: "Refresh" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
  })

  it("lists the roadmaps as cards, in order, linking to each one", async () => {
    const repository = scriptedRepository(roadmaps)
    await renderWithProviders({ authState: connected, repository })

    expect(
      main().getByRole("heading", { level: 1, name: "Your Roadmaps" }),
    ).toBeInTheDocument()
    expect(
      main().getByText("Roadmaps available in the connected spreadsheet."),
    ).toBeInTheDocument()
    expect(await main().findByText("3 roadmaps")).toBeInTheDocument()
    expect(cardNames()).toEqual(["Platform", "Mobile app", "Data"])
    expect(main().getByRole("link", { name: "Mobile app" })).toHaveAttribute(
      "href",
      "/roadmaps/42",
    )
    // TanStack Query's abort signal reaches the repository.
    expect(repository.listRoadmaps.mock.calls[0]?.[0]?.signal).toBeInstanceOf(
      AbortSignal,
    )
  })

  it("keeps a long name whole for assistive tech and the tooltip", async () => {
    const name = `Quarterly ${"very ".repeat(30)}long roadmap`
    await renderWithProviders({
      authState: connected,
      roadmaps: [{ id: "1", name }],
    })

    expect(await main().findByRole("link", { name })).toHaveAttribute(
      "title",
      name,
    )
  })

  it("explains when there are no roadmaps", async () => {
    await renderWithProviders({ authState: connected, roadmaps: [] })

    expect(
      await main().findByRole("heading", { name: "No roadmaps yet" }),
    ).toBeInTheDocument()
    expect(
      main().getByText(
        "There are no visible roadmaps in the connected spreadsheet yet.",
      ),
    ).toBeInTheDocument()
  })

  it("asks for access on a permission error, without a pointless Retry", async () => {
    await renderWithProviders({
      authState: connected,
      repository: scriptedRepository(new AppError("forbidden")),
    })

    const alert = await main().findByRole("alert")
    expect(alert).toHaveTextContent("Couldn't load your roadmaps")
    expect(alert).toHaveTextContent(
      "You don't have access to this spreadsheet. Ask the spreadsheet owner for access.",
    )
    expect(
      within(alert).queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument()
  })

  it("retries a retryable error on request", async () => {
    const user = userEvent.setup()
    const failure = new AppError("network")
    // The first load and its two automatic retries fail; the user's retry succeeds.
    const repository = scriptedRepository(failure, failure, failure, roadmaps)
    await renderWithProviders({ authState: connected, repository })

    const alert = await main().findByRole("alert")
    expect(alert).toHaveTextContent(
      "Couldn't connect. Check your internet connection and try again.",
    )
    await user.click(within(alert).getByRole("button", { name: "Retry" }))

    expect(await main().findByText("3 roadmaps")).toBeInTheDocument()
    expect(repository.listRoadmaps).toHaveBeenCalledTimes(4)
  })

  it("refetches on Refresh, busy meanwhile", async () => {
    const user = userEvent.setup()
    const repository = scriptedRepository(roadmaps.slice(0, 1), "pending")
    await renderWithProviders({ authState: connected, repository })
    await main().findByText("1 roadmap")

    const refresh = main().getByRole("button", { name: "Refresh" })
    await user.click(refresh)

    expect(repository.listRoadmaps).toHaveBeenCalledTimes(2)
    expect(refresh).toHaveAttribute("aria-busy", "true")
    expect(refresh).toHaveAttribute("aria-disabled", "true")
    // The cards loaded earlier stay while refreshing.
    expect(cardNames()).toEqual(["Platform"])
  })

  it("keeps the cards and explains a failed refresh", async () => {
    const user = userEvent.setup()
    await renderWithProviders({
      authState: connected,
      repository: scriptedRepository(roadmaps, new AppError("rate-limited")),
    })
    await main().findByText("3 roadmaps")

    await user.click(main().getByRole("button", { name: "Refresh" }))

    const alert = await main().findByRole("alert")
    expect(alert).toHaveTextContent("Couldn't refresh your roadmaps")
    expect(alert).toHaveTextContent(
      "Too many requests right now. Wait a moment and try again.",
    )
    expect(cardNames()).toHaveLength(3)
  })

  it("does not load roadmaps without a session", async () => {
    const repository = scriptedRepository(roadmaps)
    await renderWithProviders({ repository })

    expect(
      main().getByRole("button", { name: "Connect Google" }),
    ).toBeInTheDocument()
    expect(repository.listRoadmaps).not.toHaveBeenCalled()
  })

  it("expires the session on a rejected token, then reloads after Reconnect", async () => {
    const user = userEvent.setup()
    const repository = scriptedRepository(
      new AppError("unauthenticated"),
      roadmaps,
    )
    const { authClient } = await renderWithProviders({
      authState: connected,
      repository,
    })

    const alert = await main().findByRole("alert")
    expect(alert).toHaveTextContent("Your session has expired")
    expect(authClient.reportUnauthenticated).toHaveBeenCalledOnce()
    expect(main().getByRole("button", { name: "Refresh" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )

    await user.click(within(alert).getByRole("button", { name: "Reconnect" }))

    expect(authClient.connect).toHaveBeenCalledOnce()
    expect(await main().findByText("3 roadmaps")).toBeInTheDocument()
    expect(main().queryByRole("alert")).not.toBeInTheDocument()
  })

  it("keeps earlier cards visible while expired, refetching once reconnected", async () => {
    const user = userEvent.setup()
    const repository = scriptedRepository(roadmaps, roadmaps.slice(0, 2))
    const { authClient } = await renderWithProviders({
      authState: connected,
      repository,
    })
    await main().findByText("3 roadmaps")

    // A refresh within `staleTime` hits a rejected token: still refetched on reconnect.
    repository.listRoadmaps.mockRejectedValueOnce(
      new AppError("unauthenticated"),
    )
    await user.click(main().getByRole("button", { name: "Refresh" }))

    const alert = await main().findByRole("alert")
    expect(alert).toHaveTextContent("Your session has expired")
    expect(cardNames()).toHaveLength(3)

    await user.click(within(alert).getByRole("button", { name: "Reconnect" }))

    expect(authClient.connect).toHaveBeenCalledOnce()
    expect(await main().findByText("2 roadmaps")).toBeInTheDocument()
  })

  it("drops the expired alert as soon as it reconnects, while refetching", async () => {
    const user = userEvent.setup()
    const repository = scriptedRepository(
      roadmaps,
      new AppError("unauthenticated"),
      "pending",
    )
    await renderWithProviders({ authState: connected, repository })
    await main().findByText("3 roadmaps")
    await user.click(main().getByRole("button", { name: "Refresh" }))
    const alert = await main().findByRole("alert")

    await user.click(within(alert).getByRole("button", { name: "Reconnect" }))

    // The refetch is still pending, and the 401 it will replace is still the query's error.
    expect(repository.listRoadmaps).toHaveBeenCalledTimes(3)
    expect(main().queryByRole("alert")).not.toBeInTheDocument()
    expect(cardNames()).toHaveLength(3)
    // Reconnect went with the alert; focus stays in the content.
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveFocus()
    })
  })

  it("refetches after reconnecting from a timed-out session, even if fresh", async () => {
    const user = userEvent.setup()
    const repository = scriptedRepository(roadmaps, roadmaps.slice(0, 1))
    const { authClient } = await renderWithProviders({
      authState: connected,
      repository,
    })
    await main().findByText("3 roadmaps")

    // The token timer fires within `staleTime`; no request failed.
    act(() => {
      authClient.setState({ status: "expired" })
    })
    await user.click(
      within(main().getByRole("alert")).getByRole("button", {
        name: "Reconnect",
      }),
    )

    expect(await main().findByText("1 roadmap")).toBeInTheDocument()
    expect(repository.listRoadmaps).toHaveBeenCalledTimes(2)
  })

  it("stays on the roadmaps while reconnecting", async () => {
    const { authClient } = await renderWithProviders({
      authState: { status: "expired" },
    })

    act(() => {
      authClient.setState({ status: "connecting" })
    })

    const reconnect = main().getByRole("button", { name: "Reconnect" })
    expect(reconnect).toHaveAttribute("aria-busy", "true")
    expect(
      main().getByRole("heading", { level: 1, name: "Your Roadmaps" }),
    ).toBeInTheDocument()
  })

  it("forgets the roadmaps on disconnect", async () => {
    const user = userEvent.setup()
    const { queryClient } = await renderWithProviders({
      authState: connected,
      roadmaps,
    })
    await main().findByText("3 roadmaps")

    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Disconnect",
      }),
    )

    expect(queryClient.getQueryData(roadmapKeys.list())).toBeUndefined()
    expect(
      main().getByRole("button", { name: "Connect Google" }),
    ).toBeInTheDocument()
  })

  it("renders in Welsh, with Welsh plurals", async () => {
    await renderWithProviders({
      authState: connected,
      roadmaps: roadmaps.slice(0, 2),
      language: "cy",
    })

    expect(
      main().getByRole("heading", { level: 1, name: "Eich Mapiau Trywydd" }),
    ).toBeInTheDocument()
    expect(await main().findByText("2 fap trywydd")).toBeInTheDocument()
    expect(main().getByRole("button", { name: "Adnewyddu" })).toBeEnabled()
  })
})
