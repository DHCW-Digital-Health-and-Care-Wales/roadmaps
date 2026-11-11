import type { RoadmapItem } from "../roadmap-item"

/**
 * A roadmap item for tests (test code only): placed `now`, with an English title and
 * nothing else unless `overrides` adds it.
 */
export function createTestRoadmapItem(
  title: string,
  overrides: Partial<Omit<RoadmapItem, "title">> = {},
): RoadmapItem {
  return {
    title: { en: title, cy: "" },
    placement: "now",
    writtenHorizon: null,
    description: null,
    expectedOutcome: null,
    phase: null,
    tags: [],
    organisations: [],
    details: [],
    ...overrides,
  }
}
