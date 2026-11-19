/** Where a form opens: a dialog in the middle of the screen, or a panel along its right. */
export type EditPlacement = "dialog" | "panel"

/**
 * Where the choice is remembered (STY-077 D8): a convenience for this browser only, as
 * the theme is, so a choice that can't be read or kept leaves forms opening as dialogs.
 */
export const EDIT_PLACEMENT_STORAGE_KEY = "roadmaps.edit.placement"

const PANEL = "panel"

/** The placement last chosen in this browser; a dialog where nothing readable is kept. */
export function readEditPlacement(): EditPlacement {
  try {
    return localStorage.getItem(EDIT_PLACEMENT_STORAGE_KEY) === PANEL
      ? "panel"
      : "dialog"
  } catch {
    return "dialog"
  }
}

/** Remembers the placement (non-sensitive). Failing to keep it is not an error. */
export function storeEditPlacement(placement: EditPlacement): void {
  try {
    if (placement === "panel") {
      localStorage.setItem(EDIT_PLACEMENT_STORAGE_KEY, PANEL)
    } else localStorage.removeItem(EDIT_PLACEMENT_STORAGE_KEY)
  } catch {
    // The choice still applies for this visit.
  }
}
