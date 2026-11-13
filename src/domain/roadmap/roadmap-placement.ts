/**
 * Where a roadmap item appears: one of the three horizons or one of the three sections
 * around them, shared with the public site and in its page order (ADR-011). Their
 * headings are catalogue copy (ADR-008).
 */
export const ROADMAP_PLACEMENTS = [
  "recently-delivered",
  "now",
  "next",
  "later",
  "delivered-this-year",
  "not-doing",
] as const

export type RoadmapPlacement = (typeof ROADMAP_PLACEMENTS)[number]

/** The placements that are horizons; the rest are sections. */
export const ROADMAP_HORIZONS = [
  "now",
  "next",
  "later",
] as const satisfies readonly RoadmapPlacement[]

export function isRoadmapPlacement(value: string): value is RoadmapPlacement {
  return (ROADMAP_PLACEMENTS as readonly string[]).includes(value)
}
