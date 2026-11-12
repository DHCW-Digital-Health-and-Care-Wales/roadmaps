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
  return {
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
    ...overrides,
  }
}
