import { waitFor } from "@testing-library/react"
import { expect } from "vitest"

/**
 * Waits for `field` to take the focus a dialog or an opened field moves to once it
 * has rendered. Focus lags the element, so a read right after finding it can still see
 * the button that opened it.
 */
export async function expectOpeningFocus(field: HTMLElement) {
  await waitFor(() => {
    expect(field).toHaveFocus()
  })
}
