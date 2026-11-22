import { waitFor } from "@testing-library/react"
import { expect } from "vitest"

/**
 * Waits for the field `find` returns to take the focus a dialog or an opened field
 * moves to once it has rendered. `find` is retried with the focus check: a field that
 * comes back as a dialog closes renders a moment after the dialog has gone, and focus
 * lags the element, so a read right after finding it can still see the button that
 * opened it. Look the field up inside `find`: one found before the call is not found
 * again.
 */
export async function expectOpeningFocus(find: () => HTMLElement) {
  await waitFor(() => {
    expect(find()).toHaveFocus()
  })
}
