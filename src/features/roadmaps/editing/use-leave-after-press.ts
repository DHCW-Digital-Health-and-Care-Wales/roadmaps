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
  const field = useRef<HTMLElement | null>(null)
  const pressing = useRef(false)
  // Whether the last press since the field had focus began outside it.
  const pressedOutside = useRef(false)
  // Whether Tab is moving focus, in the task of its key press.
  const tabbing = useRef(false)
  // A leave waiting for the press under way to end.
  const leaveAtRelease = useRef<(() => void) | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latestOnLeave = useRef(onLeave)
  useLayoutEffect(() => {
    latestOnLeave.current = onLeave
  })
  useEffect(() => {
    if (!watching) return
    const press = (event: PointerEvent) => {
      pressing.current = true
      pressedOutside.current = !(
        event.target instanceof Node && field.current?.contains(event.target)
      )
    }
    const release = () => {
      pressing.current = false
      const leave = leaveAtRelease.current
      leaveAtRelease.current = null
      leave?.()
    }
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return
      tabbing.current = true
      setTimeout(() => {
        tabbing.current = false
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
      pressing.current = false
      pressedOutside.current = false
      leaveAtRelease.current = null
      clearTimeout(timer.current)
    }
  }, [watching])

  return {
    onFocus: (event) => {
      field.current = event.currentTarget
      // The press that opened the field, or one before focus came back, left nothing.
      if (!pressing.current) pressedOutside.current = false
    },
    onBlur: (event) => {
      const left = event.currentTarget
      const to = event.relatedTarget
      if (to instanceof Node && left.contains(to)) return
      // The window lost focus, not the field, which has it back on return.
      if (!document.hasFocus()) return
      if (!pressedOutside.current && !tabbing.current) return
      const leaveSoon = () => {
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          if (!left.contains(document.activeElement)) latestOnLeave.current()
        })
      }
      if (pressing.current) leaveAtRelease.current = leaveSoon
      else leaveSoon()
    },
  }
}
