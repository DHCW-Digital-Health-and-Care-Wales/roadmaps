import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { ContractWrite } from "@/domain/roadmap/testing/contract-write"
import type { SyncFault } from "@/domain/roadmap/testing/roadmap-repository-contract"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { editRoadmapText } from "../testing/roadmap-dialog"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const draft = createTestRoadmap("producta", "Product A roadmap", {
  published: false,
  statusLabel: { en: "Beta", cy: "" },
  colour: "#aabbcc",
})
const other = createTestRoadmap("productb", "Product B roadmap")
const item = createTestRoadmapItem("First item", { id: "item-1" })
const unplaced = createTestRoadmapItem("Undecided work", {
  id: "item-2",
  placement: null,
  writtenHorizon: "Soon",
})

const NO_ITEMS_LINE = "The public site will show it with no items."

interface Options {
  roadmaps?: Roadmap[]
  items?: RoadmapItem[]
  write?: ContractWrite
  syncFaults?: Record<string, SyncFault[]>
  language?: Language
}

async function renderPage({
  roadmaps = [draft, other],
  items = [item],
  write,
  syncFaults,
  language,
}: Options = {}) {
  const user = userEvent.setup()
  const repository = createInMemoryRoadmapRepository(
    roadmaps,
    { producta: items },
    { write, syncFaults },
  )
  const rendered = await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
    ...(language ? { language } : {}),
  })
  const main = within(screen.getByRole("main"))
  // The items are read once a heading follows About's: a placement's, or "No items yet".
  await waitFor(() => {
    expect(main.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(1)
  })
  return { user, main, repository, ...rendered }
}

/** Chooses the action, then the dialog's button named `confirm`. */
async function choose(
  user: ReturnType<typeof userEvent.setup>,
  action: string,
  confirm = action,
) {
  await user.click(screen.getByRole("button", { name: action }))
  const dialog = await screen.findByRole("alertdialog")
  await user.click(within(dialog).getByRole("button", { name: confirm }))
}

/** Edits the roadmap's status label in the roadmap dialog, leaving it pending. */
function editStatus(user: ReturnType<typeof userEvent.setup>) {
  return editRoadmapText(user, "Status", "Live")
}

