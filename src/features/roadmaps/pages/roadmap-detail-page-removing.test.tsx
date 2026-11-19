import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { disconnectFromHeader } from "@/features/auth/testing/account-menu"
import type { Language } from "@/i18n"
import { AppError } from "@/lib/errors"
import { TABLET_WIDTH } from "@/lib/use-media-query"
import { connected } from "@/test/connected-state"
import { matchMediaQueries } from "@/test/media-query"
import { renderWithProviders } from "@/test/render-with-providers"

import { cornerClose, expectDialogClosed } from "../testing/edit-dialog"
import { holdRefresh } from "../testing/held-refresh"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapRepository,
} from "../testing/in-memory-roadmap-repository"
import {
  addItem,
  confirmItemEdit,
  openEditItemDialog,
} from "../testing/item-dialog"
import { expectOpeningFocus } from "../testing/opening-focus"
import {
  askToRemove,
  REMOVAL,
  removalDialog,
  confirmRemoval,
} from "../testing/removal-dialog"
import { openConflictReview, reviewFooterClose } from "../testing/roadmap-page"

/**
 * A Product Lead removes an item the public site shows (STY-049): Remove asks first,
 * with "Move to Not doing" first; a removal is pending, struck through in place with
 * "Undo removal", counted as one change, listed in the publish dialog and reviewed when
 * a co-lead changed the item.
 */

const item = (title: string, placement: RoadmapPlacement | null = "now") =>
  createTestRoadmapItem(title, {
    id: `${title.toLowerCase().replaceAll(" ", "")}idxx`,
    placement,
    ...(placement === null && { writtenHorizon: "Soon" }),
  })

const FAX = "Fax referrals"

/** Now holds three items, Next one, Not doing one, and one is unplaced. */
const items: RoadmapItem[] = [
  item("Online form"),
  { ...item(FAX), description: { en: "Fax still works", cy: "" } },
  item("Status updates"),
  item("Patient app", "next"),
  item("Paper forms", "not-doing"),
  item("Someday", null),
]

type User = ReturnType<typeof userEvent.setup>

// The view chosen is kept on this device: the compact view's test leaves cards behind.
afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

function main() {
  return within(screen.getByRole("main"))
}

/** The card or row of the item headed `title`. */
function card(title: string) {
  const heading = main().getByRole("heading", { level: 3, name: title })
  const found = heading.closest("li")
  if (!found) throw new Error(`No card for ${title}`)
  return within(found)
}

/** The titles listed under a horizon or section heading. */
function titlesUnder(heading: string) {
  return within(main().getByRole("list", { name: heading }))
    .getAllByRole("heading", { level: 3 })
    .map(({ textContent }) => textContent)
}

async function renderPage({
  published = true,
  language,
  repository = createInMemoryRoadmapRepository(
    [createTestRoadmap("producta", "Product A roadmap", { published })],
    { producta: items },
  ),
}: {
  published?: boolean
  language?: Language
  repository?: InMemoryRoadmapRepository
} = {}) {
  const user = userEvent.setup()
  const rendered = await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  await main().findByRole("heading", { level: 3, name: "Someday" })
  return { user, repository, ...rendered }
}

/** Confirms the publish dialog, returning what it listed. */
async function publish(user: User) {
  await user.click(main().getByRole("button", { name: "Publish changes" }))
  const dialog = within(screen.getByRole("alertdialog"))
  const listed = dialog
    .getAllByRole("listitem")
    .map(({ textContent }) => textContent)
  await user.click(dialog.getByRole("button", { name: "Publish changes" }))
  return listed
}

async function changePhase(user: User, title: string, phase: string) {
  const form = await openEditItemDialog(user, title)
  await user.type(form.getByRole("textbox", { name: "Phase" }), phase)
  await confirmItemEdit(user)
}

const storedTitles = async (repository: InMemoryRoadmapRepository) =>
  (await repository.listRoadmapItems("producta")).map(({ title }) => title.en)

