import type { Roadmap } from "../roadmap"

/**
 * A roadmap for tests (test code only): published, with an English title and nothing
 * else unless `overrides` adds it.
 */
export function createTestRoadmap(
  id: string,
  title: string,
  overrides: Partial<Omit<Roadmap, "id">> = {},
): Roadmap {
  const roadmap: Roadmap = {
    id,
    title: { en: title, cy: "" },
    published: true,
    category: null,
    categoryId: null,
    family: null,
    familyId: null,
    outOfStep: false,
    familyNotListed: false,
    statusLabel: null,
    productLead: null,
    lastUpdated: null,
    colour: null,
    vision: null,
    serviceDescription: null,
    copied: { family: null, colour: null, category: "" },
    ...overrides,
  }
  // In step unless `overrides` says otherwise: the row copies what is shown.
  return overrides.copied ? roadmap : inStep(roadmap)
}

/** The roadmap with its row's own copied cells holding what it shows (test code only). */
export function inStep(roadmap: Roadmap): Roadmap {
  return {
    ...roadmap,
    copied: {
      family: roadmap.family,
      colour: roadmap.colour,
      category: roadmap.category?.en ?? "",
    },
  }
}
