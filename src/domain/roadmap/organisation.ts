/**
 * The NHS Wales bodies a roadmap item's work can be for, shared with the public site and
 * in its display order (ADR-011). Each is shown as its standard code, the same in both
 * languages.
 */
export const ORGANISATIONS = [
  "national",
  "abuhb",
  "bcuhb",
  "cavuhb",
  "ctmuhb",
  "hduhb",
  "pthb",
  "sbuhb",
  "vunhst",
  "wast",
  "phw",
  "heiw",
] as const

export type Organisation = (typeof ORGANISATIONS)[number]