describe("Remove asks first, with Not doing first (S1)", () => {
  it("names the item, says when it leaves the public roadmap and offers Move to Not doing, Remove, then Cancel", async () => {
    const { user } = await renderPage()

    const dialog = await askToRemove(user, FAX)

    expect(
      screen.getByRole("dialog", { name: `Remove “${FAX}”?` }),
    ).toHaveAccessibleDescription(
      "It leaves the public roadmap when you publish. To show readers the work was dropped, move it to Not doing instead.",
    )
    expect(
      dialog.getAllByRole("button").map(({ textContent }) => textContent),
    ).toEqual(["Move to Not doing", "Remove", "Cancel", "Close"])
    await expectOpeningFocus(
      dialog.getByRole("button", { name: "Move to Not doing" }),
    )
  })

  it.each([
    [
      "Cancel",
      (user: User) =>
        user.click(removalDialog(FAX).getByRole("button", { name: "Cancel" })),
    ],
    ["Escape", (user: User) => user.keyboard("{Escape}")],
    [
      "the close button",
      (user: User) =>
        user.click(cornerClose(screen.getByRole("dialog", { name: /Remove/ }))),
    ],
  ])("%s changes nothing, with focus back on Remove", async (_name, close) => {
    const { user } = await renderPage()
    await askToRemove(user, FAX)

    await close(user)
    await expectDialogClosed()

    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(card(FAX).queryByText("Removed")).toBeNull()
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: `Remove ${FAX}` }),
      ).toHaveFocus()
    })
  })

  it("does nothing on a click outside it", async () => {
    const { user } = await renderPage()
    await askToRemove(user, FAX)

    await user.click(document.body)

    expect(
      screen.getByRole("dialog", { name: `Remove “${FAX}”?` }),
    ).toBeVisible()
  })

  it("moves the item to Not doing, pending, as the Move menu does, with focus on its Move there", async () => {
    const { user } = await renderPage()

    await confirmRemoval(user, FAX, { choice: "notDoing" })

    expect(titlesUnder("Not doing")).toEqual(["Paper forms", FAX])
    expect(card(FAX).getByText("Changed")).toBeVisible()
    expect(main().getByText("1 unpublished change")).toBeVisible()
    await waitFor(() => {
      expect(main().getByRole("button", { name: `Move ${FAX}` })).toHaveFocus()
    })
  })

  it("works once the session has expired: it only keeps a pending change", async () => {
    const { user, authClient } = await renderPage()
    act(() => {
      authClient.setState({ status: "expired" })
    })

    await confirmRemoval(user, FAX)

    expect(card(FAX).getByText("Removed")).toBeVisible()
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })

  it("asks from a compact row's Remove, in the opened row", async () => {
    matchMediaQueries(TABLET_WIDTH)
    const { user } = await renderPage()
    await user.click(main().getByRole("button", { name: "Compact" }))
    await user.click(
      main().getByRole("button", { name: `Show the rest of ${FAX}` }),
    )

    await confirmRemoval(user, FAX)

    expect(card(FAX).getByText("Removed")).toBeVisible()
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: `Undo removal ${FAX}` }),
      ).toHaveFocus()
    })
  })
})

describe("A confirmed removal (S2)", () => {
  it("leaves the card in place, struck through and tagged Removed, with Undo removal focused and Move and Edit held, nothing written", async () => {
    const { user, repository } = await renderPage()

    await confirmRemoval(user, FAX)

    expect(titlesUnder("Now")).toEqual(["Online form", FAX, "Status updates"])
    const removed = card(FAX)
    expect(removed.getByText("Removed")).toBeVisible()
    await waitFor(() => {
      expect(
        removed.getByRole("button", { name: `Undo removal ${FAX}` }),
      ).toHaveFocus()
    })
    for (const name of [`Move ${FAX}`, `Edit ${FAX}`]) {
      expect(removed.getByRole("button", { name })).toHaveAttribute(
        "aria-disabled",
        "true",
      )
    }
    expect(removed.queryByRole("button", { name: `Remove ${FAX}` })).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeVisible()
    expect(await storedTitles(repository)).toContain(FAX)
  })
})

