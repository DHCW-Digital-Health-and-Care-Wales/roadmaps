import { afterEach, describe, expect, it } from "vitest"

import { expectOpeningFocus } from "./opening-focus"

function field() {
  const input = document.createElement("input")
  document.body.append(input)
  return input
}

/** The field, looked up as a test does, throwing while it is not there. */
function findField() {
  const input = document.querySelector("input")
  if (!input) throw new Error("No field")
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
    await expectOpeningFocus(findField)

    expect(input).toHaveFocus()
  })

  it("waits for a field that renders after it is first looked for, as one back from a closed dialog does", async () => {
    setTimeout(() => {
      field().focus()
    }, 50)

    expect(() => findField()).toThrow("No field")
    await expectOpeningFocus(findField)

    expect(findField()).toHaveFocus()
  })

  it("fails when focus never reaches the field", async () => {
    field()

    await expect(expectOpeningFocus(findField)).rejects.toThrow(/focus/i)
  })
})
