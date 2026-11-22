import { within } from "@testing-library/react"

/**
 * The label (`dt`) of a card's field, by the words it reads: found by its whole text,
 * since a label with an icon (STY-079) holds its words in a span of its own, which a
 * text query on `dt` cannot reach. `null` where the card has no such field.
 */
export function fieldTerm(
  scope: HTMLElement,
  label: string,
): HTMLElement | null {
  return (
    within(scope)
      .queryAllByRole("term")
      .find((term) => term.textContent === label) ?? null
  )
}