describe("publishing or unpublishing a roadmap (STY-035)", () => {
  it("offers Publish roadmap beside a roadmap not published (S1)", async () => {
    const { main } = await renderPage()

    expect(main.getByText("Not published")).toBeVisible()
    expect(main.getByRole("button", { name: "Publish roadmap" })).toBeVisible()
  })

  it("offers Unpublish roadmap beside a published roadmap (S1)", async () => {
    const { main } = await renderPage({
      roadmaps: [{ ...draft, published: true }, other],
    })

    expect(main.queryByText("Not published")).toBeNull()
    expect(
      main.getByRole("button", { name: "Unpublish roadmap" }),
    ).toBeVisible()
  })

  it("leaves the list with its badge and no such action (S1, D5)", async () => {
    await renderWithProviders({
      path: "/",
      authState: connected,
      repository: createInMemoryRoadmapRepository([draft, other]),
    })
    const main = within(screen.getByRole("main"))

    expect(await main.findByText("Not published")).toBeVisible()
    expect(main.queryByRole("button", { name: /publish roadmap/i })).toBeNull()
  })

  it("is unavailable while the session has expired, as Publish changes is (S1)", async () => {
    const { user, authClient, repository } = await renderPage()

    act(() => {
      authClient.setState({ status: "expired" })
    })
    const action = screen.getByRole("button", { name: "Publish roadmap" })
    expect(action).toHaveAttribute("aria-disabled", "true")
    await user.click(action)

    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect((await repository.listRoadmaps())[0]?.published).toBe(false)
  })

  it("asks first, writes nothing on Cancel, then publishes and says so (S2)", async () => {
    const { user, main, repository } = await renderPage()

    await user.click(main.getByRole("button", { name: "Publish roadmap" }))
    const dialog = await screen.findByRole("alertdialog", {
      name: "Publish Product A roadmap?",
    })
    expect(
      within(dialog).getByText(
        "It shows on the public site after its next nightly update.",
      ),
    ).toBeVisible()
    // Nothing is pending, so nothing is listed as changing.
    expect(within(dialog).queryByText("What changes")).toBeNull()
    expect(within(dialog).queryByRole("list")).toBeNull()
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect((await repository.listRoadmaps())[0]?.published).toBe(false)

    await choose(user, "Publish roadmap")

    expect(
      await main.findByText(
        "Product A roadmap is published. The public site shows it after its next nightly update.",
      ),
    ).toBeVisible()
    expect(main.queryByText("Not published")).toBeNull()
    expect(
      main.getByRole("button", { name: "Unpublish roadmap" }),
    ).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.published).toBe(true)
  })

  it("unpublishes the only published roadmap after asking, unchecked (S3)", async () => {
    const { user, main, repository } = await renderPage({
      roadmaps: [{ ...draft, published: true }],
      syncFaults: { producta: ["short-colour"] },
    })

    await user.click(main.getByRole("button", { name: "Unpublish roadmap" }))
    expect(
      within(
        await screen.findByRole("alertdialog", {
          name: "Unpublish Product A roadmap?",
        }),
      ).getByText("It leaves the public site after its next nightly update."),
    ).toBeVisible()
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Unpublish roadmap",
      }),
    )

    expect(
      await main.findByText(/^Product A roadmap is unpublished\./),
    ).toBeVisible()
    expect(main.getByText("Not published")).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.published).toBe(false)
  })

  it("refuses to publish a roadmap the public site's update would fail on, naming each problem (S4)", async () => {
    const { user, main, repository } = await renderPage({
      syncFaults: { producta: ["short-colour", "no-horizon-column"] },
    })

    await choose(user, "Publish roadmap")

    const alert = await main.findByRole("alert")
    expect(
      within(alert).getByText("Couldn't publish Product A roadmap"),
    ).toBeVisible()
    expect(
      within(alert).getByText(
        "Publishing it would stop the public site updating. Fix the spreadsheet, then publish again.",
      ),
    ).toBeVisible()
    expect(
      within(alert).getByText("The “producta” tab has no Horizon column."),
    ).toBeVisible()
    expect(
      within(alert).getByText(
        "Its colour #abc has 3 digits. Write it with 6, like #aabbcc.",
      ),
    ).toBeVisible()
    expect(main.getByText("Not published")).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.published).toBe(false)
  })

  it("offers Save and publish for a roadmap with unsaved edits, writing both (S5)", async () => {
    const { user, main, repository } = await renderPage()
    await editStatus(user)
    expect(main.getByText("1 change to save")).toBeVisible()

    await user.click(main.getByRole("button", { name: "Publish roadmap" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(/Your unsaved change goes public with it\./),
    ).toBeVisible()
    // Listed as the publish dialog lists it (STY-047 S1).
    expect(
      within(dialog).getByRole("heading", { name: "What changes" }),
    ).toBeVisible()
    expect(
      within(dialog)
        .getAllByRole("listitem")
        .map(({ textContent }) => textContent),
    ).toEqual(["About this roadmapStatus"])
    await user.click(
      within(dialog).getByRole("button", { name: "Save and publish" }),
    )

    expect(
      await main.findByText(/^Changes saved and Product A roadmap published\./),
    ).toBeVisible()
    expect(main.queryByText(/change to save|unpublished change/)).toBeNull()
    expect((await repository.listRoadmaps())[0]).toMatchObject({
      published: true,
      statusLabel: { en: "Live", cy: "" },
    })
  })

  it("publishes nothing on a co-lead's conflicting change, opening the review (S6)", async () => {
    const { user, main, repository } = await renderPage()
    await editStatus(user)
    repository.coLead(([roadmap]) => {
      if (roadmap) roadmap.statusLabel = { en: "Alpha", cy: "" }
    })

    await choose(user, "Publish roadmap", "Save and publish")

    expect(
      await main.findByText("Someone else has changed text you edited"),
    ).toBeVisible()
    expect(
      main.getByRole("button", { name: "Publish roadmap" }),
    ).toHaveAttribute("aria-disabled", "true")
    expect((await repository.listRoadmaps())[0]?.published).toBe(false)

    await user.click(main.getByRole("button", { name: /^Keep mine/ }))
    expect(
      main.getByRole("button", { name: "Publish roadmap" }),
    ).toHaveAttribute("aria-disabled", "false")
  })

  it("leaves pending edits pending on unpublishing, the step then reading Save changes (S7)", async () => {
    const { user, main, repository } = await renderPage({
      roadmaps: [{ ...draft, published: true }],
    })
    await editStatus(user)
    expect(main.getByText("1 unpublished change")).toBeVisible()

    await user.click(main.getByRole("button", { name: "Unpublish roadmap" }))
    const dialog = within(await screen.findByRole("alertdialog"))
    expect(
      dialog.getByText(/Your unpublished change stays, to save later\./),
    ).toBeVisible()
    // It stays pending, so the question lists nothing as changing.
    expect(dialog.queryByText("What changes")).toBeNull()
    expect(dialog.queryByRole("list")).toBeNull()
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Unpublish roadmap",
      }),
    )

    expect(await main.findByText("1 change to save")).toBeVisible()
    expect(main.getByRole("button", { name: "Save changes" })).toBeVisible()
    expect((await repository.listRoadmaps())[0]).toMatchObject({
      published: false,
      statusLabel: { en: "Beta", cy: "" },
    })
  })

  it("says a refused write changed nothing, keeping pending edits (S8)", async () => {
    const { user, main, repository } = await renderPage({
      write: { fails: "forbidden" },
    })
    await editStatus(user)

    await choose(user, "Publish roadmap", "Save and publish")

    const alert = await main.findByRole("alert")
    expect(
      within(alert).getByText("Couldn't publish Product A roadmap"),
    ).toBeVisible()
    expect(
      within(alert).getByText(/isn't allowed to change this roadmap/),
    ).toBeVisible()
    expect(
      within(alert).getByText("Your changes are kept in this tab."),
    ).toBeVisible()
    expect(main.getByText("Not published")).toBeVisible()
    expect(main.getByText("1 change to save")).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.published).toBe(false)
  })

  it("asks for a refresh when the answer is lost and a re-read can't settle it (S10)", async () => {
    const { user, main } = await renderPage({
      write: { lost: "reread-fails" },
    })

    await choose(user, "Publish roadmap")

    expect(
      await main.findByText("Product A roadmap may have been published"),
    ).toBeVisible()
    expect(
      main.getByText(
        "The answer was lost. Refresh this roadmap before you do anything else.",
      ),
    ).toBeVisible()
  })

  it("speaks Welsh throughout (S9)", async () => {
    const { user, main } = await renderPage({
      language: "cy",
      syncFaults: { producta: ["short-colour"] },
    })

    await user.click(
      main.getByRole("button", { name: "Cyhoeddi'r map trywydd" }),
    )
    const dialog = await screen.findByRole("alertdialog", {
      name: "Cyhoeddi Product A roadmap?",
    })
    await user.click(
      within(dialog).getByRole("button", { name: "Cyhoeddi'r map trywydd" }),
    )

    const alert = await main.findByRole("alert")
    expect(
      within(alert).getByText("Doedd dim modd cyhoeddi Product A roadmap"),
    ).toBeVisible()
    expect(
      within(alert).getByText(
        "Mae gan ei liw #abc 3 digid. Ysgrifennwch ef gyda 6, fel #aabbcc.",
      ),
    ).toBeVisible()
  })
})

