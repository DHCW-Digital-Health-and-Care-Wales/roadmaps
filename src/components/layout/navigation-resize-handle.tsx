import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import {
  DEFAULT_NAVIGATION_WIDTH,
  MAX_NAVIGATION_WIDTH,
  MIN_NAVIGATION_WIDTH,
  clampNavigationWidth,
} from "./navigation-preference"

/** How far an arrow key moves the edge, in px (STY-064 D2). */
const KEY_STEP = 16

export interface NavigationResizeHandleProps {
  /** The navigation's width now, in px. */
  width: number
  /** The width the edge asks for, within the limits, while it is dragged or keyed. */
  onResize: (width: number) => void
  /** The width the edge settled on, for the shell to keep. */
  onResizeEnd: (width: number) => void
}

/**
 * The open navigation's right edge, a window splitter (WAI-ARIA): dragged by pointer or
 * finger, moved by the arrow keys, Home and End, and put back to its starting width by a
 * double-click (STY-064). Hand-built, not shadcn's `resizable`, which sizes panels in
 * percentages of a group, while the bars pinned outside the navigation read its width in
 * px as `--navigation-width` (D4). The line is thin, its hit area wider, and wider again
 * under a finger.
 */
export function NavigationResizeHandle({
  width,
  onResize,
  onResizeEnd,
}: NavigationResizeHandleProps) {
  const { t } = useTranslation()
  // Where the drag began and the width it asked for last; `null` while none is under way.
  const drag = useRef<{ x: number; width: number; latest: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const keyTo = (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowLeft":
        return width - KEY_STEP
      case "ArrowRight":
        return width + KEY_STEP
      case "Home":
        return MIN_NAVIGATION_WIDTH
      case "End":
        return MAX_NAVIGATION_WIDTH
      default:
        return null
    }
  }

  const finish = () => {
    const current = drag.current
    if (!current) return
    drag.current = null
    setDragging(false)
    onResizeEnd(current.latest)
  }

  return (
    // A focusable separator is a widget (WAI-ARIA window splitter), which the a11y rules
    // do not know.
    // eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions
    <div
      role="separator"
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- as above
      tabIndex={0}
      aria-label={t("layout.navigation.resize")}
      aria-orientation="vertical"
      aria-valuemin={MIN_NAVIGATION_WIDTH}
      aria-valuemax={MAX_NAVIGATION_WIDTH}
      aria-valuenow={width}
      aria-valuetext={t("layout.navigation.width", { width })}
      data-dragging={dragging || undefined}
      className={cn(
        "group absolute inset-y-0 -right-1.5 z-10 w-3 cursor-col-resize touch-none outline-none select-none pointer-coarse:-right-3 pointer-coarse:w-6",
        "focus-visible:focus-fill",
      )}
      onPointerDown={(event: PointerEvent) => {
        if (event.button !== 0) return
        event.preventDefault()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // A pointer already gone can't be followed: leave the drag unstarted.
          return
        }
        drag.current = { x: event.clientX, width, latest: width }
        setDragging(true)
      }}
      onPointerMove={(event: PointerEvent) => {
        const current = drag.current
        if (!current) return
        current.latest = clampNavigationWidth(
          current.width + event.clientX - current.x,
        )
        onResize(current.latest)
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onDoubleClick={() => {
        onResize(DEFAULT_NAVIGATION_WIDTH)
        onResizeEnd(DEFAULT_NAVIGATION_WIDTH)
      }}
      onKeyDown={(event) => {
        const to = keyTo(event)
        if (to === null) return
        event.preventDefault()
        const next = clampNavigationWidth(to)
        onResize(next)
        onResizeEnd(next)
      }}
    >
      {/* The line shown under a pointer and while dragged, thinner than its hit area. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 group-hover:bg-sidebar-accent group-focus-visible:hidden group-data-dragging:bg-sidebar-accent"
      />
    </div>
  )
}
