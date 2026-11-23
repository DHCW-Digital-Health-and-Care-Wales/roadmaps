import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import {
  findReconnectDialog,
  reconnectFromDialog,
} from "@/features/auth/testing/reconnect-dialog"
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { fieldTerm } from "../testing/field-term"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapItems,
} from "../testing/in-memory-roadmap-repository"
import { expectOpeningFocus } from "../testing/opening-focus"
import {
  productDetailsField,
  goToList,
  moreButton,
  openProductDetails,
  openMore,
  refreshRoadmap,
} from "../testing/roadmap-page"

// The roadmap's own text comes first, above the items.
const PRODUCT_DETAILS_HEADING = "Product details"

const roadmaps: Roadmap[] = [
  createTestRoadmap("producta", "Product A roadmap"),
  createTestRoadmap("productb", "Product B roadmap"),
  createTestRoadmap("productc", "Product C roadmap", { published: false }),
]

/** A test item whose title has a Welsh form. */
function welshTitled(
  en: string,
  cy: string,
  overrides: Parameters<typeof createTestRoadmapItem>[1] = {},
): RoadmapItem {
  return { ...createTestRoadmapItem(en, overrides), title: { en, cy } }
}

const everyColumn = welshTitled(
  "Example card with every column",
  "Cerdyn enghreifftiol gyda phob colofn",
  {
    phase: { en: "Beta", cy: "Beta" },
    description: {
      en: "What this work is.\nKeep it to a sentence or two.",
      cy: "Beth yw’r gwaith hwn.",
    },
    expectedOutcome: {
      en: "What changes for users when it is done.",
      cy: "Beth sy’n newid i ddefnyddwyr.",
    },
    tags: [
      { en: "Service X", cy: "Gwasanaeth X" },
      { en: "Service Y", cy: "Gwasanaeth Y" },
    ],
    organisationIds: ["cavuhb", "sbuhb"],
    details: [
      {
        text: { en: "First bullet point", cy: "Pwynt bwled cyntaf" },
        level: 0,
      },
      { text: { en: "Nested once", cy: "Wedi’i nythu unwaith" }, level: 1 },
      { text: { en: "Nested twice", cy: "Wedi’i nythu ddwywaith" }, level: 2 },
      {
        text: { en: "Another top-level bullet point", cy: "" },
        level: 0,
      },
    ],
  },
)

/** Product A's items, as `tests/fixtures/sheets/ProductA.csv` holds them, in row order. */
const productAItems: RoadmapItem[] = [
  everyColumn,
  createTestRoadmapItem("Minimal card", {
    description: {
      en: "Only Title and Horizon are required; everything else is optional.",
      cy: "",
    },
  }),
  createTestRoadmapItem("Card awaiting release", {
    organisationIds: ["national"],
  }),
  createTestRoadmapItem("Card being explored", { placement: "next" }),
  welshTitled("Discovery card", "Cerdyn darganfod", {
    placement: "later",
    phase: { en: "Discovery", cy: "Darganfod" },
  }),
  createTestRoadmapItem("Longer-term idea", { placement: "later" }),
  createTestRoadmapItem("Recently shipped work", {
    placement: "recently-delivered",
  }),
  createTestRoadmapItem("Earlier delivery this year", {
    placement: "delivered-this-year",
  }),
  createTestRoadmapItem("Something we are not doing", {
    placement: "not-doing",
  }),
]

const productBItems: RoadmapItem[] = [
  createTestRoadmapItem("Building the core service"),
  createTestRoadmapItem("Wider rollout", { placement: "next" }),
  createTestRoadmapItem("Integration with another system", {
    placement: "later",
  }),
  createTestRoadmapItem("Prototype", { placement: "delivered-this-year" }),
]

const unplacedItems: RoadmapItem[] = [
  createTestRoadmapItem("Undecided work", {
    placement: null,
    writtenHorizon: "",
  }),
  createTestRoadmapItem("Work coming soon", {
    placement: null,
    writtenHorizon: "Soon",
  }),
  createTestRoadmapItem("Placed work"),
]

const PLACEMENT_HEADINGS = [
  "Recently delivered",
  "Now",
  "Next",
  "Later",
  "Delivered this year",
  "Not doing",
]

function main() {
  return within(screen.getByRole("main"))
}

