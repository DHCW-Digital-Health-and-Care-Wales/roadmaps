import { type FocusEvent, useEffect, useLayoutEffect, useRef } from "react"

/** The handlers a field of several controls spreads on the element that holds them. */
export interface LeaveHandlers {
  onFocus: (event: FocusEvent<HTMLElement>) => void
  onBlur: (event: FocusEvent<HTMLElement>) => void
}

/**
 * Says when the Product Lead has left a field of several controls (STY-080 S5): by a
 * press or a tap outside it, or by Tab. Not for a move between its own controls, nor
 * while the window has lost focus, nor for focus the page takes itself, as the session
 * warning does, which gives it back: the field stays, with what was typed. It waits for
 * a press that took focus away to end, and then a task more, so the press's click lands
 * where it was aimed before `onLeave` closes the field and the page moves up under the
 * pointer. A tap moves focus only once the finger has lifted, its click following, so
 * the task's wait covers it too. Focus back in the field by then cancels the leave, and
 * so does `watching` turning false, as the field closes.
 */
export function useLeaveAfterPress(
  watching: boolean,
  onLeave: () => void,
): LeaveHandlers {
  // The field, once it has had focus.
  const fieldRef = useRef<HTMLElement | null>(null)
  const pressingRef = useRef(false)
  // Whether the last press since the field had focus began outside it.
  const pressedOutsideRef = useRef(false)
  // Whether Tab is moving focus, in the task of its key press.
  const tabbingRef = useRef(false)
  // A leave waiting for the press under way to end.
  const leaveAtReleaseRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latestOnLeaveRef = useRef(onLeave)
  useLayoutEffect(() => {
    latestOnLeaveRef.current = onLeave
  })
  useEffect(() => {
    if (!watching) return
    const press = (event: PointerEvent) => {
      pressingRef.current = true
      pressedOutsideRef.current = !(
        event.target instanceof Node && fieldRef.current?.contains(event.target)
      )
    }
    const release = () => {
      pressingRef.current = false
      const leave = leaveAtReleaseRef.current
      leaveAtReleaseRef.current = null
      leave?.()
    }
    let tabbed: ReturnType<typeof setTimeout> | undefined
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      tabbingRef.current = true
      clearTimeout(tabbed)
      tabbed = setTimeout(() => {
        tabbingRef.current = false
      })
    }
    window.addEventListener("pointerdown", press, true)
    window.addEventListener("pointerup", release, true)
    window.addEventListener("pointercancel", release, true)
    window.addEventListener("keydown", key, true)
    return () => {
      window.removeEventListener("pointerdown", press, true)
      window.removeEventListener("pointerup", release, true)
      window.removeEventListener("pointercancel", release, true)
      window.removeEventListener("keydown", key, true)
      pressingRef.current = false
      pressedOutsideRef.current = false
      tabbingRef.current = false
      leaveAtReleaseRef.current = null
      clearTimeout(tabbed)
      clearTimeout(timerRef.current)
    }
  }, [watching])

  return {
    onFocus: (event) => {
      fieldRef.current = event.currentTarget
      // The press that opened the field, or one before focus came back, left nothing.
      if (!pressingRef.current) pressedOutsideRef.current = false
    },
    onBlur: (event) => {
      const left = event.currentTarget
      const to = event.relatedTarget
      if (to instanceof Node && left.contains(to)) return
      // The window lost focus, not the field, which has it back on return.
      if (!document.hasFocus()) return
      if (!pressedOutsideRef.current && !tabbingRef.current) return
      const leaveSoon = () => {
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          if (!left.contains(document.activeElement)) latestOnLeaveRef.current()
        })
      }
      if (pressingRef.current) leaveAtReleaseRef.current = leaveSoon
      else leaveSoon()
    },
  }
}
