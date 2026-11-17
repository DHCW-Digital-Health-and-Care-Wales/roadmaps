import { screen, waitFor, within } from "@testing-library/react"
import type userEvent from "@testing-library/user-event"
import { expect } from "vitest"

import { expectOpeningFocus } from "./opening-focus"

type User = ReturnType<typeof userEvent.setup>

// A roadmap's page as STY-052 shaped it: Refresh and "Unpublish roadmap" (or "Publish
// roadmap" on a phone's stuck row) in the title row's More, and a publish someone else's
// changes stopped reviewed in a dialog, opened from its notice at the foot.

/** The title row's More, which opens the menu. */
export function moreButton(): HTMLElement {
  return within(screen.getByRole("main")).getByRole("button", { name: "More" })
}

/** Opens More and returns its menu, once it is open. */
export async function openMore(user: User): Promise<HTMLElement> {
  await user.click(moreButton())
  return screen.findByRole("menu")
}

/** Opens More and chooses `item`, then waits for the menu to close. */
export async function chooseFromMore(user: User, item: string) {
  const menu = await openMore(user)
  await user.click(within(menu).getByRole("menuitem", { name: item }))
  await waitFor(() => {
    expect(menu).not.toBeInTheDocument()
  })
}

/** Reads the roadmap's page again, from More. */
export async function refreshRoadmap(user: User) {
  await chooseFromMore(user, "Refresh")
}

const REFUSAL_TITLE =
  /Someone else has changed this roadmap too|Some changes couldn't be kept/

/** The notice at the foot saying a publish was refused, once it shows. */
export function findRefusal(): Promise<HTMLElement> {
  return waitFor(() => {
    const refusal = within(screen.getByRole("main"))
      .getAllByRole("alert")
      .find((alert) => REFUSAL_TITLE.test(alert.textContent))
    if (!refusal) throw new Error("No refusal notice")
    return refusal
  })
}

/**
 * Opens the review from the refusal notice's "Review the changes" and returns it, once
 * focus is on its first Keep mine (or what stands for it).
 */
export async function openConflictReview(user: User): Promise<HTMLElement> {
  const refusal = await findRefusal()
  await user.click(
    within(refusal).getByRole("button", { name: "Review the changes" }),
  )
  const review = await screen.findByRole("dialog", {
    name: "Someone else has changed this roadmap too",
  })
  const [first] = within(review).getAllByRole("button")
  if (first) await expectOpeningFocus(first)
  return review
}

/** Closes the review with its Close, then waits for it to leave the page. */
export async function closeConflictReview(user: User, review: HTMLElement) {
  await user.click(within(review).getByRole("button", { name: "Close" }))
  await waitFor(() => {
    expect(review).not.toBeInTheDocument()
  })
}
