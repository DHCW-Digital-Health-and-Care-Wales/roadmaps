import { useRef } from "react"

export interface FocusNoticeOnClose {
  /** Call as the dialog's write is confirmed: its outcome then takes focus. */
  readonly confirmed: () => void
  /**
   * The dialog's `finalFocus`: nowhere when a confirmed write's notice is there to take
   * focus, `otherwise` (by default, what opened the dialog) when not.
   */
  readonly finalFocus: (otherwise?: HTMLElement | null) => HTMLElement | boolean
  /** The dialog's `onOpenChangeComplete`. */
  readonly onOpenChangeComplete: (open: boolean) => void
}

/**
 * Sends focus to the notice saying what a dialog's write came to once the dialog has
 * closed (STY-052 S4, D21), as the dialog's own return of focus would land on a control
 * that may since have moved, or gone. `notice` finds the notice when the dialog
 * closes; with none there, focus returns as the dialog would return it. Each opening
 * starts unconfirmed.
 */
export function useFocusNoticeOnClose(
  notice: () => HTMLElement | null,
): FocusNoticeOnClose {
  const confirmed = useRef(false)
  return {
    confirmed: () => {
      confirmed.current = true
    },
    finalFocus: (otherwise) => {
      if (confirmed.current && notice()) return false
      return otherwise ?? true
    },
    onOpenChangeComplete: (open) => {
      if (open) confirmed.current = false
      else if (confirmed.current) notice()?.focus()
    },
  }
}
