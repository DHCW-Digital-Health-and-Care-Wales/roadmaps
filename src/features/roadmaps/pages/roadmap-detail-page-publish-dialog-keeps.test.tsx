import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { renderWithProviders } from "@/test/render-with-providers"

import { holdRefresh } from "../testing/held-refresh"
import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import {
  confirmItemEdit,
  editItemText,
  openEditItemDialog,
} from "../testing/item-dialog"
import {
  confirmRoadmapEdit,
  openEditRoadmapDialog,
} from "../testing/roadmap-dialog"

// A dialog that publishes shows what it asked until it has gone (DEF-010).

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}

const roadmaps = [
  createTestRoadmap("producta", "Product A roadmap"),
  createTestRoadmap("productc", "Product C roadmap", { published: false }),
]
const items = {
  producta: [createTestRoadmapItem("First item", { id: "item-1" })],
  productc: [createTestRoadmapItem("Draft item", { id: "item-2" })],
}

type User = ReturnType<typeof userEvent.setup>

function main() {
  return within(screen.getByRole("main"))
}

async function renderPage(path: string) {
  const user = userEvent.setup()
  const repository = createInMemoryRoadmapRepository(roadmaps, items)
  await renderWithProviders({ path, authState: connected, repository })
  await main().findByRole("heading", { level: 3 })
  return { user, repository }
}

/**
 * What the open dialog holds each time the page changes: its text, and whether it
 * offers "Mark as updated today". Stops, and gives them, with `stop`.
 */
function watchDialog() {
  const seen: { text: string; offersMarkUpdated: boolean }[] = []
  const observer = new MutationObserver(() => {
    const dialog = screen.queryByRole("alertdialog")
    if (!dialog) return
    seen.push({
      text: dialog.textContent,
      offersMarkUpdated:
        within(dialog).queryByRole("checkbox", {
          name: "Mark as updated today",
        }) !== null,
    })
  })
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  })
  return () => {
    observer.disconnect()
    return seen
  }
}

async function confirmIn(user: User, name: string) {
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name }),
  )
}

describe("A dialog that publishes closes showing what it asked (DEF-010 S1)", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps the publish dialog's list while it closes", async () => {
    const { user } = await renderPage("/roadmaps/producta")
    const item = await openEditItemDialog(user, "First item")
    await user.type(item.getByRole("textbox", { name: "Phase" }), "Beta")
    await confirmItemEdit(user)
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    const stop = watchDialog()

    await confirmIn(user, "Publish changes")
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })

    const seen = stop()
    expect(seen.length).toBeGreaterThan(0)
    for (const { text } of seen) {
      expect(text).toContain("What changes")
      expect(text).toContain("First item")
    }
  })

  it("does not offer 'Mark as updated today' as it closes after a pending date", async () => {
    const { user } = await renderPage("/roadmaps/producta")
    const form = await openEditRoadmapDialog(user)
    fireEvent.change(form.getByLabelText("Last updated"), {
      target: { value: "2026-11-10" },
    })
    await confirmRoadmapEdit(user)
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    const stop = watchDialog()

    await confirmIn(user, "Publish changes")
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })

    const seen = stop()
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.filter(({ offersMarkUpdated }) => offersMarkUpdated)).toEqual(
      [],
    )
  })

  it("does not offer 'Mark as updated today' as 'Publish roadmap' closes after a pending date", async () => {
    const { user } = await renderPage("/roadmaps/productc")
    const form = await openEditRoadmapDialog(user)
    fireEvent.change(form.getByLabelText("Last updated"), {
      target: { value: "2026-11-10" },
    })
    await confirmRoadmapEdit(user)
    await user.click(main().getByRole("button", { name: "Publish roadmap" }))
    const stop = watchDialog()

    await confirmIn(user, "Save and publish")
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })

    const seen = stop()
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.filter(({ offersMarkUpdated }) => offersMarkUpdated)).toEqual(
      [],
    )
  })
})

describe("The publish dialog never asks to publish nothing (DEF-010 S2, D1)", () => {
  it("closes when a read finds every pending change already written", async () => {
    const { user, repository } = await renderPage("/roadmaps/producta")
    await editItemText(user, "First item", "Phase", "Beta")
    repository.coLead((_list, itemsOf) => {
      const [item] = itemsOf("producta")
      if (!item) throw new Error("No item")
      item.phase = { en: "Beta", cy: "" }
    })
    const land = await holdRefresh(user, repository)
    await user.click(main().getByRole("button", { name: "Publish changes" }))
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()

    await land()

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })
    expect(main().queryByText(/unpublished change/)).toBeNull()
  })
})