describe("Undo removal (S3)", () => {
  it("brings back the item with its pending edits, which counted for nothing while it was removed", async () => {
    const { user } = await renderPage()
    await changePhase(user, FAX, "Beta")
    await confirmRemoval(user, FAX)
    expect(main().getByText("1 unpublished change")).toBeVisible()
    expect(card(FAX).queryByText("Changed")).toBeNull()

    await user.click(main().getByRole("button", { name: "Publish changes" }))
    expect(
      within(screen.getByRole("alertdialog"))
        .getAllByRole("listitem")
        .map(({ textContent }) => textContent),
    ).toEqual([`${FAX}Removed`])
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Cancel",
      }),
    )

    await user.click(
      main().getByRole("button", { name: `Undo removal ${FAX}` }),
    )

    expect(card(FAX).getByText("Changed")).toBeVisible()
    expect(card(FAX).getByText("Beta")).toBeVisible()
    expect(card(FAX).queryByText("Removed")).toBeNull()
    expect(main().getByText("1 unpublished change")).toBeVisible()
    await waitFor(() => {
      expect(
        main().getByRole("button", { name: `Remove ${FAX}` }),
      ).toHaveFocus()
    })
  })

  it("is what Discard all does too, bringing the item back as read", async () => {
    const { user } = await renderPage()
    await changePhase(user, FAX, "Beta")
    await confirmRemoval(user, FAX)

    await user.click(
      main().getByRole("button", { name: "Discard all changes" }),
    )
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Discard all changes",
      }),
    )

    expect(card(FAX).queryByText("Removed")).toBeNull()
    expect(card(FAX).queryByText("Changed")).toBeNull()
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })

  it("is not what Disconnect then Keep does: the removal stays pending", async () => {
    const { user, router } = await renderPage()
    await confirmRemoval(user, FAX)

    await disconnectFromHeader(user)
    await user.click(
      screen.getByRole("button", { name: "Keep changes and disconnect" }),
    )
    await act(() => router.navigate({ to: "/" }))
    await user.click(main().getByRole("button", { name: "Connect Google" }))
    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )

    await main().findByRole("heading", { level: 3, name: FAX })
    expect(card(FAX).getByText("Removed")).toBeVisible()
    expect(main().getByText("1 unpublished change")).toBeVisible()
  })
})

describe("What the page counts (S4)", () => {
  it("still shows the struck card in a placement it empties, which the jump navigation counts as none, marked pending", async () => {
    matchMediaQueries(TABLET_WIDTH)
    const { user } = await renderPage()

    await confirmRemoval(user, "Patient app")

    expect(titlesUnder("Next")).toEqual(["Patient app"])
    expect(main().queryByText("None in this placement")).toBeNull()
    expect(
      within(
        main().getByRole("navigation", { name: "Horizons and sections" }),
      ).getByRole("link", { name: "Next, no items, unpublished changes" }),
    ).toBeInTheDocument()
  })

  it("says the public would see no items when “Publish roadmap” would leave it none", async () => {
    const roadmap = createTestRoadmap("producta", "Product A roadmap", {
      published: false,
    })
    const { user } = await renderPage({
      repository: createInMemoryRoadmapRepository([roadmap], {
        producta: [item(FAX), item("Someday", null)],
      }),
    })
    await confirmRemoval(user, FAX)

    await user.click(main().getByRole("button", { name: "Publish roadmap" }))

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "The public site will show it with no items.",
    )
  })
})