/** The `li` of the item whose title heading has this name. */
function itemOf(title: string) {
  const item = main()
    .getByRole("heading", { level: 3, name: title })
    .closest("li")
  if (!item) throw new Error(`No list item for ${title}`)
  return item
}

/** A nested list as text: each entry's own text (its block), with its sub-list's entries after it. */
function outline(list: Element): unknown[] {
  return [...list.children].map((entry) => {
    const own = entry.querySelector(":scope > div")?.textContent ?? ""
    const sub = entry.querySelector(":scope > ul")
    return sub ? [own, outline(sub)] : own
  })
}

/** The item titles under the level-2 heading with this name, in order. */
function titlesUnder(heading: string) {
  const list = main().queryByRole("list", { name: heading })
  return list
    ? within(list)
        .getAllByRole("heading", { level: 3 })
        .map((title) => title.textContent)
    : []
}

function renderRoadmap(
  roadmapId: string,
  roadmapItems: InMemoryRoadmapItems,
  options: { language?: Language } = {},
) {
  return renderWithProviders({
    path: `/roadmaps/${roadmapId}`,
    authState: connected,
    roadmaps,
    roadmapItems,
    ...options,
  })
}

describe("RoadmapDetailPage items", () => {
  it("shows the items under the six placements, in order (S1)", async () => {
    await renderRoadmap("producta", { producta: productAItems })

    await main().findByRole("heading", {
      level: 3,
      name: "Example card with every column",
    })
    expect(
      main()
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([PRODUCT_DETAILS_HEADING, ...PLACEMENT_HEADINGS])
    expect(titlesUnder("Now")).toEqual([
      "Example card with every column",
      "Minimal card",
      "Card awaiting release",
    ])
    expect(titlesUnder("Next")).toEqual(["Card being explored"])
    expect(titlesUnder("Later")).toEqual(["Discovery card", "Longer-term idea"])
    expect(titlesUnder("Recently delivered")).toEqual(["Recently shipped work"])
    expect(titlesUnder("Delivered this year")).toEqual([
      "Earlier delivery this year",
    ])
    expect(titlesUnder("Not doing")).toEqual(["Something we are not doing"])
  })

  it("shows every field as plain text, and nothing a field lacks (S2, S12)", async () => {
    await renderRoadmap("producta", { producta: productAItems })

    await main().findByRole("heading", {
      level: 3,
      name: "Example card with every column",
    })
    const field = (label: string) =>
      fieldTerm(itemOf("Example card with every column"), label)
        ?.nextElementSibling
    expect(field("Phase")).toHaveTextContent("Beta")
    expect(field("Description")?.textContent).toBe(
      "What this work is.\nKeep it to a sentence or two.",
    )
    expect(field("Description")).toHaveClass("whitespace-pre-line")
    expect(field("Expected outcome")).toHaveTextContent(
      "What changes for users when it is done.",
    )
    expect(field("Tags")).toHaveTextContent(/^Service X, Service Y$/)
    expect(field("Organisations")).toHaveTextContent(
      /^Cardiff and Vale, Swansea Bay$/,
    )

    const details = field("Details")?.querySelector("ul")
    expect(details && outline(details)).toEqual([
      ["First bullet point", [["Nested once", ["Nested twice"]]]],
      "Another top-level bullet point",
    ])

    const minimal = itemOf("Minimal card")
    expect(
      within(minimal)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Description"])

    expect(
      within(itemOf("Card awaiting release")).getByText("All Wales"),
    ).toBeInTheDocument()
  })

  it("offers the first item under a placement with no items (S3, STY-080 S1)", async () => {
    await renderRoadmap("productb", { productb: productBItems })

    await main().findByRole("heading", { level: 3, name: "Wider rollout" })
    expect(
      main()
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([PRODUCT_DETAILS_HEADING, ...PLACEMENT_HEADINGS])
    // What follows a placement's heading, and whatever sits beside it.
    const under = (name: string) =>
      main().getByRole("heading", { level: 2, name }).parentElement
        ?.nextElementSibling
    for (const empty of ["Recently delivered", "Not doing"]) {
      expect(under(empty)).toHaveTextContent("Add the first item")
    }
    expect(under("Now")).not.toHaveTextContent("Add the first item")
    expect(main().queryByText("No items")).toBeNull()
  })

  it("shows unplaced items first, flagged with what to fix (S4, S13)", async () => {
    await renderRoadmap("producta", { producta: unplacedItems })

    await main().findByRole("heading", { level: 3, name: "Placed work" })
    const headings = main()
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual([
      PRODUCT_DETAILS_HEADING,
      "Not on the public roadmap",
      ...PLACEMENT_HEADINGS,
    ])
    expect(
      main().getByText(
        "These items need a horizon before the public site shows them.",
      ),
    ).toBeInTheDocument()
    expect(titlesUnder("Not on the public roadmap")).toEqual([
      "Undecided work",
      "Work coming soon",
    ])
    expect(itemOf("Undecided work")).toHaveTextContent("No horizon")
    expect(itemOf("Work coming soon")).toHaveTextContent(
      "Horizon “Soon” isn't recognised",
    )
    expect(titlesUnder("Now")).toEqual(["Placed work"])
  })

  it("has no unplaced group when every item is placed (S4)", async () => {
    await renderRoadmap("producta", { producta: productAItems })

    await main().findByRole("heading", { level: 2, name: "Now" })
    expect(
      main().queryByRole("heading", { name: "Not on the public roadmap" }),
    ).not.toBeInTheDocument()
  })

  it("shows Welsh where an item has it, and English where not (S5, S12)", async () => {
    await renderRoadmap(
      "producta",
      { producta: productAItems },
      { language: "cy" },
    )

    await main().findByRole("heading", {
      level: 3,
      name: "Cerdyn enghreifftiol gyda phob colofn",
    })
    expect(
      main()
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Manylion y cynnyrch",
      "Wedi'u cyflawni'n ddiweddar",
      "Nawr",
      "Nesaf",
      "Hwyrach",
      "Wedi'u cyflawni eleni",
      "Ddim yn bwrw ymlaen",
    ])
    const field = (label: string) =>
      fieldTerm(itemOf("Cerdyn enghreifftiol gyda phob colofn"), label)
        ?.nextElementSibling
    expect(field("Disgrifiad")).toHaveTextContent("Beth yw’r gwaith hwn.")
    expect(field("Tagiau")).toHaveTextContent("Gwasanaeth X, Gwasanaeth Y")
    expect(field("Sefydliadau")).toHaveTextContent(
      /^Cardiff and Vale, Swansea Bay$/,
    )
    expect(field("Manylion")).toHaveTextContent(
      "Another top-level bullet point",
    )
    expect(
      within(itemOf("Cerdyn darganfod")).getByText("Darganfod"),
    ).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 3, name: "Minimal card" }),
    ).toBeInTheDocument()
  })

  it("says a roadmap with no items has none, instead of six empty groups, and what to add (S6, STY-042 S2, STY-046 S8)", async () => {
    await renderRoadmap("producta", { producta: [] })

    expect(
      await main().findByRole("heading", { level: 2, name: "No items yet" }),
    ).toBeInTheDocument()
    expect(
      main().getByText("Add what the product is doing now, next and later."),
    ).toBeInTheDocument()
    expect(
      main().getByRole("heading", { level: 1, name: "Product A roadmap" }),
    ).toBeInTheDocument()
    expect(
      main().queryByRole("heading", { name: "Now" }),
    ).not.toBeInTheDocument()
  })

  it("says so in Welsh (STY-042 S4)", async () => {
    await renderRoadmap("producta", { producta: [] }, { language: "cy" })

    expect(
      await main().findByRole("heading", { level: 2, name: "Dim eitemau eto" }),
    ).toBeInTheDocument()
    expect(
      main().getByText(
        "Ychwanegwch yr hyn mae'r cynnyrch yn ei wneud nawr, nesaf ac yn hwyrach.",
      ),
    ).toBeInTheDocument()
  })

  it("keeps the title while the items load (S7)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps)
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: {
        ...repository,
        listRoadmapItems: () => new Promise<never>(() => undefined),
      },
    })

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Product A roadmap",
      }),
    ).toBeInTheDocument()
    expect(main().getByRole("status")).toHaveTextContent(
      "Loading roadmap items…",
    )
  })

  describe("when the items can't be read (S8)", () => {
    it("explains a retryable problem under the title, with Retry", async () => {
      const user = userEvent.setup()
      const listRoadmapItems = vi
        .fn<RoadmapRepository["listRoadmapItems"]>()
        .mockRejectedValueOnce(new AppError("network"))
        .mockRejectedValueOnce(new AppError("network"))
        .mockRejectedValueOnce(new AppError("network"))
        .mockResolvedValue(productAItems)
      await renderWithProviders({
        path: "/roadmaps/producta",
        authState: connected,
        repository: {
          ...createInMemoryRoadmapRepository(roadmaps),
          listRoadmapItems,
        },
      })

      const alert = await main().findByRole("alert")
      expect(
        within(alert).getByRole("heading", {
          level: 2,
          name: "Couldn't load this roadmap's items",
        }),
      ).toBeInTheDocument()
      expect(alert).toHaveTextContent(
        "Couldn't connect. Check your internet connection and try again.",
      )
      expect(
        main().getByRole("heading", { level: 1, name: "Product A roadmap" }),
      ).toBeInTheDocument()

      await user.click(within(alert).getByRole("button", { name: "Retry" }))

      expect(
        await main().findByRole("heading", { level: 2, name: "Now" }),
      ).toBeInTheDocument()
      expect(main().queryByRole("alert")).not.toBeInTheDocument()
    })

    it("explains forbidden access, with no Retry", async () => {
      await renderRoadmap("producta", { producta: new AppError("forbidden") })

      const alert = await main().findByRole("alert")
      expect(alert).toHaveTextContent(
        "You don't have access to this spreadsheet. Ask the spreadsheet owner for access.",
      )
      expect(
        within(alert).queryByRole("button", { name: "Retry" }),
      ).not.toBeInTheDocument()
    })

    it("says something went wrong, with Retry, when it can't tell what", async () => {
      await renderRoadmap("producta", {
        producta: new AppError("unknown", { retryable: true }),
      })

      const alert = await main().findByRole("alert")
      expect(alert).toHaveTextContent("Something went wrong. Please try again.")
      expect(
        within(alert).getByRole("button", { name: "Retry" }),
      ).toBeInTheDocument()
    })

    it("says this roadmap's items, not the list, are in the wrong format", async () => {
      await renderRoadmap("producta", {
        producta: new AppError("invalid-data"),
      })

      const alert = await main().findByRole("alert")
      expect(alert).toHaveTextContent(
        "This roadmap's items aren't in the expected format in the spreadsheet. Ask the spreadsheet owner to check them.",
      )
      expect(alert).not.toHaveTextContent("list of roadmaps")
      expect(
        within(alert).queryByRole("button", { name: "Retry" }),
      ).not.toBeInTheDocument()
    })

    it("leaves the home page's roadmap list alone", async () => {
      const user = userEvent.setup()
      await renderRoadmap("producta", {
        producta: new AppError("invalid-data"),
      })
      await main().findByRole("alert")

      await goToList(user)

      expect(
        await main().findByText("3 roadmaps, 1 not published"),
      ).toBeVisible()
      expect(main().queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  describe("with a session (S9)", () => {
    it("keeps the items, with Reconnect, once the session expires", async () => {
      const { authClient } = await renderRoadmap("producta", {
        producta: productAItems,
      })
      await main().findByRole("heading", { level: 2, name: "Now" })

      act(() => {
        authClient.setState({ status: "expired" })
      })

      const alert = main().getByRole("alert")
      expect(alert).toHaveTextContent("Your session has expired")
      expect(
        within(alert).getByRole("button", { name: "Reconnect" }),
      ).toBeInTheDocument()
      expect(
        main().getByRole("heading", {
          level: 3,
          name: "Example card with every column",
        }),
      ).toBeInTheDocument()
      expect(main().getAllByRole("alert")).toHaveLength(1)
      expect(
        main().getByRole("heading", { level: 1, name: "Product A roadmap" }),
      ).toBeInTheDocument()
      expect(
        main().getByRole("region", { name: "Product details" }),
      ).toBeInTheDocument()
    })

    it("shows the items after connecting from a deep link", async () => {
      const user = userEvent.setup()
      await renderWithProviders({
        path: "/roadmaps/producta",
        roadmaps,
        roadmapItems: { producta: productAItems },
      })

      expect(
        main().getByText("Connect Google to view this roadmap."),
      ).toBeInTheDocument()
      await user.click(main().getByRole("button", { name: "Connect Google" }))

      expect(
        await main().findByRole("heading", {
          level: 3,
          name: "Example card with every column",
        }),
      ).toBeInTheDocument()
    })

    it("still says an unknown roadmap is not found, reading no items", async () => {
      const repository = createInMemoryRoadmapRepository(roadmaps)
      const listRoadmapItems = vi.spyOn(repository, "listRoadmapItems")
      await renderWithProviders({
        path: "/roadmaps/0",
        authState: connected,
        repository,
      })

      expect(
        await main().findByRole("heading", {
          level: 1,
          name: "Roadmap not found",
        }),
      ).toBeInTheDocument()
      expect(listRoadmapItems).not.toHaveBeenCalled()
    })
  })

  describe("Refresh (S14)", () => {
    it("reads the roadmap and its items again", async () => {
      const user = userEvent.setup()
      const repository = createInMemoryRoadmapRepository(roadmaps)
      const listRoadmaps = vi.spyOn(repository, "listRoadmaps")
      const listRoadmapItems = vi
        .fn<RoadmapRepository["listRoadmapItems"]>()
        .mockResolvedValueOnce(unplacedItems)
        .mockResolvedValue(
          unplacedItems.map((item) => ({
            ...item,
            placement: "next",
            writtenHorizon: null,
          })),
        )
      await renderWithProviders({
        path: "/roadmaps/producta",
        authState: connected,
        repository: { ...repository, listRoadmapItems },
      })
      await main().findByRole("heading", { name: "Not on the public roadmap" })
      expect(listRoadmaps).toHaveBeenCalledTimes(1)

      await refreshRoadmap(user)

      await vi.waitFor(() => {
        expect(titlesUnder("Next")).toEqual([
          "Undecided work",
          "Work coming soon",
          "Placed work",
        ])
      })
      expect(
        main().queryByRole("heading", { name: "Not on the public roadmap" }),
      ).not.toBeInTheDocument()
      expect(listRoadmaps).toHaveBeenCalledTimes(2)
      expect(listRoadmapItems).toHaveBeenCalledTimes(2)
    })

    it("is busy while reading", async () => {
      const user = userEvent.setup()
      const repository = createInMemoryRoadmapRepository(roadmaps)
      const listRoadmapItems = vi
        .fn<RoadmapRepository["listRoadmapItems"]>()
        .mockResolvedValueOnce(productAItems)
        .mockReturnValue(new Promise<never>(() => undefined))
      await renderWithProviders({
        path: "/roadmaps/producta",
        authState: connected,
        repository: { ...repository, listRoadmapItems },
      })
      await main().findByRole("heading", { level: 2, name: "Now" })
      expect(moreButton()).toHaveAttribute("aria-busy", "false")

      await refreshRoadmap(user)

      expect(moreButton()).toHaveAttribute("aria-busy", "true")
      const menu = await openMore(user)
      expect(
        within(menu).getByRole("menuitem", { name: "Refresh" }),
      ).toHaveAttribute("aria-disabled", "true")
    })

    it("asks to reconnect when the session has expired, then reads each once (STY-057)", async () => {
      const user = userEvent.setup()
      const repository = createInMemoryRoadmapRepository(roadmaps, {
        producta: productAItems,
      })
      const listRoadmaps = vi.spyOn(repository, "listRoadmaps")
      const listRoadmapItems = vi.spyOn(repository, "listRoadmapItems")
      const { authClient } = await renderWithProviders({
        path: "/roadmaps/producta",
        authState: connected,
        repository,
      })
      await main().findByRole("heading", { level: 2, name: "Now" })
      act(() => {
        authClient.setState({ status: "expired" })
      })
      const menu = await openMore(user)
      expect(
        within(menu).getByRole("menuitem", { name: "Refresh" }),
      ).not.toHaveAttribute("aria-disabled", "true")

      await user.click(within(menu).getByRole("menuitem", { name: "Refresh" }))
      await findReconnectDialog()
      expect(listRoadmapItems).toHaveBeenCalledOnce()
      await reconnectFromDialog(user)

      // Reconnecting reads the page again, and Refresh joins that read.
      await vi.waitFor(() => {
        expect(moreButton()).toHaveAttribute("aria-busy", "false")
      })
      expect(listRoadmaps).toHaveBeenCalledTimes(2)
      expect(listRoadmapItems).toHaveBeenCalledTimes(2)
      await expectOpeningFocus(() => moreButton())
    })

    it("on the home page still reads only the roadmap list", async () => {
      const user = userEvent.setup()
      const repository = createInMemoryRoadmapRepository(roadmaps, {
        producta: productAItems,
      })
      const listRoadmapItems = vi.spyOn(repository, "listRoadmapItems")
      const { router } = await renderWithProviders({
        path: "/roadmaps/producta",
        authState: connected,
        repository,
      })
      await main().findByRole("heading", { level: 2, name: "Now" })
      await act(() => router.navigate({ to: "/" }))
      await main().findByText("3 roadmaps, 1 not published")
      expect(listRoadmapItems).toHaveBeenCalledTimes(1)

      await user.click(main().getByRole("button", { name: "Refresh" }))
      await vi.waitFor(() => {
        expect(main().getByRole("button", { name: "Refresh" })).toHaveAttribute(
          "aria-busy",
          "false",
        )
      })

      expect(listRoadmapItems).toHaveBeenCalledTimes(1)
    })
  })

  it("badges a roadmap out of step with its lists beside its title, and shows the lists' values, in English and Welsh (STY-027 S4, S8)", async () => {
    const flagged = [
      createTestRoadmap("producta", "Product A roadmap", {
        family: { en: "Single Record", cy: "Cofnod Sengl" },
        category: { en: "Clinical", cy: "Clinigol" },
        outOfStep: true,
        familyNotListed: true,
      }),
      ...roadmaps.slice(1),
    ]
    const { unmount } = await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      roadmaps: flagged,
      roadmapItems: { producta: productAItems },
    })

    const title = await main().findByRole("heading", {
      level: 1,
      name: "Product A roadmap",
    })
    expect(title.parentElement).toHaveTextContent(
      /^Product A roadmapDoesn't match its family or categoryFamily isn't listed$/,
    )
    const details = await openProductDetails(userEvent.setup())
    expect(productDetailsField(details, "Family")).toHaveTextContent(
      "Single Record",
    )
    expect(productDetailsField(details, "Category")).toHaveTextContent(
      "Clinical",
    )
    unmount()

    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      roadmaps: flagged,
      roadmapItems: { producta: productAItems },
      language: "cy",
    })
    expect(
      await main().findByText("Yn wahanol i'w deulu neu gategori"),
    ).toBeInTheDocument()
    expect(main().getByText("Teulu heb ei restru")).toBeInTheDocument()
    const detailsCy = await openProductDetails(userEvent.setup())
    expect(productDetailsField(detailsCy, "Teulu")).toHaveTextContent(
      "Cofnod Sengl",
    )
    expect(productDetailsField(detailsCy, "Categori")).toHaveTextContent(
      "Clinigol",
    )
  })

  it("shows no family or category in the product details for a roadmap with neither a family nor a category (STY-027 S4)", async () => {
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      roadmaps,
      roadmapItems: { producta: productAItems },
    })

    await main().findByRole("heading", { level: 1, name: "Product A roadmap" })
    const details = await openProductDetails(userEvent.setup())
    expect(productDetailsField(details, "Family")).toBeNull()
    expect(productDetailsField(details, "Category")).toBeNull()
  })

  it("says a roadmap removed since the list loaded is not found (S16)", async () => {
    const listRoadmaps = vi
      .fn<RoadmapRepository["listRoadmaps"]>()
      .mockResolvedValueOnce(roadmaps)
      .mockResolvedValue(roadmaps.filter(({ id }) => id !== "producta"))
    const listRoadmapItems = vi
      .fn<RoadmapRepository["listRoadmapItems"]>()
      .mockRejectedValue(new AppError("not-found"))
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository: {
        listRoadmaps,
        listRoadmapItems,
        publishRoadmapChanges: vi.fn(),
        listFamilies: vi.fn(),
        listCategories: vi.fn(),
        listOrganisations: vi.fn().mockResolvedValue([]),
        addRoadmap: vi.fn(),
        addFamily: vi.fn(),
        changeFamily: vi.fn(),
        matchRoadmapToLists: vi.fn(),
        setRoadmapPublished: vi.fn(),
      },
    })

    expect(
      await main().findByRole("heading", {
        level: 1,
        name: "Roadmap not found",
      }),
    ).toBeInTheDocument()
    expect(listRoadmaps).toHaveBeenCalledTimes(2)
    expect(main().queryByText(/spreadsheet/)).not.toBeInTheDocument()
  })
})
