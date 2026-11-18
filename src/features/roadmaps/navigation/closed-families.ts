/**
 * Where the families the Product Lead closed in the navigation are remembered (STY-062
 * D4): a convenience for this device only, so what can't be read or kept leaves every
 * family open, and is never an error. It holds family keys (`RoadmapGroup.key`), never a
 * token or anything of the data source's.
 */
export const CLOSED_FAMILIES_STORAGE_KEY = "roadmaps.navigation.closed"

/** The families last closed on this device; none where nothing readable is kept. */
export function readClosedFamilies(): ReadonlySet<string> {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(CLOSED_FAMILIES_STORAGE_KEY) ?? "[]",
    )
    if (!Array.isArray(stored)) return new Set()
    return new Set(
      stored.filter((key): key is string => typeof key === "string"),
    )
  } catch {
    return new Set()
  }
}

/** Remembers the closed families (non-sensitive). Failing to keep them is not an error. */
export function storeClosedFamilies(closed: ReadonlySet<string>): void {
  try {
    if (closed.size === 0) {
      localStorage.removeItem(CLOSED_FAMILIES_STORAGE_KEY)
    } else {
      localStorage.setItem(
        CLOSED_FAMILIES_STORAGE_KEY,
        JSON.stringify([...closed]),
      )
    }
  } catch {
    // They stay closed for this visit.
  }
}