describe("Publishing a removal (S5, S7)", () => {
  it("lists the removal beside the other change and deletes the item, the count then 0", async () => {
    const { user, repository } = await renderPage()
    await changePhase(user, "Online form", "Live")
    await confirmRemoval(user, FAX)

    expect(await publish(user)).toEqual(["Online formPhase", `${FAX}Removed`])

    expect(await main().findByText(/^Changes published\./)).toBeVisible()
    expect(main().queryByRole("heading", { level: 3, name: FAX })).toBeNull()
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(await storedTitles(repository)).not.toContain(FAX)
  })

  it("publishes the rest when a co-lead has already deleted the item, with no “not found” notice (S7)", async () => {
    const { user, repository } = await renderPage()
    await changePhase(user, "Online form", "Live")
    await confirmRemoval(user, FAX)
    repository.coLead((_roadmaps, itemsOf) => {
      const stored = itemsOf("producta")
      stored.splice(
        stored.findIndex(({ title }) => title.en === FAX),
        1,
      )
    })

    await publish(user)

    expect(await main().findByText(/^Changes published\./)).toBeVisible()
    expect(main().queryByText(/couldn't be kept/)).toBeNull()
    expect(main().queryByText(/unpublished change/)).toBeNull()
    expect(card("Online form").getByText("Live")).toBeVisible()
  })
})

describe("A co-lead's change to a removed item (S6)", () => {
  async function refusedRemoval({
    description = { en: "Their reason", cy: "" },
    readFails = false,
  }: { description?: LocalisedText; readFails?: boolean } = {}) {
    const rendered = await renderPage()
    const { user, repository } = rendered
    await changePhase(user, FAX, "Beta")
    await confirmRemoval(user, FAX)
    repository.coLead((_roadmaps, itemsOf) => {
      const fax = itemsOf("producta").find(({ title }) => title.en === FAX)
      if (fax) fax.description = description
    })
    if (readFails) {
      vi.spyOn(repository, "listRoadmapItems").mockRejectedValue(
        new AppError("network"),
      )
    }
    await publish(user)
    const review = await openConflictReview(user)
    return { ...rendered, review }
  }

  it("is reviewed: “Your change: Removed” beside each field they changed, nothing published", async () => {
    const { review, repository } = await refusedRemoval()

    const conflict = within(
      within(review)
        .getAllByRole("listitem")
        .find(
          (each) => each.querySelector(":scope > p")?.textContent === FAX,
        ) ?? review,
    )
    expect(review).toHaveTextContent("Nothing was published.")
    expect(
      conflict.getAllByRole("term").map(({ textContent }) => textContent),
    ).toEqual(["Your change", "Current text", "Description"])
    expect(conflict.getAllByRole("definition")[0]).toHaveTextContent("Removed")
    expect(conflict.getAllByRole("definition")[1]).toHaveTextContent(
      "DescriptionTheir reason",
    )
    await expectOpeningFocus(
      conflict.getByRole("button", { name: `Remove anyway ${FAX}` }),
    )
    expect(
      conflict.getByRole("button", { name: `Keep the item ${FAX}` }),
    ).toBeVisible()
    expect(await storedTitles(repository)).toContain(FAX)
  })

  it("shows a change to the item's Welsh alone, as its English reads as it did", async () => {
    const { review } = await refusedRemoval({
      description: { en: "Fax still works", cy: "Ei reswm" },
    })

    expect(within(review).getAllByRole("definition")[1]).toHaveTextContent(
      "DescriptionFax still worksIn Welsh: Ei reswm",
    )
  })

  it("Keep the item drops the removal: the item reads as they made it, with the edits beneath it pending, though the read after the refusal failed", async () => {
    const { user, review } = await refusedRemoval({ readFails: true })

    await user.click(
      within(review).getByRole("button", { name: `Keep the item ${FAX}` }),
    )
    await user.click(reviewFooterClose(review))
    await expectDialogClosed()

    await waitFor(() => {
      expect(card(FAX).getByText("Their reason")).toBeVisible()
    })
    expect(card(FAX).queryByText("Removed")).toBeNull()
    expect(card(FAX).getByText("Changed")).toBeVisible()
    expect(card(FAX).getByText("Beta")).toBeVisible()
  })

  it("Remove anyway keeps the removal for the next publish, which deletes the item", async () => {
    const { user, review, repository } = await refusedRemoval()

    await user.click(
      within(review).getByRole("button", { name: `Remove anyway ${FAX}` }),
    )
    await user.click(
      within(review).getByRole("button", { name: "Publish changes" }),
    )
    await expectDialogClosed()
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Publish changes",
      }),
    )

    expect(await main().findByText(/^Changes published\./)).toBeVisible()
    expect(await storedTitles(repository)).not.toContain(FAX)
  })
})

