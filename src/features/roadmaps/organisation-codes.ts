import type { Organisation } from "@/domain/roadmap/organisation"

/**
 * Each organisation's standard code, as a Product Lead types it and the same in both
 * languages (ADR-011 Option 6), so it is not catalogue copy.
 */
export const organisationCodes = {
  national: "National",
  abuhb: "ABUHB",
  bcuhb: "BCUHB",
  cavuhb: "CAVUHB",
  ctmuhb: "CTMUHB",
  hduhb: "HDUHB",
  pthb: "PTHB",
  sbuhb: "SBUHB",
  vunhst: "VUNHST",
  wast: "WAST",
  phw: "PHW",
  heiw: "HEIW",
} as const satisfies Record<Organisation, string>
