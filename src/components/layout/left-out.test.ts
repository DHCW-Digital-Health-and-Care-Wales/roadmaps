import { describe, expect, it } from "vitest"

import { controlAfter, leftOutFocus } from "./left-out"

function strip(html: string): HTMLElement {
  const container = document.createElement("div")
  container.innerHTML = html
  return container
}

describe("controlAfter", () => {
  it("finds the first control after the part, past those inside it and before it", () => {
    const container = strip(`
      <button>Menu</button>
      <div id="part"><button>Publish</button><button>Edit</button></div>
      <button disabled>Disabled</button>
      <h1 tabindex="-1">Title</h1>
      <button>Add an item</button>
      <button>More</button>
    `)
    const part = container.querySelector("#part")
    if (!part) throw new Error("No part")

    expect(controlAfter(part, container)?.textContent).toBe("Add an item")
  })

  it("finds none when nothing follows the part", () => {
    const container = strip(
      `<button>Menu</button><div id="part"><button>Edit</button></div>`,
    )
    const part = container.querySelector("#part")
    if (!part) throw new Error("No part")

    expect(controlAfter(part, container)).toBeUndefined()
  })
})

describe("leftOutFocus", () => {
  const container = strip(`
    <button>Menu</button>
    <div data-left-out=""><button>Edit</button></div>
    <button>Add an item</button>
  `)
  const [menu, edit, add] = [...container.querySelectorAll("button")]
  if (!menu || !edit || !add) throw new Error("Not built")

  it("passes the part by, on to the next control, when focus comes from before it", () => {
    expect(leftOutFocus(edit, menu, container)).toBe(add)
  })

  it("lets the header go when focus comes from after the part, or from nowhere", () => {
    expect(leftOutFocus(edit, add, container)).toBe("release")
    expect(leftOutFocus(edit, null, container)).toBe("release")
  })

  it("leaves focus outside a part alone", () => {
    expect(leftOutFocus(add, menu, container)).toBeNull()
  })
})
