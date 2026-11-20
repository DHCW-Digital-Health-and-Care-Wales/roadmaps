import { type FocusEvent, useEffect, useLayoutEffect, useRef } from "react"

/**
 * Says when focus has left a field of several controls for good (STY-080 S5), as the
 * field's `onBlur`: not for a move between its own controls, nor while the window has
 * lost focus, which comes back to the field. It waits for a press that took focus away
 * to end, and then a task more, so the press's click lands where it was aimed before
 * `onLeave` closes the field and the page moves up under the pointer. A tap moves
 * focus only once the finger has lifted, its click following in the same task, so the
 * task's wait covers it too. Focus back in the field by then cancels the leave, and so
 * does `watching` turning false, as the field closes.
 */
export function useLeaveAfterPress(
  watching: boolean,
  onLeave: () => void,
): (event: FocusEvent<HTMLElement>) => void {
  const pressing = useRef(false)
  // Stops the leave waiting, if one is.
  const cancelLeave = useRef<(() => void) | null>(null)
  const latestOnLeave = useRef(onLeave)
  useLayoutEffect(() => {
    latestOnLeave.current = onLeave
  })
  useEffect(() => {
    if (!watching) return
    const press = () => {
      pressing.current = true
    }
    const release = () => {
      pressing.current = false
    }
    window.addEventListener("pointerdown", press, true)
    window.addEventListener("pointerup", release, true)
    window.addEventListener("pointercancel", release, true)
    return () => {
      window.removeEventListener("pointerdown", press, true)
      window.removeEventListener("pointerup", release, true)
      window.removeEventListener("pointercancel", release, true)
      pressing.current = false
      cancelLeave.current?.()
      cancelLeave.current = null
    }
  }, [watching])

  return (event) => {
    const field = event.currentTarget
    const to = event.relatedTarget
    if (to instanceof Node && field.contains(to)) return
    // The window lost focus, not the field, which has it back on return.
    if (!document.hasFocus()) return
    cancelLeave.current?.()
    const pressEnded = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const leaveSoon = () => {
      pressEnded.abort()
      timer = setTimeout(() => {
        cancelLeave.current = null
        if (!field.contains(document.activeElement)) latestOnLeave.current()
      })
    }
    cancelLeave.current = () => {
      pressEnded.abort()
      clearTimeout(timer)
    }
    if (!pressing.current) {
      leaveSoon()
      return
    }
    for (const type of ["pointerup", "pointercancel"]) {
      window.addEventListener(type, leaveSoon, {
        capture: true,
        signal: pressEnded.signal,
      })
    }
  }
}
