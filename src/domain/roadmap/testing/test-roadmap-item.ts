import type { RoadmapItem } from "../roadmap-item"

/**
 * A roadmap item for tests (test code only): placed `now`, with no ID, with an English title and
 * nothing else unless `overrides` adds it.
 */
export function createTestRoadmapItem(
  title: string,
  overrides: Partial<Omit<RoadmapItem, "title">> = {},
): RoadmapItem {
  return {
    id: null,
    title: { en: title, cy: "" },
    placement: "now",
    writtenHorizon: null,
    description: null,
    expectedOutcome: null,
    phase: null,
    tags: [],
    hasWelshTags: false,
    organisationIds: [],
    unknownOrganisationCodes: [],
    details: [],
    hasWelshDetails: false,
    ...overrides,
  }
}
