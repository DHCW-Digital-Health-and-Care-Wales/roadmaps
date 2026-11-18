import { describe, expect, it } from "vitest"

import { controlAfter } from "./left-out"

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
