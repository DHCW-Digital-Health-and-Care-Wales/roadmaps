/**
 * How a publish's write goes in the data source: it fails with an `AppError` of this
 * kind, writing nothing, or its answer is lost (a network failure) after it was applied,
 * not applied, applied and then partly overwritten by a co-lead (the first value it
 * wrote, roadmap text before items', becomes `CO_LEAD_VALUE`), or applied with every
 * read after it failing.
 */
export type ContractWrite =
  | { fails: "forbidden" | "unauthenticated" }
  | { lost: "applied" | "not-applied" | "partly-applied" | "reread-fails" }

/** What a co-lead writes over the first value of a `partly-applied` write. */
export const CO_LEAD_VALUE = "Changed by a co-lead"
