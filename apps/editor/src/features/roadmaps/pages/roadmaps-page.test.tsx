import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { disconnectFromHeader } from "@/features/auth/testing/account-menu"
import { findReconnectDialog } from "@/features/auth/testing/reconnect-dialog"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { roadmapKeys } from "../hooks/roadmap-queries"

const roadmaps: Roadmap[] = [
  createTestRoadmap("producta", "Product A roadmap"),
  createTestRoadmap("productb", "Product B roadmap"),
  createTestRoadmap("productc", "Product C roadmap"),
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
  // The page never reads items or the lists, or publishes.
  const listRoadmapItems = vi.fn<RoadmapRepository["listRoadmapItems"]>(() =>
    Promise.resolve([]),
  )
  const publishRoadmapChanges = vi.fn<
    RoadmapRepository["publishRoadmapChanges"]
  >(() => Promise.resolve({ status: "published" }))
  return {
    listRoadmaps,
    listRoadmapItems,
    publishRoadmapChanges,
    listFamilies: vi.fn<RoadmapRepository["listFamilies"]>(),
    listCategories: vi.fn<RoadmapRepository["listCategories"]>(),
    listOrganisations: vi.fn<RoadmapRepository["listOrganisations"]>(),
    addRoadmap: vi.fn<RoadmapRepository["addRoadmap"]>(),
    addFamily: vi.fn<RoadmapRepository["addFamily"]>(),
    changeFamily: vi.fn<RoadmapRepository["changeFamily"]>(),
    matchRoadmapToLists: vi.fn<RoadmapRepository["matchRoadmapToLists"]>(),
    setRoadmapPublished: vi.fn<RoadmapRepository["setRoadmapPublished"]>(),
  }
}

function main() {
  return within(screen.getByRole("main"))
}

/** The cards' titles in page order (each link's tooltip is its title). */
function cardNames() {
  return main()
    .getAllByRole("list")
    .flatMap((list) => within(list).getAllByRole("link"))
    .map((link) => link.getAttribute("title"))
}

