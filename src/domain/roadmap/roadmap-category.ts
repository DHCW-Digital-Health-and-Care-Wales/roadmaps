/**
 * The areas of care a roadmap can belong to, shared with the public site and in its
 * display order (ADR-009). Their names are catalogue copy (ADR-008).
 */
export const ROADMAP_CATEGORIES = [
  "public-health-apps",
  "gp-community-services",
  "tests-scans-results",
  "urgent-emergency-care",
  "hospital-specialist-care",
  "national-systems-data",
] as const

export type RoadmapCategory = (typeof ROADMAP_CATEGORIES)[number]