describe("A removal in a placement with a pending order (S8)", () => {
  async function openMoveMenu(user: User, title: string) {
    await user.click(main().getByRole("button", { name: `Move ${title}` }))
    return screen.findByRole("menu")
  }

  it("keeps the removed item's place, counts the others' positions without it, and Undo puts it back there", async () => {
    const { user } = await renderPage()
    let menu = await openMoveMenu(user, "Status updates")
    await user.click(within(menu).getByRole("menuitem", { name: "To the top" }))
    expect(titlesUnder("Now")).toEqual(["Status updates", "Online form", FAX])

    await confirmRemoval(user, FAX)

    expect(titlesUnder("Now")).toEqual(["Status updates", "Online form", FAX])
    menu = await openMoveMenu(user, "Online form")
    expect(menu).toHaveTextContent(/^In Now: 2 of 2/)
    expect(
      within(menu).queryByRole("menuitem", { name: "Down one" }),
    ).toBeNull()
    await user.keyboard("{Escape}")

    await user.click(
      main().getByRole("button", { name: `Undo removal ${FAX}` }),
    )
    expect(titlesUnder("Now")).toEqual(["Status updates", "Online form", FAX])
    expect(main().getByText("Order changed")).toBeInTheDocument()
  })
})

describe("A roadmap that isn't published (S9)", () => {
  it("says the item leaves the roadmap when saved, not the public site, still offering Not doing first", async () => {
    const { user } = await renderPage({ published: false })

    const dialog = await askToRemove(user, FAX)

    expect(
      screen.getByRole("dialog", { name: `Remove “${FAX}”?` }),
    ).toHaveAccessibleDescription(
      "It leaves the roadmap when you save. To show the work was dropped, move it to Not doing instead.",
    )
    expect(dialog.getAllByRole("button")[0]).toHaveTextContent(
      "Move to Not doing",
    )
  })
})

describe("A new item's Remove (S10)", () => {
  it("asks the same question; Move to Not doing moves it there, still New", async () => {
    const { user } = await renderPage()
    await addItem(user, "Patient app pilot", "Next")

    const dialog = await askToRemove(user, "Patient app pilot")
    expect(
      screen.getByRole("dialog", { name: "Remove “Patient app pilot”?" }),
    ).toHaveAccessibleDescription(
      "It's new, so it goes straight away. To show readers the work was dropped, move it to Not doing instead.",
    )
    await user.click(dialog.getByRole("button", { name: "Move to Not doing" }))
    await expectDialogClosed()

    expect(titlesUnder("Not doing")).toEqual([
      "Paper forms",
      "Patient app pilot",
    ])
    expect(card("Patient app pilot").getByText("New")).toBeVisible()
  })
})

describe("Not doing where it means nothing (S11)", () => {
  it.each(["Paper forms", "Someday"])(
    "is not offered for %s, in Not doing or unplaced",
    async (title) => {
      const { user } = await renderPage()

      const dialog = await askToRemove(user, title)

      expect(
        dialog.getAllByRole("button").map(({ textContent }) => textContent),
      ).toEqual(["Remove", "Cancel", "Close"])
      expect(
        screen.getByRole("dialog", { name: `Remove “${title}”?` }),
      ).toHaveAccessibleDescription(
        "It leaves the public roadmap when you publish.",
      )
    },
  )
})