describe("RoadmapsPage", () => {
  it("shows loading skeletons until the roadmaps arrive", async () => {
    await renderWithProviders({
      authState: connected,
      repository: scriptedRepository("pending"),
    })

    expect(main().getByRole("status")).toHaveTextContent("Loading roadmaps…")
    expect(main().queryByRole("list")).not.toBeInTheDocument()
    expect(main().getByRole("button", { name: "Refresh" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
  })

  it("lists the roadmaps as cards, in order, linking to each one", async () => {
    const repository = scriptedRepository(roadmaps)
    await renderWithProviders({ authState: connected, repository })

    expect(
      main().getByRole("heading", { level: 1, name: "Your roadmaps" }),
    ).toBeInTheDocument()
    expect(
      main().queryByText("Every roadmap, published or not."),
    ).not.toBeInTheDocument()
    expect(
      main().queryByRole("link", { name: /^Families/ }),
    ).not.toBeInTheDocument()
    expect(await main().findByText("3 roadmaps")).toBeInTheDocument()
    expect(cardNames()).toEqual([
      "Product A roadmap",
      "Product B roadmap",
      "Product C roadmap",
    ])
    expect(
      main().getByRole("link", { name: "Product B roadmap" }),
    ).toHaveAttribute("href", "/roadmaps/productb")
    // TanStack Query's abort signal reaches the repository.
    expect(repository.listRoadmaps.mock.calls[0]?.[0]?.signal).toBeInstanceOf(
      AbortSignal,
    )
  })

  it("puts Add a roadmap, then Refresh, then the first roadmap in the Tab order (STY-058 S5)", async () => {
    const user = userEvent.setup()
    await renderWithProviders({
      authState: connected,
      repository: scriptedRepository(roadmaps),
    })
    await main().findByText("3 roadmaps")
    const heading = main().getByRole("heading", { level: 1 })
    const [first] = main().getAllByRole("link", { name: /roadmap$/ })

    // The header and the closed navigation hold stops of their own before the page.
    await user.click(heading)
    await user.tab()
    expect(main().getByRole("button", { name: "Add a roadmap" })).toHaveFocus()
    await user.tab()
    expect(main().getByRole("button", { name: "Refresh" })).toHaveFocus()
    await user.tab()
    expect(first).toHaveFocus()
  })

  describe("grouping by product family", () => {
    const family = (en: string, cy = "") => ({ en, cy })
    const example: Roadmap[] = [
      createTestRoadmap("producta", "Product A roadmap", {
        family: family("Single Record"),
      }),
      createTestRoadmap("productb", "Product B roadmap", {
        title: { en: "Product B roadmap", cy: "Trywydd Cynnyrch B" },
        family: family(
          "Medicines & Diagnostics",
          "Meddyginiaethau a Diagnosteg",
        ),
      }),
      createTestRoadmap("productc", "Product C roadmap", { published: false }),
    ]

    /** Each heading with the titles of the list it names, in page order. */
    function groups() {
      return main()
        .getAllByRole("heading", { level: 2 })
        .map((heading) => ({
          heading: heading.textContent,
          titles: within(
            main().getByRole("list", { name: heading.textContent }),
          )
            .getAllByRole("link")
            .map((link) => link.getAttribute("title")),
        }))
    }

    it("shows families in name order, then the roadmaps with no family under their own heading (S1)", async () => {
      await renderWithProviders({ authState: connected, roadmaps: example })

      expect(await main().findByText(/^3 roadmaps/)).toBeInTheDocument()
      expect(groups()).toEqual([
        { heading: "Medicines & Diagnostics", titles: ["Product B roadmap"] },
        { heading: "Single Record", titles: ["Product A roadmap"] },
        { heading: "No product family", titles: ["Product C roadmap"] },
      ])
    })

    it("re-sorts the groups and titles when the language changes, naming families in Welsh (S8)", async () => {
      await renderWithProviders({
        authState: connected,
        roadmaps: example,
        language: "cy",
      })

      expect(await main().findByText(/^3 map trywydd/)).toBeInTheDocument()
      expect(groups()).toEqual([
        {
          heading: "Meddyginiaethau a Diagnosteg",
          titles: ["Trywydd Cynnyrch B"],
        },
        { heading: "Single Record", titles: ["Product A roadmap"] },
        { heading: "Dim teulu cynnyrch", titles: ["Product C roadmap"] },
      ])
    })

    it("shows one list and no heading when no roadmap has a family (S8)", async () => {
      await renderWithProviders({
        authState: connected,
        roadmaps: [
          createTestRoadmap("b", "Beta"),
          createTestRoadmap("a", "Alpha"),
        ],
      })

      expect(await main().findByText("2 roadmaps")).toBeInTheDocument()
      expect(
        main().queryByRole("heading", { level: 2 }),
      ).not.toBeInTheDocument()
      expect(main().getAllByRole("list")).toHaveLength(1)
      expect(cardNames()).toEqual(["Alpha", "Beta"])
    })
  })

  describe("the count of roadmaps not published", () => {
    const withUnpublished = [
      ...roadmaps.slice(0, 2),
      createTestRoadmap("productc", "Product C roadmap", { published: false }),
    ]

    it("says how many are not published, and only when some are (S10)", async () => {
      await renderWithProviders({
        authState: connected,
        roadmaps: withUnpublished,
      })
      expect(
        await main().findByText("3 roadmaps, 1 not published"),
      ).toBeInTheDocument()
    })

    it("only counts the roadmaps when all are published (S10)", async () => {
      await renderWithProviders({ authState: connected, roadmaps })
      expect(await main().findByText("3 roadmaps")).toBeInTheDocument()
      expect(main().queryByText(/not published/)).not.toBeInTheDocument()
    })

    it.each([
      [1, 1, "1 roadmap, 1 not published"],
      [2, 2, "2 roadmaps, 2 not published"],
    ])(
      "uses the right plurals in English for %i roadmaps, %i not published (S10)",
      async (total, unpublished, expected) => {
        await renderWithProviders({
          authState: connected,
          roadmaps: Array.from({ length: total }, (_, index) =>
            createTestRoadmap(`r${String(index)}`, `Roadmap ${String(index)}`, {
              published: index >= unpublished,
            }),
          ),
        })
        expect(await main().findByText(expected)).toBeInTheDocument()
      },
    )

    it.each([
      [1, 1, "1 map trywydd, 1 heb ei gyhoeddi"],
      [2, 1, "2 fap trywydd, 1 heb ei gyhoeddi"],
      [3, 2, "3 map trywydd, 2 heb eu cyhoeddi"],
      [4, 3, "4 o fapiau trywydd, 3 heb eu cyhoeddi"],
      [7, 6, "7 o fapiau trywydd, 6 heb eu cyhoeddi"],
      [6, 6, "6 map trywydd, 6 heb eu cyhoeddi"],
      [12, 12, "12 o fapiau trywydd, 12 heb eu cyhoeddi"],
    ])(
      "uses the right plurals in Welsh for %i roadmaps, %i not published (S10)",
      async (total, unpublished, expected) => {
        await renderWithProviders({
          authState: connected,
          language: "cy",
          roadmaps: Array.from({ length: total }, (_, index) =>
            createTestRoadmap(`r${String(index)}`, `Roadmap ${String(index)}`, {
              published: index >= unpublished,
            }),
          ),
        })
        expect(await main().findByText(expected)).toBeInTheDocument()
      },
    )

    it("says only the count in Welsh when all are published (S10)", async () => {
      await renderWithProviders({
        authState: connected,
        roadmaps,
        language: "cy",
      })
      expect(await main().findByText("3 map trywydd")).toBeInTheDocument()
    })
  })

  it("keeps a long name whole for assistive tech and the tooltip", async () => {
    const name = `Quarterly ${"very ".repeat(30)}long roadmap`
    await renderWithProviders({
      authState: connected,
      roadmaps: [createTestRoadmap("long-roadmap", name)],
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
        "The connected spreadsheet doesn't list any roadmaps yet.",
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

  it.each([
    [
      "en",
      "Couldn't load your roadmaps",
      "The list of roadmaps in the spreadsheet isn't in the expected format. Ask the spreadsheet owner to check it.",
      "Retry",
    ],
    [
      "cy",
      "Doedd dim modd llwytho eich mapiau trywydd",
      "Nid yw'r rhestr o fapiau trywydd yn y daenlen yn y fformat disgwyliedig. Gofynnwch i berchennog y daenlen ei gwirio.",
      "Ceisio eto",
    ],
  ] as const)(
    "asks for the list to be fixed when it can't be read (%s), without Retry",
    async (language, title, description, retry) => {
      await renderWithProviders({
        authState: connected,
        repository: scriptedRepository(new AppError("invalid-data")),
        language,
      })

      const alert = await main().findByRole("alert")
      expect(alert).toHaveTextContent(title)
      expect(alert).toHaveTextContent(description)
      expect(
        within(alert).queryByRole("button", { name: retry }),
      ).not.toBeInTheDocument()
    },
  )

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
    expect(cardNames()).toEqual(["Product A roadmap"])
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

  it("leaves the list for the start page when the reconnect Refresh asked for is refused, carrying nothing on (STY-057, DEF-006)", async () => {
    const user = userEvent.setup()
    const repository = scriptedRepository(roadmaps)
    const { authClient } = await renderWithProviders({
      authState: connected,
      repository,
    })
    await main().findByText("3 roadmaps")
    act(() => {
      authClient.setState({ status: "expired" })
    })
    await user.click(main().getByRole("button", { name: "Refresh" }))
    const dialog = await findReconnectDialog()
    authClient.connect.mockImplementationOnce(() => {
      authClient.setState({ status: "error", error: "access-denied" })
    })

    await user.click(within(dialog).getByRole("button", { name: "Reconnect" }))

    // The dialog says why over the start page, which a failed connection shows.
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Couldn't reconnect",
    )
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect(screen.getByRole("main")).toHaveFocus()
    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument()
    expect(repository.listRoadmaps).toHaveBeenCalledOnce()
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
    // Pressed, it would ask to reconnect first (STY-057).
    expect(main().getByRole("button", { name: "Refresh" })).toHaveAttribute(
      "aria-disabled",
      "false",
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
      main().getByRole("heading", { level: 1, name: "Your roadmaps" }),
    ).toBeInTheDocument()
  })

  it("forgets the roadmaps on disconnect", async () => {
    const user = userEvent.setup()
    const { queryClient } = await renderWithProviders({
      authState: connected,
      roadmaps,
    })
    await main().findByText("3 roadmaps")

    await disconnectFromHeader(user)

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
      main().getByRole("heading", { level: 1, name: "Eich mapiau trywydd" }),
    ).toBeInTheDocument()
    expect(await main().findByText("2 fap trywydd")).toBeInTheDocument()
    expect(main().getByRole("button", { name: "Adnewyddu" })).toBeEnabled()
  })

  it("names each card by its Welsh title in Welsh, else its English one", async () => {
    await renderWithProviders({
      authState: connected,
      roadmaps: [
        createTestRoadmap("producta", "Product A roadmap", {
          title: { en: "Product A roadmap", cy: "Trywydd Cynnyrch A" },
        }),
        createTestRoadmap("productb", "Product B roadmap"),
      ],
      language: "cy",
    })

    expect(await main().findByText("2 fap trywydd")).toBeInTheDocument()
    // Titles sort as people read them in Welsh: the English title first here.
    expect(cardNames()).toEqual(["Product B roadmap", "Trywydd Cynnyrch A"])
    expect(
      main().getByRole("link", { name: "Trywydd Cynnyrch A" }),
    ).toHaveAttribute("title", "Trywydd Cynnyrch A")
  })
})
