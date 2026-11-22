import { useState } from "react"

/** A menu's item chosen, held until the menu has closed. */
export interface MenuChoice<T> {
  /** Holds `choice` for when the menu has closed: call it from the item's `onClick`. */
  choose: (choice: T) => void
  /** The menu's `onOpenChangeComplete`, which runs the choice once it has closed. */
  onOpenChangeComplete: (open: boolean) => void
}

/**
 * Runs a menu item's action once its menu has closed, when the menu has given focus back
 * to its trigger, so focus the action moves (to a dialog, a heading) stays where it put
 * it, and what the action opens returns focus to the trigger.
 */
export function useMenuChoice<T>(run: (choice: T) => void): MenuChoice<T> {
  const [chosen, setChosen] = useState<{ choice: T } | null>(null)
  return {
    choose: (choice) => {
      setChosen({ choice })
    },
    onOpenChangeComplete: (open) => {
      if (open || !chosen) return
      setChosen(null)
      run(chosen.choice)
    },
  }
}
