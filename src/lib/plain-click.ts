/** The part of a mouse event that says how it was pressed. */
interface Press {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/**
 * A click of the main button with no modifier key: on a link, the one the router follows
 * in this tab, where a modifier key opens it elsewhere and leaves this page as it is.
 */
export function isPlainClick(event: Press): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}
