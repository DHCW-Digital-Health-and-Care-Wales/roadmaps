import { screen, waitFor, within } from "@testing-library/react"
import type userEvent from "@testing-library/user-event"
import { expect } from "vitest"

import { expectOpeningFocus } from "./opening-focus"

type User = ReturnType<typeof userEvent.setup>

// A roadmap's page as STY-052, STY-053 and STY-059 shaped it: Refresh and "Unpublish
// roadmap" (or "Publish roadmap" once the header has stuck) in its More, a publish
// someone else's changes stopped reviewed in a dialog, opened from its notice at the
// foot, and "About this roadmap" a disclosure, closed until pressed. No back link: the
// header's name leads to the list.

/** Goes back to the roadmap list by the header's name, its home link (STY-059 D3). */
export async function goToList(user: User) {
  await user.click(
    within(screen.getByRole("banner")).getByRole("link", {
      name: /(home|hafan)$/,
    }),
  )
}

/** The header's More, which opens the menu. */
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

/** "About this roadmap", once it has been read. */
function findAbout(): Promise<HTMLElement> {
  return screen.findByRole("region", { name: /About this roadmap|Ynglŷn/ })
}

/**
 * Opens "About this roadmap" by its disclosure, unless it is open already, and returns
 * it, its fields shown.
 */
export async function openAbout(user: User): Promise<HTMLElement> {
  const about = await findAbout()
  const disclosure = within(about).getByRole("button", {
    name: /^(About this roadmap|Ynglŷn â'r map trywydd hwn)$/,
  })
  if (disclosure.getAttribute("aria-expanded") !== "true") {
    await user.click(disclosure)
  }
  return about
}

const FACTS = { name: /^(Roadmap details|Manylion y map trywydd)$/ }

/** The roadmap's facts under its title, "Roadmap details" (STY-059 S2). */
export function roadmapFacts(): HTMLElement {
  return within(screen.getByRole("main")).getByRole("list", FACTS)
}

/** The roadmap's facts, once the roadmap has been read. */
export function findRoadmapFacts(): Promise<HTMLElement> {
  return within(screen.getByRole("main")).findByRole("list", FACTS)
}

/** What the opened About shows under `term`, or null when it has no such field. */
export function aboutField(about: HTMLElement, term: string): Element | null {
  return (
    within(about).queryByText(term, { selector: "dt" })?.nextElementSibling ??
    null
  )
}
