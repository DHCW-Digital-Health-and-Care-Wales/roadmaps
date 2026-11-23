import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { validateSnapshot } from "./roadmap-schema.ts"

const example: unknown = JSON.parse(
  readFileSync(
    new URL("../e2e/fixtures/roadmaps.json", import.meta.url),
    "utf8",
  ),
)

const valid = () => structuredClone(validateSnapshot(example))

describe("roadmap snapshot schema", () => {
  it("accepts the example data", () => {
    expect(() => validateSnapshot(example)).not.toThrow()
  })

  it("rejects an empty snapshot", () => {
    expect(() => validateSnapshot([])).toThrow()
  })

  // Each case breaks one rule of the snapshot, so they differ only in data.
  type Roadmaps = ReturnType<typeof valid>
  const nowItem = (data: Roadmaps) =>
    data[0].items.now[0] as unknown as Record<string, unknown>
  it.each<[string, (data: Roadmaps) => unknown, RegExp]>([
    ["duplicate slugs", ([a]) => [a, a], /Duplicate URL slugs/],
    [
      "an empty slug",
      (data) => {
        data[0].slug = ""
        return data
      },
      /slug/,
    ],
    [
      "an invalid date",
      (data) => {
        data[0].meta.lastUpdated = "2026-02-31"
        return data
      },
      /lastUpdated/,
    ],
    [
      "a colour that is not hex",
      (data) => {
        data[0].meta.colour = "red; background: url(x)"
        return data
      },
      /hex colour/,
    ],
    [
      "an unknown category",
      (data) => {
        ;(data[0].meta as { category: string }).category = "dentistry"
        return data
      },
      /category/,
    ],
    [
      "an unknown organisation",
      (data) => {
        nowItem(data).organisations = ["cardiff"]
        return data
      },
      /organisations/,
    ],
    [
      "an empty organisation list",
      (data) => {
        nowItem(data).organisations = []
        return data
      },
      /organisations/,
    ],
    [
      "a missing placement",
      (data) => {
        delete (data[0].items as unknown as Record<string, unknown>).later
        return data
      },
      /later/,
    ],
    [
      "plain strings for phase and labels",
      (data) => {
        nowItem(data).phase = "Beta"
        nowItem(data).labels = ["Web"]
        return data
      },
      /phase[\s\S]*labels/,
    ],
    [
      "Welsh with no English",
      (data) => {
        data[0].items.now[0].description = { en: "", cy: "Disgrifiad" }
        return data
      },
      /Welsh text with no English/,
    ],
    [
      "an empty detail line",
      (data) => {
        data[0].items.now[0].details = [{ level: 0, text: { en: "", cy: "" } }]
        return data
      },
      /Empty English text/,
    ],
  ])("rejects %s", (_, break_, message) => {
    expect(() => validateSnapshot(break_(valid()))).toThrow(message)
  })
})