describe("publishing a roadmap the public would see with no items (STY-042 S3)", () => {
  /** Opens the dialog that "Publish roadmap" or "Unpublish roadmap" asks in. */
  async function ask(
    user: ReturnType<typeof userEvent.setup>,
    action = "Publish roadmap",
  ) {
    await user.click(screen.getByRole("button", { name: action }))
    return screen.findByRole("alertdialog")
  }

  it("says so for a roadmap with no items, which can still be published", async () => {
    const { user, main, repository } = await renderPage({ items: [] })

    const dialog = await ask(user)
    expect(dialog).toHaveAccessibleDescription(
      `It shows on the public site after its next nightly update. ${NO_ITEMS_LINE}`,
    )
    await user.click(
      within(dialog).getByRole("button", { name: "Publish roadmap" }),
    )

    expect(
      await main.findByText(/^Product A roadmap is published\./),
    ).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.published).toBe(true)
  })

  it("says so when no item has a recognised horizon", async () => {
    const { user } = await renderPage({ items: [unplaced] })

    expect(await ask(user)).toHaveAccessibleDescription(
      `It shows on the public site after its next nightly update. ${NO_ITEMS_LINE}`,
    )
  })

  it("says so with edits to save, which still go with it", async () => {
    const { user, main, repository } = await renderPage({ items: [] })
    await editStatus(user)

    const dialog = await ask(user)
    expect(dialog).toHaveAccessibleDescription(
      `It shows on the public site after its next nightly update. ${NO_ITEMS_LINE} Your unsaved change goes public with it.`,
    )
    await user.click(
      within(dialog).getByRole("button", { name: "Save and publish" }),
    )

    expect(
      await main.findByText(/^Changes saved and Product A roadmap published\./),
    ).toBeVisible()
    expect((await repository.listRoadmaps())[0]).toMatchObject({
      published: true,
      statusLabel: { en: "Live", cy: "" },
    })
  })

  it("says nothing of it for an item in a horizon or section", async () => {
    const { user } = await renderPage({ items: [unplaced, item] })

    expect(await ask(user)).toHaveAccessibleDescription(
      "It shows on the public site after its next nightly update.",
    )
  })

  it("says nothing of it once a pending move puts an item in a horizon", async () => {
    const { user, main } = await renderPage({ items: [unplaced] })
    await user.click(main.getByRole("button", { name: "Move Undecided work" }))
    await user.click(await screen.findByRole("menuitem", { name: "Later" }))

    expect(await ask(user)).toHaveAccessibleDescription(
      "It shows on the public site after its next nightly update. Your unsaved change goes public with it.",
    )
  })

  it("never says so on Unpublish roadmap", async () => {
    const { user } = await renderPage({
      roadmaps: [{ ...draft, published: true }, other],
      items: [],
    })

    expect(await ask(user, "Unpublish roadmap")).toHaveAccessibleDescription(
      "It leaves the public site after its next nightly update.",
    )
  })

  it("says so in Welsh (S4)", async () => {
    const { user } = await renderPage({ items: [], language: "cy" })

    expect(
      await ask(user, "Cyhoeddi'r map trywydd"),
    ).toHaveAccessibleDescription(
      "Bydd yn ymddangos ar y wefan gyhoeddus ar ôl ei diweddariad nesaf dros nos. Bydd y wefan gyhoeddus yn ei ddangos heb eitemau.",
    )
  })
})
