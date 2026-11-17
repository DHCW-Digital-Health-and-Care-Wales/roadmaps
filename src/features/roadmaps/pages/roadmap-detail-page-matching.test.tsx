import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RepositoryReadOptions } from "@/domain/roadmap/roadmap-repository"
import type { ContractWrite } from "@/domain/roadmap/testing/contract-write"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import {
  findReconnectDialog,
  reconnectFromDialog,
} from "@/features/auth/testing/reconnect-dialog"
import { AppError } from "@/lib/errors"
import { connected } from "@/test/connected-state"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { openAbout } from "../testing/roadmap-page"
import { expectWriteHold, refreshHold } from "../testing/write-hold"

const outOfStep = (overrides: Partial<Roadmap> = {}) =>
  createTestRoadmap("producta", "Product A roadmap", {
    familyId: "fc29g5b9",
    family: { en: "Single Record", cy: "Cofnod Sengl" },
    colour: "#12a3c9",
    outOfStep: true,
    ...overrides,
  })

async function renderPage(roadmap: Roadmap, write?: ContractWrite) {
  const user = userEvent.setup()
  const repository = createInMemoryRoadmapRepository(
    [roadmap],
    { producta: [createTestRoadmapItem("First item")] },
    { write },
  )
  const { authClient } = await renderWithProviders({
    path: "/roadmaps/producta",
    authState: connected,
    repository,
  })
  const main = within(screen.getByRole("main"))
  await main.findByRole("heading", { level: 3, name: "First item" })
  return { user, main, repository, authClient }
}

