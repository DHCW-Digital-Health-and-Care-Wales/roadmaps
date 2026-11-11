import { describe, expect, it } from "vitest"

import { createItemId, type RandomBytes } from "./item-id"

/** Random bytes that are these values, in turn. */
function bytesOf(...values: number[]): RandomBytes {
  return (bytes) => {
    bytes[0] = values.shift() ?? 0
    return bytes
  }
}

describe("createItemId", () => {
  it("is eight characters a spreadsheet keeps as text, starting with a consonant", () => {
    for (let i = 0; i < 200; i++) {
      expect(createItemId()).toMatch(
        /^[bcdfghjkmnpqrstvwxz][bcdfghjkmnpqrstvwxz2-9]{7}$/,
      )
    }
  })

  it("maps each byte onto the alphabet, skipping bytes that would bias it", () => {
    // 19 consonants: 255 is past the last whole cycle (247), so it is drawn again.
    // 27 characters after the first: 243 is past 242, so it is drawn again too.
    const id = createItemId(bytesOf(255, 0, 243, 1, 18, 19, 26, 27, 28, 0))

    expect(id).toBe("bcz29bcb")
  })
})
