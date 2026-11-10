import { describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"

import { groupRoadmaps } from "./group-roadmaps"

const family = (en: string, cy = "") => ({ en, cy })

/** The group's family (English) and roadmap titles (English), for readable expectations. */
function summarise(groups: ReturnType<typeof groupRoadmaps>) {
  return groups.map(({ family, roadmaps }) => ({
    family: family?.en ?? null,
    titles: roadmaps.map(({ title }) => title.en),
  }))
}

describe("groupRoadmaps", () => {
  it("groups by family in name order, titles in order within each, and no family last (S1)", () => {
    const groups = groupRoadmaps(
      [
        createTestRoadmap("producta", "Product A roadmap", {
          family: family("Single Record"),
        }),
        createTestRoadmap("productb", "Product B roadmap", {
          family: family("Medicines & Diagnostics"),
        }),
        createTestRoadmap("productc", "Product C roadmap"),
      ],
      "en",
    )

    expect(summarise(groups)).toEqual([
      { family: "Medicines & Diagnostics", titles: ["Product B roadmap"] },
      { family: "Single Record", titles: ["Product A roadmap"] },
      { family: null, titles: ["Product C roadmap"] },
    ])
  })

  it("never uses data-source order", () => {
    const groups = groupRoadmaps(
      [
        createTestRoadmap("z", "Zulu", { family: family("Beta") }),
        createTestRoadmap("y", "Yankee"),
        createTestRoadmap("x", "X-ray", { family: family("Alpha") }),
        createTestRoadmap("a", "Alpha", { family: family("Beta") }),
      ],
      "en",
    )

    expect(summarise(groups)).toEqual([
      { family: "Alpha", titles: ["X-ray"] },
      { family: "Beta", titles: ["Alpha", "Zulu"] },
      { family: null, titles: ["Yankee"] },
    ])
  })

  it("groups spellings that differ only in case, accents, spaces and punctuation, and sorts titles as people read them (S8)", () => {
    const groups = groupRoadmaps(
      [
        createTestRoadmap("a", "Zebra", { family: family("Single Record") }),
        createTestRoadmap("b", "éclair", { family: family(" single record") }),
        createTestRoadmap("c", "Product 10 roadmap", {
          family: family("Single Récord"),
        }),
        createTestRoadmap("d", "Product 9 roadmap", {
          family: family("Single-Record."),
        }),
      ],
      "en",
    )

    expect(groups).toHaveLength(1)
    expect(summarise(groups)[0]?.titles).toEqual([
      "éclair",
      "Product 9 roadmap",
      "Product 10 roadmap",
      "Zebra",
    ])
  })

  it("names a merged group by the first roadmap's family as written, with that roadmap's Welsh or else the first member's (D11)", () => {
    const [group] = groupRoadmaps(
      [
        createTestRoadmap("a", "A", { family: family(" single record") }),
        createTestRoadmap("b", "B", {
          family: family("Single Record", "Cofnod Sengl"),
        }),
        createTestRoadmap("c", "C", {
          family: family("SINGLE RECORD", "Cofnod Unigol"),
        }),
      ],
      "cy",
    )

    expect(group?.family).toEqual({ en: " single record", cy: "Cofnod Sengl" })
    expect(
      groupRoadmaps(
        [
          createTestRoadmap("a", "A", {
            family: family("Single Record", "Cofnod Sengl"),
          }),
          createTestRoadmap("b", "B", {
            family: family("single record", "Cofnod Arall"),
          }),
        ],
        "cy",
      )[0]?.family,
    ).toEqual({ en: "Single Record", cy: "Cofnod Sengl" })
  })

  it("re-sorts groups and titles by their Welsh names, falling back to English (S8)", () => {
    const roadmaps = [
      createTestRoadmap("a", "Alpha", {
        family: family("Zebra family", "Anifail"),
      }),
      createTestRoadmap("b", "Beta", { family: family("Mid family") }),
      createTestRoadmap("c", "Gamma", {
        family: family("Alpha family", "Zeus"),
      }),
      createTestRoadmap("d", "Mid", {
        family: family("Mid family"),
        title: { en: "Mid", cy: "Aaa" },
      }),
    ]

    expect(summarise(groupRoadmaps(roadmaps, "en"))).toEqual([
      { family: "Alpha family", titles: ["Gamma"] },
      { family: "Mid family", titles: ["Beta", "Mid"] },
      { family: "Zebra family", titles: ["Alpha"] },
    ])
    // Welsh: "Anifail", "Mid family" (English), "Zeus"; "Aaa" (Welsh) before "Beta".
    expect(summarise(groupRoadmaps(roadmaps, "cy"))).toEqual([
      { family: "Zebra family", titles: ["Alpha"] },
      { family: "Mid family", titles: ["Mid", "Beta"] },
      { family: "Alpha family", titles: ["Gamma"] },
    ])
  })

  it("is one group with no family, to show with no heading, when no roadmap has a family (S8)", () => {
    const groups = groupRoadmaps(
      [createTestRoadmap("b", "Beta"), createTestRoadmap("a", "Alpha")],
      "en",
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]?.family).toBeNull()
    expect(groups[0]?.roadmaps.map(({ title }) => title.en)).toEqual([
      "Alpha",
      "Beta",
    ])
  })

  it("sorts an unpublished roadmap like any other (S9)", () => {
    const [group] = groupRoadmaps(
      [
        createTestRoadmap("beta", "Beta", { family: family("F") }),
        createTestRoadmap("alpha", "Alpha", {
          family: family("F"),
          published: false,
        }),
      ],
      "en",
    )

    expect(group?.roadmaps.map(({ id }) => id)).toEqual(["alpha", "beta"])
  })

  it("keeps data order for equal titles, and returns nothing for no roadmaps", () => {
    const [group] = groupRoadmaps(
      [createTestRoadmap("two", "Same"), createTestRoadmap("one", "Same")],
      "en",
    )

    expect(group?.roadmaps.map(({ id }) => id)).toEqual(["two", "one"])
    expect(groupRoadmaps([], "en")).toEqual([])
  })

  it("keeps a family that is only punctuation, and gives each group a distinct key", () => {
    const groups = groupRoadmaps(
      [
        createTestRoadmap("a", "A", { family: family("???") }),
        createTestRoadmap("b", "B", { family: family("Real") }),
        createTestRoadmap("c", "C"),
      ],
      "en",
    )

    expect(groups).toHaveLength(3)
    expect(new Set(groups.map(({ key }) => key)).size).toBe(3)
  })
})