describe("A read that lands while the dialog is open", () => {
  it("keeps it open on an item a co-lead moved, and Remove removes it there", async () => {
    const { user, repository } = await renderPage()
    const letGo = await holdRefresh(user, repository)
    await askToRemove(user, FAX)

    repository.coLead((_roadmaps, itemsOf) => {
      const fax = itemsOf("producta").find(({ title }) => title.en === FAX)
      if (fax) fax.placement = "later"
    })
    await letGo()

    await user.click(removalDialog(FAX).getByRole("button", { name: "Remove" }))
    await expectDialogClosed()
    expect(titlesUnder("Later")).toEqual([FAX])
    expect(card(FAX).getByText("Removed")).toBeVisible()
  })

  it("closes it once the item has gone", async () => {
    const { user, repository } = await renderPage()
    const letGo = await holdRefresh(user, repository)
    await askToRemove(user, FAX)

    repository.coLead((_roadmaps, itemsOf) => {
      const stored = itemsOf("producta")
      stored.splice(
        stored.findIndex(({ title }) => title.en === FAX),
        1,
      )
    })
    await letGo()

    await expectDialogClosed()
    expect(main().queryByRole("heading", { level: 3, name: FAX })).toBeNull()
  })
})

describe("Welsh (S12)", () => {
  it("asks, tags and undoes in Welsh", async () => {
    const { user } = await renderPage({ language: "cy" })
    const cy = REMOVAL.cy

    const dialog = await askToRemove(user, FAX, "cy")
    expect(
      screen.getByRole("dialog", { name: cy.heading(FAX) }),
    ).toHaveAccessibleDescription(
      "Bydd yn gadael y map trywydd cyhoeddus pan fyddwch chi'n cyhoeddi. I ddangos i ddarllenwyr bod y gwaith wedi'i ollwng, symudwch hi i Ddim yn bwrw ymlaen yn lle hynny.",
    )
    await user.click(dialog.getByRole("button", { name: cy.confirm }))
    await expectDialogClosed()

    expect(card(FAX).getByText(cy.tag)).toBeVisible()
    await user.click(main().getByRole("button", { name: `${cy.undo} ${FAX}` }))
    expect(card(FAX).queryByText(cy.tag)).toBeNull()
  })

  it("reviews a co-lead's change to it in Welsh", async () => {
    const { user, repository } = await renderPage({ language: "cy" })
    await confirmRemoval(user, FAX, { language: "cy" })
    repository.coLead((_roadmaps, itemsOf) => {
      const fax = itemsOf("producta").find(({ title }) => title.en === FAX)
      if (fax) fax.description = { en: "Their reason", cy: "" }
    })

    await user.click(
      main().getByRole("button", { name: "Cyhoeddi'r newidiadau" }),
    )
    const dialog = within(screen.getByRole("alertdialog"))
    expect(dialog.getByRole("listitem")).toHaveTextContent(
      `${FAX}${REMOVAL.cy.tag}`,
    )
    await user.click(
      dialog.getByRole("button", { name: "Cyhoeddi'r newidiadau" }),
    )
    await user.click(
      await main().findByRole("button", { name: "Adolygu'r newidiadau" }),
    )
    const review = within(
      await screen.findByRole("dialog", {
        name: "Mae rhywun arall wedi newid y map trywydd hwn hefyd",
      }),
    )

    expect(review.getAllByRole("definition")[0]).toHaveTextContent(
      REMOVAL.cy.tag,
    )
    expect(
      review.getByRole("button", { name: `Tynnu beth bynnag ${FAX}` }),
    ).toBeVisible()
    expect(
      review.getByRole("button", { name: `Cadw'r eitem ${FAX}` }),
    ).toBeVisible()
  })
})
