import { act, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { renderWithProviders } from "@/test/render-with-providers"

import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const outOfStep = (overrides: Partial<Roadmap> = {}) =>
  createTestRoadmap("producta", "Product A roadmap", {
    familyId: "fc29g5b9",
    family: { en: "Single Record", cy: "Cofnod Sengl" },
    colour: "#12a3c9",
    outOfStep: true,
    ...overrides,
  })

async function renderPage(roadmap: Roadmap, write?: { fails: "forbidden" }) {
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

  it("is held while the session has expired, writing nothing", async () => {
    const { user, main, authClient, repository } = await renderPage(
      outOfStep({ published: false }),
    )

    act(() => {
      authClient.setState({ status: "expired" })
    })
    const action = main.getByRole("button", { name: /Make it match/ })
    expect(action).toHaveAttribute("aria-disabled", "true")
    await user.click(action)

    expect((await repository.listRoadmaps())[0]?.outOfStep).toBe(true)
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
