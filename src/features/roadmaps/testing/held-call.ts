import type { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"
import { expect, vi } from "vitest"

import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"

/**
 * `call`, held open (test code only): a spy that waits for `release()` before it runs
 * `call`, so a test can look at the screen while a write or a read is under way. Put
 * `held` in the repository's place of `call`. `released` settles once it is let go,
 * for a test that waits for that inside `act`.
 */
export function holdCall<Args extends unknown[], Result>(
  call: (...args: Args) => Promise<Result>,
) {
  let release: () => void = () => undefined
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const held = vi.fn(async (...args: Args) => {
    await released
    return call(...args)
  })
  return { held, release, released }
}

/**
 * A Refresh of a roadmap's page whose read of the items waits (test code only), for a
 * read that lands while a dialog is open: a dialog is modal, so Refresh can't be
 * pressed once it is. Call it before opening the dialog; what it returns lets the read
 * go, with whatever the repository then holds, and settles once the page has taken it.
 */
export async function holdRefresh(
  user: UserEvent,
  repository: Pick<RoadmapRepository, "listRoadmapItems">,
): Promise<() => Promise<void>> {
  const { held, release, released } = holdCall(
    repository.listRoadmapItems.bind(repository),
  )
  vi.spyOn(repository, "listRoadmapItems").mockImplementation(held)
  await user.click(
    within(screen.getByRole("main")).getByRole("button", { name: "Refresh" }),
  )
  expect(held).toHaveBeenCalled()
  return async () => {
    await act(async () => {
      release()
      await released
    })
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Refresh", hidden: true }),
      ).not.toHaveAttribute("aria-busy", "true")
    })
  }
}

/**
 * Reads everything on the page again (test code only), as the browser does when it
 * comes back online: a further read while a dialog is open, once the Refresh of
 * `holdRefresh` has landed.
 */
export function readAgain(queryClient: QueryClient): Promise<void> {
  return act(() => queryClient.refetchQueries())
}
