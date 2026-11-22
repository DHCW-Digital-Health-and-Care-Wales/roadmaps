/** Where a form opens: a dialog in the middle of the screen, or a panel along its right. */
export type EditSurface = "dialog" | "panel"

/**
 * Where the choice is remembered (STY-077 D8): a convenience for this browser only, as
 * the theme is, so a choice that can't be read or kept leaves forms opening as the side
 * panel, the default (STY-083). Only the exception, `dialog`, is stored; a `panel` that
 * STY-077 stored reads as the default.
 */
export const EDIT_SURFACE_STORAGE_KEY = "roadmaps.edit.surface"

/** The surface last chosen in this browser; the panel where nothing readable is kept. */
export function readEditSurface(): EditSurface {
  try {
    return localStorage.getItem(EDIT_SURFACE_STORAGE_KEY) === "dialog"
      ? "dialog"
      : "panel"
  } catch {
    return "panel"
  }
}

/**
 * Remembers the surface (non-sensitive) and says whether it was kept. Failing to keep it
 * is not an error: the caller leaves the forms as the side panel (STY-083 S4).
 */
export function storeEditSurface(surface: EditSurface): boolean {
  try {
    if (surface === "dialog") {
      localStorage.setItem(EDIT_SURFACE_STORAGE_KEY, "dialog")
    } else {
      localStorage.removeItem(EDIT_SURFACE_STORAGE_KEY)
    }
    return true
  } catch {
    return false
  }
}
