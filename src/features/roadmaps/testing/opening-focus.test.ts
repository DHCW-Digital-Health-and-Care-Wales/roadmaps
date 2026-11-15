import { afterEach, describe, expect, it } from "vitest"

import { expectOpeningFocus } from "./opening-focus"

function field() {
  const input = document.createElement("input")
  document.body.append(input)
  return input
}

describe("expectOpeningFocus", () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it("waits for focus that moves after the field is found, as a dialog's does", async () => {
    const input = field()
    setTimeout(() => {
      input.focus()
    }, 50)

    expect(input).not.toHaveFocus()
    await expectOpeningFocus(input)

    expect(input).toHaveFocus()
  })

  it("fails when focus never reaches the field", async () => {
    const input = field()

    await expect(expectOpeningFocus(input)).rejects.toThrow(/focus/i)
  })
})