describe("making a roadmap match its lists (STY-030)", () => {
  it("writes at once for an unpublished roadmap, then says so and drops the flag (S1)", async () => {
    const { user, main, repository } = await renderPage(
      outOfStep({ published: false }),
    )

    await user.click(main.getByRole("button", { name: /Make it match/ }))

    expect(
      await main.findByText(
        "Product A roadmap now matches its family and category",
      ),
    ).toBeVisible()
    expect(main.queryByRole("button", { name: /Make it match/ })).toBeNull()
    expect(main.queryByText("Doesn't match its family or category")).toBeNull()
    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(false)
  })

  it("holds the app once a match isn't read back, until a Refresh reads it (DEF-015 S1, S3)", async () => {
    const { user, main, repository } = await renderPage(
      outOfStep({ published: false }),
    )
    const reads = vi
      .spyOn(repository, "listRoadmaps")
      .mockRejectedValue(new AppError("network"))

    await user.click(main.getByRole("button", { name: /Make it match/ }))

    const hold = await expectWriteHold(
      "The roadmap now matches its family and category",
    )
    reads.mockRestore()
    await refreshHold(user, hold)
    expect(
      main.getByText("Product A roadmap now matches its family and category"),
    ).toBeVisible()
    expect(main.queryByRole("button", { name: /Make it match/ })).toBeNull()
  })

  it("holds the app, saying nothing more, when the answer is lost (DEF-015 S2)", async () => {
    const { user, main } = await renderPage(outOfStep({ published: false }), {
      lost: "reread-fails",
    })

    await user.click(main.getByRole("button", { name: /Make it match/ }))

    const hold = await expectWriteHold(
      "The roadmap may now match its family and category",
    )
    expect(
      within(screen.getByRole("main", { hidden: true })).queryByText(
        /now matches its family and category/,
      ),
    ).toBeNull()
    expect(hold).toBeInTheDocument()
  })

  it("tells a published roadmap's reader first, writing nothing until they confirm (S2)", async () => {
    const { user, main, repository } = await renderPage(outOfStep())

    await user.click(main.getByRole("button", { name: /Make it match/ }))

    const dialog = await screen.findByRole("alertdialog", {
      name: "Make Product A roadmap match its family and category?",
    })
    expect(
      within(dialog).getByText(/The public site shows the change after/),
    ).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(true)

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))
    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(true)

    await user.click(main.getByRole("button", { name: /Make it match/ }))
    await user.click(
      await within(await screen.findByRole("alertdialog")).findByRole(
        "button",
        { name: "Make it match" },
      ),
    )
    expect(
      await main.findByText(/now matches its family and category. The public/),
    ).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(false)
  })

  it("is not offered for a family the list doesn't have (S3)", async () => {
    const { main } = await renderPage(
      outOfStep({ familyId: null, familyNotListed: true }),
    )

    expect(main.getByText("Family isn't listed")).toBeVisible()
    expect(
      main.getByText("Choose its family under About this roadmap."),
    ).toBeVisible()
    expect(main.queryByRole("button", { name: /Make it match/ })).toBeNull()
  })

  it("asks to reconnect when the session has expired, writing nothing until reconnected (STY-057)", async () => {
    const { user, main, authClient, repository } = await renderPage(
      outOfStep({ published: false }),
    )

    act(() => {
      authClient.setState({ status: "expired" })
    })
    const action = main.getByRole("button", { name: /Make it match/ })
    expect(action).toHaveAttribute("aria-disabled", "false")
    await user.click(action)
    await findReconnectDialog()
    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(true)

    await reconnectFromDialog(user)

    await vi.waitFor(async () => {
      expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(false)
    })
  })

  it("asks to reconnect when confirmed once the session has expired, then matches (STY-057)", async () => {
    const { user, main, authClient, repository } = await renderPage(
      outOfStep({ published: true }),
    )
    await user.click(main.getByRole("button", { name: /Make it match/ }))
    const confirm = await screen.findByRole("alertdialog")

    act(() => {
      authClient.setState({ status: "expired" })
    })
    await user.click(
      within(confirm).getByRole("button", { name: "Make it match" }),
    )
    await findReconnectDialog()
    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(true)

    await reconnectFromDialog(user)

    await vi.waitFor(async () => {
      expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(false)
    })
  })

  it("is not offered for a roadmap in step", async () => {
    const { main } = await renderPage(outOfStep({ outOfStep: false }))

    expect(main.queryByRole("button", { name: /Make it match/ })).toBeNull()
  })

  it("asks first when an unpublished roadmap was published meanwhile (S2)", async () => {
    const { user, main, repository } = await renderPage(
      outOfStep({ published: false }),
    )
    repository.coLead((roadmaps) => {
      const [roadmap] = roadmaps
      if (roadmap) roadmap.published = true
    })

    await user.click(main.getByRole("button", { name: /Make it match/ }))

    expect(
      await main.findByText(/This roadmap changed while you were looking/),
    ).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(true)

    await user.click(main.getByRole("button", { name: /Make it match/ }))
    expect(await screen.findByRole("alertdialog")).toBeVisible()
  })

  it("shows the roadmap as it now is when it changed meanwhile, writing nothing (S4)", async () => {
    const { user, main, repository } = await renderPage(
      outOfStep({ published: false }),
    )
    repository.coLead((roadmaps) => {
      const [roadmap] = roadmaps
      if (roadmap) roadmap.colour = "#ff0000"
    })

    await user.click(main.getByRole("button", { name: /Make it match/ }))

    expect(
      await main.findByText(/This roadmap changed while you were looking/),
    ).toBeVisible()
    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(true)
  })

  it("shows the roadmap the refusal returned even when the list can't be read again (S4)", async () => {
    const user = userEvent.setup()
    const inner = createInMemoryRoadmapRepository(
      [outOfStep({ published: false })],
      { producta: [createTestRoadmapItem("First item")] },
    )
    let listFails = false
    const repository = {
      ...inner,
      listRoadmaps: (options?: RepositoryReadOptions) =>
        listFails
          ? Promise.reject(new AppError("network"))
          : inner.listRoadmaps(options),
      matchRoadmapToLists: async (loaded: Roadmap) => {
        inner.coLead((roadmaps) => {
          const [roadmap] = roadmaps
          if (roadmap) roadmap.family = { en: "Shared Care Record", cy: "" }
        })
        const outcome = await inner.matchRoadmapToLists(loaded)
        listFails = true
        return outcome
      },
    }
    await renderWithProviders({
      path: "/roadmaps/producta",
      authState: connected,
      repository,
    })
    const main = within(screen.getByRole("main"))
    await main.findByRole("heading", { level: 3, name: "First item" })

    await user.click(main.getByRole("button", { name: /Make it match/ }))

    const about = await openAbout(user)
    await vi.waitFor(() => {
      expect(
        within(about).getByText("Family", { selector: "dt" })
          .nextElementSibling,
      ).toHaveTextContent("Shared Care Record")
      expect(
        within(about).getByText("Family", { selector: "dt" })
          .nextElementSibling,
      ).toBeVisible()
    })
  })

  it("says why it failed, keeping the button", async () => {
    const { user, main } = await renderPage(outOfStep({ published: false }), {
      fails: "forbidden",
    })

    await user.click(main.getByRole("button", { name: /Make it match/ }))

    expect(
      await main.findByText("Couldn't make the roadmap match"),
    ).toBeVisible()
    expect(main.getByText(/isn't allowed to change roadmaps/)).toBeVisible()
    expect(main.getByRole("button", { name: /Make it match/ })).toBeEnabled()
  })
})
