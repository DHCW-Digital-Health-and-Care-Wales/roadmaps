import { screen, waitFor, within } from "@testing-library/react"
import type userEvent from "@testing-library/user-event"
import { expect } from "vitest"

import { expectOpeningFocus } from "./opening-focus"

type User = ReturnType<typeof userEvent.setup>

/**
 * The write hold (DEF-015) titled `title`, once it is open with focus on Refresh and the
 * page, header included, out of reach behind it.
 */
export async function expectWriteHold(title: string): Promise<HTMLElement> {
  const hold = await screen.findByRole("alertdialog", { name: title })
  await expectOpeningFocus(
    within(hold).getByRole("button", { name: "Refresh" }),
  )
  expect(screen.queryByRole("main")).toBeNull()
  expect(screen.queryByRole("banner")).toBeNull()
  return hold
}

/** Chooses the hold's Refresh, then waits for the hold to end. */
export async function refreshHold(user: User, hold: HTMLElement) {
  await user.click(within(hold).getByRole("button", { name: "Refresh" }))
  await waitFor(() => {
    expect(hold).not.toBeInTheDocument()
  })
}
