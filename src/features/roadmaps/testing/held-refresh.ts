import type { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"
import { expect, vi } from "vitest"

import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"

import { holdCall } from "./held-call"
import { refreshRoadmap } from "./roadmap-page"

// A read that lands on a roadmap's page while a dialog is open (test code only): a
// dialog is modal, so Refresh can't be pressed once it is.

/**
 * Asks for a Refresh of the page with its read of the items held. Call it before
 * opening the dialog; what it returns lets the read go, with whatever the repository
 * then holds, and settles once the page has taken it.
 */
export async function holdRefresh(
  user: UserEvent,
  repository: Pick<RoadmapRepository, "listRoadmapItems">,
): Promise<() => Promise<void>> {
  const { held, release, released } = holdCall(
    repository.listRoadmapItems.bind(repository),
  )
  vi.spyOn(repository, "listRoadmapItems").mockImplementation(held)
  await refreshRoadmap(user)
  expect(held).toHaveBeenCalled()
  return async () => {
    await act(async () => {
      release()
      await released
    })
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "More", hidden: true }),
      ).not.toHaveAttribute("aria-busy", "true")
    })
  }
}

/**
 * Reads everything on the page again, as the browser does when it comes back online:
 * a further read while the dialog is open, once `holdRefresh`'s has landed.
 */
export function readAgain(queryClient: QueryClient): Promise<void> {
  return act(() => queryClient.refetchQueries())
}
